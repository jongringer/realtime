// ==========================================================================
// realtime 실시간 지하철 즐겨찾기 전광판 엔진 (국회의사당역 9호선 · 여의도역 9·5호선)
// - 스크린샷 동일 BIT 포맷 (.bit-board-card + 9호선 고유 골드 / 5호선 고유 퍼플)
// - 서울시 실시간 도착정보 1순위 + 실시간 부재 시 공식 역사 시간표 자동 폴백
// - 카드별 [서울시 실시간 / 시간표 / 전체 / ＋ / ↺] 즉시 전환 및 글씨 확대 지원
// ==========================================================================

const OFFICIAL_SUBWAY_TIMETABLES = {"NA_9_UP_WD":{"5":[40,53],"6":[3,15,27,39,48,55],"7":[3,9,16,22,28,35,41,47,54],"8":[0,6,13,19,25,32,38,44,51,58],"9":[6,15,27,37,48,59],"10":[10,21,32,43,54],"11":[6,18,29,40,51],"12":[2,13,24,35,46,57],"13":[8,19,30,42,54],"14":[5,16,27,38,49],"15":[0,11,22,33,44,55],"16":[6,15,18,30,41,44,54],"17":[3,10,17,24,31,37,44,51,58],"18":[5,12,18,25,32,39,46,53,59],"19":[6,13,20,27,36,45,54],"20":[3,11,24,33,44,55],"21":[6,17,28,39,50],"22":[1,12,23,34,45,56],"23":[7,18,29,40,51],"24":[1,11,"22:삼전","35:신논현","48:동작"]},"NA_9_UP_WE":{"5":[39,52],"6":[3,15,27,39,51],"7":[3,15,27,39,51],"8":[3,15,27,39,51],"9":[3,15,27,38,49],"10":[0,11,22,33,44,55],"11":[6,17,28,39,50],"12":[1,12,23,34,45,56],"13":[7,18,29,40,51],"14":[2,13,24,35,46,57],"15":[8,19,30,41,52],"16":[3,14,25,36,47,58],"17":[9,20,31,42,53],"18":[4,15,26,37,48,59],"19":[10,21,32,43,54],"20":[5,16,28,40,52],"21":[4,16,28,40,52],"22":[4,16,29,42,55],"23":[5,18,"31:신논현","44:동작"]},"NA_9_DN_WD":{"5":[42,53],"6":[6,22,37,50],"7":[3,16,29,42,50],"8":[2,14,22,31,39,48,57],"9":[4,11,17,23,30,36,42,49,55],"10":[1,8,14,20,27,"29:김포공항",33,39,44,52,57],"11":[5,13,23,34,45,56],"12":[7,18,29,41,53],"13":[4,15,26,37,48,59],"14":[10,21,32,43,54],"15":[5,16,28,41,53],"16":[4,15,26,37,48,59],"17":[10,21,32,43,54],"18":[5,16,24,32,40,48,56],"19":[4,11,18,25,32,38,45,52,59],"20":[6,13,19,26,33,40,47,54],"21":[0,7,15,"18:김포공항",22,28,36,46,57],"22":[5,8,19,30,41,52],"23":[3,14,25,36,47,58],"24":[9,20,31,"42:마곡나루","53:염창"]},"NA_9_DN_WE":{"5":[42,52],"6":[6,24,37,50],"7":[2,14,26,38,50],"8":[2,14,26,38,50],"9":[2,14,26,38,50],"10":[2,14,26,38,49],"11":[0,11,22,33,44,55],"12":[6,17,28,39,50],"13":[1,12,23,34,45,56],"14":[7,18,29,40,51],"15":[2,13,24,35,46,57],"16":[8,19,30,41,52],"17":[3,14,25,36,47,58],"18":[9,20,31,42,53],"19":[4,15,26,37,48,59],"20":[10,21,32,43,54],"21":[5,16,27,38,49],"22":[0,12,24,36,48],"23":[0,13,26,39,"51:염창"]},"YD_9_UP_WD":{"5":[30,"33E",42,"49E",55],"6":["0E",6,"11E",18,"23E",30,"35E",42,"47E",50,57,"59E"],"7":[6,"7E",12,"13E",18,"20E",24,"26E",31,"32E",37,"39E",43,"45E",50,"51E",56,"58E"],"8":[2,"4E",9,"10E",15,"17E",21,"23E",28,"29E",34,"36E",40,"42E",47,"48E",53,"54E"],"9":[0,"1E",9,"11E",17,"22E","26E:신논현",29,"33E",39,"44E",50,"55E"],"10":[1,"6E",12,"17E",23,"28E",34,"39E",45,"50E",56],"11":["1E",8,"13E",20,"25E",31,"36E",42,"47E",53,"58E"],"12":[4,"9E",15,"20E",26,"31E",37,"42E",48,"53E",59],"13":["4E",10,"15E",21,"26E",32,"38E",44,"50E",56],"14":["1E",7,"12E",18,"23E",29,"34E",40,"45E",51,"56E"],"15":[2,"7E",13,"18E",24,"29E",35,"40E",46,"51E",57],"16":["2E",8,"14E",17,20,"26E",32,"37E",43,46,"48E",57,"59E"],"17":[5,"7E",12,"14E",19,"20E",26,"27E",33,"34E",40,"41E",46,"48E",53,"55E"],"18":[0,"1E",7,"8E",14,"15E",21,"22E",27,"29E",34,"36E",41,"42E",48,"49E",55,"56E"],"19":[2,"3E",8,"10E",15,"17E",22,"23E",29,"31E",38,"40E",47,"49E",56,"58E"],"20":[5,"7E",14,"18E","23E:신논현",25,"29E",36,"40E",47,"51E",58],"21":["2E",9,"13E",20,"24E",31,"35E",42,"46E",53,"57E"],"22":[4,"8E",15,"19E",26,"30E",37,"41E",48,"52E",59],"23":["3E",10,"14E",21,"25E",32,"36E",43,"47E",54],"24":[3,14,"25:삼전","37:신논현","50:동작"]},"YD_9_UP_WE":{"5":[30,"33E",41,"47E",54,"59E"],"6":[5,"10E",17,"22E",29,"34E",41,"46E",53,"58E"],"7":[5,"10E",17,"22E",29,"34E",41,"46E",53,"58E"],"8":[5,"10E",17,"22E",29,"34E",41,"46E",53,"58E"],"9":[5,"10E",17,"22E",29,"33E",40,"44E",51,"55E"],"10":[2,"6E",13,"17E",24,"28E",35,"39E",46,"50E",57],"11":["1E",8,"12E",19,"23E",30,"34E",41,"45E",52,"56E"],"12":[3,"7E",14,"18E",25,"29E",36,"40E",47,"51E",58],"13":["2E",9,"13E",20,"24E",31,"35E",42,"46E",53,"57E"],"14":[4,"8E",15,"19E",26,"30E",37,"41E",48,"52E",59],"15":["3E",10,"14E",21,"25E",32,"36E",43,"47E",54,"58E"],"16":[5,"9E",16,"20E",27,"31E",38,"42E",49,"53E"],"17":[0,"4E",11,"15E",22,"26E",33,"37E",44,"48E",55,"59E"],"18":[6,"10E",17,"21E",28,"32E",39,"43E",50,"54E"],"19":[1,"5E",12,"16E",23,"27E",34,"38E",45,"49E",56],"20":["0E",7,"11E",18,"23E",30,"35E",42,"47E",54,"59E"],"21":[6,"11E",18,"23E",30,"35E",42,"47E",54,"59E"],"22":[6,"11E",18,"24E",31,"37E",44,"50E",57],"23":[7,20,"33:신논현","46:동작"]},"YD_9_DN_WD":{"5":[40,51],"6":[4,20,"27E:김포공항",35,"41E:김포공항",48,"54E:김포공항"],"7":[1,"7E:김포공항",14,"20E:김포공항",27,"33E:김포공항",40,"45E:김포공항",48,"56E:김포공항"],"8":[0,"8E:김포공항",12,"19E:김포공항",20,"27E:김포공항",29,"36E:김포공항",37,"45E:김포공항",46,"53E:김포공항",55],"9":["1E:김포공항",2,"8E:김포공항",9,"14E:김포공항",15,"20E:김포공항",22,"27E:김포공항",28,"33E:김포공항",34,"39E:김포공항",41,"46E:김포공항",47,"52E:김포공항",53,"58E:김포공항"],"10":[0,"5E:김포공항",6,"11E:김포공항",12,"17E:김포공항",19,"24E:김포공항",25,"27:김포공항","30E:김포공항",31,"36E:김포공항",38,42,"47E:김포공항",50,55,"57E:김포공항"],"11":[3,"7E:김포공항",11,"17E:김포공항",21,"27E:김포공항",32,"38E:김포공항",43,"49E:김포공항",54],"12":["0E:김포공항",5,"11E:김포공항",16,"22E:김포공항",27,"34E:김포공항",39,"46E:김포공항",51,"57E:김포공항"],"13":[2,"8E:김포공항",13,"19E:김포공항",24,"30E:김포공항",35,"41E:김포공항",46,"52E:김포공항",57],"14":["3E:김포공항",8,"14E:김포공항",19,"25E:김포공항",30,"36E:김포공항",41,"47E:김포공항",52,"58E:김포공항"],"15":[3,"10E:김포공항",14,"22E:김포공항",26,"34E:김포공항",39,"47E:김포공항",51,"58E:김포공항"],"16":[2,"9E:김포공항",13,"20E:김포공항",24,"31E:김포공항",35,"42E:김포공항",46,"53E:김포공항",57],"17":["4E:김포공항",8,"15E:김포공항",19,"26E:김포공항",30,"37E:김포공항",41,"48E:김포공항",52,"59E:김포공항"],"18":[3,"9E:김포공항",14,"20E:김포공항",22,"29E:김포공항",30,"37E:김포공항",38,"45E:김포공항",46,"53E:김포공항",54],"19":["1E:김포공항",2,"8E:김포공항",9,"14E:김포공항",16,"21E:김포공항",23,"28E:김포공항",30,"35E:김포공항",37,"42E:김포공항",43,"49E:김포공항",50,"55E:김포공항",57],"20":["2E:김포공항",4,"9E:김포공항",11,"16E:김포공항",18,"23E:김포공항",24,"30E:김포공항",31,"36E:김포공항",38,"43E:김포공항",45,"50E:김포공항",52,"57E:김포공항",59],"21":["4E:김포공항",6,"11E:김포공항",13,"16:김포공항","19E:김포공항",20,26,"30E:김포공항",34,"40E:김포공항",45,"51E:김포공항",55],"22":["2E:김포공항",3,6,"13E:김포공항",17,"24E:김포공항",28,"35E:김포공항",39,"46E:김포공항",50,"57E:김포공항"],"23":[1,"8E:김포공항",12,"19E:김포공항",23,"30E:김포공항",34,"41E:김포공항",45,"52E:김포공항",56],"24":["3E:김포공항",7,"14E:김포공항",18,"25E:김포공항",29,"36E:김포공항","40:마곡나루","47E:김포공항","51:염창"]},"YD_9_DN_WE":{"5":[40,50],"6":[4,22,"30E:김포공항",35,"43E:김포공항",48,"56E:김포공항"],"7":[1,"8E:김포공항",13,"20E:김포공항",25,"32E:김포공항",37,"44E:김포공항",49,"56E:김포공항"],"8":[1,"8E:김포공항",13,"20E:김포공항",25,"32E:김포공항",37,"44E:김포공항",49,"56E:김포공항"],"9":[1,"8E:김포공항",13,"20E:김포공항",25,"32E:김포공항",37,"44E:김포공항",49,"56E:김포공항"],"10":[1,"8E:김포공항",13,"20E:김포공항",25,"32E:김포공항",37,"43E:김포공항",48,"54E:김포공항",59],"11":["5E:김포공항",10,"16E:김포공항",21,"27E:김포공항",32,"38E:김포공항",43,"49E:김포공항",54],"12":["0E:김포공항",5,"11E:김포공항",16,"22E:김포공항",27,"33E:김포공항",38,"44E:김포공항",49,"55E:김포공항"],"13":[0,"6E:김포공항",11,"17E:김포공항",22,"28E:김포공항",33,"39E:김포공항",44,"50E:김포공항",55],"14":["1E:김포공항",6,"12E:김포공항",17,"23E:김포공항",28,"34E:김포공항",39,"45E:김포공항",50,"56E:김포공항"],"15":[1,"7E:김포공항",12,"18E:김포공항",23,"29E:김포공항",34,"40E:김포공항",45,"51E:김포공항",56],"16":["2E:김포공항",7,"13E:김포공항",18,"24E:김포공항",29,"35E:김포공항",40,"46E:김포공항",51,"57E:김포공항"],"17":[2,"8E:김포공항",13,"19E:김포공항",24,"30E:김포공항",35,"41E:김포공항",46,"52E:김포공항",57],"18":["3E:김포공항",8,"14E:김포공항",19,"25E:김포공항",30,"36E:김포공항",41,"47E:김포공항",52,"58E:김포공항"],"19":[3,"9E:김포공항",14,"20E:김포공항",25,"31E:김포공항",36,"42E:김포공항",47,"53E:김포공항",58],"20":["4E:김포공항",9,"15E:김포공항",20,"26E:김포공항",31,"37E:김포공항",42,"48E:김포공항",53,"59E:김포공항"],"21":[4,"10E:김포공항",15,"21E:김포공항",26,"32E:김포공항",37,"43E:김포공항",48,"54E:김포공항",59],"22":["6E:김포공항",11,"18E:김포공항",23,"30E:김포공항",35,"42E:김포공항",47,"54E:김포공항",59],"23":["6E:김포공항",11,"19E:김포공항",24,"32E:김포공항",37,"45E:김포공항","50:염창"]},"YD_5_UP_WD":{"5":[30,44,56],"6":[6,14,22,27,35,41,46,52,58],"7":[4,10,15,21,26,31,36,41,46,51,55],"8":[0,4,9,13,17,21,25,29,32,35,39,42,46,48,51,53,56,58],"9":[1,3,6,9,11,14,18,21,24,28,32,36,40,44,48,53,57],"10":[3,7,13,18,23,28,34,40,45,51,57],"11":[3,9,15,22,28,35,41,48,54],"12":[1,7,14,20,27,33,40,46,53,59],"13":[6,12,19,25,32,38,45,51,58],"14":[4,11,17,24,30,37,43,50,56],"15":[3,9,16,22,29,35,42,48,55],"16":[1,8,14,21,27,34,40,47,53],"17":[0,6,13,19,26,32,39,45,52,58],"18":[3,8,12,16,20,24,28,32,36,39,42,45,48,51,55,58],"19":[2,6,10,14,18,22,26,31,38,44,50,57],"20":[3,10,16,23,29,36,42,49,55],"21":[2,8,15,21,28,34,41,47,54],"22":[0,7,13,20,27,34,41,48,55],"23":[3,11,19,27,37,49],"24":[1,14,28]},"YD_5_UP_WE":{"5":[30,44,56],"6":[6,14,22,30,38,45,52,59],"7":[6,13,20,27,34,41,48,55],"8":[1,8,14,21,27,34,40,47,53],"9":[0,6,13,19,26,32,39,45,52,58],"10":[5,11,18,24,31,37,44,50,57],"11":[3,10,16,23,29,36,42,49,55],"12":[2,8,15,21,28,34,41,47,54],"13":[0,7,13,20,26,33,39,46,52,59],"14":[5,12,18,25,31,38,44,51,57],"15":[4,10,17,23,30,36,43,49,56],"16":[2,9,15,22,28,35,41,48,54],"17":[1,7,14,20,27,33,40,46,53,59],"18":[6,12,19,25,32,38,45,51,58],"19":[4,11,17,24,30,37,43,50,56],"20":[3,9,16,22,29,35,42,48,55],"21":[1,8,14,21,27,34,40,47,53],"22":[0,6,13,19,26,32,39,46,53],"23":[1,10,19,29,39,"51:화곡"]},"YD_5_DN_WD":{"5":[46,"53:마천"],"6":[1,"8:마천",15,"22:마천",29,"35:마천",42,"48:마천",54,"59:마천"],"7":[6,"11:마천",16,"21:마천",26,"31:마천",36,"40:마천",45,"49:마천","54:상일동","59:마천"],"8":[3,"7:마천",11,"14:마천","18:상일동","21:마천",25,"28:마천",32,"34:마천","37:상일동","40:마천",43,"46:마천","49:상일동","53:마천",56],"9":["0:마천",3,"7:마천",11,"15:마천","19:상일동","23:마천",27,"31:마천",35,"39:마천",44,"49:마천",54,"58:마천"],"10":[3,"8:마천",14,"21:마천",27,"34:마천",40,"46:마천",53],"11":["0:마천",6,"13:마천",19,"26:마천",32,"39:마천",45,"52:마천",58],"12":["5:마천",11,"18:마천",24,"31:마천",37,"44:마천",50,"57:마천"],"13":[3,"10:마천",16,"23:마천",29,"36:마천",42,"49:마천",55],"14":["2:마천",8,"15:마천",21,"28:마천",34,"41:마천",47,"54:마천"],"15":[0,"7:마천",13,"20:마천",26,"33:마천",39,"46:마천",52,"59:마천"],"16":[5,"12:마천",18,"25:마천",31,"38:마천",44,"51:마천",57],"17":["3:마천",9,"15:마천",21,"26:마천",31,"35:마천",39,"43:마천",47,"50:마천",54,"57:마천"],"18":[1,"4:마천",7,"10:마천",13,"16:마천",19,"22:마천",25,"28:마천",31,"34:마천",37,"40:마천",44,"49:마천",54,"59:마천"],"19":[4,"10:마천",16,"22:마천",29,"35:마천",42,"48:마천",56],"20":["1:마천",8,"14:마천",21,"27:마천",34,"40:마천",47,"53:마천"],"21":[0,"6:마천",13,"19:마천",26,"32:마천",39,"45:마천",52,"58:마천"],"22":[5,"11:마천",20,"27:마천",35,"42:마천",51,"59:마천"],"23":[7,"16:마천",25,"34:마천",43,"51:마천","59:군자"],"24":["7:상일동","25:군자","45:애오개"]},"YD_5_DN_WE":{"5":[46,"53:마천"],"6":[1,"8:마천",16,"23:마천",30,"37:마천",44,"51:마천",58],"7":["5:마천",12,"19:마천",26,"33:마천",39,"46:마천",52,"59:마천"],"8":[5,"12:마천",18,"25:마천",31,"38:마천",44,"51:마천",57],"9":["4:마천",10,"17:마천",23,"30:마천",36,"43:마천",49,"56:마천"],"10":[2,"9:마천",15,"22:마천",28,"35:마천",41,"48:마천",54],"11":["1:마천",7,"14:마천",20,"27:마천",33,"40:마천",46,"53:마천",59],"12":["6:마천",12,"19:마천",25,"32:마천",38,"45:마천",51,"58:마천"],"13":[4,"11:마천",17,"24:마천",30,"37:마천",43,"50:마천",56],"14":["3:마천",9,"16:마천",22,"29:마천",35,"42:마천",48,"55:마천"],"15":[1,"8:마천",14,"21:마천",27,"34:마천",40,"47:마천",53],"16":["0:마천",6,"13:마천",19,"26:마천",32,"39:마천",45,"52:마천",58],"17":["5:마천",11,"18:마천",24,"31:마천",37,"44:마천",50,"57:마천"],"18":[3,"10:마천",16,"23:마천",29,"36:마천",42,"49:마천",55],"19":["2:마천",8,"15:마천",21,"28:마천",34,"41:마천",47,"54:마천"],"20":[0,"7:마천",13,"20:마천",26,"33:마천",39,"46:마천",52,"59:마천"],"21":[5,"12:마천",18,"25:마천",31,"38:마천",44,"51:마천",57],"22":["4:마천",11,"18:마천",26,"33:마천","41:상일동","49:마천",57],"23":["5:마천","15:상일동","23:상일동","31:군자","39:왕십리","51:애오개"]}};

const SUBWAY_LINE_META = {
  '1001': { badge: '1호선', cardCls: 'subway-other-card', badgeCls: 'line-color-1001' },
  '1002': { badge: '2호선', cardCls: 'subway-other-card', badgeCls: 'line-color-1002' },
  '1003': { badge: '3호선', cardCls: 'subway-other-card', badgeCls: 'line-color-1003' },
  '1004': { badge: '4호선', cardCls: 'subway-other-card', badgeCls: 'line-color-1004' },
  '1005': { badge: '5호선', cardCls: 'subway-5-card',     badgeCls: 'line-color-1005' },
  '1006': { badge: '6호선', cardCls: 'subway-other-card', badgeCls: 'line-color-1006' },
  '1007': { badge: '7호선', cardCls: 'subway-other-card', badgeCls: 'line-color-1007' },
  '1008': { badge: '8호선', cardCls: 'subway-other-card', badgeCls: 'line-color-1008' },
  '1009': { badge: '9호선', cardCls: '',                  badgeCls: 'line-color-1009' },
  '1077': { badge: '신분당', cardCls: 'subway-other-card', badgeCls: 'line-color-1077' },
  '1065': { badge: '공항철도', cardCls: 'subway-other-card', badgeCls: 'line-color-1065' },
  '1063': { badge: '경의중앙', cardCls: 'subway-other-card', badgeCls: 'line-color-1063' },
  '1075': { badge: '수인분당', cardCls: 'subway-other-card', badgeCls: 'line-color-1075' },
  '1094': { badge: '신림선', cardCls: 'subway-other-card', badgeCls: 'line-color-1094' },
  '1092': { badge: '우이신설', cardCls: 'subway-other-card', badgeCls: 'line-color-1092' },
  '1093': { badge: '서해선', cardCls: 'subway-other-card', badgeCls: 'line-color-1093' },
  '1032': { badge: 'GTX-A', cardCls: 'subway-other-card', badgeCls: 'line-color-1032' }
};

const FAVORITE_SUBWAY_CARDS = [
  {
    key: 'fav_na_9_up',
    domId: 'fav-card-assembly',
    stationName: '국회의사당',
    subwayId: '1009',
    updnLine: '상행',
    title: '국회의사당역 9호선 [상행]',
    dirDesc: '여의도·신논현·중앙보훈병원 방면',
    defaultDest: '중앙보훈병원',
    wdScheduleKey: 'NA_9_UP_WD',
    weScheduleKey: 'NA_9_UP_WE',
    tabLabel: '9호선 국회의사당 [상행]'
  },
  {
    key: 'fav_na_9_dn',
    domId: '',
    stationName: '국회의사당',
    subwayId: '1009',
    updnLine: '하행',
    title: '국회의사당역 9호선 [하행]',
    dirDesc: '당산·김포공항·개화 방면',
    defaultDest: '개화',
    wdScheduleKey: 'NA_9_DN_WD',
    weScheduleKey: 'NA_9_DN_WE',
    tabLabel: '9호선 국회의사당 [하행]'
  },
  {
    key: 'fav_yd_9_up',
    domId: 'fav-card-yeouido-9',
    stationName: '여의도',
    subwayId: '1009',
    updnLine: '상행',
    title: '여의도역 9호선 [상행]',
    dirDesc: '동작·신논현·중앙보훈병원 방면 (일반·급행)',
    defaultDest: '중앙보훈병원',
    wdScheduleKey: 'YD_9_UP_WD',
    weScheduleKey: 'YD_9_UP_WE',
    tabLabel: '9호선 여의도 [상행]'
  },
  {
    key: 'fav_yd_9_dn',
    domId: '',
    stationName: '여의도',
    subwayId: '1009',
    updnLine: '하행',
    title: '여의도역 9호선 [하행]',
    dirDesc: '당산·김포공항·개화 방면 (일반·급행)',
    defaultDest: '개화',
    wdScheduleKey: 'YD_9_DN_WD',
    weScheduleKey: 'YD_9_DN_WE',
    tabLabel: '9호선 여의도 [하행]'
  },
  {
    key: 'fav_yd_5_up',
    domId: 'fav-card-yeouido-5',
    stationName: '여의도',
    subwayId: '1005',
    updnLine: '상행',
    title: '여의도역 5호선 [상행]',
    dirDesc: '영등포구청·까치산·방화 방면',
    defaultDest: '방화',
    wdScheduleKey: 'YD_5_UP_WD',
    weScheduleKey: 'YD_5_UP_WE',
    tabLabel: '5호선 여의도 [상행]'
  },
  {
    key: 'fav_yd_5_dn',
    domId: '',
    stationName: '여의도',
    subwayId: '1005',
    updnLine: '하행',
    title: '여의도역 5호선 [하행]',
    dirDesc: '공덕·광화문·하남검단산·마천 방면',
    defaultDest: '하남검단산',
    wdScheduleKey: 'YD_5_DN_WD',
    weScheduleKey: 'YD_5_DN_WE',
    tabLabel: '5호선 여의도 [하행]'
  }
];

class TransitManager {
  constructor() {
    this.subwayApiKey = '476a79484b6a6f6e3833504f4f6d4e';
    this.REFRESH_INTERVAL = 20;
    this.refreshCountdown = 20;
    this.isFetching = false;
    this.lastLoadedTimeStr = '';

    this.subwayCache = {
      '국회의사당': [],
      '여의도': []
    };

    // 카드별 모드 ('realtime' 기본 우선 | 'timetable' 수동 선택)
    this.cardSourceModes = {};
    this.activeTimetableKey = 'fav_na_9_up';
    this.customModalSchedule = null;

    this.initTimeFontBoost();
    this.initElements();
    this.initEvents();
    this.renderFavoritesBoard();
    this.loadAllData(false);
    this.startTicker();

    let lastResumeFetch = 0;
    const handleAppResume = () => {
      const now = Date.now();
      if (now - lastResumeFetch < 2500) return;
      lastResumeFetch = now;
      this.refreshCountdown = this.REFRESH_INTERVAL;
      this.loadAllData(false);
    };
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) handleAppResume();
    });
    window.addEventListener('pageshow', () => handleAppResume());
    window.addEventListener('focus', () => handleAppResume());
  }

  initElements() {
    this.widgetCard = document.getElementById('transitWidgetSection');
    this.cardsContainer = document.getElementById('transitCardsContainer');
    this.lastUpdatedEl = document.getElementById('lastUpdated');
    this.btnReloadTransit = document.getElementById('btnReloadTransit');
    this.btnHeaderReload = document.getElementById('btnHeaderReload');
  }

  initEvents() {
    if (this.btnReloadTransit) {
      this.btnReloadTransit.addEventListener('click', () => this.triggerManualRefresh(this.btnReloadTransit));
    }
    if (this.btnHeaderReload) {
      this.btnHeaderReload.addEventListener('click', () => this.triggerManualRefresh(this.btnHeaderReload));
    }
  }

  scrollToFavCard(cardId) {
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('fav-card-flash');
      setTimeout(() => el.classList.remove('fav-card-flash'), 900);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  getLineMeta(subwayId) {
    return SUBWAY_LINE_META[String(subwayId)] || {
      badge: '전철',
      cardCls: 'subway-other-card',
      badgeCls: 'line-color-1001'
    };
  }

  isKoreanHoliday(date) {
    if (typeof window !== 'undefined' && typeof window.isKoreanHoliday === 'function') {
      return window.isKoreanHoliday(date);
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const full = `${y}-${m}-${d}`;
    if (typeof window !== 'undefined' && window.KR_HOLIDAYS_MAP && window.KR_HOLIDAYS_MAP[full]) {
      return true;
    }
    return ['01-01', '03-01', '05-05', '06-06', '08-15', '10-03', '10-09', '12-25'].includes(`${m}-${d}`);
  }

  isWeekendOrHoliday(date = new Date()) {
    const day = date.getDay();
    return day === 0 || day === 6 || this.isKoreanHoliday(date);
  }

  // ========= 글씨 크기 조절 유틸리티 (스크린샷 동일 ＋ / ↺) =========
  initTimeFontBoost() {
    try {
      const saved = parseInt(localStorage.getItem('transit_time_font_boost') || '0', 10);
      const boost = (!isNaN(saved) && saved >= 0 && saved <= 10) ? saved : 0;
      document.documentElement.style.setProperty('--time-font-boost', `${boost}px`);
    } catch (e) {}
  }

  getFontBoostForKey(key) {
    if (!key) return 0;
    try {
      const v = parseInt(localStorage.getItem('transit_time_boost_' + key) || '0', 10);
      return (!isNaN(v) && v >= 0 && v <= 10) ? v : 0;
    } catch (e) {
      return 0;
    }
  }

  increaseTimeFontSize(e, customKey = null) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const maxBoost = 10;
    const step = 2;

    const targetEl = e && e.target ? e.target.closest('[data-zoom-key]') : null;
    const key = customKey || (targetEl ? targetEl.getAttribute('data-zoom-key') : null);
    const zoomEl = key ? (document.querySelector(`[data-zoom-key="${key}"]`) || targetEl) : targetEl;
    const targetName = zoomEl ? (zoomEl.getAttribute('data-zoom-name') || '') : '';

    if (key) {
      const current = this.getFontBoostForKey(key);
      const next = current + step;
      if (next > maxBoost) {
        this.showTimeZoomToast(`${targetName ? targetName + ' ' : ''}도착시간 글씨가 최대 크기입니다`);
        return;
      }
      try {
        localStorage.setItem('transit_time_boost_' + key, String(next));
      } catch (err) {}
      document.querySelectorAll(`[data-zoom-key="${key}"]`).forEach(el => {
        el.style.setProperty('--time-font-boost', `${next}px`);
      });
      this.showTimeZoomToast(`${targetName ? targetName + ' ' : ''}도착시간 글씨 확대 (+${next}px)`);
      return;
    }

    let current = parseInt(localStorage.getItem('transit_time_font_boost') || '0', 10);
    if (isNaN(current) || current < 0) current = 0;
    const next = current + step;
    if (next > maxBoost) {
      this.showTimeZoomToast('도착시간 글씨가 최대 크기입니다');
      return;
    }
    this.setTimeFontBoost(next);
    this.showTimeZoomToast(`도착시간 글씨 확대 (+${next}px)`);
  }

  resetTimeFontSize(e, customKey = null) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const targetEl = e && e.target ? e.target.closest('[data-zoom-key]') : null;
    const key = customKey || (targetEl ? targetEl.getAttribute('data-zoom-key') : null);
    const zoomEl = key ? (document.querySelector(`[data-zoom-key="${key}"]`) || targetEl) : targetEl;
    const targetName = zoomEl ? (zoomEl.getAttribute('data-zoom-name') || '') : '';

    if (key) {
      try {
        localStorage.removeItem('transit_time_boost_' + key);
      } catch (err) {}
      document.querySelectorAll(`[data-zoom-key="${key}"]`).forEach(el => {
        el.style.setProperty('--time-font-boost', '0px');
      });
      this.showTimeZoomToast(`${targetName ? targetName + ' ' : ''}도착시간 원래대로 복귀`);
      return;
    }

    this.setTimeFontBoost(0);
    this.showTimeZoomToast('도착시간 글씨 기본 크기로 복귀');
  }

  setTimeFontBoost(boostPx) {
    try {
      localStorage.setItem('transit_time_font_boost', String(boostPx));
    } catch (e) {}
    document.documentElement.style.setProperty('--time-font-boost', `${boostPx}px`);
  }

  showTimeZoomToast(msg) {
    let toast = document.getElementById('transit-zoom-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'transit-zoom-toast';
      toast.className = 'transit-zoom-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this._zoomToastTimer);
    this._zoomToastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 1400);
  }

  // ========= 시간 포맷터 & 차량번호 강조 포맷터 =========
  formatSec(sec, walkSec = 300) {
    let catchClass = '';
    if (walkSec !== null && !isNaN(walkSec)) {
      catchClass = (sec >= walkSec) ? 'transit-catchable' : 'transit-uncatchable';
    }
    if (sec <= 0) return `<span class="transit-time-arrive transit-time-arrive-big ${catchClass}">⚡ 곧 도착</span>`;
    if (sec < 60) return `<span class="transit-time-imminent ${catchClass}">${sec}초 후</span>`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const sStr = s < 10 ? '0' + s : s;
    return `<span class="${catchClass}"><span class="transit-time-min">${m}분</span> <span class="transit-time-sec">${sStr}초 후</span></span>`;
  }

  formatPlateWithBigDigits(plate, icon = '🚇') {
    if (!plate) return '';
    const str = String(plate).trim();
    const m = str.match(/^(.*?)(\d{4})$/);
    if (m) {
      const prefix = m[1] ? `${m[1]} ` : '';
      return `${icon}${prefix}<strong class="plate-digit-highlight" style="font-size:14.5px; font-weight:900; letter-spacing:0.4px; margin-left:2px;">${m[2]}</strong>`;
    }
    return `${icon} ${str}`;
  }

  // ========= 네트워크 공통 Fetch =========
  async fetchJsonWithFallback(httpUrl, timeoutMs = 4500) {
    const isHttpsPage = (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:');

    if (!isHttpsPage) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(httpUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) return JSON.parse(text);
        }
      } catch (e) {}
    }

    const proxies = [
      u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
    ];

    for (const makeProxy of proxies) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 7500);
        const res = await fetch(makeProxy(httpUrl), { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) return JSON.parse(text);
        }
      } catch (e) {}
    }

    if (isHttpsPage) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(httpUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) return await res.json();
      } catch (e) {}
    }
    return null;
  }

  async fetchSubwayStation(stationName) {
    const cleanName = String(stationName).replace(/역$/, '').trim();
    const url = `http://swopenAPI.seoul.go.kr/api/subway/${this.subwayApiKey}/json/realtimeStationArrival/0/40/${encodeURIComponent(cleanName)}`;
    const data = await this.fetchJsonWithFallback(url, 4500);
    if (data && Array.isArray(data.realtimeArrivalList)) {
      this.subwayCache[cleanName] = data.realtimeArrivalList;
      return data.realtimeArrivalList;
    }
    return this.subwayCache[cleanName] || [];
  }

  fetchAllData(manual = false) {
    return this.loadAllData(manual);
  }

  async triggerManualRefresh(btnEl) {
    this.refreshCountdown = this.REFRESH_INTERVAL;
    if (btnEl) btnEl.style.opacity = '0.65';
    await this.loadAllData(false);
    if (btnEl) btnEl.style.opacity = '1';
    this.showTimeZoomToast('🔄 실시간 지하철 도착정보를 갱신했습니다');
  }

  async loadAllData(showLoading = false) {
    if (this.isFetching) return;
    this.isFetching = true;

    if (showLoading && this.cardsContainer && !this.cardsContainer.innerHTML.trim()) {
      this.cardsContainer.innerHTML = `
        <div class="fav-loading-card">
          <div style="font-size:24px; margin-bottom:6px;">🔄</div>
          <div style="font-size:15px; font-weight:800;">국회의사당역 · 여의도역 실시간 열차 도착정보 수신 중...</div>
        </div>
      `;
    }

    try {
      await Promise.allSettled([
        this.fetchSubwayStation('국회의사당'),
        this.fetchSubwayStation('여의도')
      ]);

      const now = new Date();
      this.lastLoadedTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      this.renderFavoritesBoard();
      this.updateFooterStatus();
    } catch (e) {
      console.error('[TransitManager] loadAllData 오류:', e);
    } finally {
      this.isFetching = false;
    }
  }

  // ========= 실시간 도착 데이터 파서 (일반/급행 + 차량번호 + 위치 + 정밀 초 계산) =========
  parseLiveSubwayDirection(rawList, subwayId, updnLine, defaultDest = '') {
    const nowMs = Date.now();
    const filtered = (rawList || []).filter(item => {
      if (subwayId && String(item.subwayId) !== String(subwayId)) return false;
      const lineDir = String(item.updnLine || '').trim();
      if (updnLine === '상행' || updnLine === '내선') {
        return lineDir.includes('상행') || lineDir.includes('내선');
      }
      if (updnLine === '하행' || updnLine === '외선') {
        return lineDir.includes('하행') || lineDir.includes('외선');
      }
      return lineDir === updnLine;
    });

    if (filtered.length === 0) return { nextTrain: null, next2Train: null, allTrains: [] };

    const parsed = filtered.map((item, idx) => {
      const statusMsg = String(item.arvlMsg2 || '').trim();
      const curStation = String(item.arvlMsg3 || '').trim();
      const arvlCd = String(item.arvlCd || '');
      const rawSeconds = parseInt(item.barvlDt || '0', 10);
      const trainNo = String(item.btrainNo || '').trim();
      const dest = String(item.bstatnNm || defaultDest || '').replace(/행$/, '').trim();
      const trainStatus = String(item.btrainSttus || '').trim();
      const isExpress = trainStatus.includes('급행') || String(item.trainLineNm || '').includes('급행');

      const isArrivingSoon = (arvlCd === '0' || arvlCd === '1') ||
        ((statusMsg.includes('도착') || statusMsg.includes('진입')) && !statusMsg.includes('전역')) ||
        (rawSeconds > 0 && rawSeconds <= 35);

      let sec = (!isNaN(rawSeconds) && rawSeconds > 0) ? rawSeconds : 0;
      if (isArrivingSoon && sec <= 0) {
        sec = (arvlCd === '1' || statusMsg.includes('도착')) ? 15 : 25;
      } else if (sec <= 0) {
        const minSecMatch = statusMsg.match(/(\d+)\s*분(?:\s*(\d+)\s*초)?/);
        const stopsMatch = statusMsg.match(/\[?(\d+)\]?\s*번째\s*전역/);
        if (minSecMatch) {
          sec = parseInt(minSecMatch[1], 10) * 60 + (minSecMatch[2] ? parseInt(minSecMatch[2], 10) : 0);
        } else if (arvlCd === '3' || statusMsg.includes('전역 출발')) {
          sec = 55;
        } else if (arvlCd === '5' || statusMsg.includes('전역 도착')) {
          sec = 75;
        } else if (arvlCd === '4' || statusMsg.includes('전역 진입')) {
          sec = 95;
        } else if (stopsMatch) {
          sec = Math.max(60, parseInt(stopsMatch[1], 10) * 115);
        } else {
          sec = 90 + idx * 120;
        }
      }

      const targetTime = nowMs + sec * 1000;
      const dt = new Date(targetTime);
      const clockStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      const curLoc = curStation ? `[${curStation}]` : '';

      return {
        sec,
        rawSec: rawSeconds,
        trainNo,
        destName: dest,
        isExpress,
        curLocation: curLoc,
        statusMsg: statusMsg || '실시간 운행 중',
        isArrivingSoon,
        targetTime,
        clockStr,
        isLive: true
      };
    });

    // 열차번호 중복 제거 후 도착순 정렬
    const seen = new Set();
    const deduped = [];
    parsed.sort((a, b) => a.sec - b.sec).forEach(t => {
      const key = t.trainNo ? `${t.trainNo}_${t.destName}` : `${t.sec}_${t.statusMsg}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(t);
      }
    });

    return {
      nextTrain: deduped[0] || null,
      next2Train: deduped[1] || null,
      allTrains: deduped
    };
  }

  // ========= 공식 시간표 파서 (컴팩트 토큰 -> 다음/다다음 열차 산출) =========
  parseScheduleToken(token, defaultDest = '') {
    if (typeof token === 'number') {
      return { m: token, isExpress: false, dest: defaultDest };
    }
    const str = String(token);
    const [left, customDest] = str.split(':');
    const isExpress = left.endsWith('E');
    const m = parseInt(left.replace('E', ''), 10);
    return {
      m: isNaN(m) ? 0 : m,
      isExpress,
      dest: customDest || defaultDest
    };
  }

  getUpcomingScheduledTrains(scheduleObj, defaultDest = '', now = new Date(), count = 2, afterTimeMs = null) {
    if (!scheduleObj) return [];
    const rawH = now.getHours();
    const currentH = (rawH === 0) ? 24 : rawH;
    const currentMinutes = currentH * 60 + now.getMinutes();
    const currentSec = now.getSeconds();
    const nowMs = now.getTime();

    const results = [];
    const hours = Object.keys(scheduleObj).map(Number).sort((a, b) => a - b);

    for (const h of hours) {
      const list = scheduleObj[h] || [];
      for (const tok of list) {
        const { m, isExpress, dest } = this.parseScheduleToken(tok, defaultDest);
        const trainMin = h * 60 + m;
        const diffSec = (trainMin - currentMinutes) * 60 - currentSec;
        if (diffSec >= -25) {
          const targetTime = nowMs + Math.max(0, diffSec) * 1000;
          if (afterTimeMs && targetTime <= afterTimeMs + 35000) continue;

          const displayH = (h >= 24) ? String(h - 24).padStart(2, '0') : String(h).padStart(2, '0');
          const displayM = String(m).padStart(2, '0');
          results.push({
            departureTime: `${displayH}:${displayM}`,
            destName: dest || defaultDest,
            isExpress,
            sec: Math.max(0, diffSec),
            targetTime,
            isFirstTrain: false
          });
          if (results.length >= count) break;
        }
      }
      if (results.length >= count) break;
    }

    // 심야 운행 종료 후 첫차 안내
    if (results.length === 0 && hours.length > 0) {
      const firstH = hours[0];
      const firstList = scheduleObj[firstH] || [];
      for (let i = 0; i < Math.min(count, firstList.length); i++) {
        const { m, isExpress, dest } = this.parseScheduleToken(firstList[i], defaultDest);
        const displayH = String(firstH).padStart(2, '0');
        const displayM = String(m).padStart(2, '0');
        const curTotalMin = rawH * 60 + now.getMinutes();
        const firstMin = (rawH >= 5 ? (firstH + 24) : firstH) * 60 + m;
        const diffSec = Math.max(60, (firstMin - curTotalMin) * 60 - currentSec);
        results.push({
          departureTime: `${displayH}:${displayM}`,
          destName: dest || defaultDest,
          isExpress,
          sec: diffSec,
          targetTime: nowMs + diffSec * 1000,
          isFirstTrain: true
        });
      }
    }

    return results;
  }

  // ========= 카드별 실시간 <-> 시간표 모드 즉시 전환 =========
  setCardSourceMode(cardKey, mode) {
    this.cardSourceModes[cardKey] = (mode === 'timetable') ? 'timetable' : 'realtime';
    this.renderFavoritesBoard();
    if (window.subwayLookup && typeof window.subwayLookup.rerenderCurrent === 'function') {
      window.subwayLookup.rerenderCurrent();
    }
  }

  // ========= 공통 BIT 지하철 전광판 카드 렌더러 (즐겨찾기 & 지하철 검색 공용) =========
  renderSubwayBitCardHtml(cfg) {
    const {
      key,
      domId = '',
      stationName,
      subwayId,
      updnLine,
      title,
      dirDesc,
      defaultDest = '',
      rawArrivals = [],
      scheduleObj = null,
      onOpenTimetableJs = ''
    } = cfg;

    const now = new Date();
    const isHoliday = this.isWeekendOrHoliday(now);
    const dayTypeLabel = isHoliday ? '주말·공휴일 시간표' : '평일 시간표';
    const lineMeta = this.getLineMeta(subwayId);

    const userMode = this.cardSourceModes[key] || 'realtime';
    const isUserTimetable = (userMode === 'timetable');
    const walkSec = 300;

    // 1순위: 서울시 실시간 도착정보 파싱
    const liveData = this.parseLiveSubwayDirection(rawArrivals, subwayId, updnLine, defaultDest);
    const t1 = liveData.nextTrain;
    const t2 = liveData.next2Train;
    const hasLive = !!t1;

    // 실시간 우선 원칙: 사용자가 '시간표'를 누르지 않았어도 실시간 열차가 없으면 자동으로 공식 시간표 적용!
    const useTimetable = isUserTimetable || !hasLive;
    const isAutoFallback = (!isUserTimetable && !hasLive && !!scheduleObj);

    const schedTrains = scheduleObj
      ? this.getUpcomingScheduledTrains(scheduleObj, defaultDest, now, 3)
      : [];

    let sub1Html = '';
    let sub1Sub = '';
    let sub1Badge = '';
    let sub2Html = '';
    let sub2Sub = '';
    let sub2Badge = '';

    if (!useTimetable && t1) {
      // [실시간 모드 - 1순위]
      const expTag1 = t1.isExpress ? `<span class="badge-train-express">⚡급행</span>` : '';
      sub1Badge = t1.trainNo
        ? `<span class="badge-bus-plate badge-train-plate">${this.formatPlateWithBigDigits(t1.trainNo, '🚇')}</span>${expTag1}`
        : expTag1;

      if (t1.isArrivingSoon || t1.sec <= 35) {
        sub1Html = `<span class="transit-time-arrive transit-time-arrive-big transit-uncatchable">⚡ 곧 도착</span>`;
      } else {
        sub1Html = `<span class="live-countdown" data-target-time="${t1.targetTime}" data-walk-sec="${walkSec}">${this.formatSec(t1.sec, walkSec)}</span>`;
      }

      sub1Sub = `
        <span class="transit-sub-pos">위치: <b>${this.escapeHtml((t1.curLocation ? t1.curLocation + ' ' : '') + t1.statusMsg)}</b></span>
        <span class="transit-sub-time"><span class="transit-arr-label">도착 예정:</span> <b class="transit-clock-time subway-clock-time">${t1.clockStr}</b></span>
      `;

      if (t2) {
        const expTag2 = t2.isExpress ? `<span class="badge-train-express">⚡급행</span>` : '';
        sub2Badge = t2.trainNo
          ? `<span class="badge-bus-plate badge-train-plate">${this.formatPlateWithBigDigits(t2.trainNo, '🚇')}</span>${expTag2}`
          : expTag2;

        if (t2.isArrivingSoon || t2.sec <= 35) {
          sub2Html = `<span class="transit-time-arrive transit-time-arrive-big transit-uncatchable">⚡ 곧 도착</span>`;
        } else {
          sub2Html = `<span class="live-countdown next2-countdown" data-target-time="${t2.targetTime}" data-walk-sec="${walkSec}">${this.formatSec(t2.sec, walkSec)}</span>`;
        }
        sub2Sub = `
          <span class="transit-sub-pos">위치: <b>${this.escapeHtml((t2.curLocation ? t2.curLocation + ' ' : '') + t2.statusMsg)}</b></span>
          <span class="transit-sub-time"><span class="transit-arr-label">도착 예정:</span> <b class="transit-clock-time subway-clock-time">${t2.clockStr}</b></span>
        `;
      } else if (scheduleObj) {
        // 실시간 다다음 열차가 아직 수신 전이면 공식 시간표에서 차기 열차 자동 보강
        const afterT1 = this.getUpcomingScheduledTrains(scheduleObj, defaultDest, now, 1, t1.targetTime);
        if (afterT1.length > 0) {
          const st2 = afterT1[0];
          const expTag2 = st2.isExpress ? `<span class="badge-train-express">⚡급행</span>` : '';
          sub2Badge = `<span class="badge-bus-plate" style="background:#fef3c7; color:#92400e; border-color:#fde68a;">🗓️시간표</span>${expTag2}`;
          sub2Html = `<span class="live-countdown next2-countdown" data-target-time="${st2.targetTime}" data-walk-sec="${walkSec}">${this.formatSec(st2.sec, walkSec)}</span>`;
          sub2Sub = `
            <span class="transit-sub-pos">방면: <b>${this.escapeHtml(st2.destName)}행 (시간표 차기)</b></span>
            <span class="transit-sub-time"><span class="transit-arr-label">출발 시각:</span> <b class="transit-clock-time subway-clock-time">${st2.departureTime}</b></span>
          `;
        } else {
          sub2Html = `<span style="color:#64748b; font-size:13px; font-weight:700;">차기 배차 대기 중</span>`;
          sub2Sub = `<span class="transit-sub-pos">안내: <b>실시간 후속 열차 위치 확인 중</b></span>`;
        }
      } else {
        sub2Html = `<span style="color:#64748b; font-size:13px; font-weight:700;">차기 배차 대기 중</span>`;
        sub2Sub = `<span class="transit-sub-pos">안내: <b>실시간 후속 열차 위치 확인 중</b></span>`;
      }
    } else if (schedTrains.length > 0) {
      // [시간표 모드 또는 실시간 미수신 자동 폴백]
      const st1 = schedTrains[0];
      const expTag1 = st1.isExpress ? `<span class="badge-train-express">⚡급행</span>` : '';
      sub1Badge = `<span class="badge-bus-plate" style="background:#fef3c7; color:#92400e; border-color:#fde68a;">${isAutoFallback ? '🗓️자동시간표' : '🗓️시간표'}</span>${expTag1}`;

      if (st1.isFirstTrain) {
        sub1Html = `<span style="color:#0284c7; font-size:15px; font-weight:800;">첫차 ${st1.departureTime}</span>`;
        sub1Sub = `<span class="transit-sub-pos">방면: <b>${this.escapeHtml(st1.destName)}행 [${dayTypeLabel}]</b></span><span class="transit-sub-time"><span class="transit-arr-label">첫차 시각:</span> <b class="transit-clock-time subway-clock-time">${st1.departureTime}</b></span>`;
      } else if (st1.sec <= 30) {
        sub1Html = `<span class="transit-time-arrive transit-time-arrive-big transit-uncatchable">⚡ 곧 도착</span>`;
        sub1Sub = `<span class="transit-sub-pos">방면: <b>${this.escapeHtml(st1.destName)}행 [${dayTypeLabel}]</b></span><span class="transit-sub-time"><span class="transit-arr-label">출발 시각:</span> <b class="transit-clock-time subway-clock-time">${st1.departureTime}</b></span>`;
      } else {
        sub1Html = `<span class="live-countdown" data-target-time="${st1.targetTime}" data-walk-sec="${walkSec}">${this.formatSec(st1.sec, walkSec)}</span>`;
        sub1Sub = `<span class="transit-sub-pos">방면: <b>${this.escapeHtml(st1.destName)}행 [${dayTypeLabel}]</b></span><span class="transit-sub-time"><span class="transit-arr-label">출발 시각:</span> <b class="transit-clock-time subway-clock-time">${st1.departureTime}</b></span>`;
      }

      if (schedTrains.length > 1) {
        const st2 = schedTrains[1];
        const expTag2 = st2.isExpress ? `<span class="badge-train-express">⚡급행</span>` : '';
        sub2Badge = `<span class="badge-bus-plate" style="background:#fef3c7; color:#92400e; border-color:#fde68a;">🗓️시간표</span>${expTag2}`;
        sub2Html = `<span class="live-countdown next2-countdown" data-target-time="${st2.targetTime}" data-walk-sec="${walkSec}">${this.formatSec(st2.sec, walkSec)}</span>`;
        sub2Sub = `<span class="transit-sub-pos">방면: <b>${this.escapeHtml(st2.destName)}행 [${dayTypeLabel}]</b></span><span class="transit-sub-time"><span class="transit-arr-label">출발 시각:</span> <b class="transit-clock-time subway-clock-time">${st2.departureTime}</b></span>`;
      } else {
        sub2Html = `<span style="color:#94a3b8; font-size:13px; font-weight:700;">막차 이후 종료</span>`;
        sub2Sub = `<span class="transit-sub-pos">상태: <b>금일 추가 열차 없음</b></span>`;
      }
    } else {
      sub1Html = `<span style="color:#64748b; font-size:14px; font-weight:800;">실시간 도착 대기 중</span>`;
      sub1Sub = `<span class="transit-sub-pos">상태: <b>열차 위치 정보 수신 대기 중</b></span>`;
      sub2Html = `<span style="color:#94a3b8; font-size:13px; font-weight:700;">정보 확인 중</span>`;
      sub2Sub = `<span class="transit-sub-pos">상태: <b>잠시 후 자동 갱신됩니다</b></span>`;
    }

    const boostPx = this.getFontBoostForKey(key);
    const styleBoost = boostPx > 0 ? `--time-font-boost: ${boostPx}px;` : '';

    let footerTipHtml = '';
    if (isUserTimetable) {
      footerTipHtml = `💡 <b>[시간표 모드]</b> 공식 역사 고정 시간표(${dayTypeLabel}) 기준으로 계산 중입니다. 실시간 위치는 상단 <b>[🔴 서울시 실시간]</b>을 누르세요.`;
    } else if (isAutoFallback) {
      footerTipHtml = `💡 <b>[자동 시간표 적용]</b> 현재 실시간 도착 열차가 없어 공식 <b>[${dayTypeLabel}]</b> 기준으로 자동 전환되었습니다.`;
    } else {
      footerTipHtml = `💡 <b>[실시간 모드]</b> 서울시 공식 지하철 공공API로 열차번호 및 실시간 위치를 연동합니다. 시간표 시각으로 계산하시려면 상단 <b>[🗓️ 시간표]</b>를 누르세요.`;
    }

    const popupAttr = onOpenTimetableJs || `window.transitManager && window.transitManager.openTimetableModal('${key}')`;

    return `
      <div class="bit-board-card subway-9-card ${lineMeta.cardCls}" ${domId ? `id="${domId}"` : ''} data-zoom-key="${key}" data-zoom-name="${this.escapeHtml(title)}" style="${styleBoost}">
        <div class="bit-header-row">
          <div class="bit-title-group" style="justify-content:space-between; width:100%;">
            <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
              <span class="badge-seoul-subway ${lineMeta.badgeCls}">${this.escapeHtml(lineMeta.badge)}</span>
              <strong class="bit-station-name">${this.escapeHtml(title)}</strong>
            </div>
            <button type="button" class="btn-card-hide-x" onclick="window.transitManager && window.transitManager.hideSubwayCard('${key}', event)" title="이 상·하행 노선 숨기기 (전체조회 버튼으로 복원 가능)" aria-label="노선 숨기기">✕</button>
          </div>
          <div class="subway-source-toggle-group">
            <button type="button" class="subway-mode-btn ${!isUserTimetable ? 'active-realtime' : ''}"
              onclick="window.transitManager && window.transitManager.setCardSourceMode('${key}', 'realtime')">
              <span class="bit-status-dot" style="${!isUserTimetable && hasLive ? 'background:#ef4444;' : 'background:#94a3b8; animation:none;'}"></span>
              <span>서울시 실시간</span>
            </button>
            <button type="button" class="subway-mode-btn ${isUserTimetable ? 'active-timetable' : ''}"
              onclick="window.transitManager && window.transitManager.setCardSourceMode('${key}', 'timetable')">
              <span>🗓️ 시간표</span>
            </button>
            <button type="button" class="btn-timetable-popup" onclick="${popupAttr}" title="전체 시간표 보기">
              <span>📋 전체</span>
            </button>
            <div class="bus-time-zoom-ctrl">
              <button type="button" class="btn-time-zoom-btn btn-time-zoom-plus" onclick="window.transitManager && window.transitManager.increaseTimeFontSize(event, '${key}')" title="이 역 도착시간 글씨 확대" aria-label="도착시간 확대">
                <span class="zoom-btn-icon">＋</span>
              </button>
              <button type="button" class="btn-time-zoom-btn btn-time-zoom-reset" onclick="window.transitManager && window.transitManager.resetTimeFontSize(event, '${key}')" title="이 역 도착시간 원래대로" aria-label="도착시간 초기화">
                <span class="zoom-btn-icon">↺</span>
              </button>
            </div>
          </div>
        </div>

        <div class="bit-desc-row">
          <span>방면: <b>${this.escapeHtml(dirDesc)}</b></span>
          <span class="bit-dest-pill">${this.escapeHtml(stationName)}역 탑승</span>
        </div>

        <div class="bit-route-list" style="margin-top:4px;">
          <div class="next-transit-box">
            <div class="next-transit-header">
              <span class="next-tag-red" style="display:inline-flex; align-items:center; gap:5px; flex-wrap:wrap;">🔴 다음 열차 ${sub1Badge}</span>
              <span class="next-time-big">${sub1Html}</span>
            </div>
            <div class="next-transit-sub">${sub1Sub}</div>
          </div>

          <div class="next-transit-box next2-transit-box">
            <div class="next-transit-header">
              <span class="next2-tag-blue" style="display:inline-flex; align-items:center; gap:5px; flex-wrap:wrap;">🔵 다다음 열차 ${sub2Badge}</span>
              <span class="next-time-big">${sub2Html}</span>
            </div>
            <div class="next-transit-sub">${sub2Sub}</div>
          </div>
        </div>

        <div class="bit-footer-info" style="margin-top:8px;">
          <span>${footerTipHtml}</span>
        </div>
      </div>
    `;
  }

  getHiddenSubwayCards() {
    try {
      const raw = localStorage.getItem('realtime_hidden_subway_cards');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  saveHiddenSubwayCards(list) {
    try {
      localStorage.setItem('realtime_hidden_subway_cards', JSON.stringify(list));
    } catch (e) {}
  }

  isSubwayCardHidden(cardKey) {
    return this.getHiddenSubwayCards().includes(cardKey);
  }

  hideSubwayCard(cardKey, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const list = this.getHiddenSubwayCards();
    if (!list.includes(cardKey)) {
      list.push(cardKey);
      this.saveHiddenSubwayCards(list);
    }
    this.renderFavoritesBoard();
    if (window.subwayLookup && typeof window.subwayLookup.rerenderCurrent === 'function') {
      window.subwayLookup.rerenderCurrent();
    }
    this.showTimeZoomToast('노선을 숨겼습니다 ([📋 전체조회]로 다시 표시)');
  }

  showAllSubwayFavorites() {
    const remaining = this.getHiddenSubwayCards().filter(k => !String(k).startsWith('fav_'));
    this.saveHiddenSubwayCards(remaining);
    this.renderFavoritesBoard();
    this.showTimeZoomToast('🚇 모든 즐겨찾기 지하철 상·하행 노선이 표시됩니다');
  }

  clearSearchHiddenSubwayCards() {
    const remaining = this.getHiddenSubwayCards().filter(k => String(k).startsWith('fav_'));
    this.saveHiddenSubwayCards(remaining);
  }

  renderFavoritesBoard() {
    if (!this.cardsContainer) return;
    const isHoliday = this.isWeekendOrHoliday(new Date());
    const hiddenSet = new Set(this.getHiddenSubwayCards());

    const visibleCards = FAVORITE_SUBWAY_CARDS.filter(card => !hiddenSet.has(card.key));
    const hiddenFavCount = FAVORITE_SUBWAY_CARDS.length - visibleCards.length;

    const btnAll = document.getElementById('btnFavSubwayShowAll');
    if (btnAll) {
      btnAll.textContent = hiddenFavCount > 0 ? `📋 전체조회 (${hiddenFavCount}개 숨김)` : '📋 전체조회';
      btnAll.classList.toggle('has-hidden', hiddenFavCount > 0);
    }

    if (visibleCards.length === 0) {
      this.cardsContainer.innerHTML = `
        <div class="fav-loading-card">
          <div style="font-size:24px; margin-bottom:6px;">🚇</div>
          <div style="font-size:14.5px; font-weight:800; margin-bottom:10px;">모든 지하철 상·하행 카드가 숨김 상태입니다.</div>
          <button type="button" class="btn-show-all-pill has-hidden" onclick="window.transitManager && window.transitManager.showAllSubwayFavorites()">📋 전체조회 (모든 지하철 노선 다시 보기)</button>
        </div>
      `;
      return;
    }

    const cardsHtml = visibleCards.map(card => {
      const rawArrivals = this.subwayCache[card.stationName] || [];
      const schedKey = isHoliday ? card.weScheduleKey : card.wdScheduleKey;
      const scheduleObj = OFFICIAL_SUBWAY_TIMETABLES[schedKey] || null;

      return this.renderSubwayBitCardHtml({
        ...card,
        rawArrivals,
        scheduleObj
      });
    }).join('');

    this.cardsContainer.innerHTML = cardsHtml;
  }

  // ========= 전체 시간표 모달 (즐겨찾기 6개 방향 탭 + 검색 역사 동적 시간표 공용) =========
  ensureTimetableModal() {
    if (document.getElementById('transitTimetableModal')) return;

    const modalHtml = `
      <div class="modal-overlay" id="transitTimetableModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.68); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); z-index:99999; justify-content:center; align-items:center; padding:14px;">
        <div class="modal-container" style="background:#ffffff; width:100%; max-width:460px; max-height:88vh; border-radius:20px; box-shadow:0 24px 48px rgba(0,0,0,0.3); display:flex; flex-direction:column; overflow:hidden; border:1px solid #e2e8f0;">
          <div class="modal-header" style="background:linear-gradient(135deg, #0f172a, #1e293b); color:#ffffff; padding:14px 16px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:7px;">
              <span style="font-size:17px;">🗓️</span>
              <strong id="ttModalHeaderTitle" style="font-size:15.5px; font-weight:800;">지하철 공식 운행 시간표</strong>
            </div>
            <button type="button" class="modal-close-btn" onclick="window.transitManager && window.transitManager.closeTimetableModal()" style="background:rgba(255,255,255,0.16); border:none; color:#ffffff; font-size:16px; width:30px; height:30px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
          </div>

          <div style="display:flex; background:#f1f5f9; border-bottom:1px solid #cbd5e1; padding:6px 8px; gap:5px; overflow-x:auto;" id="ttTabContainer"></div>

          <div class="modal-body" id="ttBodyContainer" style="padding:14px; overflow-y:auto; flex:1; font-size:13px; color:#334155;"></div>

          <div class="modal-footer" style="padding:10px 14px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11.5px; color:#64748b; font-weight:700;">💡 현재 시각 시간대는 노란색으로 강조됩니다.</span>
            <button type="button" class="btn-primary" onclick="window.transitManager && window.transitManager.closeTimetableModal()" style="background:#0284c7; color:#ffffff; border:none; padding:8px 18px; border-radius:9px; font-weight:800; cursor:pointer; font-size:13px;">닫기</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('transitTimetableModal');
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) this.closeTimetableModal();
      });
    }
  }

  openTimetableModal(cardKey = 'fav_na_9_up') {
    this.customModalSchedule = null;
    this.activeTimetableKey = cardKey;
    this.ensureTimetableModal();
    this.renderTimetableModal();
    const modal = document.getElementById('transitTimetableModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  openCustomTimetableModal(title, dirDesc, scheduleObj, defaultDest = '') {
    this.customModalSchedule = { title, dirDesc, scheduleObj, defaultDest };
    this.ensureTimetableModal();
    this.renderTimetableModal();
    const modal = document.getElementById('transitTimetableModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  closeTimetableModal() {
    const modal = document.getElementById('transitTimetableModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  switchTimetableTab(cardKey) {
    this.customModalSchedule = null;
    this.activeTimetableKey = cardKey;
    this.renderTimetableModal();
  }

  renderScheduleHoursHtml(title, dirDesc, scheduleObj, defaultDest, isHoliday) {
    if (!scheduleObj || Object.keys(scheduleObj).length === 0) {
      return `<div style="padding:28px 14px; text-align:center; color:#64748b; font-weight:700;">공식 시간표 데이터가 없습니다.</div>`;
    }
    const curH = new Date().getHours();
    const hours = Object.keys(scheduleObj).map(Number).sort((a, b) => a - b);

    return `
      <div style="margin-bottom:10px; padding:10px 12px; background:#eff6ff; border-radius:10px; border:1px solid #bfdbfe; font-size:12.5px; color:#1e40af; line-height:1.45;">
        <strong style="font-size:14px;">${this.escapeHtml(title)}</strong><br>
        <span>방면: ${this.escapeHtml(dirDesc)}</span><br>
        <span style="font-size:11.5px; color:#2563eb; font-weight:800;">운행 구분: ${isHoliday ? '🌴 주말·공휴일 공식 시간표' : '🗓️ 평일 공식 시간표'} (⚡는 급행열차)</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${hours.map(h => {
          const list = scheduleObj[h] || [];
          const isCurHour = (h === curH || (h === 24 && curH === 0));
          const dispH = h >= 24 ? String(h - 24).padStart(2, '0') : String(h).padStart(2, '0');
          return `
            <div style="display:flex; align-items:flex-start; padding:6px 9px; border-radius:8px; background:${isCurHour ? '#fef3c7' : '#f8fafc'}; border:1px solid ${isCurHour ? '#f59e0b' : '#e2e8f0'};">
              <span style="width:46px; flex-shrink:0; font-weight:900; color:${isCurHour ? '#b45309' : '#0f172a'}; font-size:13px; padding-top:2px;">${dispH}시</span>
              <div style="display:flex; flex-wrap:wrap; gap:4px; flex:1;">
                ${list.map(tok => {
                  const p = this.parseScheduleToken(tok, defaultDest);
                  const expStyle = p.isExpress
                    ? 'background:#fee2e2; border-color:#fca5a5; color:#991b1b;'
                    : `background:#ffffff; border-color:${isCurHour ? '#f59e0b' : '#cbd5e1'}; color:#1e293b;`;
                  const subDest = (p.dest && p.dest !== defaultDest) ? `<span style="font-size:10px; opacity:0.85;">(${this.escapeHtml(p.dest)})</span>` : '';
                  return `
                    <span style="padding:2px 6px; border-radius:5px; border:1px solid; font-weight:800; font-size:11.5px; ${expStyle}">
                      ${p.isExpress ? '⚡' : ''}${String(p.m).padStart(2, '0')}분${subDest}
                    </span>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderTimetableModal() {
    const tabContainer = document.getElementById('ttTabContainer');
    const bodyContainer = document.getElementById('ttBodyContainer');
    if (!tabContainer || !bodyContainer) return;

    const isHoliday = this.isWeekendOrHoliday(new Date());

    if (this.customModalSchedule) {
      tabContainer.style.display = 'none';
      const c = this.customModalSchedule;
      bodyContainer.innerHTML = this.renderScheduleHoursHtml(c.title, c.dirDesc, c.scheduleObj, c.defaultDest, isHoliday);
      return;
    }

    tabContainer.style.display = 'flex';
    tabContainer.innerHTML = FAVORITE_SUBWAY_CARDS.map(c => {
      const active = (c.key === this.activeTimetableKey);
      const activeBg = c.subwayId === '1005' ? '#8b50a4' : '#b8860b';
      return `
        <button type="button" onclick="window.transitManager && window.transitManager.switchTimetableTab('${c.key}')"
          style="white-space:nowrap; padding:6px 10px; border-radius:8px; font-size:11.5px; font-weight:${active ? '900' : '700'}; border:1px solid ${active ? activeBg : '#cbd5e1'}; background:${active ? activeBg : '#ffffff'}; color:${active ? '#ffffff' : '#334155'}; cursor:pointer;">
          ${this.escapeHtml(c.tabLabel)}
        </button>
      `;
    }).join('');

    const card = FAVORITE_SUBWAY_CARDS.find(c => c.key === this.activeTimetableKey) || FAVORITE_SUBWAY_CARDS[0];
    const schedKey = isHoliday ? card.weScheduleKey : card.wdScheduleKey;
    const scheduleObj = OFFICIAL_SUBWAY_TIMETABLES[schedKey] || null;
    bodyContainer.innerHTML = this.renderScheduleHoursHtml(card.title, card.dirDesc, scheduleObj, card.defaultDest, isHoliday);
  }

  // ========= 실시간 1초 카운트다운 티커 & 자동 새로고침 =========
  startTicker() {
    if (this._ticker) clearInterval(this._ticker);
    this._ticker = setInterval(() => {
      const nowMs = Date.now();
      document.querySelectorAll('#transitWidgetSection .live-countdown, #subwayLookupSection .live-countdown').forEach(el => {
        const target = parseInt(el.getAttribute('data-target-time') || '0', 10);
        if (!target) return;
        const walkAttr = el.getAttribute('data-walk-sec');
        const walkSec = walkAttr !== null ? parseInt(walkAttr, 10) : 300;
        const remain = Math.max(0, Math.floor((target - nowMs) / 1000));
        el.innerHTML = this.formatSec(remain, walkSec);
      });

      this.refreshCountdown--;
      if (this.refreshCountdown <= 0) {
        this.refreshCountdown = this.REFRESH_INTERVAL;
        if (!document.hidden && !this.isFetching) {
          this.loadAllData(false);
        }
      }
      this.updateFooterStatus();
    }, 1000);
  }

  updateFooterStatus() {
    if (!this.lastUpdatedEl) return;
    const base = this.lastLoadedTimeStr ? `최근 갱신 ${this.lastLoadedTimeStr}` : '실시간 연동 중';
    this.lastUpdatedEl.textContent = `${base} · ${this.refreshCountdown}초 후 자동 새로고침`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.transitManager = new TransitManager();
});
