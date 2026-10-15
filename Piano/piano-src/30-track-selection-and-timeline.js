function openCreateTrackScreen(){
  if(!selectedCreateSong)return;
  if(!state.admin){toast('Inicia sesión como Admin para grabar pistas.');return;}
  const {song,category}=selectedCreateSong;
  $('createTracksSongTitle').textContent=song.title||'Alabanza';
  $('createTrackScreen').dataset.category=category;$('createTrackScreen').dataset.songId=String(song.id);
  document.querySelectorAll('[data-record-track]').forEach(button=>{
    const exists=hasTrack(category,song.id,button.dataset.recordTrack);
    const label=button.querySelector('em');if(label)label.textContent=exists?'Grabación guardada · puedes reemplazarla':'Aún no grabada';
  });
  transitionScreen('createTrackScreen',['homeView','songView','createView','theoryView','createTrackScreen','player','instrumentSettingsScreen']);
  document.body.classList.remove('create-list-active');
  queueGuidedTour('grabar');
}
function beginCreateTrack(type){
  if(!selectedCreateSong||!['melodia','acompanamiento1','acompanamiento2'].includes(type))return;
  if(!state.admin){toast('Solo Admin puede grabar pistas.');return;}
  selectedCreateTrack=type;
  const {song,category}=selectedCreateSong;
  state.pendingSong={song,category};state.pendingPurpose='create';
  openSong(song,category,type,false,'record');
}
function openCreateTrackSettings(){
  if(!selectedCreateSong)return;
  state.pendingSong=selectedCreateSong;state.pendingPurpose='create';
  selectedCreateTrack=$('songSettingsTrack')?.value||selectedCreateTrack;
  const screen=$('instrumentSettingsScreen');screen.classList.add('create-track-settings-mode');
  $('songTrackSettings').classList.remove('hidden');$('songSettingsTrack').value=selectedCreateTrack;
  const options=[...$('instrumentSelect').options].map(option=>`<option value="${escapeHTML(option.value)}">${escapeHTML(option.textContent)}</option>`).join('');
  $('songTrackInstrument').innerHTML=options;$('songTrackLayerInstrument').innerHTML=options;
  syncSongTrackSettingsForm(selectedCreateTrack);
  transitionScreen('instrumentSettingsScreen',['homeView','songView','createView','createTrackScreen','theoryView','player','playModeModal','instrumentSettingsScreen']);
  queueGuidedTour('instrumentosGrabacion');
}
function instrumentTrackConfig(category,id,type){
  const record=melodyFor(category,id)||{},saved=record.trackSettings?.[type]||{};
  const track=trackFor(category,id,type)||{};
  const newTrack=['melodia','acompanamiento1','acompanamiento2'].includes(type);
  const instrument=saved.instrument||track.instrument||(type==='acompanamiento1'?state.bassInstrument:state.instrument);
  return {instrument,intensity:['very-soft','soft','medium','strong','very-strong'].includes(saved.intensity)?saved.intensity:'strong',octaveShift:[-24,-12,0,12,24].includes(Number(saved.octaveShift))?Number(saved.octaveShift):0,layerEnabled:typeof saved.layerEnabled==='boolean'?saved.layerEnabled:typeof track.layerEnabled==='boolean'?track.layerEnabled:(newTrack?false:state.stringsLayerEnabled),layerInstrument:saved.layerInstrument||track.layerInstrument||(newTrack?'strings':state.layerInstrument),layerVolume:Math.max(0,Math.min(200,Number(saved.layerVolume??track.layerVolume??state.stringsLayerVolume)||0))};
}
function shiftRecordedTrackNotes(notes,octaveShift){
  const shift=Number(octaveShift)||0;
  return notes.map(note=>({...note,midi:Number(note.midi)+shift})).filter(note=>Number.isFinite(note.midi)&&note.midi>=0&&note.midi<=127);
}
function shiftRecordedTrackChords(chords,octaveShift){
  const shift=Number(octaveShift)||0;
  return shift?chords.map(chord=>({...chord,octave:(Number(chord.octave)||0)+shift})):chords;
}
function syncSongTrackSettingsForm(type=$('songSettingsTrack')?.value||selectedCreateTrack){
  if(!selectedCreateSong)return;
  const {category,song}=selectedCreateSong,config=instrumentTrackConfig(category,song.id,type);
  $('songTrackInstrument').value=config.instrument;$('songTrackIntensity').value=config.intensity||'strong';$('songTrackOctaveShift').value=String(config.octaveShift||0);$('songTrackLayerEnabled').checked=config.layerEnabled;
  $('songTrackLayerInstrument').value=config.layerInstrument;$('songTrackLayerVolume').value=String(config.layerVolume);
  $('songTrackLayerVolumeValue').textContent=`${config.layerVolume}%`;
  $('songTrackLayerInstrument').disabled=!config.layerEnabled;$('songTrackLayerVolume').disabled=!config.layerEnabled;
  $('songTrackSettingsStatus').textContent=`${SONG_TRACK_LABELS[type]} · ${instrumentLabel(config.instrument)}${config.layerEnabled?` + ${instrumentLabel(config.layerInstrument)}`:''}`;
}
async function saveSongTrackSettings(){
  if(!selectedCreateSong)return;
  const {song,category}=selectedCreateSong,type=$('songSettingsTrack').value;
  const current=instrumentTrackConfig(category,song.id,type);
  const config={instrument:$('songTrackInstrument').value||current.instrument,intensity:$('songTrackIntensity').value||current.intensity,octaveShift:Number($('songTrackOctaveShift').value)||0,layerEnabled:$('songTrackLayerEnabled').checked,layerInstrument:$('songTrackLayerInstrument').value||current.layerInstrument,layerVolume:Math.max(0,Math.min(200,Number($('songTrackLayerVolume').value)||0))};
  const record=melodyFor(category,song.id)||{},tracks=melodyTracks(record);
  tracks.trackSettings={...tracks.trackSettings,[type]:config};
  const stored=serializeMelodyTracks(record,tracks);
  state.melodies[category]||={};state.melodies[category][String(song.id)]=stored;
  try{localStorage.setItem('yhwh_melodias_cache',JSON.stringify(state.melodies));}catch(_){ }
  if(state.admin&&state.db&&state.ref&&state.set){
    try{await state.set(state.ref(state.db,`melodias/${category}/${song.id}`),stored);$('songTrackSettingsStatus').textContent=`${SONG_TRACK_LABELS[type]} guardado para esta alabanza.`;}
    catch(error){$('songTrackSettingsStatus').textContent='No se pudo sincronizar. El ajuste quedó en este dispositivo.';console.warn('No se sincronizó la configuración de instrumento',error);}
  }else $('songTrackSettingsStatus').textContent='Guardado en este dispositivo. Inicia sesión como Admin para sincronizarlo.';
  if(state.song&&state.song.category===category&&String(state.song.song.id)===String(song.id)&&state.melodyType===type)applySongTrackInstrument(config);
  renderLists();
}
function applySongTrackInstrument(config){
  state.instrument=config.instrument;state.trumpetIntensity=config.intensity||'strong';state.headroomVelocityLayer=state.trumpetIntensity==='very-soft'?1:state.trumpetIntensity==='soft'?2:state.trumpetIntensity==='medium'?3:state.trumpetIntensity==='strong'?4:5;if(config.instrument==='livingroom-upright-micro'&&state.headroomVelocityLayer>2)state.headroomVelocityLayer=2;state.layerInstrument=config.layerInstrument;state.stringsLayerEnabled=!!config.layerEnabled;state.stringsLayerVolume=config.layerVolume;
  if($('instrumentSelect'))$('instrumentSelect').value=state.instrument;
  syncDynamicLayerControl(state.instrument);syncPianoLayerControl(state.instrument);syncInstrumentButtons();syncStringsLayerControls();if(audioContext)updateStringsLayerGain();
  primeAudioForInstrument(state.instrument);if(state.stringsLayerEnabled)primeStringsLayer();
}
function chooseTrack(type){
  if(!state.pendingSong)return;
  const {song,category}=state.pendingSong,autoPlay=state.pendingPurpose==='listen';state.pendingSong=null;$('trackModal').classList.add('hidden');openSong(song,category,type,autoPlay);
}
function closeTrackChooser(){state.pendingSong=null;$('trackModal').classList.add('hidden');}
function syncModeScreen(){
  const pairs=[['modeMelodyInstrument','instrumentSelect'],['modeBassInstrument','bassInstrumentQuick'],['modeMelodyColor','keyColorPicker'],['modeBassColor','bassColorPicker'],['modeSecondDirection','secondVoiceDirection'],['modeThirdDirection','thirdVoiceDirection']];
  pairs.forEach(([targetId,sourceId])=>{const target=$(targetId),source=$(sourceId);if(target&&source)target.value=source.value;});
  const third=$('modeAccompaniment2Instrument'),source=$('instrumentSelect');
  if(third&&source){third.innerHTML=source.innerHTML;third.value=selectedSongForContinue?instrumentTrackConfig(selectedSongForContinue.category,selectedSongForContinue.song.id,'acompanamiento2').instrument:source.value;}
  const trackControlIds={melodia:'modeMelodyInstrument',acompanamiento1:'modeBassInstrument',acompanamiento2:'modeAccompaniment2Instrument'};
  ['melodia','acompanamiento1','acompanamiento2'].forEach(type=>{
    const config=selectedSongForContinue?instrumentTrackConfig(selectedSongForContinue.category,selectedSongForContinue.song.id,type):{instrument:state.instrument,intensity:safeStorageGetItem(`yhwh_intensity_${type}`)||'strong',layerEnabled:state.stringsLayerEnabled,layerInstrument:state.layerInstrument,layerVolume:state.stringsLayerVolume};
    const instrumentControl=$(trackControlIds[type]);if(instrumentControl)instrumentControl.value=config.instrument;
    const prefix=`mode_${type}_`,layerInstrument=$(prefix+'layerInstrument'),optionsSource=$('instrumentSelect');
    if(layerInstrument&&optionsSource){layerInstrument.innerHTML=optionsSource.innerHTML;layerInstrument.value=config.layerInstrument;}
    const enabled=$(prefix+'layerEnabled'),volume=$(prefix+'layerVolume'),output=$(prefix+'layerVolumeValue');
    if(enabled)enabled.checked=!!config.layerEnabled;if(volume){volume.value=String(config.layerVolume);volume.disabled=!config.layerEnabled;}if(output)output.textContent=`${config.layerVolume}%`;
    if(layerInstrument)layerInstrument.disabled=!config.layerEnabled;
    const intensity=document.querySelector(`[data-track-intensity="${type}"]`);if(intensity)intensity.value=config.intensity||'strong';
    const octave=document.querySelector(`[data-track-octave="${type}"]`);if(octave)octave.value=String(config.octaveShift||0);
  });
  selectPlayMode('listen');showModeScreenTab('instructions');
  const track=selectedSongForContinue&&(['introduccion','melodia','acompanamiento1','acompanamiento2','voz'].map(type=>trackFor(selectedSongForContinue.category,selectedSongForContinue.song.id,type)).find(item=>item?.notas?.length));
  if($('modeMelodyCount'))$('modeMelodyCount').textContent=`${track?.notas?.length||0} notas`;
}
async function saveVisibleTrackSettings(type, changes){
  if(!selectedSongForContinue)return false;
  const {category,song}=selectedSongForContinue,current=instrumentTrackConfig(category,song.id,type);
  const config={...current,...changes};
  const record=melodyFor(category,song.id)||{},tracks=melodyTracks(record);
  tracks.trackSettings={...tracks.trackSettings,[type]:config};
  const stored=serializeMelodyTracks(record,tracks);
  state.melodies[category]||={};state.melodies[category][String(song.id)]=stored;
  try{localStorage.setItem('yhwh_melodias_cache',JSON.stringify(state.melodies));}catch(_){ }
  if(state.admin&&state.db&&state.ref&&state.set){try{await state.set(state.ref(state.db,`melodias/${category}/${song.id}`),stored);}catch(error){console.warn('No se sincronizó el instrumento de pista',error);}}
  if(state.song?.category===category&&String(state.song.song.id)===String(song.id)&&state.melodyType===type)applySongTrackInstrument(config);
  return true;
}
function applyInstrumentSettingsPreset(settings){
  const pairs={instrument:'modeMelodyInstrument',bassInstrument:'modeBassInstrument',keyColor:'modeMelodyColor',bassColor:'modeBassColor',second:'modeSecondDirection',third:'modeThirdDirection'};
  Object.entries(settings).forEach(([key,value])=>{const control=$(pairs[key]);if(!control)return;control.value=value;control.dispatchEvent(new Event(control.type==='color'?'input':'change',{bubbles:true}));});
}
function updateInstrumentSoundToggle(track,enabled){
  const melody=track==='melody',id=melody?'melodySoundToggle':'bassSoundToggle';
  state[melody?'melodySoundEnabled':'bassSoundEnabled']=!!enabled;
  try{localStorage.setItem(melody?'yhwh_melody_sound_enabled':'yhwh_bass_sound_enabled',enabled?'1':'0');}catch(_){}
  const button=$(id);if(button){button.setAttribute('aria-checked',String(!!enabled));button.classList.toggle('muted',!enabled);const label=button.querySelector('small');if(label)label.textContent=enabled?'Sonido activado':'Sonido desactivado';}
}
function syncInstrumentSoundToggles(){updateInstrumentSoundToggle('melody',state.melodySoundEnabled);updateInstrumentSoundToggle('bass',state.bassSoundEnabled);}
function selectPlayMode(mode){
  if(!['listen','practice','second','third','settings'].includes(mode))return;
  selectedPlayMode=mode;
  const labels={listen:['Solo observar y escuchar','La alabanza se reproducirá automáticamente para que puedas verla y escucharla.'],practice:['Practicar la melodía','La melodía espera a que toques cada nota para avanzar.'],second:['Escuchar la segunda voz','Escucharás la segunda voz por separado con la dirección elegida.'],third:['Escuchar la tercera voz','Escucharás la tercera voz por separado con la dirección elegida.'],settings:['Manos, colores e instrumentos','Abre los ajustes de instrumentos, colores y dirección de las voces.']};
  const [title,description]=labels[mode];
  document.querySelectorAll('[data-play-mode]').forEach(button=>{const active=button.dataset.playMode===mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  if($('modePanelTitle'))$('modePanelTitle').textContent=title;
  if($('modeInfoText'))$('modeInfoText').textContent=description;
}
function showModeScreenTab(tab){
  if(!['instructions','directions'].includes(tab))return;
  selectedModeTab=tab;
  const ids={instructions:'modeInstructionsPanel',directions:'modeDirectionsPanel'};
  document.querySelectorAll('[data-mode-tab]').forEach(button=>{const active=button.dataset.modeTab===tab;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  Object.entries(ids).forEach(([name,id])=>$(id)?.classList.toggle('hidden',name!==tab));
  const titles={instructions:'Instrucciones',directions:'Dirección de las voces'};
  if($('modePanelTitle'))$('modePanelTitle').textContent=tab==='instructions'?({listen:'Solo observar y escuchar',practice:'Practicar la melodía',second:'Escuchar la segunda voz',third:'Escuchar la tercera voz',settings:'Manos, colores e instrumentos'}[selectedPlayMode]):titles[tab];
}
function beginSelectedSong(mode='listen'){
  if(!selectedSongForContinue)return;
  stopListPreview();
  const {song,category}=selectedSongForContinue;
  const trackType=(mode==='second'||mode==='third')&&hasTrack(category,song.id,'voz')?'voz':(['melodia','voz','introduccion','acompanamiento1','acompanamiento2'].find(type=>hasTrack(category,song.id,type))||'voz');
  openSong(song,category,trackType,true,mode==='listen'?'performance':mode);
}
function openSong(song, category, trackType='introduccion',autoPlay=false,playMode='listen') {
  if(state.melodyDirty&&!confirmDiscardUnsavedMelody())return;
  clearSongIntro();
  document.body.classList.remove('song-list-active','create-list-active');
  state.song = { song, category };
  $('instrumentSettingsScreen').classList.remove('create-track-settings-mode');$('songTrackSettings')?.classList.add('hidden');
  if(autoPlay)rememberLastHeardSong(song,category);
  state.melodyType=trackType;
  applySongTrackInstrument(instrumentTrackConfig(category,song.id,trackType));
  state.playMode=playMode;
  state.melodyDirty=false;
  state.selectedSongChord=null;document.querySelectorAll('#keyboard .key.chord-selected').forEach(key=>key.classList.remove('chord-selected'));
  state.category = category;
  state.transpose = 0;
  const isRecordingAccompaniment=playMode==='record'&&['acompanamiento1','acompanamiento2'].includes(trackType);
  const guideEntry=isRecordingAccompaniment?['melodia','voz','introduccion'].map(type=>({type,track:trackFor(category,song.id,type)})).find(entry=>entry.track?.notas?.length):null;
  state.recordGuideType=guideEntry?.type||'';
  state.recordGuideNotes=(guideEntry?.track?.notas||[]).map(note=>({...note}));
  state.recordingGuidePlaying=false;
  const savedMelody = trackFor(category, song.id,trackType) || {};
  state.songTonic = parseTonic(song.tono);
  state.originalTonic = parseTonic(savedMelody.tono) || state.songTonic || 'C';
  state.notes = (savedMelody.notas || []).map(note => ({ ...note }));
  state.chords = (savedMelody.acordes || []).map(chord => ({ ...chord }));
  state.voiceMix=playMode==='second'?{principal:false,segunda:true,tercera:false,acordes:false}:playMode==='third'?{principal:false,segunda:false,tercera:true,acordes:false}:{principal:true,segunda:false,tercera:false,acordes:true};
  state.chordTarget = null;
  state.recording=false;chordEditorOpen=false;closePlayerPopovers();
  $('songTitle').textContent = song.title || 'Alabanza';
  $('songMeta').textContent = `${category === 'jubilo' ? 'Júbilo' : 'Adoración'}${song.compositor ? ` · ${song.compositor}` : ''}`;
  document.body.classList.remove('cinematic-title-run');document.body.classList.add('song-title-visible');$('songTitlePresentationName').textContent=song.title||'Alabanza';$('songTitleCredit').textContent=song.compositor||'Ministerio YHWH';$('songTitleSubcredit').textContent='Performed by Nain';$('blackTitleName').textContent=song.title||'Alabanza';$('blackTitleAlbum').textContent=song.album||'';$('blackTitleComposer').textContent=song.compositor||'Ministerio YHWH';
  if(deviceSettings.songTitleStyle==='cinematic'){void $('songTitlePresentation').offsetWidth;document.body.classList.add('cinematic-title-run');}
  else if(deviceSettings.songTitleStyle==='black-card'){document.body.dataset.songPresentation='black-card';document.body.classList.remove('cinematic-title-run','black-title-intro');document.body.classList.add('black-title-ready');}
  else document.body.classList.remove('black-title-ready','black-title-intro');
  updateTrackTimeline();
  $('activeKeyName').textContent=state.songTonic?`Tono ${state.songTonic}`:'';
  updateTransposeUI();
  const trackLabel=SONG_TRACK_LABELS[trackType]||'Introducción';
  $('playerLabel').textContent = `${trackLabel}${savedMelody.notas?.length?' · Guardada':''}`;
  $('status').textContent = isRecordingAccompaniment&&state.recordGuideNotes.length ? `Guía de melodía lista. Al grabar, sus barras avanzarán sincronizadas para que sigas la canción.` : savedMelody.notas?.length ? `${trackLabel} guardada. Pulsa reproducir.` : `Todavía no hay ${trackLabel.toLocaleLowerCase('es')} grabada. Toca el piano o pulsa Grabar si tienes acceso de Admin.`;
  $('voiceMixer').classList.toggle('hidden',!state.admin);$('notesPanel').dataset.open='';$('notesPanel').classList.add('hidden');$('lyricsPanel').classList.add('hidden');$('chordEditorPanel').classList.add('hidden');$('activeChordLabel').textContent='';renderVoiceMixer();
  renderChordPresets();
  renderRecorded();
  updateAdminControls();
  transitionScreen('player',['homeView','songView','createView','createTrackScreen','theoryView','playModeModal','instrumentSettingsScreen','player']);
  queueGuidedTour('piano',650);
  if(deviceSettings.songTitleStyle!=='black-card')songIntroStartTimer=setTimeout(()=>{songIntroStartTimer=null;showSongIntro(autoPlay,playMode);},180);
  else if(autoPlay)songIntroStartTimer=setTimeout(()=>{songIntroStartTimer=null;if(state.song&&state.notes.length){if(playMode==='practice')startPracticeMelody();else playMelody();}},180);
  setTimeout(startKeyboardAtC4,170);
  window.scrollTo(0, 0);
}
function formatPlaybackTime(seconds){
  const value=Math.max(0,Math.floor(Number(seconds)||0));
  return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;
}
function updatePlaybackTimeline(elapsed=0,total=timelineDuration){
  const duration=Math.max(0,Number(total)||0),current=Math.min(duration,Math.max(0,Number(elapsed)||0));
  timelineDuration=duration;
  if(!SHOW_PLAYER_TIMELINE)return;
  const cache=timelineCache,elapsedText=formatPlaybackTime(current),durationText=formatPlaybackTime(duration);
  if(elapsedText!==cache.elapsed){cache.elapsed=elapsedText;$('playbackElapsed').textContent=elapsedText;}
  if(durationText!==cache.duration){cache.duration=durationText;$('playbackDuration').textContent=durationText;}
  const ratio=duration?current/duration:0;
  if(ratio!==cache.ratio&&(ratio===0||ratio===1||Math.abs(ratio-cache.ratio)>=.0004)){cache.ratio=ratio;$('playbackProgressFill').style.transform=`scaleX(${ratio})`;}
  const percent=Math.round(ratio*100);
  if(percent!==cache.percent){cache.percent=percent;$('playbackProgressTrack').setAttribute('aria-valuenow',String(percent));}
  const empty=duration<=0;
  if(empty!==cache.empty){cache.empty=empty;$('playerTimeline').classList.toggle('is-empty',empty);}
}
function estimateTrackDuration(){
  const noteEnd=state.notes.reduce((end,note)=>Math.max(end,(Number(note.start)||0)+(Number(note.duration)||.35)),0);
  const chordEnd=state.chords.reduce((end,chord)=>{
    const start=chordStartTime(chord);
    return start===null?end:Math.max(end,start+chordSpanForPlayback(chord));
  },0);
  return Math.max(noteEnd,chordEnd);
}
function updateTrackTimeline(){ updatePlaybackTimeline(0,estimateTrackDuration()/state.tempo); }
function startPlaybackTimeline(startAt,duration){
  if(timelineFrame)cancelAnimationFrame(timelineFrame);
  resetPlaybackClock();
  timelineStartedAt=startAt;
  updatePlaybackTimeline(0,duration);
  const tick=(frameTime)=>{
    if(!state.playing||!timelineStartedAt)return;
    const now=playbackNow(frameTime)||timelineStartedAt,elapsed=Math.max(0,now-timelineStartedAt);
    const probeStart=perfProbe.on?performance.now():0;
    flushVisualQueue(now,false);
    updatePlaybackTimeline(elapsed,duration);
    if(probeStart){const d=performance.now()-probeStart;perfProbe.tickSum+=d;perfProbe.tickN++;if(d>perfProbe.tickMax)perfProbe.tickMax=d;}
    if(elapsed<duration)timelineFrame=requestAnimationFrame(tick);else{timelineFrame=0;flushVisualQueue(now,true);}
  };
  timelineFrame=requestAnimationFrame(tick);
}
function resetPlaybackTimeline(){
  if(timelineFrame)cancelAnimationFrame(timelineFrame);
  timelineFrame=0;timelineStartedAt=0;
  updatePlaybackTimeline(0,timelineDuration);
}
function ensureFallingNotesObservers(){
  if(!fallingNotesVisibilityBound){
    fallingNotesVisibilityBound=true;
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){if(fallingNotesFrame)cancelAnimationFrame(fallingNotesFrame);fallingNotesFrame=0;return;}
      if((state.playing&&fallingNotesRun||fnHasFx())&&!fallingNotesFrame&&fallingNotesStyle!=='off')fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
    });
  }
  if(typeof ResizeObserver==='undefined'||fallingNotesResizeObserver)return;
  fallingNotesResizeObserver=new ResizeObserver(()=>{fallingNotesCanvasDirty=true;fallingNotesGeometry=null;keyBaseWidthCache=0;requestAnimationFrame(fnRefreshIdleLine);});
  ['noteCanvas','keyboardScroll'].forEach(id=>{const element=$(id);if(element)fallingNotesResizeObserver.observe(element);});
}
function resizeFallingNotesCanvas(){
  const canvas=$('fallingNotesCanvas'),stage=$('noteCanvas');
  if(!canvas||!stage)return false;
  const rect=stage.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0)return false;
  const dpr=Math.min(1.5,Math.max(1,window.devicePixelRatio||1));
  const pixelWidth=Math.max(1,Math.round(rect.width*dpr)),pixelHeight=Math.max(1,Math.round(rect.height*dpr));
  if(!fallingNotesCanvasInfo||canvas.width!==pixelWidth||canvas.height!==pixelHeight||fallingNotesCanvasInfo.dpr!==dpr){
    canvas.width=pixelWidth;canvas.height=pixelHeight;
    const context=canvas.getContext('2d');
    if(!context)return false;
    context.setTransform(dpr,0,0,dpr,0,0);
    fallingNotesCanvasInfo={context,width:rect.width,height:rect.height,dpr};
    fallingNotesGeometry=null;
  }else{
    fallingNotesCanvasInfo.width=rect.width;fallingNotesCanvasInfo.height=rect.height;
  }
  fallingNotesCanvasDirty=false;
  return true;
}
