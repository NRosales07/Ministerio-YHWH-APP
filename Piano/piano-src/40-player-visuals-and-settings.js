const keyLightCounts=new Map();
function shrinkTitleTextToFit(id,maxWidth,minFontSize=9){
  const element=$(id);if(!element)return;
  element.style.removeProperty('font-size');const text=element.textContent.trim();if(!text)return;
  const style=getComputedStyle(element),baseSize=parseFloat(style.fontSize)||16,spacing=parseFloat(style.letterSpacing)||0,spacingPerEm=spacing/baseSize;
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)return;
  const measure=size=>{context.font=`${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;return context.measureText(text).width+Math.max(0,text.length-1)*spacingPerEm*size;};
  let low=Math.min(minFontSize,baseSize),high=baseSize;
  if(measure(high)<=maxWidth){return;}
  for(let i=0;i<14;i++){const middle=(low+high)/2;if(measure(middle)<=maxWidth)low=middle;else high=middle;}
  element.style.fontSize=`${low}px`;
}
function fitSongPresentationCards(){
  const cinematic=$('songTitlePresentation'),black=$('blackTitlePresentation'),available=(element,padding=0)=>Math.max(0,(element?.clientWidth||0)-padding);
  const cinematicWidth=available(cinematic);
  if(cinematicWidth){shrinkTitleTextToFit('songTitlePresentationName',cinematicWidth,9);shrinkTitleTextToFit('songTitleCredit',cinematicWidth,8);}else ['songTitlePresentationName','songTitleCredit'].forEach(id=>$(id)?.style.removeProperty('font-size'));
  const blackWidth=Math.max(0,window.innerWidth-(window.innerWidth<=600?28:40));
  if(black&&getComputedStyle(black).display!=='none'){
    shrinkTitleTextToFit('blackTitleName',blackWidth,9);shrinkTitleTextToFit('blackTitleAlbum',blackWidth,8);
    const authorBox=$('blackTitleComposer')?.parentElement;shrinkTitleTextToFit('blackTitleComposer',available(authorBox)*(window.innerWidth<=600 ? .58 : .5),8);
  }else ['blackTitleName','blackTitleAlbum','blackTitleComposer'].forEach(id=>$(id)?.style.removeProperty('font-size'));
}
function lightKey(key,classes,ms){
  if(!key)return;
  classes=[...new Set([...classes,'note-sounding'])];
  let counts=keyLightCounts.get(key);if(!counts){counts={};keyLightCounts.set(key,counts);}
  classes.forEach(cls=>{counts[cls]=(counts[cls]||0)+1;key.classList.add(cls);});
  state.playTimers.push(setTimeout(()=>{classes.forEach(cls=>{counts[cls]=Math.max(0,(counts[cls]||0)-1);if(!counts[cls])key.classList.remove(cls);});},Math.max(0,ms)));
}
// Cola de eventos visuales de la reproducción (teclas encendidas y nota actual). Sustituye a un setTimeout por nota:
// se procesa en el mismo bucle y con el mismo reloj que las barras y la línea de tiempo, así todo cambia en el mismo frame.
const visualQueue={pending:[],index:0,sorted:true,offs:[]};
function resetVisualQueue(){visualQueue.pending.length=0;visualQueue.index=0;visualQueue.sorted=true;visualQueue.offs.length=0;}
function queueVisualEvent(at,fn){visualQueue.pending.push({at,fn});visualQueue.sorted=false;}
function lightKeyOn(key,classes){
  let counts=keyLightCounts.get(key);if(!counts){counts={};keyLightCounts.set(key,counts);}
  classes.forEach(cls=>{counts[cls]=(counts[cls]||0)+1;key.classList.add(cls);});
}
function lightKeyOff(key,classes){
  const counts=keyLightCounts.get(key);if(!counts)return;
  classes.forEach(cls=>{counts[cls]=Math.max(0,(counts[cls]||0)-1);if(!counts[cls])key.classList.remove(cls);});
}
function queueKeyLight(at,key,classes,ms){
  if(!key)return;
  const visibleClasses=lightKeys||keyEdge?classes:[];
  const activeClasses=[...new Set([...visibleClasses,'note-sounding'])];
  queueVisualEvent(at,()=>{lightKeyOn(key,activeClasses);visualQueue.offs.push({at:at+Math.max(0,ms)/1000,key,classes:activeClasses});});
}
function flushVisualQueue(now,finish){
  const q=visualQueue;
  if(!q.sorted){q.pending.splice(0,q.index);q.index=0;q.pending.sort((a,b)=>a.at-b.at);q.sorted=true;}
  if(finish)q.index=q.pending.length;
  else while(q.index<q.pending.length&&q.pending[q.index].at<=now){const event=q.pending[q.index++];event.fn();}
  for(let i=q.offs.length-1;i>=0;i--){const off=q.offs[i];if(finish||off.at<=now){lightKeyOff(off.key,off.classes);q.offs.splice(i,1);}}
}
function makeFallingNotesEvents(playbackNotes,playbackChords){
  const events=[];
  const chordStarts=playbackChords.map(chord=>chordStartTime(chord)).filter(value=>value!==null).map(value=>value/state.tempo).sort((a,b)=>a-b);
  playbackNotes.forEach(note=>{
        if(note.octave&&!state.showOctaveNotes)return;
    const midi=Number(note.midi),start=Math.max(0,Number(note.start)||0)/state.tempo;
    const held=(Number(note._playbackHold)||noteHoldSeconds(note))/state.tempo;
    if(Number.isFinite(midi)&&midi>=21&&midi<=108)events.push({midi,start,duration:Math.max(.06,held),kind:note._playbackKind==='accompaniment'?'accompaniment':'melody',track:note._playbackTrack||'melodia'});
  });
  playbackChords.forEach(chord=>{
    const start=chordStartTime(chord);if(start===null)return;
    const duration=Math.max(.06,(Number(chordSpanForPlayback(chord))||2)/state.tempo);
    chordMidiNotes(chord).forEach((midi,index)=>{
      const arpeggioOffset=(chord.arpeggio?index*.2:index*.01)/state.tempo;
      if(Number.isFinite(midi)&&midi>=21&&midi<=108){const eventStart=start/state.tempo+arpeggioOffset,nextChord=chordStarts.find(value=>value>start/state.tempo+.001);events.push({midi,start:eventStart,duration:nextChord===undefined?duration:Math.max(.06,Math.min(duration,nextChord-eventStart-.04)),kind:'chord',chord,index,track:chord._playbackTrack||'melodia'});};
    });
  });
  events.sort((a,b)=>a.start-b.start);
  const stageHeight=$('noteCanvas')?.clientHeight||0;
  const manualTapHeight=stageHeight?Math.min(stageHeight,Math.max(20,stageHeight*.05)):0;
  const tapBarDuration=stageHeight?manualTapHeight*Math.max(.8,fallingNotesLookahead)/stageHeight:Math.max(.8,fallingNotesLookahead)*.05;
  events.forEach(event=>{event.visualDuration=Math.min(Math.max(event.duration,event.kind==='melody'?tapBarDuration:0),FALLING_NOTES_MAX_LOOKAHEAD*.85);});
  return events;
}
function rebuildFallingNotesGeometry(){
  const stage=$('noteCanvas'),scroll=$('keyboardScroll');
  if(!stage||!scroll)return null;
  const stageRect=stage.getBoundingClientRect(),scrollRect=scroll.getBoundingClientRect(),scrollLeft=scroll.scrollLeft,positions=new Map();
  document.querySelectorAll('.piano-panel .key[data-midi]').forEach(key=>{
    const rect=key.getBoundingClientRect();
    positions.set(Number(key.dataset.midi),{center:rect.left-scrollRect.left+scrollLeft+rect.width/2,width:rect.width});
  });
  if(!positions.size)return null;
  const colors=getComputedStyle($('player')||stage);
  // zoom: el zoom con el que se midió; al hacer pinch las posiciones se escalan sin tocar el DOM.
  return {left:scrollRect.left-stageRect.left,zoom:state.keyboardZoom,positions,melodyColor:colors.getPropertyValue('--melody-note-color').trim()||'#29b6e6',chordColor:colors.getPropertyValue('--bass-note-color').trim()||'#bb82ef',accompaniment2Color:barAccompaniment2Color};
}
const BAR_NOTE_PALETTE=['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#d946ef'];
function fnIsBlackKeyMidi(midi){return [1,3,6,8,10].includes(((Number(midi)%12)+12)%12);}
function fnDarkenBarColor(color){const match=/^#?([0-9a-f]{6})$/i.exec(String(color||'').trim());if(!match)return color;const value=parseInt(match[1],16),dark=channel=>Math.round(channel*.68).toString(16).padStart(2,'0');return `#${dark(value>>16&255)}${dark(value>>8&255)}${dark(value&255)}`;}
function fnFallingEventColor(event,geometry){
  let color;
  if(event.track==='acompanamiento1')color=geometry.chordColor;
  else if(event.track==='acompanamiento2')color=geometry.accompaniment2Color;
  else if(barColorMode==='note')color=BAR_NOTE_PALETTE[((event.midi%12)+12)%12];
  else{const accompaniment=event.kind==='chord'||event.kind==='accompaniment';color=accompaniment&&barBassDiff?geometry.chordColor:geometry.melodyColor;}
  return fnIsBlackKeyMidi(event.midi)?fnDarkenBarColor(color):color;
}
function clearFallingNotesCanvas(){
  const info=fallingNotesCanvasInfo;
  if(info){info.context.clearRect(0,0,info.width,info.height);info.context.globalAlpha=1;}
  fnHits.length=0;fnHitBursts.length=0;fnGoldReset();
  fnDrawIdleLine();
}
function stopFallingNotes(){
  if(fallingNotesFrame)cancelAnimationFrame(fallingNotesFrame);
  fallingNotesFrame=0;fallingNotesRun=null;fallingNotesLastFrame=0;clearFallingNotesCanvas();
  if(fnFlameWanted()&&fallingNotesCanvasInfo&&!state.playing)fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
}
function finishFallingNotesPlayback(){
  fallingNotesRun=null;fallingNotesLastFrame=0;
  if(fnHasFx()){
    if(!fallingNotesFrame&&!document.hidden&&fallingNotesStyle!=='off')fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
  }else stopFallingNotes();
}
function fnRoundRect(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);}
function drawFallingNoteTag(ctx,midi,x,centerY,canvasWidth,canvasHeight){
  if(!state.showBarNotes)return;
  const label=fallingNoteName(midi),size=Math.min(18,Math.max(3,Number(deviceSettings.noteLabelSize)||12));
  ctx.save();ctx.font=`800 ${size}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.globalAlpha=1;const left=Math.max(2,Math.min(canvasWidth-2,x)),top=Math.max(size/2+1,Math.min(canvasHeight-size/2-1,centerY));
  if(noteLabelOutline){ctx.lineJoin='round';ctx.lineWidth=Math.max(2.5,size*.28);ctx.strokeStyle='#000';ctx.strokeText(label,left,top);ctx.fillStyle='#fff';}else ctx.fillStyle=deviceSettings.noteLabelColor||'#111111';
  ctx.fillText(label,left,top);ctx.restore();
}
const fnHits=[],fnHitBursts=[],fnGlowCache=new Map();let fnManualHitIndex=0;
function fnGlow(ctx,color,baseline){
  const key=color+'|'+baseline;let g=fnGlowCache.get(key);
  if(!g){if(fnGlowCache.size>24)fnGlowCache.clear();g=ctx.createLinearGradient(0,baseline,0,baseline-88);const t=fnTone(color);g.addColorStop(0,color);g.addColorStop(.38,t.glowMid);g.addColorStop(1,t.glowEnd);fnGlowCache.set(key,g);}
  return g;
}
const fnToneCache=new Map();
function fnTone(color){
  let t=fnToneCache.get(color);if(t)return t;
  const m=/^#?([0-9a-f]{6})$/i.exec(String(color||'').trim()),n=m?parseInt(m[1],16):0x2fe6d4,r=n>>16&255,g=n>>8&255,b=n&255;
  const mix=(c,k)=>Math.round(c+(255-c)*k),light=(k,a)=>`rgba(${mix(r,k)},${mix(g,k)},${mix(b,k)},${a})`,rgba=a=>`rgba(${r},${g},${b},${a})`;
  t={light,rgba,hot:light(.88,.96),warm:light(.42,.92),base:rgba(.9),rim:light(.55,.9),shine:light(.8,1),glowMid:rgba(.2),glowEnd:rgba(0),coreA:light(.85,.7),coreB:light(.35,.4),
    flowBase0:light(.1,.2),flowBase1:light(.7,.06),flowBase2:light(.7,.13),flowBase3:light(.2,.22),f0:rgba(0),f1:rgba(.4),f2:light(.55,.78),f3:light(.85,.58),f4:light(.3,.52)};
  if(fnToneCache.size>16)fnToneCache.clear();fnToneCache.set(color,t);return t;
}
const fnGlassCache=new Map();
function fnGlassFill(ctx,color,width){
  const w=Math.max(1,Math.round(width)),key=color+'|'+w;let g=fnGlassCache.get(key);
  if(!g){
    if(fnGlassCache.size>48)fnGlassCache.clear();
    const t=fnTone(color);g=ctx.createLinearGradient(0,0,w,0);
    g.addColorStop(0,t.light(.5,.95));g.addColorStop(.2,t.rgba(.78));g.addColorStop(.55,t.rgba(.5));g.addColorStop(.85,t.rgba(.7));g.addColorStop(1,t.light(.4,.95));
    fnGlassCache.set(key,g);
  }
  return g;
}
// Barra tipo cristal: cápsula translúcida, borde claro y un reflejo vertical.
function fnDrawGlassBar(ctx,x,top,w,h,color,chord){
  const t=fnTone(color),r=Math.min(barRadius,w/2,h/2);
  ctx.save();ctx.translate(x,top);
  ctx.globalAlpha=(chord?.82:1)*barOpacity/100;fnRoundRect(ctx,0,0,w,h,r);ctx.fillStyle=fnGlassFill(ctx,color,w);ctx.fill();
  if(w>=8&&h>=16){const inset=Math.min(5,h*.2),sw=Math.max(1.5,w*.15);ctx.globalAlpha=(chord?.2:.32)*barOpacity/100;ctx.fillStyle='#ffffff';fnRoundRect(ctx,w*.22,inset,sw,h-inset*2,Math.min(1,sw/2));ctx.fill();}
  ctx.restore();
}
function fnDrawNeonBar(ctx,x,top,w,h,color,chord,gradient){
  const tone=fnTone(color),radius=Math.min(barRadius,w/2,h/2),stroke= Math.max(1,Math.min(3,w*.12));
  ctx.save();ctx.globalAlpha=(chord?.82:1)*barOpacity/100;ctx.lineWidth=stroke;ctx.strokeStyle=gradient||color;ctx.shadowColor=tone.rgba(.9);ctx.shadowBlur=Math.max(4,stroke*3);
  fnRoundRect(ctx,x+stroke/2,top+stroke/2,Math.max(1,w-stroke),Math.max(1,h-stroke),radius);ctx.stroke();
  ctx.shadowBlur=0;ctx.globalAlpha*=.55;ctx.lineWidth=Math.max(1,stroke*.45);ctx.strokeStyle='#ffffff';fnRoundRect(ctx,x+stroke,top+stroke,Math.max(1,w-stroke*2),Math.max(1,h-stroke*2),Math.max(0,radius-stroke/2));ctx.stroke();ctx.restore();
}
function fnDrawSynesthesiaBar(ctx,x,top,w,h,color,chord,gradient){
  const tone=fnTone(color),radius=Math.min(barRadius,w/2,h/2);ctx.save();ctx.globalAlpha=(chord?.82:1)*barOpacity/100;
  fnRoundRect(ctx,x,top,w,h,radius);ctx.clip();const fill=gradient||ctx.createLinearGradient(x,top,x,top+h);
  if(!gradient){fill.addColorStop(0,tone.light(.58,.96));fill.addColorStop(.42,tone.light(.12,.94));fill.addColorStop(1,tone.rgba(.92));}
  ctx.fillStyle=fill;ctx.fillRect(x,top,w,h);ctx.globalAlpha*=.25;ctx.fillStyle='#fff';ctx.fillRect(x,top,w,Math.max(2,h*.08));ctx.restore();
}
function fnDrawBarTrail(ctx,x,top,w,h,color){
  if(barTrail<=0)return;const trailHeight=Math.min(100,Math.max(12,h*.28))*barTrail/100,tone=fnTone(color),gradient=ctx.createLinearGradient(0,top-trailHeight,0,top);
  gradient.addColorStop(0,tone.rgba(0));gradient.addColorStop(1,tone.rgba(.38*barOpacity/100));ctx.save();ctx.fillStyle=gradient;ctx.fillRect(x,top-trailHeight,w,trailHeight);ctx.restore();
}
function fnDrawFallingBar(ctx,x,top,w,h,color,chord,baseline,solidTrack=false){
  const gradient=!solidTrack&&barLook!=='normal'?fnDuoGradient(ctx,color,baseline,barLook==='tri'):null;
  if(solidTrack||barStyle==='solid'){ctx.save();ctx.globalAlpha=(chord?.82:1)*barOpacity/100;ctx.fillStyle=solidTrack?color:(gradient||color);const radius=Math.min(barRadius,w/2,h/2);if(radius>0)fnRoundRect(ctx,x,top,w,h,radius);else ctx.beginPath(),ctx.rect(x,top,w,h);ctx.fill();ctx.restore();}
  else if(barStyle==='neon')fnDrawNeonBar(ctx,x,top,w,h,color,chord,gradient);
  else if(barStyle==='synesthesia')fnDrawSynesthesiaBar(ctx,x,top,w,h,color,chord,gradient);
  else if(gradient){ctx.save();ctx.globalAlpha=(chord?.82:1)*barOpacity/100;fnRoundRect(ctx,x,top,w,h,Math.min(barRadius,w/2,h/2));ctx.fillStyle=gradient;ctx.fill();ctx.restore();}
  else fnDrawGlassBar(ctx,x,top,w,h,color,chord);
  if(!solidTrack&&barStyle!=='solid')fnDrawBarTrail(ctx,x,top,w,h,color);
}
function fnRand(n){const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);}
// Duración total del fuego (antes 1,5 s): las llamas siguen igual de rápidas y después quedan brasas y humo.
const FN_BURST_SECONDS=3.4,FN_BURST_K=FN_BURST_SECONDS/1.5;
// Sprite blando (centro casi blanco, halo del color) reutilizado por las llamas, chispas y hilos de humo.
const fnSpriteCache=new Map();
// Sprite del color de la nota. Blando = llamas; nítido = chispas, brasas y hilos (punto pequeño con núcleo claro y borde definido).
function fnSprite(color,crisp){
  const key=crisp?color+'|c':color;let sp=fnSpriteCache.get(key);if(sp)return sp;
  const t=fnTone(color),size=crisp?32:64,cv=document.createElement('canvas');cv.width=cv.height=size;
  const c=cv.getContext('2d'),g=c.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  if(crisp){g.addColorStop(0,t.shine);g.addColorStop(.4,t.hot);g.addColorStop(.58,t.warm);g.addColorStop(.72,t.rgba(.35));g.addColorStop(1,t.glowEnd);}
  else{g.addColorStop(0,t.shine);g.addColorStop(.14,t.hot);g.addColorStop(.32,t.warm);g.addColorStop(.62,t.rgba(.6));g.addColorStop(1,t.glowEnd);}
  c.fillStyle=g;c.fillRect(0,0,size,size);
  if(fnSpriteCache.size>24)fnSpriteCache.clear();fnSpriteCache.set(key,cv);return cv;
}
// Movimiento irregular y suave (varias ondas mezcladas), entre -1 y 1: da el aspecto desordenado del fuego.
function fnTurb(seed,p){return Math.sin(p*5.3+seed*17.1)*.5+Math.sin(p*11.7+seed*7.3)*.3+Math.sin(p*23.1+seed*3.9)*.2;}
function fnDrawMoltenHitBurst(ctx,hit,baseline,reducedMotion,load){
  const tt=hit.t*(hit.duration||FN_BURST_SECONDS)/1.5,life=Math.max(0,1-hit.t),soft=fnSprite(hit.color),dot=fnSprite(hit.color,true),intensity=hit.intensity||1;
  const kw=Math.max(6,hit.keyWidth||hit.barWidth/.72),half=kw/2;
  ctx.save();ctx.globalCompositeOperation='screen';
  // Luz de la tecla: del ancho exacto de la tecla y tenue.
  if(life>0){ctx.fillStyle=fnGlow(ctx,hit.color,baseline);ctx.globalAlpha=life*.2;ctx.fillRect(hit.center-half,baseline-96,kw,96);}
  if(!reducedMotion&&noteParticlesEnabled){
    if(life>0){
      ctx.save();ctx.beginPath();ctx.rect(hit.center-half,baseline-96,kw,96);ctx.clip();
      const core=kw*1.4;ctx.globalAlpha=life*.28;ctx.drawImage(soft,hit.center-core/2,baseline-7-core/2,core,core);
      ctx.restore();
    }
    const q=(load>12?.4:load>8?.6:load>5?.8:1)*intensity,flameN=Math.max(3,Math.round(8*q)),sparkN=Math.max(6,Math.round(20*q)),wispN=Math.max(6,Math.round(22*q)),emberN=Math.max(5,Math.round(18*q)),hazeN=Math.max(1,Math.round(3*q));
    const lean=(fnRand(hit.index*7.3+1)-.5)*kw*2.2,flick=hit.t*70*FN_BURST_K;
    ctx.globalCompositeOperation='lighter';
    if(tt<1){
      // Llamas pequeñas y rápidas.
      for(let i=0;i<flameN;i++){
        const s=fnRand(hit.index*53+i*11+1),s2=fnRand(hit.index*29+i*7+5),delay=s2*.25,span=Math.min(.22+s*.28,1-delay),p=(tt-delay)/span;
        if(p<=0||p>=1)continue;
        const e=1-Math.pow(1-p,2.2),x=hit.center+(s2-.5)*kw*.8*(1-p*.4)+fnTurb(s,p*2+i)*kw*(.2+p*.7)+lean*p*p,y=baseline-4-e*(30+s*80);
        const r=Math.min(kw*(.3+s*.35),14)*(1-p*.6)+1.5;
        ctx.globalAlpha=Math.min(1,p*8)*(1-p)*.9*(.75+.25*Math.sin(flick+i*3));
        ctx.drawImage(soft,x-r,y-r*1.3,r*2,r*2.6);
      }
      // Chispas nítidas que salen disparadas hacia arriba y a los lados.
      for(let i=0;i<sparkN;i++){
        const s=fnRand(hit.index*97+i*13+3),s2=fnRand(hit.index*31+i*19+9),delay=s2*.4,span=Math.min(.2+s*.3,1-delay),p=(tt-delay)/span;
        if(p<=0||p>=1)continue;
        const e=1-Math.pow(1-p,2),x=hit.center+(s2-.5)*kw*1.1+(s-.5)*kw*2.8*e+fnTurb(s2,p*3+i)*kw*.5*p+lean*p,y=baseline-4-e*(70+s*190)+p*p*14;
        const d=(.9+s*1.1)*(1-p*.3)*3.6;
        ctx.globalAlpha=Math.min(1,p*12)*Math.pow(1-p,.9)*(.65+.35*Math.sin(flick*.85+i*5));
        ctx.drawImage(dot,x-d/2,y-d/2,d,d);
      }
      // Hilos finos que se enroscan al subir.
      for(let i=0;i<wispN;i++){
        const s=fnRand(hit.index*61+i*17+2),s2=fnRand(hit.index*43+i*23+7),delay=s2*.3,span=Math.min(.3+s*.4,1-delay),p=(tt-delay)/span;
        if(p<=0||p>=1)continue;
        const e=1-Math.pow(1-p,1.9),curl=Math.sin(p*9+s*12)*kw*(.2+p*.55)+fnTurb(s2,p*4)*kw*.35*p;
        const x=hit.center+(s-.5)*kw*(.8+p*1.6)+curl+lean*p,y=baseline-4-e*(55+s*160),d=(.8+s*1.2)*(1-p*.3)*3.4;
        ctx.globalAlpha=Math.min(1,p*10)*(1-p)*.9;
        ctx.drawImage(dot,x-d/2,y-d/2,d,d);
      }
    }
    // Residuos: suben rápido y se quedan flotando alrededor un rato.
    for(let i=0;i<emberN;i++){
      const s=fnRand(hit.index*71+i*29+4),s2=fnRand(hit.index*37+i*13+11),delay=s2*.3,span=Math.min(.4+s*.4,1-delay),p=(hit.t-delay)/span;
      if(p<=0||p>=1)continue;
      const e=1-Math.pow(1-p,2.8),x=hit.center+(s-.5)*kw*(2.2+p*3.5)+fnTurb(s2,p*3+i)*kw*(.3+p*.6)+lean*p*1.3,y=baseline-6-e*(30+s2*130)+Math.sin(p*6+s*9)*3;
      const d=(.9+s*1.1)*(1-p*.25)*3.6,tw=Math.sin(flick*.25+i*7);
      ctx.globalAlpha=Math.min(1,p*12)*Math.pow(1-p,.6)*(.6+.4*tw*tw);
      ctx.drawImage(dot,x-d/2,y-d/2,d,d);
    }
    for(let i=0;i<hazeN;i++){
      const s=fnRand(hit.index*83+i*19+6),s2=fnRand(hit.index*47+i*17+3),delay=s2*.25,span=Math.min(.6+s*.4,1-delay),p=(hit.t-delay)/span;
      if(p<=0||p>=1)continue;
      const x=hit.center+(s-.5)*kw*1.4+fnTurb(s2,p*2+i)*kw*(.4+p*.9)+lean*p,y=baseline-10-(1-Math.pow(1-p,2))*(30+s2*60),d=kw*(.5+s*.6)*(.6+p*.7)+6;
      ctx.globalAlpha=Math.min(1,p*6)*(1-p)*.12;
      ctx.drawImage(soft,x-d/2,y-d/2,d,d);
    }
  }
  ctx.restore();
}
function fnDrawSmokeSparkBurst(ctx,hit,baseline,reducedMotion,load){
  const t=hit.t,kw=Math.max(6,hit.keyWidth||hit.barWidth/.72),scale=(hit.intensity||1)*(load>12?.65:1),tone=fnTone(hit.color),smokeCount=Math.max(9,Math.round((18-Math.min(load,10)*.7)*scale));
  ctx.save();ctx.globalCompositeOperation='screen';
  if(!reducedMotion){
    // Columnas suaves de humo teñido con el halo, que ascienden en remolinos lentos.
    for(let i=0;i<smokeCount;i++){
      const seed=fnRand(hit.index*41+i*13+5),delay=seed*.16,p=Math.max(0,(t-delay)/(1-delay));if(p<=0||p>=1)continue;
      const angle=p*3.4+seed*6.283+i*.72,orbit=kw*(.12+p*(.48+seed*.42)),sway=fnTurb(seed,p*1.35+i),sideSwing=Math.sin(p*5.2+seed*5+i*.38)*kw*(.28+p*.78),x=hit.center+(seed-.5)*kw*.3+sideSwing+Math.cos(angle)*orbit+sway*kw*(.12+p*.24),y=baseline-7-p*(85+seed*120)+Math.sin(angle)*kw*(.08+p*.12),r=kw*(.16+seed*.11)*(1+p*1.4);
      const g=ctx.createRadialGradient(x-r*.2,y-r*.25,1,x,y,r);g.addColorStop(0,tone.rgba(.38*(1-p)));g.addColorStop(.42,tone.rgba(.27*(1-p)));g.addColorStop(.72,tone.rgba(.13*(1-p)));g.addColorStop(1,tone.rgba(0));
      ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    // Chispas persistentes recorren la misma curva mientras el humo sube.
    if(noteParticlesEnabled&&t<.82){const count=Math.max(7,Math.round(14*scale)),p=t/.82;ctx.globalCompositeOperation='lighter';
      for(let i=0;i<count;i++){const a=fnRand(hit.index*67+i*17+2),b=fnRand(hit.index*23+i*29+8),curl=p*3.4+a*6.283,sideSwing=Math.sin(p*5.2+a*5+i*.38)*kw*(.28+p*.78),x=hit.center+sideSwing+Math.cos(curl)*kw*(.2+p*.78),y=baseline-5-p*(48+b*120)+Math.sin(curl)*kw*.13,d=1.5+b*1.7;ctx.globalAlpha=(1-p)*(.7+.3*Math.sin(t*24+i*3));ctx.fillStyle=tone.shine;ctx.fillRect(x-d/2,y-d*2,d,d*2);}
    }
  }
  ctx.restore();
}
// Efecto "Chispas doradas": cinta de chispas que sube al tocar cada nota (la línea del piano es una opción aparte).
const FN_GOLD='#ffc21a',FN_FX_SECONDS={gold:1.9};
// Línea de brasa: línea fina y casi recta con una ligera curva que ondula hacia la derecha, con resplandor cálido que también avanza a la derecha.
const fnFlameGrad=new Map();let fnFlameH=new Float32Array(0),fnSmokeSprite=null;
function fnFlameGradient(ctx,baseline,tall,glow){
  const key=(glow?'g':'f')+baseline+'|'+tall;let g=fnFlameGrad.get(key);
  if(!g){if(fnFlameGrad.size>12)fnFlameGrad.clear();g=ctx.createLinearGradient(0,baseline,0,baseline-tall);
    if(glow){g.addColorStop(0,'rgba(255,150,60,.6)');g.addColorStop(.16,'rgba(235,105,35,.26)');g.addColorStop(.55,'rgba(200,75,25,.07)');g.addColorStop(1,'rgba(180,60,20,0)');}
    else{g.addColorStop(0,'rgba(255,224,170,.95)');g.addColorStop(.35,'rgba(255,160,70,.7)');g.addColorStop(1,'rgba(255,110,30,0)');}
    fnFlameGrad.set(key,g);}
  return g;
}
// Mancha blanda y tenue para el humo (se crea una sola vez y se reutiliza escalada).
function fnSmoke(){
  if(fnSmokeSprite)return fnSmokeSprite;
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,175,105,.85)');g.addColorStop(.45,'rgba(225,125,65,.38)');g.addColorStop(1,'rgba(180,80,30,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);return fnSmokeSprite=c;
}
function fnDrawFlameLine(ctx,width,baseline,timestamp,still){
  const tm=still?1.7:timestamp/1000,sc=Math.max(.45,neonEdge.thickness/3),gl=neonEdge.glow/100;
  const step=Math.max(5,width/200),n=Math.max(2,Math.ceil(width/step));
  if(fnFlameH.length<n+1)fnFlameH=new Float32Array(n+1);
  const hs=fnFlameH;
  // Línea casi recta: una curva suave que viaja a la derecha y un temblor muy pequeño.
  for(let i=0;i<=n;i++){
    const x=i*step,wave=Math.sin(x*.011-tm*1.1)*.5+Math.sin(x*.027-tm*1.9+1.3)*.3+1,
      fine=fnTurb(x*.02-tm*.3,tm*2.4-x*.004)*.5+.5;
    hs[i]=(1.4+wave*1.3+fine*1.5)*sc;
  }
  ctx.save();ctx.globalCompositeOperation='lighter';
  if(gl>0){const tall=Math.round(34*Math.max(.8,Math.sqrt(sc)));ctx.globalAlpha=Math.min(1,.85*gl);ctx.fillStyle=fnFlameGradient(ctx,baseline,tall,true);ctx.fillRect(0,baseline-tall,width,tall);}
  // Resplandor que se desplaza: zonas más brillantes y más altas que avanzan a la derecha por encima de la línea.
  if(gl>0){
    const tall=Math.round(54*Math.max(.8,Math.sqrt(sc))),seg=Math.max(6,Math.round(width/150)),n2=Math.ceil(width/seg);
    ctx.fillStyle=fnFlameGradient(ctx,baseline,tall,true);
    for(let i=0;i<n2;i++){
      const x0=Math.round(i*seg),x1=Math.min(Math.round(width),Math.round((i+1)*seg)),x=(x0+x1)/2,
        w1=Math.sin(x*.0068-tm*1.5)*.5+.5,w2=Math.sin(x*.0029-tm*.8+2)*.5+.5,v=w1*w2;
      if(x1>x0){ctx.globalAlpha=Math.min(1,gl)*v*v*.7;ctx.fillRect(x0,baseline-tall,x1-x0,tall);}
    }
  }
  const tall=Math.round(7*sc)+4;
  ctx.globalAlpha=1;ctx.fillStyle=fnFlameGradient(ctx,baseline,tall,false);
  ctx.beginPath();ctx.moveTo(0,baseline+1);
  for(let i=0;i<=n;i++)ctx.lineTo(Math.min(width,i*step),baseline-hs[i]);
  ctx.lineTo(width,baseline+1);ctx.closePath();ctx.fill();
  // Hilo brillante, casi blanco, en el borde de las teclas.
  ctx.beginPath();
  for(let i=0;i<=n;i++){const x=Math.min(width,i*step),y=baseline-1.6-hs[i]*.45;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
  ctx.strokeStyle='rgb(255,140,50)';ctx.lineWidth=Math.max(5,7*Math.sqrt(sc));ctx.globalAlpha=.22;ctx.stroke();
  ctx.strokeStyle='rgb(255,178,92)';ctx.lineWidth=Math.max(2.4,3.2*Math.sqrt(sc));ctx.globalAlpha=.95;ctx.stroke();
  ctx.strokeStyle='rgb(255,238,208)';ctx.lineWidth=Math.max(1,1.4*Math.sqrt(sc));ctx.globalAlpha=.95;ctx.stroke();
  ctx.restore();
}
// Dibuja la línea de llama quieta cuando el canvas está en reposo (sin reproducir ni efectos).
function fnDrawIdleLine(){
  const info=fallingNotesCanvasInfo;
  if(!info||!neonEdge.on||neonEdge.style!=='flame')return;
  fnDrawFlameLine(info.context,info.width,info.height,0,true);info.context.globalAlpha=1;
}
function fnRefreshIdleLine(){
  if(typeof ensureFallingNotesObservers==='function')ensureFallingNotesObservers();
  if(fallingNotesFrame||document.hidden)return;
  if(!resizeFallingNotesCanvas())return;
  clearFallingNotesCanvas();
  if(fnFlameWanted()&&!state.playing)fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
}
// Barras de varios colores: el color de la nota abajo (cerca del teclado) y los colores elegidos hacia arriba.
const fnDuoGradCache=new Map();
function fnDuoGradient(ctx,color,baseline,tri){
  const key=color+'|'+baseline+'|'+(tri?barColor2+barColor3:barColor2);let g=fnDuoGradCache.get(key);
  if(!g){
    if(fnDuoGradCache.size>24)fnDuoGradCache.clear();
    g=ctx.createLinearGradient(0,0,0,baseline);
    if(tri){g.addColorStop(0,barColor3);g.addColorStop(.5,barColor2);}else g.addColorStop(0,barColor2);
    g.addColorStop(1,color);fnDuoGradCache.set(key,g);
  }
  return g;
}
function fnDrawDuoBar(ctx,x,top,w,h,color,chord,baseline,tri){
  const t=fnTone(color),r=Math.min(3,w/2,h/2),a=chord?.85:1;
  ctx.save();ctx.globalAlpha=a;fnRoundRect(ctx,x,top,w,h,r);ctx.fillStyle=fnDuoGradient(ctx,color,baseline,tri);ctx.fill();
  ctx.restore();
}
const FN_GP_MAX=240,fnGp={n:0,x:new Float32Array(FN_GP_MAX),age:new Float32Array(FN_GP_MAX),life:new Float32Array(FN_GP_MAX),rise:new Float32Array(FN_GP_MAX),amp:new Float32Array(FN_GP_MAX),omega:new Float32Array(FN_GP_MAX),phase:new Float32Array(FN_GP_MAX),size:new Float32Array(FN_GP_MAX),drift:new Float32Array(FN_GP_MAX)},fnGoldHolds=[];let fnGoldLast=0;
function fnFlameWanted(){return neonEdge.on&&neonEdge.style==='flame'&&!document.hidden&&fallingNotesStyle!=='off';}
let fnIdleLast=0;
function fnHasFx(){return fnHitBursts.length>0||fnGp.n>0||fnGoldHolds.length>0||fnFlameWanted();}
function fnGoldReset(){fnGp.n=0;fnGoldHolds.length=0;fnGoldLast=0;}
// Una nota que suena va soltando chispas mientras dura: cuanto más se sostiene, más salen. Suben dando vueltas hacia los lados.
function fnGoldEmit(cx,kw,count){
  for(let k=0;k<count&&fnGp.n<FN_GP_MAX;k++){
    const i=fnGp.n++;
    fnGp.x[i]=cx+(Math.random()-.5)*kw*.7;fnGp.age[i]=0;fnGp.life[i]=.9+Math.random()*.9;fnGp.rise[i]=90+Math.random()*170;
    fnGp.amp[i]=kw*(.35+Math.random()*1.5);fnGp.omega[i]=(4+Math.random()*6)*(Math.random()<.5?-1:1);fnGp.phase[i]=Math.random()*6.2832;
    fnGp.size[i]=1.3+Math.random()*2.2;fnGp.drift[i]=(Math.random()-.5)*kw*1.2;
  }
}
function fnGoldStep(ctx,dt,baseline){
  if(!fnGp.n)return;
  const dot=fnSprite(FN_GOLD,true);ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=fnGp.n-1;i>=0;i--){
    const age=fnGp.age[i]+dt,life=fnGp.life[i];
    if(age>=life){const last=--fnGp.n;if(i!==last){for(const key of ['x','age','life','rise','amp','omega','phase','size','drift'])fnGp[key][i]=fnGp[key][last];}continue;}
    fnGp.age[i]=age;
    const f=age/life,swirl=fnGp.amp[i]*(.25+.75*f),a=fnGp.phase[i]+fnGp.omega[i]*age;
    const x=fnGp.x[i]+Math.sin(a)*swirl+fnGp.drift[i]*age,y=baseline-4-fnGp.rise[i]*(1-Math.exp(-age*1.6))+Math.cos(a)*swirl*.35;
    const d=fnGp.size[i]*3.2*(1-f*.4);
    ctx.globalAlpha=Math.min(1,age*14)*Math.pow(1-f,.8)*(.7+.3*Math.sin(a*2+i));
    ctx.drawImage(dot,x-d/2,y-d/2,d,d);
  }
  ctx.restore();
}
// Ráfaga al empezar la nota: destello en la tecla, cinta de chispas y chispas sueltas (después siguen saliendo del emisor continuo).
function fnDrawGoldSparkBurst(ctx,hit,baseline,reducedMotion,load){
  const life=Math.max(0,1-hit.t),soft=fnSprite(FN_GOLD),dot=fnSprite(FN_GOLD,true);
  const kw=Math.max(6,hit.keyWidth||hit.barWidth/.72),half=kw/2,cx=hit.center;
  ctx.save();ctx.globalCompositeOperation='lighter';
  // Destello en la tecla y columna de luz tenue.
  if(goldImpactGlow){const fw=kw*2.7;ctx.globalAlpha=Math.pow(life,1.6)*.52;ctx.drawImage(soft,cx-fw/2,baseline-fw/2,fw,fw);}
  if(goldImpactGlow){ctx.fillStyle=fnGlow(ctx,FN_GOLD,baseline);ctx.globalAlpha=life*.17;ctx.fillRect(cx-half,baseline-88,kw,88);}
  if(fxGlow&&noteParticlesEnabled&&!reducedMotion){
    const q=(load>12?.4:load>8?.6:load>5?.8:1)*(hit.intensity||1),ribbonN=Math.max(8,Math.round(26*q)),strayN=Math.max(4,Math.round(14*q));
    const lean=(fnRand(hit.index*7.3+1)-.5)*kw*3,rise=150+fnRand(hit.index*3.1+2)*110,flick=hit.t*60;
    // Cinta de chispas que sube serpenteando.
    for(let i=0;i<ribbonN;i++){
      const s=fnRand(hit.index*53+i*11+1),s2=fnRand(hit.index*29+i*7+5),delay=s2*.3,span=Math.min(.45+s*.4,1-delay),p=(hit.t-delay)/span;
      if(p<=0||p>=1)continue;
      const e=1-Math.pow(1-p,1.8),x=cx+lean*e+Math.sin(p*5+hit.index*1.7+i*.05)*kw*(.5+e*1.1)+(s-.5)*kw*.9,y=baseline-4-e*rise*(.6+s*.4);
      const d=(1.2+s*1.6)*(1-p*.5)*3.4;
      ctx.globalAlpha=Math.min(1,p*10)*Math.pow(1-p,.8)*(.7+.3*Math.sin(flick+i*5));
      ctx.drawImage(dot,x-d/2,y-d/2,d,d);
    }
    // Chispas sueltas que se abren a los lados y caen un poco.
    for(let i=0;i<strayN;i++){
      const s=fnRand(hit.index*97+i*13+3),s2=fnRand(hit.index*31+i*19+9),delay=s2*.35,span=Math.min(.5+s*.4,1-delay),p=(hit.t-delay)/span;
      if(p<=0||p>=1)continue;
      const e=1-Math.pow(1-p,2.2),x=cx+(s-.5)*kw*5*e+lean*p,y=baseline-6-e*(40+s2*90)+p*p*16,d=(.8+s*1)*(1-p*.3)*3;
      ctx.globalAlpha=Math.min(1,p*12)*Math.pow(1-p,.7)*(.6+.4*Math.sin(flick*.8+i*7));
      ctx.drawImage(dot,x-d/2,y-d/2,d,d);
    }
  }
  ctx.restore();
}
function fnDrawRingBurst(ctx,hit,baseline,reducedMotion){
  const life=1-hit.t,intensity=hit.intensity||1,cx=hit.center,cy=baseline-2,kw=hit.keyWidth||hit.barWidth/.72;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let ring=0;ring<3;ring++){const p=Math.max(0,Math.min(1,hit.t*1.35-ring*.2));if(p<=0)continue;const radius=kw*(.18+p*(reducedMotion?1.2:2.4)),alpha=life*(1-p*.5)*(.52*intensity);ctx.globalAlpha=Math.min(.75,alpha);ctx.strokeStyle=hit.color;ctx.lineWidth=Math.max(1,kw*.075*(1-p*.55)*intensity);ctx.beginPath();ctx.ellipse(cx,cy,radius,radius*.42,0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
function fnDrawBubbleBurst(ctx,hit,baseline,reducedMotion){
  const life=1-hit.t,intensity=hit.intensity||1,kw=hit.keyWidth||hit.barWidth/.72,count=Math.round(10*intensity);ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<count;i++){const seed=hit.index*31+i*17+3,delay=fnRand(seed)*.32,span=1-delay,p=(hit.t-delay)/span;if(p<=0||p>=1)continue;const size=kw*(.08+fnRand(seed+4)*.2)*(1-p*.35),x=hit.center+(fnRand(seed+1)-.5)*kw*(.8+p*1.4)+Math.sin(p*5+i)*kw*.06,y=baseline-5-p*(reducedMotion?40:100+fnRand(seed+2)*95),alpha=life*(1-p*.35);ctx.globalAlpha=alpha*.58;ctx.fillStyle=hit.color;ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=alpha;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=Math.max(1,size*.13);ctx.beginPath();ctx.arc(x-size*.17,y-size*.17,size*.7,Math.PI*1.05,Math.PI*1.75);ctx.stroke();}
  ctx.restore();
}
function fnDrawRayBurst(ctx,hit,baseline,reducedMotion){
  // The ray glow is rendered in a fixed overlay on the key so it can sit above the keyboard.
}
function fnShowKeyRayEffect(midi,color,duration,intensity=1){
  const key=document.querySelector(`.piano-panel .key[data-midi="${midi}"]`),stage=$('noteCanvas');if(!key||!stage)return;
  const rect=key.getBoundingClientRect(),stageRect=stage.getBoundingClientRect(),panelRect=key.closest('.piano-panel').getBoundingClientRect(),flare=document.createElement('span'),lineY=panelRect.top,keyReveal=0;
  flare.className='key-ray-flare';flare.setAttribute('aria-hidden','true');flare.style.left=`${rect.left+rect.width/2}px`;flare.style.top=`${stageRect.top}px`;flare.style.width=`${Math.max(9,rect.width*.82)}px`;flare.style.height=`${Math.max(0,lineY-stageRect.top+keyReveal)}px`;flare.style.setProperty('--ray-color',color);flare.style.setProperty('--ray-duration',`${Math.max(.25,duration||.8)}s`);flare.style.setProperty('--ray-intensity',String(Math.min(1.2,Math.max(.5,intensity))));flare.style.setProperty('--key-reveal',`${keyReveal}px`);
  const orb=document.createElement('b');orb.className='key-ray-orb';flare.appendChild(orb);
  for(const side of ['left','right']){const particle=document.createElement('i');particle.className=`key-ray-particle is-${side}`;flare.appendChild(particle);}
  document.body.appendChild(flare);const timer=setTimeout(()=>flare.remove(),Math.max(250,(duration||.8)*1000+100));return()=>{clearTimeout(timer);flare.remove();};
}
// Medidor de rendimiento opcional: se activa con ?perf=1 en la URL o manteniendo pulsada la línea de tiempo 0,7 s.
const perfProbe={on:false,el:null,last:0,since:0,frames:0,slow:0,worst:0,drawSum:0,drawMax:0,tickSum:0,tickMax:0,tickN:0,longTasks:0,observer:null};
function perfProbeEnable(on){
  perfProbe.on=!!on;
  if(!perfProbe.on){if(perfProbe.el)perfProbe.el.remove();perfProbe.el=null;if(perfProbe.observer){try{perfProbe.observer.disconnect();}catch(_){}perfProbe.observer=null;}return;}
  if(!perfProbe.el){
    const el=document.createElement('pre');
    el.style.cssText='position:fixed;left:4px;bottom:4px;z-index:99999;margin:0;padding:5px 7px;border-radius:6px;background:rgba(0,0,0,.78);color:#7cfc9a;font:10px/1.35 ui-monospace,monospace;pointer-events:none;white-space:pre';
    el.textContent='medidor activo: toca ▶';document.body.appendChild(el);perfProbe.el=el;
  }
  perfProbe.since=0;perfProbe.last=0;
  try{if(window.PerformanceObserver&&!perfProbe.observer){perfProbe.observer=new PerformanceObserver(list=>{perfProbe.longTasks+=list.getEntries().length;});perfProbe.observer.observe({entryTypes:['longtask']});}}catch(_){}
}
function perfProbeFrame(ts){
  const p=perfProbe;
  if(p.last){const dt=ts-p.last;p.frames++;if(dt>24)p.slow++;if(dt>p.worst)p.worst=dt;}
  p.last=ts;
}
function perfProbeReport(now){
  const p=perfProbe;
  if(!p.since){p.since=now;return;}
  if(now-p.since<1000||!p.el)return;
  const secs=(now-p.since)/1000,frames=Math.max(1,p.frames),info=fallingNotesCanvasInfo,ctx=audioContext;
  p.el.textContent=[
    `${Math.round(p.frames/secs)} fps · frames lentos (>24ms): ${p.slow} · peor: ${p.worst.toFixed(0)}ms`,
    `dibujo: ${(p.drawSum/frames).toFixed(1)}ms medio · ${p.drawMax.toFixed(1)}ms máx`,
    `línea de tiempo+teclas: ${(p.tickSum/Math.max(1,p.tickN)).toFixed(1)}ms medio · ${p.tickMax.toFixed(1)}ms máx`,
    `tareas largas (>50ms): ${p.longTasks} · fuentes de audio activas: ${state.activePlaybackSources.length}`,
    `canvas ${info?Math.round(info.width*info.dpr)+'x'+Math.round(info.height*info.dpr):'-'} · dpr ${window.devicePixelRatio||1} · estilo ${fallingNotesStyle} · latencia salida ${ctx&&ctx.outputLatency?Math.round(ctx.outputLatency*1000)+'ms':'n/d'}`
  ].join('\n');
  p.since=now;p.frames=0;p.slow=0;p.worst=0;p.drawSum=0;p.drawMax=0;p.tickSum=0;p.tickMax=0;p.tickN=0;p.longTasks=0;
}
function drawFallingNotesFrameInner(timestamp){
  const run=fallingNotesRun,playbackActive=!!(state.playing&&run);
  if(document.hidden){fallingNotesFrame=0;return;}
  if($('player')?.classList.contains('mobile-piano-wide')){clearFallingNotesCanvas();fallingNotesFrame=0;return;}
  if(!playbackActive&&!fnHasFx()){stopFallingNotes();return;}
  if(!playbackActive&&!fnHitBursts.length&&!fnGp.n&&!fnGoldHolds.length&&timestamp-fnIdleLast<30){fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);return;}
  fnIdleLast=timestamp;
  fallingNotesLastFrame=timestamp;
  if(pinchFlush)pinchFlush();
  if(fallingNotesCanvasDirty&&!resizeFallingNotesCanvas()){if(playbackActive)fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);else fallingNotesFrame=0;return;}
  const info=fallingNotesCanvasInfo,scroll=$('keyboardScroll');
  if(!info||playbackActive&&!scroll){stopFallingNotes();return;}
  if(!fallingNotesGeometry)fallingNotesGeometry=rebuildFallingNotesGeometry();
  const geometry=fallingNotesGeometry;if(playbackActive&&!geometry){stopFallingNotes();return;}
  const ctx=info.context,height=info.height,width=info.width,baseline=height-2,look=playbackActive?fallingNotesLookahead:0,pps=height/fallingNotesLookahead,style=fallingNotesStyle;
  const calm=run?.calm??!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  let elapsed=playbackActive?(practiceRun?0:Math.max(0,playbackNow(timestamp)-run.startAt)):timestamp/1000;
  if(playbackActive&&practiceRun){
    const target=practiceRun.events[practiceRun.index]?.start;
    if(target!==undefined){
      // Practice is driven by the visual clock, not AudioContext.currentTime:
      // mobile browsers may suspend/jump the audio clock between manual taps.
      const visualNow=(typeof timestamp==='number'&&timestamp>0?timestamp:performance.now())/1000;
      elapsed=Math.max(0,visualNow-run.startAt);
      if(practiceRun.waiting){
        // Waiting is latched until the matching manual key press advances it.
        elapsed=target;run.startAt=visualNow-target;
      }else if(elapsed>=target){
        elapsed=target;run.startAt=visualNow-target;practiceRun.waiting=true;
      }
    }
  }
  const hits=fnHits;hits.length=0;
  const nowTs=(typeof timestamp==='number'&&timestamp>0)?timestamp:performance.now(),gdt=fnGoldLast?Math.min(.05,Math.max(0,(nowTs-fnGoldLast)/1000)):.016,gRate=fnGp.n>170?14:fnGp.n>110?24:40;
  ctx.clearRect(0,0,width,height);
  if(playbackActive){
  const scrollLeft=scroll.scrollLeft,zoomScale=state.keyboardZoom/geometry.zoom;
  const oldestStart=elapsed-run.maxVisibleDuration;let low=0,high=run.events.length;
  while(low<high){const mid=(low+high)>>1;if(run.events[mid].start<oldestStart)low=mid+1;else high=mid;}
  for(let index=low;index<run.events.length;index++){
    const event=run.events[index];if(event.start>elapsed+look)break;
    if(practiceRun&&event.start<(practiceRun.events[practiceRun.index]?.start??Infinity)-.001)continue;
    if(style==='melody'&&(event.kind==='chord'||event.kind==='accompaniment'))continue;
    const key=geometry.positions.get(event.midi);if(!key)continue;
    const keyWidth=key.width*zoomScale,center=geometry.left+key.center*zoomScale-scrollLeft;
    const desiredWidth=barStyle==='synesthesia'?keyWidth*1.12:keyWidth*.72,barWidth=Math.max(3,Math.min(keyWidth+18,desiredWidth)),barHeight=Math.max(7,event.visualDuration*pps);
    const age=elapsed-event.start,isChord=event.kind==='chord'||event.kind==='accompaniment';
    if((fxGlow||goldImpactGlow&&fxStyle==='gold')&&age>=0&&!event.moltenBurstStarted){
      event.moltenBurstStarted=true;
      if(center>-40&&center<width+40){const color=fnFallingEventColor(event,geometry);if(fxStyle==='notes')fnShowKeyRayEffect(event.midi,color,fxDuration,fxIntensityScale());else fnHitBursts.push({index,center,barWidth,keyWidth,color,midi:event.midi,at:event.start,clock:'song',fx:fxStyle,glowOnly:!fxGlow,duration:fxDuration,intensity:fxIntensityScale()});}
    }
    if(fxGlow&&noteParticlesEnabled&&fxStyle==='gold'&&!calm&&!practiceRun&&age>=0&&age<=event.visualDuration&&center>-40&&center<width+40){event.gpAcc=(event.gpAcc||0)+gRate*gdt*fxIntensityScale();const gn=event.gpAcc|0;if(gn>0){event.gpAcc-=gn;fnGoldEmit(center,keyWidth,gn);}}
    if(elapsed>event.start+event.visualDuration+(style==='drops'&&fxGlow ? .5 : 0))continue;
    if(style==='drops'){
      const dw=Math.max(5,Math.min(barWidth,16)),dh=dw*1.4,dBottom=Math.min(baseline,baseline-(event.start-elapsed)*pps);
      if(age>.05&&!practiceRun)continue;
      if(dBottom<0||center<-dw||center>width+dw)continue;
      ctx.fillStyle=fnFallingEventColor(event,geometry);ctx.globalAlpha=(isChord?.8:.95)*barOpacity/100;
       fnRoundRect(ctx,center-dw/2,dBottom-dh,dw,dh,dw/2);ctx.fill();drawFallingNoteTag(ctx,event.midi,center,baseline-9,width,height);
      continue;
    }
    const front=baseline-(event.start-elapsed)*pps,bottom=Math.min(front,baseline),top=front-barHeight,x=center-barWidth/2,h=bottom-top;
    if(h<=0||x+barWidth<0||x>width||top>height||bottom<0)continue;
    const chord=event.kind==='chord'||event.kind==='accompaniment',barColor=fnFallingEventColor(event,geometry);
    fnDrawFallingBar(ctx,x,top,barWidth,h,barColor,chord&&barBassDiff,baseline,event.track==='acompanamiento1'||event.track==='acompanamiento2');
     drawFallingNoteTag(ctx,event.midi,center,Math.min(bottom-7,baseline-9),width,height);
  }
  }
  for(let i=fnHitBursts.length-1;i>=0;i--){
    const burst=fnHitBursts[i],burstElapsed=burst.clock==='wall'?timestamp/1000-burst.at:elapsed-burst.at,t=burstElapsed/(burst.duration||FN_FX_SECONDS[burst.fx]||FN_BURST_SECONDS);
    if(t>=1){fnHitBursts.splice(i,1);continue;}
    if(t<0)continue;
    hits.push({...burst,t});
  }
  const burstLoad=hits.length;let goldLevel=0;
  for(const hit of hits){if(hit.fx==='gold'){goldLevel=Math.max(goldLevel,1-hit.t);fnDrawGoldSparkBurst(ctx,hit,baseline,calm,burstLoad);}else if(hit.fx==='smoke')fnDrawSmokeSparkBurst(ctx,hit,baseline,calm,burstLoad);else if(hit.fx==='rings')fnDrawRingBurst(ctx,hit,baseline,calm);else if(hit.fx==='bubbles')fnDrawBubbleBurst(ctx,hit,baseline,calm);else if(hit.fx==='notes')fnDrawRayBurst(ctx,hit,baseline,calm);}
  if(fxGlow&&noteParticlesEnabled&&fxStyle==='gold'){
    for(let i=fnGoldHolds.length-1;i>=0;i--){
      const hold=fnGoldHolds[i];if(!hold.active||nowTs-hold.since>20000){fnGoldHolds.splice(i,1);continue;}
      if(!calm){hold.acc+=gRate*gdt*fxIntensityScale();const gn=hold.acc|0;if(gn>0){hold.acc-=gn;fnGoldEmit(hold.center,hold.kw,gn);}}
    }
    if(!calm)fnGoldStep(ctx,gdt,baseline);
  }else if(fnGp.n||fnGoldHolds.length)fnGoldReset();
  if(neonEdge.on&&neonEdge.style==='flame')fnDrawFlameLine(ctx,width,baseline+2,timestamp,calm);
  fnGoldLast=nowTs;
  ctx.globalAlpha=1;
  if(playbackActive&&elapsed<=run.end+look||fnHasFx())fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
  else stopFallingNotes();
}
function drawFallingNotesFrame(timestamp){
  if(!perfProbe.on){drawFallingNotesFrameInner(timestamp);return;}
  const t0=performance.now();perfProbeFrame(timestamp);
  drawFallingNotesFrameInner(timestamp);
  const dt=performance.now()-t0;perfProbe.drawSum+=dt;if(dt>perfProbe.drawMax)perfProbe.drawMax=dt;
  perfProbeReport(t0);
}
function startFallingNotes(playbackNotes,playbackChords,startAt,prebuiltEvents){
  stopFallingNotes();perfProbe.last=0;
  const events=prebuiltEvents||makeFallingNotesEvents(playbackNotes,playbackChords);
  if(!events.length)return;
  ensureFallingNotesObservers();fallingNotesCanvasDirty=true;
  if(!resizeFallingNotesCanvas())return;
  const maxVisibleDuration=events.reduce((max,event)=>Math.max(max,event.visualDuration),0);
  const end=events.reduce((last,event)=>Math.max(last,event.start+event.visualDuration),0);
  fallingNotesRun={events,startAt,maxVisibleDuration,end,calm:!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)};
  resetPlaybackClock();fallingNotesGeometry=rebuildFallingNotesGeometry();fallingNotesLastFrame=0;
  if(fallingNotesFrame)cancelAnimationFrame(fallingNotesFrame);fallingNotesFrame=0;
  if(!document.hidden&&fallingNotesStyle!=='off')fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
}
function showSongIntro(autoPlay=false,playMode='listen'){
  const canvas=$('noteCanvas'),overlay=$('songIntroOverlay');if(!canvas||!overlay||!state.song)return;
  clearSongIntro();
  document.body.classList.remove('song-list-active');
  canvas.classList.remove('song-intro-active');
  void canvas.offsetWidth;
  canvas.classList.add('song-intro-active');
  songIntroAutoplay=!!autoPlay;
  let completed=false;
  const finish=event=>{
    if(event&&event.target!==overlay||completed)return;
    completed=true;canvas.classList.remove('song-intro-active');clearTimeout(songIntroTimer);songIntroTimer=null;
    overlay.removeEventListener('animationend',songIntroEndHandler);songIntroEndHandler=null;
    const shouldPlay=songIntroAutoplay;songIntroAutoplay=false;
    if(shouldPlay&&state.song&&state.notes.length&&!state.playing){if(playMode==='practice')startPracticeMelody();else playMelody();}
  };
  songIntroEndHandler=finish;overlay.addEventListener('animationend',finish);
  songIntroTimer=setTimeout(()=>finish(),2900);
  if(autoPlay&&state.notes.length)void prepareMelodyAudio(notesForCurrentMix()).catch(()=>{});
}
async function startPracticeMelody(){
  const notes=cutAtNextNote(state.notes);if(!notes.length){toast('Esta alabanza no tiene notas para practicar.');return;}
  stopPlayback();
  try{await prepareMelodyAudio(notes);}catch(error){console.error(error);toast('No se pudieron preparar los sonidos para practicar.');return;}
  const events=makeFallingNotesEvents(notes,[]).sort((a,b)=>a.start-b.start);if(!events.length)return;
  // Give the first falling bar time to travel from the top of the stage.
  events.forEach(event=>{event.start+=1.2;});
  const groups=[];events.forEach(event=>{let group=groups[groups.length-1];if(!group||Math.abs(group.start-event.start)>.035){group={start:event.start,events:[]};groups.push(group);}group.events.push(event);});
  state.playing=true;setStagePlaying(true);practiceRun={events:groups,index:0,waiting:false,remaining:null};
  startFallingNotes(notes,[],performance.now()/1000+.35,events);
  $('practiceGuide').classList.remove('hidden');updatePracticeGuide();
  $('status').textContent='Toca en el piano la nota que aparece en la guía. Puedes escucharla antes de intentarlo.';setPlayerControl('playMelody','⏹','Salir de práctica');
}
function updatePracticeGuide(message=''){
  if(!practiceRun)return;
  const group=practiceRun.events[practiceRun.index];if(!group)return;
  if(!(practiceRun.remaining instanceof Set))practiceRun.remaining=new Set(group.events.map(event=>Number(event.midi)).filter(Number.isFinite));
  const names=[...practiceRun.remaining].map(noteName);
  $('practiceStep').textContent=`PASO ${practiceRun.index+1} DE ${practiceRun.events.length}`;
  $('practiceTarget').textContent=names.join(' + ')||'Listo';
  $('practiceHint').textContent=message|| (names.length>1?'Toca todas las notas indicadas.':'Toca esta nota en el piano.');
}
async function hearPracticeNote(){
  if(!practiceRun)return;
  const pending=[...practiceRun.remaining];if(!pending.length)return;
  try{await Promise.all(pending.map(midi=>previewInstrumentNote(state.instrument,midi)));}
  catch(error){console.error(error);}
}
function advancePracticeNote(){
  if(!practiceRun)return;
  const current=practiceRun.events[practiceRun.index];
  if(current&&fallingNotesRun)fallingNotesRun.startAt=performance.now()/1000-current.start;
  practiceRun.index++;practiceRun.remaining=null;practiceRun.waiting=false;
  if(practiceRun.index>=practiceRun.events.length){stopPlayback();$('status').textContent='¡Práctica completada!';toast('¡Muy bien! Completaste la melodía.');return;}
  updatePracticeGuide();$('status').textContent=`Práctica: paso ${practiceRun.index+1} de ${practiceRun.events.length}.`;
}
function handlePracticeInput(midi){
  const practice=practiceRun;
  const playedMidi=Number(midi);
  if(!practice||!Number.isFinite(playedMidi))return;

  const group=practice.events[practice.index];
  if(!group)return;

  // Build the pending pitches once per group. Simultaneous notes must all be
  // played, but repeated copies of the same pitch only need one key press.
  if(!(practice.remaining instanceof Set)){
    practice.remaining=new Set(group.events.map(event=>Number(event.midi)).filter(Number.isFinite));
  }

  if(!practice.remaining.has(playedMidi)){
    const expected=[...practice.remaining].map(noteName).join(' y ');
    const message=expected?`Esa fue ${noteName(playedMidi)}. Intenta ${expected}.`:'No se pudo identificar la nota pendiente.';
    updatePracticeGuide(message);$('status').textContent=message;
    return;
  }

  // Latch the current bar at the keyboard as soon as its correct key is touched.
  const run=fallingNotesRun;
  if(run&&Number.isFinite(group.start))run.startAt=performance.now()/1000-group.start;
  practice.waiting=true;
  practice.remaining.delete(playedMidi);
  if(practice.remaining.size){
    updatePracticeGuide(`Bien. Falta ${[...practice.remaining].map(noteName).join(' y ')}.`);
    return;
  }
  advancePracticeNote();
}
function clearSongIntro(){
  if(songIntroStartTimer){clearTimeout(songIntroStartTimer);songIntroStartTimer=null;}
  if(songIntroTimer){clearTimeout(songIntroTimer);songIntroTimer=null;}
  if(songIntroEndHandler){$('songIntroOverlay')?.removeEventListener('animationend',songIntroEndHandler);songIntroEndHandler=null;}
  songIntroAutoplay=false;
  $('noteCanvas')?.classList.remove('song-intro-active');
}
function startKeyboardAtC4() {
  state.keyboardOctaveMidi = 60;
  $('keyboardOctaveLabel').textContent = 'C4';
  requestAnimationFrame(() => {
    const scroll = $('keyboardScroll');
    const c4 = document.querySelector('.key.white[data-midi="60"]');
    if (!scroll || !c4) return;
    const left = c4.getBoundingClientRect().left - scroll.getBoundingClientRect().left + scroll.scrollLeft;
    scroll.scrollTo({ left: Math.max(0, Math.min(scroll.scrollWidth-scroll.clientWidth,left-(scroll.clientWidth-c4.offsetWidth)/2)), behavior: 'instant' });syncStageScroll();
  });
}function updateAdminControls() {
  document.querySelector('[data-view="crear"]')?.classList.toggle('hidden',!state.admin);
  const usesLegacyChordEditor=['introduccion','voz'].includes(state.melodyType);
  if(!state.admin||!state.song)chordEditorOpen=false;
  document.querySelectorAll('.admin-only:not(#chordEditor)').forEach(button => button.classList.toggle('hidden', !state.admin||!state.song));
  $('chordsViewToggle').classList.toggle('hidden',!state.song||!usesLegacyChordEditor);
  $('chordEditorPanel').classList.toggle('hidden',!state.admin||!state.song||!chordEditorOpen);
  $('chordEditor').classList.toggle('hidden',!state.admin||!state.song);
  $('deleteBtn').classList.toggle('hidden',!state.admin||!state.song||!hasTrack(state.song.category,state.song.song.id,state.melodyType));
  $('recordBtn').classList.toggle('active',state.recording);
  $('playMelody').classList.toggle('hidden',!state.song||!state.notes.length);
  $('showNotesBtn').classList.toggle('hidden',!state.song||!state.notes.length||!state.admin);
  $('voiceMixer').classList.toggle('hidden',!state.song||!state.admin);
  updateVisualOptions();
  $('adminBtn').textContent = state.admin ? '🔓 Admin activo' : '🔑 Admin';
  const adminTile=$('homeAdminTile');if(adminTile){const adminIcon=adminTile.querySelector('.home-action-icon img');if(adminIcon)adminIcon.src=`assets/home-icons/${state.admin?'admin-unlocked':'admin'}.svg`;adminTile.querySelector('[data-admin-label]').textContent=state.admin?'Admin activo':'Admin';}
  $('adminBtn').classList.toggle('active', state.admin);
  syncTrackKeyUI();
}
function updateVisualOptions(){
  $('activeChordLabel').classList.toggle('hidden',!state.showChordNames||!$('activeChordLabel').textContent);
  $('notesPanel').classList.toggle('hidden',!state.admin||!$('notesPanel').dataset.open);
  $('showNotesBtn').classList.toggle('is-on',!!state.admin&&!!$('notesPanel').dataset.open);
  $('keyColorSwatch').style.background=state.keyColor;
  document.documentElement.style.setProperty('--pressed-key-color',state.keyColor);
  document.documentElement.style.setProperty('--melody-note-color',state.keyColor);
  document.documentElement.style.setProperty('--bass-note-color',state.bassColor);
  $('player')?.style.setProperty('--bass-note-color',state.bassColor);
  const bassPicker=$('bassColorPicker');if(bassPicker)bassPicker.value=state.bassColor;
  const color=state.keyColor.match(/^#([0-9a-f]{6})$/i);
  const channels=color?color[1].match(/.{2}/g).map(value=>parseInt(value,16)/255):[0.565,0.867,0.29];
  const luminance=channels.map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[0.2126,0.7152,0.0722][index],0);
  document.documentElement.style.setProperty('--melody-note-ink',luminance>0.42?'#17323b':'#ffffff');
  $('showBarNotes').checked=state.showBarNotes;$('showOctaveNotes').checked=state.showOctaveNotes;
  $('notationToggle').textContent={ninguno:'∅',octavas:'8va',americano:'C',latino:'La',movil:'Do',grados:'1',simple:'C'}[state.notation]||'C';
}
function fxNoteColor(midi){const color=barColorMode==='note'?BAR_NOTE_PALETTE[((midi%12)+12)%12]:barBassDiff&&midi<=48?state.bassColor:state.keyColor;return fnIsBlackKeyMidi(midi)?fnDarkenBarColor(color):color;}
function showManualNoteEffect(midi,key){
  if(fallingNotesStyle==='off'||!key)return;
  if(!key.closest('.piano-panel'))key=document.querySelector(`.piano-panel .key[data-midi="${midi}"]`);
  if(!key)return;
  const stage=$('noteCanvas'),stageRect=stage?.getBoundingClientRect(),keyRect=key.getBoundingClientRect();if(!stageRect||!keyRect)return;
  const effect=document.createElement('span');effect.className=`manual-note-effect ${fallingNotesStyle==='drops'?'is-drop':'is-bar'}${barLook==='duo'?' is-duo':barLook==='tri'?' is-tri':''}${barStyle==='neon'?' is-neon':barStyle==='synesthesia'?' is-synesthesia':''}${barStyle==='solid'?' is-solid':''}`;
  if(state.showBarNotes){const label=document.createElement('span');label.className='manual-note-label';label.textContent=fallingNoteName(midi);effect.appendChild(label);}
  const isDrop=fallingNotesStyle==='drops';
  const barWidth=Math.max(4,Math.min(keyRect.width+18,keyRect.width*(barStyle==='synesthesia'?1.12:.78))),effectWidth=isDrop?Math.max(5,Math.min(barWidth,16)):barWidth;
  effect.style.width=`${effectWidth}px`;
  effect.style.opacity=String(barOpacity/100);
  if(isDrop)effect.style.height=`${effectWidth*1.4}px`;
  effect.style.setProperty('--note-fx-color',fxNoteColor(midi));
  if(barLook!=='normal'){effect.style.setProperty('--note-fx-color2',barColor2);effect.style.setProperty('--note-fx-color3',barColor3);}
  effect.style.left=`${keyRect.left-stageRect.left+keyRect.width/2}px`;
  stage.appendChild(effect);
  let gHold=null,rayEffectCleanup=null;
  if(fxGlow||goldImpactGlow&&fxStyle==='gold'){
    ensureFallingNotesObservers();
    const canvasReady=fallingNotesCanvasInfo&&!fallingNotesCanvasDirty||resizeFallingNotesCanvas();
    if(canvasReady){
      const center=keyRect.left-stageRect.left+keyRect.width/2,at=performance.now()/1000,index=++fnManualHitIndex;
      const color=fxNoteColor(midi);if(fxStyle==='notes')rayEffectCleanup=fnShowKeyRayEffect(midi,color,fxDuration,fxIntensityScale());else fnHitBursts.push({index,center,barWidth,keyWidth:keyRect.width,color,midi,at,clock:'wall',fx:fxStyle,glowOnly:!fxGlow,duration:fxDuration,intensity:fxIntensityScale()});
      if(fxGlow&&noteParticlesEnabled&&fxStyle==='gold'){gHold={center,kw:keyRect.width,active:true,acc:0,since:performance.now()};fnGoldHolds.push(gHold);}
      if(fxStyle!=='notes'&&!fallingNotesFrame)fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
    }
  }
  const toolbarHeight=stage.querySelector('.canvas-readouts')?.getBoundingClientRect().height||40;
  const started=performance.now(),maxRise=Math.max(60,stage.clientHeight+toolbarHeight+12-(isDrop?20:8)),minimumTapRise=Math.min(maxRise,Math.max(20,stage.clientHeight*.05)),exitDistance=stage.clientHeight+toolbarHeight+12,speed=stage.clientHeight/Math.max(.8,fallingNotesLookahead);let frame=0,releasedAt=null,heldRise=0;
  const grow=now=>{
    if(releasedAt===null){
      const rise=Math.min(maxRise,Math.max(minimumTapRise,(now-started)/1000*speed));
      effect.style.setProperty('--manual-rise',`${rise}px`);effect.style.setProperty('--manual-offset','0px');effect.style.opacity=String(barOpacity/100);
      if(rise<maxRise)frame=requestAnimationFrame(grow);else frame=0;
      return;
    }
    const offset=Math.max(0,(now-releasedAt)/1000*speed),fadeProgress=Math.max(0,Math.min(1,(offset-stage.clientHeight)/Math.max(1,exitDistance-stage.clientHeight)));
    effect.style.setProperty('--manual-rise',`${heldRise}px`);effect.style.setProperty('--manual-offset',`${offset}px`);effect.style.opacity=String(barOpacity/100*(1-fadeProgress));
    if(offset<exitDistance)frame=requestAnimationFrame(grow);else{frame=0;effect.remove();}
  };
  frame=requestAnimationFrame(grow);
  const finish=()=>{if(releasedAt!==null)return;releasedAt=performance.now();rayEffectCleanup?.();rayEffectCleanup=null;if(gHold)gHold.active=false;heldRise=Math.min(maxRise,Math.max(minimumTapRise,(releasedAt-started)/1000*speed));effect.classList.add('is-released');if(!frame)frame=requestAnimationFrame(grow);};
  return finish;
}
function chordDisplayName(chord) {
  const shownRoot=transposeChordName(String(chord.root||'C'),Number(state.transpose)||0,false);
  const root = state.notation === 'latino' ? (NOTE_ROOT_LATINO[shownRoot?.[0]] || shownRoot) + (shownRoot?.slice(1) || '') : shownRoot;
  if(chord.arpeggio)return `${root} 1–5–8`;
  const quality = { major:'', minor:'m', '7':'7', maj7:'maj7', m7:'m7', mMaj7:'mMaj7', '6':'6', add9:'add9', '5':'5', sus2:'sus2', sus4:'sus4', dim:'dim', dim7:'dim7', m7b5:'m7♭5', aug:'aum' }[chord.quality] || '';
  return `${root}${quality}`;
}
function renderRecorded() {
  const legacyChordEditing=['introduccion','voz'].includes(state.melodyType);
  const voiceParts=state.melodyType==='voz'?generatedVoiceParts():null;
  $('recordedNotes').innerHTML = state.notes.map((note, index) => {
      if(note.octave&&!state.showOctaveNotes)return '';
    const chord = state.chords.find(item => Number(item.noteIndex) === index);
    const label = legacyChordEditing?(chord ? `<span class="note-chord-label">${escapeHTML(chordDisplayName(chord))}</span>` : '<span class="note-chord-label empty" aria-hidden="true"></span>'):'';
    const suggested=voiceParts?`<span class="suggested-voice-notes">2ª ${voiceParts.segunda[index]?noteName(voiceParts.segunda[index].midi):'—'} · 3ª ${voiceParts.tercera[index]?noteName(voiceParts.tercera[index].midi):'—'}</span>`:'';
    const item=`<div class="melody-note-item${legacyChordEditing&&state.chordTarget === index ? ' selected' : ''}" ${legacyChordEditing?`data-note-index="${index}"`:''}>${label}${suggested}<button class="note-chip" type="button" ${legacyChordEditing?`data-note-index="${index}"`:''} title="${voiceParts?`Principal ${noteName(note.midi)}; segunda ${noteName(voiceParts.segunda[index]?.midi??note.midi)}; tercera ${noteName(voiceParts.tercera[index]?.midi??note.midi)}`:''}" ${state.admin&&legacyChordEditing ? '' : 'disabled'}>${escapeHTML(noteName(note.midi))}</button></div>`;
    const gapTarget=index+0.5,gapChord=state.chords.find(item=>Number(item.noteIndex)===gapTarget);
    const gap=legacyChordEditing&&index<state.notes.length-1?`<button type="button" class="chord-gap-target${state.chordTarget===gapTarget?' selected':''}" data-chord-target="${gapTarget}" ${state.admin?'':'disabled'} aria-label="Colocar acorde entre las notas ${index+1} y ${index+2}">${gapChord?`<span>${escapeHTML(chordDisplayName(gapChord))}</span>`:'+'}</button>`:'';
    return item+gap;
  }).join('');
}
function renderVoiceMixer(){
  if(!$('voiceMixer'))return;
  [['principal','voiceMain'],['segunda','voiceSecond'],['tercera','voiceThird'],['acordes','voiceChords']].forEach(([name,id])=>{if($(id))$(id).checked=!!state.voiceMix[name];});
  if($('secondVoiceDirection'))$('secondVoiceDirection').value=state.voiceDirection.segunda;
  if($('thirdVoiceDirection'))$('thirdVoiceDirection').value=state.voiceDirection.tercera;
}
function generatedVoiceParts(){
  // Voces diatónicas: segunda = tercera y tercera = quinta, arriba o abajo según el selector.
  // Se cuentan posiciones de la escala y no semitonos; los acordes no alteran estas armonías.
  const minor=state.originalTonic.endsWith('m');
  const tonicIndex=NOTE_NAMES.indexOf(state.originalTonic.replace(/m$/,''));
  const tonicPc=((Math.max(0,tonicIndex)+(Number(state.transpose)||0))%12+12)%12;
  const scalePcs=(minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map(interval=>(tonicPc+interval)%12);
  const scaleMidis=[];
  for(let midi=12;midi<=108;midi++)if(scalePcs.includes(midi%12))scaleMidis.push(midi);
  const voiceAt=(lead,steps,direction)=>{
    // Nota de la escala más cercana a la melodía (si está entre dos, la de abajo).
    let index=0,best=Infinity;
    scaleMidis.forEach((midi,i)=>{const distance=Math.abs(midi-lead);if(distance<best){best=distance;index=i;}});
    let midi=scaleMidis[Math.max(0,Math.min(scaleMidis.length-1,index+(direction==='up'?steps:-steps)))];
    while(midi<36)midi+=12;
    return midi;
  };
  const second=[],third=[];
  state.notes.forEach(note=>{
    const lead=Number(note.midi);
    second.push({...note,midi:voiceAt(lead,2,state.voiceDirection.segunda)});
    third.push({...note,midi:voiceAt(lead,4,state.voiceDirection.tercera)});
  });
  return {segunda:second,tercera:third};
}
// Igual que en el Bajo: cuando aparece otra nota de la misma voz, la anterior se quita.
function cutAtNextNote(list){
  const sorted=list.map(note=>({...note})).sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0));
  sorted.forEach((note,index)=>{
    const start=Number(note.start)||0;
    const next=sorted.slice(index+1).find(item=>(Number(item.start)||0)>start+.035);
    const belongsToChord=sorted.some((item,otherIndex)=>otherIndex!==index&&Math.abs((Number(item.start)||0)-start)<=.035);
    // Older saves gave simultaneous notes the 0.12s minimum because the next
    // array item belonged to the same chord. Recover the shared held duration.
    if(belongsToChord&&(Number(note.duration)||0)<=.121){
      note.duration=next?Math.max(.12,(Number(next.start)||0)-start):Math.max(.35,Number(note.duration)||.35);
    }
    if(next)note.cutAt=Math.max(.06,(Number(next.start)||0)-start-.04);
  });
  return sorted;
}
function notesForTrackPlayback(list,trackType=state.melodyType){
  const sorted=list.map(note=>({...note})).sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0));
  if(['acompanamiento1','acompanamiento2'].includes(trackType))return sorted.map(note=>({...note,cutAt:undefined}));
  return cutAtNextNote(sorted);
}
function noteHoldSeconds(note){
  // Trompeta: solo el toque, sin alargar con sustain. Los demás respetan el sustain.
  const pedalOn=state.sustain&&!isTrumpetInstrument(state.instrument);
  const base=(Number(note.duration)||.32)*(isTrumpetInstrument(state.instrument)?1:(state.sustain?1.6:1));
  const limit=Number(note.cutAt);
  return Number.isFinite(limit)&&!pedalOn?Math.max(.06,Math.min(base,limit)):base;
}
function noteWasCut(note){
  const limit=Number(note.cutAt);
  return !(state.sustain&&!isTrumpetInstrument(state.instrument))&&Number.isFinite(limit)&&limit<(Number(note.duration)||.32)*(isTrumpetInstrument(state.instrument)?1:(state.sustain?1.6:1));
}
function notesForCurrentMix(){
  const parts=generatedVoiceParts(),selected=[];
  if(state.voiceMix.principal)selected.push(...notesForTrackPlayback(state.notes,state.melodyType));
  if(state.voiceMix.segunda)selected.push(...cutAtNextNote(parts.segunda.filter(Boolean)));
  if(state.voiceMix.tercera)selected.push(...cutAtNextNote(parts.tercera.filter(Boolean)));
  return selected.sort((a,b)=>Number(a.start)-Number(b.start));
}
function chordSpanForPlayback(chord){
  const start=chordStartTime(chord);
  if(start===null||state.melodyType!=='voz')return Number(chord.duration)||2;
  const next=state.chords.filter(item=>chordStartTime(item)>start).sort((a,b)=>chordStartTime(a)-chordStartTime(b))[0];
  const nextStart=next&&chordStartTime(next);
  return nextStart!==null&&nextStart!==undefined?Math.max(.25,nextStart-start):Number(chord.duration)||2;
}
function chordStartTime(chord){
  if(Number.isFinite(Number(chord.start)))return Math.max(0,Number(chord.start));
  const index=Number(chord.noteIndex);if(!Number.isFinite(index)||!state.notes.length)return null;
  const left=Math.floor(index),right=Math.ceil(index),a=state.notes[left],b=state.notes[right];
  if(!a)return null;if(left===right||!b)return Math.max(0,Number(a.start)||0);
  const fraction=index-left;return Math.max(0,(Number(a.start)||0)+((Number(b.start)||0)-(Number(a.start)||0))*fraction);
}
function chooseChordTarget(index) {
  if (!state.admin) return;
  state.chordTarget = index;
  const note = state.notes[Math.floor(index)];
  const chord = state.chords.find(item => Number(item.noteIndex) === index);
  $('chordTarget').textContent = note ? (Number.isInteger(index)?`Este acorde empieza en ${noteName(note.midi)} · nota ${index + 1}`:`Este acorde empieza entre las notas ${Math.floor(index)+1} y ${Math.ceil(index)+1}.`) : 'Selecciona la primera nota del tramo.';
  $('chordRoot').value = chord?.root || NOTE_NAMES[note?.midi % 12] || 'C';
  $('chordQuality').value = chord?.quality || 'major';
  $('chordInversion').value = String(chord?.inversion || 0);
  { const octaveValue = String(chord?.octave ?? 36); if (![...$('chordOctave').options].some(option => option.value === octaveValue)) $('chordOctave').add(new Option('C' + (Number(octaveValue) / 12 - 1), octaveValue)); $('chordOctave').value = octaveValue; }
  $('bassInstrument').value = chord?.instrument || state.bassInstrument;
  $('chordArpeggio').checked = !!chord?.arpeggio;
  syncChordEditorMode();
  $('chordDuration').value = String(chord?.duration || 2);
  $('chordPreset').value=chord?chordSymbol(chord):'';
  $('removeChordBtn').classList.toggle('hidden', !chord);
  document.querySelectorAll('.melody-note-item').forEach((item, i) => item.classList.toggle('selected', i === index));
  document.querySelectorAll('.chord-gap-target').forEach(item=>item.classList.toggle('selected',Number(item.dataset.chordTarget)===index));
}
function saveSelectedChord() {
  if (!state.admin || state.chordTarget === null || !state.notes[Math.floor(state.chordTarget)]) { toast('Primero elige una nota o un espacio entre notas.'); return; }
  const chord = { noteIndex: state.chordTarget, start: chordStartTime({noteIndex:state.chordTarget}), root: $('chordRoot').value, quality: $('chordQuality').value, inversion: Number($('chordInversion').value), octave: Number($('chordOctave').value), duration: Number($('chordDuration').value), arpeggio:$('chordArpeggio').checked, instrument:$('bassInstrument').value };
  const existing = state.chords.findIndex(item => Number(item.noteIndex) === state.chordTarget);
  if (existing >= 0) state.chords[existing] = chord; else state.chords.push(chord);
  state.melodyDirty=true;
  updateTrackTimeline();
  renderRecorded(); chooseChordTarget(chord.noteIndex);
  $('status').textContent = `Acorde ${chordDisplayName(chord)} asignado ${Number.isInteger(chord.noteIndex)?`a ${noteName(state.notes[chord.noteIndex].midi)}`:'entre dos notas'}. Pulsa “Guardar melodía” para subir todos los cambios a Firebase.`;
}
function chordSymbol(chord){const suffix={major:'',minor:'m','7':'7',maj7:'maj7',m7:'m7',mMaj7:'mMaj7','6':'6',add9:'add9','5':'5',dim:'dim',dim7:'dim7',m7b5:'m7b5',aug:'aug',sus2:'sus2',sus4:'sus4'}[chord.quality]||'';return `${chord.root||''}${suffix}`;}
function applyChordPreset(symbol){
  const chord=parsePianoChord(symbol);if(!chord)return;
  $('chordRoot').value=chord.root;$('chordQuality').value=chord.quality;
}
function syncChordEditorMode(){
  const arpeggio=$('chordArpeggio')?.checked||false;
  $('chordQuality').disabled=arpeggio;$('chordInversion').disabled=arpeggio;
}
function removeSelectedChord() {
  if (state.chordTarget === null) return;
  state.chords = state.chords.filter(item => Number(item.noteIndex) !== state.chordTarget);
  state.melodyDirty=true;
  updateTrackTimeline();
  renderRecorded(); chooseChordTarget(state.chordTarget);
  $('status').textContent = 'Acorde quitado de la melodía. Pulsa “Guardar melodía” para subir los cambios a Firebase.';
}
function chordMidiNotes(chord) {
  const shapes = { major:[0,4,7], minor:[0,3,7], '7':[0,4,7,10], maj7:[0,4,7,11], m7:[0,3,7,10], mMaj7:[0,3,7,11], '6':[0,4,7,9], add9:[0,4,7,14], '5':[0,7], dim7:[0,3,6,9], m7b5:[0,3,6,10], sus2:[0,2,7], sus4:[0,5,7], dim:[0,3,6], aug:[0,4,8] };
  const rootMidi = Number(chord.octave || 36) + NOTE_NAMES.indexOf(chord.root) + (chord.noTranspose ? 0 : state.transpose);
  if(chord.arpeggio)return [rootMidi,rootMidi+7,rootMidi+12];
  const pitches = (Array.isArray(chord.intervals) ? chord.intervals : shapes[chord.quality] || shapes.major).map(interval => rootMidi + interval);
  for (let i=0; i<Number(chord.inversion || 0); i++) pitches.push(pitches.shift() + 12);
  return pitches;
}

const CHROMATIC_SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_TO_SHARP = { Db:'C#', Eb:'D#', Gb:'F#', Ab:'G#', Bb:'A#' };
const SHARP_TO_FLAT = { 'C#':'Db', 'D#':'Eb', 'F#':'Gb', 'G#':'Ab', 'A#':'Bb' };
const CHROMATIC_FLATS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const LATIN_TO_LETTER = { do:'C', re:'D', mi:'E', fa:'F', sol:'G', la:'A', si:'B' };
const LETTER_PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
// Entiende: A, Am, A menor, Bb, F#m, La, Sol, Do#, Mib, Sim, La menor, Amaj7 (mayor)…
// Devuelve null si el texto no trae un tono reconocible.
function parseTonic(value) {
  const text = String(value || '').trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  const m = text.match(/^(do|re|mi|fa|sol|la|si|[a-g])\s*([#b]?)(.*)$/i);
  if (!m) return null;
  const word = m[1].toLowerCase();
  const letter = LATIN_TO_LETTER[word] || word.toUpperCase();
  if (!(letter in LETTER_PC)) return null;
  const pc = (LETTER_PC[letter] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const minor = /^\s*(m(?!aj)|[Mm]in|[Mm]enor)/.test(m[3]);
  return CHROMATIC_SHARPS[pc] + (minor ? 'm' : '');
}
function tonicPc(tonic) { return CHROMATIC_SHARPS.indexOf(String(tonic || '').replace(/m$/, '')); }
// Diferencia entre el tono de la pista y el tono escrito en la canción (para letra y acordes).
function lyricsBaseShift() {
  if (!state.songTonic) return 0;
  const track = tonicPc(state.originalTonic), written = tonicPc(state.songTonic);
  return track < 0 || written < 0 ? 0 : ((track - written) % 12 + 12) % 12;
}
function displayShift() { return lyricsBaseShift() + (Number(state.transpose) || 0); }
function syncTrackKeyUI() {
  if (!$('trackRoot') || !$('trackMode')) return;
  $('trackRoot').value = state.originalTonic.replace(/m$/, '');
  $('trackMode').value = state.originalTonic.endsWith('m') ? 'minor' : 'major';
  const locked = !state.admin || !state.song;
  $('trackRoot').disabled = locked; $('trackMode').disabled = locked;
}
function changeTrackTonic() {
  if (!state.admin || !state.song) { syncTrackKeyUI(); return; }
  if (state.transpose) {
    // El tono de la pista se elige con el transporte en "Tono original": primero se restaura.
    transposeMelody(-state.transpose);
    if (state.transpose) { syncTrackKeyUI(); return; }
  }
  state.originalTonic = $('trackRoot').value + ($('trackMode').value === 'minor' ? 'm' : '');
  state.melodyDirty = true;
  renderChordPresets(); updateTransposeUI(); renderRecorded();
  $('status').textContent = 'Tono de la pista cambiado. Pulsa “Guardar melodía” para guardarlo en Firebase.';
  toast('Tono de la pista: ' + $('trackRoot').selectedOptions[0].textContent.split(' · ')[0] + ($('trackMode').value === 'minor' ? ' menor' : ' mayor'));
}
function renderChordPresets() {
  if (!state.song || !$('chordPreset')) return;
  const flat = /b/.test(String(state.song.song.tono || '')), shift = lyricsBaseShift();
  const presets = chordNames(state.song.song).map(chord => transposeChordName(chord, shift, flat));
  $('chordPreset').innerHTML = '<option value="">Elegir acorde escrito en la canción…</option>' + presets.map(chord => `<option value="${escapeHTML(chord)}">${escapeHTML(chord)}</option>`).join('');
}
// Al guardar, el transporte queda "cocinado" en los acordes para que coincidan con las notas guardadas.
function bakeChordTranspose(chord, semitones) {
  const index = NOTE_NAMES.indexOf(chord.root), octave = Number(chord.octave) || 36;
  if (index < 0 || !semitones) return { root: String(chord.root), octave };
  const total = index + semitones;
  return { root: NOTE_NAMES[((total % 12) + 12) % 12], octave: octave + 12 * Math.floor(total / 12) };
}
function transposedTonic() {
  const minor = state.originalTonic.endsWith('m');
  const root = state.originalTonic.replace(/m$/, '');
  const index = CHROMATIC_SHARPS.indexOf(root);
  return CHROMATIC_SHARPS[(index + state.transpose + 120) % 12] + (minor ? 'm' : '');
}
function updateTransposeUI() {
  if (!state.song) { $('activeKeyName').disabled=true; return; }
  $('activeKeyName').disabled=false;
  const tonic = transposedTonic();
  $('activeKeyName').textContent=`Tono ${tonic}`;
  $('transposeTargetKey').value=tonic.replace(/m$/,'');
  const displayRoot = SHARP_TO_FLAT[tonic.replace(/m$/, '')] || tonic.replace(/m$/, '');
  const shown = displayRoot + (tonic.endsWith('m') ? 'm' : '');
  $('songKey').textContent = `Tono: ${shown}`;
  const flatSpelling = /b/.test(String(state.song.song.tono || ''));
  $('chordList').innerHTML = chordNames(state.song.song).map(chord => `<span class="chord">${escapeHTML(transposeChordName(chord, displayShift(), flatSpelling))}</span>`).join('') || '<span class="hint">No se detectaron acordes</span>';
  syncTrackKeyUI();
  renderSongLyrics();
}
function transposeChordName(chord, semitones, preferFlats) {
  if (!semitones) return chord;
  const match = String(chord).match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/);
  if (!match) return chord;
  const shiftRoot = root => {
    const index = CHROMATIC_SHARPS.indexOf(FLAT_TO_SHARP[root] || root);
    if (index < 0) return root;
    const shifted = (index + semitones % 12 + 12) % 12;
    return (preferFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS)[shifted];
  };
  return shiftRoot(match[1]) + match[2] + (match[3] ? `/${shiftRoot(match[3])}` : '');
}
function transposeMelody(delta) {
  if (!state.song) return;
  const nextShift = state.transpose + delta;
  if (state.notes.some(note => Number(note.midi) + delta < 21 || Number(note.midi) + delta > 108)) {
    toast('No se puede transportar más: una nota saldría del rango del teclado.'); return;
  }
  state.transpose = nextShift;
  state.notes = state.notes.map(note => ({ ...note, midi: Math.max(21, Math.min(108, Number(note.midi) + delta)) }));
  state.melodyDirty=true;
  state.notes.forEach(note => note.note = canonicalNoteName(note.midi));
  updateTransposeUI(); renderRecorded();
  toast(state.transpose ? `Pista transportada ${state.transpose > 0 ? '+' : ''}${state.transpose} semitonos.` : 'Tono original restaurado.');
}
function transposeMelodyToKey(targetRoot) {
  if (!state.song) return;
  const targetIndex=CHROMATIC_SHARPS.indexOf(targetRoot), currentIndex=tonicPc(transposedTonic());
  if(targetIndex<0||currentIndex<0)return;
  const delta=((targetIndex-currentIndex+18)%12)-6;
  if(delta)transposeMelody(delta);
  closePlayerPopovers();
}function jumpToMelodyNotes() {
  toggleNotesPanel();
}

function renderKeyboard() {
  const low = 21, high = 108;
  const scroll = $('keyboardScroll');
  const oldScrollLeft = scroll?.scrollLeft || 0;
  let html = '';
  for (let midi = low; midi <= high; midi++) {
    if (NOTE_NAMES[midi % 12].includes('#')) continue;
    const hasBlack = midi % 12 !== 4 && midi % 12 !== 11;
    const whiteName = keyboardLabel(midi);
    const blackName = keyboardLabel(midi + 1);
    const whiteAria = noteName(midi);
    const blackAria = noteName(midi + 1);
    const octaveClass = midi % 12 === 0 ? ' octave-marker' : '';
    html += `<div class="keys"><button class="key white" data-midi="${midi}" aria-label="${whiteAria}"><span class="note-label${octaveClass}${whiteName?'':' label-empty'}">${whiteName}</span></button>${hasBlack&&midi+1<=high ? `<button class="key black" data-midi="${midi + 1}" aria-label="${blackAria}"><span class="note-label${blackName?'':' label-empty'}">${blackName}</span></button>` : ''}</div>`;
  }
  $('keyboard').innerHTML = html;
  fallingNotesGeometry = null;keyBaseWidthCache = 0;stageLastKeyWidth = -1;
  if (scroll) scroll.scrollLeft = oldScrollLeft;
  const keys = $('keyboard');
  keys.onselectstart = event => event.preventDefault();
  keys.ondragstart = event => event.preventDefault();
  const playAtPoint = (pointerId, x, y) => {
    if(state.playbackPreparing)return;
    const element = document.elementFromPoint(x, y)?.closest('.key');
    if (!element || !keys.contains(element) || state.activePointers.get(pointerId)?.element === element) return;
    const previous = state.activePointers.get(pointerId);
    if (previous) { previous.element.classList.remove('playing');previous.releasedAt=performance.now();previous.stopNote?.(previous.releasedAt); }
    const active = { element, stopNote:null, releasedAt:null };
    state.activePointers.set(pointerId, active);
    updateActiveChordLabel();
    playNote(Number(element.dataset.midi), element, Infinity).then(stopNote => {
      if (state.activePointers.get(pointerId) === active) active.stopNote = stopNote;
      else stopNote?.(active.releasedAt);
    });
  };
  keys.onpointerdown = event => {
    const element = event.target.closest('.key');
    if (!element) return;
    event.preventDefault();
    keys.setPointerCapture?.(event.pointerId);
    playAtPoint(event.pointerId, event.clientX, event.clientY);
  };
  keys.onpointermove = event => { if (state.activePointers.has(event.pointerId)) { event.preventDefault(); playAtPoint(event.pointerId, event.clientX, event.clientY); } };
  const endTouch = event => {
    const active = state.activePointers.get(event.pointerId);
    if (!active) return;
    active.element.classList.remove('playing');
    active.releasedAt=performance.now();active.stopNote?.(active.releasedAt);
    state.activePointers.delete(event.pointerId);
    updateActiveChordLabel();
  };
  keys.onpointerup = endTouch;
  keys.onpointercancel = endTouch;
  keys.onlostpointercapture = endTouch;
  $('keyboard').ontransitionend = event => {
    if (event.target.tagName !== 'SPAN') event.target.classList.remove('playing');
  };
  syncStageScroll();
  if($('liveTheoryDock')&&!$('liveTheoryDock').classList.contains('hidden'))renderLiveTheoryDock();
}
function updateActiveChordLabel(){
  if(!state.showChordNames)return;
  const pitches=[...new Set([...state.activePointers.values()].map(active=>Number(active.element.dataset.midi)%12))];
  if(pitches.length<3){$('activeChordLabel').textContent='';$('activeChordLabel').classList.add('hidden');return;}
  const qualities={'0,3,6':'dim','0,3,7':'minor','0,4,7':'major','0,4,8':'aug','0,2,7':'sus2','0,5,7':'sus4','0,3,6,9':'dim7','0,3,6,10':'m7♭5','0,3,7,10':'m7','0,4,7,10':'7','0,4,7,11':'maj7'};
  let match=null;
  for(const root of pitches){const intervals=pitches.map(pitch=>(pitch-root+12)%12).sort((a,b)=>a-b),quality=qualities[intervals.join(',')];if(quality){match={root,quality};break;}}
  if(!match){$('activeChordLabel').textContent='';$('activeChordLabel').classList.add('hidden');return;}
  const rootName=state.notation==='latino'?(NOTE_ROOT_LATINO[NOTE_NAMES[match.root]]||NOTE_NAMES_LATINO[match.root]):NOTE_NAMES[match.root];
  const suffix={major:'',minor:'m',dim:'dim',aug:'aug',sus2:'sus2',sus4:'sus4',dim7:'dim7','m7♭5':'m7♭5',m7:'m7','7':'7',maj7:'maj7'}[match.quality]||'';
  $('activeChordLabel').textContent=`${rootName}${suffix}`;$('activeChordLabel').classList.remove('hidden');
}
function chordNameForMidis(midis){
  const pitches=[...new Set(midis.map(midi=>((Number(midi)%12)+12)%12))];
  if(pitches.length<3)return '';
  const qualities={'0,3,6':'dim','0,3,7':'minor','0,4,7':'major','0,4,8':'aug','0,2,7':'sus2','0,5,7':'sus4','0,3,6,9':'dim7','0,3,6,10':'m7♭5','0,3,7,10':'m7','0,4,7,10':'7','0,4,7,11':'maj7'};
  for(const root of pitches){
    const quality=qualities[pitches.map(pitch=>(pitch-root+12)%12).sort((a,b)=>a-b).join(',')];
    if(!quality)continue;
    const rootName=state.notation==='latino'?(NOTE_ROOT_LATINO[NOTE_NAMES[root]]||NOTE_NAMES_LATINO[root]):NOTE_NAMES[root];
    const suffix={major:'',minor:'m',dim:'dim',aug:'aug',sus2:'sus2',sus4:'sus4',dim7:'dim7','m7♭5':'m7♭5',m7:'m7','7':'7',maj7:'maj7'}[quality]||'';
    return `${rootName}${suffix}`;
  }
  return '';
}
function syncStageScroll(){
  const scroll=$('keyboardScroll');if(!scroll)return;
  if(!stageGridElement)stageGridElement=document.querySelector('#noteCanvas .canvas-grid');
  const grid=stageGridElement;if(!grid)return;
  const base=keyboardBaseKeyWidth();
  const width=base?base*state.keyboardZoom:0;
  if(width>0&&Math.abs(width-stageLastKeyWidth)>.01){grid.style.setProperty('--stage-key-width',`${width}px`);stageLastKeyWidth=width;}
  const left=scroll.scrollLeft;
  if(left!==stageLastScroll){grid.style.setProperty('--stage-scroll',`${left}px`);stageLastScroll=left;}
}
const INSTRUMENT_ICONS={
  'strings':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v16M9.5 4v16M14 4v16M18.5 4v16"/><path d="M3 9c6 2.5 12 2.5 18 0"/></svg>',
  'grand-piano':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M8 13v6M12 13v6M16 13v6"/><path d="M6.5 5v8h3V5zM10.5 5v8h3V5zM14.5 5v8h3V5z" fill="currentColor" stroke="none"/></svg>',
  'headroom-piano':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M8 13v6M12 13v6M16 13v6"/></svg>',
  'steinway-grand':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12V8.6C2.5 7.7 3.2 7 4.1 7H10c4.2 0 7.4 1.3 9.4 3.5.6.7 1.3 1.1 2.1 1.5V12z"/><path d="M5 12v7.5M12 12v7.5M19.5 12v7.5"/><path d="M2.5 9.5H7"/></svg>',
  'trumpet-real':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11h11"/><path d="M5 11v4.5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11"/><path d="M14.5 11 21.5 7v10l-7-4z"/><path d="M7.5 11V7M10.5 11V7M13 11V7.5"/></svg>',
  'trumpet-vsco2-sus-vib':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11h11"/><path d="M5 11v4.5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11"/><path d="M14.5 11 21.5 7v10l-7-4z"/><path d="M7.5 11V7M10.5 11V7M13 11V7.5"/></svg>',
  'trumpet-vsco2-sus':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11h11"/><path d="M5 11v4.5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11"/><path d="M14.5 11 21.5 7v10l-7-4z"/><path d="M7.5 11V7M10.5 11V7M13 11V7.5"/></svg>',
  'trumpet-vsco2-stac':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11h11"/><path d="M5 11v4.5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11"/><path d="M14.5 11 21.5 7v10l-7-4z"/><path d="M7.5 11V7M10.5 11V7M13 11V7.5"/></svg>',
  'trumpet-vsco2-harmon-mute-sus':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11h11"/><path d="M5 11v4.5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11"/><path d="M14.5 11 21.5 7v10l-7-4z"/><path d="M7.5 11V7M10.5 11V7M13 11V7.5"/></svg>',
  'trumpet-vsco2-straight-mute-sus':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11h11"/><path d="M5 11v4.5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11"/><path d="M14.5 11 21.5 7v10l-7-4z"/><path d="M7.5 11V7M10.5 11V7M13 11V7.5"/></svg>'
};
INSTRUMENT_ICONS['splendid-grand']=INSTRUMENT_ICONS['grand-piano'];
INSTRUMENT_ICONS['upright-piano-kw']=INSTRUMENT_ICONS['grand-piano'];
INSTRUMENT_ICONS['livingroom-upright-micro']=INSTRUMENT_ICONS['grand-piano'];
INSTRUMENT_ICONS['maestro-concert-grand']=INSTRUMENT_ICONS['steinway-grand'];
INSTRUMENT_ICONS['salamander-grand']=INSTRUMENT_ICONS['steinway-grand'];
INSTRUMENT_ICONS['solo-violin']=INSTRUMENT_ICONS['strings'];
INSTRUMENT_ICONS['sigex-strings']=INSTRUMENT_ICONS['strings'];
INSTRUMENT_ICONS['bigcat-cello']=INSTRUMENT_ICONS['strings'];
INSTRUMENT_ICONS['sigex-brass']=INSTRUMENT_ICONS['trumpet-real'];
INSTRUMENT_ICONS['mtg-solo-sax']='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3v11c0 3.3 5 3 5 6 0 2-2 3-4 2-3-1-5-3-5-7V7l3-2V3z"/><path d="M12 9h4m-4 4h4m-2 1v4m-5-13H7"/><circle cx="15" cy="9" r=".7"/><circle cx="15" cy="13" r=".7"/></svg>';
INSTRUMENT_ICONS['church-organ']='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h18M5 18V5h3v13M10.5 18V3h3v15M16 18V5h3v13M4 9h5m2-2h5m2 2h3M8 20v-4h8v4"/></svg>';
INSTRUMENT_ICONS['vibraphone']='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M5 6v4m3-4v6m3-6v8m3-8v7m3-7v5m2-5v3M4 11h16M7 11v7m10-7v7M5 20h14M9 16h6"/></svg>';
INSTRUMENT_ICONS['distorted-guitar']='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 3 3-2 3 3-2 3-2 1-1 3 2 2-1 4-3 1-2 3-5 2-3-3 2-4 3-2 1-4 4-2-1-3z"/><path d="m6 19 12-12M10 12l4 4M8 15l3 3M13 9l3 3"/></svg>';
function buildInstrumentButtons(){
  const select=$('instrumentSelect'),menu=$('instrumentMenu');
  if(!select||!menu||menu.querySelector('.instrument-browser'))return;
  const browser=document.createElement('div');browser.className='instrument-browser';
  const targetBar=document.createElement('div');targetBar.className='instrument-picker-targets';targetBar.setAttribute('role','group');targetBar.setAttribute('aria-label','Dónde aplicar el instrumento');
  const primaryTarget=document.createElement('button');primaryTarget.type='button';primaryTarget.className='instrument-picker-target';primaryTarget.textContent='Instrumento principal';primaryTarget.onclick=()=>{instrumentPickerTarget='primary';syncInstrumentButtons();};
  const layerTarget=document.createElement('button');layerTarget.type='button';layerTarget.className='instrument-picker-target';layerTarget.textContent='Segunda capa';layerTarget.onclick=()=>{instrumentPickerTarget='layer';setStringsLayerEnabled(true);syncInstrumentButtons();};
  const thirdLayerTarget=document.createElement('button');thirdLayerTarget.type='button';thirdLayerTarget.className='instrument-picker-target';thirdLayerTarget.textContent='Tercera capa';thirdLayerTarget.onclick=()=>{instrumentPickerTarget='third';setThirdLayerEnabled(true);syncInstrumentButtons();};
  const layerEnabledLabel=document.createElement('label');layerEnabledLabel.className='instrument-picker-layer-switch';layerEnabledLabel.innerHTML='<input id="layerPickerEnabled" type="checkbox" aria-label="Activar la segunda capa"><span>Capa activa</span>';
  const thirdLayerEnabledLabel=document.createElement('label');thirdLayerEnabledLabel.className='instrument-picker-layer-switch';thirdLayerEnabledLabel.innerHTML='<input id="thirdLayerPickerEnabled" type="checkbox" aria-label="Activar la tercera capa"><span>Tercera activa</span>';
  targetBar.append(primaryTarget,layerTarget,thirdLayerTarget,layerEnabledLabel,thirdLayerEnabledLabel);
  const mixControls=document.createElement('div');mixControls.className='instrument-picker-mix';
  mixControls.innerHTML='<div class="instrument-mix-control"><label for="pickerMasterVolume">Volumen del piano <output id="pickerMasterVolumeValue">100%</output></label><input id="pickerMasterVolume" type="range" min="0" max="200" step="1" aria-label="Volumen del instrumento principal"></div><div class="instrument-mix-control"><label for="layerPickerVolume">Volumen de la segunda <output id="layerPickerVolumeValue">70%</output></label><input id="layerPickerVolume" type="range" min="0" max="200" step="1" aria-label="Volumen de la segunda capa"></div><div class="instrument-mix-control"><label for="layerPickerAttack">Entrada de cuerdas <output id="layerPickerAttackValue">10 ms</output></label><input id="layerPickerAttack" type="range" min="0" max="200" step="5" aria-label="Tiempo de ataque de las cuerdas"></div><div class="instrument-mix-control"><label for="thirdLayerPickerVolume">Volumen de la tercera <output id="thirdLayerPickerVolumeValue">40%</output></label><input id="thirdLayerPickerVolume" type="range" min="0" max="200" step="1" aria-label="Volumen de la tercera capa"></div>';
  const masterPicker=mixControls.querySelector('#pickerMasterVolume'),volumePicker=mixControls.querySelector('#layerPickerVolume'),attackPicker=mixControls.querySelector('#layerPickerAttack');masterPicker.value=String(Math.round(state.masterVolume*100));volumePicker.value=String(state.stringsLayerVolume);attackPicker.value=String(state.stringsLayerAttackMs);masterPicker.oninput=event=>setMasterVolume(event.target.value);
  const thirdVolumePicker=mixControls.querySelector('#thirdLayerPickerVolume');thirdVolumePicker.value=String(state.thirdLayerVolume);thirdVolumePicker.oninput=event=>setThirdLayerVolume(event.target.value);
  volumePicker.oninput=event=>setStringsLayerVolume(event.target.value);attackPicker.oninput=event=>setStringsLayerAttack(event.target.value);
  layerEnabledLabel.querySelector('input').checked=state.stringsLayerEnabled;layerEnabledLabel.querySelector('input').onchange=event=>setStringsLayerEnabled(event.target.checked);
  thirdLayerEnabledLabel.querySelector('input').checked=state.thirdLayerEnabled;thirdLayerEnabledLabel.querySelector('input').onchange=event=>setThirdLayerEnabled(event.target.checked);
  const layerStatus=$('stringsLayerStatus'),thirdLayerStatus=$('thirdLayerStatus');if(layerStatus)mixControls.appendChild(layerStatus);if(thirdLayerStatus)mixControls.appendChild(thirdLayerStatus);
  browser.append(targetBar,mixControls);
  const categories=document.createElement('div');categories.className='instrument-categories';categories.setAttribute('role','tablist');categories.setAttribute('aria-label','Familia de instrumentos');
  const panels=document.createElement('div');panels.className='instrument-category-panels';
  const groups=[{id:'piano',name:'Piano',instruments:['grand-piano','steinway-grand','splendid-grand','maestro-concert-grand','salamander-grand']},{id:'bass',name:'Bajo',instruments:['growlybass-clean','fashionbass-clean']},{id:'brass',name:'Vientos',instruments:['trumpet-real','trumpet-vsco2-sus-vib','trumpet-vsco2-stac','mtg-solo-sax']},{id:'strings',name:'Strings',instruments:['strings','solo-violin','sigex-strings']},{id:'guitar',name:'Guitarra',instruments:['distorted-guitar']},{id:'organ',name:'Órgano',instruments:['church-organ']},{id:'percussion',name:'Percusión',instruments:['vibraphone']}];
  groups.forEach((group,index)=>{
    const tab=document.createElement('button');tab.type='button';tab.className='instrument-category-tab';tab.id=`instrument-tab-${group.id}`;tab.textContent=group.name;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',`instrument-panel-${group.id}`);tab.setAttribute('aria-selected',String(index===0));
    const panel=document.createElement('div');panel.id=`instrument-panel-${group.id}`;panel.className='instrument-category-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panel.hidden=index!==0;
    const list=document.createElement('div');list.className='instrument-options';list.setAttribute('role','radiogroup');list.setAttribute('aria-label',group.name);
    group.instruments.forEach(value=>{
      const option=[...select.options].find(item=>item.value===value);if(!option)return;
      const button=document.createElement('button');button.type='button';button.className='instrument-option';button.dataset.instrument=option.value;button.setAttribute('role','radio');
      const icon=document.createElement('span');icon.className='instrument-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=instrumentIllustration(option.value);
      const name=document.createElement('span');name.className='instrument-name';name.textContent=instrumentMenuLabel(option.value,option.textContent);
      button.append(icon,name);
      button.onclick=()=>{if(instrumentPickerTarget==='layer'){setLayerInstrument(option.value);setStringsLayerEnabled(true);}else if(instrumentPickerTarget==='third'){setThirdLayerInstrument(option.value);setThirdLayerEnabled(true);}else{select.value=option.value;select.dispatchEvent(new Event('change'));}syncInstrumentButtons();};
      list.appendChild(button);
    });
    panel.appendChild(list);categories.appendChild(tab);panels.appendChild(panel);
    tab.onclick=()=>{
      categories.querySelectorAll('[role="tab"]').forEach(item=>item.setAttribute('aria-selected',String(item===tab)));
      panels.querySelectorAll('[role="tabpanel"]').forEach(item=>item.hidden=item!==panel);
    };
  });
  browser.append(categories,panels);menu.prepend(browser);syncInstrumentButtons();
}
function registerExtraInstrumentOptions(){
  const source=$('instrumentSelect');if(!source)return;
  EXTRA_INSTRUMENTS.forEach(instrument=>{
    if([...source.options].some(option=>option.value===instrument.id))return;
    const option=document.createElement('option');option.value=instrument.id;option.textContent=instrument.label;source.appendChild(option);
  });
  const targets=document.querySelectorAll('#layerInstrumentSelect,#thirdLayerInstrument,#bassInstrumentQuick,#bassInstrument,#modeBassInstrument,#modeMelodyInstrument,#modeAccompaniment2Instrument,#songTrackInstrument,#songTrackLayerInstrument,[id^="mode_"][id$="_layerInstrument"]');
  targets.forEach(select=>{
    const selected=select.value;
    select.replaceChildren(...[...source.options].map(option=>option.cloneNode(true)));
    if([...select.options].some(option=>option.value===selected))select.value=selected;
  });
}
function syncInstrumentButtons(){
  const instrumentButton=$('instrumentToggle'),instrumentNames={...Object.fromEntries(EXTRA_INSTRUMENTS.map(item=>[item.id,item.label])),'grand-piano':'Grand Piano','steinway-grand':'Steinway de cola','headroom-piano':'Headroom · Yamaha C3','splendid-grand':'Splendid Grand Piano','livingroom-upright-micro':'LivingRoom Upright Micro','maestro-concert-grand':'Maestro Concert Grand · Yamaha CF-3','salamander-grand':'Salamander Grand Piano · Yamaha C5','upright-piano-vsco2':'Vertical VSCO · Upright Piano','upright-nr1-vsco2':'Vertical VSCO · Upright No. 1','upright-piano-kw':'Upright Piano KW · Kawai','trumpet-real':'Trompeta real','trumpet-vsco2-sus-vib':'Trompeta VSCO · Vibrato','trumpet-vsco2-sus':'Trompeta VSCO · Sostenida','trumpet-vsco2-stac':'Trompeta VSCO · Staccato','trumpet-vsco2-harmon-mute-sus':'Trompeta VSCO · Sordina Harmon','trumpet-vsco2-straight-mute-sus':'Trompeta VSCO · Sordina Straight','strings':'Strings','solo-violin':'Violín solista','distorted-guitar':'Guitarra distorsionada'};
  if(instrumentButton){
     const name=instrumentNames[state.instrument]||instrumentNames['grand-piano'];
     instrumentButton.innerHTML=instrumentButton.classList.contains('instrument-header-toggle')?'<svg class="ui-icon ui-icon-piano" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 5v14M11 5v8M15 5v8M19 5v14"/><path class="ui-icon-black-keys" d="M8 5h2v5H8zm4 0h2v5h-2zm4 0h2v5h-2z"/></svg>':instrumentIllustration(state.instrument,'stage');
    instrumentButton.setAttribute('aria-label',`Instrumento actual: ${name}. Cambiar instrumento`);instrumentButton.title=name;
  }
  const selected=instrumentPickerTarget==='layer'?state.layerInstrument:instrumentPickerTarget==='third'?state.thirdLayerInstrument:state.instrument;
  document.querySelectorAll('#instrumentMenu [data-instrument]').forEach(button=>{const on=button.dataset.instrument===selected;button.classList.toggle('active',on);button.setAttribute('aria-checked',String(on));});
  document.querySelectorAll('#instrumentMenu .instrument-picker-target').forEach((button,index)=>{const active=index===(instrumentPickerTarget==='layer'?1:instrumentPickerTarget==='third'?2:0);button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  const group=['sigex-brass','mtg-solo-sax',...Object.keys(VSCO2_TRUMPET_PATCHES),'trumpet-real','trumpet-vsco2-sus-vib'].includes(selected)?'brass':['strings','solo-violin','sigex-strings','bigcat-cello'].includes(selected)?'strings':selected==='distorted-guitar'?'guitar':selected==='church-organ'?'organ':selected==='vibraphone'?'percussion':['growlybass-clean','fashionbass-clean'].includes(selected)?'bass':'piano';
  const tab=$(`instrument-tab-${group}`),panel=$(`instrument-panel-${group}`);
  if(tab&&panel){document.querySelectorAll('#instrumentMenu [role="tab"]').forEach(item=>item.setAttribute('aria-selected',String(item===tab)));document.querySelectorAll('#instrumentMenu [role="tabpanel"]').forEach(item=>item.hidden=item!==panel);}
}
function instrumentIllustration(instrument){
  const horns=['trumpet-real','trumpet-vsco2-sus-vib','trumpet-vsco2-stac',...Object.keys(VSCO2_TRUMPET_PATCHES)];
  const pianos=['grand-piano','steinway-grand','splendid-grand','maestro-concert-grand','salamander-grand'];
  const pianoImages={'grand-piano':'grand-piano-black.png','steinway-grand':'grand-piano-gray.png','headroom-piano':'grand-piano-black.png','splendid-grand':'grand-piano-gray.png','livingroom-upright-micro':'upright-piano.png','maestro-concert-grand':'grand-piano-black.png','salamander-grand':'grand-piano-gray.png','upright-piano-vsco2':'upright-piano.png','upright-nr1-vsco2':'upright-piano.png','upright-piano-kw':'upright-piano.png'};
  let image='grand-piano-black.png';
  if(pianos.includes(instrument))image=pianoImages[instrument]||image;
  else if(horns.includes(instrument))image='trumpet.png';
  else if(instrument==='mtg-solo-sax')image='saxophone.png';
  else if(['strings','solo-violin','sigex-strings'].includes(instrument))image='violin.png';
  else if(instrument==='distorted-guitar')image='guitar.png';
  else if(['growlybass-clean','fashionbass-clean'].includes(instrument))image='bass.png';
  else if(instrument==='church-organ')image='organ.png';
  else if(instrument==='vibraphone')image='vibraphone.png';
  return `<img class="instrument-art instrument-art-png" src="assets/instruments/icons/${image}" alt="" aria-hidden="true" draggable="false">`;
}
function instrumentMenuLabel(instrument,fallback){return ({...Object.fromEntries(EXTRA_INSTRUMENTS.map(item=>[item.id,item.label])),'solo-violin':'Violín solista','distorted-guitar':'Guitarra eléctrica distorsionada','grand-piano':'Grand Piano','steinway-grand':'Steinway de cola','headroom-piano':'Headroom · Yamaha C3','splendid-grand':'Splendid Grand Piano','livingroom-upright-micro':'LivingRoom Upright Micro','maestro-concert-grand':'Maestro Concert Grand','salamander-grand':'Salamander · Yamaha C5','upright-piano-vsco2':'Upright Piano','upright-nr1-vsco2':'Upright No. 1','upright-piano-kw':'Upright Piano KW · Kawai','trumpet-real':'Trompeta','trumpet-vsco2-sus-vib':'Trompeta · vibrato','trumpet-vsco2-sus':'Trompeta · sostenida','trumpet-vsco2-stac':'Trompeta · staccato','trumpet-vsco2-harmon-mute-sus':'Trompeta · sordina Harmon','trumpet-vsco2-straight-mute-sus':'Trompeta · sordina Straight','strings':'Violines'})[instrument]||fallback;}
function buildNotationButtons(){
  const select=$('keyboardNotation'),menu=$('notationMenu');
  if(!select||!menu||$('notationOptions'))return;
  const grid=document.createElement('div');grid.id='notationOptions';grid.className='range-presets notation-presets';grid.setAttribute('role','group');grid.setAttribute('aria-label','Etiquetas de las teclas');
  [...select.options].forEach(option=>{
    const [title,detail]=option.textContent.split(' · ');
    const button=document.createElement('button');button.type='button';button.dataset.notation=option.value;button.textContent=title;
    if(detail){const small=document.createElement('small');small.textContent=detail;button.appendChild(small);}
    button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change'));syncNotationButtons();};
    grid.appendChild(button);
  });
  menu.appendChild(grid);syncNotationButtons();
}
function syncNotationButtons(){
  document.querySelectorAll('#notationOptions [data-notation]').forEach(button=>{const on=button.dataset.notation===state.notation;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});
}
const playerPopoverIds=['instrumentMenu','colorMenu','keyboardRangeMenu','notationMenu','lyricsPanel','keyTransposePopover'];
function closePlayerPopovers(except=''){
  if(except!=='chordEditorPanel')chordEditorOpen=false;
  playerPopoverIds.forEach(id=>{if(id!==except)$(id)?.classList.add('hidden');});
  if(except!=='chordEditorPanel')$('chordEditorPanel')?.classList.add('hidden');
  [['instrumentToggle','instrumentMenu'],['keyColorToggle','colorMenu'],['keyboardRangeToggle','keyboardRangeMenu'],['notationToggle','notationMenu'],['chordsViewToggle','lyricsPanel'],['activeKeyName','keyTransposePopover']].forEach(([button,panel])=>$(button)?.setAttribute('aria-expanded',String(panel===except)));
}
function togglePlayerPopover(id){
  const panel=$(id),willOpen=panel.classList.contains('hidden');closePlayerPopovers(willOpen?id:'');
  if(willOpen)panel.classList.remove('hidden');
  return willOpen;
}
function toggleLyricsPanel(){
  const open=togglePlayerPopover('lyricsPanel');
  if(open){
    $('mobileSongDetails').open=true;
    if(!state.song){$('songKey').textContent='';$('chordList').replaceChildren();$('lyrics').textContent='En Reproducción libre no hay una alabanza seleccionada. Elige una alabanza para consultar aquí su letra y acordes.';}
  }
}
function toggleNotesPanel(){
  if(!state.admin||!state.notes.length){toast('Esta pista todavía no tiene notas grabadas.');return;}
  const panel=$('notesPanel'),open=panel.classList.contains('hidden');panel.dataset.open=open?'1':'';updateVisualOptions();
  if(open)$('recordedNotes').scrollIntoView({behavior:'smooth',block:'nearest'});
}
const FALLING_STYLE_OPTIONS=[['bars','Barras completas','Melodía y bajos; al tocar suben desde la tecla'],['melody','Solo melodía','Sin bajos; al tocar suben desde la tecla'],['drops','Gotas','Al tocar suben gotas; en melodías siguen cayendo'],['off','Sin barras','Solo se iluminan las teclas']];
function syncFallingStyleButtons(){
  document.querySelectorAll('[data-fall-style]').forEach(button=>{const on=button.dataset.fallStyle===fallingNotesStyle;button.classList.toggle('active',on);button.setAttribute('aria-pressed',on?'true':'false');});
}
function setFallingNotesStyle(value){
  if(!FALLING_STYLE_OPTIONS.some(option=>option[0]===value))value='bars';
  fallingNotesStyle=value;
  if(typeof deviceSettings==='object'){deviceSettings.fallingStyle=value;saveDeviceSettings();if($('deviceFallingStyle'))$('deviceFallingStyle').value=value;}
  try{localStorage.setItem('yhwh_piano_barstyle',value);}catch(_){}
  if(value==='off'){
    if(fallingNotesFrame)cancelAnimationFrame(fallingNotesFrame);
    fallingNotesFrame=0;clearFallingNotesCanvas();
  }else if(state.playing&&fallingNotesRun&&!fallingNotesFrame&&!document.hidden){
    fallingNotesLastFrame=0;fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
  }
  syncFallingStyleButtons();
  if($('devicePreviewStyle'))$('devicePreviewStyle').textContent=({bars:'Barras completas',melody:'Solo melodía',drops:'Gotas',off:'Sin barras'})[value];
}
function initFallingStyleSetting(){
  const sheet=$('playerSettings');if(!sheet||$('fallingStyleBlock'))return;
  const block=document.createElement('div');block.id='fallingStyleBlock';block.className='settings-block';
  block.innerHTML='<h3>Notas que caen</h3><div class="range-presets" role="group" aria-label="Estilo de las notas que caen">'+FALLING_STYLE_OPTIONS.map(option=>`<button type="button" data-fall-style="${option[0]}"><span>${option[1]}</span><small style="display:block;margin-top:2px;font-size:.68rem;font-weight:400;opacity:.75">${option[2]}</small></button>`).join('')+'</div>';
  const switches=sheet.querySelector('.settings-switches');
  if(switches)switches.insertAdjacentElement('afterend',block);else sheet.appendChild(block);
  block.addEventListener('click',event=>{const button=event.target.closest('[data-fall-style]');if(button)setFallingNotesStyle(button.dataset.fallStyle);});
  syncFallingStyleButtons();
}
function syncFxStyleButtons(){
  document.documentElement.dataset.fxStyle=fxStyle;
  document.querySelectorAll('[data-fx-style]').forEach(button=>{const on=button.dataset.fxStyle===fxStyle;button.classList.toggle('active',on);button.setAttribute('aria-pressed',on?'true':'false');});
  if($('deviceFxStyle'))$('deviceFxStyle').value=fxStyle;
  [['deviceFxIntensity',fxIntensity],['fxIntensityInput',fxIntensity],['deviceFxDuration',fxDuration],['fxDurationInput',fxDuration]].forEach(([id,value])=>{const control=$(id);if(control)control.value=String(value);});
  ['goldImpactGlowSwitch','deviceGoldImpactGlow'].forEach(id=>{const control=$(id);if(control)control.checked=goldImpactGlow;});
  [['deviceFxIntensityValue',['','Suave','Normal','Intenso'][fxIntensity]],['fxIntensityValue',['','Suave','Normal','Intenso'][fxIntensity]],['deviceFxDurationValue',`${fxDuration.toFixed(1)} s`],['fxDurationValue',`${fxDuration.toFixed(1)} s`]].forEach(([id,value])=>{const output=$(id);if(output)output.textContent=value;});
}
function setFxStyle(value){
  fxStyle=FX_STYLES.includes(value)?value:'smoke';
  if(typeof deviceSettings==='object'){deviceSettings.fxStyle=fxStyle;saveDeviceSettings();}
  try{localStorage.setItem('yhwh_piano_fx_style',fxStyle);}catch(_){}
  syncFxStyleButtons();updateDeviceSettingsPreview();
}
function setGoldImpactGlow(enabled){goldImpactGlow=!!enabled;deviceSettings.goldImpactGlow=goldImpactGlow;['goldImpactGlowSwitch','deviceGoldImpactGlow'].forEach(id=>{const control=$(id);if(control)control.checked=goldImpactGlow;});saveDeviceSettings();updateDeviceSettingsPreview();}
function setKeyNoteIndicatorEnabled(enabled){keyNoteIndicatorEnabled=!!enabled;try{localStorage.setItem('yhwh_piano_key_indicator',keyNoteIndicatorEnabled?'1':'0');}catch(_){}document.documentElement.classList.toggle('key-note-indicator-off',!keyNoteIndicatorEnabled);const input=$('keyNoteIndicatorSwitch');if(input)input.checked=keyNoteIndicatorEnabled;saveDeviceSettings();updateDeviceSettingsPreview();}
function setFxIntensity(value){fxIntensity=Math.max(1,Math.min(3,Math.round(Number(value)||2)));deviceSettings.fxIntensity=fxIntensity;syncFxStyleButtons();scheduleDeviceSettingsSave();updateDeviceSettingsPreview();}
function setFxDuration(value){fxDuration=Math.max(.1,Math.min(6,Number(value)||3.4));deviceSettings.fxDuration=fxDuration;syncFxStyleButtons();scheduleDeviceSettingsSave();updateDeviceSettingsPreview();}
// Acción del usuario: si los destellos estaban apagados se encienden, para que el efecto elegido se vea de inmediato.
function chooseFxStyle(value){
  setFxStyle(value);
  if(!fxGlow){
    fxGlow=true;deviceSettings.fxGlow=true;try{localStorage.setItem('yhwh_piano_fx_glow','1');}catch(_){}
    ['fxGlowSwitch','deviceGlowEnabled'].forEach(id=>{const control=$(id);if(control)control.checked=true;});
    updateDeviceSettingsPreview();saveDeviceSettings();
  }
}
const FX_STYLE_OPTIONS=[['smoke','Humo con chispas','Humo suave con pequeñas chispas al tocar'],['gold','Chispas doradas','Una cinta de chispas que sube al tocar'],['rings','Ondas','Anillos que se expanden desde la tecla'],['bubbles','Burbujas','Burbujas translúcidas que flotan hacia arriba'],['notes','Rayos de luz','Haces verticales de luz con destellos al tocar']];
function initFxStyleSetting(){
  const sheet=$('playerSettings');if(!sheet||$('fxStyleBlock'))return;
  const block=document.createElement('div');block.id='fxStyleBlock';block.className='settings-block';
  block.innerHTML='<h3>Efecto al tocar</h3><div class="range-presets" role="group" aria-label="Estilo del efecto al tocar">'+FX_STYLE_OPTIONS.map(option=>'<button type="button" data-fx-style="'+option[0]+'"><span>'+option[1]+'</span><small>'+option[2]+'</small></button>').join('')+'</div><label class="fx-toggle-row"><span><b>Círculo indicador en las teclas</b><small>Muestra u oculta el círculo que aparece sobre cada tecla mientras suena.</small></span><input id="keyNoteIndicatorSwitch" type="checkbox"></label><label class="fx-control-row">Intensidad <output id="fxIntensityValue"></output><input id="fxIntensityInput" type="range" min="1" max="3" step="1"></label><details class="settings-advanced fx-advanced"><summary>Personalizar a fondo</summary><div class="settings-advanced-content"><label class="fx-control-row">Duración <output id="fxDurationValue"></output><input id="fxDurationInput" type="range" min="1" max="6" step="0.5"></label><label class="fx-toggle-row gold-impact-glow-row"><span><b>Halo dorado al impactar</b><small>Funciona con Chispas doradas, incluso si desactivas las partículas.</small></span><input id="goldImpactGlowSwitch" type="checkbox"></label></div></details>';
  const anchor=$('fallingStyleBlock');if(anchor)anchor.insertAdjacentElement('afterend',block);else sheet.appendChild(block);
  block.addEventListener('click',event=>{const button=event.target.closest('[data-fx-style]');if(button)chooseFxStyle(button.dataset.fxStyle);});
  block.addEventListener('input',event=>{if(event.target.id==='fxIntensityInput')setFxIntensity(event.target.value);else if(event.target.id==='fxDurationInput')setFxDuration(event.target.value);});
  $('goldImpactGlowSwitch').checked=goldImpactGlow;$('goldImpactGlowSwitch').addEventListener('change',event=>setGoldImpactGlow(event.target.checked));syncFxStyleButtons();
  $('keyNoteIndicatorSwitch').checked=keyNoteIndicatorEnabled;$('keyNoteIndicatorSwitch').addEventListener('change',event=>setKeyNoteIndicatorEnabled(event.target.checked));
}
function syncBarLookButtons(){
  document.querySelectorAll('[data-bar-look]').forEach(button=>{const on=button.dataset.barLook===barLook;button.classList.toggle('active',on);button.setAttribute('aria-pressed',on?'true':'false');});
  if($('deviceBarLook'))$('deviceBarLook').value=barLook;
  document.querySelectorAll('[data-bar-palette]').forEach(button=>{const active=button.dataset.barPalette===barColorPreset;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  const palettesVisible=barLook!=='normal';['barPaletteOptions','deviceBarPalettes'].forEach(id=>{const group=$(id);if(group)group.hidden=!palettesVisible;});
  if($('barBassDiffInput'))$('barBassDiffInput').checked=barBassDiff;if($('deviceBarBassDiff'))$('deviceBarBassDiff').checked=barBassDiff;
}
function setBarLook(value){
  barLook=value==='duo'||value==='tri'?value:'normal';
  if(typeof deviceSettings==='object'){deviceSettings.barLook=barLook;saveDeviceSettings();}
  try{localStorage.setItem('yhwh_piano_bar_look',barLook);}catch(_){}
  syncBarLookButtons();
}
function setBarBassDiff(value){
  barBassDiff=!!value;
  if(typeof deviceSettings==='object'){deviceSettings.barBassDiff=barBassDiff;scheduleDeviceSettingsSave();}
  try{localStorage.setItem('yhwh_piano_bar_bass_diff',barBassDiff?'1':'0');}catch(_){}
  syncBarLookButtons();
}
function setBarColorPreset(id){
  const preset=BAR_COLOR_PRESETS.find(item=>item[0]===id);if(!preset)return;
  barColorPreset=preset[0];barColor2=preset[2];barColor3=preset[3];fnDuoGradCache.clear();
  deviceSettings.barColorPreset=barColorPreset;deviceSettings.barColor2=barColor2;deviceSettings.barColor3=barColor3;
  try{localStorage.setItem('yhwh_piano_bar_palette',barColorPreset);localStorage.setItem('yhwh_piano_bar_color2',barColor2);localStorage.setItem('yhwh_piano_bar_color3',barColor3);}catch(_){}
  syncBarLookButtons();scheduleDeviceSettingsSave();updateDeviceSettingsPreview();
}
function barPaletteMarkup(id){return '<div id="'+id+'" class="bar-palette-options" role="group" aria-label="Paleta de colores de las barras" hidden>'+BAR_COLOR_PRESETS.map(([key,name,color2,color3])=>'<button type="button" class="bar-palette-button" data-bar-palette="'+key+'" aria-label="Paleta '+name+'" aria-pressed="false"><span class="bar-palette-swatch" style="--palette-color-2:'+color2+';--palette-color-3:'+color3+'"><i></i><i></i><i></i></span><span>'+name+'</span></button>').join('')+'</div>';}
function applyBarAppearanceVars(){
  const root=document.documentElement;root.style.setProperty('--manual-bar-radius',`${barRadius}px`);root.style.setProperty('--manual-bar-opacity',String(barOpacity/100));root.style.setProperty('--manual-bar-trail',`${barTrail*.9}px`);root.style.setProperty('--manual-bar-accompaniment2-color',barAccompaniment2Color);
}
function syncBarAppearanceControls(){
  document.documentElement.dataset.barAppearance=barStyle;
  document.querySelectorAll('[data-bar-appearance]').forEach(button=>{const active=button.dataset.barAppearance===barStyle;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false');});
  const values={deviceBarAppearance:barStyle,barAppearanceInput:barStyle,deviceBarRadius:barRadius,barRadiusInput:barRadius,deviceBarOpacity:barOpacity,barOpacityInput:barOpacity,deviceBarColorMode:barColorMode,barColorModeInput:barColorMode,deviceBarAccompaniment2Color:barAccompaniment2Color,barAccompaniment2ColorInput:barAccompaniment2Color,deviceBarTrail:barTrail,barTrailInput:barTrail};
  Object.entries(values).forEach(([id,value])=>{const input=$(id);if(input)input.value=String(value);});
  [['deviceBarRadiusValue',`${barRadius} px`],['barRadiusValue',`${barRadius} px`],['deviceBarOpacityValue',`${barOpacity}%`],['barOpacityValue',`${barOpacity}%`],['deviceBarTrailValue',`${barTrail}%`],['barTrailValue',`${barTrail}%`]].forEach(([id,value])=>{const output=$(id);if(output)output.textContent=value;});
  ['deviceBarRadius','barRadiusInput'].forEach(id=>{const row=$(id)?.closest('label');if(row)row.hidden=false;});
  ['deviceBarTrail','barTrailInput'].forEach(id=>{const row=$(id)?.closest('label');if(row)row.hidden=barStyle==='solid';});
  applyBarAppearanceVars();
}
function setBarAppearance(value){barStyle=['glass','neon','synesthesia','solid'].includes(value)?value:'glass';deviceSettings.barStyle=barStyle;syncBarAppearanceControls();updateDeviceSettingsPreview();saveDeviceSettings();}
function setBarRadius(value){barRadius=Math.max(0,Math.min(12,Number(value)||0));deviceSettings.barRadius=barRadius;syncBarAppearanceControls();scheduleDeviceSettingsSave();updateDeviceSettingsPreview();}
function setBarOpacity(value){barOpacity=Math.max(0,Math.min(100,Number.isFinite(Number(value))?Number(value):10));deviceSettings.barOpacity=barOpacity;syncBarAppearanceControls();scheduleDeviceSettingsSave();updateDeviceSettingsPreview();}
function setBarTrail(value){barTrail=Math.max(0,Math.min(100,Number(value)||0));deviceSettings.barTrail=barTrail;syncBarAppearanceControls();scheduleDeviceSettingsSave();updateDeviceSettingsPreview();}
function setBarColorMode(value){barColorMode=value==='note'?'note':'track';deviceSettings.barColorMode=barColorMode;syncBarAppearanceControls();scheduleDeviceSettingsSave();updateDeviceSettingsPreview();}
function setBarAccompaniment2Color(value){if(!/^#[0-9a-f]{6}$/i.test(value||''))return;barAccompaniment2Color=value;deviceSettings.barAccompaniment2Color=value;syncBarAppearanceControls();scheduleDeviceSettingsSave();updateDeviceSettingsPreview();}
const BAR_APPEARANCE_OPTIONS=[['glass','Cristal'],['neon','Neón'],['synesthesia','Sinestesia'],['solid','Sólido']];
function initBarAppearanceSetting(){
  const sheet=$('playerSettings');if(!sheet||$('barAppearanceBlock'))return;
  const block=document.createElement('div');block.id='barAppearanceBlock';block.className='settings-block';
  block.innerHTML='<h3>Diseño de las barras</h3><div class="range-presets" role="group" aria-label="Diseño de las barras">'+BAR_APPEARANCE_OPTIONS.map(option=>'<button type="button" data-bar-appearance="'+option[0]+'"><span>'+option[1]+'</span></button>').join('')+'</div><details class="settings-advanced"><summary>Personalizar a fondo</summary><div class="settings-advanced-content"><label class="bar-control-row">Redondeo <output id="barRadiusValue"></output><input id="barRadiusInput" type="range" min="0" max="12" step="1"></label><label class="bar-control-row">Opacidad <output id="barOpacityValue"></output><input id="barOpacityInput" type="range" min="10" max="100" step="5"></label><label class="bar-control-row">Rastro <output id="barTrailValue"></output><input id="barTrailInput" type="range" min="0" max="100" step="5"></label><label class="bar-control-row">Asignar color por <select id="barColorModeInput"><option value="track">Pista o mano</option><option value="note">Nota musical</option></select></label><label class="bar-control-row">Color de acompañamiento 2 <input id="barAccompaniment2ColorInput" type="color"></label></div></details>';
  const anchor=$('barLookBlock')||$('fallingStyleBlock');if(anchor)anchor.insertAdjacentElement('afterend',block);else sheet.appendChild(block);
  block.addEventListener('click',event=>{const button=event.target.closest('[data-bar-appearance]');if(button)setBarAppearance(button.dataset.barAppearance);});
  block.addEventListener('input',event=>{if(event.target.id==='barRadiusInput')setBarRadius(event.target.value);else if(event.target.id==='barOpacityInput')setBarOpacity(event.target.value);else if(event.target.id==='barTrailInput')setBarTrail(event.target.value);else if(event.target.id==='barAccompaniment2ColorInput')setBarAccompaniment2Color(event.target.value);});
  block.addEventListener('change',event=>{if(event.target.id==='barColorModeInput')setBarColorMode(event.target.value);});syncBarAppearanceControls();
}
const KEY_STYLE_OPTIONS=[['classic','Clásico','Teclas blancas con degradado y negras con sombra'],['flat','Plano / minimalista','Superficies lisas y bordes finos'],['realistic','Realista','Tonos cálidos de marfil y ébano'],['synthesia','3D','Teclas de marfil y ébano con relieve']];
function syncPianoKeyStyleControls(){
  document.documentElement.dataset.pianoKeyStyle=pianoKeyStyle;
  if($('deviceKeyStyle'))$('deviceKeyStyle').value=pianoKeyStyle;
  document.querySelectorAll('.settings-preview-keyboard').forEach(preview=>preview.dataset.keyStyle=pianoKeyStyle);
  document.querySelectorAll('[data-key-style]').forEach(button=>{const active=button.dataset.keyStyle===pianoKeyStyle;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false');});
}
function setPianoKeyStyle(value){pianoKeyStyle=['flat','realistic','synthesia'].includes(value)?value:'classic';deviceSettings.keyStyle=pianoKeyStyle;syncPianoKeyStyleControls();renderKeyboard();saveDeviceSettings();updateDeviceSettingsPreview();}
function initPianoKeyStyleSetting(){
  const sheet=$('playerSettings');if(!sheet||$('keyStyleBlock'))return;
  const block=document.createElement('div');block.id='keyStyleBlock';block.className='settings-block';
  block.innerHTML='<h3>Estilo de las teclas</h3><div class="range-presets" role="group" aria-label="Estilo de las teclas">'+KEY_STYLE_OPTIONS.map(option=>`<button type="button" data-key-style="${option[0]}"><span>${option[1]}</span><small style="display:block;margin-top:2px;font-size:.68rem;font-weight:400;opacity:.75">${option[2]}</small></button>`).join('')+'</div>';
  const anchor=$('barAppearanceBlock')||$('barLookBlock')||$('fallingStyleBlock');if(anchor)anchor.insertAdjacentElement('afterend',block);else sheet.appendChild(block);
  block.addEventListener('click',event=>{const button=event.target.closest('[data-key-style]');if(button)setPianoKeyStyle(button.dataset.keyStyle);});syncPianoKeyStyleControls();
}
function initBarLookSetting(){
  const sheet=$('playerSettings');if(!sheet||$('barLookBlock'))return;
  const block=document.createElement('div');block.id='barLookBlock';block.className='settings-block';
  block.innerHTML='<h3>Color de las barras</h3><div class="range-presets" role="group" aria-label="Color de las barras">'+BAR_LOOK_OPTIONS.map(option=>'<button type="button" data-bar-look="'+option[0]+'"><span>'+option[1]+'</span></button>').join('')+'</div><details class="settings-advanced"><summary>Paletas y opciones de color</summary><div class="settings-advanced-content">'+barPaletteMarkup('barPaletteOptions')+'<label class="bar-bass-diff-row"><input id="barBassDiffInput" type="checkbox"> Diferenciar los bajos</label></div></details>';
  const anchor=$('fxStyleBlock')||$('fallingStyleBlock');if(anchor)anchor.insertAdjacentElement('afterend',block);else sheet.appendChild(block);
  block.addEventListener('click',event=>{const look=event.target.closest('[data-bar-look]'),palette=event.target.closest('[data-bar-palette]');if(look)setBarLook(look.dataset.barLook);else if(palette)setBarColorPreset(palette.dataset.barPalette);});
  block.addEventListener('change',event=>{if(event.target.id==='barBassDiffInput')setBarBassDiff(event.target.checked);});syncBarLookButtons();
}
const PLAYER_LOOKS=[
  {id:'classic',name:'Clásico',description:'Equilibrado y familiar',barStyle:'glass',barLook:'normal',palette:'galaxia',fxStyle:'smoke',fxGlow:false,keyStyle:'classic',lineOn:true,lineStyle:'turq',melodyColor:'#45c4d6',bassColor:'#d9b45f',lineColor:'#2ff3e0'},
  {id:'neon',name:'Neón',description:'Colores vivos y ondas',barStyle:'neon',barLook:'duo',palette:'oceano',fxStyle:'rings',fxGlow:true,keyStyle:'flat',lineOn:true,lineStyle:'turq',melodyColor:'#11d9f0',bassColor:'#8a4dff',lineColor:'#11d9f0'},
  {id:'crystal',name:'Cristal',description:'Transparencias y degradado',barStyle:'glass',barLook:'tri',palette:'aurora',fxStyle:'gold',fxGlow:false,keyStyle:'classic',lineOn:true,lineStyle:'turq',melodyColor:'#8ddfff',bassColor:'#f3c7ff',lineColor:'#8ddfff'},
  {id:'aurora',name:'Aurora',description:'Degradados y burbujas',barStyle:'synesthesia',barLook:'tri',palette:'aurora',fxStyle:'bubbles',fxGlow:true,keyStyle:'realistic',lineOn:true,lineStyle:'turq',melodyColor:'#53e2bc',bassColor:'#a26bfa',lineColor:'#53e2bc'},
  {id:'minimal',name:'Minimalista',description:'Color plano, sin efectos',barStyle:'solid',barLook:'normal',palette:'bosque',fxStyle:'smoke',fxGlow:false,keyStyle:'flat',lineOn:false,lineStyle:'turq',melodyColor:'#759269',bassColor:'#c5a14b',lineColor:'#759269'},
  {id:'fire',name:'Fuego',description:'Calidez y chispas',barStyle:'synesthesia',barLook:'duo',palette:'atardecer',fxStyle:'smoke',fxGlow:true,keyStyle:'realistic',lineOn:true,lineStyle:'flame',melodyColor:'#ff633d',bassColor:'#ffb23f',lineColor:'#ff633d'}
];
let activePlayerLook=deviceSettings.playerLook||'custom',applyingPlayerLook=false;
function syncPlayerLookButtons(){
  document.querySelectorAll('[data-player-look]').forEach(button=>{const active=button.dataset.playerLook===activePlayerLook;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  const status=$('playerLookStatus'),look=PLAYER_LOOKS.find(item=>item.id===activePlayerLook);if(status)status.textContent=look?'Look activo: '+look.name:'Look activo: Personalizado';
}
function markPlayerLookCustom(){if(applyingPlayerLook||activePlayerLook==='custom')return;activePlayerLook='custom';deviceSettings.playerLook='custom';syncPlayerLookButtons();scheduleDeviceSettingsSave();}
function applyPlayerLook(id){
  const look=PLAYER_LOOKS.find(item=>item.id===id);if(!look)return;applyingPlayerLook=true;
  try{
    setBarAppearance(look.barStyle);setBarLook(look.barLook);setBarColorPreset(look.palette);setPianoKeyStyle(look.keyStyle);setFxStyle(look.fxStyle);
    state.keyColor=look.melodyColor;state.bassColor=look.bassColor;deviceSettings.melodyColor=state.keyColor;deviceSettings.bassColor=state.bassColor;
    try{localStorage.setItem('yhwh_piano_key_color',state.keyColor);localStorage.setItem('yhwh_piano_bass_color',state.bassColor);}catch(_){}
    if($('keyColorPicker'))$('keyColorPicker').value=state.keyColor;if($('bassColorPicker'))$('bassColorPicker').value=state.bassColor;
    if($('playerMelodyColor'))$('playerMelodyColor').value=state.keyColor;if($('playerBassColor'))$('playerBassColor').value=state.bassColor;updateVisualOptions();
    fxGlow=look.fxGlow;deviceSettings.fxGlow=fxGlow;try{localStorage.setItem('yhwh_piano_fx_glow',fxGlow?'1':'0');}catch(_){}
    ['fxGlowSwitch','deviceGlowEnabled'].forEach(id=>{const input=$(id);if(input)input.checked=fxGlow;});
    neonEdge.on=look.lineOn;neonEdge.style=look.lineStyle;neonEdge.color=look.lineColor;applyNeonEdge();syncNeonEdgeControls();saveNeonEdge();
    activePlayerLook=look.id;deviceSettings.playerLook=look.id;saveDeviceSettings();updateDeviceSettingsPreview();syncPlayerLookButtons();
  }finally{applyingPlayerLook=false;}
}
function initializePlayerSettingsPage(){
  const page=$('playerSettings');if(!page||page.dataset.pageReady==='true')return;
  page.dataset.pageReady='true';page.classList.add('player-settings-page');page.removeAttribute('role');page.removeAttribute('aria-modal');
  const screen=document.createElement('section');screen.id='playerSettingsScreen';screen.className='mode-screen player-config-screen hidden';screen.setAttribute('aria-label','Configuración del piano');
  const screenPanel=document.createElement('div');screenPanel.className='mode-screen-panel player-config-panel';
  page.parentNode.insertBefore(screen,page);page.classList.remove('hidden');screen.append(screenPanel);screenPanel.append(page);
  $('player')?.after(screen);
  const heading=page.querySelector('.sheet-heading');
  if(heading){heading.querySelector('small').textContent='AJUSTES DEL ESCENARIO';heading.querySelector('h2').textContent='Configuración del piano';}
  const tabs=[['bars','Barras y colores'],['piano','Piano'],['sound','Sonido'],['playback','Reproducción']];
  const nav=document.createElement('nav');nav.className='player-settings-tabs';nav.setAttribute('aria-label','Secciones de configuración del piano');
  const layout=document.createElement('div');layout.className='player-settings-layout';
  const content=document.createElement('main');content.className='player-settings-content';
  const preview=document.createElement('aside');preview.className='player-settings-preview';preview.setAttribute('aria-live','polite');
  const panels={};
  tabs.forEach(([id,label],index)=>{
    const button=document.createElement('button');button.type='button';button.dataset.playerSettingsTab=id;button.textContent=label;button.setAttribute('aria-controls',`playerSettings${id}`);button.setAttribute('aria-selected',String(index===0));if(index===0)button.classList.add('active');nav.append(button);
    const panel=document.createElement('section');panel.id=`playerSettings${id}`;panel.className='player-settings-tab-panel';panel.dataset.playerSettingsPanel=id;panel.setAttribute('aria-label',label);if(index)panel.classList.add('hidden');
    const title=document.createElement('h3');title.textContent=label;panel.append(title);panels[id]=panel;content.append(panel);
    button.addEventListener('click',()=>{
      nav.querySelectorAll('button').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active));});
      Object.entries(panels).forEach(([key,item])=>item.classList.toggle('hidden',key!==id));
      preview.querySelectorAll('[data-player-preview]').forEach(item=>item.classList.toggle('hidden',item.dataset.playerPreview!==id));
    });
  });
  preview.innerHTML='<h3>Vista previa</h3><section class="player-settings-preview-card" data-player-preview="bars"><small>Barras que caen</small><div class="settings-preview-stage"><i class="preview-fall-bar bar-a">Do</i><i class="preview-fall-bar bar-b">Mi</i><i class="preview-fall-bar bar-c">Sol</i><div class="settings-preview-keys"><b></b><b></b><b></b><b></b><b></b><b></b><b></b></div></div><p>La melodía conserva su estilo; los acompañamientos usan colores sólidos propios.</p></section><section class="player-settings-preview-card hidden" data-player-preview="piano"><small>Estilo de teclas</small><div class="settings-preview-keyboard" data-key-style="classic"><div class="preview-white-keys"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="preview-black-keys"><b></b><b></b><b></b><b></b><b></b></div></div><p>Vista del teclado con el estilo seleccionado.</p></section><section class="player-settings-preview-card hidden" data-player-preview="sound"><small>Efectos al tocar</small><div class="settings-preview-effects"><span>♫</span><i></i><i></i><i></i></div><p>Elige el efecto y ajusta su intensidad y duración.</p></section><section class="player-settings-preview-card hidden" data-player-preview="playback"><small>Sonido y reproducción</small><div class="settings-preview-volume"><span>♪</span><i></i></div><p>Volumen, tempo, metrónomo y mezcla de voces.</p></section>';
  const syncPreview=()=>{
    const stage=preview.querySelector('.settings-preview-stage'),bars=[...preview.querySelectorAll('.preview-fall-bar')];
    if(stage){
      stage.dataset.flow=fallingNotesStyle;stage.dataset.appearance=barStyle;stage.dataset.colorMode=barColorMode;stage.dataset.look=barLook;
      stage.style.setProperty('--preview-melody',state.keyColor);stage.style.setProperty('--preview-bass',state.bassColor);stage.style.setProperty('--preview-accent',barAccompaniment2Color);stage.style.setProperty('--preview-color2',barColor2);stage.style.setProperty('--preview-color3',barColor3);stage.style.setProperty('--preview-opacity',String(barOpacity/100));stage.style.setProperty('--preview-radius',`${barRadius}px`);stage.style.setProperty('--preview-trail',`${Math.round(barTrail*.45)}px`);
      const labels=$('showBarNotes')?.checked!==false,octaves=$('showOctaveNotes')?.checked;bars.forEach((bar,index)=>{bar.textContent=labels?`${['Do','Mi','Sol','La','Re'][index]}${octaves?`${index+3}`:''}`:'';bar.dataset.kind=index===0?'melody':index===1?'bass':'accompaniment';});
    }
    const keyboard=preview.querySelector('.settings-preview-keyboard');
    if(keyboard){keyboard.dataset.keyStyle=pianoKeyStyle;keyboard.dataset.colorOn=$('keyColorOnSwitch')?.checked===false?'off':'on';keyboard.dataset.fill=$('lightKeysSwitch')?.checked===false?'off':'on';keyboard.dataset.edge=$('keyEdgeSwitch')?.checked?'on':'off';keyboard.dataset.line=neonEdge.style;keyboard.dataset.lineOn=neonEdge.on?'on':'off';keyboard.style.setProperty('--preview-key-color',state.keyColor);keyboard.style.setProperty('--preview-edge-color',neonEdge.color);keyboard.style.setProperty('--preview-line-size',`${neonEdge.thickness}px`);keyboard.style.setProperty('--preview-line-glow',String(neonEdge.glow/100));keyboard.querySelectorAll('i').forEach((key,index)=>key.classList.toggle('is-playing',[0,3,5].includes(index)));}
    const effect=preview.querySelector('.settings-preview-effects');
    if(effect){effect.dataset.style=fxStyle;effect.dataset.enabled=fxGlow?'on':'off';effect.dataset.intensity=String(fxIntensity);effect.dataset.impactGlow=goldImpactGlow?'on':'off';effect.style.setProperty('--preview-effect-duration',`${fxDuration}s`);const glyph={smoke:'☁',gold:'✦',rings:'◉',bubbles:'◌',notes:'✧'}[fxStyle]||'♫';effect.querySelector('span').textContent=glyph;}
    const volume=preview.querySelector('.settings-preview-volume');
    if(volume){const pct=Math.max(0,Math.min(100,Number($('masterVolume')?.value??state.masterVolume*100)/2)),tempo=Number($('tempoControl')?.value||100),bpm=$('metronomeBpm')?.value||'100',voices=[...page.querySelectorAll('.voice-switch input')].filter(input=>input.checked).length;volume.style.setProperty('--preview-volume',`${pct}%`);volume.style.setProperty('--preview-tempo',`${tempo}%`);volume.style.setProperty('--preview-bpm',bpm);volume.style.setProperty('--preview-beat-duration',`${Math.max(.45,1.6/(tempo/100))}s`);volume.dataset.metronome=bpm;volume.dataset.meter=$('metronomeMeter')?.value||'4';volume.dataset.voices=voices;const readout=volume.querySelector('.preview-playback-readout');if(readout)readout.textContent=`Volumen ${Math.round(pct)}% · Tempo ${tempo}% · Metrónomo ${bpm} BPM · ${voices} voces activas`;}
  };
  preview.querySelector('.settings-preview-volume')?.insertAdjacentHTML('beforeend','<small class="preview-playback-readout"></small><div class="preview-meter"><i></i><i></i><i></i><i></i><i></i><i></i></div>');
  page.addEventListener('input',event=>{syncPreview();if(['playerMelodyColor','playerBassColor','fxIntensityInput','barRadiusInput','barOpacityInput','barTrailInput','barColorModeInput','barAccompaniment2ColorInput','neonEdgeColor','neonEdgeThickness','neonEdgeGlow'].includes(event.target.id))markPlayerLookCustom();});
  page.addEventListener('change',event=>{syncPreview();if(['fxGlowSwitch','goldImpactGlowSwitch','keyNoteIndicatorSwitch','lightKeysSwitch','keyColorOnSwitch','keyEdgeSwitch','neonEdgeOn','barBassDiffInput','deviceTheme','playerKeyLightingMode'].includes(event.target.id))markPlayerLookCustom();if(['lightKeysSwitch','keyColorOnSwitch','keyEdgeSwitch'].includes(event.target.id)){const mode=!lightKeys&&!keyEdge?'off':!lightKeys&&keyEdge?'edge':lightKeys&&!keyColorOn?'gray':'full';const selector=$('playerKeyLightingMode');if(selector)selector.value=mode;}});
  page.addEventListener('click',event=>{if(event.target.closest('[data-bar-look],[data-bar-palette],[data-bar-appearance],[data-fx-style],[data-fall-style],[data-key-style],[data-edge-style],#neonEdgeReset'))markPlayerLookCustom();requestAnimationFrame(syncPreview);});
  const addSwitch=(label,tab)=>{let group=panels[tab].querySelector('.settings-switches');if(!group){group=document.createElement('div');group.className='settings-switches';panels[tab].append(group);}group.append(label);};
  const switchRoot=page.querySelector('.settings-switches');
  if(switchRoot){[...switchRoot.querySelectorAll('label')].forEach(label=>{const id=label.querySelector('input')?.id,tab=['showBarNotes','noteLabelOutlineSwitch','showOctaveNotes'].includes(id)?'bars':['lightKeysSwitch','keyColorOnSwitch','keyEdgeSwitch','darkModeSwitch'].includes(id)?'piano':id==='fxGlowSwitch'?'sound':'piano';addSwitch(label,tab);});switchRoot.remove();}
  const move=(selector,tab)=>{const node=page.querySelector(selector);if(node)panels[tab].append(node);};
  ['#fallingStyleBlock','#barLookBlock','#barAppearanceBlock'].forEach(selector=>move(selector,'bars'));
  ['#keyStyleBlock','.neon-edge-settings'].forEach(selector=>move(selector,'piano'));
  ['#fxStyleBlock','.master-volume-block','.voice-settings','.audio-license'].forEach(selector=>move(selector,'sound'));
  page.querySelectorAll('.settings-block').forEach(block=>{if(!block.closest('.player-settings-tab-panel'))panels.playback.append(block);});
  move('.audio-license','sound');
  const quick=page.querySelector('.mobile-quick-settings')?.closest('.settings-block');if(quick)panels.playback.append(quick);
  const remaining=[...page.children].filter(node=>node!==heading&&node!==nav&&node!==layout);remaining.forEach(node=>{if(node!==switchRoot)panels.playback.append(node);});

  const titleStyle=document.createElement('label');titleStyle.className='player-basic-control';titleStyle.innerHTML='<span><strong>Presentación de la alabanza</strong><small>Elige cómo aparece el título sobre el piano.</small></span><select id="songTitleStyle"><option value="classic">Actual · escenario completo</option><option value="cinematic">Cinemática · título entre dos líneas</option><option value="black-card">Negra · título, álbum y autor</option></select>';
  titleStyle.querySelector('select').value=['cinematic','black-card'].includes(deviceSettings.songTitleStyle)?deviceSettings.songTitleStyle:'classic';
  titleStyle.querySelector('select').addEventListener('change',event=>{
    deviceSettings.songTitleStyle=['cinematic','black-card'].includes(event.target.value)?event.target.value:'classic';document.body.dataset.songPresentation=deviceSettings.songTitleStyle;document.body.classList.remove('cinematic-title-run','black-title-intro','black-title-ready');
    if(deviceSettings.songTitleStyle==='cinematic'&&state.song){void $('songTitlePresentation').offsetWidth;document.body.classList.add('song-title-visible','cinematic-title-run');}
    if(deviceSettings.songTitleStyle==='black-card'&&state.song){$('blackTitleName').textContent=state.song.song.title||'Alabanza';$('blackTitleAlbum').textContent=state.song.song.album||'';$('blackTitleComposer').textContent=state.song.song.compositor||'Ministerio YHWH';document.body.classList.add('song-title-visible','black-title-ready');}
    requestAnimationFrame(fitSongPresentationCards);
    saveDeviceSettings();
  });
  panels.playback.insertBefore(titleStyle,panels.playback.children[1]||null);

  const looks=document.createElement('section');looks.className='player-looks';looks.innerHTML='<div class="player-looks-heading"><div><h4>Looks rápidos</h4><p>Elige un estilo completo y luego ajústalo a tu gusto.</p></div><span id="playerLookStatus" class="player-look-status"></span></div><div class="player-look-grid">'+PLAYER_LOOKS.map(look=>'<button type="button" class="player-look-card" data-player-look="'+look.id+'" aria-pressed="false"><span class="player-look-preview look-'+look.id+'"><i></i><i></i><i></i><b>♩</b></span><strong>'+look.name+'</strong><small>'+look.description+'</small></button>').join('')+'</div>';
  panels.bars.insertBefore(looks,panels.bars.children[1]||null);
  looks.addEventListener('click',event=>{const button=event.target.closest('[data-player-look]');if(button)applyPlayerLook(button.dataset.playerLook);});syncPlayerLookButtons();

  const pianoColors=document.createElement('div');pianoColors.className='player-basic-colors';pianoColors.innerHTML='<label><span>Color de melodía</span><input id="playerMelodyColor" type="color"></label><label><span>Color de bajo</span><input id="playerBassColor" type="color"></label>';
  pianoColors.querySelector('#playerMelodyColor').value=state.keyColor;pianoColors.querySelector('#playerBassColor').value=state.bassColor;
  pianoColors.addEventListener('input',event=>{const source=event.target.id==='playerMelodyColor'?'keyColorPicker':'bassColorPicker';if(event.target.matches('input[type="color"]')){const input=$(source);if(input){input.value=event.target.value;input.dispatchEvent(new Event('input',{bubbles:true}));}if(event.target.id==='playerMelodyColor')deviceSettings.melodyColor=event.target.value;else deviceSettings.bassColor=event.target.value;saveDeviceSettings();}});
  panels.piano.insertBefore(pianoColors,panels.piano.children[1]||null);
  const keyMode=document.createElement('label');keyMode.className='player-basic-control';keyMode.innerHTML='<span><strong>Iluminación de teclas</strong><small>Elige cómo se resalta cada tecla al sonar.</small></span><select id="playerKeyLightingMode"><option value="full">Completa</option><option value="edge">Solo borde</option><option value="gray">Gris</option><option value="off">Apagada</option></select>';
  const keyModeValue=()=>!lightKeys&&!keyEdge?'off':!lightKeys&&keyEdge?'edge':lightKeys&&!keyColorOn?'gray':'full';keyMode.querySelector('select').value=keyModeValue();
  keyMode.querySelector('select').addEventListener('change',event=>{const settings={full:{lightKeys:true,keyColorOn:true,keyEdge:false},edge:{lightKeys:false,keyColorOn:true,keyEdge:true},gray:{lightKeys:true,keyColorOn:false,keyEdge:false},off:{lightKeys:false,keyColorOn:false,keyEdge:false}}[event.target.value];if(!settings)return;for(const [id,checked] of [['lightKeysSwitch',settings.lightKeys],['keyColorOnSwitch',settings.keyColorOn],['keyEdgeSwitch',settings.keyEdge]]){const input=$(id);if(input){input.checked=checked;input.dispatchEvent(new Event('change',{bubbles:true}));}}});
  panels.piano.insertBefore(keyMode,panels.piano.children[2]||null);

  const addAdvanced=(panel,label,nodes)=>{const list=nodes.filter(Boolean);if(!list.length)return null;const details=document.createElement('details');details.className='settings-advanced';const summary=document.createElement('summary');summary.textContent=label;const body=document.createElement('div');body.className='settings-advanced-content';details.append(summary,body);list.forEach(node=>body.append(node));panel.append(details);return details;};
  const barSwitches=panels.bars.querySelector('.settings-switches');
  const octaveLabel=barSwitches?.querySelector('#showOctaveNotes')?.closest('label');
  if(barSwitches&&octaveLabel){const octaveGroup=document.createElement('div');octaveGroup.className='settings-switches octave-visibility-setting';octaveGroup.append(octaveLabel);barSwitches.before(octaveGroup);}
  if(barSwitches)addAdvanced(panels.bars,'Etiquetas y lectura', [barSwitches]);
  const keySwitchGroup=panels.piano.querySelector('.settings-switches');
  if(keySwitchGroup){
    const keyLabels=['lightKeysSwitch','keyColorOnSwitch','keyEdgeSwitch'].map(id=>keySwitchGroup.querySelector('#'+id)?.closest('label')).filter(Boolean);
    const keyChoices=document.createElement('div');keyChoices.className='settings-switches settings-choice-list';
    keyLabels.forEach(label=>{const input=label.querySelector('input[type="checkbox"]');label.classList.add('settings-choice');if(input){const sync=()=>label.classList.toggle('is-checked',input.checked);sync();input.addEventListener('change',sync);}keyChoices.append(label);});
    addAdvanced(panels.piano,'Más opciones de iluminación',[keyChoices]);
  }
  const edgeSettings=panels.piano.querySelector('.neon-edge-settings');
  if(edgeSettings){const edgeDetails=document.createElement('details');edgeDetails.className='settings-advanced';edgeDetails.innerHTML='<summary>Personalizar la línea</summary><div class="settings-advanced-content"></div>';const edgeBody=edgeDetails.querySelector('.settings-advanced-content');edgeSettings.querySelectorAll('.range-presets,#neonEdgeColorRow,.master-volume-label,#neonEdgeThickness,#neonEdgeGlow,#neonEdgeReset').forEach(node=>edgeBody.append(node));edgeSettings.append(edgeDetails);}
  layout.append(nav,preview,content);page.append(heading,layout);
  syncPreview();
}
function setFallingNotesLookahead(value){fallingNotesLookahead=Math.min(FALLING_NOTES_MAX_LOOKAHEAD,Math.max(.8,value));}
function bindCanvasGestures(){
  const canvas=$('noteCanvas'),scroll=$('keyboardScroll');
  if(!canvas||!scroll)return;
  const IGNORE='button,input,select,textarea,summary,.stage-popover,.player-sheet,.notes-panel';
  let frame=0,pending=null;
  // Un dedo sobre el área de notas desplaza el teclado a los lados (con inercia), sin importar el zoom.
  let pan=null,panLocked=false,momentum=0;
  canvas.style.touchAction='none';
  const stopMomentum=()=>{if(momentum){cancelAnimationFrame(momentum);momentum=0;}};
  const startMomentum=v=>{
    let last=performance.now();
    const step=now=>{
      const dt=Math.min(48,now-last);last=now;
      const before=scroll.scrollLeft;scroll.scrollLeft=before+v*dt;v*=Math.pow(.94,dt/16);
      if(Math.abs(v)>.02&&scroll.scrollLeft!==before)momentum=requestAnimationFrame(step);else momentum=0;
    };
    momentum=requestAnimationFrame(step);
  };
  const spread=()=>{const [a,b]=[...canvasPointers.values()];return{dx:Math.max(28,Math.abs(a.x-b.x)),dy:Math.max(28,Math.abs(a.y-b.y)),mid:(a.x+b.x)/2};};
  // Un solo cambio por fotograma: primero zoom/scroll y luego dibujo, para que barras y teclas no se desfasen.
  const apply=()=>{
    frame=0;
    const g=canvasGesture,p=pending;pending=null;
    if(!g||!p||!g.axis)return;
    if(g.axis==='x'){
      setKeyboardZoom(g.zoom*p.dx/g.dx,{preserveCenter:false,persist:false,fast:true});
      scroll.scrollLeft=g.anchor*(state.keyboardZoom/g.zoom)-(p.mid-g.left);
      syncStageScroll();
    }else setFallingNotesLookahead(g.look*g.dy/p.dy);
  };
  pinchFlush=()=>{if(pending)apply();};
  canvas.addEventListener('pointerdown',event=>{
    if(event.target.closest(IGNORE)||canvasPointers.size>=2)return;
    try{canvas.setPointerCapture?.(event.pointerId);}catch(_){}
    canvasPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    stopMomentum();
    if(canvasPointers.size===1&&!panLocked)pan={id:event.pointerId,x:event.clientX,left:scroll.scrollLeft,lastX:event.clientX,lastT:performance.now(),v:0};
    if(canvasPointers.size===2){
      pan=null;panLocked=true;
      keyboardBaseKeyWidth();
      const s=spread(),left=scroll.getBoundingClientRect().left;
      canvasGesture={axis:null,dx:s.dx,dy:s.dy,zoom:state.keyboardZoom,look:fallingNotesLookahead,left,anchor:scroll.scrollLeft+s.mid-left};
    }
  });
  canvas.addEventListener('pointermove',event=>{
    if(!canvasPointers.has(event.pointerId))return;
    canvasPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pan&&pan.id===event.pointerId&&canvasPointers.size===1){
      event.preventDefault();
      scroll.scrollLeft=pan.left-(event.clientX-pan.x);
      const now=performance.now(),dt=now-pan.lastT;
      if(dt>0)pan.v=.7*pan.v+.3*((pan.lastX-event.clientX)/dt);
      pan.lastX=event.clientX;pan.lastT=now;
      return;
    }
    const g=canvasGesture;if(canvasPointers.size<2||!g)return;
    event.preventDefault();
    const s=spread();
    if(!g.axis){
      // El eje se decide por lo que realmente se mueven los dedos, no por cómo se apoyaron.
      const moveX=Math.abs(s.dx-g.dx),moveY=Math.abs(s.dy-g.dy);
      if(Math.max(moveX,moveY)<10)return;
      g.axis=moveX>=moveY?'x':'y';
      g.dx=s.dx;g.dy=s.dy;g.zoom=state.keyboardZoom;g.look=fallingNotesLookahead;g.anchor=scroll.scrollLeft+s.mid-g.left;
      return;
    }
    pending=s;if(!frame)frame=requestAnimationFrame(apply);
  });
  const endGesture=event=>{
    if(!canvasPointers.has(event.pointerId))return;
    if(pan&&pan.id===event.pointerId){const v=pan.v,idle=performance.now()-pan.lastT;pan=null;if(event.type==='pointerup'&&Math.abs(v)>.15&&idle<80)startMomentum(v);}
    canvasPointers.delete(event.pointerId);
    if(!canvasPointers.size)panLocked=false;
    const g=canvasGesture;
    if(canvasPointers.size<2&&g){
      if(pending)apply();
      if(frame){cancelAnimationFrame(frame);frame=0;}
      canvasGesture=null;pending=null;
      if(g.axis==='x')setKeyboardZoom(state.keyboardZoom,{preserveCenter:false});
      fallingNotesGeometry=null;
      try{localStorage.setItem('yhwh_piano_lookahead',String(fallingNotesLookahead));}catch(_){}
    }
  };
  canvas.addEventListener('pointerup',endGesture);canvas.addEventListener('pointercancel',endGesture);canvas.addEventListener('lostpointercapture',endGesture);
  ['gesturestart','gesturechange','gestureend'].forEach(type=>canvas.addEventListener(type,event=>event.preventDefault()));
}
function initializeSplash() {
  const splash = $('splashScreen');
  const enter = $('btnEntrarSplash');
  if (!splash || !enter) return;
  let autoCloseTimer = null;
  const hide = () => {
    if (splash.dataset.hidden) return;
    splash.dataset.hidden = '1';
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    splash.classList.add('splash-hide');
    setTimeout(() => {splash.remove();queueGuidedTour('home',180);}, 650);
  };
  const reveal = () => {
    if (!document.body.contains(splash) || splash.dataset.ready) return;
    splash.dataset.ready = '1';
    $('splashLoader').style.display = 'none';
    enter.classList.add('show');
    autoCloseTimer = setTimeout(hide, 8400);
  };
  enter.addEventListener('click', () => { primeAudioForInstrument(state.instrument); hide(); });
  setTimeout(reveal, 1600);
}
