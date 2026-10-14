const THEORY_CHORDS = [
  {name:'Mayor',quality:'major',formula:'1 – 3 – 5',intervals:[0,4,7]},
  {name:'Menor',quality:'minor',formula:'1 – ♭3 – 5',intervals:[0,3,7]},
  {name:'Disminuido',quality:'dim',formula:'1 – ♭3 – ♭5',intervals:[0,3,6]},
  {name:'Disminuido séptima',quality:'dim7',formula:'1 – ♭3 – ♭5 – 𝄫7',intervals:[0,3,6,9]},
  {name:'Semidisminuido',quality:'m7b5',formula:'1 – ♭3 – ♭5 – ♭7',intervals:[0,3,6,10]},
  {name:'Aumentado',quality:'aug',formula:'1 – 3 – #5',intervals:[0,4,8]},
  {name:'Suspendido 2',quality:'sus2',formula:'1 – 2 – 5',intervals:[0,2,7]},
  {name:'Suspendido 4',quality:'sus4',formula:'1 – 4 – 5',intervals:[0,5,7]},
  {name:'Séptima dominante',quality:'7',formula:'1 – 3 – 5 – ♭7',intervals:[0,4,7,10]},
  {name:'Mayor séptima',quality:'maj7',formula:'1 – 3 – 5 – 7',intervals:[0,4,7,11]},
  {name:'Menor séptima',quality:'m7',formula:'1 – ♭3 – 5 – ♭7',intervals:[0,3,7,10]}
  ,{name:'Menor con séptima mayor',quality:'mMaj7',formula:'1 – ♭3 – 5 – 7',intervals:[0,3,7,11]}
  ,{name:'Sexta',quality:'6',formula:'1 – 3 – 5 – 6',intervals:[0,4,7,9]}
  ,{name:'Añadido novena',quality:'add9',formula:'1 – 3 – 5 – 9',intervals:[0,4,7,14]}
  ,{name:'Quinta (power chord)',quality:'5',formula:'1 – 5',intervals:[0,7]}
];
const THEORY_DEGREES=['I','ii','iii','IV','V','vi','vii°'];
const THEORY_SCALE=[{semi:0,quality:'major'},{semi:2,quality:'minor'},{semi:4,quality:'minor'},{semi:5,quality:'major'},{semi:7,quality:'major'},{semi:9,quality:'minor'},{semi:11,quality:'dim'}];
const THEORY_MINOR_SCALE=[{semi:0,quality:'minor'},{semi:2,quality:'dim'},{semi:3,quality:'major'},{semi:5,quality:'minor'},{semi:7,quality:'minor'},{semi:8,quality:'major'},{semi:10,quality:'major'}];
const THEORY_DEGREES_MINOR=['i','ii°','III','iv','v','VI','VII'];
const THEORY_CIRCLE=[0,7,2,9,4,11,6,1,8,3,10,5];
const THEORY_SIG={0:'0 alteraciones',7:'1 sostenido',2:'2 sostenidos',9:'3 sostenidos',4:'4 sostenidos',11:'5 sostenidos',6:'6 sostenidos / 6 bemoles',1:'7 sostenidos / 5 bemoles',8:'4 bemoles',3:'3 bemoles',10:'2 bemoles',5:'1 bemol'};
const THEORY_SCALES={major:{name:'Mayor',formula:'1 – 2 – 3 – 4 – 5 – 6 – 7',semitones:[0,2,4,5,7,9,11,12]},minor:{name:'Menor natural',formula:'1 – 2 – ♭3 – 4 – 5 – ♭6 – ♭7',semitones:[0,2,3,5,7,8,10,12]},majorPentatonic:{name:'Pentatónica mayor',formula:'1 – 2 – 3 – 5 – 6',semitones:[0,2,4,7,9,12]},minorPentatonic:{name:'Pentatónica menor',formula:'1 – ♭3 – 4 – 5 – ♭7',semitones:[0,3,5,7,10,12]},blues:{name:'Blues',formula:'1 – ♭3 – 4 – ♭5 – 5 – ♭7',semitones:[0,3,5,6,7,10,12]}};
const THEORY_INTERVALS=[['Unísono','1 justa',0],['Segunda menor','2ª menor',1],['Segunda mayor','2ª mayor',2],['Tercera menor','3ª menor',3],['Tercera mayor','3ª mayor',4],['Cuarta justa','4ª justa',5],['Tritono','4ª aumentada / 5ª disminuida',6],['Quinta justa','5ª justa',7],['Sexta menor','6ª menor',8],['Sexta mayor','6ª mayor',9],['Séptima menor','7ª menor',10],['Séptima mayor','7ª mayor',11],['Octava','8ª justa',12]];
function theoryRoot(pc){return NOTE_NAMES[((pc%12)+12)%12];}
const THEORY_CHAPTERS=[
  {id:'keyboard',title:'Capítulo 1 · Conoce el teclado',icon:'🗺️',intro:'El piano es un mapa de teclas que se repite. Primero encontrarás Do, aprenderás los nombres de las notas y descubrirás cómo reconocer teclas blancas, negras y octavas.',goal:'Mirar una tecla, encontrarla en el mapa y decir su nombre y altura.'},
  {id:'rhythm',title:'Capítulo 2 · Pulso y ritmo',icon:'🥁',intro:'Las canciones tienen un latido que puedes sentir con el cuerpo. Aprenderás a contar despacio, reconocer los tiempos y tocar notas largas o rápidas sin correr.',goal:'Seguir un pulso constante y entender cómo se agrupan los tiempos.'},
  {id:'distance',title:'Capítulo 3 · Pasos e intervalos',icon:'👣',intro:'Cada tecla vecina está a un paso pequeño; otras notas quedan más lejos. Vas a mirar y escuchar esas distancias para entender tonos, semitonos e intervalos.',goal:'Contar pasos entre notas y reconocer distancias sencillas al escuchar.'},
  {id:'scales',title:'Capítulo 4 · Caminos de notas: las escalas',icon:'🪜',intro:'Una escala es un camino ordenado de notas. Aprenderás su receta y la usarás para construir escalas mayores y conocer La menor.',goal:'Construir y tocar escalas sin memorizar una lista de doce.'},
  {id:'chords',title:'Capítulo 5 · Acordes para acompañar',icon:'🤝',intro:'Los acordes juntan varias notas para acompañar una canción. Empezaremos con grupos pequeños, escucharemos sus diferencias y aprenderemos a mover la mano con menos esfuerzo.',goal:'Reconocer y tocar tríadas mayores y menores, además de probar inversiones.'},
  {id:'harmony',title:'Capítulo 6 · Tonalidades y progresiones',icon:'🏡',intro:'Una tonalidad es como el hogar de una canción y sus acordes forman una familia. Después aprenderás a ordenar esos acordes para acompañar una melodía.',goal:'Reconocer acordes de una tonalidad y seguir recorridos sencillos.'},
  {id:'accompaniment',title:'Capítulo 7 · Acompaña canciones',icon:'🎶',intro:'Ahora unirás lo aprendido: leerás nombres de acordes, usarás notas graves y probarás maneras sencillas de acompañar. No hace falta tocar rápido ni usar las dos manos de golpe.',goal:'Tocar una vuelta de acordes con un pulso tranquilo y un patrón fácil.'}
];
const THEORY_LESSONS=[
  {chapter:'keyboard',title:'El patrón de dos y tres teclas negras',time:'3 min',intro:'Los grupos de teclas negras son las señales que te permiten orientarte en cualquier parte del piano.',parts:[['Encuentra un grupo de dos','Mira las teclas negras. Verás grupos de dos y de tres, repetidos por todo el instrumento.'],['Do está junto al par','Busca la tecla blanca pegada a la izquierda de un grupo de dos negras. Esa tecla es Do.'],['Usa el dibujo como mapa','Cuando encuentres Do, las teclas blancas que siguen hacia la derecha son Re, Mi, Fa, Sol, La y Si. El patrón vuelve a repetirse.']],remember:'Dos negras juntas: Do es la tecla blanca que está justo a su izquierda.',visual:['Do','● ●','Re','● ● ●','Mi'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:360},exercise:{type:'find-note',pool:'do',hint:'Busca Do: está justo a la izquierda de un grupo de dos teclas negras.'},tab:'piano'},
  {chapter:'keyboard',title:'Las notas: nombres para los sonidos',time:'3 min',intro:'Una nota es un sonido al que le damos un nombre para poder encontrarlo y repetirlo.',parts:[['Siete nombres conocidos','En música usamos siete nombres: Do, Re, Mi, Fa, Sol, La y Si. Cada tecla produce un sonido, y estos nombres nos ayudan a hablar de esos sonidos.'],['Un camino que vuelve a empezar','Después de Si viene otra vez Do. Ese Do suena más agudo y empieza un nuevo grupo de siete nombres.'],['Las notas construyen música','Las melodías usan notas una después de otra. Las escalas las ordenan y los acordes juntan varias para que suenen al mismo tiempo.']],remember:'Después de Si, la lista vuelve a Do.',visual:['Do','Re','Mi','Fa','Sol','La','Si','Do'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:430},exercise:{type:'choice',question:'¿Qué nombre viene después de Si?',answers:['Do','Fa','La'],correct:0,why:'El orden vuelve a empezar en Do.'},tab:'piano'},
  {chapter:'keyboard',title:'Encuentra las notas naturales',time:'3 min',intro:'Las siete teclas blancas principales llevan los nombres Do, Re, Mi, Fa, Sol, La y Si. Practiquemos a encontrarlas en distintas octavas.',parts:[['Empieza desde Do','Localiza un par de teclas negras. La blanca que está a su izquierda es Do.'],['Avanza sin saltarte teclas','Desde Do, sigue por las blancas: Re, Mi, Fa, Sol, La y Si. Luego la próxima blanca se llama Do otra vez.'],['Observa y escucha','En esta práctica aparecerá una nota al azar. Busca su nombre y su número de octava en el teclado, y tócala.']],remember:'Las teclas blancas siguen el mismo orden una y otra vez.',visual:['Do','Re','Mi','Fa','Sol','La','Si'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:360},exercise:{type:'find-note',pool:'natural',hint:'Busca la nota exacta que aparece en el reto. El número también importa.'},tab:'piano'},
  {chapter:'keyboard',title:'Teclas negras: sostenidos y bemoles',time:'4 min',intro:'Entre muchas teclas blancas hay una tecla negra. Esa tecla también es una nota y puede tener dos nombres.',parts:[['Sostenido sube un paso pequeño','El símbolo ♯ se llama sostenido. Do♯, o C♯, es la tecla negra inmediatamente a la derecha de Do.'],['Bemol baja un paso pequeño','El símbolo ♭ se llama bemol. Re♭, o D♭, es la tecla negra inmediatamente a la izquierda de Re.'],['Dos nombres para la misma tecla','C♯ y D♭ son dos maneras de nombrar la misma tecla. En una octava hay doce sonidos: siete naturales y cinco alterados. Por ahora basta saber que ambos nombres señalan el mismo lugar.']],remember:'♯ sube un semitono; ♭ baja un semitono. C♯ y D♭ comparten tecla.',visual:['C','C♯ / D♭','D','D♯ / E♭','E','F','F♯ / G♭','G','G♯ / A♭','A','A♯ / B♭','B'],demo:{notes:[60,61,62,63,64,65,66,67,68,69,70,71,72],spacing:250},exercise:{type:'find-note',pool:'altered',hint:'Las teclas negras tienen nombres con sostenido o bemol. Toca la nota pedida.'},tab:'piano'},
  {chapter:'keyboard',title:'Octavas: Do3, Do4 y Do5',time:'3 min',intro:'Las notas vuelven a aparecer en diferentes alturas. Cada vez que llegas al mismo nombre más arriba, completas una octava.',parts:[['De Do a Do','Cuenta desde Do hasta el Do siguiente: Do, Re, Mi, Fa, Sol, La, Si, Do. El Do de llegada suena más agudo.'],['El número indica la altura','Do3, Do4 y Do5 son todos Do, pero viven en zonas distintas del teclado. En esta app también puedes verlos como C3, C4 y C5.'],['Busca el mismo dibujo','Cada Do está a la izquierda de dos teclas negras. Encuentra el dibujo varias veces y nota cómo el sonido se vuelve más agudo al avanzar.']],remember:'El nombre de nota puede repetirse; el número te dice en qué octava está.',visual:['Do3','Do4','Do5'],demo:{notes:[48,60,72],spacing:700},exercise:{type:'find-note',pool:'do',hint:'Esta vez el número de octava sí cuenta: busca exactamente el Do indicado.'},tab:'piano'},
  {chapter:'keyboard',title:'Reto: encuentra cualquier nota',time:'4 min',intro:'Ya tienes un mapa para buscar notas. Ahora tendrás que encontrar sonidos naturales y alterados sin que el piano te señale la tecla.',parts:[['Lee la nota completa','El reto puede pedir, por ejemplo, Fa♯4 o Si3. El nombre dice qué nota buscar; el número indica qué octava.'],['Busca el patrón','Usa los pares de teclas negras para ubicar Do y cuenta desde allí. En las teclas negras, fíjate en ♯ o ♭.'],['Tócala para comprobar','Si aciertas, escucharás esa nota y el reto cambiará. Si no, la app te dirá qué tecla tocaste para que puedas volver a buscar.']],remember:'Mira el nombre y el número de octava antes de tocar.',visual:['Nombre','Octava','Tecla'],demo:{notes:[66],spacing:0},exercise:{type:'find-note',pool:'all',hint:'Busca la tecla exacta. Puedes pedir otra nota si quieres seguir practicando.'},tab:'piano'},
  {chapter:'rhythm',title:'El pulso: el latido de la música',time:'3 min',intro:'El pulso es el latido regular que puedes marcar con el pie mientras escuchas una canción. No necesitas saber tocar todavía: primero vamos a sentir cuándo vuelve cada golpe.',parts:[['Encuentra el latido','Escucha una canción y prueba a mover la cabeza o el pie con los golpes que se repiten. Ese latido constante se llama pulso.'],['Cuenta sin apurarte','Puedes contar 1, 2, 3, 4 una y otra vez. Si pierdes la cuenta, espera el siguiente golpe fuerte y vuelve a empezar en 1.'],['La velocidad se puede cambiar','Una canción lenta deja más espacio entre los golpes. Una canción rápida los acerca. En la app podrás oír clics lentos para practicar con calma.']],remember:'El pulso es el latido constante de la música; tocar a tiempo es seguirlo.',visual:['1','2','3','4','1','2','3','4'],demo:{rhythm:'x.x.x.x.|x.x.x.x.',bpm:66},exercise:{type:'rhythm',pattern:'x.x.x.x.|x.x.x.x.',bpm:66,tolerance:.32,prompt:'Escucha los cuatro clics de entrada. Luego toca el botón una vez en cada pulso, como si marcaras el latido con el pie.',hint:'Espera los cuatro clics y toca una vez con cada golpe que sigue.'}},
  {chapter:'rhythm',title:'Compás 4/4: contar hasta cuatro',time:'3 min',intro:'El compás es una cajita que ordena los pulsos. En 4/4, cada cajita tiene cuatro pulsos y luego empieza otra vez en 1.',parts:[['Cuenta los cuatro lugares','Di “1, 2, 3, 4” con espacios iguales. Cuando llegas al 4, no te detienes: el siguiente pulso vuelve a ser 1.'],['El primer tiempo ayuda a orientarte','El 1 suele sentirse un poco más fuerte, como el comienzo de una nueva vuelta. No significa que debas tocar fuerte; solo te ayuda a saber dónde estás.'],['La barrita marca el inicio','En una partitura, una línea vertical separa un compás del siguiente. En una canción puedes imaginar esa línea cuando vuelves a contar desde 1.']],remember:'4/4 significa cuatro pulsos en cada compás: 1, 2, 3, 4.',visual:['|','1','2','3','4','|','1','2','3','4'],demo:{rhythm:'x.......|x.......',bpm:64},exercise:{type:'choice',question:'En un compás de 4/4, ¿cuántos pulsos contamos antes de volver a 1?',answers:['Cuatro','Tres','Siete'],correct:0,why:'En 4/4 cuentas 1, 2, 3, 4 y luego empieza el siguiente compás.'}},
  {chapter:'rhythm',title:'Negra, blanca y corchea: notas cortas y largas',time:'4 min',intro:'Las notas no solo tienen un sonido: también pueden durar más o menos tiempo. Primero imagina que cada pulso es un paso al caminar.',parts:[['La negra ocupa un paso','Si cuentas “1, 2, 3, 4”, puedes tocar una negra en cada número: una nota por pulso.'],['La blanca ocupa dos pasos','Una blanca dura el espacio de dos negras. Tócala en el 1 y deja que suene mientras cuentas “2”.'],['Dos corcheas caben en un paso','Una corchea dura la mitad de un pulso. Por eso puedes decir “1 y 2 y”: el número es el pulso y “y” cae entre dos pulsos.']],remember:'Negra: 1 pulso. Blanca: 2 pulsos. Dos corcheas: 1 pulso.',visual:['Negra · 1','Blanca · 2','Corcheas · ½ + ½'],demo:{rhythm:'xxxxxxxx|xxxxxxxx',bpm:58},exercise:{type:'rhythm',pattern:'xxxxxxxx|xxxxxxxx',bpm:58,tolerance:.28,prompt:'El clic marca los pulsos. Toca dos veces por cada clic: una en el número y otra en “y”. Son 16 toques tranquilos.'}},
  {chapter:'rhythm',title:'Compás de 3 y balanceo de 6/8',time:'3 min',intro:'No todas las canciones se cuentan hasta cuatro. Algunas tienen tres pulsos; otras se sienten como dos balanceos, cada uno dividido en tres partes.',parts:[['3/4 se cuenta 1, 2, 3','Imagina un vals: el 1 es el primer paso y luego vienen 2 y 3. Después vuelve el siguiente 1.'],['6/8 tiene seis partes pequeñas','Puedes decir “1, 2, 3, 4, 5, 6”. Muchas veces se siente como dos grupos: “1-2-3, 4-5-6”, con un balanceo grande en cada grupo.'],['Escucha dónde se balancea','No te preocupes si al principio cuesta distinguirlos. Mueve la mano como si mecieras algo: eso ayuda a sentir el grupo de tres.']],remember:'3/4: tres pulsos. 6/8: dos grupos de tres partes pequeñas.',visual:['3/4 · 1 2 3','6/8 · 1 2 3 · 4 5 6'],demo:{rhythm:'x..x..|x..x..',bpm:62,beatsPerBar:2,subdivisions:3},exercise:{type:'rhythm',pattern:'x..x..|x..x..',beatsPerBar:2,subdivisions:3,bpm:62,tolerance:.34,prompt:'El clic marca los dos balanceos grandes. Espera los cuatro clics de entrada y luego toca una vez al comienzo de cada grupo: “1-2-3, 4-5-6”.',question:'En 3/4, ¿cuántos pulsos contamos antes de volver a 1?',answers:['Tres','Cuatro','Seis'],correct:0,why:'En 3/4 contamos tres pulsos principales. En 6/8 también vemos seis partes pequeñas, pero suelen agruparse en dos balanceos de tres.'}},  {chapter:'distance',title:'Semitono: el paso más pequeño',time:'3 min',intro:'Un semitono es la distancia más corta entre dos teclas vecinas, ya sean blancas o negras.',parts:[['Mira dos vecinas','C y C♯ están una al lado de la otra: entre ellas hay un semitono. Cuenta las teclas negras también.'],['Escucha el pequeño paso','Toca primero una tecla y luego su vecina. Los sonidos cambian poquito porque solo avanzaste un semitono.'],['Piensa en movimiento','Al subir por el teclado vas hacia sonidos más agudos. Al bajar vas hacia sonidos más graves. En ambos sentidos, una tecla vecina está a un semitono.']],remember:'De una tecla a la tecla que está justo a su lado hay un semitono.',visual:['C','C♯','D'],demo:{notes:[60,61,62],spacing:700},exercise:{type:'choice',question:'¿Cuántos semitonos separan dos teclas vecinas?',answers:['Uno','Dos','Siete'],correct:0,why:'Una tecla y su vecina forman un paso pequeño: un semitono.'},tab:'intervals'},
  {chapter:'distance',title:'Mi–Fa y Si–Do: vecinos sin tecla negra',time:'3 min',intro:'Hay dos pares de teclas blancas que ya están pegados. Entre ellas hay un semitono aunque no veas una tecla negra.',parts:[['Mi y Fa están juntos','Toca Mi y después la tecla blanca que sigue, Fa. Son vecinos: la distancia es un semitono.'],['Si y Do también','Haz lo mismo con Si y el siguiente Do. También están a un semitono de distancia.'],['La regla incluye las negras','Entre dos teclas vecinas siempre hay un semitono. A veces una es negra; entre Mi–Fa y Si–Do, las dos son blancas.']],remember:'Mi–Fa y Si–Do son semitonos naturales.',visual:['Mi','Fa','Si','Do'],demo:{notes:[64,65,71,72],spacing:700},exercise:{type:'choice',question:'¿Qué pares están separados por un semitono?',answers:['Mi–Fa y Si–Do','Do–Re y Fa–Sol','Do–Mi y Sol–Si'],correct:0,why:'Mi–Fa y Si–Do son dos pares de teclas vecinas.'},tab:'intervals'},
  {chapter:'distance',title:'Tono: dos pasos pequeños',time:'3 min',intro:'Un tono equivale a dos semitonos. Es como dar dos pasos seguidos en el teclado.',parts:[['De Do a Re','Entre Do y Re pasas por Do♯: Do → Do♯ → Re. Son dos semitonos, es decir, un tono.'],['De Fa a Sol','Entre Fa y Sol está Fa♯. También cuentas dos pasos: Fa → Fa♯ → Sol.'],['Compara las distancias','Do–Do♯ es un semitono. Do–Re es un tono. Cuenta cuántas teclas atraviesas para saber la distancia.']],remember:'Dos semitonos juntos forman un tono.',visual:['Do','Do♯','Re','=','2 semitonos'],demo:{notes:[60,62,65,67],spacing:650},exercise:{type:'choice',question:'¿Cuántos semitonos forman un tono?',answers:['Uno','Dos','Tres'],correct:1,why:'Un tono contiene dos semitonos.'},tab:'intervals'},
  {chapter:'distance',title:'Reto: ¿tono o semitono?',time:'4 min',intro:'Mira dos notas, escucha el intervalo y decide si entre ellas hay un paso o dos.',parts:[['Escucha las dos notas','La app te dará dos notas para comparar, como La y Si o Mi y Fa. Pulsa Escuchar y atiende a la distancia.'],['Cuenta los pasos','Si son teclas vecinas, hay un semitono. Si hay una tecla en medio, hay dos semitonos: un tono.'],['Elige tu respuesta','La práctica cambia los pares, así que no tienes que aprender una lista de memoria. Mira y escucha cada ejemplo.']],remember:'Vecinas: un semitono. Una tecla entre ellas: un tono.',visual:['¿1 paso?','Semitono','¿2 pasos?','Tono'],demo:{notes:[69,71],spacing:800},exercise:{type:'interval',pairs:[[60,61],[64,65],[71,72],[60,62],[65,67],[69,71],[67,69],[60,63]],answers:[{value:1,label:'1 semitono'},{value:2,label:'1 tono'},{value:3,label:'3 semitonos'}],hint:'Mira el teclado y cuenta las teclas entre las dos notas.'},tab:'intervals'},
  {chapter:'distance',title:'Intervalos: contar nombres entre dos notas',time:'3 min',intro:'Además de contar teclas, podemos contar los nombres de las notas para decir qué distancia hay. Esa distancia se llama intervalo.',parts:[['La primera nota cuenta como uno','Desde Do hasta Mi contamos Do (1), Re (2), Mi (3). Por eso decimos que Do y Mi forman una tercera.'],['El número dice cuántos nombres hay','Do hasta Sol es Do, Re, Mi, Fa, Sol: cinco nombres, así que es una quinta. No hace falta memorizar todos los tamaños todavía.'],['La distancia también se oye','Toca primero las dos notas por separado. Luego tócalas juntas o escucha el ejemplo. Tu oído irá aprendiendo cómo se siente cada intervalo.']],remember:'Para nombrar un intervalo, cuenta ambos extremos: Do–Mi son tres nombres, una tercera.',visual:['Do (1)','Re (2)','Mi (3)','3.ª'],demo:{notes:[60,64,60,67],spacing:800},exercise:{type:'choice',question:'¿Qué intervalo forman Do y Sol al contar los nombres?',answers:['Una quinta','Una tercera','Una segunda'],correct:0,why:'Do, Re, Mi, Fa, Sol: contamos cinco nombres.'},tab:'intervals'},  {chapter:'scales',title:'Escala: un camino ordenado',time:'3 min',intro:'Una escala es un grupo de notas en orden. Sirve como mapa para crear melodías y aprender qué notas suelen funcionar juntas.',parts:[['Sube o baja por el camino','Puedes empezar en una nota y avanzar paso a paso hacia sonidos más agudos. También puedes recorrer las mismas notas hacia abajo.'],['Do mayor es un buen primer mapa','Do mayor usa Do, Re, Mi, Fa, Sol, La y Si. En el piano puedes tocarla usando las teclas blancas.'],['Los números muestran lugares','A veces verás 1, 2, 3, 4, 5, 6 y 7. Son los puestos de las notas dentro de la escala, en orden.']],remember:'Una escala ordena notas para que tengamos un camino musical.',visual:['1','2','3','4','5','6','7'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:400},exercise:{type:'choice',question:'¿Qué es una escala?',answers:['Un grupo ordenado de notas','Una sola tecla negra','Una canción completa'],correct:0,why:'La escala organiza varias notas en un orden.'},tab:'scales'},
  {chapter:'scales',title:'La receta de la escala mayor',time:'4 min',intro:'La escala mayor se puede construir desde distintas notas siguiendo siempre la misma receta de pasos.',parts:[['T significa tono; S, semitono','El patrón es T–T–S–T–T–T–S. T es un tono, que equivale a dos semitonos; S es un semitono.'],['También puedes contar semitonos','La misma receta se escribe 2–2–1–2–2–2–1. Cada número dice cuántas teclas avanzar antes de la siguiente nota.'],['Termina en el mismo nombre','Después de siete notas, el último semitono te lleva al nombre inicial, una octava más arriba.']],remember:'Escala mayor: tono, tono, semitono, tono, tono, tono, semitono.',visual:['T','T','S','T','T','T','S'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:380},exercise:{type:'choice',question:'¿Cuál es la receta de pasos de la escala mayor?',answers:['T–T–S–T–T–T–S','T–S–T–T–S–T–T','S–T–T–S–T–T–T'],correct:0,why:'La escala mayor sigue tono, tono, semitono, tono, tono, tono, semitono.'},tab:'scales'},
  {chapter:'scales',title:'Construyamos escalas mayores',time:'5 min',intro:'Ahora usaremos la receta para armar una escala. Empieza en Do, escucha el ejemplo y luego toca las notas en orden.',parts:[['Empieza por Do','En Do mayor avanzas usando solo teclas blancas: Do–Re–Mi–Fa–Sol–La–Si–Do.'],['Usa la receta en otros lugares','La receta también funciona en Sol, Fa, Re y La. Algunas escalas necesitan teclas negras para conservar las mismas distancias.'],['Tócala tú','Elige una nota de inicio. La app mostrará la escala que resulta; escucha el ejemplo y luego toca cada nota en orden.']],remember:'No memorices cada escala por separado: aplica la receta desde la nota inicial.',visual:['C mayor','G mayor','F mayor','D mayor','A mayor'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:380},exercise:{type:'scale',roots:['C','G','F','D','A'],hint:'Escucha el ejemplo y toca la escala nota por nota, en orden.'},tab:'scales'},
  {chapter:'scales',title:'La menor y su familiar Do mayor',time:'4 min',intro:'La menor natural y Do mayor usan las mismas teclas blancas, pero comienzan en notas diferentes y se sienten distintas.',parts:[['La menor empieza en La','La escala es La–Si–Do–Re–Mi–Fa–Sol–La. Al recorrerla desde La, ese es el centro que escuchamos.'],['Do mayor empieza en Do','Do mayor usa Do–Re–Mi–Fa–Sol–La–Si–Do. Comparte sus notas con La menor natural.'],['Se llaman relativas','Do mayor y La menor son tonalidades relativas: comparten las notas, pero su nota de descanso es distinta. Por ahora escucha cómo cambia el punto de llegada.']],remember:'Do mayor y La menor natural comparten las teclas blancas, pero no el mismo centro.',visual:['C mayor','C D E F G A B','A menor','A B C D E F G'],demo:{notes:[60,62,64,65,67,69,71,72,69,71,72,74,76,77,79,81],spacing:350},exercise:{type:'choice',question:'¿Qué comparten Do mayor y La menor natural?',answers:['Las mismas siete notas','La misma nota de inicio','Solo las teclas negras'],correct:0,why:'Usan las mismas notas blancas, pero empiezan en centros diferentes.'},tab:'scales'},
  {chapter:'scales',title:'Sol mayor y Fa mayor usan una tecla negra',time:'4 min',intro:'La receta mayor no cambia. Al empezar en Sol o en Fa, una tecla negra ayuda a mantener las distancias correctas.',parts:[['Sol mayor necesita Fa sostenido','Las notas son Sol–La–Si–Do–Re–Mi–Fa♯–Sol. Fa♯ acerca el último paso a Sol y completa la receta.'],['Fa mayor necesita Si bemol','Fa–Sol–La–Si♭–Do–Re–Mi–Fa. Si♭ mantiene los pasos en el orden de una escala mayor.'],['Una fórmula sirve para ambas','Las teclas negras no son una regla aparte: aparecen porque el patrón de tonos y semitonos debe conservarse.']],remember:'Sigue la fórmula; la tonalidad te dirá si hace falta una tecla negra.',visual:['G','A','B','C','D','E','F♯','G'],demo:{notes:[67,69,71,72,74,76,78,79,65,67,69,70,72,74,76,77],spacing:350},exercise:{type:'scale',roots:['G','F'],hint:'Elige Sol o Fa y toca su escala mayor completa.'},tab:'scales'},
  {chapter:'chords',title:'Melodía y acorde: una nota o varias',time:'3 min',intro:'Una melodía suele tocar una nota después de otra. Un acorde junta varias notas y las hace sonar al mismo tiempo.',parts:[['La melodía cuenta una historia','Prueba Do, luego Mi y luego Sol, una tecla a la vez. Cada sonido llega después del anterior.'],['El acorde suena junto','Ahora toca Do, Mi y Sol al mismo tiempo. Las tres notas forman un acorde que puede acompañar una melodía.'],['Las dos cosas trabajan juntas','En una canción, una mano puede tocar la melodía mientras la otra acompaña con acordes. No hace falta usar las dos manos desde el primer día.']],remember:'Melodía: notas en fila. Acorde: varias notas juntas.',visual:['Do','después','Mi','después','Sol','juntas: acorde'],demo:{notes:[60,64,67],spacing:750},exercise:{type:'choice',question:'¿Qué hace que un acorde sea distinto de una melodía?',answers:['Varias notas suenan juntas','Solo usa teclas negras','Siempre se toca rápido'],correct:0,why:'Un acorde junta varias notas al mismo tiempo.'},tab:'chords'},
  {chapter:'chords',title:'Tríada: la forma 1–3–5',time:'4 min',intro:'El acorde básico que aprenderemos tiene tres notas. Por eso también se llama tríada.',parts:[['La nota 1 es el comienzo','La primera nota se llama fundamental o raíz. Si empiezas en Do, el acorde se llamará algún tipo de acorde de Do.'],['La 3 y la 5 cuentan lugares','Desde la raíz buscamos la tercera y la quinta. En Do mayor son Mi y Sol: Do–Mi–Sol.'],['Tócalas juntas','Presiona Do, Mi y Sol a la vez. La fórmula 1–3–5 te recuerda cuáles son los tres puestos.']],remember:'Una tríada tiene tres notas: fundamental, tercera y quinta.',visual:['1','3','5','C','E','G'],demo:{notes:[60,64,67],spacing:0,duration:1.4},exercise:{type:'choice',question:'¿Cuántas notas tiene una tríada básica?',answers:['Dos','Tres','Siete'],correct:1,why:'Tri- significa tres; una tríada reúne tres notas.'},tab:'chords'},
  {chapter:'chords',title:'Acordes mayores: Do, Fa y Sol',time:'4 min',intro:'Un acorde mayor se forma con la raíz, una tercera mayor y una quinta. Empezaremos con tres acordes muy usados.',parts:[['Do mayor: Do–Mi–Sol','Busca Do, Mi y Sol. Tócalos juntos para escuchar el acorde de Do mayor.'],['Fa mayor: Fa–La–Do','Empieza en Fa y cuenta la tercera y la quinta: La y Do. Puedes tocar el Do de arriba del inicio.'],['Sol mayor: Sol–Si–Re','Desde Sol, las notas son Sol, Si y Re. Cada acorde tiene su propio grupo de tres teclas.']],remember:'Los acordes mayores usan las distancias 0, 4 y 7 semitonos desde su raíz.',visual:['C: C–E–G','F: F–A–C','G: G–B–D'],demo:{chords:[[60,64,67],[65,69,72],[67,71,74]],spacing:1100,duration:1},exercise:{type:'chord-builder',targets:[{root:'C',quality:'major'},{root:'F',quality:'major'},{root:'G',quality:'major'}],hint:'Toca las tres notas del acorde que aparece en pantalla. Puedes tocarlas en cualquier orden.'},tab:'chords'},
  {chapter:'chords',title:'Acorde menor: La menor',time:'4 min',intro:'Un acorde menor se parece mucho al mayor. Solo cambia una nota: la tercera baja un semitono.',parts:[['Compara Do mayor y Do menor','Do mayor es Do–Mi–Sol. Do menor es Do–Mi♭–Sol. La nota del medio bajó un paso pequeño.'],['La menor usa La–Do–Mi','El acorde de La menor se forma con La, Do y Mi. En el piano son tres teclas blancas.'],['Escucha la diferencia','Toca Do mayor y Do menor; después toca La menor. Escuchar ayuda a reconocer el color sin memorizar fórmulas a ciegas.']],remember:'En el acorde menor, la tercera está un semitono más baja que en el mayor.',visual:['C mayor: C–E–G','C menor: C–E♭–G','A menor: A–C–E'],demo:{chords:[[60,64,67],[60,63,67],[69,72,76]],spacing:1200,duration:1},exercise:{type:'chord-builder',targets:[{root:'A',quality:'minor'}],hint:'Construye La menor tocando La, Do y Mi.'},tab:'chords'},
  {chapter:'chords',title:'El acorde disminuido: una primera mirada',time:'3 min',intro:'Hay otros tipos de acordes además de mayor y menor. Solo conoceremos por ahora el disminuido, que aparece en el séptimo lugar de Do mayor.',parts:[['B–D–F forman Si disminuido','Toca Si, Re y Fa. La fórmula es 1–♭3–♭5: la tercera y la quinta quedan más cerca que en el acorde mayor.'],['Escúchalo como parte de la familia','En Do mayor, Si disminuido es un acorde especial. No tienes que aprender a usarlo mucho todavía; basta con reconocerlo.'],['Una etiqueta corta','En una lista de acordes puedes verlo como Bdim o B°. Ambos nombres señalan este tipo de acorde.']],remember:'Bdim en Do mayor usa Si, Re y Fa.',visual:['B','D','F','1–♭3–♭5'],demo:{notes:[71,74,77],spacing:0,duration:1.3},exercise:{type:'choice',question:'¿Qué notas forman B disminuido?',answers:['B–D–F','B–D♯–F♯','C–E–G'],correct:0,why:'B disminuido usa Si, Re y Fa.'},tab:'chords'},
  {chapter:'chords',title:'Inversiones: el mismo acorde en otro orden',time:'4 min',intro:'Una inversión conserva las notas del acorde, pero cambia cuál queda abajo. Así la mano puede moverse menos entre acordes.',parts:[['Posición fundamental','Do mayor en su orden inicial es Do–Mi–Sol. Do, la fundamental, queda abajo.'],['Primera inversión: C/E','Sube el Do una octava: Mi–Sol–Do. El acorde sigue siendo Do mayor, pero Mi quedó abajo. C/E significa Do mayor con Mi en el bajo.'],['Segunda inversión','Sube también Mi: Sol–Do–Mi. Las notas siguen siendo Do, Mi y Sol, solo cambió el orden y la altura.']],remember:'Invertir cambia el orden y la nota más grave; el acorde conserva sus notas.',visual:['C–E–G','E–G–C','G–C–E'],demo:{chords:[[60,64,67],[64,67,72],[67,72,76]],spacing:1150,duration:1},exercise:{type:'inversion',root:'C',quality:'major',inversion:1,hint:'Construye C/E: toca Mi4, Sol4 y el Do de la octava siguiente.'},tab:'chords'},
  {chapter:'chords',title:'Reto: construye acordes básicos',time:'5 min',intro:'Ya viste cómo se forman distintos acordes. Ahora la app te pedirá uno para que encuentres sus tres notas en el piano.',parts:[['Lee el nombre del acorde','La letra o nota inicial te dice la raíz. La palabra mayor o menor te dice qué tercera buscar.'],['Mira las notas de ayuda','La app mostrará el acorde y sus notas. Las teclas iluminadas te ayudan a ubicarlas en el teclado.'],['Arma el acorde','Toca las tres notas. Puedes presionarlas una por una; cuando estén las tres, escucharás que completaste el acorde.']],remember:'Raíz, tercera y quinta forman la tríada.',visual:['C','G','F','D','A','Am'],demo:{notes:[67,71,74],spacing:0,duration:1.3},exercise:{type:'chord-builder',targets:[{root:'C',quality:'major'},{root:'G',quality:'major'},{root:'F',quality:'major'},{root:'D',quality:'major'},{root:'A',quality:'major'},{root:'A',quality:'minor'},{root:'D',quality:'minor'}],random:true,hint:'La app eligió un acorde. Toca sus tres notas; puedes cambiar de reto cuando quieras.'},tab:'chords'},
  {chapter:'harmony',title:'Tonalidad: el hogar de una canción',time:'3 min',intro:'Una tonalidad es el grupo de notas y acordes que gira alrededor de una nota principal, como si fuera el hogar de la canción.',parts:[['Do mayor descansa en Do','La nota Do suele sentirse como un buen lugar para terminar una canción en Do mayor. Por eso decimos que Do es su centro.'],['La menor descansa en La','La menor usa las mismas notas blancas, pero La es su centro. La música puede sentirse distinta aunque las teclas sean las mismas.'],['La escala organiza la tonalidad','La escala te muestra qué notas pertenecen a ese hogar. De esas notas nacen los acordes que combinan bien.']],remember:'La tonalidad nos dice cuál es el centro musical y qué notas forman su familia.',visual:['Centro','Notas','Acordes','Canción'],demo:{chords:[[60,64,67],[69,72,76]],spacing:1300,duration:1.1},exercise:{type:'choice',question:'¿Qué nos ayuda a entender una tonalidad?',answers:['El centro y la familia de notas y acordes','Solo el volumen de la canción','Cuántas teclas negras hay en el piano'],correct:0,why:'La tonalidad organiza notas y acordes alrededor de un centro.'},tab:'keys'},
  {chapter:'harmony',title:'Acordes de Do mayor y La menor',time:'4 min',intro:'Cada nota de una escala puede ser el inicio de un acorde. Así obtenemos una familia de acordes que suenan relacionados.',parts:[['La familia de Do mayor','Do mayor tiene: C, Dm, Em, F, G, Am y Bdim. Se forman usando las notas de la escala de Do mayor.'],['La familia de La menor','La menor natural comparte esas notas: Am, Bdim, C, Dm, Em, F y G. La familia es la misma, pero el centro ahora es La.'],['Se apilan notas alternas','Para formar cada tríada, toma una nota, salta la siguiente de la escala, toma otra, salta una y toma la tercera. Esa es una forma sencilla de entender 1–3–5.']],remember:'Los acordes de una tonalidad se construyen usando las notas de su escala.',visual:['C','Dm','Em','F','G','Am','Bdim'],demo:{chords:[[60,64,67],[62,65,69],[64,67,72],[65,69,72],[67,71,74],[69,72,76],[71,74,77]],spacing:900,duration:.8},exercise:{type:'choice',question:'¿Cuál de estos acordes pertenece a Do mayor?',answers:['Re menor','Re mayor','Fa sostenido mayor'],correct:0,why:'Re menor se forma con las notas de Do mayor.'},tab:'keys'},
  {chapter:'harmony',title:'Números romanos: un mapa para los acordes',time:'4 min',intro:'Los números romanos nombran el puesto de cada acorde dentro de una tonalidad. Así podemos hablar del recorrido sin depender de una sola nota inicial.',parts:[['Cada número es un lugar','En Do mayor, I es Do, ii es Re menor, iii es Mi menor y así seguimos hasta vii°.'],['Mayúscula y minúscula','I, IV y V suelen ser acordes mayores. ii, iii y vi son menores. El símbolo ° muestra que el acorde del séptimo lugar es disminuido.'],['El patrón viaja','I–V–vi–IV en Do significa C–G–Am–F. En otra tonalidad, los nombres cambian pero los números conservan su orden.']],remember:'Los números romanos nombran el lugar del acorde, no una tecla fija.',visual:['I','ii','iii','IV','V','vi','vii°'],demo:{chords:[[60,64,67],[67,71,74],[69,72,76],[65,69,72]],spacing:1000,duration:.9},exercise:{type:'choice',question:'En Do mayor, ¿qué acorde representa V?',answers:['Sol mayor','Fa mayor','La menor'],correct:0,why:'V es el quinto acorde: Sol mayor.'},tab:'keys'},
  {chapter:'harmony',title:'El círculo de quintas: un mapa de tonalidades',time:'4 min',intro:'El círculo de quintas es un mapa redondo que ordena las tonalidades. No tienes que memorizarlo hoy: vamos a aprender a leer solo una pequeña parte.',parts:[['Do está arriba','En el mapa, Do mayor aparece arriba. Si avanzas un lugar hacia la derecha, llegas a Sol mayor; después viene Re mayor.'],['Las vecinas se parecen','Dos tonalidades vecinas comparten muchas notas y se diferencian poco. Por eso el círculo ayuda a encontrar tonalidades cercanas.'],['También muestra acordes menores','Debajo o dentro de cada tonalidad mayor suele aparecer su familiar menor. Do mayor y La menor, por ejemplo, usan las mismas teclas blancas.']],remember:'Al avanzar una posición a la derecha desde Do en el círculo de quintas, llegas a Sol.',visual:['Do','Sol','Re','La','Mi'],demo:{chords:[[60,64,67],[67,71,74],[62,66,69],[69,73,76]],spacing:900,duration:1},exercise:{type:'choice',question:'En el círculo de quintas, ¿qué tonalidad sigue a Do al avanzar una posición a la derecha?',answers:['Sol','Fa','La'],correct:0,why:'El recorrido hacia la derecha empieza Do, Sol, Re, La, Mi…'},tab:'circle'},  {chapter:'harmony',title:'Explora una tonalidad y su familia',time:'5 min',intro:'Elige una tonalidad y observa cómo la escala produce siete acordes. Escucha cada uno para conectar la teoría con el piano.',parts:[['Mira primero las notas','En Sol mayor, por ejemplo, las notas son G–A–B–C–D–E–F♯.'],['Debajo aparecen sus acordes','La familia de Sol mayor es G, Am, Bm, C, D, Em y F♯dim. Cada acorde empieza en una nota de la escala.'],['Elige un acorde para oírlo','Toca una tarjeta de acorde. La app resaltará sus notas en el piano y lo reproducirá para que veas y escuches de qué está hecho.']],remember:'G mayor incluye F♯; sus acordes salen de las notas G–A–B–C–D–E–F♯.',visual:['G','Am','Bm','C','D','Em','F♯dim'],demo:{chords:[[67,71,74],[69,72,76],[71,74,78],[72,76,79],[74,78,81],[76,79,83],[78,81,84]],spacing:900,duration:.8},exercise:{type:'key-family',roots:['C','G'],targetDegree:6,hint:'Elige Do o Sol mayor y toca la tarjeta del acorde vi.'},tab:'keys'},
  {chapter:'harmony',title:'Progresión: un recorrido de acordes',time:'3 min',intro:'Una progresión es una secuencia de acordes que acompaña una parte de una canción.',parts:[['Sigue el orden','I–IV–V es una progresión: toca el acorde I, luego IV y luego V. En Do mayor sería C–F–G.'],['El número depende de la tonalidad','En Do mayor, I es C. En Sol mayor, I es G. El número siempre indica el puesto en la escala elegida.'],['Vuelve a empezar','Después del último acorde puedes regresar al primero. Así se forma una vuelta que acompaña una estrofa o un coro.']],remember:'Una progresión te dice qué acordes tocar y en qué orden.',visual:['I','IV','V','I'],demo:{chords:[[60,64,67],[65,69,72],[67,71,74],[60,64,67]],spacing:1000,duration:.9},exercise:{type:'choice',question:'¿Qué describe una progresión?',answers:['Una secuencia ordenada de acordes','Una tecla tocada más fuerte','Los nombres de las octavas'],correct:0,why:'Una progresión es un camino de acordes en un orden determinado.'},tab:'keys'},
  {chapter:'harmony',title:'Tres caminos para acompañar canciones',time:'4 min',intro:'Hay progresiones que aparecen en muchas canciones y acompañamientos modernos. No pertenecen a un solo estilo; son caminos útiles para practicar.',parts:[['I–IV–V','En Do mayor: C–F–G. Es un recorrido corto y fácil de escuchar.'],['I–V–vi–IV','En Do: C–G–Am–F. En Sol: G–D–Em–C. El mismo patrón cambia de nombres al cambiar de tonalidad.'],['vi–IV–I–V','En Do: Am–F–C–G. Empezar en vi da otro punto de partida, aunque use la misma familia de acordes.']],remember:'Los números muestran el recorrido; la tonalidad determina los nombres de los acordes.',visual:['I–IV–V','I–V–vi–IV','vi–IV–I–V'],demo:{chords:[[60,64,67],[67,71,74],[69,72,76],[65,69,72]],spacing:1000,duration:.9},exercise:{type:'choice',question:'¿Cuál es I–V–vi–IV en Do mayor?',answers:['C–G–Am–F','C–F–G–C','Am–F–C–G'],correct:0,why:'En Do mayor, I=C, V=G, vi=Am y IV=F.'},tab:'keys'},
  {chapter:'harmony',title:'Cambia de tonalidad, conserva el recorrido',time:'4 min',intro:'Transportar una progresión significa mover todo el recorrido a otra tonalidad manteniendo el mismo orden.',parts:[['El ejemplo en Do','I–V–vi–IV en Do mayor es C–G–Am–F.'],['Ahora en Sol','El mismo patrón en Sol mayor es G–D–Em–C. Cambiaron los nombres y las teclas, pero los puestos siguen iguales.'],['También en Re','En Re mayor queda D–A–Bm–G. Así puedes adaptar una canción a una voz más cómoda sin inventar una progresión nueva.']],remember:'Cambia la tonalidad y los acordes; conserva los números romanos y su orden.',visual:['C: C–G–Am–F','G: G–D–Em–C','D: D–A–Bm–G'],demo:{chords:[[62,66,69],[69,73,76],[71,74,78],[67,71,74]],spacing:1000,duration:.9},exercise:{type:'progression',roots:['C','G','D'],degrees:[1,5,6,4],hint:'Escucha la vuelta y luego toca los cuatro acordes, uno por uno.'},tab:'keys'},
  {chapter:'accompaniment',title:'Lee el cifrado: C, Am, F y G',time:'4 min',intro:'En muchas canciones, las letras sobre la melodía son una forma rápida de decir qué acorde tocar. Se llama cifrado de acordes.',parts:[['Una letra nombra la nota de inicio','C significa Do; G significa Sol; F significa Fa. Esos nombres usan letras del alfabeto para las notas.'],['La letra “m” quiere decir menor','Am se lee La menor. La letra A significa La y la m pequeña avisa que es un acorde menor. Si no hay una m, como en C, normalmente hablamos de Do mayor.'],['El cifrado indica cuándo cambiar','Cuando la letra aparece sobre una parte de la canción, toca ese acorde mientras suena esa parte. Al aparecer el siguiente cifrado, cambias al siguiente acorde.']],remember:'C = Do mayor · Am = La menor. La letra nombra la raíz y “m” indica menor.',visual:['C = Do','Am = La menor','F = Fa','G = Sol'],demo:{chords:[[60,64,67],[69,72,76],[65,69,72],[67,71,74]],spacing:1000,duration:1},exercise:{type:'choice',question:'¿Qué significa Am en un cifrado?',answers:['La menor','La mayor','Do menor'],correct:0,why:'A es La y la m indica que el acorde es menor.'},tab:'chords'},
  {chapter:'accompaniment',title:'La mano izquierda: toca una nota grave',time:'4 min',intro:'Para empezar a acompañar no necesitas aprender muchas notas a la vez. La mano izquierda puede tocar una sola nota grave que dé apoyo al acorde.',parts:[['Busca una nota más grave','Los sonidos graves están hacia la izquierda del piano. Do3 es un Do que suena más bajo que Do4.'],['El bajo da el suelo','Si el acorde es Do mayor, puedes tocar un Do grave mientras la mano derecha toca Do, Mi y Sol. Esa nota grave ayuda a que la canción se sienta firme.'],['Empieza con una sola nota','No estires ni tenses la mano. Primero encuentra el Do indicado y tócalo despacio. Cuando te resulte cómodo, prueba otras raíces.']],remember:'La mano izquierda puede tocar la nota raíz del acorde en una zona grave.',visual:['Mano izquierda','Do3','Mano derecha','Do–Mi–Sol'],demo:{notes:[48,60,64,67],spacing:550},exercise:{type:'find-note',targetMidi:48,random:false,pool:'do',hint:'Busca Do3, el Do más grave que aparece en este teclado.'},tab:'piano'},
  {chapter:'accompaniment',title:'Tres patrones sencillos para acompañar',time:'5 min',intro:'Un patrón es una manera de repartir las notas del acorde en el tiempo. Con las mismas notas puedes acompañar de varias formas.',parts:[['Acorde completo','La opción más fácil: toca las tres notas de la mano derecha juntas al empezar el compás y deja que suenen.'],['Bajo y acorde por turnos','Toca la nota grave con la izquierda en el primer pulso. Luego responde con el acorde de la derecha. Alterna sin apurarte.'],['Notas separadas o arpegio','También puedes tocar las notas del acorde una después de otra: Do, Mi, Sol. Empieza lento y mantén el pulso parejo.']],remember:'Primero mantén el ritmo constante; después cambia la forma de repartir las notas.',visual:['Juntas','Bajo · acorde','Do · Mi · Sol'],demo:{notes:[48,60,64,67,60,64,67,64,60],spacing:420},exercise:{type:'choice',question:'Si estás empezando, ¿qué patrón es más fácil para el primer intento?',answers:['Tocar el acorde completo en el primer pulso','Tocar muchas notas muy rápido','Cambiar el acorde en cada medio pulso'],correct:0,why:'Tocar el acorde completo al comienzo es sencillo y deja tiempo para prepararte.'},tab:'chords'},
  {chapter:'accompaniment',title:'Cambia de acorde con movimientos pequeños',time:'4 min',intro:'Al pasar de un acorde a otro, no siempre tienes que mover toda la mano. Puedes buscar una posición donde las notas queden cerca.',parts:[['Escucha dos acordes seguidos','Toca Do mayor y luego Fa mayor. Nota qué dedos se mueven y cuáles pueden quedarse cerca.'],['Una inversión cambia el orden','Do–Mi–Sol puede convertirse en Mi–Sol–Do. Siguen siendo las mismas notas, pero el acorde queda en otra posición.'],['Busca el camino más cómodo','En una canción, las inversiones ayudan a que la mano recorra menos distancia entre un acorde y el siguiente. No cambian el nombre del acorde.']],remember:'Una inversión conserva las notas del acorde y puede hacer más corto el siguiente movimiento.',visual:['Do–Mi–Sol','Mi–Sol–Do','Sol–Do–Mi'],demo:{chords:[[60,64,67],[65,69,72],[64,67,72]],spacing:1200,duration:1},exercise:{type:'inversion',root:'C',quality:'major',inversion:1,hint:'Toca Mi4, Sol4 y el Do de la octava de arriba; son las notas de C/E.'},tab:'chords'},
  {chapter:'accompaniment',title:'Reto final: acompaña una vuelta',time:'6 min',intro:'Llegaste a la práctica final. Vas a escuchar una secuencia, reconocer cada acorde y tocar sus notas en orden. Si hace falta, puedes volver a empezar más despacio.',parts:[['Escucha antes de tocar','Primero deja que suene la vuelta completa. Presta atención a cuándo cambia cada acorde.'],['Sigue los números','En Do mayor, I–IV–V–I quiere decir Do mayor, Fa mayor, Sol mayor y Do mayor otra vez.'],['Toca a tu ritmo','Completa las notas de cada acorde en el piano. Cuando ya conozcas el recorrido, abre el taller de práctica para probar el bajo y los patrones.']],remember:'Acompañar es escuchar, seguir el pulso y tocar los acordes en el orden indicado.',visual:['I · Do','IV · Fa','V · Sol','I · Do'],demo:{chords:[[60,64,67],[65,69,72],[67,71,74],[60,64,67]],spacing:1100,duration:1},exercise:{type:'progression',title:'Prueba I – IV – V – I',roots:['C','G'],degrees:[1,4,5,1],hint:'Escucha la vuelta y toca las tres notas de cada acorde en orden.',showWorkshop:true},tab:'keys'}
];
let theoryRhythmRun=null,theoryRhythmDemoNodes=[],theoryLessonIndex=0,theoryLessonFeedback='',theoryLessonHeard=false,theoryLessonTouched=false,theoryExerciseForIndex=-1,theoryExerciseTarget=null,theoryExerciseRoot='C',theoryExerciseQuality='major',theoryExerciseStep=0,theoryExerciseTapped=new Set(),theoryExerciseStatus='',theoryLessonNotation=safeStorageGetItem('yhwh_theory_notation')==='americano'?'americano':'latino',worshipPracticeTimer=0,worshipPracticeRunning=false,worshipPracticeStep=0;
function worshipPitchName(pc){const names=['Do','Do♯','Re','Mi♭','Mi','Fa','Fa♯','Sol','La♭','La','Si♭','Si'];return names[((pc%12)+12)%12];}
function worshipChordPlan(){
  const roots={C:0,Db:1,D:2,Eb:3,E:4,F:5,Gb:6,G:7,Ab:8,A:9,Bb:10,B:11},root=roots[$('worshipKey')?.value]??0,scale=[0,2,4,5,7,9,11],degrees=($('worshipProgression')?.value||'1-5-6-4').split('-').map(Number);
  return degrees.map(degree=>{const index=degree-1,pc=(root+scale[index])%12,minor=[2,3,6].includes(degree),notes=[0,minor?3:4,7].map(offset=>(pc+offset)%12);return{degree,pc,notes,minor,label:`${worshipPitchName(pc)} ${minor?'menor':'mayor'}`};});
}
function renderWorshipPlan(active=-1){
  const plan=worshipChordPlan(),strip=$('worshipChordStrip');if(!strip)return;
  strip.innerHTML=plan.map((chord,index)=>`<div class="worship-chord-chip${index===active?' active':''}"><b>${index+1}</b><strong>${chord.label}</strong><small>${chord.notes.map(worshipPitchName).join(' – ')}</small></div>`).join('');
  const chord=plan[Math.max(0,active)];$('worshipChordName').textContent=chord.label;$('worshipChordNotes').textContent=`Mano izquierda: ${worshipPitchName(chord.pc)} · Mano derecha: ${chord.notes.map(worshipPitchName).join(' – ')}`;
}
function stopWorshipPractice(message='Práctica detenida. Cuando quieras, empezamos otra vuelta.'){
  worshipPracticeRunning=false;clearTimeout(worshipPracticeTimer);worshipPracticeTimer=0;
  if($('worshipStart'))$('worshipStart').disabled=false;if($('worshipStop'))$('worshipStop').disabled=true;
  if($('worshipStatus'))$('worshipStatus').textContent=message;document.querySelectorAll('.worship-chord-chip').forEach(item=>item.classList.remove('active'));
}
function worshipPracticeTick(){
  if(!worshipPracticeRunning)return;const plan=worshipChordPlan(),chordIndex=Math.floor(worshipPracticeStep/4)%plan.length,beat=worshipPracticeStep%4,chord=plan[chordIndex],pattern=$('worshipPattern').value;
  if(beat===0){renderWorshipPlan(chordIndex);$('worshipStatus').textContent=`Acorde ${chordIndex+1} de ${plan.length} · pulso ${beat+1}. Toca junto cuando te sientas lista/o.`;}
  const duration=60/Number($('worshipBpm').value),bass=48+chord.pc,treble=chord.notes.map(note=>60+note);
  const sound=(midi)=>{const wasRecording=state.recording;state.recording=false;playNote(midi,null,Math.min(1.1,duration*.9),Math.min(.9,duration*.82));state.recording=wasRecording;};
  if(pattern==='block'){if(beat===0)[bass,...treble].forEach(sound);}
  else if(pattern==='alternating'){if(beat%2===0)sound(bass);else treble.forEach(sound);}
  else if(beat===0)sound(bass);else sound(treble[beat-1]);
  worshipPracticeStep++;worshipPracticeTimer=setTimeout(worshipPracticeTick,duration*1000);
}
function bindWorshipPractice(){
  ['worshipKey','worshipProgression','worshipPattern'].forEach(id=>$(id).onchange=()=>{stopWorshipPractice('Ajustes actualizados. Pulsa empezar para escuchar la progresión.');worshipPracticeStep=0;renderWorshipPlan();});
  $('worshipBpm').oninput=()=>{$('worshipBpmLabel').textContent=`${$('worshipBpm').value} BPM`;};
  $('worshipStart').onclick=()=>{if(worshipPracticeRunning)return;worshipPracticeRunning=true;worshipPracticeStep=0;$('worshipStart').disabled=true;$('worshipStop').disabled=false;void resumeAudioContext(getAudioContext());worshipPracticeTick();};
  $('worshipStop').onclick=()=>stopWorshipPractice();renderWorshipPlan();
  document.querySelectorAll('[data-go-home]').forEach(button=>button.addEventListener('click',()=>stopWorshipPractice('Práctica detenida al salir del taller.')));
  document.querySelectorAll('[data-theory-mode="explore"]').forEach(button=>button.addEventListener('click',()=>stopWorshipPractice('Práctica detenida al salir del taller.')));
}
function lessonKeyForMidi(midi){
  const focus=$('lessonPianoFocus');
  if(focus&&!focus.classList.contains('hidden'))return focus.querySelector('.lesson-key[data-focus-midi="'+midi+'"]');
  return document.querySelector('#theoryLearning:not(.hidden) .lesson-key[data-lesson-midi="'+midi+'"]');
}
const THEORY_LESSON_PROGRESS_KEY='yhwh_theory_lessons_v3';

const THEORY_MAJOR_STEPS=[0,2,4,5,7,9,11],THEORY_MAJOR_FORMULA=[0,2,4,5,7,9,11,12],THEORY_NATURAL_PCS=[0,2,4,5,7,9,11],THEORY_ALTERED_PCS=[1,3,6,8,10];
const THEORY_FLAT_NAMES_EN=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'],THEORY_FLAT_NAMES_LATINO=['Do','Re♭','Re','Mi♭','Mi','Fa','Sol♭','Sol','La♭','La','Si♭','Si'];
function theoryProgress(){
  try{
    const current=safeStorageGetItem(THEORY_LESSON_PROGRESS_KEY);
    if(current!==null){const value=JSON.parse(current);return Array.isArray(value)?value.filter(index=>Number.isInteger(index)&&index>=0&&index<THEORY_LESSONS.length):[];}
    const previous=JSON.parse(safeStorageGetItem('yhwh_theory_lessons_v2')||'[]');
    const migrated=Array.isArray(previous)?previous.filter(index=>Number.isInteger(index)&&index>=0&&index<29).map(index=>index===0?1:index===1?0:index<6?index:index<10?index+4:index<26?index+5:index+6):[];
    localStorage.setItem(THEORY_LESSON_PROGRESS_KEY,JSON.stringify(migrated));
    return migrated;
  }catch(_){return[]}
}
function theoryPitch(root){const names={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};return names[root]??0}
function theoryNoteLabel(midi,withOctave=true,preferFlat=false){
  const pc=((midi%12)+12)%12,octave=Math.floor(midi/12)-1;
  const names=preferFlat?(theoryLessonNotation==='latino'?THEORY_FLAT_NAMES_LATINO:THEORY_FLAT_NAMES_EN):(theoryLessonNotation==='latino'?NOTE_NAMES_LATINO:NOTE_NAMES);
  const name=String(names[pc]).replace('#','♯');return name+(withOctave?octave:'');
}
function theoryPcLabel(pc,preferFlat=false){return theoryNoteLabel(60+((pc%12)+12)%12,false,preferFlat)}
function theoryEnharmonicLabel(midi){
  const pc=((midi%12)+12)%12;if(![1,3,6,8,10].includes(pc))return '';
  return theoryNoteLabel(midi,true,false)+' / '+theoryNoteLabel(midi,true,true);
}
function theoryQualityLabel(quality){return quality==='minor'?'menor':quality==='dim'?'disminuido':'mayor'}
function theoryChordShortName(root,quality='major'){return theoryPcLabel(theoryPitch(root))+(quality==='minor'?'m':quality==='dim'?'dim':'')}
function theoryChordTitle(root,quality='major'){return theoryPcLabel(theoryPitch(root))+' '+theoryQualityLabel(quality)}
function theoryChordIntervals(quality){return quality==='minor'?[0,3,7]:quality==='dim'?[0,3,6]:[0,4,7]}
function theoryChordMidis(root,quality='major',inversion=0){
  const rootMidi=60+theoryPitch(root),notes=theoryChordIntervals(quality).map(semitone=>rootMidi+semitone);
  if(inversion===1)return[notes[1],notes[2],notes[0]+12];
  if(inversion===2)return[notes[2],notes[0]+12,notes[1]+12];
  return notes;
}
function theoryScaleMidis(root,mode='major'){const steps=mode==='minor'?[0,2,3,5,7,8,10,12]:THEORY_MAJOR_FORMULA,base=60+theoryPitch(root);return steps.map(semitone=>base+semitone)}
function theoryDiatonicFamily(root,mode='major'){
  const pc=theoryPitch(root),minor=mode==='minor',scale=minor?[0,2,3,5,7,8,10]:THEORY_MAJOR_STEPS;
  const qualities=minor?['minor','dim','major','minor','minor','major','major']:['major','minor','minor','major','major','minor','dim'];
  const roman=minor?['i','ii°','III','iv','v','VI','VII']:['I','ii','iii','IV','V','vi','vii°'];
  const chords=scale.map((step,index)=>{const chordRoot=NOTE_NAMES[(pc+step)%12],quality=qualities[index],intervals=theoryChordIntervals(quality);return{degree:index+1,roman:roman[index],root:chordRoot,quality,notes:intervals.map(interval=>(pc+step+interval)%12),label:theoryChordShortName(chordRoot,quality)}});
  return{scale:scale.map(step=>(pc+step)%12),chords};
}
function theoryAllowedPitches(pool){
  const pcs=pool==='do'?[0]:pool==='natural'?THEORY_NATURAL_PCS:pool==='altered'?THEORY_ALTERED_PCS:Array.from({length:12},(_,index)=>index);
  return[3,4,5].flatMap(octave=>pcs.map(pc=>(octave+1)*12+pc)).filter(midi=>midi>=48&&midi<=83);
}
function prepareTheoryExercise(){
  if(theoryExerciseForIndex===theoryLessonIndex)return;
  theoryExerciseForIndex=theoryLessonIndex;theoryExerciseTarget=null;theoryExerciseStep=0;theoryExerciseTapped=new Set();theoryExerciseStatus='';theoryLessonHeard=false;
  const exercise=THEORY_LESSONS[theoryLessonIndex]?.exercise||{};theoryExerciseRoot=exercise.roots?.[0]||'C';theoryExerciseQuality=exercise.quality||'major';
  if(exercise.type==='find-note'){const pitches=theoryAllowedPitches(exercise.pool||'all');theoryExerciseTarget=Number.isInteger(exercise.targetMidi)?exercise.targetMidi:(pitches[Math.floor(Math.random()*pitches.length)]||60);}
  else if(exercise.type==='interval'){const pairs=exercise.pairs||[[60,62]];theoryExerciseTarget=pairs[Math.floor(Math.random()*pairs.length)];}
  else if(exercise.type==='chord-builder'){const targets=exercise.targets||[{root:'C',quality:'major'}];theoryExerciseTarget=exercise.random?targets[Math.floor(Math.random()*targets.length)]:targets[0];theoryExerciseRoot=theoryExerciseTarget.root;theoryExerciseQuality=theoryExerciseTarget.quality;}
  else if(exercise.type==='inversion'){theoryExerciseTarget={root:exercise.root||'C',quality:exercise.quality||'major',inversion:exercise.inversion||1};theoryExerciseRoot=theoryExerciseTarget.root;theoryExerciseQuality=theoryExerciseTarget.quality;}
}
function theoryExerciseScaleTarget(){const exercise=THEORY_LESSONS[theoryLessonIndex]?.exercise||{},root=theoryExerciseRoot||exercise.roots?.[0]||'C';return{root,notes:theoryScaleMidis(root)}}
function theoryScaleNoteLabel(midi,root){return theoryNoteLabel(midi,true,root==='F')}
function theoryExerciseChordTarget(){
  const exercise=THEORY_LESSONS[theoryLessonIndex]?.exercise||{};
  if(exercise.type==='inversion'){const target=theoryExerciseTarget||{root:exercise.root||'C',quality:exercise.quality||'major',inversion:exercise.inversion||1};return{...target,midis:theoryChordMidis(target.root,target.quality,target.inversion)}}
  const target=theoryExerciseTarget||exercise.targets?.[0]||{root:'C',quality:'major'};return{...target,midis:theoryChordMidis(target.root,target.quality)};
}
function theoryExerciseProgression(){
  const exercise=THEORY_LESSONS[theoryLessonIndex]?.exercise||{},root=theoryExerciseRoot||exercise.roots?.[0]||'C',family=theoryDiatonicFamily(root,'major'),degrees=exercise.degrees||[1,5,6,4];
  return{root,family,chords:degrees.map(degree=>family.chords[degree-1]).filter(Boolean)};
}
function theoryExerciseActivePcs(lesson){
  const exercise=lesson.exercise||{};
  if(exercise.type==='find-note')return[];
  if(exercise.type==='interval')return theoryExerciseTarget||[];
  if(exercise.type==='scale'){const notes=theoryExerciseScaleTarget().notes;return theoryLessonHeard?notes.map(midi=>midi%12):[notes[Math.min(theoryExerciseStep,notes.length-1)]%12]}
  if(exercise.type==='chord-builder'||exercise.type==='inversion')return theoryExerciseChordTarget().midis.map(midi=>midi%12);
  if(exercise.type==='progression'){if(!theoryLessonHeard)return[];const progression=theoryExerciseProgression(),chord=progression.chords[Math.min(theoryExerciseStep,progression.chords.length-1)];return chord?.notes||[]}
  return(lesson.demo?.notes||lesson.demo?.chords?.[0]||[]).map(midi=>midi%12);
}
function theoryChapterNumber(id){return Math.max(1,THEORY_CHAPTERS.findIndex(chapter=>chapter.id===id)+1)}
function theoryRenderAnswerButtons(exercise){return(exercise.answers||[]).map((answer,index)=>'<button type="button" class="lesson-answer" data-answer-index="'+index+'">'+escapeHTML(answer.label||answer)+'</button>').join('')}
function theoryRenderExercise(lesson){
  const exercise=lesson.exercise||{},status=theoryExerciseStatus||exercise.hint||'Tómate tu tiempo. Puedes volver a escuchar el ejemplo cuando quieras.';
  if(exercise.type==='rhythm'){
    const bars=(exercise.pattern||'x.x.x.x.|x.x.x.x.').split('|'),subdivisions=Math.max(1,Math.floor(Number(exercise.subdivisions)||2)),beatsPerBar=Math.max(1,Math.floor(Number(exercise.beatsPerBar)||4)),cellsPerBar=subdivisions*beatsPerBar;
    const grid=bars.map((bar,barIndex)=>'<div class="lesson-rhythm-bar" style="--rhythm-cells:'+cellsPerBar+'" aria-label="Compás '+(barIndex+1)+'">'+[...bar].map((mark,step)=>'<i class="lesson-rhythm-cell'+(mark==='x'?' target':'')+'" data-rhythm-cell="'+(barIndex*cellsPerBar+step)+'"><span aria-hidden="true">'+(subdivisions===2?(step%2===0?String(step/2+1):'y'):String(step+1))+'</span></i>').join('')+'</div>').join('');
    const rhythmQuestion=exercise.question?'<div class="lesson-rhythm-question"><p>'+escapeHTML(exercise.question)+'</p><div class="lesson-answers">'+(exercise.answers||[]).map((answer,index)=>'<button type="button" class="lesson-answer" data-answer-index="'+index+'">'+escapeHTML(answer)+'</button>').join('')+'</div></div>':'';
    return'<div class="lesson-task lesson-rhythm-task"><small>ESCUCHA Y MARCA EL RITMO</small><h3>Sigue los clics con calma</h3><p>'+escapeHTML(exercise.prompt||'Escucha y toca al ritmo de los clics.')+'</p><div class="lesson-rhythm-grid" aria-label="Patrón: cada fila muestra un compás; los cuadros marcados son los momentos para tocar">'+grid+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(theoryExerciseStatus||'Pulsa empezar. Escucharás cuatro clics para prepararte.')+'</p><div class="lesson-rhythm-actions"><button type="button" class="lesson-task-secondary" data-rhythm-start>▶ Empezar práctica</button><button type="button" class="lesson-rhythm-pad" data-rhythm-pad>👆 Tocar aquí</button></div>'+rhythmQuestion+'</div>';
  }
  if(exercise.type==='find-note'){
    const target=Number(theoryExerciseTarget)||60,display=theoryNoteLabel(target,true),alias=theoryEnharmonicLabel(target);
    return'<div class="lesson-task"><small>RETO EN EL TECLADO</small><h3>Encuentra '+escapeHTML(display)+'</h3>'+(alias?'<p class="lesson-task-alias">Esta tecla también puede llamarse '+escapeHTML(alias)+'.</p>':'')+'<p>Busca la tecla exacta. La octava indicada también cuenta.</p><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(status)+'</p>'+(exercise.targetMidi===undefined?'<button type="button" class="lesson-task-secondary" data-exercise-reset>🎲 Pedir otra nota</button>':'')+'</div>';
  }
  if(exercise.type==='interval'){
    const pair=theoryExerciseTarget||[60,62],options=exercise.answers||[];
    return'<div class="lesson-task"><small>ESCUCHA Y COMPARA</small><h3>¿Qué distancia hay entre '+escapeHTML(theoryNoteLabel(pair[0],true))+' y '+escapeHTML(theoryNoteLabel(pair[1],true))+'?</h3><p>Toca Escuchar, mira cuántas teclas hay entre las notas y elige una respuesta.</p><button type="button" class="lesson-task-secondary" data-exercise-listen>▶ Escuchar las dos notas</button><div class="lesson-answers">'+options.map(answer=>'<button type="button" class="lesson-answer" data-interval-answer="'+answer.value+'">'+escapeHTML(answer.label)+'</button>').join('')+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(status)+'</p></div>';
  }
  if(exercise.type==='scale'){
    const roots=exercise.roots||['C'],target=theoryExerciseScaleTarget(),notes=target.notes,next=notes[Math.min(theoryExerciseStep,notes.length-1)];
    return'<div class="lesson-task"><small>CONSTRUYE Y TOCA</small><h3>Escala mayor de '+escapeHTML(theoryPcLabel(theoryPitch(target.root)))+'</h3><p>Elige el punto de partida y toca las ocho notas en orden, hasta llegar a la siguiente octava.</p><label class="lesson-task-select">Nota de inicio<select data-theory-exercise-root>'+roots.map(root=>'<option value="'+escapeHTML(root)+'"'+(root===theoryExerciseRoot?' selected':'')+'>'+escapeHTML(theoryPcLabel(theoryPitch(root)))+'</option>').join('')+'</select></label><p class="lesson-task-formula">Receta: tono · tono · semitono · tono · tono · tono · semitono</p><div class="lesson-task-note-row theory-scale-note-row'+(theoryLessonHeard?'':' hidden')+'" id="theoryScaleNoteRow">'+notes.map(note=>'<span>'+escapeHTML(theoryScaleNoteLabel(note,target.root))+'</span>').join('')+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(theoryExerciseStatus||('Paso '+Math.min(theoryExerciseStep+1,notes.length)+' de '+notes.length+' · toca '+theoryScaleNoteLabel(next,target.root)))+'</p><button type="button" class="lesson-task-secondary" data-lesson-demo>▶ Escuchar esta escala</button></div>';
  }
  if(exercise.type==='chord-builder'){
    const target=theoryExerciseChordTarget(),names=target.midis.map(midi=>theoryNoteLabel(midi,true));
    return'<div class="lesson-task"><small>CONSTRUYE EL ACORDE</small><h3>Toca '+escapeHTML(theoryChordTitle(target.root,target.quality))+'</h3><p>Fórmula: '+escapeHTML(target.quality==='minor'?'1 – ♭3 – 5':target.quality==='dim'?'1 – ♭3 – ♭5':'1 – 3 – 5')+'. Busca sus tres notas en el teclado.</p><div class="lesson-task-note-row">'+names.map(name=>'<span>'+escapeHTML(name)+'</span>').join('')+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(status)+'</p><button type="button" class="lesson-task-secondary" data-lesson-demo>▶ Escuchar el acorde</button>'+(exercise.random?'<button type="button" class="lesson-task-secondary" data-exercise-reset>🎲 Pedir otro acorde</button>':'')+'</div>';
  }
  if(exercise.type==='inversion'){
    const target=theoryExerciseChordTarget(),names=target.midis.map(midi=>theoryNoteLabel(midi,true));
    return'<div class="lesson-task"><small>PRUEBA UNA INVERSIÓN</small><h3>Construye '+escapeHTML(theoryChordShortName(target.root,target.quality)+'/'+theoryPcLabel(target.midis[0]%12))+'</h3><p>Estas son las notas exactas de la primera inversión. Tócalas en el orden que prefieras.</p><div class="lesson-task-note-row">'+names.map(name=>'<span>'+escapeHTML(name)+'</span>').join('')+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(status)+'</p><button type="button" class="lesson-task-secondary" data-lesson-demo>▶ Escuchar las tres posiciones</button></div>';
  }
  if(exercise.type==='key-family'){
    const roots=exercise.roots||['C','G'],root=theoryExerciseRoot||roots[0],family=theoryDiatonicFamily(root,'major'),targetDegree=Number(exercise.targetDegree)||6;
    return'<div class="lesson-task"><small>ESCALA Y FAMILIA DE ACORDES</small><h3>Explora una tonalidad mayor</h3><p>Elige una tonalidad: verás sus siete notas y los acordes que nacen de ellas. Después encuentra el acorde vi.</p><label class="lesson-task-select">Tonalidad<select data-theory-exercise-root>'+roots.map(item=>'<option value="'+escapeHTML(item)+'"'+(item===root?' selected':'')+'>'+escapeHTML(theoryPcLabel(theoryPitch(item)))+' mayor</option>').join('')+'</select></label><div class="lesson-task-note-row">'+family.scale.map(pc=>'<span>'+escapeHTML(theoryPcLabel(pc,true))+'</span>').join('')+'</div><div class="lesson-family-chords">'+family.chords.map(chord=>'<button type="button" data-family-degree="'+chord.degree+'" data-family-root="'+escapeHTML(chord.root)+'" data-family-quality="'+chord.quality+'" data-family-roman="'+escapeHTML(chord.roman)+'" aria-label="'+escapeHTML(chord.roman+' '+chord.label)+'"><small>'+escapeHTML(chord.roman)+'</small><b>'+escapeHTML(chord.label)+'</b></button>').join('')+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(theoryExerciseStatus||('En '+theoryPcLabel(theoryPitch(root))+' mayor, toca el acorde '+(family.chords[targetDegree-1]?.roman||'vi')+'.'))+'</p></div>';
  }
  if(exercise.type==='progression'){
    const roots=exercise.roots||['C','G','D'],progression=theoryExerciseProgression(),current=progression.chords[Math.min(theoryExerciseStep,progression.chords.length-1)],romanPattern=progression.chords.map(chord=>chord.roman).join(' – '),title=exercise.title||'El mismo recorrido en otra tonalidad';
    return'<div class="lesson-task"><small>ESCUCHA Y PRACTICA LA PROGRESIÓN</small><h3>'+escapeHTML(title)+'</h3><label class="lesson-task-select">Tonalidad<select data-theory-exercise-root>'+roots.map(root=>'<option value="'+escapeHTML(root)+'"'+(root===theoryExerciseRoot?' selected':'')+'>'+escapeHTML(theoryPcLabel(theoryPitch(root)))+' mayor</option>').join('')+'</select></label><p class="lesson-task-formula">'+escapeHTML(romanPattern)+'</p><div class="lesson-progression-chords">'+progression.chords.map((chord,index)=>'<span class="'+(index===theoryExerciseStep?'current':'')+'"><small>'+escapeHTML(chord.roman)+'</small><b>'+escapeHTML(chord.label)+'</b></span>').join('')+'</div><button type="button" class="lesson-task-secondary" data-progression-listen>▶ Escuchar primero</button>'+(exercise.showWorkshop?'<button type="button" class="lesson-task-secondary" data-open-worship-practice>🎹 Abrir el taller de acompañamiento</button>':'')+'<p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(theoryExerciseStatus||(theoryLessonHeard?'Ahora toca '+(current?.label||'el acorde indicado')+'.':'Escucha una vuelta completa antes de practicar.'))+'</p></div>';
  }
  if(exercise.type==='choice')return'<div class="lesson-task"><small>COMPRUEBA LA IDEA</small><h3>'+escapeHTML(exercise.question||'¿Qué aprendiste?')+'</h3><div class="lesson-answers">'+theoryRenderAnswerButtons(exercise)+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(theoryExerciseStatus||'Elige una respuesta. Si quieres, escucha el ejemplo otra vez.')+'</p></div>';
  return'<div class="lesson-task"><small>PRUEBA LO APRENDIDO</small><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(status)+'</p></div>';
}
function lessonKeyboardMarkup(lesson){
  const activePcs=new Set(theoryExerciseActivePcs(lesson).map(pc=>((pc%12)+12)%12)),preferFlat=lesson.exercise?.type==='scale'&&theoryExerciseRoot==='F',start=48,end=85,totalWhites=22;let whiteKeys='',blackKeys='',whiteBefore=0;
  for(let midi=start;midi<end;midi++){const pc=midi%12,name=NOTE_NAMES[pc];if(name.includes('#'))continue;const active=activePcs.has(pc),label=theoryNoteLabel(midi,true,preferFlat);whiteKeys+='<button type="button" class="lesson-key white'+(active?' active':'')+'" data-lesson-midi="'+midi+'" aria-label="Tocar '+escapeHTML(label)+'" title="'+escapeHTML(label)+'"><span>'+escapeHTML(label)+'</span></button>';whiteBefore++;}
  whiteBefore=0;
  for(let midi=start;midi<end;midi++){const pc=midi%12,name=NOTE_NAMES[pc];if(!name.includes('#')){whiteBefore++;continue;}const left=(whiteBefore/totalWhites)*100,active=activePcs.has(pc),label=theoryNoteLabel(midi,true,preferFlat);blackKeys+='<button type="button" class="lesson-key black'+(active?' active':'')+'" data-lesson-midi="'+midi+'" style="left:'+left+'%" aria-label="Tocar '+escapeHTML(label)+'" title="'+escapeHTML(label)+'"><span>'+escapeHTML(label)+'</span></button>';}
  return'<div class="lesson-keyboard">'+whiteKeys+blackKeys+'</div>';
}
function renderTheoryLessons(){
  stopTheorySequence();const list=$('theoryLessonList'),stage=$('theoryLessonStage');if(!list||!stage)return;prepareTheoryExercise();
  const done=theoryProgress(),lesson=THEORY_LESSONS[Math.min(theoryLessonIndex,THEORY_LESSONS.length-1)],chapter=THEORY_CHAPTERS.find(item=>item.id===lesson.chapter)||THEORY_CHAPTERS[0],chapterIndex=theoryChapterNumber(lesson.chapter),lessonNumber=String(theoryLessonIndex+1).padStart(2,'0'),lessonTotal=String(THEORY_LESSONS.length).padStart(2,'0'),complete=done.includes(theoryLessonIndex);
  list.innerHTML='<details class="lesson-syllabus"><summary>Capítulos y clases · '+done.length+' de '+THEORY_LESSONS.length+' completadas</summary>'+THEORY_CHAPTERS.map(item=>'<details class="lesson-level"'+(item.id===lesson.chapter?' open':'')+'><summary><span>'+escapeHTML(item.icon)+'</span><div><b>'+escapeHTML(item.title)+'</b><small>'+escapeHTML(item.goal)+'</small></div></summary><p class="lesson-syllabus-intro">'+escapeHTML(item.intro)+'</p>'+THEORY_LESSONS.map((entry,index)=>({entry,index})).filter(row=>row.entry.chapter===item.id).map(row=>'<button type="button" class="lesson-link'+(row.index===theoryLessonIndex?' active':'')+(done.includes(row.index)?' complete':'')+'" data-lesson-index="'+row.index+'"><span>'+(done.includes(row.index)?'✓':String(row.index+1).padStart(2,'0'))+'</span><b>'+escapeHTML(row.entry.title)+'</b><small>'+escapeHTML(row.entry.time)+'</small></button>').join('')+'</details>').join('')+'</details>';
  const percent=Math.round(done.length/THEORY_LESSONS.length*100),progressBar=$('theoryProgressFill')?.parentElement;if(progressBar)progressBar.setAttribute('aria-valuenow',String(percent));
  const welcomeTitle=$('theoryWelcomeTitle'),welcomeCopy=$('theoryWelcomeCopy'),welcomeLesson=$('theoryWelcomeLesson'),welcomeTime=$('theoryWelcomeTime'),welcomeButton=$('theoryJumpToLesson');
  if(done.length>=THEORY_LESSONS.length){if(welcomeTitle)welcomeTitle.textContent='¡Ya recorriste los siete capítulos!';if(welcomeCopy)welcomeCopy.textContent='Ya sabes orientarte en el teclado, seguir el pulso, construir escalas y acordes, leer progresiones y acompañar canciones. Puedes volver a cualquier capítulo para practicar otra vez.';if(welcomeButton)welcomeButton.innerHTML='Volver a practicar <span aria-hidden="true">→</span>';}
  else if(done.length){if(welcomeTitle)welcomeTitle.textContent='Sigamos con la siguiente clase';if(welcomeCopy)welcomeCopy.textContent='Tu avance se guarda en este dispositivo. Sigue a tu ritmo: observa, escucha, toca las teclas y repite cada práctica cuando la necesites.';if(welcomeButton)welcomeButton.innerHTML='Ir a mi clase <span aria-hidden="true">→</span>';}
  else{if(welcomeTitle)welcomeTitle.textContent='¡Hola! Vamos a conocer el piano desde el principio';if(welcomeCopy)welcomeCopy.textContent='El piano es un mapa de sonidos: las teclas de la izquierda suenan más graves y las de la derecha más agudas. Cada tecla produce una nota. Las notas tienen nombres —Do, Re, Mi, Fa, Sol, La y Si— y después de Si el orden vuelve a empezar en Do. Las teclas negras ayudan a orientarte: aparecen en grupos de dos y de tres, y Do está justo a la izquierda de cada grupo de dos. El dibujo se repite por todo el teclado.\n\nEn una vuelta de Do a Do hay doce pasos pequeños: siete teclas blancas naturales y cinco teclas negras alteradas. A esa vuelta la llamamos octava. Una nota puede repetirse en varias alturas, por ejemplo Do3, Do4 y Do5. El nombre te dice qué sonido buscas; el número te dice en qué zona del piano está. También puedes cambiar la forma de ver los nombres entre Do–Re–Mi y C–D–E.\n\nEmpezaremos por reconocer el dibujo del teclado y encontrar Do; no necesitas saber ningún nombre antes de comenzar. Luego sentirás el pulso y el ritmo, aprenderás a contar los pasitos entre notas, y usarás esos pasos para construir escalas. Después juntaremos notas para formar acordes, descubriremos cómo se organizan en una tonalidad y practicaremos recorridos que aparecen en canciones. Al final probarás cómo acompañarlas con acordes y notas graves. Cada capítulo comienza con una introducción y cada clase explica una idea en pasos pequeños, la muestra con un ejemplo y te deja practicar en el piano. Puedes avanzar despacio, repetir las veces que quieras y descansar cuando lo necesites. Empieza con un dedo y la mano relajada: no hace falta tocar fuerte, rápido, usar las dos manos ni leer partituras.';}
  if(welcomeLesson)welcomeLesson.textContent=lesson.title;if(welcomeTime)welcomeTime.textContent=lesson.time+' · explicación y práctica';
  $('theoryProgressText').textContent=done.length+' de '+THEORY_LESSONS.length+' clases completadas';$('theoryProgressFill').style.width=percent+'%';
  const topicMarkup='<section class="lesson-chapter-banner" aria-label="Introducción al capítulo"><div class="lesson-chapter-icon" aria-hidden="true">'+escapeHTML(chapter.icon)+'</div><div class="lesson-chapter-copy"><small>INTRODUCCIÓN DEL CAPÍTULO '+chapterIndex+'</small><h3>'+escapeHTML(chapter.title)+'</h3><p>'+escapeHTML(chapter.intro)+'</p><div class="lesson-chapter-goal"><b>Al terminar:</b> '+escapeHTML(chapter.goal)+'</div></div></section>';
  const partsMarkup=lesson.parts.map((part,index)=>'<article class="lesson-explain-card"><span>'+String(index+1)+'</span><div><h3>'+escapeHTML(part[0])+'</h3><p>'+escapeHTML(part[1])+'</p></div></article>').join('');
  const visualMarkup=lesson.visual.map((item,index)=>'<span>'+escapeHTML(item)+'</span>'+(index<lesson.visual.length-1?'<i aria-hidden="true">›</i>':'')).join('');
  const notationMarkup=lesson.chapter==='keyboard'?'<div class="lesson-note-mode" aria-label="Forma de mostrar los nombres de las notas"><span>Ver los nombres como:</span><button type="button" data-course-notation="latino" aria-pressed="'+(theoryLessonNotation==='latino')+'">Do · Re · Mi</button><button type="button" data-course-notation="americano" aria-pressed="'+(theoryLessonNotation==='americano')+'">C · D · E</button></div>':'';
  const keyboard=lessonKeyboardMarkup(lesson),exerciseMarkup=theoryRenderExercise(lesson),statusText=complete?(theoryLessonFeedback||'Esta clase ya está completada. Puedes repetirla cuando quieras.'):'Completa la práctica de esta clase para guardar tu avance.';
  stage.innerHTML=topicMarkup+'<div class="lesson-stage-top"><span class="lesson-level-tag">CAPÍTULO '+chapterIndex+' · CLASE '+lessonNumber+'</span><span>'+lessonNumber+' de '+lessonTotal+' · '+escapeHTML(lesson.time)+'</span></div><h2 class="lesson-title">'+escapeHTML(lesson.title)+'</h2><p class="lesson-copy lesson-opening">'+escapeHTML(lesson.intro)+'</p><div class="lesson-explain-grid" aria-label="Explicación paso a paso">'+partsMarkup+'</div><aside class="lesson-remember"><span aria-hidden="true">💡</span><p><b>Recuerda:</b> '+escapeHTML(lesson.remember)+'</p></aside><section class="lesson-example"><div class="lesson-example-heading"><small>VEAMOS Y ESCUCHEMOS</small><span>'+escapeHTML(lesson.visualNote||'Sigue el ejemplo de izquierda a derecha.')+'</span></div><div class="lesson-visual" aria-label="Ejemplo del capítulo">'+visualMarkup+'</div><button type="button" class="lesson-listen" data-lesson-demo>▶ Escuchar ejemplo</button></section><section class="lesson-practice-bench"><div class="lesson-practice-heading"><small>AHORA PRUEBA TÚ</small><h3>Usa el piano para practicar</h3><p>Toca una tecla para escucharla. En los retos, la app te dirá qué buscar y cómo vas.</p></div>'+notationMarkup+'<div class="lesson-task-wrap">'+exerciseMarkup+'</div><div class="lesson-keyboard-scroll" aria-label="Teclado de práctica, Do3 a Do6">'+keyboard+'</div><div class="lesson-stage-actions lesson-practice-actions"><button type="button" class="lesson-open-piano" data-open-piano>⛶ Hacer el piano más grande</button><span id="lessonTouchStatus" aria-live="polite">Teclado de Do3 a Do6 · toca cualquier tecla</span></div></section><p class="lesson-gate-hint" id="lessonGateHint" aria-live="polite">'+escapeHTML(statusText)+'</p><div class="lesson-stage-actions lesson-next-actions"><button type="button" class="lesson-next" data-lesson-next '+(complete?'':'disabled')+'>'+(theoryLessonIndex===THEORY_LESSONS.length-1?'Volver al capítulo 1':'Continuar a la siguiente clase')+' →</button></div>';
  const focusPiano=$('lessonPianoFocus'),focusKeyboard=$('lessonPianoFocusKeyboard');if(focusPiano)focusPiano.classList.add('hidden');
  if(focusKeyboard)focusKeyboard.innerHTML=keyboard.replace(/data-lesson-midi=/g,'data-focus-midi=');
  const focusStep=$('lessonFocusStep'),focusTitle=$('lessonFocusTitle'),focusPrompt=$('lessonFocusPrompt'),focusStatus=$('lessonFocusStatus');
  if(focusStep)focusStep.textContent='CAPÍTULO '+chapterIndex+' · CLASE '+lessonNumber+' / '+lessonTotal;if(focusTitle)focusTitle.textContent=lesson.title;
  if(focusPrompt)focusPrompt.textContent=lesson.exercise?.type==='find-note'?'Encuentra '+theoryNoteLabel(Number(theoryExerciseTarget)||60,true)+'. El número de octava también cuenta.':'Escucha el ejemplo y prueba las teclas indicadas en la clase.';
  if(focusStatus)focusStatus.textContent=theoryExerciseStatus||'Toca una tecla para escucharla.';
}
function theoryUpdateExerciseStatus(message){
  theoryExerciseStatus=message||'';const main=$('theoryExerciseStatus'),focus=$('lessonFocusStatus'),touch=$('lessonTouchStatus');
  if(main)main.textContent=theoryExerciseStatus;if(focus)focus.textContent=theoryExerciseStatus||'Toca una tecla para escucharla.';if(touch)touch.textContent=theoryExerciseStatus||'Teclado de Do3 a Do6 · toca cualquier tecla';
}
function theoryUpdateHighlights(){
  const lesson=THEORY_LESSONS[theoryLessonIndex];if(!lesson)return;const active=new Set(theoryExerciseActivePcs(lesson).map(pc=>((pc%12)+12)%12));
  document.querySelectorAll('#theoryLessonStage .lesson-key[data-lesson-midi],#lessonPianoFocus .lesson-key[data-focus-midi]').forEach(key=>{const midi=Number(key.dataset.lessonMidi||key.dataset.focusMidi);key.classList.toggle('active',active.has(midi%12));});
}
function theoryCompleteLesson(message){
  const done=theoryProgress();if(!done.includes(theoryLessonIndex)){done.push(theoryLessonIndex);try{localStorage.setItem(THEORY_LESSON_PROGRESS_KEY,JSON.stringify(done));}catch(_){}}
  theoryLessonFeedback=message||'¡Muy bien! Completaste esta clase.';theoryExerciseStatus=theoryLessonFeedback;
  const next=$('theoryLessonStage')?.querySelector('[data-lesson-next]');if(next)next.disabled=false;
  const gate=$('lessonGateHint'),status=$('theoryExerciseStatus'),focus=$('lessonFocusStatus');if(gate)gate.textContent=theoryLessonFeedback;if(status)status.textContent=theoryLessonFeedback;if(focus)focus.textContent=theoryLessonFeedback;
  const percent=Math.round(done.length/THEORY_LESSONS.length*100);$('theoryProgressText').textContent=done.length+' de '+THEORY_LESSONS.length+' clases completadas';$('theoryProgressFill').style.width=percent+'%';
  const progressBar=$('theoryProgressFill')?.parentElement;if(progressBar)progressBar.setAttribute('aria-valuenow',String(percent));
  const link=document.querySelector('#theoryLessonList [data-lesson-index="'+theoryLessonIndex+'"]');if(link){link.classList.add('complete');const marker=link.querySelector('span');if(marker)marker.textContent='✓';}
}
function playLessonNotes(notes,spacing=0,duration=.9,visualDuration=.85){
  stopTheorySequence();void resumeAudioContext(getAudioContext());notes.forEach((midi,index)=>{const timer=setTimeout(()=>{const key=lessonKeyForMidi(midi),wasRecording=state.recording;state.recording=false;playNote(midi,key,duration,visualDuration);state.recording=wasRecording;},index*spacing);theorySequenceTimers.push(timer);});
}
function playLessonChordSequence(chords,spacing=1000,duration=1){
  stopTheorySequence();void resumeAudioContext(getAudioContext());chords.forEach((chord,index)=>chord.forEach(midi=>{const timer=setTimeout(()=>{const key=lessonKeyForMidi(midi),wasRecording=state.recording;state.recording=false;playNote(midi,key,duration,.9);state.recording=wasRecording;},index*spacing);theorySequenceTimers.push(timer);}));
}
function playExerciseProgression(){
  const progression=theoryExerciseProgression(),chords=progression.chords.map(chord=>theoryChordMidis(chord.root,chord.quality));playLessonChordSequence(chords,1050,.95);theoryLessonHeard=true;
  theoryUpdateExerciseStatus('Escucha la vuelta completa. Después toca '+(progression.chords[0]?.label||'el primer acorde')+'.');
}
function playLessonDemo(){
  const lesson=THEORY_LESSONS[theoryLessonIndex],exercise=lesson.exercise||{};
  if(exercise.type==='progression')return playExerciseProgression();if(exercise.type==='scale')return playLessonNotes(theoryExerciseScaleTarget().notes,420,.75,.7);
  if(exercise.type==='interval')return playLessonNotes(theoryExerciseTarget||[60,62],800,.95,.85);
  if(exercise.type==='chord-builder'||exercise.type==='inversion'){const target=theoryExerciseChordTarget();return playLessonNotes(target.midis,0,1.2,1);}
  const demo=lesson.demo||{};if(demo.rhythm)return playTheoryRhythmDemo(demo);if(demo.chords)return playLessonChordSequence(demo.chords,demo.spacing||1000,demo.duration||.9);if(demo.notes)return playLessonNotes(demo.notes,demo.spacing||0,demo.duration||.8,demo.visualDuration||.7);
}
function theoryPlayFamilyChord(button){
  const chord={root:button.dataset.familyRoot,quality:button.dataset.familyQuality},midis=theoryChordMidis(chord.root,chord.quality),pcs=theoryChordIntervals(chord.quality).map(interval=>(theoryPitch(chord.root)+interval)%12);
  document.querySelectorAll('#theoryLessonStage .lesson-key').forEach(key=>key.classList.toggle('active',pcs.includes(Number(key.dataset.lessonMidi)%12)));playLessonNotes(midis,0,1.05,.95);
  const exercise=THEORY_LESSONS[theoryLessonIndex].exercise,degree=Number(button.dataset.familyDegree),root=theoryExerciseRoot;
  if(degree===Number(exercise.targetDegree||6))theoryCompleteLesson('¡Correcto! '+button.dataset.familyRoman+' en '+theoryPcLabel(theoryPitch(root))+' mayor es '+theoryChordShortName(chord.root,chord.quality)+'.');
  else theoryUpdateExerciseStatus('Escuchaste '+theoryChordShortName(chord.root,chord.quality)+'. Sigue buscando el acorde '+(theoryDiatonicFamily(root).chords[(Number(exercise.targetDegree)||6)-1]?.roman||'vi')+'.');
}
function theoryCheckKeyTap(midi){
  const lesson=THEORY_LESSONS[theoryLessonIndex],exercise=lesson.exercise||{},targetNote=theoryNoteLabel(midi,true);
  if(exercise.type==='find-note'){
    if(midi===Number(theoryExerciseTarget))theoryCompleteLesson('¡Encontraste '+theoryNoteLabel(midi,true)+'! Ya puedes buscar otra nota o seguir a la próxima clase.');
    else theoryUpdateExerciseStatus('Tocaste '+targetNote+'. Busca '+theoryNoteLabel(Number(theoryExerciseTarget)||60,true)+' y revisa también su octava.');return;
  }
  if(exercise.type==='scale'){
    const scale=theoryExerciseScaleTarget(),notes=scale.notes,expected=notes[theoryExerciseStep];if(midi!==expected){theoryUpdateExerciseStatus('Tocaste '+theoryScaleNoteLabel(midi,scale.root)+'. El siguiente paso es '+theoryScaleNoteLabel(expected,scale.root)+'. Prueba otra vez.');return;}
    theoryExerciseStep++;if(theoryExerciseStep>=notes.length){theoryCompleteLesson('¡Tocaste la escala de '+theoryPcLabel(theoryPitch(theoryExerciseRoot))+' mayor de principio a fin!');return;}
    theoryUpdateHighlights();theoryUpdateExerciseStatus('¡Bien! Ahora toca '+theoryScaleNoteLabel(notes[theoryExerciseStep],scale.root)+' ('+theoryExerciseStep+' de '+notes.length+').');return;
  }
  if(exercise.type==='chord-builder'){
    const target=theoryExerciseChordTarget(),required=new Set(target.midis.map(note=>note%12)),pc=midi%12;if(!required.has(pc)){theoryUpdateExerciseStatus(targetNote+' no forma parte de '+theoryChordTitle(target.root,target.quality)+'. Busca las tres notas indicadas.');return;}
    theoryExerciseTapped.add(pc);if(theoryExerciseTapped.size>=required.size){theoryCompleteLesson('¡Acorde completo! Tocaste '+theoryChordTitle(target.root,target.quality)+'.');return;}
    theoryUpdateExerciseStatus('¡Sí! Ya encontraste '+theoryPcLabel(pc)+'. Busca las otras '+(required.size-theoryExerciseTapped.size)+' notas del acorde.');return;
  }
  if(exercise.type==='inversion'){
    const target=theoryExerciseChordTarget(),required=new Set(target.midis),note=Number(midi);if(!required.has(note)){theoryUpdateExerciseStatus('Tocaste '+targetNote+'. En esta inversión también importa la octava; revisa las notas indicadas.');return;}
    theoryExerciseTapped.add(note);if(theoryExerciseTapped.size>=required.size){theoryCompleteLesson('¡Muy bien! Construiste C/E: Do mayor con Mi como nota más grave.');return;}
    theoryUpdateExerciseStatus('¡Esa nota está bien! Te falta tocar '+(required.size-theoryExerciseTapped.size)+' nota(s) de la inversión.');return;
  }
  if(exercise.type==='progression'){
    if(!theoryLessonHeard){theoryUpdateExerciseStatus('Primero pulsa «Escuchar primero» para oír la progresión.');return;}
    const progression=theoryExerciseProgression(),chord=progression.chords[theoryExerciseStep];if(!chord)return;const required=new Set(chord.notes),pc=midi%12;
    if(!required.has(pc)){theoryUpdateExerciseStatus(targetNote+' no forma parte del acorde '+chord.label+'. Prueba las tres notas del acorde actual.');return;}
    theoryExerciseTapped.add(pc);if(theoryExerciseTapped.size>=required.size){theoryExerciseStep++;theoryExerciseTapped.clear();if(theoryExerciseStep>=progression.chords.length){theoryCompleteLesson('¡Acompañaste toda la progresión en '+theoryPcLabel(theoryPitch(progression.root))+' mayor!');return;}
      theoryUpdateHighlights();const next=progression.chords[theoryExerciseStep];theoryUpdateExerciseStatus('¡Acorde '+theoryExerciseStep+' de '+progression.chords.length+' listo! Ahora toca '+next.label+'.');return;}
    theoryUpdateExerciseStatus('¡Sí! '+theoryPcLabel(pc)+' pertenece a '+chord.label+'. Completa sus tres notas.');return;
  }
  theoryUpdateExerciseStatus('Tocaste '+targetNote+'. Usa las teclas y opciones de la práctica para seguir.');
}
function handleLessonKeyTap(key,midi){playNote(midi,key);theoryLessonTouched=true;theoryCheckKeyTap(midi)}
function theoryResetExercise(){theoryExerciseForIndex=-1;theoryExerciseTarget=null;theoryExerciseStep=0;theoryExerciseTapped=new Set();theoryExerciseStatus='';theoryLessonHeard=false;prepareTheoryExercise();renderTheoryLessons()}
function theoryResetExerciseProgress(){theoryExerciseStep=0;theoryExerciseTapped=new Set();theoryExerciseStatus='';theoryLessonHeard=false}
function closeLessonPiano(){stopTheorySequence();const panel=$('lessonPianoFocus');if(panel)panel.classList.add('hidden');document.querySelector('[data-open-piano]')?.focus()}
function bindTheoryLearning(){
  const savedProgress=theoryProgress();if(savedProgress.length){const resumeAt=THEORY_LESSONS.findIndex((_,index)=>!savedProgress.includes(index));theoryLessonIndex=resumeAt<0?0:resumeAt;}
  document.querySelectorAll('[data-theory-mode]').forEach(button=>button.onclick=()=>{const learning=button.dataset.theoryMode==='learn';if(!learning)stopTheorySequence();document.querySelectorAll('[data-theory-mode]').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});$('theoryLearning').classList.toggle('hidden',!learning);$('theoryExplore').classList.toggle('hidden',learning);if(learning)renderTheoryLessons();});
  const theoryJump=$('theoryJumpToLesson');if(theoryJump)theoryJump.onclick=()=>{const stage=$('theoryLessonStage');stage.scrollIntoView({behavior:'smooth',block:'start'});stage.setAttribute('tabindex','-1');stage.focus({preventScroll:true});};
  $('theoryLearning').addEventListener('click',event=>{
    if(event.target.closest('#lessonPianoFocusClose,#lessonPianoFocusDone')){closeLessonPiano();return;}
    if(event.target.closest('#lessonFocusListen')){$('theoryLessonStage').querySelector('[data-progression-listen],[data-lesson-demo]')?.click();return;}
    const focusKey=event.target.closest('[data-focus-midi]');if(focusKey){handleLessonKeyTap(focusKey,Number(focusKey.dataset.focusMidi));return;}
  });
  document.addEventListener('keydown',event=>{const panel=$('lessonPianoFocus');if(event.key==='Escape'&&panel&&!panel.classList.contains('hidden'))closeLessonPiano();});
  $('theoryLessonList').onclick=event=>{const button=event.target.closest('[data-lesson-index]');if(!button)return;theoryLessonIndex=Number(button.dataset.lessonIndex);theoryLessonFeedback='';theoryExerciseForIndex=-1;theoryLessonHeard=false;theoryLessonTouched=false;renderTheoryLessons();$('theoryLessonStage').scrollIntoView({behavior:'smooth',block:'start'});};
  $('theoryLessonStage').onchange=event=>{const root=event.target.closest('[data-theory-exercise-root]');if(root){theoryExerciseRoot=root.value;theoryResetExerciseProgress();renderTheoryLessons();}};
  $('theoryLessonStage').onclick=event=>{
    if(event.target.closest('[data-open-piano]')){const panel=$('lessonPianoFocus'),lesson=THEORY_LESSONS[theoryLessonIndex];panel?.classList.remove('hidden');const prompt=$('lessonFocusPrompt'),status=$('lessonFocusStatus');if(prompt)prompt.textContent=lesson.exercise?.type==='find-note'?'Encuentra '+theoryNoteLabel(Number(theoryExerciseTarget)||60,true)+'. El número de octava también cuenta.':'Escucha el ejemplo y sigue las instrucciones de la clase.';if(status)status.textContent=theoryExerciseStatus||'Toca una tecla para escucharla.';$('lessonPianoFocusClose')?.focus();return;}
    if(event.target.closest('[data-lesson-demo]')){playLessonDemo();theoryLessonHeard=true;const lesson=THEORY_LESSONS[theoryLessonIndex],button=event.target.closest('[data-lesson-demo]');if(button)button.textContent='↻ Escuchar otra vez';if(lesson.exercise?.type==='scale'){const scaleRow=$('theoryScaleNoteRow');if(scaleRow)scaleRow.classList.remove('hidden');theoryUpdateHighlights();theoryUpdateExerciseStatus('Escuchaste la escala. Ahora tócala nota por nota, empezando en '+theoryScaleNoteLabel(theoryExerciseScaleTarget().notes[0],theoryExerciseRoot)+'.');}return;}
    if(event.target.closest('[data-progression-listen]')){playExerciseProgression();return;}
    if(event.target.closest('[data-exercise-listen]')){const pair=theoryExerciseTarget||[60,62];playLessonNotes(pair,800,.9,.85);theoryLessonHeard=true;theoryUpdateExerciseStatus('Escuchaste el par. Cuenta los pasos entre las dos notas y elige la respuesta.');return;}
    if(event.target.closest('[data-exercise-reset]')){theoryResetExercise();return;}if(event.target.closest('[data-rhythm-start]')){void startTheoryRhythm();return;}if(event.target.closest('[data-rhythm-pad]')){theoryRhythmTap();return;}if(event.target.closest('[data-open-worship-practice]')){const workshop=document.querySelector('.worship-practice');if(workshop){workshop.open=true;workshop.scrollIntoView({behavior:'smooth',block:'center'});}return;}
    const familyButton=event.target.closest('[data-family-degree]');if(familyButton){theoryPlayFamilyChord(familyButton);return;}
    const next=event.target.closest('[data-lesson-next]');if(next&&!next.disabled){theoryLessonIndex=theoryLessonIndex<THEORY_LESSONS.length-1?theoryLessonIndex+1:0;theoryLessonFeedback='';theoryExerciseForIndex=-1;theoryLessonHeard=false;theoryLessonTouched=false;renderTheoryLessons();$('theoryLessonStage').scrollIntoView({behavior:'smooth',block:'start'});return;}
    const answer=event.target.closest('[data-answer-index]');if(answer){const exercise=THEORY_LESSONS[theoryLessonIndex].exercise,correct=Number(answer.dataset.answerIndex)===Number(exercise.correct);if(correct)theoryCompleteLesson('¡Correcto! '+(exercise.why||'Ya entendiste esta idea.'));else theoryUpdateExerciseStatus('Todavía no. Vuelve a leer la explicación y prueba otra respuesta. '+(exercise.why||''));return;}
    const intervalAnswer=event.target.closest('[data-interval-answer]');if(intervalAnswer){const pair=theoryExerciseTarget||[60,62],distance=Math.abs(pair[1]-pair[0]),selected=Number(intervalAnswer.dataset.intervalAnswer);if(selected===distance)theoryCompleteLesson('¡Correcto! Entre '+theoryNoteLabel(pair[0],true)+' y '+theoryNoteLabel(pair[1],true)+' hay '+(distance===1?'un semitono':distance===2?'un tono':'tres semitonos')+'.');else theoryUpdateExerciseStatus('No son '+intervalAnswer.textContent+'. Cuenta las teclas desde la primera nota hasta la segunda y vuelve a probar.');return;}
    const notation=event.target.closest('[data-course-notation]');if(notation){theoryLessonNotation=notation.dataset.courseNotation;try{localStorage.setItem('yhwh_theory_notation',theoryLessonNotation)}catch(_){}renderTheoryLessons();return;}
    const key=event.target.closest('[data-lesson-midi]');if(key){handleLessonKeyTap(key,Number(key.dataset.lessonMidi));return;}
  };
}
function theoryLabelChord(root,quality){const suffix={major:'',minor:'m',dim:'dim',dim7:'dim7',m7b5:'m7♭5',aug:'aum',sus2:'sus2',sus4:'sus4','7':'7',maj7:'maj7',m7:'m7',mMaj7:'mMaj7','6':'6',add9:'add9','5':'5'}[quality]||'';const latino=state.notation==='latino'?({C:'Do',D:'Re',E:'Mi',F:'Fa',G:'Sol',A:'La',B:'Si'}[root[0]]||root[0])+root.slice(1):root;return latino+suffix;}
function setTheoryChord(root,quality,keepMode=false){const mode=state.theoryPianoMode;state.theoryChord={root:theoryRoot(NOTE_NAMES.indexOf(root)>=0?NOTE_NAMES.indexOf(root):Number(root)),quality};state.theoryPianoIntervals=null;state.theoryPianoMode=keepMode?mode:'chord';if($('theoryRoot'))$('theoryRoot').value=state.theoryChord.root;renderTheorySelection();if(keepMode&&mode==='scale')renderTheoryScale();if(keepMode&&mode==='interval')renderTheoryIntervals();}
function renderTheorySelection(){
  const selected=state.theoryChord;const shape=THEORY_CHORDS.find(item=>item.quality===selected.quality)||THEORY_CHORDS[0];const label=theoryLabelChord(selected.root,selected.quality);
  const title=$('theoryChordTitle');if(title)title.textContent=`${label} · ${shape.name}`;
  const formula=$('theoryChordFormula');if(formula)formula.textContent=`Fórmula: ${shape.formula}`;
  const notes=shape.intervals.map(semi=>NOTE_NAMES[(NOTE_NAMES.indexOf(selected.root)+semi)%12]);
  const noteHtml=notes.map(note=>`<span class="theory-note">${escapeHTML(state.notation==='latino'?theoryLabelChord(note,''):note)}</span>`).join('');
  if($('theoryChordNotes'))$('theoryChordNotes').innerHTML=noteHtml;
  if(state.theoryPianoMode==='chord'){
    if($('theoryPianoNotes'))$('theoryPianoNotes').innerHTML=noteHtml;
    if($('theoryPianoTitle'))$('theoryPianoTitle').textContent=`${label} · ${shape.name}`;
    if($('theoryPianoPlay'))$('theoryPianoPlay').textContent='▶ Escuchar acorde';
    renderTheoryKeyboard(shape.intervals);
  }
}
function renderTheoryKeyboard(intervals){
  const holder=$('theoryPianoKeyboard');if(!holder)return;const rootPc=NOTE_NAMES.indexOf(state.theoryChord.root);let whites='',blacks='',whiteIndex=0;
  for(let midi=48;midi<72;midi++){
    if(NOTE_NAMES[midi%12].includes('#'))continue;
    const active=intervals.some(semi=>(rootPc+semi)%12===midi%12);const name=noteName(midi);const index=whiteIndex++;
    whites+=`<button class="theory-key white${active?' active':''}${midi%12===0?' octave':''}" data-midi="${midi}"><span>${escapeHTML(name)}</span></button>`;
  }
  whiteIndex=0;
  for(let midi=48;midi<72;midi++){
    if(!NOTE_NAMES[midi%12].includes('#')){whiteIndex++;continue;}
    const active=intervals.some(semi=>(rootPc+semi)%12===midi%12);const name=noteName(midi);const left=((whiteIndex/14)*100).toFixed(4);
    blacks+=`<button class="theory-key black${active?' active':''}" data-midi="${midi}" style="left:calc(${left}% - 10px)"><span>${escapeHTML(name)}</span></button>`;
  }
  holder.innerHTML=`<div class="theory-piano-keys">${whites}${blacks}</div>`;
}
function renderTheoryCircle(){
  const holder=$('theoryCircle');if(!holder)return;const cx=150,cy=150,r=112;let svg=`<svg viewBox="0 0 300 300" role="img" aria-label="Círculo de quintas">`;
  svg+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#3c3b55" stroke-width="2"/>`;
  const minor=state.theoryCircleMinor;const majorPc=THEORY_CIRCLE[state.theoryCircleIndex]||0;const tonicPc=minor?(majorPc+9)%12:majorPc;const degrees=minor?THEORY_MINOR_SCALE:THEORY_SCALE;const degreeNames=minor?THEORY_DEGREES_MINOR:THEORY_DEGREES;const roles=new Map();
  degrees.slice(0,6).forEach((degree,d)=>{const rootPc=(tonicPc+degree.semi)%12;const role=degree.quality==='minor'?'minor':'major';const circleIndex=THEORY_CIRCLE.findIndex(pc=>role==='major'?pc===rootPc:(pc+9)%12===rootPc);if(circleIndex>=0)roles.set(`${circleIndex}:${role}`,{degree:d+1,label:degreeNames[d],root:theoryRoot(rootPc),quality:degree.quality});});
  THEORY_CIRCLE.forEach((pc,i)=>{const angle=i*Math.PI/6-Math.PI/2;const x=cx+r*Math.cos(angle),y=cy+r*Math.sin(angle);const minorX=cx+(r-48)*Math.cos(angle),minorY=cy+(r-48)*Math.sin(angle);const majorRole=roles.get(`${i}:major`),minorRole=roles.get(`${i}:minor`);const chosenMajor=!minor&&state.theoryCircleIndex===i,chosenMinor=minor&&state.theoryCircleIndex===i;
    svg+=`<g class="theory-circle-node${majorRole?` degree-${majorRole.degree}`:''}${chosenMajor?' selected':''}" data-circle-index="${i}" tabindex="0" role="button" aria-label="${escapeHTML(theoryLabelChord(theoryRoot(pc),'major'))}${majorRole?`, grado ${majorRole.label}`:''}"><circle cx="${x}" cy="${y}" r="20"/><text x="${x}" y="${y+4}">${escapeHTML(theoryRoot(pc))}</text>${majorRole?`<title>${escapeHTML(`${majorRole.label} · ${theoryLabelChord(majorRole.root,majorRole.quality)}`)}</title>`:''}</g>`;
    const minorRoot=theoryRoot((pc+9)%12);svg+=`<g class="theory-circle-node minor${minorRole?` degree-${minorRole.degree}`:''}${chosenMinor?' selected':''}" data-circle-index="${i}" data-minor="1" tabindex="0" role="button" aria-label="${escapeHTML(theoryLabelChord(minorRoot,'minor'))}${minorRole?`, grado ${minorRole.label}`:''}"><circle cx="${minorX}" cy="${minorY}" r="15"/><text x="${minorX}" y="${minorY+3}">${escapeHTML(minorRoot)}m</text>${minorRole?`<title>${escapeHTML(`${minorRole.label} · ${theoryLabelChord(minorRole.root,minorRole.quality)}`)}</title>`:''}</g>`;
  });svg+='</svg>';holder.innerHTML=svg;
  holder.querySelectorAll('.theory-circle-node').forEach(node=>{
    const select=()=>selectTheoryCircle(Number(node.dataset.circleIndex),node.dataset.minor==='1',true);
    node.onclick=select;node.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}};
  });
}
function theoryNoteAt(semitones){return theoryLabelChord(theoryRoot(NOTE_NAMES.indexOf(state.theoryChord.root)+semitones),'');}
function theoryNotesHTML(semitones){return semitones.map(semi=>`<span class="theory-note">${escapeHTML(theoryNoteAt(semi))}</span>`).join('');}
function renderTheoryScale(){
  const select=$('theoryScaleType');if(select)select.value=state.theoryScale;
  const scale=THEORY_SCALES[state.theoryScale]||THEORY_SCALES.major;
  if($('theoryScaleFormula'))$('theoryScaleFormula').textContent=`${scale.name}: ${scale.formula}`;
  if($('theoryScaleNotes'))$('theoryScaleNotes').innerHTML=theoryNotesHTML(scale.semitones);
  if(state.theoryPianoMode==='scale'){
    if($('theoryPianoTitle'))$('theoryPianoTitle').textContent=`${theoryLabelChord(state.theoryChord.root,'')} ${scale.name}`;
    if($('theoryPianoNotes'))$('theoryPianoNotes').innerHTML=theoryNotesHTML(scale.semitones);
    if($('theoryPianoPlay'))$('theoryPianoPlay').textContent='▶ Escuchar escala';
    renderTheoryKeyboard(scale.semitones);
  }
}
function renderTheoryIntervals(){
  const cards=$('theoryIntervalCards');if(cards)cards.innerHTML=THEORY_INTERVALS.map(([name,label,semi])=>`<button class="theory-interval-card${state.theoryInterval===semi?' selected':''}" data-interval="${semi}"><b>${label}</b><small>${semi} ${semi===1?'semitono':'semitonos'}</small></button>`).join('');
  const interval=THEORY_INTERVALS.find(item=>item[2]===state.theoryInterval)||THEORY_INTERVALS[7];
  if($('theoryIntervalTitle'))$('theoryIntervalTitle').textContent=interval[0];
  if($('theoryIntervalInfo'))$('theoryIntervalInfo').textContent=`${interval[1]} · ${interval[2]} ${interval[2]===1?'semitono':'semitonos'} desde ${theoryLabelChord(state.theoryChord.root,'')}.`;
  const semitones=[0,interval[2]];if($('theoryIntervalNotes'))$('theoryIntervalNotes').innerHTML=theoryNotesHTML(semitones);
  if(state.theoryPianoMode==='interval'){
    if($('theoryPianoTitle'))$('theoryPianoTitle').textContent=`${theoryLabelChord(state.theoryChord.root,'')} · ${interval[0]}`;
    if($('theoryPianoNotes'))$('theoryPianoNotes').innerHTML=theoryNotesHTML(semitones);
    if($('theoryPianoPlay'))$('theoryPianoPlay').textContent='▶ Escuchar intervalo';
    renderTheoryKeyboard(semitones);
  }
}
function selectTheoryInterval(semitone){state.theoryInterval=Number(semitone);state.theoryPianoMode='interval';renderTheoryIntervals();}
function theoryRhythmTone(ctx,when,frequency=880,volume=.12){
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,when);
  gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(volume,when+.008);gain.gain.exponentialRampToValueAtTime(.0001,when+.065);
  oscillator.connect(gain);gain.connect(getMasterGain(ctx));oscillator.start(when);oscillator.stop(when+.08);return oscillator;
}
function playTheoryRhythmDemo(demo){
  stopTheorySequence();const ctx=getAudioContext();void resumeAudioContext(ctx);
  const bars=(demo.rhythm||'x.x.x.x.|x.x.x.x.').split('|'),beatsPerBar=Math.max(1,Math.floor(Number(demo.beatsPerBar)||4)),subdivisions=Math.max(1,Math.floor(Number(demo.subdivisions)||2)),beat=60/(Number(demo.bpm)||66),start=ctx.currentTime+.12,nodes=[];
  for(let index=0;index<bars.length*beatsPerBar;index++)nodes.push(theoryRhythmTone(ctx,start+index*beat,index%beatsPerBar===0?1100:760,.1));
  bars.forEach((bar,barIndex)=>[...bar].forEach((mark,step)=>{if(mark==='x')nodes.push(theoryRhythmTone(ctx,start+(barIndex*beatsPerBar+step/subdivisions)*beat,step%subdivisions?620:520,.075));}));
  theoryRhythmDemoNodes=nodes;
}
async function startTheoryRhythm(){
  if(theoryRhythmRun)return;
  const exercise=THEORY_LESSONS[theoryLessonIndex]?.exercise;if(exercise?.type!=='rhythm')return;
  stopTheorySequence();const ctx=getAudioContext();await resumeAudioContext(ctx);
  const bars=(exercise.pattern||'x.x.x.x.|x.x.x.x.').split('|'),beatsPerBar=Math.max(1,Math.floor(Number(exercise.beatsPerBar)||4)),subdivisions=Math.max(1,Math.floor(Number(exercise.subdivisions)||2)),cellsPerBar=beatsPerBar*subdivisions,beat=60/(Number(exercise.bpm)||66),countInBeats=4,countStart=ctx.currentTime+.12,start=countStart+countInBeats*beat,nodes=[],expected=[];
  for(let index=0;index<countInBeats+bars.length*beatsPerBar;index++)nodes.push(theoryRhythmTone(ctx,countStart+index*beat,index%beatsPerBar===0?1200:820,.12));
  bars.forEach((bar,barIndex)=>[...bar].forEach((mark,step)=>{if(mark==='x')expected.push({beat:barIndex*beatsPerBar+step/subdivisions,cell:barIndex*cellsPerBar+step,hit:false,missed:false});}));
  theoryRhythmRun={ctx,start,beat,countStart,totalBeats:bars.length*beatsPerBar,beatsPerBar,subdivisions,meterLabel:beatsPerBar===2&&subdivisions===3?'balanceo':'pulso',expected,nodes,extra:0,tolerance:Number(exercise.tolerance)||.3,raf:0};
  const startButton=document.querySelector('#theoryLessonStage [data-rhythm-start]');if(startButton){startButton.disabled=true;startButton.textContent='Escuchando…';}
  theoryUpdateExerciseStatus('Cuenta los cuatro clics de entrada. Después toca con el patrón.');
  theoryRhythmRun.raf=requestAnimationFrame(theoryRhythmFrame);
}
function theoryRhythmFrame(){
  const run=theoryRhythmRun;if(!run)return;
  const now=run.ctx.currentTime,position=(now-run.start)/run.beat,status=$('theoryExerciseStatus');
  if(status){
    const label=position<0?'Cuenta de entrada: '+Math.max(1,Math.min(4,Math.floor((now-run.countStart)/run.beat)+1)):'Compás '+(Math.floor(position/run.beatsPerBar)+1)+' · '+run.meterLabel+' '+(Math.floor(((position%run.beatsPerBar)+run.beatsPerBar)%run.beatsPerBar)+1)+' de '+run.beatsPerBar;
    if(status.textContent!==label)status.textContent=label;
  }
  const cellIndex=Math.floor(position*run.subdivisions);
  document.querySelectorAll('#theoryLessonStage [data-rhythm-cell]').forEach(cell=>cell.classList.toggle('current',Number(cell.dataset.rhythmCell)===cellIndex));
  run.expected.forEach(target=>{if(!target.hit&&!target.missed&&position>target.beat+run.tolerance/run.beat){target.missed=true;document.querySelector('#theoryLessonStage [data-rhythm-cell="'+target.cell+'"]')?.classList.add('miss');}});
  if(now>run.start+run.totalBeats*run.beat+.45*run.beat){finishTheoryRhythm();return;}
  run.raf=requestAnimationFrame(theoryRhythmFrame);
}
function theoryRhythmTap(){
  const ctx=getAudioContext();theoryRhythmTone(ctx,ctx.currentTime+.005,560,.08);
  const run=theoryRhythmRun;if(!run){theoryUpdateExerciseStatus('Pulsa «Empezar práctica» y espera los cuatro clics de entrada.');return;}
  const latency=ctx.outputLatency||ctx.baseLatency||0,position=(ctx.currentTime-latency-run.start)/run.beat;
  if(position<-.25){theoryUpdateExerciseStatus('Espera a que terminen los cuatro clics de entrada.');return;}
  let nearest=null,distance=Infinity;
  run.expected.forEach(target=>{if(target.hit||target.missed)return;const delta=Math.abs(target.beat-position);if(delta<distance){distance=delta;nearest=target;}});
  if(nearest&&distance*run.beat<=run.tolerance){
    nearest.hit=true;document.querySelector('#theoryLessonStage [data-rhythm-cell="'+nearest.cell+'"]')?.classList.add('hit');
    theoryUpdateExerciseStatus('¡A tiempo! Sigue escuchando el siguiente pulso.');
  }else{run.extra++;theoryUpdateExerciseStatus('Ese toque quedó entre los pulsos. Escucha el clic y prueba otra vez.');}
}
function finishTheoryRhythm(){
  const run=theoryRhythmRun;if(!run)return;
  if(run.raf)cancelAnimationFrame(run.raf);run.nodes.forEach(node=>{try{node.stop();}catch(_){}});
  const hits=run.expected.filter(target=>target.hit).length,needed=Math.max(1,Math.ceil(run.expected.length*.75)),ok=hits>=needed&&run.extra<=Math.max(2,Math.floor(run.expected.length*.5));
  theoryRhythmRun=null;
  const startButton=document.querySelector('#theoryLessonStage [data-rhythm-start]');if(startButton){startButton.disabled=false;startButton.textContent='↻ Intentar otra vez';}
  document.querySelectorAll('#theoryLessonStage [data-rhythm-cell]').forEach(cell=>cell.classList.remove('current'));
  if(ok)theoryCompleteLesson('¡Buen pulso! Marcaste '+hits+' de '+run.expected.length+' toques a tiempo.');
  else theoryUpdateExerciseStatus('Acertaste '+hits+' de '+run.expected.length+'. Escucha el clic y vuelve a intentarlo; puedes ir más despacio.');
}
function stopTheoryRhythm(){
  const run=theoryRhythmRun;if(run?.raf)cancelAnimationFrame(run.raf);
  [...(run?.nodes||[]),...theoryRhythmDemoNodes].forEach(node=>{try{node.stop();}catch(_){}});
  theoryRhythmRun=null;theoryRhythmDemoNodes=[];
  const startButton=document.querySelector('#theoryLessonStage [data-rhythm-start]');if(startButton){startButton.disabled=false;startButton.textContent='▶ Empezar práctica';}
}
function stopTheorySequence(){theorySequenceTimers.forEach(clearTimeout);theorySequenceTimers=[];stopTheoryRhythm();}
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
async function playTheoryScale(){
  const scale=THEORY_SCALES[state.theoryScale]||THEORY_SCALES.major;stopTheorySequence();
  const notes=scale.semitones.map(semi=>60+NOTE_NAMES.indexOf(state.theoryChord.root)+semi);
  try{
    const context=getAudioContext(),resumePromise=resumeAudioContext(context);
    if(state.instrument==='grand-piano')await Promise.all([...notes.map(midi=>getSample(midi)),resumePromise]);
    else await Promise.all([...notes.map(midi=>getInstrumentSample(midi)),resumePromise]);
    notes.forEach((midi,index)=>{const timer=setTimeout(()=>{const wasRecording=state.recording;state.recording=false;playNote(midi,document.querySelector('.piano-panel .key[data-midi="'+midi+'"]'),.36,.18);state.recording=wasRecording;},index*320);theorySequenceTimers.push(timer);});
  }catch(error){$('theoryScaleFormula').textContent='No se pudieron cargar las muestras de sonido.';console.error(error);}
}
function liveKeyChords(root,keyMode){
  const degrees=keyMode==='minor'?THEORY_MINOR_SCALE:THEORY_SCALE;
  const labels=keyMode==='minor'?THEORY_DEGREES_MINOR:THEORY_DEGREES;
  const rootPc=NOTE_NAMES.indexOf(root);
  return degrees.map((degree,index)=>({degree:labels[index],root:theoryRoot(rootPc+degree.semi),quality:degree.quality}));
}
function playLiveKeyProgression(){
  stopTheorySequence();
  const chords=liveKeyChords($('liveTheoryRoot')?.value||'C',$('liveTheoryKeyMode')?.value==='minor'?'minor':'major');
  const startAt=getAudioContext().currentTime+.08;
  chords.forEach((chord,index)=>playChord({...chord,octave:60,duration:.56,tempo:.9,instrument:state.instrument,lightDurations:[.2,.2,.2],startAt:startAt+index*.72,preview:true,noTranspose:true}));
}
function playTheoryPianoSelection(){
  if(state.theoryPianoMode==='scale')return playTheoryScale();
  if(state.theoryPianoMode==='interval')return playChord({root:state.theoryChord.root,octave:60,intervals:[0,state.theoryInterval],duration:1.1,preview:true,noTranspose:true});
  return playChord({...state.theoryChord,octave:60,duration:2,preview:true,noTranspose:true});
}
function renderTheory(){
  if($('theoryRoot'))$('theoryRoot').value=state.theoryChord.root;
  const cards=$('theoryChordCards');if(cards)cards.innerHTML=THEORY_CHORDS.map(chord=>`<button class="theory-chord-card${state.theoryChord.quality===chord.quality?' selected':''}" data-theory-quality="${chord.quality}"><b>${chord.name}</b><span>Ejemplo: ${theoryLabelChord(state.theoryChord.root,chord.quality)}</span><small>Grados ${chord.formula}</small></button>`).join('');
  const minor=$('theoryMode')?.value==='minor';const degrees=minor?THEORY_MINOR_SCALE:THEORY_SCALE;const degreeNames=minor?THEORY_DEGREES_MINOR:THEORY_DEGREES;
  const keys=$('theoryKeyCards');if(keys)keys.innerHTML=NOTE_NAMES.map((root,rootPc)=>`<article class="theory-key-card"><h3>${theoryLabelChord(root,'')} ${minor?'menor natural':'mayor'}</h3><div>${degrees.map((degree,i)=>{const chordRoot=theoryRoot(rootPc+degree.semi);return `<button data-key-root="${chordRoot}" data-key-quality="${degree.quality}"><small>${degreeNames[i]}</small><b>${theoryLabelChord(chordRoot,degree.quality)}</b></button>`}).join('')}</div></article>`).join('');
  renderTheoryCircle();renderTheorySelection();
  renderTheoryScale();renderTheoryIntervals();
  if(!state.theoryCircleChords)selectTheoryCircle(0,false);
}
function selectTheoryCircle(index,minor,play=false){
  state.theoryCircleIndex=index;state.theoryCircleMinor=minor;const majorPc=THEORY_CIRCLE[index];const rootPc=minor?(majorPc+9)%12:majorPc;const root=theoryRoot(rootPc);const degrees=minor?THEORY_MINOR_SCALE:THEORY_SCALE;const degreeNames=minor?THEORY_DEGREES_MINOR:THEORY_DEGREES;const chords={};
  degrees.slice(0,6).forEach((degree,d)=>{const chordRoot=theoryRoot(rootPc+degree.semi);chords[degreeNames[d]]={root:chordRoot,quality:degree.quality,degree:degreeNames[d]};});state.theoryCircleChords=chords;state.theoryCircleChord=degreeNames[0];
  $('theoryCircleName').textContent=`${theoryLabelChord(root,'')} ${minor?'menor natural':'mayor'}`;$('theoryCircleSig').textContent=`Armadura: ${THEORY_SIG[majorPc]}${minor?' (relativa mayor: '+theoryLabelChord(theoryRoot(majorPc),'')+')':''}`;
  const results=$('theoryCircleResults');if(results)results.innerHTML=Object.entries(chords).map(([degree,chord],i)=>`<button class="circle-degree degree-${i+1}${i===0?' active':''}" data-circle-chord="${degree}" aria-label="${degree}, ${theoryLabelChord(chord.root,chord.quality)}"><span class="degree-badge">${degree}</span><small>${['Tónica','Supertonica','Mediante','Subdominante','Dominante','Submediante'][i]}</small><b>${theoryLabelChord(chord.root,chord.quality)}</b></button>`).join('');
  setTheoryChord(root,minor?'minor':'major');renderTheoryCircle();if(play)playChord({...chords[degreeNames[0]],octave:60,duration:2,preview:true,noTranspose:true});
}
function renderLiveTheoryDock(){
  const rootSelect=$('liveTheoryRoot'),info=$('liveTheoryInfo'),notesEl=$('liveTheoryNotes');
  if(!rootSelect||!info||!notesEl)return;
  const root=rootSelect.value||'C',rootPc=NOTE_NAMES.indexOf(root),rootName=theoryLabelChord(root,''),keyMode=$('liveTheoryKeyMode')?.value==='minor'?'minor':'major';
  let intervals=[],noteText='',description='';
  if(liveTheoryMode==='key'){
    const chords=liveKeyChords(root,keyMode);
    noteText=chords.map(chord=>`${chord.degree} ${theoryLabelChord(chord.root,chord.quality)}`);
    description=`${rootName} ${keyMode==='minor'?'menor':'mayor'} · acordes de la tonalidad.`;
    state.theoryPianoMode='chord';
  }else if(liveTheoryMode==='scale'){
    const scale=THEORY_SCALES[$('liveTheoryScale')?.value]||THEORY_SCALES.major;
    intervals=scale.semitones;description=`${rootName} ${scale.name}: ${scale.formula}.`;
    state.theoryScale=$('liveTheoryScale')?.value||'major';
  }else{
    const selectedInterval=Number($('liveTheoryInterval')?.value),semi=Number.isFinite(selectedInterval)?selectedInterval:7;
    const interval=THEORY_INTERVALS.find(item=>item[2]===semi)||THEORY_INTERVALS[7];
    intervals=[0,semi];description=`${interval[0]}: ${interval[1]}, a ${semi} ${semi===1?'semitono':'semitonos'} de ${rootName}.`;
    state.theoryInterval=semi;
  }
  state.theoryChord.root=root;state.theoryPianoMode=liveTheoryMode==='interval'?'interval':liveTheoryMode==='scale'?'scale':'chord';
  document.querySelectorAll('[data-live-theory]').forEach(button=>button.classList.toggle('active',button.dataset.liveTheory===liveTheoryMode));
  $('liveTheoryKeyModeWrap')?.classList.toggle('hidden',liveTheoryMode!=='key');
  $('liveTheoryScaleWrap')?.classList.toggle('hidden',liveTheoryMode!=='scale');
  $('liveTheoryIntervalWrap')?.classList.toggle('hidden',liveTheoryMode!=='interval');
  info.textContent=description;
  if(liveTheoryMode!=='key'){
    const names=[...new Set(intervals.map(semi=>NOTE_NAMES[(rootPc+semi)%12]))];
    noteText=names.map(name=>theoryLabelChord(name,''));
  }
  notesEl.innerHTML=noteText.map(name=>`<span>${escapeHTML(name)}</span>`).join('');
  $('liveTheoryPlayKey')?.classList.remove('hidden');
}
function closeLiveTheoryDock({clear=true}={}){
  $('liveTheoryDock')?.classList.add('hidden');$('theoryLiveToggle')?.setAttribute('aria-expanded','false');
  if(clear){document.querySelectorAll('#keyboard .key.theory-highlight').forEach(key=>{key.classList.remove('theory-highlight');delete key.dataset.theoryName;});$('liveTheoryPlayKey')?.classList.add('hidden');}
}
function bindLiveTheoryDockDrag(){
  const dock=$('liveTheoryDock'),handle=dock?.querySelector('.live-theory-head'),canvas=$('noteCanvas');
  if(!dock||!handle||!canvas||handle.dataset.dragBound)return;
  handle.dataset.dragBound='true';handle.title='Arrastra desde aquí para mover el panel';
  const storageKey='yhwh_live_theory_position';
  const applyPosition=(xRatio,yRatio)=>{
    const maxX=Math.max(0,canvas.clientWidth-dock.offsetWidth),maxY=Math.max(0,canvas.clientHeight-dock.offsetHeight);
    const left=Math.min(maxX,Math.max(0,xRatio*maxX)),top=Math.min(maxY,Math.max(0,yRatio*maxY));
    dock.style.setProperty('left',`${left}px`,'important');dock.style.setProperty('top',`${top}px`,'important');
    dock.style.setProperty('right','auto','important');dock.style.setProperty('bottom','auto','important');
  };
  let saved=null;
  try{saved=JSON.parse(safeStorageGetItem(storageKey)||'null');}catch(_){}
  if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))requestAnimationFrame(()=>applyPosition(saved.x,saved.y));
  let drag=null;
  handle.addEventListener('pointerdown',event=>{
    const target=event.target instanceof Element?event.target:null;
    if(target?.closest('button,select,input'))return;
    if(event.pointerType==='mouse'&&event.button!==0)return;
    const box=dock.getBoundingClientRect(),area=canvas.getBoundingClientRect();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:box.left-area.left,top:box.top-area.top,moved:false};
    try{handle.setPointerCapture(event.pointerId);}catch(_){}
    event.preventDefault();dock.classList.add('is-dragging');
  },{passive:false});
  const move=event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;
    const maxX=Math.max(0,canvas.clientWidth-dock.offsetWidth),maxY=Math.max(0,canvas.clientHeight-dock.offsetHeight);
    const left=Math.min(maxX,Math.max(0,drag.left+dx)),top=Math.min(maxY,Math.max(0,drag.top+dy));
    dock.style.setProperty('left',`${left}px`,'important');dock.style.setProperty('top',`${top}px`,'important');
    dock.style.setProperty('right','auto','important');dock.style.setProperty('bottom','auto','important');
    if(drag.moved)event.preventDefault();
  };
  const finish=event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const moved=drag.moved;drag=null;dock.classList.remove('is-dragging');
    if(moved){const maxX=Math.max(1,canvas.clientWidth-dock.offsetWidth),maxY=Math.max(1,canvas.clientHeight-dock.offsetHeight);try{localStorage.setItem(storageKey,JSON.stringify({x:dock.offsetLeft/maxX,y:dock.offsetTop/maxY}));}catch(_){}}
  };
  window.addEventListener('pointermove',move,{passive:false});
  window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
  window.addEventListener('resize',()=>{try{const position=JSON.parse(safeStorageGetItem(storageKey)||'null');if(position)applyPosition(position.x,position.y);}catch(_){}});
}
async function playLiveTheory(){
  renderLiveTheoryDock();
  if(liveTheoryMode==='key'){playLiveKeyProgression();return;}
  if(liveTheoryMode==='interval'){
    const root=$('liveTheoryRoot').value,selectedInterval=Number($('liveTheoryInterval').value),semi=Number.isFinite(selectedInterval)?selectedInterval:7;
    playChord({root,octave:60,intervals:[0,semi],duration:1.3,tempo:.9,lightDurations:[.18,.18],preview:true,noTranspose:true});return;
  }
  playTheoryScale();
}
function changeTheoryTab(tab){document.querySelectorAll('.theory-tab').forEach(button=>button.classList.toggle('active',button.dataset.theoryTab===tab));const panels=['theoryPanelChords','theoryPanelKeys','theoryPanelScales','theoryPanelIntervals','theoryPanelCircle','theoryPanelPiano'];const target=`theoryPanel${tab[0].toUpperCase()}${tab.slice(1)}`;transitionScreen(target,panels);if(tab==='chords')state.theoryPianoMode='chord';if(tab==='scales')state.theoryPianoMode='scale';if(tab==='intervals')state.theoryPianoMode='interval';if(tab==='chords'||tab==='scales'||tab==='intervals'||tab==='piano'){if(state.theoryPianoMode==='chord')renderTheorySelection();else if(state.theoryPianoMode==='scale')renderTheoryScale();else renderTheoryIntervals();}}
