async function toggleRecord() {
    clearTimeout(recordAutoStopTimer);recordAutoStopTimer=0;
  if (!state.admin) { toast('Solo Admin puede grabar.'); return; }
  if (state.recording) {
    state.recording = false;stopDrumPadRecordPlayback();if(state.recordingGuidePlaying)stopPlayback();if($('tempoControl'))$('tempoControl').disabled=false; setPlayerControl('recordBtn','⏺','Grabar'); $('status').textContent = `${songTrackLabel(state.melodyType,state.song.category,state.song.song.id)} grabada. Pulsa Guardar para sincronizarla con esta alabanza.`; renderRecorded(); updateTrackTimeline(); return;
  }
  if(state.notes.length&&!window.confirm('Esta pista ya tiene notas. Si grabas de nuevo, se reemplazarán y lo que no hayas guardado se perderá. ¿Continuar?'))return;
  const sourceTracks=melodyTracks(melodyFor(state.song.category,state.song.song.id)),targetType=state.melodyType;
  let guideTypes=[];
  if(targetType==='acompanamiento1'||targetType==='acompanamiento2'){
    const mainType=['melodia','voz','introduccion'].find(type=>sourceTracks[type]?.notas?.length);
    if(mainType)guideTypes.push(mainType);
    const otherAccompaniment=targetType==='acompanamiento1'?'acompanamiento2':'acompanamiento1';
    if(sourceTracks[otherAccompaniment]?.notas?.length)guideTypes.push(otherAccompaniment);
  }else if(targetType==='melodia'||targetType.startsWith('melodiaAlterna_')){
    guideTypes=['acompanamiento1','acompanamiento2'].filter(type=>sourceTracks[type]?.notas?.length);
  }
  const guideTracks=guideTypes.map(type=>({type,track:sourceTracks[type],settings:instrumentTrackConfig(state.song.category,state.song.song.id,type),notes:[]}));
  const guideDrumPattern=readSongDrumPattern();
  stopPlayback();state.notes = []; state.chords = []; state.chordTarget = null; updateTrackTimeline();
  let guideDuration=0;
  if(guideTracks.length||guideDrumPattern.events.length){
    const original={instrument:state.instrument,intensity:state.trumpetIntensity,playbackIntensity:state.playbackIntensity,layerEnabled:state.stringsLayerEnabled,layerInstrument:state.layerInstrument,layerVolume:state.stringsLayerVolume,chords:state.chords};
    state.playbackPreparing=true;
    $('status').textContent='Preparando las pistas guía…';$('recordBtn').disabled=true;
    try{
      for(const guide of guideTracks){
        const settings=guide.settings,intensity=settings.intensity||'strong';
        Object.assign(state,{instrument:settings.instrument,trumpetIntensity:intensity,playbackIntensity:intensity,stringsLayerEnabled:settings.layerEnabled,layerInstrument:settings.layerInstrument,stringsLayerVolume:settings.layerVolume,chords:[]});
        guide.notes=shiftRecordedTrackNotes(notesForTrackPlayback(guide.track.notas,guide.type),settings.octaveShift);
        guideDuration=Math.max(guideDuration,guide.notes.reduce((end,note)=>Math.max(end,(Number(note.start)||0)+noteHoldSeconds(note)),0)/state.tempo);
        try{guide.prepared=await prepareMelodyAudio(guide.notes);}catch(error){console.warn(`No se pudo preparar la pista guía ${guide.type}:`,error);toast('No se pudo cargar el sonido de una pista guía; se mostrará la guía visual.');}
      }
      if(guideDrumPattern.events.length)try{await loadDrumPadBuffers();}catch(error){console.warn('No se pudo preparar la batería para la grabación:',error);toast('La grabación continuará sin batería; no se pudieron cargar sus sonidos.');guideDrumPattern.events=[];}
    }finally{Object.assign(state,{instrument:original.instrument,trumpetIntensity:original.intensity,playbackIntensity:original.playbackIntensity,stringsLayerEnabled:original.layerEnabled,layerInstrument:original.layerInstrument,stringsLayerVolume:original.layerVolume,chords:original.chords});state.playbackPreparing=false;$('recordBtn').disabled=false;}
  }
    const recContext=getAudioContext(),useCountIn=metronomeOn,drumCountIn=!useCountIn&&guideDrumPattern.events.length>0,drumCountBeat=60/(Number(guideDrumPattern.bpm)||metronomeBpm)/Math.max(.5,Number(state.tempo)||1),lead=useCountIn?.1+metronomeMeter*60/metronomeBpm:drumCountIn?.1+4*drumCountBeat:.12;
  if(useCountIn)startMetronomeAt(recContext.currentTime+.1);
if(drumCountIn)for(let index=0;index<4;index++)scheduleMetronomeBeat(recContext,recContext.currentTime+.1+index*drumCountBeat,index===0?0:1,true);
  const guideStartAt=recContext.currentTime+lead;
// El t=0 de la grabación coincide con el momento en que empiezan las guías
state.recordStart=(guideTracks.length||useCountIn||drumCountIn)?performance.now()+lead*1000:performance.now();
state.recordTempo=state.tempo;
state.recording=true;state.melodyDirty=true;setPlayerControl('recordBtn','⏹','Detener grabación');
if($('tempoControl'))$('tempoControl').disabled=true;
if(guideDrumPattern.events.length)startDrumPadRecordPlayback(guideDrumPattern,guideStartAt,guideTracks.length?guideDuration:Infinity);
if(guideTracks.length){
  const startAt=guideStartAt,duration=guideDuration;
  const recordingSoundState={instrument:state.instrument,trumpetIntensity:state.trumpetIntensity,playbackIntensity:state.playbackIntensity,stringsLayerEnabled:state.stringsLayerEnabled,layerInstrument:state.layerInstrument,stringsLayerVolume:state.stringsLayerVolume,chords:state.chords};
  guideTracks.forEach(guide=>{
    if(!guide.prepared)return;
    const settings=guide.settings,intensity=settings.intensity||'strong';
    Object.assign(state,{instrument:settings.instrument,trumpetIntensity:intensity,playbackIntensity:intensity,stringsLayerEnabled:settings.layerEnabled,layerInstrument:settings.layerInstrument,stringsLayerVolume:settings.layerVolume,chords:[]});
    guide.notes.forEach(note=>{const midi=Number(note.midi),key=document.querySelector(`.piano-panel .key[data-midi="${midi}"]`);schedulePlaybackNote(midi,key,noteHoldSeconds(note),startAt+Math.max(0,Number(note.start)||0)/state.tempo,guide.prepared,noteWasCut(note),false,guide.type.startsWith('acompanamiento')?'bass':'melody');});
  });
  Object.assign(state,recordingSoundState);
  const firstGuide=guideTracks[0].notes;state.playing=true;state.recordingGuidePlaying=true;setStagePlaying(true);startPlaybackTimeline(startAt,duration);startFallingNotes(firstGuide,[],startAt);
  state.playTimers.push(setTimeout(()=>{if(!state.recordingGuidePlaying)return;state.playing=false;state.recordingGuidePlaying=false;setStagePlaying(false);finishFallingNotesPlayback();recordAutoStopTimer=setTimeout(()=>{recordAutoStopTimer=0;if(state.recording){toast('La guía terminó: grabación detenida.');toggleRecord();}},2500);},(duration+lead)*1000+180));
  $('status').textContent=`Grabando ${songTrackLabel(state.melodyType,state.song.category,state.song.song.id)} · escucha las pistas de acompañamiento.`;
}else $('status').textContent = `Grabando ${songTrackLabel(state.melodyType,state.song.category,state.song.id)}…${guideDrumPattern.events.length?' La batería sonará como guía. ':' '}Toca toda la pista.`;
  renderRecorded();
}
async function saveMelody() {
  if (!state.admin || !state.song || !state.set || !state.ref || !state.db) { toast('Inicia sesión y conéctate para guardar.'); return; }
    if (state.recording) { toast('Detén la grabación antes de guardar.'); return; }
  if (!state.notes.length) { toast('Graba al menos una nota.'); return; }
  const { song, category } = state.song;
    if (state.transpose && SONG_TRACK_TYPES.some(type=>type!==state.melodyType&&hasTrack(category,song.id,type)) && !window.confirm('Transportaste esta pista, pero las otras pistas de la alabanza siguen en el tono anterior y sonarán desafinadas entre sí. ¿Guardar de todos modos?')) return;
  $('status').textContent='Guardando melodía y acordes en Firebase…';
  const payload = {
    songId: song.id,
    updatedAt: new Date().toISOString(),
    instrument:state.instrument,
    layerEnabled:state.stringsLayerEnabled,
    layerInstrument:state.layerInstrument,
    layerVolume:state.stringsLayerVolume,
    tono: transposedTonic(),
    acordes: state.chords.map(chord => { const baked = chord.noTranspose ? { root:String(chord.root), octave:Number(chord.octave)||36 } : bakeChordTranspose(chord, state.transpose); return { noteIndex:Number(chord.noteIndex), start:Number(chordStartTime(chord)?.toFixed(3)||0), root:baked.root, quality:String(chord.quality), inversion:Number(chord.inversion)||0, octave:baked.octave, duration:Number(chord.duration)||2, arpeggio:!!chord.arpeggio, instrument:chord.instrument||state.bassInstrument }; }),
    notas: state.notes.map((note, index, all) => {
      const start=Number(note.start)||0;
      const next=all.slice(index+1).find(item=>(Number(item.start)||0)>start+.035);
      const storedDuration=Number(note.duration),duration=Number.isFinite(storedDuration)&&storedDuration>0?storedDuration:next?Math.max(.12,Number(next.start)-start):.35;
      return { midi: Number(note.midi), note: canonicalNoteName(Number(note.midi)), start: Number(start.toFixed(3)), duration: Number(Math.max(.06,duration).toFixed(3)), ...(note.octave?{octave:true}:{}) };
    })
  };
  try {
    const source=melodyFor(category,song.id),tracks=melodyTracks(source);tracks[state.melodyType]=payload;
    const savedSettings=instrumentTrackConfig(category,song.id,state.melodyType);
    tracks.trackSettings={...tracks.trackSettings,[state.melodyType]:{...savedSettings,instrument:state.instrument,intensity:state.trumpetIntensity||savedSettings.intensity,layerEnabled:state.stringsLayerEnabled,layerInstrument:state.layerInstrument,layerVolume:state.stringsLayerVolume}};
    const storedRecord=serializeMelodyTracks(source,tracks);
    await state.set(state.ref(state.db, `melodias/${category}/${song.id}`), storedRecord);
    state.melodies[category] ||= {};
    state.melodies[category][String(song.id)] = storedRecord;
    try { localStorage.setItem('yhwh_melodias_cache', JSON.stringify(state.melodies)); } catch (_) {}
    state.melodyDirty=false;
    updateTrackTimeline();
    // Lo guardado ya está en el tono transportado: ese pasa a ser el tono de la pista.
    state.originalTonic = payload.tono; state.transpose = 0; state.chords = payload.acordes.map(chord => ({ ...chord }));
    renderChordPresets(); updateTransposeUI(); renderRecorded();
    $('playerLabel').textContent=`${songTrackLabel(state.melodyType,category,song.id)} · Guardada`;
    renderLists();
    toast('Melodía guardada y sincronizada.');
    $('status').textContent = 'Melodía guardada.';
  } catch (error) {
    $('status').textContent=`Error al guardar en Firebase${error?.code?`: ${error.code}`:''}. Revisa la conexión e inténtalo de nuevo.`;
    toast('No se pudo guardar en Firebase.');
    console.error('Error al guardar la melodía:',error);
  }
}
async function deleteMelody() {
  if (!state.admin || !state.song || !state.set || !state.ref || !state.db || !hasTrack(state.song.category,state.song.song.id,state.melodyType)) return;
  const trackLabel=songTrackLabel(state.melodyType,state.song.category,state.song.song.id);
  if (!confirm(`¿Eliminar la pista "${trackLabel}" de esta alabanza?`)) return;
  try {
    const source=melodyFor(state.song.category,state.song.song.id),tracks=melodyTracks(source);tracks[state.melodyType]=null;
    const storedRecord=serializeMelodyTracks(source,tracks);
    await state.set(state.ref(state.db, `melodias/${state.song.category}/${state.song.song.id}`), Object.keys(storedRecord).length?storedRecord:null);
    if(Object.keys(storedRecord).length)state.melodies[state.song.category][String(state.song.song.id)]=storedRecord;else delete state.melodies[state.song.category][String(state.song.song.id)];
    state.notes = []; state.chords = []; state.chordTarget = null; state.melodyDirty=false; renderRecorded(); updateTrackTimeline(); updateAdminControls();
    $('playerLabel').textContent=songTrackLabel(state.melodyType,state.song.category,state.song.song.id);
    $('status').textContent=`Se eliminó la pista ${songTrackLabel(state.melodyType,state.song.category,state.song.song.id)}.`;
    try{localStorage.setItem('yhwh_melodias_cache',JSON.stringify(state.melodies));}catch(_){}
    renderLists();toast('Pista eliminada.');
  } catch (_) { toast('No se pudo eliminar.'); }
}

function showLogin() {
  if (state.admin && state.signOut) { state.signOut(state.auth); return; }
  $('loginError').textContent = '';
  $('password').value = '';
  $('loginModal').classList.remove('hidden');
  $('password').focus();
}
async function login() {
  if (!state.signIn || !state.auth) { $('loginError').textContent = 'Firebase no está conectado. Abre la app con internet.'; return; }
  const password = $('password').value.trim();
  if (!password) { $('loginError').textContent = 'Escribe tu contraseña.'; return; }
  try {
    await state.signIn(state.auth, 'rosalesjrnain07@gmail.com', password);
    $('loginModal').classList.add('hidden');
    $('password').value = '';
    toast('Modo Admin activado.');
  } catch (_) { $('loginError').textContent = 'Contraseña incorrecta o sin conexión.'; $('password').value = ''; }
}

function bindInterface() {
  window.addEventListener('resize',()=>requestAnimationFrame(fitSongPresentationCards));
  const homeView=$('homeView'),homeListViewBtn=$('homeListViewBtn'),homeGridViewBtn=$('homeGridViewBtn');
  const homeViewSwitch=homeGridViewBtn.closest('.home-view-switch'),homeHeaderSwitchSlot=$('homeHeaderSwitchSlot'),homeViewToolbar=$('homeViewToolbar');
  const setHomePresentation=(grid,save=false)=>{
    homeView.classList.toggle('home-grid-mode',grid);
    document.body.classList.toggle('home-grid-active',grid);
    document.body.classList.toggle('home-list-active',!grid);
    homeHeaderSwitchSlot.append(homeViewSwitch);
    homeListViewBtn.setAttribute('aria-pressed',String(!grid));
    homeGridViewBtn.setAttribute('aria-pressed',String(grid));
    if(save)try{localStorage.setItem('yhwh_home_presentation',grid?'grid':'list');}catch(_){}
  };
  let savedHomePresentation='list';try{savedHomePresentation=localStorage.getItem('yhwh_home_presentation')||'list';}catch(_){}
  setHomePresentation(savedHomePresentation==='grid');
  homeListViewBtn.onclick=()=>setHomePresentation(false,true);
  homeGridViewBtn.onclick=()=>setHomePresentation(true,true);
  $('homeThemeTile').onclick=()=>$('themeToggle').click();
  $('homeAdminTile').onclick=()=>$('adminBtn').click();
  document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => setView(button.dataset.view));
  $('homeBtn').onclick = () => setView('home');
  $('recentSongsList').onclick=event=>{
    const row=event.target.closest('[data-recent-song-id]');if(!row)return;
    const category=row.dataset.category,song=songsFor(category).find(item=>String(item.id)===row.dataset.recentSongId);if(!song)return;
    selectedSongForContinue={song,category};
    // Recent songs open the same chooser as the song list. Set the list view
    // state first so returning from the chooser restores its full-screen layout.
    state.view=category==='jubilo'?'jubilo':'adoracion';
    document.body.classList.remove('home-active','create-list-active');
    document.body.classList.add('song-list-active');
    renderLists();
    $('playModeSongTitle').textContent=song.title||'Alabanza';
    syncModeScreen();
    transitionScreen('playModeModal',['homeView','songView','createView','player','playModeModal']);
    queueGuidedTour('modo');
  };
  $('freePlayBtn').onclick = openFreePlay;
  $('drumPadHomeBtn').onclick=openDrumPadScreen;
  $('drumPadOpen').onclick=openDrumPadScreen;
  $('drumPadKit').addEventListener('change',event=>{
    if(drumPadRecording){event.target.value=selectedDrumPadKit;toast('Detén la grabación antes de cambiar los sonidos.');return;}
    stopDrumPadPlayback();selectedDrumPadKit=event.target.value==='muldjord'?'muldjord':'electronic';
    try{localStorage.setItem('yhwh_drum_pad_kit_v1',selectedDrumPadKit);}catch(_){}
    const status=$('drumPadPatternStatus');if(status)status.textContent=selectedDrumPadKit==='muldjord'?'Cargando sonidos acústicos…':'Cargando sonidos electrónicos…';
    void loadDrumPadBuffers().then(()=>{if(status)status.textContent=`Sonidos ${selectedDrumPadKit==='muldjord'?'acústicos':'electrónicos'} listos.`;}).catch(error=>{console.warn('No se pudieron cargar los sonidos seleccionados:',error);if(status)status.textContent='No se pudieron cargar estos sonidos. Puedes elegir la otra batería e intentarlo de nuevo.';toast('No se pudieron cargar los sonidos de batería.');});
  });
  $('closeDrumPad').onclick=closeDrumPadScreen;
  const drumPadGrid=document.querySelector('.drum-pad-grid');drumPadGrid.addEventListener('pointerdown',event=>{const pad=event.target.closest('[data-drum-pad]');if(pad)void triggerDrumPad(pad.dataset.drumPad);});drumPadGrid.addEventListener('click',event=>{if(event.detail!==0)return;const pad=event.target.closest('[data-drum-pad]');if(pad)void triggerDrumPad(pad.dataset.drumPad);});
  $('drumPadBpm').addEventListener('change',event=>{const bpm=Math.min(240,Math.max(40,Math.round(Number(event.target.value)||100)));event.target.value=String(bpm);setMetronomeBpm(bpm,true);drumPadPattern.bpm=bpm;});
  $('drumPadBars').addEventListener('change',event=>{
    drumPadPattern.bars=[1,2,4].includes(Number(event.target.value))?Number(event.target.value):2;
    const limit=drumPadPattern.bars*4,before=drumPadPattern.events.length;drumPadPattern.events=drumPadPattern.events.filter(item=>item.beat<limit);
    const removed=before-drumPadPattern.events.length;renderDrumPadGrid();
    if(removed){saveDrumPadPattern();const status=$('drumPadPatternStatus');if(status)status.textContent='Se quitaron '+removed+' golpes que quedaban fuera de los compases elegidos.';}
  });
  $('drumPadStepGrid').addEventListener('click',event=>{const cell=event.target.closest('[data-drum-step]');if(cell)toggleDrumPadStep(cell.dataset.drumStepPad,Number(cell.dataset.drumStep));});
  $('drumPadQuantize').onclick=quantizeDrumPadPattern;
  $('drumPadSongEnabled').addEventListener('change',event=>{if(!drumPadContextSong)return;setDrumPadEnabledForSong(drumPadContextSong,event.target.checked);const status=$('drumPadPatternStatus');if(status)status.textContent=event.target.checked?'La batería sonará con esta alabanza.':'Batería apagada para esta alabanza. El patrón se conserva.';if(state.admin&&drumPadPattern.events.length)queueSongDrumPublish();});
  $('drumPadRecord').onclick=()=>void startDrumPadRecording();
  $('drumPadRecordAlongSong').onclick=()=>{if(drumPadRecording&&drumPadRecordAlongPlayback)stopDrumPadRecording();else armDrumPadRecordAlongSong();};
  $('drumPadPlay').onclick=()=>{if(drumPadPlaybackTimer){stopDrumPadPlayback();$('drumPadPlay').setAttribute('aria-pressed','false');$('drumPadPatternStatus').textContent='Patrón detenido.';}else void playDrumPadPattern();};
  $('drumPadStop').onclick=()=>{const stopGuide=drumPadRecordAlongPending||drumPadRecordAlongPlayback;if(drumPadRecordAlongPending)cancelDrumPadRecordAlong();if(drumPadRecording)stopDrumPadRecording();if(stopGuide&&state.playing)stopPlayback();stopDrumPadPlayback();$('drumPadPlay').setAttribute('aria-pressed','false');};
  $('drumPadClear').onclick=()=>{if(drumPadRecording)stopDrumPadRecording();stopDrumPadPlayback();drumPadPattern={bpm:metronomeBpm,bars:Number($('drumPadBars').value)||2,loop:true,durationBeats:0,events:[]};saveDrumPadPattern();renderDrumPadGrid();$('drumPadPlay').setAttribute('aria-pressed','false');$('drumPadPatternStatus').textContent='Patrón borrado.';};
  $('drumPadSave').onclick=()=>saveDrumPadPattern();
  $('drumPadScreen').addEventListener('keydown',event=>{if(event.key==='Escape'){closeDrumPadScreen();return;}if(event.repeat||event.target.matches('input,select,textarea,[contenteditable=true]'))return;const pad=DRUM_PAD_SOUNDS.find(sound=>sound.key===event.key.toLowerCase());if(pad){event.preventDefault();void triggerDrumPad(pad.id);}});
  document.querySelectorAll('[data-go-home]').forEach(button => button.onclick = () => setView('home'));
  document.querySelectorAll('[data-track-select]').forEach(button=>button.onclick=()=>chooseTrack(button.dataset.trackSelect));
  $('closeTrackModal').onclick=closeTrackChooser;
  $('trackModal').onclick=event=>{if(event.target===$('trackModal'))closeTrackChooser();};
  $('continueSongBtn').onclick=()=>{if(!selectedSongForContinue)return;$('playModeSongTitle').textContent=selectedSongForContinue.song.title||'Alabanza';syncModeScreen();transitionScreen('playModeModal',['homeView','songView','createView','player','playModeModal']);queueGuidedTour('modo');};
  $('createContinueBtn').onclick=openCreateTrackScreen;
  $('createTrackDrumPad')?.addEventListener('click',openCreateSongDrumPad);
  $('createTracksBack').onclick=()=>{document.body.classList.add('create-list-active');transitionScreen('createView',['homeView','songView','createView','createTrackScreen','player']);};
  document.querySelectorAll('[data-record-track]').forEach(button=>button.onclick=()=>beginCreateTrack(button.dataset.recordTrack));
  document.querySelectorAll('[data-manage-track]').forEach(button=>button.onclick=()=>{if(!selectedCreateSong)return;const {song,category}=selectedCreateSong;openSong(song,category,button.dataset.manageTrack,false,'record');});
  $('alternateMelodyForm')?.addEventListener('submit',event=>{event.preventDefault();const input=$('alternateMelodyName');addAlternateMelody(input.value);input.value='';});
  document.querySelector('[data-open-song-track-settings]').onclick=openCreateTrackSettings;
  $('selectedPreviewBtn').onclick=()=>{if(!selectedSongForContinue){toast('Selecciona una alabanza primero.');return;}previewSongInList(selectedSongForContinue.song,selectedSongForContinue.category,$('selectedPreviewBtn'));};
  $('closePlayMode').onclick=()=>transitionScreen('songView',['homeView','songView','createView','player','playModeModal']);
  document.querySelectorAll('[data-screen-settings]').forEach(button=>button.onclick=()=>{
    state.pendingPurpose='listen';
    const track=selectedSongForContinue&&trackFor(selectedSongForContinue.category,selectedSongForContinue.song.id,'introduccion');
    if($('modeMelodyMeta'))$('modeMelodyMeta').textContent=`${track?.notas?.length||0} notas · Canal 1`;
    transitionScreen('instrumentSettingsScreen',['homeView','songView','createView','player','playModeModal','instrumentSettingsScreen']);queueGuidedTour('instrumentos');
  });
  $('closeInstrumentSettings').onclick=()=>{if(state.pendingPurpose==='create'){ $('instrumentSettingsScreen').classList.remove('create-track-settings-mode');$('songTrackSettings').classList.add('hidden');transitionScreen('createTrackScreen',['homeView','songView','createView','player','createTrackScreen','instrumentSettingsScreen']);}else transitionScreen('playModeModal',['homeView','songView','createView','player','playModeModal','instrumentSettingsScreen']);};
  $('instrumentHelpButton').onclick=()=>{const dialog=$('instrumentHelpDialog');if(dialog?.showModal)dialog.showModal();};
  $('instrumentSettingsReset').onclick=()=>{applyInstrumentSettingsPreset({instrument:'grand-piano',bassInstrument:'grand-piano',keyColor:'#90dd4a',bassColor:'#bb82ef',second:'down',third:'down'});updateInstrumentSoundToggle('melody',true);updateInstrumentSoundToggle('bass',true);};
  $('instrumentColorAuto').onclick=()=>applyInstrumentSettingsPreset({keyColor:'#90dd4a',bassColor:'#bb82ef'});
  $('previewBassSound').onclick=()=>previewInstrumentNote($('bassInstrument').value,48);
  $('previewMelodySound').onclick=()=>previewInstrumentNote($('instrumentSelect').value,72);
  $('previewAccompaniment2Sound').onclick=()=>previewInstrumentNote($('modeAccompaniment2Instrument').value||$('instrumentSelect').value,48);
  $('melodySoundToggle').onclick=()=>updateInstrumentSoundToggle('melody',!state.melodySoundEnabled);
  $('bassSoundToggle').onclick=()=>updateInstrumentSoundToggle('bass',!state.bassSoundEnabled);
  syncInstrumentSoundToggles();
  document.querySelectorAll('[data-play-mode]').forEach(button=>button.onclick=()=>selectPlayMode(button.dataset.playMode));
  $('modeStartBtn').onclick=()=>{
    if(selectedPlayMode==='settings'){
      state.pendingPurpose='listen';
      const track=selectedSongForContinue&&trackFor(selectedSongForContinue.category,selectedSongForContinue.song.id,'introduccion');
      if($('modeMelodyMeta'))$('modeMelodyMeta').textContent=`${track?.notas?.length||0} notas · Canal 1`;
      transitionScreen('instrumentSettingsScreen',['homeView','songView','createView','player','playModeModal','instrumentSettingsScreen']);
      queueGuidedTour('instrumentos');
      return;
    }
    beginSelectedSong(selectedPlayMode);
  };
  document.querySelectorAll('[data-mode-tab]').forEach(button=>button.onclick=()=>showModeScreenTab(button.dataset.modeTab));
  $('songSettingsTrack').onchange=()=>{selectedCreateTrack=$('songSettingsTrack').value;syncSongTrackSettingsForm(selectedCreateTrack);};
  $('songTrackInstrument').onchange=saveSongTrackSettings;
  $('songTrackIntensity').onchange=saveSongTrackSettings;
  $('songTrackOctaveShift').onchange=saveSongTrackSettings;
  $('songTrackLayerEnabled').onchange=saveSongTrackSettings;
  $('songTrackLayerInstrument').onchange=saveSongTrackSettings;
  $('songTrackLayerVolume').oninput=()=>{$('songTrackLayerVolumeValue').textContent=`${$('songTrackLayerVolume').value}%`;if(selectedCreateSong&&$('songSettingsTrack').value===state.melodyType)applySongTrackInstrument({...instrumentTrackConfig(selectedCreateSong.category,selectedCreateSong.song.id,state.melodyType),layerEnabled:$('songTrackLayerEnabled').checked,layerInstrument:$('songTrackLayerInstrument').value,layerVolume:Number($('songTrackLayerVolume').value)});};
  $('songTrackLayerVolume').onchange=saveSongTrackSettings;
  document.querySelectorAll('[data-play-mode]').forEach(button=>['focus','pointerenter'].forEach(signal=>button.addEventListener(signal,()=>{
    const copy={listen:['Solo ver y escuchar','Reproduce automáticamente la alabanza completa.'],practice:['Practicar melodía','Las notas de la melodía esperan a que las toques para avanzar.'],second:['Escuchar segunda voz','Reproduce únicamente la segunda voz generada según la dirección elegida.'],third:['Escuchar tercera voz','Reproduce únicamente la tercera voz generada según la dirección elegida.']}[button.dataset.playMode];
    if(copy)selectPlayMode(button.dataset.playMode);
  })));
  const bindModeScreenSetting=(controlId,sourceId)=>{
    const control=$(controlId),source=$(sourceId);if(!control||!source)return;
    control.value=source.value;
    control.addEventListener('input',event=>{source.value=event.target.value;source.dispatchEvent(new Event(source.type==='color'?'input':'change',{bubbles:true}));});
    control.addEventListener('change',event=>{source.value=event.target.value;source.dispatchEvent(new Event('change',{bubbles:true}));});
  };
  const bindSongTrackInstrument=(controlId,type)=>{
    const control=$(controlId);if(!control)return;
    control.addEventListener('change',event=>{
      if(selectedSongForContinue){saveVisibleTrackSettings(type,{instrument:event.target.value});return;}
      const source=$(type==='acompanamiento1'?'bassInstrumentQuick':'instrumentSelect');
      if(source){source.value=event.target.value;source.dispatchEvent(new Event('change',{bubbles:true}));}
    });
  };
  bindSongTrackInstrument('modeMelodyInstrument','melodia');
  bindSongTrackInstrument('modeBassInstrument','acompanamiento1');
  bindSongTrackInstrument('modeAccompaniment2Instrument','acompanamiento2');
  document.querySelectorAll('[data-track-intensity]').forEach(select=>select.addEventListener('change',event=>{
    const type=event.currentTarget.dataset.trackIntensity,intensity=event.currentTarget.value;
    if(selectedSongForContinue)saveVisibleTrackSettings(type,{intensity});
    else if(!state.song){try{localStorage.setItem(`yhwh_intensity_${type}`,intensity);}catch(_){}}
  }));
  document.querySelectorAll('[data-track-octave]').forEach(select=>select.addEventListener('change',event=>{
    const type=event.currentTarget.dataset.trackOctave,octaveShift=Number(event.currentTarget.value)||0;
    if(selectedSongForContinue)saveVisibleTrackSettings(type,{octaveShift});
  }));
  ['melodia','acompanamiento1','acompanamiento2'].forEach(type=>{
    const prefix=`mode_${type}_`;
    const enabled=$(prefix+'layerEnabled'),instrument=$(prefix+'layerInstrument'),volume=$(prefix+'layerVolume'),output=$(prefix+'layerVolumeValue');
    enabled?.addEventListener('change',()=>{if(instrument)instrument.disabled=!enabled.checked;if(volume)volume.disabled=!enabled.checked;saveVisibleTrackSettings(type,{layerEnabled:enabled.checked});});
    instrument?.addEventListener('change',()=>saveVisibleTrackSettings(type,{layerInstrument:instrument.value}));
    volume?.addEventListener('input',()=>{if(output)output.textContent=`${volume.value}%`;});
    volume?.addEventListener('change',()=>saveVisibleTrackSettings(type,{layerVolume:Number(volume.value)||0}));
  });
  bindModeScreenSetting('modeMelodyColor','keyColorPicker');
  bindModeScreenSetting('modeBassColor','bassColorPicker');
  bindModeScreenSetting('modeSecondDirection','secondVoiceDirection');
  bindModeScreenSetting('modeThirdDirection','thirdVoiceDirection');
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeTrackChooser();});
  [['voiceMain','principal'],['voiceSecond','segunda'],['voiceThird','tercera'],['voiceChords','acordes']].forEach(([id,name])=>$(id)&&($(id).onchange=event=>{
    state.voiceMix[name]=event.target.checked;
    if(state.playing)stopPlayback();
    $('status').textContent='Mezcla de voces actualizada. Pulsa reproducir para escuchar la selección.';
  }));
  [['secondVoiceDirection','segunda','yhwh_voice_second_direction'],['thirdVoiceDirection','tercera','yhwh_voice_third_direction']].forEach(([id,name,key])=>$(id)&&($(id).onchange=event=>{
    state.voiceDirection[name]=event.target.value==='up'?'up':'down';
    localStorage.setItem(key,state.voiceDirection[name]);
    if(state.playing)stopPlayback();
    $('status').textContent='Dirección de armonía actualizada. Pulsa reproducir para escucharla.';
  }));

  $('lyrics').onclick = event => {const chord=event.target.closest('[data-play-chord]');if(chord)playSongChord(chord.dataset.playChord,chord);};
    $('search').oninput = renderLists;
  $('songFilters').onclick=event=>{const button=event.target.closest('[data-song-filter]');if(!button)return;songListFilter=button.dataset.songFilter;renderLists();};
  $('createSearch').oninput = renderLists;
  $('adminBtn').onclick = showLogin;
  $('loginSubmit').onclick = login;
  $('password').onkeydown = event => { if (event.key === 'Enter') login(); };
  $('closeLogin').onclick = () => $('loginModal').classList.add('hidden');
  $('loginModal').onclick = event => { if (event.target === $('loginModal')) $('loginModal').classList.add('hidden'); };
  $('backBtn').onclick = () => {
    if(!confirmDiscardUnsavedMelody())return;
  clearSongIntro();stopPlayback();stopMetronome();closePlayerPopovers();state.recording=false;
    const returnTo=state.view==='libre'?'homeView':state.view==='crear'?'createTrackScreen':'songView';
    document.body.classList.toggle('song-list-active',returnTo==='songView');
    document.body.classList.toggle('create-list-active',returnTo==='createView');
    document.body.classList.toggle('home-active',returnTo==='homeView');
    transitionScreen(returnTo,['homeView','songView','createView','createTrackScreen','instrumentSettingsScreen','player']);
    renderLists();
  };
  $('playMelody').onclick = () => practiceRun ? stopPlayback() : state.playMode==='practice' ? startPracticeMelody() : playMelody();
  $('practiceHearBtn').onclick=hearPracticeNote;
  $('practiceSkipBtn').onclick=advancePracticeNote;
  $('tempoControl').value = String(Math.round(state.tempo*100));
  $('tempoValue').textContent = `${Math.round(state.tempo*100)}%`;
  const volumeControl=$('masterVolume');if(volumeControl){volumeControl.value=String(Math.round(state.masterVolume*100));setMasterVolume(volumeControl.value);volumeControl.oninput=event=>setMasterVolume(event.target.value);}
  $('tempoControl').oninput = event => {
    state.tempo = Math.min(1.5,Math.max(.5,Number(event.target.value)/100));
    $('tempoValue').textContent = `${Math.round(state.tempo*100)}%`;
    updateTrackTimeline();
    try { localStorage.setItem('yhwh_piano_tempo',String(state.tempo)); } catch (_) {}
  };
  syncMetronomeUI();
  $('metronomeBpm').oninput = event => setMetronomeBpm(event.target.value);
  $('metronomeBpm').onchange = event => setMetronomeBpm(event.target.value,true);
  $('metronomeMeter').onchange = event => setMetronomeMeter(event.target.value);
  $('metronomeToggle').onclick = toggleMetronome;
  $('metronomeTempoDown').onclick=()=>setMetronomeBpm(metronomeBpm-1,true);
  $('metronomeTempoUp').onclick=()=>setMetronomeBpm(metronomeBpm+1,true);
  $('tapTempo').onclick = tapMetronomeTempo;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMetronome();});
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'AUDIO_CACHE_STATUS') refreshHomeAudioStatus(event.data.cached,event.data.total,false);
    if (event.data?.type === 'AUDIO_CACHE_STARTED') refreshHomeAudioStatus(homeAudioCacheStatus.cached,homeAudioCacheStatus.total,true);
    if (event.data?.type === 'AUDIO_CACHE_PROGRESS') refreshHomeAudioStatus(event.data.cached,event.data.total,true);
    if (event.data?.type === 'AUDIO_CACHE_DONE') { offlineAudioDownloadRunning=false; refreshHomeAudioStatus(event.data.done,event.data.total,false); }
    if (event.data?.type === 'AUDIO_CACHE_ERROR') { offlineAudioDownloadRunning=false; $('offlineStatus').textContent = `La descarga quedó incompleta (${event.data.done}/${event.data.total}). Se reanudará cuando haya conexión.`; }
  });
  $('stopMelody').onclick = () => {
    const wasPlaying = state.playing;
    clearSongIntro();stopPlayback(); $('status').textContent = wasPlaying ? 'Reproducción detenida.' : 'No había una melodía reproduciéndose.';
  };
  $('keyboardNotation').value = state.notation;
  buildNotationButtons();
  setKeyboardZoom(state.keyboardZoom);
  $('keyboardOctaveLabel').textContent = canonicalNoteName(state.keyboardOctaveMidi);
  $('octaveDown').onclick = () => moveKeyboardOctave(-1);
  $('octaveUp').onclick = () => moveKeyboardOctave(1);
  $('keyboardZoomOut').onclick = () => setKeyboardZoom(state.keyboardZoom - 0.15);
  $('keyboardZoomIn').onclick = () => setKeyboardZoom(state.keyboardZoom + 0.15);
  window.addEventListener('resize',()=>{keyBaseWidthCache=0;stageLastKeyWidth=-1;fallingNotesGeometry=null;syncStageScroll();scheduleKeyboardClamp();},{passive:true});
  if(window.ResizeObserver&&$('keyboardScroll'))new ResizeObserver(()=>scheduleKeyboardClamp()).observe($('keyboardScroll'));
  $('keyboardNotation').onchange = event => {
    state.notation = ['ninguno','octavas','americano','latino','movil','grados','simple'].includes(event.target.value)?event.target.value:'americano';
    deviceSettings.noteNotation=state.notation==='latino'?'latino':'americano';
    saveDeviceSettings();
    try { localStorage.setItem('yhwh_piano_note_labels',state.notation);localStorage.setItem('yhwh_cifrado_latino', state.notation === 'latino' ? '1' : '0'); } catch (_) {}
    renderKeyboard(); renderRecorded();
    if (state.lastMidi !== null) $('currentNote').textContent = noteName(state.lastMidi);
    if (state.song) updateTransposeUI();
    updateActiveChordLabel();
    updateVisualOptions();
  };
  $('instrumentToggle').onclick=()=>{togglePlayerPopover('instrumentMenu');syncInstrumentButtons();};
  $('keyColorToggle').onclick=()=>togglePlayerPopover('colorMenu');
  $('keyboardRangeToggle').onclick=()=>togglePlayerPopover('keyboardRangeMenu');
  $('notationToggle').onclick=()=>{togglePlayerPopover('notationMenu');$('keyboardNotation').value=state.notation;syncNotationButtons();};
  $('chordsViewToggle').onclick=toggleLyricsPanel;
  $('settingsToggle').onclick=openPlayerSettingsScreen;
  $('closeSettings').onclick=closePlayerSettingsScreen;
  $('closeChordEditor').onclick=()=>{chordEditorOpen=false;closePlayerPopovers();};
  $('closeNotes').onclick=()=>{$('notesPanel').dataset.open='';updateVisualOptions();};
  $('keyColorPicker').value=state.keyColor;
  $('keyColorPicker').oninput=event=>{state.keyColor=event.target.value;try{localStorage.setItem('yhwh_piano_key_color',state.keyColor);}catch(_){}updateVisualOptions();};
  $('bassColorPicker').oninput=event=>{state.bassColor=event.target.value;try{localStorage.setItem('yhwh_piano_bass_color',state.bassColor);}catch(_){}updateVisualOptions();};
  $('showBarNotes').onchange=event=>{state.showBarNotes=event.target.checked;try{localStorage.setItem('yhwh_piano_show_bar_notes',state.showBarNotes?'1':'0');}catch(_){}updateVisualOptions();};
  {const glowSwitch=$('fxGlowSwitch'),lightSwitch=$('lightKeysSwitch'),colorSwitch=$('keyColorOnSwitch'),edgeSwitch=$('keyEdgeSwitch');
    const save=(key,on)=>{try{localStorage.setItem(key,on?'1':'0');}catch(_){}};
    const applyKeyLook=()=>{document.body.classList.toggle('keys-no-color',!keyColorOn);document.body.classList.toggle('keys-edge',keyEdge);document.body.classList.toggle('keys-fill-off',!lightKeys);if(colorSwitch)colorSwitch.disabled=!(lightKeys||keyEdge);};
    if(glowSwitch){glowSwitch.checked=fxGlow;glowSwitch.onchange=event=>{fxGlow=event.target.checked;deviceSettings.fxGlow=fxGlow;save('yhwh_piano_fx_glow',fxGlow);if($('deviceGlowEnabled'))$('deviceGlowEnabled').checked=fxGlow;updateDeviceSettingsPreview();saveDeviceSettings();};}
    if(lightSwitch){lightSwitch.checked=lightKeys;lightSwitch.onchange=event=>{lightKeys=event.target.checked;deviceSettings.lightKeys=lightKeys;save('yhwh_piano_light_keys',lightKeys);applyKeyLook();if($('deviceKeyLightEnabled'))$('deviceKeyLightEnabled').checked=lightKeys;saveDeviceSettings();};}
    if(colorSwitch){colorSwitch.checked=keyColorOn;colorSwitch.onchange=event=>{keyColorOn=event.target.checked;save('yhwh_piano_key_color_on',keyColorOn);applyKeyLook();};}
    if(edgeSwitch){edgeSwitch.checked=keyEdge;edgeSwitch.onchange=event=>{keyEdge=event.target.checked;save('yhwh_piano_key_edge',keyEdge);applyKeyLook();};}
    applyKeyLook();}
    setupNeonEdgeControls();
    {const sw=$('noteLabelOutlineSwitch');if(sw)sw.onchange=event=>setNoteLabelOutline(event.target.checked);setNoteLabelOutline(noteLabelOutline,false);}
    $('showOctaveNotes').onchange=event=>{state.showOctaveNotes=event.target.checked;try{localStorage.setItem('yhwh_piano_show_octave',state.showOctaveNotes?'1':'0');}catch(_){}renderRecorded();};
  $('keyboardZoomSlider').oninput=event=>setKeyboardZoom(Number(event.target.value)/100);
  document.querySelectorAll('[data-key-range]').forEach(button=>button.onclick=()=>{
    if(button.dataset.keyRange==='custom'){$('keyboardZoomSlider').focus();return;}
    setKeyboardPreset(Number(button.dataset.keyRange));
  });
  $('keyboardScroll').addEventListener('scroll',syncStageScroll,{passive:true});
  {
    const player=$('player'),wideToggle=$('widePianoToggle'),scroll=$('keyboardScroll'),overview=$('keyboardOverview'),windowMarker=$('keyboardOverviewWindow'),instrumentToggle=$('instrumentToggle'),instrumentHome=instrumentToggle?.parentElement,headerActions=wideToggle?.parentElement;
    const widePopoverOrigins=['instrumentMenu','notationMenu','keyboardRangeMenu'].map(id=>{const node=$(id);return node?{node,parent:node.parentElement,next:node.nextSibling}:null;}).filter(Boolean);
    const moveWidePopovers=enabled=>widePopoverOrigins.forEach(({node,parent,next})=>{if(enabled){node.classList.add('wide-player-popover');player.appendChild(node);}else{node.classList.remove('wide-player-popover');parent.insertBefore(node,next&&next.parentNode===parent?next:null);}});
    const wideMedia=window.matchMedia('(orientation: landscape) and (pointer: coarse)');
    let previousZoom=null,dragging=false;
    if(overview){
      const whiteKeys=[];
      for(let midi=21;midi<=108;midi++)if(!NOTE_NAMES[midi%12].includes('#')){
        const hasBlack=midi%12!==4&&midi%12!==11&&midi+1<=108;
        whiteKeys.push('<span class="keyboard-overview-key">'+(hasBlack?'<i></i>':'')+'</span>');
      }
      overview.insertAdjacentHTML('afterbegin',whiteKeys.join(''));
    }
    const syncOverview=()=>{
      if(!scroll||!overview||!windowMarker)return;
      const maxScroll=Math.max(0,scroll.scrollWidth-scroll.clientWidth),visible=scroll.scrollWidth?Math.min(1,scroll.clientWidth/scroll.scrollWidth):1;
      const markerWidth=visible*100,position=maxScroll?scroll.scrollLeft/maxScroll*(100-markerWidth):0;
      windowMarker.style.width=markerWidth+'%';windowMarker.style.left=position+'%';
      overview.setAttribute('aria-valuenow',String(Math.round(maxScroll?scroll.scrollLeft/maxScroll*100:0)));
    };
    const seekOverview=event=>{
      const rect=overview.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
      scroll.scrollLeft=ratio*scroll.scrollWidth-scroll.clientWidth/2;
      syncOverview();
    };
    const setWideMode=enabled=>{
      if(enabled&&!wideMedia.matches)return;
      if(enabled){if(previousZoom===null)previousZoom=state.keyboardZoom;player.querySelectorAll('#noteCanvas .manual-note-effect').forEach(effect=>effect.remove());player.classList.add('mobile-piano-wide');moveWidePopovers(true);if(instrumentToggle&&headerActions){instrumentToggle.classList.add('instrument-header-toggle');headerActions.prepend(instrumentToggle);syncInstrumentButtons();}clearFallingNotesCanvas();wideToggle.setAttribute('aria-pressed','true');wideToggle.setAttribute('aria-label','Volver al tamaño normal del piano');wideToggle.title='Volver al tamaño normal';wideToggle.textContent='×';requestAnimationFrame(()=>{keyBaseWidthCache=0;stageLastKeyWidth=-1;setKeyboardZoom(1.8,{persist:false});syncOverview();});}
      else{player.classList.remove('mobile-piano-wide');moveWidePopovers(false);if(instrumentToggle&&instrumentHome){instrumentToggle.classList.remove('instrument-header-toggle');instrumentHome.prepend(instrumentToggle);syncInstrumentButtons();}wideToggle.setAttribute('aria-pressed','false');wideToggle.setAttribute('aria-label','Ampliar el piano');wideToggle.title='Ampliar el piano';wideToggle.textContent='⛶';const restoreZoom=previousZoom;previousZoom=null;requestAnimationFrame(()=>{keyBaseWidthCache=0;stageLastKeyWidth=-1;if(restoreZoom!==null)setKeyboardZoom(restoreZoom,{persist:false});requestAnimationFrame(()=>{fallingNotesCanvasDirty=true;fallingNotesGeometry=null;if(fallingNotesFrame)cancelAnimationFrame(fallingNotesFrame);fallingNotesFrame=0;if(!resizeFallingNotesCanvas())return;if(state.playing&&fallingNotesRun||fnHasFx())fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);else clearFallingNotesCanvas();});});}
    };
    if(wideToggle)wideToggle.addEventListener('click',()=>setWideMode(wideToggle.getAttribute('aria-pressed')!=='true'));
    if(overview&&scroll){
      overview.addEventListener('pointerdown',event=>{dragging=true;overview.setPointerCapture(event.pointerId);seekOverview(event);});
      overview.addEventListener('pointermove',event=>{if(dragging)seekOverview(event);});
      ['pointerup','pointercancel','lostpointercapture'].forEach(type=>overview.addEventListener(type,()=>{dragging=false;}));
      overview.addEventListener('keydown',event=>{const page=Math.max(1,scroll.clientWidth*.75);if(event.key==='ArrowLeft')scroll.scrollBy({left:-page,behavior:'smooth'});else if(event.key==='ArrowRight')scroll.scrollBy({left:page,behavior:'smooth'});else if(event.key==='Home')scroll.scrollTo({left:0,behavior:'smooth'});else if(event.key==='End')scroll.scrollTo({left:scroll.scrollWidth,behavior:'smooth'});else return;event.preventDefault();});
      scroll.addEventListener('scroll',syncOverview,{passive:true});
      $('keyboardPanLeft').onclick=()=>scroll.scrollBy({left:-scroll.clientWidth*.78,behavior:'smooth'});
      $('keyboardPanRight').onclick=()=>scroll.scrollBy({left:scroll.clientWidth*.78,behavior:'smooth'});
      $('keyboardZoomOutWide').onclick=()=>setKeyboardZoomByKey(-1);
      $('keyboardZoomInWide').onclick=()=>setKeyboardZoomByKey(1);
      if(window.ResizeObserver)new ResizeObserver(syncOverview).observe(scroll);
      window.addEventListener('resize',syncOverview,{passive:true});
    }
    const onWideMediaChange=event=>{
      if(event.matches&&player.classList.contains('mobile-piano-wide')){if(fallingNotesFrame)cancelAnimationFrame(fallingNotesFrame);fallingNotesFrame=0;clearFallingNotesCanvas();}
      else if(player.classList.contains('mobile-piano-wide'))setWideMode(false);
      else if((state.playing&&fallingNotesRun||fnHasFx())&&!fallingNotesFrame&&fallingNotesStyle!=='off')fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
    };
    if(wideMedia.addEventListener)wideMedia.addEventListener('change',onWideMediaChange);else wideMedia.addListener(onWideMediaChange);
    requestAnimationFrame(syncOverview);
  }
  try{if(/[?&]perf=1/.test(location.search)||safeStorageGetItem('yhwh_perf')==='1')perfProbeEnable(true);}catch(_){}
  {const strip=$('playerTimeline');if(strip){let pressTimer=0;const cancelPress=()=>{clearTimeout(pressTimer);pressTimer=0;};
    strip.addEventListener('pointerdown',()=>{cancelPress();pressTimer=setTimeout(()=>{pressTimer=0;perfProbeEnable(!perfProbe.on);try{localStorage.setItem('yhwh_perf',perfProbe.on?'1':'0');}catch(_){}},700);},{passive:true});
    ['pointerup','pointercancel','pointerleave'].forEach(type=>strip.addEventListener(type,cancelPress,{passive:true}));}}
  {const tempoBox=document.querySelector('.stage-metronome-controls'),playGroup=document.querySelector('.player-playback-group');if(tempoBox&&playGroup&&tempoBox.parentElement!==playGroup)playGroup.appendChild(tempoBox);}
  initFallingStyleSetting();initFxStyleSetting();initBarLookSetting();initBarAppearanceSetting();initPianoKeyStyleSetting();initializePlayerSettingsPage();
  bindCanvasGestures();
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.stage-popover,.player-sheet,.toolbar-icon,.top-tempo,.stage-tool-rail'))closePlayerPopovers();});
  registerExtraInstrumentOptions();
  $('instrumentSelect').value = state.instrument;
  buildInstrumentButtons();
  syncStringsLayerControls();
  syncThirdLayerControls();
  $('stringsLayerToggle').onchange=event=>setStringsLayerEnabled(event.target.checked);
  $('stringsLayerVolume').oninput=event=>setStringsLayerVolume(event.target.value);
  if($('layerInstrumentSelect'))$('layerInstrumentSelect').onchange=event=>setLayerInstrument(event.target.value);
  if(state.stringsLayerEnabled){getStringsLayerGain();primeStringsLayer();}
  $('thirdLayerToggle').onchange=event=>setThirdLayerEnabled(event.target.checked);
  $('thirdLayerVolume').oninput=event=>setThirdLayerVolume(event.target.value);
  $('thirdLayerInstrument').onchange=event=>setThirdLayerInstrument(event.target.value);
  if(state.thirdLayerEnabled){getThirdLayerGain();primeThirdLayer();}
  syncDynamicLayerControl(state.instrument);
  syncPianoLayerControl();
  $('headroomIntensity').onchange=event=>{const max=state.instrument==='livingroom-upright-micro'?2:5;state.headroomVelocityLayer=Math.min(max,Math.max(1,Number(event.target.value)||3));try{localStorage.setItem('yhwh_piano_headroom_layer',String(state.headroomVelocityLayer));}catch(_){}};
  $('trumpetIntensity').onchange = event => { state.trumpetIntensity = ['soft','medium','strong','very-strong'].includes(event.target.value) ? event.target.value : 'strong'; try { localStorage.setItem('yhwh_piano_trumpet_intensity', state.trumpetIntensity); } catch (_) {} };
  $('instrumentSelect').onchange = event => {
    state.instrument = availableInstrumentId(event.target.value);
    syncDynamicLayerControl(state.instrument);
    syncPianoLayerControl(state.instrument);
    if(!state.song){freePlayInstrumentConfig.instrument=state.instrument;try { localStorage.setItem('yhwh_piano_instrument', state.instrument); } catch (_) {}}
    primeAudioForInstrument(state.instrument);
    syncInstrumentButtons();
    $('status').textContent = `Preparando ${instrumentLabel(state.instrument)}…`;
  };
  const sustainButton = $('sustainBtn');
  if (sustainButton) {
    sustainButton.classList.toggle('active', state.sustain);
    sustainButton.setAttribute('aria-pressed', String(state.sustain));
    sustainButton.onclick = () => {
      state.sustain = !state.sustain;
      if(!state.sustain)releaseSustainedNotes();
      try { localStorage.setItem('yhwh_piano_sustain', state.sustain ? '1' : '0'); } catch (_) {}
      sustainButton.classList.toggle('active', state.sustain);
      sustainButton.setAttribute('aria-pressed', String(state.sustain));
      $('status').textContent = state.sustain ? 'Sustain activado: las notas se prolongan brevemente al soltarlas.' : 'Sustain desactivado: las notas sostenidas se apagan suavemente.';
    };
  }
  $('recordedNotes').onclick = event => { const gap=event.target.closest('[data-chord-target]');if(gap){chooseChordTarget(Number(gap.dataset.chordTarget));return;}const chip=event.target.closest('[data-note-index]'); if(chip) chooseChordTarget(Number(chip.dataset.noteIndex)); };
  $('recordedNotes').onkeydown = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const chip=event.target.closest('[data-note-index],[data-chord-target]');
    if (!chip) return;
    event.preventDefault(); chooseChordTarget(Number(chip.dataset.chordTarget??chip.dataset.noteIndex));
  };
  $('applyChordBtn').onclick = saveSelectedChord;
  $('chordPreset').onchange=event=>applyChordPreset(event.target.value);
  $('chordArpeggio').onchange = syncChordEditorMode;
  $('bassInstrument').value = state.bassInstrument;
  if($('bassInstrumentQuick')){$('bassInstrumentQuick').value=state.bassInstrument;$('bassInstrumentQuick').onchange=event=>{$('bassInstrument').value=event.target.value;$('bassInstrument').dispatchEvent(new Event('change'));};}
  $('bassInstrument').onchange = event => {
    state.bassInstrument = availableInstrumentId(event.target.value);
    if($('bassInstrumentQuick'))$('bassInstrumentQuick').value=state.bassInstrument;
    try { localStorage.setItem('yhwh_piano_bass_instrument', state.bassInstrument); } catch (_) {}
  };
  $('removeChordBtn').onclick = removeSelectedChord;
  $('previewChordBtn').onclick = () => {
    if(state.chordTarget === null){ toast('Primero elige una nota de la lista.'); return; }
    playChord({ noteIndex:state.chordTarget, root:$('chordRoot').value, quality:$('chordQuality').value, inversion:Number($('chordInversion').value), octave:Number($('chordOctave').value), duration:Number($('chordDuration').value), arpeggio:$('chordArpeggio').checked, instrument:$('bassInstrument').value, preview:true });
  };
  $('showNotesBtn').onclick = jumpToMelodyNotes;
  const octaveModeButton=$('octaveModeToggle');
  if(octaveModeButton){
    const syncOctaveModeButton=()=>{octaveModeButton.classList.toggle('active',state.octaveDoubling);octaveModeButton.setAttribute('aria-pressed',String(state.octaveDoubling));const label=`${state.octaveDoubling?'Desactivar':'Activar'} doblado a la octava`;octaveModeButton.setAttribute('aria-label',label);octaveModeButton.title=label;};
    syncOctaveModeButton();
    octaveModeButton.onclick=()=>{state.octaveDoubling=!state.octaveDoubling;try{localStorage.setItem('yhwh_piano_octave_doubling',state.octaveDoubling?'1':'0');}catch(_){}syncOctaveModeButton();};
  }
  $('activeKeyName').onclick=()=>togglePlayerPopover('keyTransposePopover');
  $('transposeTargetKey').onchange=event=>transposeMelodyToKey(event.target.value);
  $('transposeToOriginal').onclick=()=>{if(state.transpose)transposeMelody(-state.transpose);closePlayerPopovers();};
  $('trackRoot').onchange = changeTrackTonic; $('trackMode').onchange = changeTrackTonic;
  $('recordBtn').onclick = toggleRecord;
  $('saveBtn').onclick = saveMelody;
  $('undoBtn').onclick = () => {
    if (!state.admin) { toast('Solo Admin puede quitar notas.'); return; }
    if (!state.notes.length) { toast('No hay notas para quitar.'); return; }
    state.notes.pop(); state.chords=state.chords.filter(chord=>Number(chord.noteIndex)<state.notes.length); if(state.chordTarget!==null&&state.chordTarget>=state.notes.length)state.chordTarget=null; state.melodyDirty=true; renderRecorded(); updateTrackTimeline(); $('status').textContent = 'Se quitó la última nota. Pulsa “Guardar melodía” para sincronizar.';
  };
  $('deleteBtn').onclick = deleteMelody;
  window.addEventListener('online', () => { $('connection').textContent = '🌐 Con conexión'; $('connection').className = 'connection online'; downloadOfflineAudio(); });
  window.addEventListener('offline', () => { $('connection').textContent = '📴 Sin conexión'; $('connection').className = 'connection offline'; });
  const heldKeyboardNotes=new Map();
  const releaseKeyboardNotes=()=>{
    for(const [code,active] of heldKeyboardNotes){
      heldKeyboardNotes.delete(code);active.releasedAt=performance.now();active.stopNote?.(active.releasedAt);
    }
    releaseSustainedNotes();
  };
  window.addEventListener('keydown',event=>{
    const player=$('player'),target=event.target;
    if(event.repeat||state.playbackPreparing||!player||player.classList.contains('hidden')||
       (target instanceof Element&&target.closest('input,select,textarea,button,[contenteditable="true"]')))return;
    const map={a:60,w:61,s:62,e:63,d:64,f:65,t:66,g:67,y:68,h:69,u:70,j:71,k:72,o:73,l:74,p:75,';':76};
    const midi=map[event.key.toLowerCase()];if(!midi||heldKeyboardNotes.has(event.code))return;
    event.preventDefault();
    const active={stopNote:null,releasedAt:null};heldKeyboardNotes.set(event.code,active);
    playNote(midi,document.querySelector(`.key[data-midi="${midi}"]`),Infinity).then(stopNote=>{
      if(heldKeyboardNotes.get(event.code)===active)active.stopNote=stopNote;
      else stopNote?.(active.releasedAt);
    });
  });
  window.addEventListener('keyup',event=>{
    const active=heldKeyboardNotes.get(event.code);if(!active)return;
    heldKeyboardNotes.delete(event.code);active.releasedAt=performance.now();active.stopNote?.(active.releasedAt);
  });
  window.addEventListener('blur',releaseKeyboardNotes);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseKeyboardNotes();});
}


