import { EXTRA_INSTRUMENTS } from './instrument-maps.js';
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SOLO_VIOLIN_ROOTS=[55,57,60,64,67,69,72,76,79,81,84,88,91,93,96].map(midi=>({midi,note:NOTE_NAMES[midi%12]+(Math.floor(midi/12)-1)}));
const DISTORTED_GUITAR_ROOTS=[{midi:36,note:'C2',soft:true},{midi:40,note:'E2',soft:true},{midi:41,note:'F2',soft:true},{midi:45,note:'A2',soft:true},{midi:48,note:'C3',soft:true},{midi:50,note:'D3',soft:true},{midi:52,note:'E3',soft:true},{midi:55,note:'G3',soft:true},{midi:59,note:'B3',soft:true},{midi:61,note:'C#4',soft:true},{midi:64,note:'E4',soft:true},{midi:67,note:'G4'},{midi:71,note:'B4'},{midi:72,note:'C5'},{midi:74,note:'D5',soft:true},{midi:77,note:'F5'},{midi:80,note:'G#5'},{midi:82,note:'A#5'},{midi:85,note:'C#6'}];
const STRINGS_SAMPLE_ROOTS=[
  {midi:55,file:'vsco-violin-ens-55.wav',cloudinaryId:'vsco-violin-ens-55'},
  {midi:57,file:'vsco-violin-ens-57.wav',cloudinaryId:'piano-strings-test/violin-a2-v1'},
  {midi:59,file:'vsco-violin-ens-59.wav',cloudinaryId:'piano-strings-test/violin-b2-v1'},
  {midi:62,file:'vsco-violin-ens-62.wav',cloudinaryId:'vsco-violin-ens-62'},
  {midi:66,file:'vsco-violin-ens-66.wav',cloudinaryId:'vsco-violin-ens-66'},
  {midi:69,file:'vsco-violin-ens-69.wav',cloudinaryId:'piano-strings-test/violin-a3-v1'},
  {midi:72,file:'vsco-violin-ens-72.wav',cloudinaryId:'piano-strings-test/violin-c4-v1'},
  {midi:76,file:'vsco-violin-ens-76.wav',cloudinaryId:'vsco-violin-ens-76'},
  {midi:79,file:'vsco-violin-ens-79.wav',cloudinaryId:'vsco-violin-ens-79'},
  {midi:83,file:'vsco-violin-ens-83.wav',cloudinaryId:'vsco-violin-ens-83'},
  {midi:86,file:'vsco-violin-ens-86.wav',cloudinaryId:'vsco-violin-ens-86'}
];
const VSCO2_TRUMPET_SUS_VIB_REGIONS=[
  [52,54,53,'f2'],[55,58,57,'a2'],[59,61,60,'c3'],[62,63,63,'dsharp3'],
  [64,65,65,'f3'],[66,68,67,'g3'],[69,71,70,'asharp3'],[72,75,74,'d4'],
  [76,78,77,'f4'],[79,82,81,'a4'],[83,84,84,'c5']
];
const VSCO2_TRUMPET_PATCHES={
  'trumpet-vsco2-stac':{folder:'vsco2-trumpet-stac',prefix:'trumpet-stac',release:.22,roundRobin:true,regions:[[69,71,70,'asharp3'],[55,58,57,'a2'],[79,82,81,'a4'],[59,61,60,'c3'],[83,84,84,'c5'],[62,63,63,'dsharp3'],[72,75,74,'d4'],[52,54,53,'f2'],[64,65,65,'f3'],[76,78,77,'f4'],[66,68,67,'g3']]},
};
const VSCO2_UPRIGHT_PIANO_REGIONS=[[21,22,21,'000'],[23,26,25,'002'],[27,30,29,'004'],[31,34,33,'006'],[35,38,37,'008'],[39,42,41,'010'],[43,46,45,'012'],[47,50,49,'014'],[51,54,53,'016'],[55,58,57,'018'],[59,62,61,'020'],[63,66,65,'022'],[67,70,69,'024'],[71,74,73,'026'],[75,78,77,'028'],[79,82,81,'030'],[83,86,85,'032'],[87,90,89,'034'],[91,94,93,'036'],[95,98,97,'038'],[99,102,101,'040'],[103,106,105,'042'],[107,108,108,'044']];
const VSCO2_UPRIGHT_NR1_REGIONS=[[24,27,24,'C1','12','2','12'],[28,33,31,'G1','1','12','2'],[34,39,36,'C2','1','12','12'],[40,45,43,'G2','1','12','12'],[46,51,48,'C3','12','12','12'],[52,57,55,'G3','12','12','12'],[58,63,60,'C4','12','12','12'],[64,69,67,'G4','12','12','12'],[70,75,72,'C5','12','12','12'],[76,81,79,'G5','12','12','12'],[82,87,84,'C6','12','12','12'],[88,93,91,'G6','12','12','12'],[94,99,96,'C7','12','12','12'],[100,103,103,'G7','12','12','12']];
const HEADROOM_REGIONS=Array.from({length:30},(_,i)=>{const root=21+i*3;return [i===0?21:root-1,i===29?108:root+1,root];});
const SPLENDID_PP_REGIONS=[[21,24,23,'PP B-1'],[25,27,27,'PP D#0'],[28,30,29,'PP F0'],[31,32,31,'PP G0'],[33,34,33,'PP A0'],[35,35,35,'PP B0'],[36,37,37,'PP C#1'],[38,39,38,'PP D1'],[40,40,40,'PP E1'],[41,41,41,'PP F1'],[42,44,43,'PP G1'],[45,46,45,'PP A1'],[47,47,47,'PP B1'],[48,49,48,'PP C2'],[50,50,50,'PP D2'],[51,52,52,'PP E2'],[53,54,53,'PP F2'],[55,55,55,'PP G2'],[56,56,56,'PP G#2'],[57,57,57,'PP A2'],[58,58,58,'PP A#2'],[59,59,59,'PP B2'],[60,61,60,'PP C3'],[62,63,62,'PP D3'],[64,64,64,'PP E3'],[65,66,65,'PP F3'],[67,68,67,'PP G3'],[69,69,69,'PP A3'],[70,71,71,'PP B3'],[72,73,72,'PP C4'],[74,75,74,'PP D4'],[76,76,76,'PP E4'],[77,78,77,'PP F4'],[79,79,79,'PP G4'],[80,80,80,'PP G#4'],[81,81,81,'PP A4'],[82,82,82,'PP A#4'],[83,83,83,'PP B4'],[84,85,85,'PP C#5'],[86,86,86,'PP D5'],[87,87,87,'PP D#5'],[88,89,89,'PP F5'],[90,90,90,'PP F#5'],[91,91,91,'PP G5'],[92,92,92,'PP G#5'],[93,93,93,'PP A5'],[94,94,94,'PP A#5'],[95,95,95,'PP B5'],[96,96,96,'PP C6'],[97,97,97,'PP C#6'],[98,98,98,'PP D6'],[99,99,99,'PP D#6'],[100,100,100,'PP E6'],[101,101,101,'PP F6'],[102,102,102,'PP F#6'],[103,103,103,'PP G6'],[104,104,104,'PP G#6'],[105,105,105,'PP A6'],[106,106,106,'PP A#6'],[107,107,107,'PP B6'],[108,108,108,'PP C7']];
const SPLENDID_MP_REGIONS=[[21,24,23,'Mp B-1'],[25,27,27,'Mp D#0'],[28,30,29,'Mp F0'],[31,32,31,'Mp G0'],[33,34,33,'Mp A0'],[35,35,35,'Mp B0'],[36,37,37,'Mp C#1'],[38,39,38,'Mp D1'],[40,40,40,'Mp E1'],[41,41,41,'Mp F1'],[42,44,43,'Mp G1'],[45,46,45,'Mp A1'],[47,47,47,'Mp B1'],[48,49,48,'Mp C2'],[50,50,50,'Mp D2'],[51,52,52,'Mp E2'],[53,54,53,'Mp F2'],[55,55,55,'Mp G2'],[56,56,56,'Mp G#2'],[57,57,57,'Mp A2'],[58,58,58,'Mp A#2'],[59,59,59,'Mp B2'],[60,61,60,'Mp C3'],[62,63,62,'Mp D3'],[64,64,64,'Mp E3'],[65,66,65,'Mp F3'],[67,68,67,'Mp G3'],[69,69,69,'Mp A3'],[70,71,71,'Mp B3'],[72,73,72,'Mp C4'],[74,75,74,'Mp D4'],[76,76,76,'Mp E4'],[77,78,77,'Mp F4'],[79,79,79,'Mp G4'],[80,80,80,'Mp G#4'],[81,81,81,'Mp A4'],[82,82,82,'Mp A#4'],[83,83,83,'Mp B4'],[84,85,85,'Mp C#5'],[86,86,86,'Mp D5'],[87,87,87,'Mp D#5'],[88,88,88,'Mp E5'],[89,89,89,'Mp F5'],[90,90,90,'Mp F#5'],[91,91,91,'Mp G5'],[92,92,92,'Mp G#5'],[93,93,93,'Mp A5'],[94,94,94,'Mp A#5'],[95,95,95,'Mp B5'],[96,96,96,'Mp C6'],[97,97,97,'Mp C#6'],[98,98,98,'Mp D6'],[99,99,99,'Mp D#6'],[100,100,100,'PP E6'],[101,101,101,'Mp F6'],[102,102,102,'Mp F#6'],[103,103,103,'Mp G6'],[104,104,104,'Mp G#6'],[105,105,105,'Mp A6'],[106,106,106,'Mp A#6'],[107,107,107,'PP B6'],[108,108,108,'PP C7']];
const SPLENDID_MF_REGIONS=[[21,24,23,'Mf B-1'],[25,27,27,'Mf D#0'],[28,30,29,'Mf F0'],[31,32,31,'Mf G0'],[33,34,33,'Mf A0'],[35,35,35,'Mf B0'],[36,37,37,'MF C#1'],[38,39,38,'MF D1'],[40,40,40,'MF E1'],[41,41,41,'MF F1'],[42,44,43,'MF G1'],[45,46,45,'MF A1'],[47,47,47,'MF B1'],[48,49,48,'MF C2'],[50,50,50,'MF D2'],[51,52,52,'MF E2'],[53,54,53,'MF F2'],[55,55,55,'MF G2'],[56,56,56,'MF G#2'],[57,57,57,'MF A2'],[58,58,58,'MF A#2'],[59,59,59,'MF B2'],[60,61,60,'MF C3'],[62,63,62,'MF D3'],[64,64,64,'MF E3'],[65,66,65,'MF F3'],[67,68,67,'MF G3'],[69,69,69,'MF A3'],[70,71,71,'MF B3'],[72,73,72,'MF C4'],[74,75,74,'Mf D4'],[76,76,76,'Mf E4'],[77,78,77,'Mf F4'],[79,79,79,'Mf G4'],[80,80,80,'Mf G#4'],[81,81,81,'Mf A4'],[82,82,82,'Mf A#4'],[83,83,83,'Mf B4'],[84,85,85,'Mf C#5'],[86,86,86,'Mf D5'],[87,87,87,'Mf D#5'],[88,88,88,'Mf E5'],[89,89,89,'Mf F5'],[90,90,90,'Mf F#5'],[91,91,91,'Mf G5'],[92,92,92,'Mf G#5'],[93,93,93,'Mf A5'],[94,94,94,'Mf A#5'],[95,95,95,'Mf B5'],[96,96,96,'Mf C6'],[97,97,97,'Mf C#6'],[98,98,98,'Mf D6'],[99,99,99,'Mf D#6'],[100,100,100,'Mf E6'],[101,101,101,'Mf F6'],[102,102,102,'Mf F#6'],[103,103,103,'Mf G6'],[104,104,104,'Mf G#6'],[105,105,105,'Mf A6'],[106,106,106,'Mf A#6'],[107,107,107,'Mf B6'],[108,108,108,'Mf C7']];
const SPLENDID_FF_REGIONS=[[21,24,23,'FF B-1'],[25,27,27,'FF D#0'],[28,30,29,'FF F0'],[31,32,31,'FF G0'],[33,34,33,'FF A0'],[35,35,35,'FF B0'],[36,37,37,'FF C#1'],[38,39,38,'FF D1'],[40,40,40,'FF E1'],[41,41,41,'FF F1'],[42,44,43,'FF G1'],[45,46,45,'FF A1'],[47,47,47,'FF B1'],[48,49,48,'FF C2'],[50,50,50,'FF D2'],[51,52,52,'FF E2'],[53,54,53,'FF F2'],[55,55,55,'FF G2'],[56,56,56,'FF G#2'],[57,57,57,'FF A2'],[58,58,58,'FF A#2'],[59,59,59,'FF B2'],[60,61,60,'FF C3'],[62,63,62,'FF D3'],[64,64,64,'FF E3'],[65,66,65,'FF F3'],[67,68,67,'FF G3'],[69,69,69,'FF A3'],[70,71,71,'FF B3'],[72,73,72,'FF C4'],[74,75,74,'FF D4'],[76,76,76,'FF E4'],[77,78,77,'FF F4'],[79,79,79,'FF G4'],[80,80,80,'FF G#4'],[81,81,81,'FF A4'],[82,82,82,'FF A#4'],[83,83,83,'FF B4'],[84,85,85,'FF C#5'],[86,87,86,'FF D5'],[88,88,88,'FF E5'],[89,90,89,'FF F5'],[91,92,91,'FF G5'],[93,94,93,'FF A5'],[95,95,95,'Mf B5'],[96,97,96,'Mf C6'],[98,98,97,'Mf C#6'],[99,99,98,'Mf D6'],[100,100,99,'Mf D#6'],[101,101,100,'Mf E6'],[102,102,102,'Mf F#6'],[103,103,103,'Mf G6'],[104,104,104,'Mf G#6'],[105,105,105,'Mf A6'],[106,106,106,'Mf A#6'],[107,107,107,'Mf B6'],[108,108,108,'Mf C7']];
const SPLENDID_REGION_LAYERS=[SPLENDID_PP_REGIONS,SPLENDID_MP_REGIONS,SPLENDID_MF_REGIONS,SPLENDID_FF_REGIONS];
const LIVINGROOM_REGIONS=[[21,23,22,'A#-1'],[24,25,24,'C0'],[26,28,27,'D#0'],[29,31,29,'F0'],[32,34,33,'A0'],[35,36,35,'B0'],[37,38,38,'D1'],[39,40,40,'E1'],[41,42,41,'F1'],[43,44,43,'G1'],[45,47,45,'A1'],[48,49,48,'C2'],[50,51,50,'D2'],[52,54,53,'F2'],[55,56,55,'G2'],[57,58,57,'A2'],[59,61,60,'C3'],[62,63,62,'D3'],[64,66,65,'F3'],[67,68,67,'G3'],[69,70,69,'A3'],[71,72,71,'B3'],[73,75,74,'D4'],[76,78,77,'F4'],[79,80,79,'G4'],[81,82,81,'A4'],[83,85,84,'C5'],[86,88,88,'E5'],[89,91,89,'F5'],[92,95,93,'A5'],[96,98,96,'C6-C#6-D6'],[99,101,100,'D#6-E6-F6'],[102,108,102,'F#6-G6-G#6-A6']];
const MAESTRO_REGIONS=Array.from({length:88},(_,i)=>{const midi=21+i;return [midi,midi,midi,String(midi).padStart(3,'0')];});
const MAESTRO_LAYERS=['p','mp','mf','f','ff'];
const SALAMANDER_REGIONS=[[21,22,21,'A0'],[23,25,24,'C1'],[26,28,27,'D#1'],[29,31,30,'F#1'],[32,34,33,'A1'],[35,37,36,'C2'],[38,40,39,'D#2'],[41,43,42,'F#2'],[44,46,45,'A2'],[47,49,48,'C3'],[50,52,51,'D#3'],[53,55,54,'F#3'],[56,60,57,'A3'],[61,64,63,'D#4'],[65,67,66,'F#4'],[68,70,69,'A4'],[71,73,72,'C5'],[74,76,75,'D#5'],[77,79,78,'F#5'],[80,82,81,'A5'],[83,85,84,'C6'],[86,88,87,'D#6'],[89,91,90,'F#6'],[92,94,93,'A6'],[95,97,96,'C7'],[98,100,99,'D#7'],[101,103,102,'F#7'],[104,106,105,'A7'],[107,108,108,'C8']];
const SALAMANDER_LAYERS=[1,5,9,13,16];
const UPRIGHT_KW_REGIONS={
  soft: [
    [21,22,21,"A0vL.flac",244730,333808],
    [23,25,24,"C1vL.flac",325127,471187],
    [26,28,27,"D_1vL.flac",412198,566248],
    [29,31,30,"F_1vL.flac",335793,486976],
    [32,34,33,"A1vL.flac",348550,524031],
    [35,37,36,"C2vL.flac",397535,510386],
    [38,40,39,"D_2vL.flac",425067,585179],
    [41,43,42,"F_2vL.flac",327987,438561],
    [44,46,45,"A2vL.flac",240292,361157],
    [47,49,48,"C3vL.flac",137735,212674],
    [50,52,51,"D_3vL.flac",188513,255624],
    [53,55,54,"F_3vL.flac",134294,213980],
    [56,58,57,"A3vL.flac",173690,283676],
    [59,61,60,"C4vL.flac",199374,354248],
    [62,64,63,"D_4vL.flac",111422,184757],
    [65,67,66,"F_4vL.flac",151730,255601],
    [68,70,69,"A4vL.flac",0,0],
    [71,73,72,"C5vL.flac",0,0],
    [74,76,75,"D_5vL.flac",0,0],
    [77,79,78,"F_5vL.flac",0,0],
    [80,82,81,"A5vL.flac",0,0],
    [83,85,84,"C6vL.flac",0,0],
    [86,88,87,"D_6vL.flac",0,0],
    [89,91,90,"F_6vL.flac",0,0],
    [92,94,93,"A6vL.flac",0,0],
    [95,97,96,"C7vL.flac",0,0],
    [98,100,99,"D_7vL.flac",0,0],
    [101,103,102,"F_7vL.flac",0,0],
    [104,106,105,"A7vL.flac",0,0],
    [107,108,108,"C8vL.flac",0,0]
  ],
  strong: [
    [21,22,21,"A0vH.flac",226952,310216],
    [23,23,23,"B0vH.flac",238766,332736],
    [24,25,24,"C1vH.flac",306378,424657],
    [26,28,27,"D_1vH.flac",345735,461796],
    [29,31,30,"F_1vH.flac",240705,351556],
    [32,33,33,"A1vH.flac",332232,442432],
    [34,35,35,"B1vH.flac",256475,366932],
    [36,37,36,"C2vH.flac",256636,376577],
    [38,40,39,"D_2vH.flac",288169,398441],
    [41,45,42,"F_2vH.flac",250236,393511],
    [46,47,47,"B2vH.flac",238940,341297],
    [48,49,48,"C3vH.flac",196763,307070],
    [50,52,51,"D_3vH.flac",162986,240314],
    [53,55,54,"F_3vH.flac",194343,265634],
    [56,57,57,"A3vH.flac",120679,186801],
    [58,61,59,"B3vH.flac",163021,227577],
    [62,64,63,"D_4vH.flac",151896,217597],
    [65,67,66,"F_4vH.flac",138527,185330],
    [68,69,69,"A4vH.flac",0,0],
    [70,71,71,"B4vH.flac",0,0],
    [72,73,72,"C5vH.flac",0,0],
    [74,76,75,"D_5vH.flac",0,0],
    [77,79,78,"F_5vH.flac",0,0],
    [80,81,81,"A5vH.flac",0,0],
    [82,83,83,"B5vH.flac",0,0],
    [84,85,84,"C6vH.flac",0,0],
    [86,88,87,"D_6vH.flac",0,0],
    [89,91,90,"F_6vH.flac",0,0],
    [92,93,93,"A6vH.flac",0,0],
    [94,95,95,"B6vH.flac",0,0],
    [96,97,96,"C7vH.flac",0,0],
    [98,100,99,"D_7vH.flac",0,0],
    [101,103,102,"F_7vH.flac",0,0],
    [104,105,105,"A7vH.flac",0,0],
    [106,107,107,"B7vH.flac",0,0],
    [108,108,108,"C8vH.flac",0,0]
  ]
};
const VSCO2_UPRIGHT_PATCHES={};
const INSTRUMENTS = {
  'solo-violin':{folder:'solo-violin-upload',first:55,last:96,step:1,release:.72,sampledRoots:SOLO_VIOLIN_ROOTS},
  'distorted-guitar':{folder:'distorted-guitar-upload',first:36,last:85,step:1,release:.42,sampledRoots:DISTORTED_GUITAR_ROOTS},
  'grand-piano': { folder: 'grand-piano', first: 30, last: 96, step: 3, release: 0.4 },
  'steinway-grand': { folder: 'steinway-grand', first: 36, last: 95, step: 1, release: 0.7 },  'splendid-grand':{folder:'splendid-grand-source/SplendidGrandPiano-master/Samples',first:21,last:108,step:1,release:.7,samples:SPLENDID_PP_REGIONS},  'maestro-concert-grand':{folder:'maestro-concert-grand-source/MatsHelgesson.MaestroConcertGrandPiano-master/Samples',first:21,last:108,step:1,release:.7,samples:MAESTRO_REGIONS},
  'salamander-grand':{folder:'salamander-cloudinary-upload',first:21,last:108,step:1,release:.9,samples:SALAMANDER_REGIONS},
  'trumpet-vsco2-sus-vib': { folder: 'vsco2-trumpet-sus-vib', first: 53, last: 84, step: 1, release: 0.25, samples: VSCO2_TRUMPET_SUS_VIB_REGIONS.map(([low,high,root,note])=>[low,high,root,`trumpet-sus-vib-${note}`]) },
  ...Object.fromEntries(Object.entries(VSCO2_TRUMPET_PATCHES).map(([id,patch])=>[id,{folder:patch.folder,first:Math.min(...patch.regions.map(region=>region[0])),last:Math.max(...patch.regions.map(region=>region[1])),step:1,release:patch.release,samples:patch.regions.map(([low,high,root,note])=>[low,high,root,`${patch.prefix}-${note}`])}])),
  ...Object.fromEntries(EXTRA_INSTRUMENTS.map(instrument=>[instrument.id,{...instrument,step:1,nearestSample:true}])),
};

export { SOLO_VIOLIN_ROOTS, DISTORTED_GUITAR_ROOTS, STRINGS_SAMPLE_ROOTS, VSCO2_TRUMPET_SUS_VIB_REGIONS, VSCO2_TRUMPET_PATCHES, VSCO2_UPRIGHT_PIANO_REGIONS, VSCO2_UPRIGHT_NR1_REGIONS, HEADROOM_REGIONS, SPLENDID_PP_REGIONS, SPLENDID_MP_REGIONS, SPLENDID_MF_REGIONS, SPLENDID_FF_REGIONS, SPLENDID_REGION_LAYERS, LIVINGROOM_REGIONS, MAESTRO_REGIONS, MAESTRO_LAYERS, SALAMANDER_REGIONS, SALAMANDER_LAYERS, UPRIGHT_KW_REGIONS, VSCO2_UPRIGHT_PATCHES, INSTRUMENTS };
