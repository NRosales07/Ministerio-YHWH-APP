let thirdLayerGainNode=null;
function thirdLayerTargetGain(){return state.thirdLayerEnabled?state.thirdLayerVolume/100:0;}
function getThirdLayerGain(context=getAudioContext()){
  if(!thirdLayerGainNode){thirdLayerGainNode=context.createGain();thirdLayerGainNode.gain.value=thirdLayerTargetGain();thirdLayerGainNode.connect(getMasterGain(context));}
  return thirdLayerGainNode;
}
function updateThirdLayerGain(){if(!thirdLayerGainNode||!audioContext)return;const now=audioContext.currentTime;thirdLayerGainNode.gain.cancelScheduledValues(now);thirdLayerGainNode.gain.setTargetAtTime(thirdLayerTargetGain(),now,.035);}
function stringsLayerTargetGain(){return state.stringsLayerEnabled?state.stringsLayerVolume/100:0;}
function getStringsLayerGain(context=getAudioContext()){
  if(!stringsLayerGainNode){stringsLayerGainNode=context.createGain();stringsLayerGainNode.gain.value=stringsLayerTargetGain();stringsLayerGainNode.connect(getMasterGain(context));}
  return stringsLayerGainNode;
}
function updateStringsLayerGain(){
  if(!stringsLayerGainNode||!audioContext)return;
  const now=audioContext.currentTime;stringsLayerGainNode.gain.cancelScheduledValues(now);stringsLayerGainNode.gain.setTargetAtTime(stringsLayerTargetGain(),now,.035);
}
function syncStringsLayerControls(){
  const toggle=$('stringsLayerToggle'),slider=$('stringsLayerVolume'),value=$('stringsLayerVolumeValue'),status=$('stringsLayerStatus');
  if(toggle){toggle.checked=state.stringsLayerEnabled;toggle.setAttribute('aria-checked',String(state.stringsLayerEnabled));}
  if(slider&&slider.value!==String(state.stringsLayerVolume))slider.value=String(state.stringsLayerVolume);
  if(value){value.value=`${state.stringsLayerVolume}%`;value.textContent=`${state.stringsLayerVolume}%`;}
  const pickerToggle=$('layerPickerEnabled'),pickerVolume=$('layerPickerVolume'),pickerVolumeValue=$('layerPickerVolumeValue'),pickerAttack=$('layerPickerAttack'),pickerAttackValue=$('layerPickerAttackValue');
  if(pickerToggle)pickerToggle.checked=state.stringsLayerEnabled;
  if(pickerVolume&&pickerVolume.value!==String(state.stringsLayerVolume))pickerVolume.value=String(state.stringsLayerVolume);
  if(pickerVolumeValue){pickerVolumeValue.value=`${state.stringsLayerVolume}%`;pickerVolumeValue.textContent=`${state.stringsLayerVolume}%`;}
  if(pickerAttack&&pickerAttack.value!==String(state.stringsLayerAttackMs))pickerAttack.value=String(state.stringsLayerAttackMs);
  if(pickerAttackValue){pickerAttackValue.value=`${state.stringsLayerAttackMs} ms`;pickerAttackValue.textContent=`${state.stringsLayerAttackMs} ms`;}
  const layerSelect=$('layerInstrumentSelect');if(layerSelect&&layerSelect.value!==state.layerInstrument)layerSelect.value=state.layerInstrument;
  if(status&&!state.stringsLayerEnabled)status.textContent=`Activa la segunda capa para mezclar ${instrumentLabel(state.layerInstrument)} con el instrumento principal.`;
}
function setStringsLayerVolume(value){
  state.stringsLayerVolume=Math.round(Math.max(0,Math.min(200,Number(value)||0)));
  if(typeof deviceSettings==='object'){deviceSettings.layerVolume=state.stringsLayerVolume;if($('deviceLayerVolume'))$('deviceLayerVolume').value=String(state.stringsLayerVolume);if($('deviceLayerVolumeValue'))$('deviceLayerVolumeValue').textContent=`${state.stringsLayerVolume}%`;}
  if(!state.song){freePlayInstrumentConfig.layerVolume=state.stringsLayerVolume;try{localStorage.setItem('yhwh_piano_strings_volume',String(state.stringsLayerVolume));}catch(_){} }
  syncStringsLayerControls();updateStringsLayerGain();
}
function setStringsLayerAttack(value){
  state.stringsLayerAttackMs=Math.round(Math.max(0,Math.min(200,Number(value)||0)));
  try{localStorage.setItem('yhwh_piano_strings_attack_ms',String(state.stringsLayerAttackMs));}catch(_){}
  syncStringsLayerControls();
}
async function getStringsSample(midi){
  const sample=STRINGS_SAMPLE_ROOTS.reduce((best,item)=>Math.abs(item.midi-midi)<Math.abs(best.midi-midi)?item:best,STRINGS_SAMPLE_ROOTS[0]);
  if(!state.stringsBuffers.has(sample.midi)){
    let pending=state.stringsSampleLoads.get(sample.midi);
    if(!pending){
      pending=(async()=>{
        const sources=[`audio/strings/${sample.file}`,...(sample.cloudinaryId?[`${CLOUDINARY_AUDIO_BASE}${sample.cloudinaryId}.wav`]:[])];
        let lastError=null;
        for(const source of sources){
          try{
            const response=await fetchAudioCached(source);
            if(!response.ok)throw new Error(`HTTP ${response.status} al cargar ${source}`);
            state.stringsBuffers.set(sample.midi,await getAudioContext().decodeAudioData(await response.arrayBuffer()));
            return;
          }catch(error){
            lastError=error;
            if(source.startsWith(CLOUDINARY_AUDIO_BASE))console.warn(`Muestra no disponible en Cloudinary; se usará la copia local ${sample.file}.`,error);
          }
        }
        throw lastError||new Error(`No se pudo cargar la muestra Strings ${sample.file}`);
      })();
      state.stringsSampleLoads.set(sample.midi,pending);
    }
    try{await pending;}finally{state.stringsSampleLoads.delete(sample.midi);}
  }
  return {buffer:state.stringsBuffers.get(sample.midi),sampleMidi:sample.midi};
}
async function getLayerSample(midi,instrument=state.layerInstrument){
  if(instrument==='strings')return getStringsSample(midi);
  if(instrument==='grand-piano'){const buffer=await getSample(midi);return {buffer,sampleMidi:Math.max(60,Math.min(76,midi))};}
  const sample=await getInstrumentSample(midi,instrument);return sample;
}
async function getOptionalLayerSample(midi){
  try{return await getLayerSample(midi);}
  catch(error){
    console.warn('No se pudo cargar la segunda capa:',error);
    const status=$('stringsLayerStatus');if(status&&state.stringsLayerEnabled)status.textContent=`No se pudo cargar ${instrumentLabel(state.layerInstrument)}. Comprueba la conexión e inténtalo de nuevo.`;
    return null;
  }
}
function scheduleLayerNote(context,midi,sample,when,duration,release=1.05){
  if(!sample||!state.stringsLayerEnabled||state.stringsLayerVolume<=0)return null;
  const isStrings=state.layerInstrument==='strings',attack=instrumentAttackTime(state.layerInstrument);
  const source=context.createBufferSource(),gain=context.createGain(),stopAt=when+Math.max(duration,.42),tail=isStrings?Math.max(.35,release):Math.max(.2,instrumentReleaseTime(state.layerInstrument));
  source.buffer=sample.buffer;source.playbackRate.value=2**((midi-sample.sampleMidi)/12);setInstrumentSampleLoop(source,sample);
  gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(.85,when+attack);
  gain.gain.setValueAtTime(.85,stopAt);gain.gain.linearRampToValueAtTime(.0001,stopAt+tail);
  source.connect(gain);gain.connect(getStringsLayerGain(context));source.start(when);source.stop(stopAt+tail+.02);
  return source;
}
function primeStringsLayer(){
  if(!state.stringsLayerEnabled)return;
  const status=$('stringsLayerStatus'),layerName=instrumentLabel(state.layerInstrument);if(status)status.textContent=`Preparando las muestras de ${layerName}…`;
  const commonNotes=[60,64,67,72];
  void Promise.all(commonNotes.map(midi=>getLayerSample(midi))).then(()=>{
    if(status&&state.stringsLayerEnabled)status.textContent=`${layerName} listo. Toca una tecla para mezclarlo con el instrumento principal.`;
  }).catch(error=>{
    console.warn('No se pudieron preparar las muestras de la capa:',error);
    if(status&&state.stringsLayerEnabled)status.textContent='Se cargarán al tocar. Comprueba la conexión si no suenan.';
  });
}
function setStringsLayerEnabled(enabled){
  state.stringsLayerEnabled=!!enabled;
  if(!state.song){freePlayInstrumentConfig.layerEnabled=state.stringsLayerEnabled;try{localStorage.setItem('yhwh_piano_strings_enabled',state.stringsLayerEnabled?'1':'0');}catch(_){} }
  syncStringsLayerControls();
  if(audioContext)updateStringsLayerGain();
  if(state.stringsLayerEnabled){void resumeAudioContext(getAudioContext()).catch(()=>{});getStringsLayerGain();primeStringsLayer();}
}
function isTrumpetInstrument(instrument){return instrument==='trumpet-real'||instrument==='trumpet-vsco2-sus-vib'||Object.hasOwn(VSCO2_TRUMPET_PATCHES,instrument);}
function usesDynamicLayers(instrument){return isTrumpetInstrument(instrument)||['solo-violin','distorted-guitar','growlybass-clean','fashionbass-clean'].includes(instrument);}
function syncDynamicLayerControl(instrument=state.instrument){const setting=$('trumpetIntensitySetting'),select=$('trumpetIntensity'),label=setting?.querySelector('label');if(!setting||!select)return;const custom=['solo-violin','distorted-guitar'].includes(instrument),growlybass=instrument==='growlybass-clean',fashionbass=instrument==='fashionbass-clean';setting.classList.toggle('hidden',!usesDynamicLayers(instrument));if(label)label.textContent=(growlybass||fashionbass)?'Intensidad del bajo':custom?'Intensidad':'Dinámica';if(fashionbass){select.innerHTML='<option value="very-soft">Muy suave</option><option value="soft">Suave</option><option value="medium">Media</option><option value="strong">Fuerte</option><option value="very-strong">Muy fuerte</option>';}else if(growlybass){select.innerHTML='<option value="very-soft">Muy suave</option><option value="soft">Suave</option><option value="medium">Media</option><option value="strong">Fuerte</option><option value="very-strong">Muy fuerte</option>';}else if(custom){select.innerHTML='<option value="soft">Suave</option><option value="strong">Fuerte</option>';if(!['soft','strong'].includes(state.trumpetIntensity))state.trumpetIntensity='strong';}else{select.innerHTML='<option value="soft">Suave</option><option value="medium">Media</option><option value="strong">Fuerte</option>';if(!['soft','medium','strong'].includes(state.trumpetIntensity))state.trumpetIntensity='strong';}select.value=state.trumpetIntensity;}function instrumentLabel(instrument){return {...Object.fromEntries(EXTRA_INSTRUMENTS.map(item=>[item.id,item.label])),'solo-violin':'Violín solista','distorted-guitar':'Guitarra eléctrica distorsionada','grand-piano':'Grand Piano','steinway-grand':'Steinway de cola','headroom-piano':'Headroom · Yamaha C3','splendid-grand':'Splendid Grand Piano','livingroom-upright-micro':'LivingRoom Upright Micro','maestro-concert-grand':'Maestro Concert Grand · Yamaha CF-3','salamander-grand':'Salamander Grand Piano · Yamaha C5','upright-piano-vsco2':'Vertical VSCO · Upright Piano','upright-nr1-vsco2':'Vertical VSCO · Upright No. 1','upright-piano-kw':'Upright Piano KW · Kawai','trumpet-real':'Trompeta real','trumpet-vsco2-sus-vib':'Trompeta VSCO · Vibrato','trumpet-vsco2-sus':'Trompeta VSCO · Sostenida','trumpet-vsco2-stac':'Trompeta VSCO · Staccato','trumpet-vsco2-harmon-mute-sus':'Trompeta VSCO · Sordina Harmon','trumpet-vsco2-straight-mute-sus':'Trompeta VSCO · Sordina Straight','strings':'Strings'}[instrument]||'Grand Piano';}
function syncPianoLayerControl(instrument=state.instrument){
  const setting=$('headroomIntensitySetting'),select=$('headroomIntensity'),label=$('headroomIntensityLabel');if(!setting||!select)return;
  const options=instrument==='splendid-grand'?[['1','Muy suave'],['2','Suave'],['3','Media'],['4','Fuerte'],['5','Muy fuerte']]:[['1','Muy suave'],['2','Suave'],['3','Media'],['4','Fuerte'],['5','Muy fuerte']];
  setting.classList.toggle('hidden',!['splendid-grand','maestro-concert-grand','salamander-grand'].includes(instrument));
  if(label)label.textContent='Dinámica del piano';
  select.innerHTML=options.map(([value,name])=>`<option value="${value}">${name}</option>`).join('');

  select.value=String(state.headroomVelocityLayer);
}
function instrumentAttackTime(instrument){return instrument==='strings'?state.stringsLayerAttackMs/1000:INSTRUMENTS[instrument]?.attack??.018;}
function instrumentReleaseTime(instrument,sustain=state.sustain){return instrument==='strings'?.9:INSTRUMENTS[instrument]?.release||VSCO2_TRUMPET_PATCHES[instrument]?.release||VSCO2_UPRIGHT_PATCHES[instrument]?.release||(instrument==='headroom-piano'?.8:instrument==='splendid-grand'?.7:instrument==='livingroom-upright-micro'?.9:instrument==='maestro-concert-grand'?.7:instrument==='salamander-grand'?.9:isTrumpetInstrument(instrument)?.25:instrument==='steinway-grand'?.7:(sustain?.9:.32));}
function setLayerInstrument(value){
  state.layerInstrument=availableInstrumentId(value,'strings');
  if(!state.song){freePlayInstrumentConfig.layerInstrument=state.layerInstrument;try{localStorage.setItem('yhwh_piano_layer_instrument',state.layerInstrument);}catch(_){} }
  syncStringsLayerControls();
  if(state.stringsLayerEnabled)primeStringsLayer();
}
function syncThirdLayerControls(){
  const toggle=$('thirdLayerToggle'),select=$('thirdLayerInstrument'),volume=$('thirdLayerVolume'),output=$('thirdLayerVolumeValue'),status=$('thirdLayerStatus');
  if(toggle){toggle.checked=state.thirdLayerEnabled;toggle.setAttribute('aria-checked',String(state.thirdLayerEnabled));}
  if(select){const source=$('instrumentSelect');if(source&&select.options.length!==source.options.length)select.replaceChildren(...[...source.options].map(option=>option.cloneNode(true)));if(select.value!==state.thirdLayerInstrument)select.value=state.thirdLayerInstrument;select.disabled=!state.thirdLayerEnabled;}
  if(volume){volume.value=String(state.thirdLayerVolume);volume.disabled=!state.thirdLayerEnabled;}
  if(output){output.value=`${state.thirdLayerVolume}%`;output.textContent=`${state.thirdLayerVolume}%`;}
  const pickerToggle=$('thirdLayerPickerEnabled'),pickerVolume=$('thirdLayerPickerVolume'),pickerOutput=$('thirdLayerPickerVolumeValue');
  if(pickerToggle){pickerToggle.checked=state.thirdLayerEnabled;pickerToggle.setAttribute('aria-checked',String(state.thirdLayerEnabled));}
  if(pickerVolume)pickerVolume.value=String(state.thirdLayerVolume);
  if(pickerOutput){pickerOutput.value=`${state.thirdLayerVolume}%`;pickerOutput.textContent=`${state.thirdLayerVolume}%`;}
  if(status)status.textContent=state.thirdLayerEnabled?`Tercera capa: ${instrumentLabel(state.thirdLayerInstrument)}.`:'Activa la tercera capa para añadir otro instrumento a la mezcla.';
}
function setThirdLayerEnabled(enabled){
  state.thirdLayerEnabled=!!enabled;
  try{localStorage.setItem('yhwh_piano_third_layer_enabled',state.thirdLayerEnabled?'1':'0');}catch(_){}
  syncThirdLayerControls();updateThirdLayerGain();
  if(state.thirdLayerEnabled){void resumeAudioContext(getAudioContext()).catch(()=>{});getThirdLayerGain();primeThirdLayer();}
}
function setThirdLayerVolume(value){
  state.thirdLayerVolume=Math.round(Math.max(0,Math.min(200,Number(value)||0)));
  try{localStorage.setItem('yhwh_piano_third_layer_volume',String(state.thirdLayerVolume));}catch(_){}
  syncThirdLayerControls();updateThirdLayerGain();
}
function setThirdLayerInstrument(value){
  state.thirdLayerInstrument=availableInstrumentId(value,'strings');
  try{localStorage.setItem('yhwh_piano_third_layer_instrument',state.thirdLayerInstrument);}catch(_){}
  syncThirdLayerControls();
  if(state.thirdLayerEnabled)primeThirdLayer();
}
async function getThirdLayerSample(midi){return getLayerSample(midi,state.thirdLayerInstrument);}
async function getOptionalThirdLayerSample(midi){
  try{return await getThirdLayerSample(midi);}
  catch(error){console.warn('No se pudo cargar la tercera capa:',error);const status=$('thirdLayerStatus');if(status&&state.thirdLayerEnabled)status.textContent=`No se pudo cargar ${instrumentLabel(state.thirdLayerInstrument)}.`;return null;}
}
function primeThirdLayer(){
  if(!state.thirdLayerEnabled)return;
  const name=instrumentLabel(state.thirdLayerInstrument),status=$('thirdLayerStatus');if(status)status.textContent=`Preparando tercera capa: ${name}…`;
  void Promise.all([60,64,67,72].map(getThirdLayerSample)).then(()=>{if(status&&state.thirdLayerEnabled)status.textContent=`Tercera capa lista: ${name}.`;}).catch(error=>{console.warn('No se pudieron preparar las muestras de la tercera capa:',error);if(status&&state.thirdLayerEnabled)status.textContent='Se cargarán al tocar.';});
}
function scheduleThirdLayerNote(context,midi,sample,when,duration,release=1.05){
  if(!sample||!state.thirdLayerEnabled||state.thirdLayerVolume<=0)return null;
  const instrument=state.thirdLayerInstrument,source=context.createBufferSource(),gain=context.createGain(),stopAt=when+Math.max(duration,.42),tail=instrument==='strings'?Math.max(.35,release):Math.max(.2,instrumentReleaseTime(instrument));
  source.buffer=sample.buffer;source.playbackRate.value=2**((midi-sample.sampleMidi)/12);setInstrumentSampleLoop(source,sample);
  gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(.85,when+instrumentAttackTime(instrument));gain.gain.setValueAtTime(.85,stopAt);gain.gain.linearRampToValueAtTime(.0001,stopAt+tail);
  source.connect(gain);gain.connect(getThirdLayerGain(context));source.start(when);source.stop(stopAt+tail+.02);return source;
}
function resumeAudioContext(context=getAudioContext()){
  if(context.state==='running')return Promise.resolve();
  return context.resume();
}
async function getSample(midi) {
  const sampleMidi = Math.max(60, Math.min(76, midi));
  if (!state.buffers.has(sampleMidi)) {
    let pending=state.sampleLoads.get(sampleMidi);
    if(!pending){
      pending=(async()=>{const response=await fetch(`audio/${String(sampleMidi-20).padStart(3,'0')}.wav`);if(!response.ok)throw new Error(`No se pudo cargar audio/${sampleMidi-20}.wav`);state.buffers.set(sampleMidi,await getAudioContext().decodeAudioData(await response.arrayBuffer()));})();
      state.sampleLoads.set(sampleMidi,pending);
    }
    try{await pending;}finally{state.sampleLoads.delete(sampleMidi);}
  }
  return state.buffers.get(sampleMidi);
}
