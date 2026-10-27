import { SOLO_VIOLIN_ROOTS, DISTORTED_GUITAR_ROOTS, STRINGS_SAMPLE_ROOTS, VSCO2_TRUMPET_SUS_VIB_REGIONS, VSCO2_TRUMPET_PATCHES, VSCO2_UPRIGHT_PIANO_REGIONS, VSCO2_UPRIGHT_NR1_REGIONS, HEADROOM_REGIONS, SPLENDID_PP_REGIONS, SPLENDID_MP_REGIONS, SPLENDID_MF_REGIONS, SPLENDID_FF_REGIONS, SPLENDID_REGION_LAYERS, LIVINGROOM_REGIONS, MAESTRO_REGIONS, MAESTRO_LAYERS, SALAMANDER_REGIONS, SALAMANDER_LAYERS, UPRIGHT_KW_REGIONS, VSCO2_UPRIGHT_PATCHES, INSTRUMENTS } from './instrument-catalog.js';
import { EXTRA_INSTRUMENTS } from './instrument-maps.js';
// Piano YHWH: lista de canciones primero; Firebase es opcional al arrancar.
const $ = (id) => document.getElementById(id);
const safeStorageGetItem=(key)=>{try{return window.localStorage.getItem(key);}catch(_){return null;}};
const DEVICE_SETTINGS_KEY='yhwh_device_settings_v1';
const MOBILE_FIRST_VISIT_PROFILE={paletteVersion:2,theme:'dark',themeMode:'dark',palettePreset:'custom',iconSize:20,fontSize:11,headingSize:14,headingHeight:42,pianoHeaderHeight:50,homeButtonHeight:30,radius:3,noteNotation:'latino',keyStyle:'flat',noteLabelSize:15,noteLabelColor:'#ffffff',keyLabelColor:'#000000',keyLabelSize:14,octaveLabelColor:'#d4af37',octaveLabelSize:16,gridSpacing:7,stageBackgroundColor:'#000000',gridLineColor:'#454545',gridLineOpacity:55,melodyColor:'#ffb300',bassColor:'#22c55e',masterVolume:200,layerEnabled:false,layerVolume:200,fallingStyle:'bars',fxGlow:true,goldImpactGlow:true,fxStyle:'gold',fxIntensity:1,fxDuration:2.5,barLook:'normal',barBassDiff:true,barStyle:'solid',barColorMode:'track',barAccompaniment2Color:'#38bdf8'};
function seedMobileFirstVisitProfile(){
  try{
    if(!window.matchMedia?.('(max-width:900px) and (pointer:coarse)').matches||localStorage.getItem(DEVICE_SETTINGS_KEY)!==null||localStorage.getItem('piano_theme')!==null||Object.keys(localStorage).some(key=>key.startsWith('yhwh_piano_')))return;
    localStorage.setItem(DEVICE_SETTINGS_KEY,JSON.stringify(MOBILE_FIRST_VISIT_PROFILE));
    localStorage.setItem('piano_theme','dark');
    const initialPreferences={'yhwh_piano_note_labels':'octavas','yhwh_cifrado_latino':'1','yhwh_piano_show_octave':'1','yhwh_piano_note_outline':'1','yhwh_piano_edge_on':'0','yhwh_piano_key_color':MOBILE_FIRST_VISIT_PROFILE.melodyColor,'yhwh_piano_bass_color':MOBILE_FIRST_VISIT_PROFILE.bassColor,'yhwh_piano_master_volume':'2','yhwh_piano_strings_enabled':'0','yhwh_piano_strings_volume':'200','yhwh_piano_barstyle':'bars','yhwh_piano_bar_look':'normal','yhwh_piano_bar_bass_diff':'1','yhwh_piano_fx_glow':'1','yhwh_piano_fx_style':'gold'};
    Object.entries(initialPreferences).forEach(([key,value])=>localStorage.setItem(key,String(value)));
  }catch(_){}
}
seedMobileFirstVisitProfile();
const SONGS_ADORACION = Array.isArray(window.SONGS) ? window.SONGS : [];
const SONGS_JUBILO = Array.isArray(window.SONGS_JUBILO) ? window.SONGS_JUBILO : [];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_LATINO = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const NOTE_ROOT_LATINO = { C:'Do', D:'Re', E:'Mi', F:'Fa', G:'Sol', A:'La', B:'Si' };
const UPRIGHT_INSTRUMENT_IDS=[];
const NEW_INSTRUMENT_IDS=['sigex-strings','mtg-solo-sax','church-organ','vibraphone','growlybass-clean','fashionbass-clean'];
const LAST_HEARD_STORAGE_KEY = 'yhwh_last_heard_song';
function availableInstrumentId(id,fallback='grand-piano'){return id==='strings'||Object.hasOwn(INSTRUMENTS,id)?id:fallback;}
const SAVED_MASTER_VOLUME_RAW = safeStorageGetItem('yhwh_piano_master_volume');
const SAVED_MASTER_VOLUME = SAVED_MASTER_VOLUME_RAW===null?1:Number(SAVED_MASTER_VOLUME_RAW);
const state = {
  view: 'home', category: 'adoracion', song: null, melodyType:'introduccion', voiceMix:{principal:true,segunda:false,tercera:false,acordes:true}, voiceDirection:{segunda:safeStorageGetItem('yhwh_voice_second_direction')==='up'?'up':'down',tercera:safeStorageGetItem('yhwh_voice_third_direction')==='up'?'up':'down'}, pendingSong:null, pendingPurpose:'listen', admin: false, selectedSongChord:null,
  melodies: readMelodyCache(), melodyDirty:false, recording: false, recordingGuidePlaying:false, recordGuideNotes:[], recordGuideType:'', recordStart: 0, notes: [], chords: [], chordTarget: null, melodySoundEnabled:safeStorageGetItem('yhwh_melody_sound_enabled')!=='0', bassSoundEnabled:safeStorageGetItem('yhwh_bass_sound_enabled')!=='0', stringsLayerEnabled:safeStorageGetItem('yhwh_piano_strings_enabled')==='1', stringsLayerVolume:(()=>{const value=safeStorageGetItem('yhwh_piano_strings_volume');return value===null?70:Math.min(200,Math.max(0,Number.isFinite(Number(value))?Number(value):70));})(), stringsLayerAttackMs:(()=>{const value=safeStorageGetItem('yhwh_piano_strings_attack_ms');return value===null?10:Math.min(200,Math.max(0,Number.isFinite(Number(value))?Number(value):10));})(),
  buffers: new Map(), instrumentBuffers: new Map(), stringsBuffers:new Map(), sampleLoads:new Map(), instrumentSampleLoads:new Map(), stringsSampleLoads:new Map(), instrumentRoundRobinCounters:new Map(), instrument: availableInstrumentId(safeStorageGetItem('yhwh_piano_instrument')), layerInstrument: availableInstrumentId(safeStorageGetItem('yhwh_piano_layer_instrument'),'strings'), bassInstrument: availableInstrumentId(safeStorageGetItem('yhwh_piano_bass_instrument')), trumpetIntensity: ['very-soft','soft','medium','strong','very-strong'].includes(safeStorageGetItem('yhwh_piano_trumpet_intensity')) ? safeStorageGetItem('yhwh_piano_trumpet_intensity') : 'strong', headroomVelocityLayer:Math.min(5,Math.max(1,Number(safeStorageGetItem('yhwh_piano_headroom_layer'))||3)), sustain: safeStorageGetItem('yhwh_piano_sustain') === '1', octaveDoubling:safeStorageGetItem('yhwh_piano_octave_doubling')==='1', tempo:Math.min(1.5,Math.max(.5,Number(safeStorageGetItem('yhwh_piano_tempo'))||1)), playing: false, playTimers: [], activePlaybackSources:[], activePointers: new Map(), playbackPreparing:false, keyboardOctaveMidi:60, keyboardZoom:Math.min(1.8,Math.max(0.17,Number(safeStorageGetItem('yhwh_piano_keyboard_zoom'))||1)), transpose: 0, originalTonic: 'C', songTonic: null,
  notation: ['ninguno','octavas','americano','latino','movil','grados','simple'].includes(safeStorageGetItem('yhwh_piano_note_labels')) ? safeStorageGetItem('yhwh_piano_note_labels') : (safeStorageGetItem('yhwh_cifrado_latino') === '1' ? 'latino' : 'americano'), showChordNames:true, showBarNotes:safeStorageGetItem('yhwh_piano_show_bar_notes')!=='0', keyColor:/^#[0-9a-f]{6}$/i.test(safeStorageGetItem('yhwh_piano_key_color')||'')?safeStorageGetItem('yhwh_piano_key_color'):'#90dd4a', bassColor:/^#[0-9a-f]{6}$/i.test(safeStorageGetItem('yhwh_piano_bass_color')||'')?safeStorageGetItem('yhwh_piano_bass_color'):'#bb82ef', lastMidi: null, db: null, auth: null,
  ref: null, set: null, onValue: null, signIn: null, signOut: null, authListener: null
};
state.showOctaveNotes=safeStorageGetItem('yhwh_piano_show_octave')==='1';
state.thirdLayerEnabled=safeStorageGetItem('yhwh_piano_third_layer_enabled')==='1';
state.thirdLayerVolume=(()=>{const value=safeStorageGetItem('yhwh_piano_third_layer_volume');return value===null?40:Math.min(200,Math.max(0,Number.isFinite(Number(value))?Number(value):40));})();
state.thirdLayerInstrument=availableInstrumentId(safeStorageGetItem('yhwh_piano_third_layer_instrument'),'strings');
const freePlayInstrumentConfig={instrument:state.instrument,layerEnabled:state.stringsLayerEnabled,layerInstrument:state.layerInstrument,layerVolume:state.stringsLayerVolume};
state.masterVolume=Number.isFinite(SAVED_MASTER_VOLUME)?Math.max(0,Math.min(2,SAVED_MASTER_VOLUME)):1;
const DEVICE_THEME_PALETTES={light:{primary:'#176fae',accent:'#8a5a08',page:'#f3f5f7',surface:'#ffffff',optionPanel:'#f8fafc',headingBackground:'#176fae',headingText:'#ffffff',offlineCardBackground:'#eaf2f8',offlineCardText:'#1e2b38',text:'#1e2b38',line:'#d3dde6'},dark:{primary:'#287fb9',accent:'#f1c875',page:'#101820',surface:'#1a2632',optionPanel:'#1f2e3b',headingBackground:'#176fae',headingText:'#ffffff',offlineCardBackground:'#1f2e3b',offlineCardText:'#eef3f7',text:'#eef3f7',line:'#35495a'}};
const READY_COLOR_PALETTES={
  manantial:{label:'Manantial',theme:'light',colors:{...DEVICE_THEME_PALETTES.light},melody:'#90dd4a',bass:'#bb82ef',bar2:'#a259ff',bar3:'#2f6bff',barLook:'normal',barStyle:'glass'},
  medianoche:{label:'Medianoche',theme:'dark',colors:{primary:'#08cce8',accent:'#00e5b2',page:'#03070d',surface:'#0a111a',optionPanel:'#0d1722',headingBackground:'#07121c',headingText:'#e7fbff',offlineCardBackground:'#0d1722',offlineCardText:'#e7fbff',text:'#e7fbff',line:'#1e3d4a'},melody:'#43e8ff',bass:'#ffcd5f',bar2:'#1b9dff',bar3:'#a65cff',barLook:'duo',barStyle:'neon'},
  aurora:{label:'Aurora',theme:'dark',colors:{primary:'#a78bfa',accent:'#5eead4',page:'#0c1020',surface:'#171b30',optionPanel:'#1b2038',headingBackground:'#171b30',headingText:'#f3efff',offlineCardBackground:'#1b2038',offlineCardText:'#f3efff',text:'#f3efff',line:'#3a355b'},melody:'#c084fc',bass:'#34d399',bar2:'#34d399',bar3:'#38bdf8',barLook:'tri',barStyle:'synesthesia'},
  atardecer:{label:'Atardecer',theme:'light',colors:{primary:'#b84f64',accent:'#d9783f',page:'#fff5f0',surface:'#fffdfb',optionPanel:'#fff8f3',headingBackground:'#fffdfb',headingText:'#4d2930',offlineCardBackground:'#fbe8df',offlineCardText:'#4d2930',text:'#4a3333',line:'#ead2ca'},melody:'#e34f84',bass:'#ef8a38',bar2:'#f08a57',bar3:'#b94d79',barLook:'tri',barStyle:'synesthesia'},
  bosque:{label:'Bosque',theme:'dark',colors:{primary:'#4f9b70',accent:'#d6b45e',page:'#0b1511',surface:'#14221a',optionPanel:'#192a20',headingBackground:'#14221a',headingText:'#eff8ef',offlineCardBackground:'#192a20',offlineCardText:'#eff8ef',text:'#e6f0e6',line:'#36513e'},melody:'#65d989',bass:'#e4bd5f',bar2:'#cda84f',bar3:'#2d8c5b',barLook:'duo',barStyle:'glass'},
  contraste:{label:'Alto contraste',theme:'dark',colors:{primary:'#fff200',accent:'#00ffff',page:'#000000',surface:'#090909',optionPanel:'#111111',headingBackground:'#000000',headingText:'#ffffff',offlineCardBackground:'#090909',offlineCardText:'#ffffff',text:'#ffffff',line:'#ffffff'},melody:'#00ffff',bass:'#fff200',bar2:'#ff00ff',bar3:'#fff200',barLook:'duo',barStyle:'neon'},
  papel:{label:'Papel',theme:'light',colors:{primary:'#765235',accent:'#a16b2d',page:'#f4eddf',surface:'#fffaf0',optionPanel:'#faf3e7',headingBackground:'#fffaf0',headingText:'#3d3024',offlineCardBackground:'#eee3cf',offlineCardText:'#3d3024',text:'#403629',line:'#d8c8ac'},melody:'#527c49',bass:'#9b6ac2',bar2:'#c18b45',bar3:'#618a58',barLook:'duo',barStyle:'glass'}
};
const storedThemePreference=safeStorageGetItem('piano_theme');
const systemThemeIsDark=()=>!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
const deviceInitialThemeMode=['light','dark','system'].includes(storedThemePreference)?storedThemePreference:'light';
const deviceInitialTheme=deviceInitialThemeMode==='system'?(systemThemeIsDark()?'dark':'light'):deviceInitialThemeMode;
const BAR_COLOR_PRESETS=[['galaxia','Galaxia','#c05cff','#3487ff'],['oceano','Océano','#12b8d4','#2563eb'],['aurora','Aurora','#a855f7','#34d399'],['atardecer','Atardecer','#fb7185','#f59e0b'],['fuego','Fuego','#ff4d2e','#ffc247'],['bosque','Bosque','#22a06b','#d4a83d'],['dulce','Dulce','#ec4899','#8b5cf6']];
const BAR_COLOR_DEFAULTS=['#c05cff','#3487ff'];
const BAR_LOOK_OPTIONS=[['normal','Normal'],['duo','Dos colores'],['tri','Tres colores']];
const DEVICE_SETTINGS_DEFAULTS={paletteVersion:2,theme:deviceInitialTheme,themeMode:deviceInitialThemeMode,palettePreset:'manantial',font:'Inter, system-ui, Arial, sans-serif',fontSize:15,headingFont:'Inter, system-ui, Arial, sans-serif',headingColor:'#087da8',iconColor:'#ffffff',iconSize:24,headingSize:26,headingHeight:58,pianoHeaderHeight:58,mobileHeadingSize:18,homeButtonHeight:46,radius:12,...DEVICE_THEME_PALETTES[deviceInitialTheme],paletteLight:{...DEVICE_THEME_PALETTES.light},paletteDark:{...DEVICE_THEME_PALETTES.dark},backgroundImage:'',pianoImageBlur:9,pianoImageOpacity:34,brand:'Ministerio YHWH',worship:'Adoración',joy:'Júbilo',freePlay:'Reproducción libre',create:'Crear melodía',noteNotation:state.notation==='latino'?'latino':'americano',noteLabelSize:12,noteLabelColor:'#111111',keyLabelColor:'#636a6c',keyLabelSize:9,octaveLabelColor:'#bd9e00',octaveLabelSize:11,gridSpacing:4,stageBackgroundColor:"#000000",gridLineColor:"#ffffff",gridLineOpacity:55,melodyColor:state.keyColor,bassColor:state.bassColor,masterVolume:Math.round(state.masterVolume*100),layerEnabled:state.stringsLayerEnabled,layerVolume:state.stringsLayerVolume,fallingStyle:safeStorageGetItem('yhwh_piano_barstyle')||'bars',fxGlow:safeStorageGetItem('yhwh_piano_fx_glow')==='1',goldImpactGlow:true,fxStyle:(v=>v==='flow'?'gold':v==='fire'?'smoke':['smoke','gold','rings','bubbles','notes'].includes(v)?v:'smoke')(safeStorageGetItem('yhwh_piano_fx_style')),fxIntensity:2,fxDuration:3.4,keyStyle:'classic',barLook:(v=>v==='duo'||v==='tri'?v:'normal')(safeStorageGetItem('yhwh_piano_bar_look')),playerLook:'custom',songTitleStyle:'classic',barColorPreset:'galaxia',barColor2:BAR_COLOR_DEFAULTS[0],barColor3:BAR_COLOR_DEFAULTS[1],barBassDiff:safeStorageGetItem('yhwh_piano_bar_bass_diff')!=='0',barStyle:'glass',barRadius:2,barOpacity:100,barColorMode:'track',barTrail:0,barAccompaniment2Color:'#ff9f43',lightKeys:safeStorageGetItem('yhwh_piano_light_keys')!=='0'};
function readDeviceSettings(){try{const saved=JSON.parse(safeStorageGetItem(DEVICE_SETTINGS_KEY)||'{}'),themeMode=['light','dark','system'].includes(saved.themeMode)?saved.themeMode:(['light','dark','system'].includes(storedThemePreference)?storedThemePreference:saved.theme==='dark'?'dark':'light'),theme=themeMode==='system'?(systemThemeIsDark()?'dark':'light'):themeMode,settings={...DEVICE_SETTINGS_DEFAULTS,...saved,themeMode,theme,palettePreset:saved.palettePreset?(READY_COLOR_PALETTES[saved.palettePreset]?saved.palettePreset:'custom'):saved.paletteVersion===2?'custom':'manantial'},hasCurrentPalette=saved.paletteVersion===2;settings.paletteLight=hasCurrentPalette?{...DEVICE_THEME_PALETTES.light,...saved.paletteLight}:{...DEVICE_THEME_PALETTES.light};settings.paletteDark=hasCurrentPalette?{...DEVICE_THEME_PALETTES.dark,...saved.paletteDark}:{...DEVICE_THEME_PALETTES.dark};settings.paletteVersion=2;return settings;}catch(_){return {...DEVICE_SETTINGS_DEFAULTS};}}
let deviceSettings=readDeviceSettings();
if(deviceSettings.palettePreset==='manantial'){
  if(deviceSettings.paletteLight.primary==='#155c9a')deviceSettings.paletteLight.primary='#176fae';
  if(deviceSettings.paletteLight.headingBackground==='#ffffff')deviceSettings.paletteLight.headingBackground='#176fae';
  if(deviceSettings.paletteLight.headingText==='#1e2b38')deviceSettings.paletteLight.headingText='#ffffff';
  if(deviceSettings.paletteDark.primary==='#75b9ed')deviceSettings.paletteDark.primary='#287fb9';
  if(deviceSettings.paletteDark.headingBackground==='#1a2632')deviceSettings.paletteDark.headingBackground='#176fae';
  if(deviceSettings.paletteDark.headingText==='#eef3f7')deviceSettings.paletteDark.headingText='#ffffff';
  Object.assign(deviceSettings,deviceSettings[deviceSettings.theme==='dark'?'paletteDark':'paletteLight']);
}
if(READY_COLOR_PALETTES[deviceSettings.palettePreset]&&deviceSettings.iconColor?.toLowerCase()==='#ffffff'&&READY_COLOR_PALETTES[deviceSettings.palettePreset].theme==='light')deviceSettings.iconColor=deviceContrastColor(READY_COLOR_PALETTES[deviceSettings.palettePreset].colors.headingBackground);
let instrumentPickerTarget='primary';
let screenTransitionTimer = null;
let selectedSongForContinue = null;
let selectedCreateSong = null;
let selectedCreateTrack = 'melodia';
let recordAutoStopTimer=0;
let selectedPlayMode = 'listen';
let selectedModeTab = 'instructions';
let practiceRun = null;
let listPreviewRun = null;
let songListFilter = 'all';
let songIntroTimer = null;
let songIntroStartTimer = null;
let songIntroEndHandler = null;
let songIntroAutoplay = false;
let timelineFrame = 0;
let timelineDuration = 0;
let timelineStartedAt = 0;
let fallingNotesFrame = 0;
let fallingNotesRun = null;
let fallingNotesGeometry = null;
let fallingNotesCanvasInfo = null;
let fallingNotesCanvasDirty = true;
let fallingNotesResizeObserver = null;
let fallingNotesVisibilityBound = false;
let fallingNotesLastFrame = 0;
// Reloj suave: en iPhone AudioContext.currentTime avanza a saltos; se interpola con performance.now().
let playbackClockOffset = null, playbackClockLast = 0;
function resetPlaybackClock(){playbackClockOffset=null;playbackClockLast=0;}
function playbackNow(frameMs){
  const context=audioContext;if(!context)return 0;
  const perf=performance.now()/1000,audio=context.currentTime,sample=audio-perf;
  // El desfase se suaviza en ambos sentidos: currentTime en móvil avanza a saltos y esos saltos no deben mover las barras.
  // Solo se re-sincroniza de golpe si la diferencia es grande (pausa del contexto, cambio de pestaña, etc.).
  if(playbackClockOffset===null||Math.abs(sample-playbackClockOffset)>.15)playbackClockOffset=sample;
  else playbackClockOffset+=(sample-playbackClockOffset)*.03;
  // Se usa la marca de tiempo del frame (vsync) que entrega requestAnimationFrame, no el instante en que arranca el callback:
  // así el avance es uniforme aunque el hilo principal se retrase un poco en el móvil.
  const frame=(typeof frameMs==='number'&&frameMs>0)?frameMs/1000:perf;
  const value=Math.max(playbackClockLast,frame+playbackClockOffset);
  playbackClockLast=value;return value;
}
let keyBaseWidthCache = 0;
let stageGridElement = null, stageLastKeyWidth = -1, stageLastScroll = -1;
let pinchFlush = null;
const timelineCache = { elapsed:'', duration:'', ratio:-1, percent:-1, empty:null };
const FALLING_NOTES_MAX_LOOKAHEAD = 6;
let fallingNotesStyle = (()=>{try{const v=safeStorageGetItem('yhwh_piano_barstyle');return v==='melody'||v==='drops'||v==='off'?v:'bars';}catch(_){return 'bars';}})();
let fallingNotesLookahead = (()=>{try{const v=parseFloat(safeStorageGetItem('yhwh_piano_lookahead'));return v>=0.8&&v<=6?v:2.1;}catch(_){return 2.1;}})();
// Opciones de rendimiento (Ajustes). Por defecto todo queda como estaba; el usuario puede apagar cada efecto.
const SHOW_PLAYER_TIMELINE = true; // línea de tiempo (0:00 ——— 0:00) visible; pon false para quitarla
const perfOption=(key)=>{try{return safeStorageGetItem(key)!=='0';}catch(_){return true;}};
let fxGlow=(()=>{try{return safeStorageGetItem('yhwh_piano_fx_glow')==='1';}catch(_){return false;}})(); // destellos y partículas al llegar a la tecla, apagados por defecto
let noteParticlesEnabled=true;
let keyNoteIndicatorEnabled=(()=>{try{const saved=safeStorageGetItem('yhwh_piano_key_indicator');return saved===null?safeStorageGetItem('yhwh_piano_note_particles')!=='0':saved!=='0';}catch(_){return true;}})();
document.documentElement.classList.toggle('key-note-indicator-off',!keyNoteIndicatorEnabled);
let barLook=(()=>{try{return (v=>v==='duo'||v==='tri'?v:'normal')(safeStorageGetItem('yhwh_piano_bar_look'));}catch(_){return 'normal';}})(); // color de las barras: 'normal' o 'duo' (dos colores)
let barColorPreset=(()=>{const id=safeStorageGetItem('yhwh_piano_bar_palette');return BAR_COLOR_PRESETS.some(item=>item[0]===id)?id:'galaxia';})();
let barColor2=BAR_COLOR_PRESETS.find(item=>item[0]===barColorPreset)[2],barColor3=BAR_COLOR_PRESETS.find(item=>item[0]===barColorPreset)[3]; // tonos para degradar las barras
let barBassDiff=(()=>{try{return safeStorageGetItem('yhwh_piano_bar_bass_diff')!=='0';}catch(_){return true;}})(); // true: los bajos tienen su propio color; false: todo del color de la melodía
let barStyle=['glass','neon','synesthesia','solid'].includes(deviceSettings.barStyle)?deviceSettings.barStyle:'glass';
let barRadius=Math.max(0,Math.min(12,Number(deviceSettings.barRadius??2))),barOpacity=Math.max(10,Math.min(100,Number(deviceSettings.barOpacity??100))),barTrail=Math.max(0,Math.min(100,Number(deviceSettings.barTrail??0)));
let barColorMode=deviceSettings.barColorMode==='note'?'note':'track',barAccompaniment2Color=/^#[0-9a-f]{6}$/i.test(deviceSettings.barAccompaniment2Color||'')?deviceSettings.barAccompaniment2Color:'#ff9f43';
let pianoKeyStyle=['flat','realistic','synthesia'].includes(deviceSettings.keyStyle)?deviceSettings.keyStyle:'classic';
const FX_STYLES=['smoke','gold','rings','bubbles','notes'];
let fxStyle=deviceSettings.fxStyle==='flow'?'gold':deviceSettings.fxStyle==='fire'?'smoke':FX_STYLES.includes(deviceSettings.fxStyle)?deviceSettings.fxStyle:'smoke';deviceSettings.fxStyle=fxStyle;
let goldImpactGlow=deviceSettings.goldImpactGlow!==false;
let fxIntensity=Math.max(1,Math.min(3,Number(deviceSettings.fxIntensity)||2)),fxDuration=Math.max(1,Math.min(6,Number(deviceSettings.fxDuration)||3.4));
const fxIntensityScale=()=>[0,.7,1,1.35][fxIntensity]||1;
let lightKeys=perfOption('yhwh_piano_light_keys');  // encender las teclas mientras suena la melodía
let keyEdge=(()=>{try{return safeStorageGetItem('yhwh_piano_key_edge')==='1';}catch(_){return false;}})(); // destello ligero solo en el borde de la tecla (apagado por defecto)
let keyColorOn=perfOption('yhwh_piano_key_color_on'); // color en las teclas encendidas (apagado = gris neutro)
// Línea luminosa (turquesa por defecto) sobre las teclas: se puede mostrar/ocultar, cambiar de color, grosor y resplandor en Ajustes.
const NEON_EDGE_DEFAULTS={on:true,style:'turq',color:'#2ff3e0',thickness:3,glow:100};
const neonEdge=(()=>{const num=(k,d,lo,hi)=>{const v=parseFloat(safeStorageGetItem(k));return v>=lo&&v<=hi?v:d;},c=safeStorageGetItem('yhwh_piano_edge_color');
  return {on:safeStorageGetItem('yhwh_piano_edge_on')!=='0',style:safeStorageGetItem('yhwh_piano_edge_style')==='flame'?'flame':'turq',color:/^#[0-9a-f]{6}$/i.test(c||'')?c:NEON_EDGE_DEFAULTS.color,thickness:num('yhwh_piano_edge_thickness',NEON_EDGE_DEFAULTS.thickness,1,10),glow:num('yhwh_piano_edge_glow',NEON_EDGE_DEFAULTS.glow,0,150)};})();
function applyNeonEdge(){
  const m=/^#([0-9a-f]{6})$/i.exec(neonEdge.color),v=m?parseInt(m[1],16):0x2ff3e0;
  document.documentElement.classList.toggle('neon-edge-enabled',neonEdge.on);
  document.querySelectorAll('.neon-edge').forEach(el=>{
    el.style.setProperty('--neon-rgb',`${v>>16&255},${v>>8&255},${v&255}`);
    el.style.setProperty('--neon-thickness',neonEdge.thickness+'px');
    el.style.setProperty('--neon-glow',String(neonEdge.glow/100));
    el.classList.toggle('is-off',!neonEdge.on||neonEdge.style==='flame');
  });
}
function saveNeonEdge(){try{localStorage.setItem('yhwh_piano_edge_on',neonEdge.on?'1':'0');localStorage.setItem('yhwh_piano_edge_style',neonEdge.style);localStorage.setItem('yhwh_piano_edge_color',neonEdge.color);localStorage.setItem('yhwh_piano_edge_thickness',String(neonEdge.thickness));localStorage.setItem('yhwh_piano_edge_glow',String(neonEdge.glow));}catch(_){}}
function syncNeonEdgeControls(){
  const on=$('neonEdgeOn'),color=$('neonEdgeColor'),th=$('neonEdgeThickness'),gl=$('neonEdgeGlow');
  if(on)on.checked=neonEdge.on;if(color)color.value=neonEdge.color;
  document.querySelectorAll('[data-edge-style]').forEach(b=>{const act=b.dataset.edgeStyle===neonEdge.style;b.classList.toggle('active',act);b.setAttribute('aria-pressed',act?'true':'false');});
  if($('neonEdgeColorRow'))$('neonEdgeColorRow').style.display=neonEdge.style==='flame'?'none':'';
  if(th)th.value=neonEdge.thickness;if($('neonEdgeThicknessValue'))$('neonEdgeThicknessValue').textContent=neonEdge.thickness+' px';
  if(gl)gl.value=neonEdge.glow;if($('neonEdgeGlowValue'))$('neonEdgeGlowValue').textContent=neonEdge.glow+'%';
}
function setupNeonEdgeControls(){
  const change=()=>{applyNeonEdge();saveNeonEdge();syncNeonEdgeControls();fnRefreshIdleLine();};
  document.querySelectorAll('[data-edge-style]').forEach(b=>{b.onclick=()=>{neonEdge.style=b.dataset.edgeStyle==='flame'?'flame':'turq';if(!neonEdge.on)neonEdge.on=true;change();};});
  if($('neonEdgeOn'))$('neonEdgeOn').onchange=e=>{neonEdge.on=e.target.checked;change();};
  if($('neonEdgeColor'))$('neonEdgeColor').oninput=e=>{neonEdge.color=e.target.value;applyNeonEdge();saveNeonEdge();};
  if($('neonEdgeThickness'))$('neonEdgeThickness').oninput=e=>{neonEdge.thickness=Number(e.target.value);change();};
  if($('neonEdgeGlow'))$('neonEdgeGlow').oninput=e=>{neonEdge.glow=Number(e.target.value);change();};
  if($('neonEdgeReset'))$('neonEdgeReset').onclick=()=>resetNeonEdge();
  syncNeonEdgeControls();applyNeonEdge();fnRefreshIdleLine();
}
// Letra de las notas dentro de las barras: blanca con borde negro (opcional, móvil y PC).
let noteLabelOutline=safeStorageGetItem('yhwh_piano_note_outline')==='1';
function setNoteLabelOutline(on,save=true){noteLabelOutline=!!on;document.body.classList.toggle('note-label-outline',noteLabelOutline);const sw=$('noteLabelOutlineSwitch');if(sw)sw.checked=noteLabelOutline;if(save){try{localStorage.setItem('yhwh_piano_note_outline',noteLabelOutline?'1':'0');}catch(_){}}}
function resetNeonEdge(){Object.assign(neonEdge,NEON_EDGE_DEFAULTS);saveNeonEdge();applyNeonEdge();syncNeonEdgeControls();fnRefreshIdleLine();}
let offlineAudioDownloadRunning = false;
let metronomeOn = false;
let metronomeTimer = null;
let metronomeNextBeat = 0;
let metronomeBeatIndex = 0;
let metronomeVisualTimers = [];
let metronomeTaps = [];
let chordEditorOpen = false;
const canvasPointers = new Map();
let canvasGesture = null;
let metronomeBpm = Math.min(240, Math.max(40, Number(safeStorageGetItem('yhwh_piano_metronome_bpm')) || 100));
let metronomeMeter = ['2', '3', '4', '6'].includes(safeStorageGetItem('yhwh_piano_metronome_meter')) ? Number(safeStorageGetItem('yhwh_piano_metronome_meter')) : 4;

function readMelodyCache() {
  try { return JSON.parse(safeStorageGetItem('yhwh_melodias_cache') || '{}') || {}; }
  catch (_) { return {}; }
}
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 2400); }
function canonicalNoteName(midi) { return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1); }
function noteName(midi) {
  const names = state.notation === 'latino' ? NOTE_NAMES_LATINO : NOTE_NAMES;
  return names[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}
function fallingNoteName(midi){const pitch=((midi%12)+12)%12;return deviceSettings.noteNotation==='latino'?NOTE_NAMES_LATINO[pitch]:NOTE_NAMES[pitch].replace('#','♯');}
function keyboardLabel(midi) {
  const pitch=((midi%12)+12)%12, octave=Math.floor(midi/12)-1;
  if(state.notation==='ninguno')return '';
  if(state.notation==='octavas')return pitch===0?`C${octave}`:'';
  if(state.notation==='simple')return NOTE_NAMES[pitch].replace('#','♯');
  if(state.notation==='movil'||state.notation==='grados'){
    const tonic=state.song?(transposedTonic()||state.songTonic||'C'):'C', rootName=tonic.replace(/m$/,''), root=NOTE_NAMES.indexOf(rootName);
    const intervals=tonic.endsWith('m')?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
    const relative=(pitch-root+12)%12, degree=intervals.indexOf(relative);
    const upper=intervals.findIndex(item=>item>relative),lower=Math.max(0,upper-1);
    if(state.notation==='grados')return degree>=0?String(degree+1):upper<0?'♭1':relative-intervals[lower]<(intervals[upper]-relative)?`♯${lower+1}`:`♭${upper+1}`;
    const syllables=tonic.endsWith('m')?['La','Si','Do','Re','Mi','Fa','Sol']:['Do','Re','Mi','Fa','Sol','La','Si'];
    const chromatic=tonic.endsWith('m')?['La','Li','Si','Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Ti']:['Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Si','La','Li','Ti'];
    return degree>=0?syllables[degree]:chromatic[relative]||'Do';
  }
  if(state.notation==='latino'){const name=NOTE_NAMES_LATINO[pitch];return pitch===0?`${name}${octave}`:name;}
  return noteName(midi);
}
function melodyFor(category, id) { return state.melodies[category]?.[String(id)] || null; }
const SONG_TRACK_TYPES=['melodia','acompanamiento1','acompanamiento2','introduccion','voz'];
const SONG_TRACK_LABELS={melodia:'Melodía',acompanamiento1:'Acompañamiento 1',acompanamiento2:'Acompañamiento 2',introduccion:'Introducción',voz:'Voz principal'};
function melodyTracks(record){
  const tracks={introduccion:null,voz:null,melodia:null,acompanamiento1:null,acompanamiento2:null,trackSettings:{}};
  if(!record)return tracks;
  if(Array.isArray(record.notas)){tracks.introduccion=record;return tracks;}
  SONG_TRACK_TYPES.forEach(type=>{tracks[type]=record[type]||null;});
  Object.entries(record.melodiasAlternas||{}).forEach(([id,variation])=>{tracks[`melodiaAlterna_${id}`]=variation?.track||null;});
  tracks.trackSettings=record.trackSettings&&typeof record.trackSettings==='object'?record.trackSettings:{};
  tracks.alternateMelodyNames=Object.fromEntries(Object.entries(record.melodiasAlternas||{}).map(([id,item])=>[id,String(item?.nombre||'Melodía alternativa') ]));
  return tracks;
}
function serializeMelodyTracks(source,tracks){
  const stored=source&&typeof source==='object'&&!Array.isArray(source.notas)?{...source}:{};
  delete stored.notas;
  SONG_TRACK_TYPES.forEach(type=>{if(tracks[type])stored[type]=tracks[type];else delete stored[type];});
  const alternates={};Object.keys(tracks.alternateMelodyNames||{}).forEach(id=>{alternates[id]={nombre:tracks.alternateMelodyNames[id]||'Melodía alternativa',track:tracks[`melodiaAlterna_${id}`]||null};});
  if(Object.keys(alternates).length)stored.melodiasAlternas=alternates;else delete stored.melodiasAlternas;
  if(Object.keys(tracks.trackSettings||{}).length)stored.trackSettings=tracks.trackSettings;else delete stored.trackSettings;
  return stored;
}
function songTrackLabel(type,category=selectedCreateSong?.category,id=selectedCreateSong?.song?.id){if(SONG_TRACK_LABELS[type])return SONG_TRACK_LABELS[type];const key=String(type||'').startsWith('melodiaAlterna_')?String(type).slice('melodiaAlterna_'.length):'';return key?(melodyFor(category,id)?.melodiasAlternas?.[key]?.nombre||'Melodía alternativa'):'Introducción';}
function trackFor(category,id,type=state.melodyType){return melodyTracks(melodyFor(category,id))[type]||null;}
function hasTrack(category,id,type){return !!trackFor(category,id,type)?.notas?.length;}
function hasMelody(category, id) { return SONG_TRACK_TYPES.some(type=>hasTrack(category,id,type)); }
function hasCompleteCreateSet(category,id){return ['melodia','acompanamiento1','acompanamiento2'].every(type=>hasTrack(category,id,type));}
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

