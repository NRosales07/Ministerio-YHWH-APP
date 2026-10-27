// Metrónomo compartido por el reproductor y Drum Pad.
function syncMetronomeUI(){
  const bpm=$('metronomeBpm'),meter=$('metronomeMeter'),value=$('metronomeBpmValue');
  if(bpm)bpm.value=String(metronomeBpm);
  if(meter)meter.value=String(metronomeMeter);
  if(value)value.textContent=`${metronomeBpm} BPM`;
  document.querySelectorAll('#metronomeBeats i').forEach((beat,index)=>{beat.style.display=index<metronomeMeter?'block':'none';beat.classList.remove('active');});
}
function setMetronomeBpm(value,save=false){
  metronomeBpm=Math.min(240,Math.max(40,Math.round(Number(value)||100)));
  syncMetronomeUI();
  if(save)try{localStorage.setItem('yhwh_piano_metronome_bpm',String(metronomeBpm));}catch(_){}
  if(metronomeOn){metronomeBeatIndex=0;metronomeNextBeat=getAudioContext().currentTime+.025;}
}
function setMetronomeMeter(value){
  metronomeMeter=[2,3,4,6].includes(Number(value))?Number(value):4;
  metronomeBeatIndex=0;syncMetronomeUI();
  try{localStorage.setItem('yhwh_piano_metronome_meter',String(metronomeMeter));}catch(_){}
}
function scheduleMetronomeBeat(context,time,beatIndex,showWhenMetronomeOff=false){
  const oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type='sine';oscillator.frequency.setValueAtTime(beatIndex===0?1760:1175,time);
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(beatIndex===0?.16:.105,time+.002);gain.gain.exponentialRampToValueAtTime(.0001,time+.055);
  oscillator.connect(gain);gain.connect(getMasterGain(context));oscillator.start(time);oscillator.stop(time+.06);
  const visualTimer=setTimeout(()=>{
    metronomeVisualTimers=metronomeVisualTimers.filter(timer=>timer!==visualTimer);
    if(!metronomeOn&&!showWhenMetronomeOff)return;
    document.querySelectorAll('#metronomeBeats i').forEach((beat,index)=>beat.classList.toggle('active',index===beatIndex));
  },Math.max(0,(time-context.currentTime)*1000));
  metronomeVisualTimers.push(visualTimer);
  return oscillator;
}
function runMetronomeScheduler(){
  if(!metronomeOn)return;
  const context=getAudioContext(),step=60/metronomeBpm;
  while(metronomeNextBeat<context.currentTime+.12){
    scheduleMetronomeBeat(context,metronomeNextBeat,metronomeBeatIndex);
    metronomeNextBeat+=step;metronomeBeatIndex=(metronomeBeatIndex+1)%metronomeMeter;
  }
}
function startMetronome(){
  if(metronomeOn)return;
  const context=getAudioContext();metronomeOn=true;metronomeBeatIndex=0;
  $('metronomeToggle').setAttribute('aria-pressed','true');$('metronomeToggle').setAttribute('aria-label','Detener metrónomo');$('metronomeToggle').title='Detener metrónomo';$('metronomeToggle').textContent='■';
  resumeAudioContext(context).then(()=>{
    if(!metronomeOn)return;
    metronomeNextBeat=context.currentTime+.05;runMetronomeScheduler();metronomeTimer=setInterval(runMetronomeScheduler,25);
  }).catch(()=>{stopMetronome();toast('No se pudo iniciar el metrónomo. Vuelve a tocar el botón.');});
}
function stopMetronome(){
  metronomeOn=false;if(metronomeTimer){clearInterval(metronomeTimer);metronomeTimer=null;}
  metronomeVisualTimers.forEach(clearTimeout);metronomeVisualTimers=[];
  document.querySelectorAll('#metronomeBeats i').forEach(beat=>beat.classList.remove('active'));
  const button=$('metronomeToggle');if(button){button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Iniciar metrónomo');button.title='Metrónomo';button.textContent='♩';}
}
function toggleMetronome(){metronomeOn?stopMetronome():startMetronome();}
function startMetronomeAt(time){
  if(metronomeTimer){clearInterval(metronomeTimer);metronomeTimer=null;}
  metronomeVisualTimers.forEach(clearTimeout);metronomeVisualTimers=[];
  metronomeOn=true;metronomeBeatIndex=0;metronomeNextBeat=time;
  const button=$('metronomeToggle');if(button){button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Detener metrónomo');button.title='Detener metrónomo';button.textContent='■';}
  runMetronomeScheduler();metronomeTimer=setInterval(runMetronomeScheduler,25);
}

function tapMetronomeTempo(){
  const now=performance.now(),last=metronomeTaps[metronomeTaps.length-1];
  if(last&&now-last>2200)metronomeTaps=[];
  metronomeTaps.push(now);metronomeTaps=metronomeTaps.slice(-5);
  if(metronomeTaps.length<2)return;
  const gaps=metronomeTaps.slice(1).map((tap,index)=>tap-metronomeTaps[index]);
  setMetronomeBpm(60000/(gaps.reduce((sum,gap)=>sum+gap,0)/gaps.length),true);
}
