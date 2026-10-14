const STEINWAY_PREFIX = 'Mp';
const STEINWAY_SAMPLE_NAMES = ["FF-A#2.m4a","FF-A#4.m4a","FF-A0.m4a","FF-A1.m4a","FF-A2.m4a","FF-A3.m4a","FF-A4.m4a","FF-A5.m4a","FF-B-1.m4a","FF-B0.m4a","FF-B1.m4a","FF-B2.m4a","FF-B3.m4a","FF-B4.m4a","FF-C#1.m4a","FF-C#5.m4a","FF-C2.m4a","FF-C3.m4a","FF-C4.m4a","FF-D#0.m4a","FF-D1.m4a","FF-D2.m4a","FF-D3.m4a","FF-D4.m4a","FF-D5.m4a","FF-E1.m4a","FF-E2.m4a","FF-E3.m4a","FF-E4.m4a","FF-E5.m4a","FF-F0.m4a","FF-F1.m4a","FF-F2.m4a","FF-F3.m4a","FF-F4.m4a","FF-F5.m4a","FF-G#2.m4a","FF-G#4.m4a","FF-G0.m4a","FF-G1.m4a","FF-G2.m4a","FF-G3.m4a","FF-G4.m4a","FF-G5.m4a","Mp-A#2.m4a","Mp-A#4.m4a","Mp-A#5.m4a","Mp-A#6.m4a","Mp-A0.m4a","Mp-A1.m4a","Mp-A2.m4a","Mp-A3.m4a","Mp-A4.m4a","Mp-A5.m4a","Mp-A6.m4a","Mp-B-1.m4a","Mp-B0.m4a","Mp-B1.m4a","Mp-B2.m4a","Mp-B3.m4a","Mp-B4.m4a","Mp-B5.m4a","Mp-C#1.m4a","Mp-C#5.m4a","Mp-C#6.m4a","Mp-C2.m4a","Mp-C3.m4a","Mp-C4.m4a","Mp-C6.m4a","Mp-D#0.m4a","Mp-D#5.m4a","Mp-D#6.m4a","Mp-D1.m4a","Mp-D2.m4a","Mp-D3.m4a","Mp-D4.m4a","Mp-D5.m4a","Mp-D6.m4a","Mp-E1.m4a","Mp-E2.m4a","Mp-E3.m4a","Mp-E4.m4a","Mp-E5.m4a","Mp-F#5.m4a","Mp-F#6.m4a","Mp-F0.m4a","Mp-F1.m4a","Mp-F2.m4a","Mp-F3.m4a","Mp-F4.m4a","Mp-F5.m4a","Mp-F6.m4a","Mp-G#2.m4a","Mp-G#4.m4a","Mp-G#5.m4a","Mp-G#6.m4a","Mp-G0.m4a","Mp-G1.m4a","Mp-G2.m4a","Mp-G3.m4a","Mp-G4.m4a","Mp-G5.m4a","Mp-G6.m4a","PP-A#2.m4a","PP-A#4.m4a","PP-A#5.m4a","PP-A#6.m4a","PP-A0.m4a","PP-A1.m4a","PP-A2.m4a","PP-A3.m4a","PP-A4.m4a","PP-A5.m4a","PP-A6.m4a","PP-B-1.m4a","PP-B0.m4a","PP-B1.m4a","PP-B2.m4a","PP-B3.m4a","PP-B4.m4a","PP-B5.m4a","PP-B6.m4a","PP-C#1.m4a","PP-C#5.m4a","PP-C#6.m4a","PP-C2.m4a","PP-C3.m4a","PP-C4.m4a","PP-C6.m4a","PP-C7.m4a","PP-D#0.m4a","PP-D#5.m4a","PP-D#6.m4a","PP-D1.m4a","PP-D2.m4a","PP-D3.m4a","PP-D4.m4a","PP-D5.m4a","PP-D6.m4a","PP-E1.m4a","PP-E2.m4a","PP-E3.m4a","PP-E4.m4a","PP-E6.m4a","PP-F#5.m4a","PP-F#6.m4a","PP-F0.m4a","PP-F1.m4a","PP-F2.m4a","PP-F3.m4a","PP-F4.m4a","PP-F5.m4a","PP-F6.m4a","PP-G#2.m4a","PP-G#4.m4a","PP-G#5.m4a","PP-G#6.m4a","PP-G0.m4a","PP-G1.m4a","PP-G2.m4a","PP-G3.m4a","PP-G4.m4a","PP-G5.m4a","PP-G6.m4a"];
function steinwayMidi(name) { const octave = Number(name.slice(-1)); const pitch = name.slice(0, -1); return (octave + 1) * 12 + NOTE_NAMES.indexOf(pitch); }
function steinwayNoteName(midi) {
  const semitones = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const candidates = STEINWAY_SAMPLE_NAMES.filter(file => file.startsWith(STEINWAY_PREFIX + '-')).map(file => file.slice(STEINWAY_PREFIX.length + 1, -4));
  const toMidi = value => {
    const octave = Number(value.slice(-1));
    const pitch = value.slice(0, -1);
    return (octave + 1) * 12 + semitones.indexOf(pitch);
  };
  return candidates.reduce((best, candidate) => Math.abs(toMidi(candidate) - midi) < Math.abs(toMidi(best) - midi) ? candidate : best, candidates[0] || 'C4');
}
async function getInstrumentSample(midi, instrument = state.instrument, prefetchOnly = false) {
  if (instrument === 'strings') { const stringsSample = await getStringsSample(midi); return { buffer: stringsSample.buffer, sampleMidi: stringsSample.sampleMidi, release: 0.5 }; }
  const spec = INSTRUMENTS[instrument];
  const vscoPatch=VSCO2_TRUMPET_PATCHES[instrument];
  const uprightPatch=VSCO2_UPRIGHT_PATCHES[instrument];
  const isSplendid=instrument==='splendid-grand';
  const isMaestro=instrument==='maestro-concert-grand';
  const isSalamander=instrument==='salamander-grand';
  const isKw=instrument==='upright-piano-kw';
  const splendidMap=isSplendid?SPLENDID_REGION_LAYERS[state.headroomVelocityLayer<=2?0:state.headroomVelocityLayer-2]:null;
  const customRoot=spec.sampledRoots?.reduce((best,item)=>Math.abs(item.midi-midi)<Math.abs(best.midi-midi)?item:best,spec.sampledRoots[0]);
  const kwLayer=state.trumpetIntensity==='strong'?'strong':'soft';
  const instrumentRegions=splendidMap||(isKw?UPRIGHT_KW_REGIONS[kwLayer]:spec.samples);
  const sample=instrumentRegions?.find(item=>midi>=item[0]&&midi<=item[1])||(spec.nearestSample?instrumentRegions?.reduce((best,item)=>Math.abs(item[2]-midi)<Math.abs(best[2]-midi)?item:best,instrumentRegions[0]):null);
  const trumpetRoots = [41,45,48,51,55,58,62,65,69,72];
  const isVscoTrumpet=instrument==='trumpet-vsco2-sus-vib',isTrumpet=isTrumpetInstrument(instrument),isCustomSample=Boolean(customRoot),isSoloViolin=instrument==='solo-violin',isDistortedGuitar=instrument==='distorted-guitar';
  const isHeadroom=instrument==='headroom-piano',isLivingroom=instrument==='livingroom-upright-micro',isLayeredPiano=isHeadroom||isSplendid||isLivingroom||isMaestro||isSalamander;
  const nearestVscoRegion=()=>VSCO2_TRUMPET_SUS_VIB_REGIONS.reduce((best,item)=>Math.abs(item[2]-midi)<Math.abs(best[2]-midi)?item:best,VSCO2_TRUMPET_SUS_VIB_REGIONS[0]);
  const vscoTrumpetRegion=isVscoTrumpet?(sample?VSCO2_TRUMPET_SUS_VIB_REGIONS.find(item=>item[2]===sample[2]):nearestVscoRegion()):null;
  const vscoPatchRegion=vscoPatch?(sample?vscoPatch.regions.find(item=>item[2]===sample[2]):vscoPatch.regions.reduce((best,item)=>Math.abs(item[2]-midi)<Math.abs(best[2]-midi)?item:best,vscoPatch.regions[0])):null;
  const sampleMidi = customRoot ? customRoot.midi : instrument === 'trumpet-real' ? trumpetRoots.reduce((best, root) => Math.abs(root - midi) < Math.abs(best - midi) ? root : best, trumpetRoots[0]) : isVscoTrumpet ? vscoTrumpetRegion[2] : vscoPatch ? vscoPatchRegion[2] : sample ? sample[2] : Math.max(spec.first, Math.min(spec.last, Math.round((midi - spec.first) / spec.step) * spec.step + spec.first));
  const actualSampleMidi = instrument === 'steinway-grand' ? steinwayMidi(steinwayNoteName(midi)) : sampleMidi;
  const intensity=state.trumpetIntensity;
  const isGrowlybass=instrument==='growlybass-clean',isFashionbass=instrument==='fashionbass-clean';
  const dynamicLayer=intensity==='soft'?0:intensity==='medium'?1:2;
  const sampleLayer=intensity==='soft'?'soft':vscoPatch?.roundRobin&&intensity==='medium'?'medium':'strong';
  const uprightRegion=uprightPatch?.regions.find(item=>item[2]===actualSampleMidi);
  const uprightLayer=uprightPatch?.folder==='vsco2-upright-piano'?`dyn${dynamicLayer+1}`:['pp','mf','f'][dynamicLayer];
  const uprightRrList=uprightRegion?(uprightPatch.folder==='vsco2-upright-piano'?[1]:[...(uprightRegion[4+dynamicLayer]||'1')].map(Number)):[];
  const rrKey=`${instrument}:${actualSampleMidi}:${intensity}`;
  const roundRobinCount=isGrowlybass?4:isFashionbass?(spec.roundRobinCount||3):vscoPatch?.roundRobin?2:uprightRrList.length;
  const roundRobin=roundRobinCount>1?((state.instrumentRoundRobinCounters.get(rrKey)||0)%roundRobinCount)+1:1;
  if(roundRobinCount>1)state.instrumentRoundRobinCounters.set(rrKey,roundRobin);
  const uprightRr=uprightRrList[roundRobin-1]||1;
  const key = instrument + ':' + actualSampleMidi + (isTrumpet||uprightPatch||isKw||isCustomSample||isGrowlybass||isFashionbass ? ':' + intensity : '') + (isLayeredPiano?`:level${state.headroomVelocityLayer}${isLivingroom?`:${state.sustain?'pon':'poff'}`:''}`:'') + (isGrowlybass||isFashionbass||vscoPatch?.roundRobin ? `:rr${roundRobin}` : uprightPatch?.folder==='vsco2-upright-nr1'?`:rr${uprightRr}`:'');
  const loadKey=prefetchOnly?key+':prefetch':key;
  if (!state.instrumentBuffers.has(key)) {
    let pending=state.instrumentSampleLoads.get(loadKey);
    if(!pending){
      pending=(async()=>{
        const sampleName=isVscoTrumpet?`trumpet-sus-vib-${vscoTrumpetRegion[3]}`:sample?.[3];
        const trumpetLayer=intensity==='soft'?'v0-63':'v64-127';
        const patchFilename=vscoPatch?`${vscoPatch.prefix}-${vscoPatchRegion[3]}-${sampleLayer}${vscoPatch.roundRobin?`-rr${roundRobin}`:''}.wav`:null;
        const headroomLayer=state.headroomVelocityLayer;
  const headroomRoot=String(actualSampleMidi);
        const livingLayer=state.headroomVelocityLayer===1?'p':'f',livingPedal=state.sustain?'pon':'poff';
        const livingFileLayer=!state.sustain&&livingLayer==='f'&&sample?.[3]==='C6-C#6-D6'?'f-ff':livingLayer;
        const customLayer=isSoloViolin?(intensity==='soft'?'soft':'forte'):isDistortedGuitar?(intensity==='soft'&&customRoot.soft?'soft':'full'):null;
        const customFilename=isSoloViolin?`solo-violin-${customRoot.note}-${customLayer}.wav`:isDistortedGuitar?`distorted-guitar-${customRoot.note}-${customLayer}.flac`:null;
        const cloudinaryHosted=Boolean(spec.cloudinaryFolder||spec.cloudinaryRoot);
        const bassLayer=isGrowlybass?(intensity==='soft'||intensity==='very-soft'?'pp':intensity==='medium'?'p':intensity==='strong'?'f':'ff'):null;
        const fashionLayer=isFashionbass?({ 'very-soft':'pp',soft:'p',medium:'mf',strong:'f','very-strong':'ff' }[intensity]||'f'):null;
        const filename=isKw?sample[3]:isGrowlybass?`${sample[3]}_${bassLayer}_rr${roundRobin}.wav`:isFashionbass?`${sample[3]}_${fashionLayer}_rr${roundRobin}.wav`:cloudinaryHosted?sample[3]:spec.rawSamplePaths?sample[3]:isCustomSample?customFilename:isHeadroom?`HEADROOM PIANO LEVEL${headroomLayer} CLOSE ${headroomRoot}.flac`:isSplendid?`${sample[3]}.flac`:isMaestro?`mcg_${MAESTRO_LAYERS[state.headroomVelocityLayer-1]}_${String(actualSampleMidi).padStart(3,'0')}.flac`:isSalamander?`${sample[3]}v${SALAMANDER_LAYERS[state.headroomVelocityLayer-1]}.wav`:isLivingroom?`samples-micro-ed/${sample[3]}-${livingPedal}-${livingFileLayer}-1-free-ed.flac`:instrument==='steinway-grand'?`${STEINWAY_PREFIX}-${steinwayNoteName(actualSampleMidi)}.m4a`:instrument==='trumpet-real'?`${sampleMidi}_${trumpetLayer}_rr1.wav`:isVscoTrumpet?`${sampleName}-${intensity==='soft'?'soft':'strong'}.wav`:vscoPatch?patchFilename:uprightPatch?.folder==='vsco2-upright-piano'?`Player_${uprightLayer}_rr1_${uprightRegion[3]}.wav`:uprightPatch?`UR1_${uprightRegion[3]}_${uprightLayer}_RR${uprightRr}.wav`:sampleName?`${sampleName}vH.flac`:`pno0${sampleMidi}.mp3`;
        const localUrl=`audio/${spec.folder}/${filename.split('/').map(encodeURIComponent).join('/')}`;
        // Cloudinary normalizes spaces and forbidden public-ID characters (#) to underscores.
        const cloudinaryFilename=isLivingroom?filename.replace(/^samples-micro-ed\//,'').replace(/[ #]/g,'_'):isLayeredPiano||isCustomSample?filename.replace(/[ #]/g,'_'):filename;
        const cloudinaryPath=spec.cloudinaryRoot?filename.replace(/[ #]/g,'_').replace(/\.(ogg|flac)$/i,`.${spec.cloudinaryFormat||'$1'}`):spec.cloudinaryFolder?`${spec.cloudinaryFolder}/${filename}`.replace(/[ #]/g,'_').replace(/\.(ogg|flac)$/i,`.${spec.cloudinaryFormat||'$1'}`):cloudinaryFilename;
        const cloudinaryUrl=`${CLOUDINARY_AUDIO_BASE}${cloudinaryPath.split('/').map(encodeURIComponent).join('/')}`;
        const cloudinaryFirst=cloudinaryHosted||isLayeredPiano||isVscoTrumpet||Boolean(vscoPatch)||Boolean(uprightPatch)||isCustomSample;
        const growlyRootUrl=isGrowlybass?`${CLOUDINARY_AUDIO_BASE}${filename.split('/').map(encodeURIComponent).join('/')}`:null;
        const sources=isGrowlybass?[growlyRootUrl,cloudinaryUrl]:cloudinaryFirst?[cloudinaryUrl,localUrl]:[localUrl];let lastError=null;
        for(const source of sources){
          try{
            if(prefetchOnly){
              await prefetchAudioUrl(source);
              if(isHeadroom){const deccaName=filename.replace(' CLOSE ',' DECCA ');for(const deccaUrl of [`${CLOUDINARY_AUDIO_BASE}${deccaName.replace(/ /g,'_').split('/').map(encodeURIComponent).join('/')}`,`audio/${spec.folder}/${deccaName.split('/').map(encodeURIComponent).join('/')}`]){try{await prefetchAudioUrl(deccaUrl);break;}catch(_){}}}
              return;
            }
            const response=await fetchAudioCached(source);
            if(!response.ok)throw new Error(`HTTP ${response.status} al cargar ${source}`);
            const decoded=await getAudioContext().decodeAudioData(await response.arrayBuffer());
            if(isHeadroom){
              const deccaFilename=filename.replace(' CLOSE ',' DECCA '),deccaLocal=`audio/${spec.folder}/${deccaFilename.split('/').map(encodeURIComponent).join('/')}`,deccaCloudFilename=deccaFilename.replace(/ /g,'_'),deccaCloud=`${CLOUDINARY_AUDIO_BASE}${deccaCloudFilename.split('/').map(encodeURIComponent).join('/')}`;
              let decca=null;
              for(const deccaSource of [deccaCloud,deccaLocal]){try{const deccaResponse=await fetchAudioCached(deccaSource);if(!deccaResponse.ok)throw new Error(`HTTP ${deccaResponse.status} al cargar ${deccaSource}`);decca=await getAudioContext().decodeAudioData(await deccaResponse.arrayBuffer());break;}catch(error){lastError=error;}}
              if(!decca)throw lastError||new Error(`No se pudo cargar ${deccaFilename}`);
              const context=getAudioContext(),length=Math.max(decoded.length,decca.length),mixed=context.createBuffer(Math.max(decoded.numberOfChannels,decca.numberOfChannels),length,decoded.sampleRate);
              for(let channel=0;channel<mixed.numberOfChannels;channel++){const output=mixed.getChannelData(channel),close=decoded.getChannelData(Math.min(channel,decoded.numberOfChannels-1)),far=decca.getChannelData(Math.min(channel,decca.numberOfChannels-1));for(let i=0;i<length;i++)output[i]=(close[i]||0)*.67+(far[i]||0)*.33;}
              state.instrumentBuffers.set(key,mixed);
            }else state.instrumentBuffers.set(key,decoded);return;
          }catch(error){lastError=error;if(source===cloudinaryUrl&&!isGrowlybass)console.warn(`Muestra de ${instrumentLabel(instrument)} no disponible en Cloudinary; se usará la copia local ${filename}.`,error);}
        }
        throw lastError||new Error(`No se pudo cargar la muestra ${filename}`);
      })();
      state.instrumentSampleLoads.set(loadKey,pending);
    }
    try{await pending;}finally{state.instrumentSampleLoads.delete(loadKey);}
  }
  return { buffer: state.instrumentBuffers.get(key), sampleMidi: actualSampleMidi, release: vscoPatch?.release||uprightPatch?.release||spec.release, loopStart:sample?.[4]||0, loopEnd:sample?.[5]||0 };
}
function setInstrumentSampleLoop(source,sample){
  if(!source||!sample?.loopStart||!sample?.loopEnd||!sample.buffer?.sampleRate)return;
  const start=sample.loopStart/sample.buffer.sampleRate,end=sample.loopEnd/sample.buffer.sampleRate;
  if(start>=0&&end>start&&end<sample.buffer.duration){source.loop=true;source.loopStart=start;source.loopEnd=end;}
}
function primeAudioForInstrument(instrument=state.instrument){
  // Calienta unas notas centrales sin descargar toda la biblioteca al cambiar de sonido.
  const generation=++instrumentPrimeGeneration;
  void resumeAudioContext(getAudioContext()).catch(()=>{});
  const sampleSpec=INSTRUMENTS[instrument],firstNote=instrument==='grand-piano'?60:sampleSpec?.first??21,lastNote=instrument==='grand-piano'?76:sampleSpec?.last??108,warmRoot=Math.max(firstNote,Math.min(lastNote,state.lastMidi||60));
  const midis=instrument==='grand-piano'
    ? [60,64,67,62,65,69,72,...Array.from({length:17},(_,i)=>60+i).filter(midi=>![60,64,67,62,65,69,72].includes(midi))]
    : [...new Set([warmRoot,Math.max(firstNote,Math.min(lastNote,warmRoot+7))])];
  const status=$('status'),pendingName=instrumentLabel(instrument);if(status&&instrument===state.instrument)status.textContent=`Preparando ${pendingName}…`;
  let failed=0;
  let next=0;
  const worker=async()=>{while(generation===instrumentPrimeGeneration&&next<midis.length){const midi=midis[next++];try{if(instrument==='grand-piano')await getSample(midi);else await getInstrumentSample(midi,instrument);}catch(error){failed++;console.warn('No se pudo preparar una muestra de audio:',error);}}};
  void Promise.all([worker(),worker()]).then(()=>{if(generation===instrumentPrimeGeneration&&instrument===state.instrument&&status)status.textContent=failed?`${pendingName}: algunas muestras se cargarán al tocar.`:`${pendingName} listo para tocar.`;});
}
async function playChord(chord) {
  if(!chord.preview&&!state.bassSoundEnabled)return;
  if (!state.playing && !chord.preview) return;

  try {
    const context = getAudioContext();
    const resumePromise=resumeAudioContext(context);
    const chordInstrument = chord.instrument || state.bassInstrument || 'grand-piano';
    const entries = await Promise.all([resumePromise,...chordMidiNotes(chord).map(async midi => {
      const stringsLoad=state.stringsLayerEnabled&&state.stringsLayerVolume>0?getOptionalLayerSample(midi):Promise.resolve(null);
      if (chordInstrument === 'grand-piano') {
        const sampleMidi = Math.max(60, Math.min(76, midi));
        const [buffer,strings]=await Promise.all([getSample(midi),stringsLoad]);
        return { midi, sampleMidi, buffer, strings };
      }
      const [sample,strings]=await Promise.all([getInstrumentSample(midi, chordInstrument),stringsLoad]);
      return { midi, ...sample, strings };
    })]).then(([, ...loaded])=>loaded);
    if (!state.playing && !chord.preview) return;
    const when = Number(chord.startAt) || context.currentTime + 0.015;
    if (!chord.preview && state.showChordNames && chord.root) {
      const updateChordReadout = () => {
        if (!state.playing || !state.showChordNames) return;
        $('activeChordLabel').textContent = chordDisplayName(chord);
        $('activeChordLabel').classList.remove('hidden');
      };
      const chordDelay = Math.max(0, (when - context.currentTime) * 1000);
      if (chordDelay) state.playTimers.push(setTimeout(updateChordReadout, chordDelay));
      else updateChordReadout();
    }
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = entry.buffer;
      source.playbackRate.value = 2 ** ((entry.midi - entry.sampleMidi) / 12);
      setInstrumentSampleLoop(source,entry);
      const tempo = Math.min(1.5,Math.max(.5,Number(chord.tempo)||1));
      const duration = Math.max(0.25, Number(chord.duration) || 2) / tempo;
      const noteWhen=when+(chord.arpeggio?index*0.2:index*0.01)/tempo;
      const release = instrumentReleaseTime(chordInstrument);
      const stopAt = noteWhen + duration;
      if (chordInstrument === 'strings'||chordInstrument==='sigex-strings') { gain.gain.setValueAtTime(0.0001, noteWhen); gain.gain.linearRampToValueAtTime(0.78, noteWhen + instrumentAttackTime(chordInstrument)); }
      else gain.gain.setValueAtTime(0.78, noteWhen);
      gain.gain.setValueAtTime(0.78, stopAt);
      gain.gain.linearRampToValueAtTime(0.0001, stopAt + release);
      source.connect(gain); gain.connect(getMasterGain(context));
      source.start(noteWhen);
      source.stop(stopAt + release + 0.02);
      if(state.playing&&!chord.preview){state.activePlaybackSources.push(source);source.addEventListener('ended',()=>{state.activePlaybackSources=state.activePlaybackSources.filter(active=>active!==source);},{once:true});}
      const stringsSource=scheduleLayerNote(context,entry.midi,entry.strings,noteWhen,duration,1.05);
      if(stringsSource&&state.playing&&!chord.preview){state.activePlaybackSources.push(stringsSource);stringsSource.addEventListener('ended',()=>{state.activePlaybackSources=state.activePlaybackSources.filter(active=>active!==stringsSource);},{once:true});}
      const key = document.querySelector(`.key[data-midi="${entry.midi}"]`);
      const isBassChord=(chord.noteIndex!==undefined&&chord.noteIndex!==null)||(!chord.preview&&!!state.song);
      const barSeconds=Array.isArray(chord.lightDurations)&&Number.isFinite(chord.lightDurations[index])?chord.lightDurations[index]:null;
      const lightMs=barSeconds!==null?barSeconds*1000:Math.max(250,(duration+release)*1000);
      if (key) {
        const lightClasses=isBassChord?['playing','bass-playing']:['playing'];
        if (state.playing&&!chord.preview&&Number.isFinite(Number(chord.startAt))) queueKeyLight(noteWhen,key,lightClasses,lightMs);
        else state.playTimers.push(setTimeout(()=>lightKey(key,lightClasses,lightMs),Math.max(0,(noteWhen-context.currentTime)*1000)));
      }
    }
  } catch (error) {
    $('status').textContent = 'No se pudo cargar el sonido del acorde.';
    console.error(error);
  }
}
async function playNote(midi, element, duration = 0.4, visualDuration = null, octaveLayer = false) {
  if(state.playbackPreparing||midi < 21 || midi > 108) return;
  if(!octaveLayer)handlePracticeInput(midi);
    if(octaveLayer&&!state.showOctaveNotes)element=null;
  element?.classList.add('playing');
  if(!octaveLayer){state.lastMidi = midi;$('currentNote').textContent = noteName(midi);$('currentNote').style.opacity = '1';}
  let recordedNote=null,recordedNoteFinalized=false;
  if (state.recording) {
    recordedNote={midi,note:canonicalNoteName(midi),start:Math.max(0,(performance.now()-state.recordStart)/1000*state.recordTempo),duration:.35,...(octaveLayer?{octave:true}:{})};
    state.notes.push(recordedNote);
    state.melodyDirty=true;
    renderRecorded();
  }
  const finalizeRecordedNote=(endedAt=performance.now())=>{
    if(!recordedNote||recordedNoteFinalized)return;
    recordedNoteFinalized=true;
    recordedNote.duration=Math.max(.06,Number((((endedAt-state.recordStart)/1000*state.recordTempo)-recordedNote.start).toFixed(3)));
    state.melodyDirty=true;updateTrackTimeline();
  };
  let octaveStop=null,octaveReleaseRequested=false,octaveReleaseAt=null;
  if(!octaveLayer&&state.octaveDoubling&&midi+12<=108){
    const octaveMidi=midi+12,octaveKey=document.querySelector(`.piano-panel .key[data-midi="${octaveMidi}"]`);
    void playNote(octaveMidi,octaveKey,duration,visualDuration,true).then(stop=>{octaveStop=stop;if(octaveReleaseRequested)octaveStop?.(octaveReleaseAt);});
  }
  try {
    const context = getAudioContext();
    // Llama resume antes del primer await para conservar el gesto táctil en iOS.
    const resumePromise=resumeAudioContext(context);
    const source = context.createBufferSource();
    const gain = context.createGain();
    const wantsStrings=state.stringsLayerEnabled&&state.stringsLayerVolume>0;
    const stringsLoad=wantsStrings?getOptionalLayerSample(midi):Promise.resolve(null);
    let stringsSample=null,stringsSource=null,stringsGain=null,playbackSample=null;
    if (state.instrument === 'grand-piano') {
      const sampleMidi = Math.max(60, Math.min(76, midi));
      const [buffer,,loadedStrings]=await Promise.all([getSample(midi),resumePromise,stringsLoad]);
      stringsSample=loadedStrings;
      source.buffer = buffer;
      source.playbackRate.value = 2 ** ((midi - sampleMidi) / 12);
    } else {
      const [sample,,loadedStrings]=await Promise.all([getInstrumentSample(midi),resumePromise,stringsLoad]);
      stringsSample=loadedStrings;
      source.buffer = sample.buffer;
      playbackSample=sample;
      source.playbackRate.value = 2 ** ((midi - sample.sampleMidi) / 12);
      duration = Math.max(duration, sample.release);
    }
    setInstrumentSampleLoop(source,playbackSample);
    const contextNow = context.currentTime;
    const attackAt = contextNow + 0.006;
    const held = duration === Infinity;
    const noteDuration = held ? 60 : Math.max(0.08, duration * (state.sustain ? 2.4 : 1));
    const release = instrumentReleaseTime(state.instrument);
    const stopAt = attackAt + noteDuration;
    gain.gain.setValueAtTime(0.0001, contextNow);
    gain.gain.linearRampToValueAtTime(0.88, attackAt + instrumentAttackTime(state.instrument));
    gain.gain.setValueAtTime(0.88, stopAt);
    gain.gain.linearRampToValueAtTime(0.0001, stopAt + release);
    source.connect(gain); gain.connect(getMasterGain(context));
    source.start(attackAt);
    const stringsRelease=state.layerInstrument==='strings'?Math.max(1.05,release):instrumentReleaseTime(state.layerInstrument);
    if(stringsSample){
      stringsSource=context.createBufferSource();stringsGain=context.createGain();
      stringsSource.buffer=stringsSample.buffer;setInstrumentSampleLoop(stringsSource,stringsSample);
      stringsSource.playbackRate.value=2**((midi-stringsSample.sampleMidi)/12);
      const stringsStopAt=attackAt+(held?noteDuration:Math.max(noteDuration,.42));
      stringsGain.gain.setValueAtTime(.0001,contextNow);
      stringsGain.gain.linearRampToValueAtTime(.85,attackAt+instrumentAttackTime(state.layerInstrument));
      stringsGain.gain.setValueAtTime(.85,stringsStopAt);
      stringsGain.gain.linearRampToValueAtTime(.0001,stringsStopAt+stringsRelease);
      stringsSource.connect(stringsGain);stringsGain.connect(getStringsLayerGain(context));
      stringsSource.start(attackAt);stringsSource.stop(stringsStopAt+stringsRelease+.02);
    }
    const finishNoteEffect=(octaveLayer&&!state.showOctaveNotes)?null:showManualNoteEffect(midi,element||document.querySelector(`.piano-panel .key[data-midi="${midi}"]`));
    source.stop(stopAt + release + 0.02);
    if(!held){setTimeout(()=>{finishNoteEffect?.();element?.classList.remove('playing');},visualDuration===null?noteDuration:Math.min(noteDuration,Math.max(.08,visualDuration)));if(recordedNote)setTimeout(finalizeRecordedNote,noteDuration*1000);}
    let released = false;
    const stopNote = (releasedAt=performance.now()) => {
      if (released) return;
      released = true;
      finishNoteEffect?.();
      finalizeRecordedNote(releasedAt);
      const releaseAt = context.currentTime;
      try {
        gain.gain.cancelScheduledValues(releaseAt);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), releaseAt);
        gain.gain.linearRampToValueAtTime(0.0001, releaseAt + release);
        source.stop(releaseAt + release + 0.03);
      } catch (_) {}
      if(stringsGain&&stringsSource){
        try{
          stringsGain.gain.cancelScheduledValues(releaseAt);
          stringsGain.gain.setValueAtTime(Math.max(.0001,stringsGain.gain.value),releaseAt);
          stringsGain.gain.linearRampToValueAtTime(.0001,releaseAt+stringsRelease);
          stringsSource.stop(releaseAt+stringsRelease+.03);
        }catch(_){}
      }
      element?.classList.remove('playing');
    };
    if(octaveLayer)return stopNote;
    if (held) return (releasedAt=performance.now())=>{octaveReleaseRequested=true;octaveReleaseAt=releasedAt;octaveStop?.(releasedAt);stopNote(releasedAt);};
  } catch (error) {
    octaveReleaseAt=performance.now();finalizeRecordedNote(octaveReleaseAt);
    octaveReleaseRequested=true;octaveStop?.(octaveReleaseAt);
    $('status').textContent = 'No se pudo cargar el sonido. Comprueba la conexión y la carpeta audio.';
    console.error(error);
  }
}
async function previewInstrumentNote(instrument,midi){
  const context=getAudioContext(),resumePromise=resumeAudioContext(context);
  try{
    const samplePromise=instrument==='grand-piano'?getSample(midi).then(buffer=>({buffer,sampleMidi:Math.max(60,Math.min(76,midi))})):getInstrumentSample(midi,instrument);
    const stringsPromise=state.stringsLayerEnabled&&state.stringsLayerVolume>0?getOptionalLayerSample(midi):Promise.resolve(null);
    const [sample,strings]=await Promise.all([samplePromise,stringsPromise]);
    await resumePromise;
    const source=context.createBufferSource(),gain=context.createGain(),start=context.currentTime+.01;
    source.buffer=sample.buffer;source.playbackRate.value=2**((midi-sample.sampleMidi)/12);setInstrumentSampleLoop(source,sample);
    const isStrings=instrument==='strings'||instrument==='sigex-strings',release=instrumentReleaseTime(instrument),stopAt=start+(isStrings?1.1:.55);
    gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.linearRampToValueAtTime(.78,start+instrumentAttackTime(instrument));gain.gain.setValueAtTime(.78,stopAt);gain.gain.linearRampToValueAtTime(.0001,stopAt+release);
    source.connect(gain);gain.connect(getMasterGain(context));source.start(start);source.stop(stopAt+release+.02);
    scheduleLayerNote(context,midi,strings,start,.55,1.05);
  }catch(error){console.error('No se pudo reproducir la muestra del instrumento:',error);toast('No se pudo cargar el sonido de prueba. Revisa la conexión.');}
}
function setStagePlaying(on){document.body.classList.toggle('melody-playing',!!on);}
function stopPlayback({suspendAudio=false}={}) {
  state.playing = false;state.recordingGuidePlaying=false;practiceRun=null;$('practiceGuide')?.classList.add('hidden');setStagePlaying(false);
  $('playbackCountIn')?.setAttribute('hidden','');
  stopFallingNotes();
  state.playTimers.forEach(clearTimeout);
  state.playTimers = [];
  resetVisualQueue();
  resetPlaybackTimeline();
  document.querySelectorAll('.piano-panel .key.playing,.piano-panel .key.bass-playing,.piano-panel .key.note-sounding').forEach(key=>key.classList.remove('playing','bass-playing','note-sounding'));
  keyLightCounts.clear();
  state.activePlaybackSources.forEach(source=>{try{source.stop()}catch(_){}});
  state.activePlaybackSources=[];
  if (suspendAudio && audioContext?.state === 'running') audioContext.suspend().catch(()=>{});
  if($('tempoControl'))$('tempoControl').disabled=false;
  setPlayerControl('playMelody','▶','Reproducir');
}
function setPlayerControl(id,icon,label){
  const button=$(id);if(!button)return;
  button.innerHTML=`${icon}<small>${label}</small>`;
  button.setAttribute('aria-label',label);
}
async function prepareMelodyAudio(notesToPrepare=state.notes) {
  const context=getAudioContext();
  const resumePromise=resumeAudioContext(context);
  const noteMidis = [...new Set(notesToPrepare.map(note => Number(note.midi)).filter(Number.isFinite))];
  const entries=await Promise.all(noteMidis.map(async midi=>{
    const stringsLoad=state.stringsLayerEnabled&&state.stringsLayerVolume>0?getOptionalLayerSample(midi):Promise.resolve(null);
    if(state.instrument==='grand-piano'){
      const [buffer,strings]=await Promise.all([getSample(midi),stringsLoad]);
      const sampleMidi=Math.max(60,Math.min(76,midi));return [midi,{buffer,sampleMidi,release:.4,strings}];
    }
    const [sample,strings]=await Promise.all([getInstrumentSample(midi,state.instrument),stringsLoad]);
    return [midi,{...sample,strings}];
  }));
  const loads = [];
  state.chords.forEach(chord => {
    const instrument = chord.instrument || state.bassInstrument || 'grand-piano';
    chordMidiNotes(chord).forEach(midi => {
      loads.push(instrument === 'grand-piano' ? getSample(midi) : getInstrumentSample(midi, instrument));
      if(state.stringsLayerEnabled&&state.stringsLayerVolume>0)loads.push(getOptionalLayerSample(midi));
    });
  });
  await Promise.all([...loads,resumePromise]);
  return new Map(entries);
}
function schedulePlaybackNote(midi,element,duration,when,prepared,cut,showReadout=true,soundKind='melody'){
  if(!(soundKind==='bass'?state.bassSoundEnabled:state.melodySoundEnabled))return;
  const context=getAudioContext(),entry=prepared.get(midi);
  if(!entry)return;
  const source=context.createBufferSource(),gain=context.createGain();
  source.buffer=entry.buffer;source.playbackRate.value=2**((midi-entry.sampleMidi)/12);
  const noteDuration=Math.max(.06,duration/state.tempo);
  const baseRelease=instrumentReleaseTime(state.instrument);
  const release=cut?Math.min(baseRelease,.06):baseRelease;
  const stopAt=when+noteDuration;
  const intensityGain={'very-soft':.48,soft:.62,medium:.78,strong:1,'very-strong':1.16}[state.playbackIntensity||'strong']||1,peak=.88*intensityGain;
  gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(peak,when+instrumentAttackTime(state.instrument));
  gain.gain.setValueAtTime(peak,stopAt);gain.gain.linearRampToValueAtTime(.0001,stopAt+release);
  source.connect(gain);gain.connect(getMasterGain(context));source.start(when);source.stop(stopAt+release+.02);
  state.activePlaybackSources.push(source);source.addEventListener('ended',()=>{state.activePlaybackSources=state.activePlaybackSources.filter(active=>active!==source);},{once:true});
  const stringsSource=scheduleLayerNote(context,midi,entry.strings,when,noteDuration,cut ? .35 : 1.05);
  if(stringsSource){state.activePlaybackSources.push(stringsSource);stringsSource.addEventListener('ended',()=>{state.activePlaybackSources=state.activePlaybackSources.filter(active=>active!==stringsSource);},{once:true});}
  if(showReadout)queueVisualEvent(when,()=>{
    const readout=$('currentNote'),name=noteName(midi);
    if(readout.textContent!==name)readout.textContent=name;
    if(readout.style.opacity!=='1')readout.style.opacity='1';
  });
  if(element)queueKeyLight(when,element,['playing'],(stopAt+release-when)*1000);
}
function playbackGroupsForCurrentSong(){
  const currentSettings=state.song&&['melodia','acompanamiento1','acompanamiento2'].includes(state.melodyType)?instrumentTrackConfig(state.song.category,state.song.song.id,state.melodyType):{instrument:state.instrument,intensity:state.trumpetIntensity||'strong',octaveShift:0,layerEnabled:state.stringsLayerEnabled,layerInstrument:state.layerInstrument,layerVolume:state.stringsLayerVolume};
  if(state.playMode!=='performance'||!state.song)return [{type:state.melodyType,kind:'melody',notes:shiftRecordedTrackNotes(notesForCurrentMix(),currentSettings.octaveShift),chords:shiftRecordedTrackChords(state.voiceMix.acordes?state.chords:[],currentSettings.octaveShift),settings:currentSettings}];
  const record=melodyFor(state.song.category,state.song.song.id)||{},tracks=melodyTracks(record);
  const mainType=['melodia','voz','introduccion'].find(type=>tracks[type]?.notas?.length)||null;
  const types=[...(mainType?[mainType]:[]),'acompanamiento1','acompanamiento2'];
  const groups=[];
  types.forEach(type=>{
    const track=tracks[type];if(!track?.notas?.length)return;
    const isMain=type===mainType,settings=instrumentTrackConfig(state.song.category,state.song.song.id,type);
    let notes=type===state.melodyType?notesForCurrentMix():notesForTrackPlayback(track.notas,type);
    if(type!==state.melodyType&&state.transpose)notes=notes.map(note=>({...note,midi:Number(note.midi)+state.transpose}));
    groups.push({type,kind:isMain?'melody':'accompaniment',notes:shiftRecordedTrackNotes(notes,settings.octaveShift),chords:shiftRecordedTrackChords(isMain?(state.voiceMix.acordes?(track.acordes||[]):[]):(track.acordes||[]),settings.octaveShift),settings});
  });
  return groups;
}
async function playMelody() {
  const playbackGroups=playbackGroupsForCurrentSong(),playbackChords=playbackGroups.flatMap(group=>group.chords.map(chord=>({...chord,_playbackTrack:group.type})));let playbackNotes=playbackGroups.flatMap(group=>group.notes);
  const drumPattern=readSongDrumPattern();
  if (!playbackNotes.length) { toast(state.melodyType==='voz'?'Activa al menos una voz para escucharla.':'Esta pista todavía no tiene melodía grabada.'); $('status').textContent = 'No hay notas seleccionadas para reproducir.'; return; }
  stopPlayback();
  document.body.classList.remove('playback-finished');
  state.selectedSongChord=null;
  document.querySelectorAll('#keyboard .key.chord-selected,#lyrics .lyrics-chord.selected').forEach(element=>element.classList.remove('chord-selected','selected'));
  $('currentNote').textContent='';$('activeChordLabel').textContent='';$('activeChordLabel').classList.add('hidden');
  state.playing = true;setStagePlaying(true);closePlayerPopovers();
  setPlayerControl('playMelody','⏸','Reproduciendo');
  $('status').textContent = 'Preparando sonido…';
  state.playbackPreparing=true;
  try {
    const original={instrument:state.instrument,intensity:state.trumpetIntensity,headroomLayer:state.headroomVelocityLayer,layerEnabled:state.stringsLayerEnabled,layerInstrument:state.layerInstrument,layerVolume:state.stringsLayerVolume};
    try{
      for(const group of playbackGroups){
        const intensity=group.settings.intensity||'strong',pianoLayer=intensity==='very-soft'?1:intensity==='soft'?2:intensity==='medium'?3:intensity==='strong'?4:5;
        Object.assign(state,{instrument:group.settings.instrument,trumpetIntensity:intensity,headroomVelocityLayer:group.settings.instrument==='livingroom-upright-micro'?(intensity==='soft'||intensity==='medium'?1:2):pianoLayer,stringsLayerEnabled:group.settings.layerEnabled,layerInstrument:group.settings.layerInstrument,stringsLayerVolume:group.settings.layerVolume});
        group.notes=group.notes.map(note=>({...note,_playbackHold:noteHoldSeconds(note),_playbackCut:noteWasCut(note),_playbackKind:group.kind,_playbackTrack:group.type}));
        group.prepared=await prepareMelodyAudio(group.notes);
      }
    }finally{Object.assign(state,{instrument:original.instrument,trumpetIntensity:original.intensity,headroomVelocityLayer:original.headroomLayer,stringsLayerEnabled:original.layerEnabled,layerInstrument:original.layerInstrument,stringsLayerVolume:original.layerVolume});}
    if(drumPattern.events.length){try{await loadDrumPadBuffers();}catch(error){console.warn('Se omitió el patrón de batería porque no se pudieron cargar sus sonidos:',error);toast('La melodía seguirá sin batería; no se cargaron sus sonidos.');}}
    state.playbackPreparing=false;
  } catch (error) {
    state.playbackPreparing=false;state.playing = false;setStagePlaying(false);
    stopFallingNotes();
    resetPlaybackTimeline();
    setPlayerControl('playMelody','▶','Reproducir');
    $('status').textContent = 'No se pudieron preparar los sonidos. Conéctate una vez para descargarlos.';
    console.error('No se pudieron precargar las muestras de la melodía:',error);
    return;
  }
  if (!state.playing) return;
  playbackNotes=playbackGroups.flatMap(group=>group.notes);
  $('tempoControl').disabled=true;
  $('status').textContent = `${state.playMode==='performance'?'Reproduciendo alabanza':'Reproduciendo pista'} · ${Math.round(state.tempo*100)}%`;
  const context=getAudioContext(),countInBeat=60/metronomeBpm,countInStart=context.currentTime+.12,playbackStart=countInStart+countInBeat*3;
  const countIn=$('playbackCountIn');
  if(countIn){countIn.hidden=false;countIn.querySelector('strong').textContent='3';}
  $('status').textContent='Cuenta regresiva · 3, 2, 1';
  if(metronomeOn){metronomeBeatIndex=0;metronomeNextBeat=countInStart;runMetronomeScheduler();}
  for(let index=0;index<3;index++){
    const beatAt=countInStart+index*countInBeat;
    if(!metronomeOn){const click=scheduleMetronomeBeat(context,beatAt,index===0?0:1,true);if(click){state.activePlaybackSources.push(click);click.addEventListener('ended',()=>{state.activePlaybackSources=state.activePlaybackSources.filter(source=>source!==click);},{once:true});}}
    state.playTimers.push(setTimeout(()=>{if(!state.playing)return;if(countIn)countIn.querySelector('strong').textContent=String(3-index);},Math.max(0,(beatAt-context.currentTime)*1000)));
  }
  state.playTimers.push(setTimeout(()=>{if(countIn)countIn.hidden=true;},Math.max(0,(playbackStart-context.currentTime)*1000)));
  // Encuadra una sola vez la primera nota de la melodía. Mantiene fijo el
  // teclado durante el resto de la reproducción para evitar saltos por nota.
  const firstNote = playbackNotes.reduce((first, note) => Number(note.start) < Number(first.start) ? note : first, playbackNotes[0]);
  let firstKey = document.querySelector(`.key[data-midi="${Number(firstNote.midi)}"]`);
  const keyboardScroll = $('keyboardScroll');
  if (!firstKey && keyboardScroll) firstKey = document.querySelector('.key[data-midi=60]');
  if (firstKey && keyboardScroll) {
    const keyLeft = firstKey.getBoundingClientRect().left - keyboardScroll.getBoundingClientRect().left + keyboardScroll.scrollLeft;
    const left = keyLeft - (keyboardScroll.clientWidth - firstKey.offsetWidth) / 2;
    keyboardScroll.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
  const playbackSettings={instrument:state.instrument,layerEnabled:state.stringsLayerEnabled,layerInstrument:state.layerInstrument,layerVolume:state.stringsLayerVolume};
  let accompanimentChordLabelSequence=0;
    try{
  playbackGroups.forEach(group=>{
    Object.assign(state,{instrument:group.settings.instrument,stringsLayerEnabled:group.settings.layerEnabled,layerInstrument:group.settings.layerInstrument,stringsLayerVolume:group.settings.layerVolume});
    group.notes.forEach(note=>{
            const midi=Number(note.midi),hideOct=note.octave&&!state.showOctaveNotes,key=hideOct?null:document.querySelector(`.key[data-midi="${midi}"]`);
      state.playbackIntensity=group.settings.intensity||'strong';schedulePlaybackNote(midi,key,note._playbackHold,playbackStart+Math.max(0,Number(note.start)||0)/state.tempo,group.prepared,note._playbackCut,group.kind==='melody'&&!hideOct,String(group.type).startsWith('acompanamiento')?'bass':'melody');  });
    if(group.kind==='accompaniment'&&state.showChordNames){
      const ordered=[...group.notes].sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0));
      let lastStart=-Infinity;
      ordered.forEach(note=>{
        const start=Number(note.start)||0;
        if(start-lastStart<.11)return;
        const cluster=ordered.filter(candidate=>Math.abs((Number(candidate.start)||0)-start)<.11);
        lastStart=start;
        const chordName=chordNameForMidis(cluster.map(candidate=>candidate.midi));
        if(!chordName)return;
        const sequence=++accompanimentChordLabelSequence;
        queueVisualEvent(playbackStart+Math.max(0,start)/state.tempo,()=>{
          const label=$('activeChordLabel');label.textContent=chordName;label.classList.remove('hidden');
          const hold=Math.max(...cluster.map(candidate=>noteHoldSeconds(candidate)))/state.tempo;
          state.playTimers.push(setTimeout(()=>{if(sequence===accompanimentChordLabelSequence){label.textContent='';label.classList.add('hidden');}},Math.max(0,(playbackStart+start/state.tempo+hold-getAudioContext().currentTime)*1000)));
        });
      });
    }
  });
    }finally{
  Object.assign(state,{instrument:playbackSettings.instrument,stringsLayerEnabled:playbackSettings.layerEnabled,layerInstrument:playbackSettings.layerInstrument,stringsLayerVolume:playbackSettings.layerVolume});
    }
  const fallingEvents=makeFallingNotesEvents(playbackNotes,playbackChords),chordLights=new Map();
  fallingEvents.forEach(event=>{if(event.kind!=='chord')return;if(!chordLights.has(event.chord))chordLights.set(event.chord,[]);chordLights.get(event.chord)[event.index]=event.visualDuration;});
  playbackChords.forEach(chord => {
    const start=chordStartTime(chord);
    if (start===null) return;
    playChord({...chord,duration:chordSpanForPlayback(chord),tempo:state.tempo,startAt:playbackStart+start/state.tempo,lightDurations:chordLights.get(chord)});
  });
  const noteEnd = Math.max(...playbackGroups.flatMap(group=>group.notes.map(note=>{const release=instrumentReleaseTime(group.settings.instrument);return ((Number(note.start)||0)+note._playbackHold)/state.tempo+(note._playbackCut?Math.min(release,.06):release);})));
  const chordEnd = playbackChords.reduce((end, chord) => { const start=chordStartTime(chord); const instrument=chord.instrument||state.bassInstrument; const release=instrumentReleaseTime(instrument); return start!==null ? Math.max(end, (start+chordSpanForPlayback(chord)+(chord.arpeggio?0.4:0))/state.tempo+release) : end; }, 0);
  const end = Math.max(noteEnd, chordEnd);
  scheduleSongDrumPattern(drumPattern,playbackStart,end);
  startPlaybackTimeline(playbackStart,end);
  startFallingNotes(playbackNotes,playbackChords,playbackStart,fallingEvents);
  state.playTimers.push(setTimeout(() => { state.playing = false; setStagePlaying(false); document.body.classList.add('playback-finished'); finishFallingNotesPlayback(); if(timelineFrame)cancelAnimationFrame(timelineFrame);timelineFrame=0;timelineStartedAt=0;updatePlaybackTimeline(end,end);$('tempoControl').disabled=false; setPlayerControl('playMelody','▶','Reproducir'); $('status').textContent = state.playMode==='performance'?'Reproducción terminada.':'Pista terminada.'; }, Math.max(0,(playbackStart-context.currentTime+end)*1000+500)));
}
