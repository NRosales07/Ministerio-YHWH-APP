async function downloadOfflineAudio() {
  const status=$('offlineStatus');
  if (offlineAudioDownloadRunning) return;
  if (!('serviceWorker' in navigator)) { status.textContent='Este navegador no permite guardar sonidos para usarlos sin conexión.'; return; }
  if(navigator.onLine){offlineAudioDownloadRunning=true;status.textContent='Preparando descarga automática de sonidos…';}
  try {
    try{await navigator.storage?.persist?.();}catch(_){}
    const registration=await navigator.serviceWorker.ready;
    if(navigator.onLine)await registration.update();
    if(registration.installing){
      const installing=registration.installing;
      await new Promise(resolve=>{
        const check=()=>{if(installing.state==='activated'||installing.state==='redundant'){installing.removeEventListener('statechange',check);resolve();}};
        installing.addEventListener('statechange',check);check();
      });
    }
    const worker=registration.active||navigator.serviceWorker.controller;
    if (!worker) throw new Error('El trabajador sin conexión no está disponible.');
    worker.postMessage({type:'GET_AUDIO_CACHE_STATUS'});
    if(navigator.onLine)worker.postMessage({type:'CACHE_ALL_AUDIO'});
  } catch(error) {
    offlineAudioDownloadRunning=false;
    status.textContent=navigator.onLine?'La descarga automática se reintentará cuando haya conexión.':'No se pudo consultar cuántos sonidos están guardados.';
    console.error('Error iniciando la descarga sin conexión:',error);
  }
}
function moveKeyboardOctave(direction) {
  state.keyboardOctaveMidi = Math.max(24, Math.min(96, state.keyboardOctaveMidi + direction * 12));
  const scroll = $('keyboardScroll');
  const targetKey = document.querySelector(`.key.white[data-midi="${state.keyboardOctaveMidi}"]`);
  $('keyboardOctaveLabel').textContent = canonicalNoteName(state.keyboardOctaveMidi);
  if (!scroll || !targetKey) return;
  const keyLeft = targetKey.getBoundingClientRect().left - scroll.getBoundingClientRect().left + scroll.scrollLeft;
  const left = keyLeft - (scroll.clientWidth - targetKey.offsetWidth) / 2;
  scroll.scrollTo({ left: Math.max(0, Math.min(scroll.scrollWidth-scroll.clientWidth, left)), behavior:'smooth' });syncStageScroll();
}
function setKeyboardZoomByKey(direction){
  const scroll=$('keyboardScroll'),base=keyboardBaseKeyWidth();if(!scroll||!base||!scroll.clientWidth)return;
  const visibleKeys=scroll.clientWidth/(base*state.keyboardZoom)*12/7;
  const targetKeys=Math.max(1,visibleKeys+(direction>0?-1:1));
  const nextZoom=scroll.clientWidth/(base*(targetKeys*7/12));
  setKeyboardZoom(nextZoom);
}
function setKeyboardPreset(keyCount){
  const scroll=$('keyboardScroll'),first=$('keyboard').querySelector('.keys');if(!scroll||!first)return;
  if(keyCount===88){setKeyboardZoom(scroll.clientWidth/(first.getBoundingClientRect().width/state.keyboardZoom*52));}
  else {const whites=Math.ceil(keyCount*7/12),baseWidth=first.getBoundingClientRect().width/state.keyboardZoom;setKeyboardZoom(scroll.clientWidth/(baseWidth*whites));}
}
// Si el piano queda más angosto que el ancho disponible (p. ej. en PC al agrandar la ventana), sube el zoom hasta llenarlo.
let keyboardClampFrame=0;
function scheduleKeyboardClamp(){if(!keyboardClampFrame)keyboardClampFrame=requestAnimationFrame(clampKeyboardZoomToWidth);}
function clampKeyboardZoomToWidth(){
  keyboardClampFrame=0;const scroll=$('keyboardScroll');if(!scroll||!scroll.clientWidth)return;
  const base=keyboardBaseKeyWidth();if(!(base>0))return;
  const minZoom=Math.max(.17,scroll.clientWidth/(base*52));
  if(state.keyboardZoom<minZoom-.0005)setKeyboardZoom(minZoom,{preserveCenter:false,persist:false});
}
function keyboardBaseKeyWidth() {
  if(keyBaseWidthCache>0)return keyBaseWidthCache;
  const first=$('keyboard').querySelector('.keys');
  const width=first&&state.keyboardZoom?first.getBoundingClientRect().width/state.keyboardZoom:0;
  if(width>0)keyBaseWidthCache=width;
  return width;
}
function setKeyboardZoom(nextZoom,{preserveCenter=true,persist=true,fast=false}={}) {
  const scroll=$('keyboardScroll'),previousZoom=state.keyboardZoom,base=keyboardBaseKeyWidth();
  const minZoom=base>0&&scroll&&scroll.clientWidth>0?Math.max(.17,scroll.clientWidth/(base*52)):.17; // nunca menos que lo que llena el ancho: sin espacio negro a la derecha
  const oldCenter=!fast&&scroll?scroll.scrollLeft+scroll.clientWidth/2:0;
  state.keyboardZoom = Math.max(minZoom, Math.min(1.8, Math.round(nextZoom * 1000) / 1000));
  $('keyboard').style.setProperty('--keyboard-zoom', state.keyboardZoom);
  if(fast)return; // durante el pinch solo se aplica el zoom; la interfaz se actualiza al soltar
  const slider=$('keyboardZoomSlider');if(slider){slider.min=String(Math.floor(minZoom*100));slider.max=String(Math.max(180,Math.ceil(minZoom*100)));slider.value=String(Math.round(state.keyboardZoom*100));}
  if($('keyboardZoomValue'))$('keyboardZoomValue').textContent=`${Math.round(state.keyboardZoom*100)}%`;
  const visibleCount=scroll&&base?scroll.clientWidth/(base*state.keyboardZoom)*12/7:0;
  document.querySelectorAll('[data-key-range]').forEach(button=>{const value=Number(button.dataset.keyRange);button.classList.toggle('active',value>0&&Math.abs(visibleCount-value)<Math.max(2,value*.09));});
  if(persist){try { localStorage.setItem('yhwh_piano_keyboard_zoom', String(state.keyboardZoom)); } catch (_) {}}
  if(scroll){requestAnimationFrame(()=>{if(preserveCenter)scroll.scrollLeft=Math.max(0,oldCenter*(state.keyboardZoom/previousZoom)-scroll.clientWidth/2);syncStageScroll();});}
}
function initializeFirebase() {
  import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js').then(async appModule => {
    const [database, firebaseAuth] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js')
    ]);
    const config = {
      apiKey: 'AIzaSyB6JmsE_hV2WUGysjIavaVA-h6gmR3F8q4',
      authDomain: 'ministerio-yhwh.firebaseapp.com',
      databaseURL: 'https://ministerio-yhwh-default-rtdb.firebaseio.com',
      projectId: 'ministerio-yhwh', storageBucket: 'ministerio-yhwh.firebasestorage.app',
      messagingSenderId: '791956376967', appId: '1:791956376967:web:b2b0a30fb5e302213f9722'
    };
    const app = appModule.initializeApp(config, 'piano-app');
    state.db = database.getDatabase(app); state.ref = database.ref; state.set = database.set; state.onValue = database.onValue;
    state.auth = firebaseAuth.getAuth(app); state.signIn = firebaseAuth.signInWithEmailAndPassword; state.signOut = firebaseAuth.signOut;
    state.authListener = firebaseAuth.onAuthStateChanged;
    state.authListener(state.auth, user => {
      state.admin = !!(user && user.email === 'rosalesjrnain07@gmail.com');
      updateAdminControls(); renderLists();
    });
    state.onValue(state.ref(state.db, 'melodias'), snapshot => {
      state.melodies = snapshot.val() || {};
      try { localStorage.setItem('yhwh_melodias_cache', JSON.stringify(state.melodies)); } catch (_) {}
      $('connection').textContent = '🌐 Sincronizado con la web'; $('connection').className = 'connection online';
      renderLists();
      if (state.song && !state.melodyDirty) {
        const syncedMelody=trackFor(state.song.category,state.song.song.id,state.melodyType)||{};
        state.notes = (syncedMelody.notas||[]).map(note => ({ ...note }));
        state.chords = (syncedMelody.acordes||[]).map(chord => ({ ...chord }));
        state.originalTonic = parseTonic(syncedMelody.tono) || state.songTonic || 'C'; state.transpose = 0;
        updateTrackTimeline();
        renderChordPresets(); updateTransposeUI(); renderRecorded(); $('playerLabel').textContent = `${SONG_TRACK_LABELS[state.melodyType]||'Introducción'}${syncedMelody.notas?.length?' · Guardada':''}`; updateAdminControls();
      }
    }, () => {
      $('connection').textContent = '📴 Sin conexión con Firebase'; $('connection').className = 'connection offline';
    });
  }).catch(error => {
    $('connection').textContent = '📴 Sin conexión con Firebase; puedes navegar las canciones.';
    $('connection').className = 'connection offline';
    console.warn('Firebase no disponible:', error);
  });
}

let deviceSettingsSaveTimer=0;
function scheduleDeviceSettingsSave(){clearTimeout(deviceSettingsSaveTimer);deviceSettingsSaveTimer=setTimeout(()=>{deviceSettingsSaveTimer=0;saveDeviceSettings();},350);}
function saveDeviceSettings(){if(deviceSettingsSaveTimer){clearTimeout(deviceSettingsSaveTimer);deviceSettingsSaveTimer=0;}try{localStorage.setItem(DEVICE_SETTINGS_KEY,JSON.stringify(deviceSettings));}catch(_){$('deviceBackgroundStatus')&&($('deviceBackgroundStatus').textContent='No hay espacio para guardar la personalización en este dispositivo.');}}
function syncThemeToggleButtons(){
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  ['themeToggle','songThemeToggle','createThemeToggle'].forEach(id=>{const button=$(id);if(button){button.textContent=dark?'☀️':'🌙';button.setAttribute('aria-label',dark?'Cambiar a modo claro':'Cambiar a modo oscuro');button.title=dark?'Modo claro':'Modo oscuro';}});
  const tile=$('homeThemeTile');if(tile){const themeIcon=tile.querySelector('.home-action-icon img');if(themeIcon)themeIcon.src=`assets/home-icons/${dark?'sun':'moon'}.svg`;tile.querySelector('[data-theme-label]').textContent=dark?'Tema claro':'Tema oscuro';tile.setAttribute('aria-label',dark?'Cambiar a modo claro':'Cambiar a modo oscuro');tile.title=dark?'Modo claro':'Modo oscuro';}
}
function setDeviceTheme(themeMode){
  const mode=['light','dark','system'].includes(themeMode)?themeMode:'light',next=mode==='system'?(systemThemeIsDark()?'dark':'light'):mode;deviceSettings.themeMode=mode;deviceSettings.theme=next;
  if(deviceSettings.theme==='dark')document.documentElement.setAttribute('data-theme','dark');else document.documentElement.removeAttribute('data-theme');
  try{localStorage.setItem('piano_theme',mode);}catch(_){}
  syncThemeToggleButtons();
  if($('deviceTheme'))$('deviceTheme').value=mode;
  applyDeviceCustomization();saveDeviceSettings();
}
function deviceContrastColor(hex){
  const match=/^#([0-9a-f]{6})$/i.exec(hex||'');if(!match)return '#ffffff';
  const channels=[0,2,4].map(index=>parseInt(match[1].slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]>.42?'#10202c':'#ffffff';
}
function applyReadyColorPalette(id){
  const preset=READY_COLOR_PALETTES[id];if(!preset)return;
  const paletteKey=preset.theme==='dark'?'paletteDark':'paletteLight';deviceSettings[paletteKey]={...preset.colors};deviceSettings.palettePreset=id;
  deviceSettings.iconColor=deviceContrastColor(preset.colors.headingBackground||preset.colors.primary);
  deviceSettings.melodyColor=preset.melody;deviceSettings.bassColor=preset.bass;state.keyColor=preset.melody;state.bassColor=preset.bass;
  try{localStorage.setItem('yhwh_piano_key_color',state.keyColor);localStorage.setItem('yhwh_piano_bass_color',state.bassColor);}catch(_){}
  setBarColorPreset(({medianoche:'oceano',papel:'bosque',contraste:'fuego',manantial:'galaxia'})[id]||(BAR_COLOR_PRESETS.some(item=>item[0]===id)?id:'galaxia'));setBarLook(preset.barLook);setBarAppearance(preset.barStyle);
  setDeviceTheme(preset.theme);updateVisualOptions();populateDeviceSettingsForm();updateDeviceSettingsPreview();saveDeviceSettings();
}
function applyDeviceCustomization(){
  const palette=deviceSettings[deviceSettings.theme==='dark'?'paletteDark':'paletteLight']||DEVICE_THEME_PALETTES[deviceSettings.theme==='dark'?'dark':'light'];
  Object.assign(deviceSettings,palette);
  deviceSettings.headingColor=deviceSettings.headingText||deviceSettings.headingColor;
  const root=document.documentElement;root.classList.add('device-customization-enabled');root.dataset.pianoKeyStyle=pianoKeyStyle;document.body.dataset.songPresentation=['cinematic','black-card'].includes(deviceSettings.songTitleStyle)?deviceSettings.songTitleStyle:'classic';
  const css={
    '--device-primary-color':deviceSettings.primary,'--device-primary-text':deviceContrastColor(deviceSettings.primary),
    '--gold':deviceSettings.primary,'--gold2':deviceSettings.accent,'--bg':deviceSettings.page,'--panel':deviceSettings.surface,
    '--panel2':`color-mix(in srgb, ${deviceSettings.surface} 84%, ${deviceSettings.primary})`,'--line':deviceSettings.line,'--text':deviceSettings.text,
    '--muted':`color-mix(in srgb, ${deviceSettings.text} 65%, transparent)`,'--device-page-color':deviceSettings.page,'--device-surface-color':deviceSettings.surface,
    '--device-text-color':deviceSettings.text,'--device-line-color':deviceSettings.line,'--device-option-panel-color':deviceSettings.optionPanel||deviceSettings.surface,'--device-heading-background':deviceSettings.headingBackground||deviceSettings.primary,'--device-heading-text':deviceSettings.headingText||'#ffffff','--device-offline-card-background':deviceSettings.offlineCardBackground||deviceSettings.surface,'--device-offline-card-text':deviceSettings.offlineCardText||deviceSettings.text,'--device-font':deviceSettings.font,'--device-font-size':`${deviceSettings.fontSize}px`,
    '--device-heading-size':`${deviceSettings.headingSize}px`,'--device-heading-height':`${deviceSettings.headingHeight||58}px`,'--device-piano-header-height':`${deviceSettings.pianoHeaderHeight||58}px`,'--device-heading-font':deviceSettings.headingFont,'--device-heading-color':deviceSettings.headingText||deviceSettings.headingColor,'--device-icon-color':deviceSettings.iconColor,'--device-icon-size':`${deviceSettings.iconSize||24}px`,'--device-mobile-heading-size':`${deviceSettings.mobileHeadingSize||18}px`,'--device-mobile-menu-button-height':`${deviceSettings.homeButtonHeight||46}px`,'--device-radius':`${deviceSettings.radius}px`,'--device-note-label-size':`${deviceSettings.noteLabelSize}px`,
    '--device-note-label-color':deviceSettings.noteLabelColor||'#111111','--device-key-label-color':deviceSettings.keyLabelColor||'#636a6c','--device-key-label-size':`${deviceSettings.keyLabelSize||9}px`,'--device-octave-label-color':deviceSettings.octaveLabelColor||'#bd9e00','--device-octave-label-size':`${deviceSettings.octaveLabelSize||11}px`,'--device-piano-image-blur':`${deviceSettings.pianoImageBlur||0}px`,'--device-piano-image-opacity':`${Number(deviceSettings.pianoImageOpacity??34)/100}`,'--device-accent-color':deviceSettings.accent,
    '--device-melody-color':deviceSettings.melodyColor,'--device-bass-color':deviceSettings.bassColor,'--device-stage-background':deviceSettings.stageBackgroundColor||'#000000','--device-grid-line-color':deviceSettings.gridLineColor||'#ffffff','--device-grid-line-opacity':`${Math.max(0,Math.min(100,Number(deviceSettings.gridLineOpacity??55)))}%`
  };
  Object.entries(css).forEach(([name,value])=>root.style.setProperty(name,value));
  const themeColorMeta=document.querySelector('meta[name="theme-color"]');if(themeColorMeta)themeColorMeta.content=deviceSettings.page;
  const base=Number.parseFloat(getComputedStyle(document.querySelector('#noteCanvas')||document.body).getPropertyValue('--stage-key-width'))||40;
  const gridSpacing=Math.max(1,Math.min(12,Number(deviceSettings.gridSpacing)||4)),gridSize=`calc(${Array(gridSpacing).fill(`var(--stage-key-width, ${base}px)`).join(' + ')})`;
  root.style.setProperty('--device-grid-spacing',gridSize);
  const stageGrid=document.querySelector('#noteCanvas .canvas-grid');if(stageGrid){stageGrid.style.setProperty('background-size',`${gridSize} 100%,100% 100%`,'important');stageGrid.style.setProperty('--stage-key-width',`${base}px`);}
  const deviceBackground=`linear-gradient(135deg,${deviceSettings.page},${deviceSettings.surface})`;
  root.style.setProperty('--device-home-background',deviceBackground);
  root.style.setProperty('--device-app-background',deviceBackground);
  root.style.setProperty('--device-piano-background-image',deviceSettings.backgroundImage?`url("${deviceSettings.backgroundImage}")`:'none');
  $('noteCanvas')?.classList.toggle('has-device-background',!!deviceSettings.backgroundImage);
  if(deviceSettings.theme==='dark')root.setAttribute('data-theme','dark');else root.removeAttribute('data-theme');
  const brand=$('homeBtn')?.querySelector('b');if(brand)brand.textContent=deviceSettings.brand;
  const actionTexts=[['[data-view="adoracion"] b',deviceSettings.worship],['[data-view="jubilo"] b',deviceSettings.joy],['#freePlayBtn b',deviceSettings.freePlay],['[data-view="crear"] b',deviceSettings.create]];
  actionTexts.forEach(([selector,text])=>{const target=document.querySelector(selector);if(target)target.textContent=text;});
  if($('devicePreviewBrand'))$('devicePreviewBrand').textContent=deviceSettings.brand;
  const preview=$('devicePreviewCard');if(preview){preview.style.fontFamily=deviceSettings.font;preview.style.fontSize=`${deviceSettings.fontSize}px`;preview.style.borderRadius=`${deviceSettings.radius}px`;preview.style.color=deviceSettings.text;preview.style.backgroundColor=deviceSettings.surface;preview.style.backgroundImage=`linear-gradient(145deg,${deviceSettings.surface},${deviceSettings.page})`;}
  if($('devicePreviewHeading')){$('devicePreviewHeading').style.color=deviceSettings.headingText||deviceSettings.headingColor;$('devicePreviewHeading').style.background=deviceSettings.headingBackground||deviceSettings.primary;$('devicePreviewHeading').style.padding='7px 10px';$('devicePreviewHeading').style.borderRadius='7px';$('devicePreviewHeading').style.fontFamily=deviceSettings.headingFont;$('devicePreviewHeading').style.fontSize=`${deviceSettings.headingSize}px`;}
  if($('devicePreviewIcon')){$('devicePreviewIcon').style.color=deviceSettings.iconColor;$('devicePreviewIcon').style.fontSize=`${deviceSettings.iconSize||24}px`;}
  const previewKeys=$('devicePianoPreview')?.querySelector('.device-piano-preview-keys');if(previewKeys)previewKeys.dataset.keyStyle=pianoKeyStyle;
  if($('devicePreviewButton')){$('devicePreviewButton').style.background=deviceSettings.primary;$('devicePreviewButton').style.borderRadius=`${deviceSettings.radius}px`;}
  ['devicePreviewNote','devicePreviewPianoNote'].forEach(id=>{const note=$(id);if(note){note.textContent=fallingNoteName(60);note.style.color=deviceSettings.noteLabelColor||'#111111';note.style.fontSize=`${deviceSettings.noteLabelSize}px`;}});
  const keyLabelPreview=$('devicePreviewKeyLabel');if(keyLabelPreview){keyLabelPreview.style.color=deviceSettings.keyLabelColor;keyLabelPreview.style.fontSize=`${deviceSettings.keyLabelSize}px`;}
  const octaveLabelPreview=$('devicePreviewOctaveLabel');if(octaveLabelPreview){octaveLabelPreview.style.color=deviceSettings.octaveLabelColor;octaveLabelPreview.style.fontSize=`${deviceSettings.octaveLabelSize}px`;}
  const previewBg=$('devicePianoPreview')?.querySelector('.device-piano-preview-bg');if(previewBg){previewBg.style.backgroundImage=deviceSettings.backgroundImage?`url("${deviceSettings.backgroundImage}")`:'none';previewBg.style.filter=`blur(${deviceSettings.pianoImageBlur||0}px)`;previewBg.style.opacity=String(Number(deviceSettings.pianoImageOpacity??34)/100);}
  const previewBar=$('devicePreviewPianoNote')?.parentElement;if(previewBar){previewBar.style.background=deviceSettings.melodyColor;previewBar.style.color=deviceSettings.noteLabelColor||'#111111';}
  const soundBar=$('devicePreviewStyle');if(soundBar)soundBar.textContent=({bars:'Barras completas',melody:'Solo melodía',drops:'Gotas',off:'Sin barras'})[fallingNotesStyle]||'Barras completas';
  if($('devicePreviewEffects'))$('devicePreviewEffects').textContent=fxGlow?`Efectos activados · ${FX_STYLE_OPTIONS.find(option=>option[0]===fxStyle)?.[1]||'Humo con chispas'} · ${['','Suave','Normal','Intenso'][fxIntensity]} · ${fxDuration.toFixed(1)} s${fxStyle==='gold'?` · halo ${goldImpactGlow?'activo':'inactivo'}`:''}`:goldImpactGlow&&fxStyle==='gold'?'Halo dorado activo · partículas apagadas':'Efectos apagados';
  const volumeMeter=$('devicePreviewVolume')?.querySelector('i');if(volumeMeter)volumeMeter.style.width=`${Math.max(0,Math.min(100,state.masterVolume*50))}%`;
  const textPreview={devicePreviewBrandText:deviceSettings.brand,devicePreviewWorship:deviceSettings.worship,devicePreviewJoy:deviceSettings.joy,devicePreviewFreePlay:deviceSettings.freePlay};Object.entries(textPreview).forEach(([id,value])=>{if($(id))$(id).textContent=value;});
}
function updateDeviceSettingsPreview(){
  applyDeviceCustomization();
  const selectedTheme=$('devicePaletteTheme')?.value==='dark'?'dark':'light',selectedPalette=deviceSettings[selectedTheme==='dark'?'paletteDark':'paletteLight']||DEVICE_THEME_PALETTES[selectedTheme],colorPreview=$('devicePianoPreview');
  if(colorPreview){colorPreview.style.background=`linear-gradient(145deg,${selectedPalette.page},${selectedPalette.surface})`;colorPreview.style.color=selectedPalette.text;colorPreview.style.borderColor=selectedPalette.line;Object.entries({'--device-page-color':selectedPalette.page,'--device-surface-color':selectedPalette.surface,'--device-text-color':selectedPalette.text,'--device-line-color':selectedPalette.line,'--device-option-panel-color':selectedPalette.optionPanel||selectedPalette.surface,'--device-heading-background':selectedPalette.headingBackground||selectedPalette.primary,'--device-heading-text':selectedPalette.headingText||'#ffffff','--device-accent-color':selectedPalette.accent,'--device-melody-color':deviceSettings.melodyColor}).forEach(([name,value])=>colorPreview.style.setProperty(name,value));}
  if(colorPreview)colorPreview.style.background=deviceSettings.stageBackgroundColor||'#000000';
  const previewGrid=colorPreview?.querySelector('.device-piano-preview-grid');if(previewGrid){previewGrid.style.backgroundImage=`linear-gradient(to right,color-mix(in srgb,${deviceSettings.gridLineColor||'#ffffff'} ${Math.max(0,Math.min(100,Number(deviceSettings.gridLineOpacity??55)))}%,transparent) 1px,transparent 1px)`;previewGrid.style.opacity='1';}
  const popupPreview=$('devicePreviewPopup');if(popupPreview){popupPreview.style.background=selectedPalette.optionPanel||selectedPalette.surface;popupPreview.style.color=selectedPalette.text;popupPreview.style.borderColor=selectedPalette.line;}
  const headingPreview=$('devicePianoPreview')?.querySelector('.device-piano-preview-title');if(headingPreview){headingPreview.style.background=selectedPalette.headingBackground||selectedPalette.primary;headingPreview.style.color=selectedPalette.headingText||'#fff';}
  const offlinePreview=$('devicePreviewOffline');if(offlinePreview){offlinePreview.style.background=selectedPalette.offlineCardBackground||selectedPalette.surface;offlinePreview.style.color=selectedPalette.offlineCardText||selectedPalette.text;offlinePreview.style.borderColor=selectedPalette.line;}
  const colorPreviewTheme=$('deviceColorPreviewTheme');if(colorPreviewTheme)colorPreviewTheme.textContent=`Vista previa del tema ${selectedTheme==='dark'?'oscuro':'claro'}`;
  const heading=$('devicePreviewHeading');if(heading)heading.style.fontSize=`${deviceSettings.headingSize}px`;
  document.querySelectorAll('[data-device-value]').forEach(output=>{const input=$(output.dataset.deviceValue);if(!input)return;const suffix=input.id==='deviceGridSpacing'?' teclas':input.id==='deviceRadius'?' px':input.id==='deviceFontSize'||input.id==='deviceHeadingSize'||input.id==='deviceNoteLabelSize'?' px':'';output.textContent=`${input.value}${suffix}`;});
}
function populateDeviceSettingsForm(){
  const palette=deviceSettings[deviceSettings.theme==='dark'?'paletteDark':'paletteLight']||DEVICE_THEME_PALETTES.light;
  const paletteLabel=deviceSettings.theme==='dark'?'tema oscuro':'tema claro';
  [['devicePrimaryColorLabel','Color principal de la app'],['deviceAccentColorLabel','Color de acento'],['devicePageColorLabel','Fondo general de la app'],['deviceSurfaceColorLabel','Fondo de tarjetas y secciones'],['deviceOptionPanelColorLabel','Fondo de paneles emergentes del piano'],['deviceHeadingBackgroundColorLabel','Fondo de encabezados'],['deviceHeadingTextColorLabel','Letras de encabezados'],['deviceOfflineCardBackgroundColorLabel','Fondo del cuadro de sonidos descargados'],['deviceOfflineCardTextColorLabel','Letras del cuadro de sonidos descargados'],['deviceTextColorLabel','Color del texto general'],['deviceLineColorLabel','Color de bordes y líneas']].forEach(([id,label])=>{if($(id))$(id).textContent=`${label} · ${paletteLabel}`;});
  const values={deviceTheme:deviceSettings.themeMode||deviceSettings.theme,devicePalettePreset:deviceSettings.palettePreset||'custom',devicePaletteTheme:deviceSettings.theme,deviceFont:deviceSettings.font,deviceFontSize:deviceSettings.fontSize,deviceHeadingFont:deviceSettings.headingFont,deviceIconColor:deviceSettings.iconColor,deviceIconSize:deviceSettings.iconSize||24,deviceHeadingSize:deviceSettings.headingSize,deviceHeadingHeight:deviceSettings.headingHeight||58,devicePianoHeaderHeight:deviceSettings.pianoHeaderHeight||58,deviceHomeButtonHeight:deviceSettings.homeButtonHeight,deviceRadius:deviceSettings.radius,devicePrimaryColor:palette.primary,deviceAccentColor:palette.accent,devicePageColor:palette.page,deviceSurfaceColor:palette.surface,deviceOptionPanelColor:palette.optionPanel||palette.surface,deviceHeadingBackgroundColor:palette.headingBackground||palette.primary,deviceHeadingTextColor:palette.headingText||'#ffffff',deviceOfflineCardBackgroundColor:palette.offlineCardBackground||palette.surface,deviceOfflineCardTextColor:palette.offlineCardText||palette.text,deviceTextColor:palette.text,deviceLineColor:palette.line,devicePianoImageBlur:deviceSettings.pianoImageBlur,devicePianoImageOpacity:deviceSettings.pianoImageOpacity,deviceBrandText:deviceSettings.brand,deviceWorshipText:deviceSettings.worship,deviceJoyText:deviceSettings.joy,deviceFreePlayText:deviceSettings.freePlay,deviceCreateText:deviceSettings.create,deviceNoteNotation:deviceSettings.noteNotation,deviceNoteLabelSize:deviceSettings.noteLabelSize,deviceNoteLabelColor:deviceSettings.noteLabelColor,deviceKeyLabelColor:deviceSettings.keyLabelColor,deviceKeyLabelSize:deviceSettings.keyLabelSize,deviceOctaveLabelColor:deviceSettings.octaveLabelColor,deviceOctaveLabelSize:deviceSettings.octaveLabelSize,deviceGridSpacing:deviceSettings.gridSpacing,deviceStageBackgroundColor:deviceSettings.stageBackgroundColor,deviceGridLineColor:deviceSettings.gridLineColor,deviceGridLineOpacity:deviceSettings.gridLineOpacity,deviceMelodyColor:deviceSettings.melodyColor,deviceBassColor:deviceSettings.bassColor,deviceMasterVolume:Math.round(state.masterVolume*100),deviceLayerVolume:state.stringsLayerVolume,deviceFallingStyle:fallingNotesStyle};
  Object.entries(values).forEach(([id,value])=>{const control=$(id);if(control)control.value=String(value);});
  [['deviceLayerEnabled',state.stringsLayerEnabled],['deviceGlowEnabled',fxGlow],['deviceKeyLightEnabled',lightKeys]].forEach(([id,value])=>{const control=$(id);if(control)control.checked=!!value;});
  syncFxStyleButtons();
  syncPianoKeyStyleControls();
  if($('deviceBarLook'))$('deviceBarLook').value=barLook;
  if($('deviceBarBassDiff'))$('deviceBarBassDiff').checked=barBassDiff;
  syncBarAppearanceControls();
  const file=$('deviceBackgroundImage');if(file)file.value='';
  if($('deviceBackgroundStatus'))$('deviceBackgroundStatus').textContent=deviceSettings.backgroundImage?'Imagen del piano guardada en este dispositivo.':'';
  const outputs={deviceFontSizeValue:`${deviceSettings.fontSize} px`,deviceIconSizeValue:`${deviceSettings.iconSize||24} px`,deviceHeadingSizeValue:`${deviceSettings.headingSize} px`,deviceHeadingHeightValue:`${deviceSettings.headingHeight||58} px`,devicePianoHeaderHeightValue:`${deviceSettings.pianoHeaderHeight||58} px`,deviceHomeButtonHeightValue:`${deviceSettings.homeButtonHeight} px`,deviceRadiusValue:`${deviceSettings.radius} px`,deviceNoteLabelSizeValue:`${deviceSettings.noteLabelSize} px`,deviceKeyLabelSizeValue:`${deviceSettings.keyLabelSize} px`,deviceOctaveLabelSizeValue:`${deviceSettings.octaveLabelSize} px`,deviceGridSpacingValue:`${deviceSettings.gridSpacing} teclas`,deviceGridLineOpacityValue:`${deviceSettings.gridLineOpacity??55}%`,devicePianoImageBlurValue:`${deviceSettings.pianoImageBlur} px`,devicePianoImageOpacityValue:`${deviceSettings.pianoImageOpacity}%`,deviceMasterVolumeValue:`${Math.round(state.masterVolume*100)}%`,deviceLayerVolumeValue:`${state.stringsLayerVolume}%`};
  Object.entries(outputs).forEach(([id,text])=>{if($(id))$(id).textContent=text;});
}
function initializeDeviceSettings(){
  applyDeviceCustomization();populateDeviceSettingsForm();
  window.addEventListener('yhwh-theme-change',event=>{const mode=event.detail?.theme;if(!['light','dark'].includes(mode))return;deviceSettings.themeMode=mode;deviceSettings.theme=mode;syncThemeToggleButtons();applyDeviceCustomization();saveDeviceSettings();if($('deviceTheme'))$('deviceTheme').value=mode;if(!$('deviceSettingsScreen').classList.contains('hidden'))populateDeviceSettingsForm();});
  if(window.matchMedia){const systemTheme=window.matchMedia('(prefers-color-scheme: dark)'),applySystemTheme=()=>{if(deviceSettings.themeMode!=='system')return;const next=systemTheme.matches?'dark':'light';if(deviceSettings.theme===next)return;deviceSettings.theme=next;syncThemeToggleButtons();applyDeviceCustomization();saveDeviceSettings();if($('deviceSettingsScreen')&&!$('deviceSettingsScreen').classList.contains('hidden'))populateDeviceSettingsForm();};if(systemTheme.addEventListener)systemTheme.addEventListener('change',applySystemTheme);else if(systemTheme.addListener)systemTheme.addListener(applySystemTheme);}
  const syncPreviewVisibility=tab=>{const hidden=tab==='library';$('deviceSettingsPreview')?.classList.toggle('hidden',hidden);document.querySelector('.device-settings-workspace')?.classList.toggle('without-preview',hidden);};
  let returnScreen='homeView';
  const showSettings=(tab,from)=>{
    returnScreen=from;deviceSettings.theme=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';saveDeviceSettings();populateDeviceSettingsForm();
    const tabButton=document.querySelector(`[data-device-tab="${tab}"]`);if(tabButton)tabButton.click();
    syncPreviewVisibility(tab);transitionScreen('deviceSettingsScreen',['homeView','songView','createView','player','playModeModal','instrumentSettingsScreen','deviceSettingsScreen']);
  };
  const open=()=>{showSettings('appearance','homeView');queueGuidedTour('configuracion');};
  $('deviceSettingsBtn').onclick=open;
  $('settingsToggle').onclick=openPlayerSettingsScreen;
  $('replayQuickGuide')?.addEventListener('click',replayQuickGuide);
  $('closeDeviceSettings').onclick=()=>transitionScreen(returnScreen,['homeView','songView','createView','player','playModeModal','instrumentSettingsScreen','deviceSettingsScreen']);
  document.querySelectorAll('[data-device-tab]').forEach(button=>button.onclick=()=>{
    document.querySelectorAll('[data-device-tab]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active));});
    document.querySelectorAll('[data-device-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.devicePanel!==button.dataset.deviceTab));
    document.querySelectorAll('[data-device-preview]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.devicePreview!==button.dataset.deviceTab));
    syncPreviewVisibility(button.dataset.deviceTab);
    updateDeviceSettingsPreview();
  });
  const bindings={deviceFont:'font',deviceFontSize:'fontSize',deviceHeadingFont:'headingFont',deviceIconColor:'iconColor',deviceIconSize:'iconSize',deviceHeadingSize:'headingSize',deviceHeadingHeight:'headingHeight',devicePianoHeaderHeight:'pianoHeaderHeight',deviceHomeButtonHeight:'homeButtonHeight',deviceRadius:'radius',devicePrimaryColor:'primary',deviceAccentColor:'accent',devicePageColor:'page',deviceSurfaceColor:'surface',deviceOptionPanelColor:'optionPanel',deviceHeadingBackgroundColor:'headingBackground',deviceHeadingTextColor:'headingText',deviceOfflineCardBackgroundColor:'offlineCardBackground',deviceOfflineCardTextColor:'offlineCardText',deviceTextColor:'text',deviceLineColor:'line',devicePianoImageBlur:'pianoImageBlur',devicePianoImageOpacity:'pianoImageOpacity',deviceBrandText:'brand',deviceWorshipText:'worship',deviceJoyText:'joy',deviceFreePlayText:'freePlay',deviceCreateText:'create',deviceNoteLabelSize:'noteLabelSize',deviceNoteLabelColor:'noteLabelColor',deviceKeyLabelColor:'keyLabelColor',deviceKeyLabelSize:'keyLabelSize',deviceOctaveLabelColor:'octaveLabelColor',deviceOctaveLabelSize:'octaveLabelSize',deviceGridSpacing:'gridSpacing',deviceStageBackgroundColor:'stageBackgroundColor',deviceGridLineColor:'gridLineColor',deviceGridLineOpacity:'gridLineOpacity',deviceMelodyColor:'melodyColor',deviceBassColor:'bassColor'};
  const paletteKeys=new Set(['primary','accent','page','surface','optionPanel','headingBackground','headingText','offlineCardBackground','offlineCardText','text','line']);
  const outputIds={fontSize:'deviceFontSizeValue',headingSize:'deviceHeadingSizeValue',iconSize:'deviceIconSizeValue',headingHeight:'deviceHeadingHeightValue',pianoHeaderHeight:'devicePianoHeaderHeightValue',homeButtonHeight:'deviceHomeButtonHeightValue',radius:'deviceRadiusValue',noteLabelSize:'deviceNoteLabelSizeValue',keyLabelSize:'deviceKeyLabelSizeValue',octaveLabelSize:'deviceOctaveLabelSizeValue',gridSpacing:'deviceGridSpacingValue',gridLineOpacity:'deviceGridLineOpacityValue',pianoImageBlur:'devicePianoImageBlurValue',pianoImageOpacity:'devicePianoImageOpacityValue'};
  Object.entries(bindings).forEach(([id,key])=>{const control=$(id);if(!control)return;const syncSetting=persist=>{
    const value=['fontSize','headingSize','iconSize','headingHeight','pianoHeaderHeight','homeButtonHeight','radius','noteLabelSize','keyLabelSize','octaveLabelSize','gridSpacing','gridLineOpacity','pianoImageBlur','pianoImageOpacity'].includes(key)?Number(control.value):control.value;
    if(paletteKeys.has(key)){const paletteName=$('devicePaletteTheme').value==='dark'?'paletteDark':'paletteLight';deviceSettings[paletteName]={...deviceSettings[paletteName],[key]:value};if((paletteName==='paletteDark')===(deviceSettings.theme==='dark'))deviceSettings[key]=value;deviceSettings.palettePreset='custom';if($('devicePalettePreset'))$('devicePalettePreset').value='custom';}
    else deviceSettings[key]=value;
    if(outputIds[key]&&$(outputIds[key]))$(outputIds[key]).textContent=`${value}${key==='gridSpacing'?' teclas':key==='pianoImageOpacity'||key==='gridLineOpacity'?'%':' px'}`;
    if(key==='melodyColor'){state.keyColor=value;try{localStorage.setItem('yhwh_piano_key_color',value);}catch(_){}updateVisualOptions();}
    if(key==='bassColor'){state.bassColor=value;try{localStorage.setItem('yhwh_piano_bass_color',value);}catch(_){}updateVisualOptions();}
    if(persist)saveDeviceSettings();else scheduleDeviceSettingsSave();updateDeviceSettingsPreview();
  };control.addEventListener('input',()=>syncSetting(false));control.addEventListener('change',()=>syncSetting(true));});
  const gridSpacingControl=$('deviceGridSpacing');if(gridSpacingControl){
    let spacingPointer=null;
    const setSpacingFromPointer=event=>{const bounds=gridSpacingControl.getBoundingClientRect(),min=Number(gridSpacingControl.min)||1,max=Number(gridSpacingControl.max)||12,ratio=Math.max(0,Math.min(1,(event.clientX-bounds.left)/Math.max(1,bounds.width))),value=min+Math.round(ratio*(max-min));if(String(value)!==gridSpacingControl.value){gridSpacingControl.value=String(value);gridSpacingControl.dispatchEvent(new Event('input',{bubbles:true}));}};
    gridSpacingControl.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch')return;spacingPointer=event.pointerId;gridSpacingControl.setPointerCapture?.(event.pointerId);setSpacingFromPointer(event);});
    gridSpacingControl.addEventListener('pointermove',event=>{if(spacingPointer===event.pointerId)setSpacingFromPointer(event);});
    const releaseSpacingPointer=event=>{if(spacingPointer===event.pointerId){setSpacingFromPointer(event);spacingPointer=null;gridSpacingControl.dispatchEvent(new Event('change',{bubbles:true}));}};
    gridSpacingControl.addEventListener('pointerup',releaseSpacingPointer);gridSpacingControl.addEventListener('pointercancel',releaseSpacingPointer);
  }
  $('devicePaletteTheme').addEventListener('change',event=>{
    const selectedTheme=event.target.value==='dark'?'dark':'light',palette=deviceSettings[selectedTheme==='dark'?'paletteDark':'paletteLight'],suffix=selectedTheme==='dark'?'tema oscuro':'tema claro';
    const ids={primary:'devicePrimaryColor',accent:'deviceAccentColor',page:'devicePageColor',surface:'deviceSurfaceColor',optionPanel:'deviceOptionPanelColor',headingBackground:'deviceHeadingBackgroundColor',headingText:'deviceHeadingTextColor',offlineCardBackground:'deviceOfflineCardBackgroundColor',offlineCardText:'deviceOfflineCardTextColor',text:'deviceTextColor',line:'deviceLineColor'};
    Object.entries(ids).forEach(([key,id])=>{if($(id))$(id).value=palette[key];});
    [['devicePrimaryColorLabel','Color principal de la app'],['deviceAccentColorLabel','Color de acento'],['devicePageColorLabel','Fondo general de la app'],['deviceSurfaceColorLabel','Fondo de tarjetas y secciones'],['deviceOptionPanelColorLabel','Fondo de paneles emergentes del piano'],['deviceHeadingBackgroundColorLabel','Fondo de encabezados'],['deviceHeadingTextColorLabel','Letras de encabezados'],['deviceOfflineCardBackgroundColorLabel','Fondo del cuadro de sonidos descargados'],['deviceOfflineCardTextColorLabel','Letras del cuadro de sonidos descargados'],['deviceTextColorLabel','Color del texto general'],['deviceLineColorLabel','Color de bordes y líneas']].forEach(([id,label])=>{if($(id))$(id).textContent=`${label} · ${suffix}`;});
    updateDeviceSettingsPreview();
  });
  $('deviceTheme').addEventListener('change',event=>{setDeviceTheme(event.target.value);populateDeviceSettingsForm();updateDeviceSettingsPreview();});
  $('devicePalettePreset').addEventListener('change',event=>{if(event.target.value!=='custom')applyReadyColorPalette(event.target.value);});
  $('deviceMasterVolume').addEventListener('input',event=>{setMasterVolume(event.target.value);deviceSettings.masterVolume=Number(event.target.value);$('deviceMasterVolumeValue').textContent=`${event.target.value}%`;scheduleDeviceSettingsSave();updateDeviceSettingsPreview();});
  $('deviceLayerEnabled').addEventListener('change',event=>{setStringsLayerEnabled(event.target.checked);deviceSettings.layerEnabled=state.stringsLayerEnabled;saveDeviceSettings();updateDeviceSettingsPreview();});
  $('deviceLayerVolume').addEventListener('input',event=>{setStringsLayerVolume(event.target.value);deviceSettings.layerVolume=Number(event.target.value);$('deviceLayerVolumeValue').textContent=`${event.target.value}%`;scheduleDeviceSettingsSave();updateDeviceSettingsPreview();});
  $('deviceFallingStyle').addEventListener('change',event=>{setFallingNotesStyle(event.target.value);deviceSettings.fallingStyle=fallingNotesStyle;saveDeviceSettings();updateDeviceSettingsPreview();});
  if($('deviceBarBassDiff'))$('deviceBarBassDiff').addEventListener('change',event=>setBarBassDiff(event.target.checked));
  if($('deviceBarAppearance'))$('deviceBarAppearance').addEventListener('change',event=>setBarAppearance(event.target.value));
  if($('deviceBarRadius'))$('deviceBarRadius').addEventListener('input',event=>setBarRadius(event.target.value));
  if($('deviceBarOpacity'))$('deviceBarOpacity').addEventListener('input',event=>setBarOpacity(event.target.value));
  if($('deviceBarTrail'))$('deviceBarTrail').addEventListener('input',event=>setBarTrail(event.target.value));
  if($('deviceBarColorMode'))$('deviceBarColorMode').addEventListener('change',event=>setBarColorMode(event.target.value));
  if($('deviceBarAccompaniment2Color'))$('deviceBarAccompaniment2Color').addEventListener('input',event=>setBarAccompaniment2Color(event.target.value));
  if($('deviceBarLook'))$('deviceBarLook').addEventListener('change',event=>{setBarLook(event.target.value);updateDeviceSettingsPreview();});
  if($('deviceBarPalettes')){$('deviceBarPalettes').innerHTML=barPaletteMarkup('deviceBarPaletteButtons').replace(' id="deviceBarPaletteButtons"','').replace(' hidden>','>');$('deviceBarPalettes').addEventListener('click',event=>{const button=event.target.closest('[data-bar-palette]');if(button)setBarColorPreset(button.dataset.barPalette);});syncBarLookButtons();}
  if($('deviceFxStyle'))$('deviceFxStyle').addEventListener('change',event=>{chooseFxStyle(event.target.value);updateDeviceSettingsPreview();});
  if($('deviceFxIntensity'))$('deviceFxIntensity').addEventListener('input',event=>setFxIntensity(event.target.value));
  if($('deviceFxDuration'))$('deviceFxDuration').addEventListener('input',event=>setFxDuration(event.target.value));
  $('deviceGlowEnabled').addEventListener('change',event=>{fxGlow=event.target.checked;deviceSettings.fxGlow=fxGlow;try{localStorage.setItem('yhwh_piano_fx_glow',fxGlow?'1':'0');}catch(_){}updateDeviceSettingsPreview();saveDeviceSettings();});
  $('deviceGoldImpactGlow').addEventListener('change',event=>setGoldImpactGlow(event.target.checked));
  $('deviceKeyLightEnabled').addEventListener('change',event=>{lightKeys=event.target.checked;deviceSettings.lightKeys=lightKeys;document.body.classList.toggle('keys-fill-off',!lightKeys);try{localStorage.setItem('yhwh_piano_light_keys',lightKeys?'1':'0');}catch(_){}updateDeviceSettingsPreview();saveDeviceSettings();});
  $('deviceNoteNotation').addEventListener('change',event=>{
    deviceSettings.noteNotation=event.target.value==='latino'?'latino':'americano';
    const notation=$('keyboardNotation');if(notation){notation.value=deviceSettings.noteNotation;notation.dispatchEvent(new Event('change',{bubbles:true}));}
    if($('devicePreviewNote'))$('devicePreviewNote').textContent=fallingNoteName(60);saveDeviceSettings();updateDeviceSettingsPreview();
  });
  if($('deviceKeyStyle'))$('deviceKeyStyle').addEventListener('change',event=>setPianoKeyStyle(event.target.value));
  $('deviceBackgroundImage').addEventListener('change',event=>{
    const file=event.target.files?.[0];if(!file)return;
    if(!file.type.startsWith('image/')){$('deviceBackgroundStatus').textContent='Elige una imagen.';return;}
    if(file.size>20*1024*1024){$('deviceBackgroundStatus').textContent='Elige una imagen de menos de 20 MB.';event.target.value='';return;}
    $('deviceBackgroundStatus').textContent='Preparando la imagen para que cargue también en móvil…';
    (async()=>{try{
      let bitmap;if(typeof createImageBitmap==='function'){try{bitmap=await createImageBitmap(file);}catch(_){}}
      if(!bitmap)bitmap=await new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No se pudo leer la imagen'));};image.src=url;});
      const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const context=canvas.getContext('2d');context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
      deviceSettings.backgroundImage=canvas.toDataURL('image/jpeg',.72);$('deviceBackgroundStatus').textContent='Imagen suavizada y guardada para el recuadro del piano en este dispositivo.';saveDeviceSettings();updateDeviceSettingsPreview();
    }catch(_){$('deviceBackgroundStatus').textContent='No se pudo preparar la imagen. Prueba con otra foto.';}})();
  });
  $('removeDeviceBackground').onclick=()=>{deviceSettings.backgroundImage='';$('deviceBackgroundImage').value='';$('deviceBackgroundStatus').textContent='Se quitó la imagen de fondo.';saveDeviceSettings();updateDeviceSettingsPreview();};
  $('resetDeviceSettings').onclick=()=>{
    // El perfil móvil debe poder restaurarse también desde la vista responsive
    // de escritorio, donde pointer:coarse no coincide aunque el ancho sea móvil.
    const useMobileProfile=window.innerWidth<=900;
    const resetTheme=useMobileProfile?'dark':'light';
    const resetNotation=useMobileProfile?'latino':'americano';
    const resetMelodyColor=useMobileProfile?MOBILE_FIRST_VISIT_PROFILE.melodyColor:'#90dd4a';
    const resetBassColor=useMobileProfile?MOBILE_FIRST_VISIT_PROFILE.bassColor:'#bb82ef';
    deviceSettings={...DEVICE_SETTINGS_DEFAULTS,...DEVICE_THEME_PALETTES[resetTheme],paletteLight:{...DEVICE_THEME_PALETTES.light},paletteDark:{...DEVICE_THEME_PALETTES.dark},theme:resetTheme,themeMode:resetTheme,headingFont:'Inter, system-ui, Arial, sans-serif',headingColor:'#087da8',iconColor:'#ffffff',headingHeight:58,pianoHeaderHeight:58,mobileHeadingSize:18,homeButtonHeight:46,backgroundImage:'',pianoImageBlur:9,pianoImageOpacity:34,noteNotation:resetNotation,noteLabelSize:12,noteLabelColor:'#111111',keyLabelColor:'#636a6c',keyLabelSize:9,octaveLabelColor:'#bd9e00',octaveLabelSize:11,melodyColor:resetMelodyColor,bassColor:resetBassColor,masterVolume:100,layerEnabled:false,layerVolume:70,fallingStyle:'bars',fxGlow:false,fxStyle:'smoke',barLook:'normal',barColor2:BAR_COLOR_DEFAULTS[0],barColor3:BAR_COLOR_DEFAULTS[1],barBassDiff:true,lightKeys:true,...(useMobileProfile?MOBILE_FIRST_VISIT_PROFILE:{})};
    state.keyColor=deviceSettings.melodyColor;state.bassColor=deviceSettings.bassColor;state.notation=resetNotation;
    fxGlow=!!deviceSettings.fxGlow;goldImpactGlow=useMobileProfile?!!deviceSettings.goldImpactGlow:true;lightKeys=true;document.body.classList.toggle('keys-fill-off',!lightKeys);resetNeonEdge();setNoteLabelOutline(useMobileProfile);
    try{localStorage.setItem('yhwh_piano_key_color',state.keyColor);localStorage.setItem('yhwh_piano_bass_color',state.bassColor);localStorage.setItem('yhwh_piano_note_labels',useMobileProfile?'octavas':'americano');localStorage.setItem('yhwh_cifrado_latino',resetNotation==='latino'?'1':'0');localStorage.setItem('yhwh_piano_show_octave',useMobileProfile?'1':'0');localStorage.setItem('yhwh_piano_fx_glow',fxGlow?'1':'0');localStorage.setItem('yhwh_piano_light_keys','1');}catch(_){}
    setMasterVolume(deviceSettings.masterVolume);setStringsLayerEnabled(false);setStringsLayerVolume(deviceSettings.layerVolume);setThirdLayerEnabled(false);setThirdLayerVolume(40);setThirdLayerInstrument('strings');setFallingNotesStyle('bars');setFxStyle(deviceSettings.fxStyle);setFxIntensity(deviceSettings.fxIntensity||2);setFxDuration(deviceSettings.fxDuration||3.4);setGoldImpactGlow(goldImpactGlow);setPianoKeyStyle(deviceSettings.keyStyle||'classic');setBarLook(deviceSettings.barLook);setBarColorPreset(useMobileProfile?'galaxia':'galaxia');setBarBassDiff(deviceSettings.barBassDiff);setBarAppearance(deviceSettings.barStyle||'glass');setBarRadius(deviceSettings.barRadius??2);setBarOpacity(deviceSettings.barOpacity??100);setBarTrail(deviceSettings.barTrail??0);setBarColorMode(deviceSettings.barColorMode||'track');setBarAccompaniment2Color(deviceSettings.barAccompaniment2Color||'#ff9f43');
    if($('keyboardNotation')){$('keyboardNotation').value=resetNotation;$('keyboardNotation').dispatchEvent(new Event('change',{bubbles:true}));}
    setDeviceTheme(resetTheme);renderKeyboard();updateVisualOptions();applyDeviceCustomization();populateDeviceSettingsForm();saveDeviceSettings();
  };
  new MutationObserver(()=>{
    const theme=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
    if(deviceSettings.theme!==theme){deviceSettings.theme=theme;applyDeviceCustomization();saveDeviceSettings();const picker=$('deviceTheme');if(picker)picker.value=deviceSettings.themeMode||theme;if(!$('deviceSettingsScreen').classList.contains('hidden'))populateDeviceSettingsForm();}
  }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}

renderKeyboard();
bindInterface();
initializeDeviceSettings();
updateAdminControls();
renderRecentSongs();
renderLists();
initializeSplash();
window.addEventListener('load',()=>{downloadOfflineAudio();},{once:true});
window.addEventListener('beforeunload',event=>{if(state.melodyDirty){event.preventDefault();event.returnValue='';}});
initializeFirebase();
// Se permite el zoom del navegador para mantener accesibilidad en pantallas táctiles.

