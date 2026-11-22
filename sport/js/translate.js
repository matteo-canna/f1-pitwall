/* Sport LIVE APP — traduzione in italiano delle frasi ricorrenti dei dati (cronaca calcio, play-by-play NBA, stati, turni).
   Le frasi non riconosciute restano in inglese: meglio un testo originale che uno inventato. */
(function(){
"use strict";
const T=SL.tr={};
const P="([^()]+?)",TEAM="\\(([^)]+)\\)";

/* ---------- calcio (cronaca Opta) ---------- */
const SOC=[
  [/^Lineups are announced and players are warming up\.?$/i,"Formazioni ufficiali, squadre in riscaldamento."],
  [/^Kickoff$/i,"Calcio d'inizio"],[/^Halftime$/i,"Intervallo"],[/^End Regular Time$/i,"Fine dei tempi regolamentari"],[/^Start 2nd Half$/i,"Inizio secondo tempo"],[/^End of Extra Time$/i,"Fine dei supplementari"],
  [/^Fourth official has announced (\d+) minutes? of added time\.?$/i,(m,a)=>"Il quarto uomo indica "+a+" minuti di recupero."],
  [/^Fourth official has announced (\d+) minute of added time\.?$/i,(m,a)=>"Il quarto uomo indica "+a+" minuto di recupero."],
  [/^First Half begins\.?$/i,"Inizia il primo tempo."],
  [/^Second Half begins\.?\s*(.*)$/i,(m,a)=>"Inizia il secondo tempo."+(a?" "+a:"")],
  [/^First Half Extra Time begins\.?\s*(.*)$/i,(m,a)=>"Inizia il primo tempo supplementare."+(a?" "+a:"")],
  [/^Second Half Extra Time begins\.?\s*(.*)$/i,(m,a)=>"Inizia il secondo tempo supplementare."+(a?" "+a:"")],
  [/^First Half ends,\s*(.*)$/i,(m,a)=>"Fine primo tempo, "+a],
  [/^Second Half ends,\s*(.*)$/i,(m,a)=>"Fine secondo tempo, "+a],
  [/^First Half Extra Time ends,\s*(.*)$/i,(m,a)=>"Fine primo supplementare, "+a],
  [/^Second Half Extra Time ends,\s*(.*)$/i,(m,a)=>"Fine secondo supplementare, "+a],
  [/^Match ends,\s*(.*)$/i,(m,a)=>"Finisce qui: "+a],
  [/^Penalty Shootout begins\.?\s*(.*)$/i,(m,a)=>"Iniziano i calci di rigore."+(a?" "+a:"")],
  [/^Penalty Shootout ends,\s*(.*)$/i,(m,a)=>"Fine dei rigori, "+a],
  [/^Delay in match because of an injury (.+?)\s*\((.+?)\)\.?$/i,(m,a,b)=>"Gioco fermo per l'infortunio di "+a+" ("+b+")."],
  [/^Delay in match\s*\((.+?)\)\.?$/i,(m,a)=>"Gioco fermo ("+a+")."],
  [/^Delay in match\.?$/i,"Gioco fermo."],
  [/^Delay over\. They are ready to continue\.?$/i,"Si riprende a giocare."],
  [/^VAR Decision: (.*)$/i,(m,a)=>"Decisione VAR: "+T.socFrag(a)],
  [/^Own Goal by (.+?),\s*(.+?)\.\s*(.*)$/i,(m,a,b,c)=>"Autogol di "+a+" ("+b+"). "+c],
  [/^Goal!\s*(.*)$/i,(m,a)=>"GOL! "+T.socFrag(a)],
  [/^Attempt saved\.\s*(.*)$/i,(m,a)=>"Tiro parato. "+T.socFrag(a)],
  [/^Attempt missed\.\s*(.*)$/i,(m,a)=>"Tiro fuori. "+T.socFrag(a)],
  [/^Attempt blocked\.\s*(.*)$/i,(m,a)=>"Tiro respinto. "+T.socFrag(a)],
  [/^Penalty saved!\s*(.*)$/i,(m,a)=>"Rigore parato! "+T.socFrag(a)],
  [/^Penalty missed!\s*(.*)$/i,(m,a)=>"Rigore sbagliato! "+T.socFrag(a)],
  [/^Penalty conceded by (.+?) \((.+?)\) (.*)$/i,(m,a,b,c)=>"Rigore causato da "+a+" ("+b+") "+T.socFrag(c)],
  [/^Penalty (.+?)\. (.+?) draws a foul in the penalty area\.?$/i,(m,a,b)=>"Rigore per "+a+"! "+b+" subisce fallo in area."],
  [/^Corner,\s*(.+?)\. Conceded by (.+?)\.?$/i,(m,a,b)=>"Calcio d'angolo per "+a+". Concesso da "+b+"."],
  [/^Foul by (.+?)\.?$/i,(m,a)=>"Fallo di "+a+"."],
  [/^(.+?) wins a free kick in the attacking half\.?$/i,(m,a)=>a+" conquista una punizione nella metà campo avversaria."],
  [/^(.+?) wins a free kick in the defensive half\.?$/i,(m,a)=>a+" conquista una punizione nella propria metà campo."],
  [/^(.+?) wins a free kick on the (right|left) wing\.?$/i,(m,a,b)=>a+" conquista una punizione sulla fascia "+(b==="right"?"destra":"sinistra")+"."],
  [/^(.+?) wins a free kick\.?$/i,(m,a)=>a+" conquista una punizione."],
  [/^Offside,\s*(.+?)\. (.+?) is caught offside\.?$/i,(m,a,b)=>"Fuorigioco, "+a+". "+b+" è in fuorigioco."],
  [/^Offside,\s*(.+?)\. (.+?) tries a through ball, but (.+?) is caught offside\.?$/i,(m,a,b,c)=>"Fuorigioco, "+a+". "+b+" tenta il filtrante, ma "+c+" è in fuorigioco."],
  [/^Substitution,\s*(.+?)\. (.+?) replaces (.+?) because of an injury\.?$/i,(m,a,b,c)=>"Sostituzione, "+a+": entra "+b+", esce "+c+" per infortunio."],
  [/^Substitution,\s*(.+?)\. (.+?) replaces (.+?)\.?$/i,(m,a,b,c)=>"Sostituzione, "+a+": entra "+b+", esce "+c+"."],
  [/^(.+?) is shown the yellow card for a bad foul\.?$/i,(m,a)=>"Ammonito "+a+" per un fallo duro."],
  [/^(.+?) is shown the yellow card for hand ball\.?$/i,(m,a)=>"Ammonito "+a+" per fallo di mano."],
  [/^(.+?) is shown the yellow card for simulation\.?$/i,(m,a)=>"Ammonito "+a+" per simulazione."],
  [/^(.+?) is shown the yellow card for time wasting\.?$/i,(m,a)=>"Ammonito "+a+" per perdita di tempo."],
  [/^(.+?) is shown the yellow card for (?:dissent|arguing)\.?$/i,(m,a)=>"Ammonito "+a+" per proteste."],
  [/^(.+?) is shown the yellow card\.?$/i,(m,a)=>"Ammonito "+a+"."],
  [/^(.+?) is shown the red card for violent conduct\.?$/i,(m,a)=>"Espulso "+a+" per condotta violenta."],
  [/^(.+?) is shown the red card\.?$/i,(m,a)=>"Espulso "+a+"."],
  [/^Second yellow card to (.+?) for (.+)$/i,(m,a,b)=>"Secondo giallo per "+a+": espulso ("+T.socFrag(b)+")"],
  [/^Second yellow card to (.+?)\.?$/i,(m,a)=>"Secondo giallo per "+a+": espulso."],
  [/^Hand ball by (.+?)\.?$/i,(m,a)=>"Fallo di mano di "+a+"."],
  [/^Dangerous play by (.+?)\.?$/i,(m,a)=>"Gioco pericoloso di "+a+"."],
  [/^(.+?) hits the (?:left|right)? ?(post|bar)(.*)$/i,(m,a,b,c)=>a+" colpisce "+(b==="post"?"il palo":"la traversa")+T.socFrag(c)],
];
const FRAG=[
  [/right footed shot/g,"tiro di destro"],[/left footed shot/g,"tiro di sinistro"],[/\bheader\b/g,"colpo di testa"],[/\bshot\b/g,"tiro"],
  [/from very close range/g,"da distanza ravvicinata"],[/from the centre of the box/g,"dal centro dell'area"],[/from the left side of the box/g,"dal lato sinistro dell'area"],
  [/from the right side of the box/g,"dal lato destro dell'area"],[/from outside the box/g,"da fuori area"],[/from a difficult angle on the left/g,"da posizione defilata a sinistra"],
  [/from a difficult angle on the right/g,"da posizione defilata a destra"],[/from long range on the left/g,"dalla distanza, sulla sinistra"],[/from long range on the right/g,"dalla distanza, sulla destra"],
  [/from more than 35 yards/g,"da oltre 30 metri"],[/from the left side of the six yard box/g,"dal lato sinistro dell'area piccola"],[/from the right side of the six yard box/g,"dal lato destro dell'area piccola"],
  [/from the centre of the box/g,"dal centro dell'area"],[/from a direct free kick/g,"su punizione diretta"],[/\(penalty\)/g,"(rigore)"],
  [/to the bottom left corner/g,"nell'angolino basso a sinistra"],[/to the bottom right corner/g,"nell'angolino basso a destra"],[/to the top left corner/g,"all'incrocio a sinistra"],
  [/to the top right corner/g,"all'incrocio a destra"],[/to the high centre of the goal/g,"alto, centrale"],[/to the centre of the goal/g,"centrale"],[/to the bottom centre of the goal/g,"basso, centrale"],
  [/is saved in the bottom left corner/g,"parato in basso a sinistra"],[/is saved in the bottom right corner/g,"parato in basso a destra"],[/is saved in the top left corner/g,"parato in alto a sinistra"],
  [/is saved in the top right corner/g,"parato in alto a destra"],[/is saved in the centre of the goal/g,"parato centrale"],[/is saved in the top centre of the goal/g,"parato centrale in alto"],
  [/is saved in the bottom centre of the goal/g,"parato centrale in basso"],
  [/is close, but misses to the left/g,"vicino al palo, fuori a sinistra"],[/is close, but misses to the right/g,"vicino al palo, fuori a destra"],[/is close, but misses the top left corner/g,"sfiora l'incrocio a sinistra"],
  [/is close, but misses the top right corner/g,"sfiora l'incrocio a destra"],[/is just a bit too high/g,"di poco alto"],[/is too high/g,"alto"],[/is high and wide to the left/g,"alto e largo a sinistra"],
  [/is high and wide to the right/g,"alto e largo a destra"],[/misses to the left/g,"fuori a sinistra"],[/misses to the right/g,"fuori a destra"],[/is blocked/g,"respinto"],
  [/hits the left post/g,"colpisce il palo sinistro"],[/hits the right post/g,"colpisce il palo destro"],[/hits the bar/g,"colpisce la traversa"],
  [/Assisted by (.+?) with a cross/g,"Assist di $1 con un cross"],[/Assisted by (.+?) with a headed pass/g,"Assist di $1 di testa"],[/Assisted by (.+?) following a fast break/g,"Assist di $1 in contropiede"],
  [/Assisted by (.+?) following a set piece situation/g,"Assist di $1 su palla inattiva"],[/Assisted by (.+?) with a through ball/g,"Assist di $1 con un filtrante"],[/Assisted by (.+?)\./g,"Assist di $1."],
  [/following a corner/g,"su calcio d'angolo"],[/following a set piece situation/g,"su palla inattiva"],[/following a fast break/g,"in contropiede"],
  [/Goal awarded/g,"Gol convalidato"],[/Goal cancelled/g,"Gol annullato"],[/Penalty awarded/g,"Rigore assegnato"],[/No penalty/g,"Niente rigore"],[/Red card/g,"Cartellino rosso"],
];
T.socFrag=s=>{let o=String(s||"");FRAG.forEach(([r,v])=>{o=o.replace(r,v);});return o;};
T.soccer=function(s){s=String(s||"").trim();for(const [r,v] of SOC){const m=s.match(r);if(m)return typeof v==="function"?v(...m):v;}return T.socFrag(s);};

/* ---------- NBA (play-by-play) ---------- */
const NBA=[
  [/ makes (\w+)-foot (?:three point|3-pt) (?:jumper|shot|pullup jump shot|step back jumpshot)/i," segna da tre ($1 piedi)"],
  [/ misses (\w+)-foot (?:three point|3-pt) (?:jumper|shot|pullup jump shot|step back jumpshot)/i," sbaglia da tre ($1 piedi)"],
  [/ makes (\w+)-foot (.+)/i," segna da $1 piedi ($2)"],[/ misses (\w+)-foot (.+)/i," sbaglia da $1 piedi ($2)"],
  [/ makes three point (.+)/i," segna da tre ($1)"],[/ misses three point (.+)/i," sbaglia da tre ($1)"],
  [/ makes free throw (\d) of (\d)/i," segna il libero $1 di $2"],[/ misses free throw (\d) of (\d)/i," sbaglia il libero $1 di $2"],
  [/ makes technical free throw/i," segna il libero tecnico"],[/ misses technical free throw/i," sbaglia il libero tecnico"],
  [/ makes (.+)/i," segna ($1)"],[/ misses (.+)/i," sbaglia ($1)"],
  [/ defensive rebound/i," rimbalzo difensivo"],[/ offensive rebound/i," rimbalzo offensivo"],[/ defensive team rebound/i," rimbalzo difensivo di squadra"],[/ offensive team rebound/i," rimbalzo offensivo di squadra"],
  [/ bad pass \((.+?) steals\)/i," passaggio sbagliato (palla rubata da $1)"],[/ lost ball turnover \((.+?) steals\)/i," palla persa (rubata da $1)"],[/ traveling/i," passi"],
  [/ shooting foul \((.+?) draws the foul\)/i," fallo in tiro (subito da $1)"],[/ personal foul \((.+?) draws the foul\)/i," fallo personale (subito da $1)"],[/ shooting foul/i," fallo in tiro"],
  [/ personal foul/i," fallo personale"],[/ loose ball foul/i," fallo a palla vagante"],[/ offensive foul/i," fallo in attacco"],[/ offensive charge/i," sfondamento"],[/ technical foul/i," fallo tecnico"],
  [/ blocks (.+?)'s (.+)/i," stoppa $1 ($2)"],[/ enters the game for (.+)/i," entra al posto di $1"],[/ shot clock turnover/i," violazione dei 24 secondi"],
  [/ vs\. (.+?) \((.+?) gains possession\)/i," contro $1 (possesso a $2)"],
];
const NBAW=[[/End of the (\d)(?:st|nd|rd|th) Quarter/i,"Fine del $1° quarto"],[/Start of the (\d)(?:st|nd|rd|th) Quarter/i,"Inizio del $1° quarto"],[/End of Game/i,"Fine partita"],[/Jump Ball/i,"Palla a due"],
  [/timeout/i,"timeout"],[/ \(([\w .'-]+) assists\)/i," (assist di $1)"],[/\bdunk\b/i,"schiacciata"],[/\blayup\b/i,"terzo tempo"],[/jumper|jump shot/i,"tiro in sospensione"],[/driving/i,"in penetrazione"],
  [/pullup/i,"dal palleggio"],[/step back/i,"step back"],[/floating/i,"floater"],[/hook shot/i,"gancio"],[/alley oop/i,"alley-oop"],[/tip shot/i,"tap-in"],[/fadeaway/i,"in fadeaway"],[/cutting/i,"tagliando"],[/running/i,"in corsa"],[/turnaround/i,"in girata"]];
T.nba=function(s){let o=String(s||"");for(const [r,v] of NBA){if(r.test(o)){o=o.replace(r,v);break;}}NBAW.forEach(([r,v])=>{o=o.replace(new RegExp(r.source,r.flags+"g"),v);});return o;};

/* ---------- stati, turni, ruoli ---------- */
const STATUS={"Full Time":"Finale","Final":"Finale","FT":"Finale","Half Time":"Intervallo","Halftime":"Intervallo","HT":"Intervallo","Postponed":"Rinviata","Canceled":"Annullata","Cancelled":"Annullata","Suspended":"Sospesa","Abandoned":"Interrotta","Delayed":"In ritardo","Scheduled":"In programma","In Progress":"In corso","End of Period":"Fine periodo","Final/OT":"Finale (supplementari)","Final/2OT":"Finale (2 supplementari)","Retired":"Ritiro","Walkover":"Walkover","First Half":"1° tempo","Second Half":"2° tempo","Extra Time":"Supplementari","Penalties":"Rigori","FT-Pens":"Finale ai rigori","AET":"Dopo i supplementari","Final - AET":"Finale dopo supplementari"};
T.status=s=>STATUS[s]||String(s||"").replace(/^(\d+:\d+|\d+(?:\.\d)?) - (\d)(?:st|nd|rd|th)$/i,"$2° Q · $1").replace(/^(\d+:\d+|\d+(?:\.\d)?) - OT$/i,"Suppl. · $1").replace(/^End of (\d)(?:st|nd|rd|th)$/i,"Fine $1° Q").replace(/^Start of (\d)(?:st|nd|rd|th)$/i,"Inizio $1° Q").replace(/^End of (\d)(?:st|nd|rd|th) Quarter$/i,"Fine $1° quarto").replace(/^Halftime$/i,"Intervallo").replace(/^(\d)(?:st|nd|rd|th) Quarter$/i,"$1° quarto").replace(/^Final\/OT$/i,"Finale (OT)");
const ROUNDS={"Final":"Finale","Semifinal":"Semifinale","Semifinals":"Semifinali","Quarterfinal":"Quarti","Quarterfinals":"Quarti","Round of 16":"Ottavi","Round of 32":"Sedicesimi","Round of 64":"Trentaduesimi","Round of 128":"1° turno","Round Robin":"Round robin","Group Stage":"Fase a gironi","Qualifying":"Qualificazioni","1st Round":"1° turno","2nd Round":"2° turno","3rd Round":"3° turno","4th Round":"4° turno","Qualifying 1st Round":"Qual. 1° turno","Qualifying 2nd Round":"Qual. 2° turno","Qualifying Final":"Qual. finale"};
T.round=s=>ROUNDS[s]||s||"";
const RPOS={"loosehead prop":"Pilone sinistro","hooker":"Tallonatore","tighthead prop":"Pilone destro","lock":"Seconda linea","blindside flanker":"Terza linea (flanker)","openside flanker":"Terza linea (flanker)","flanker":"Flanker","number 8":"Numero 8","no. 8":"Numero 8","scrum-half":"Mediano di mischia","scrum half":"Mediano di mischia","fly-half":"Mediano d'apertura","fly half":"Mediano d'apertura","left wing":"Ala sinistra","right wing":"Ala destra","wing":"Ala","inside centre":"Primo centro","outside centre":"Secondo centro","centre":"Centro","center":"Centro","fullback":"Estremo","full back":"Estremo","replacement":"Panchina","prop":"Pilone"};
T.rpos=s=>RPOS[String(s||"").toLowerCase()]||s||"";
const CTRY={ITA:"Italia",ESP:"Spagna",FRA:"Francia",GER:"Germania",GBR:"Gran Bretagna",USA:"Stati Uniti",AUS:"Australia",ARG:"Argentina",SUI:"Svizzera",SRB:"Serbia",RUS:"Russia",NOR:"Norvegia",DEN:"Danimarca",CAN:"Canada",GRE:"Grecia",POL:"Polonia",CZE:"Rep. Ceca",BRA:"Brasile",JPN:"Giappone",POR:"Portogallo",NED:"Olanda",BEL:"Belgio",AUT:"Austria",CHI:"Cile",KAZ:"Kazakistan",CRO:"Croazia",FIN:"Finlandia",BUL:"Bulgaria",HUN:"Ungheria",RSA:"Sudafrica",NZL:"Nuova Zelanda",CHN:"Cina",MON:"Monaco",COL:"Colombia",PER:"Perù",SWE:"Svezia",TPE:"Taipei",IND:"India",THA:"Thailandia",MAS:"Malesia",QAT:"Qatar",IDN:"Indonesia",SMR:"San Marino",HUN2:"Ungheria",ES:"Spagna",IT:"Italia",FR:"Francia",JP:"Giappone",AU:"Australia",ZA:"Sudafrica",PT:"Portogallo",GB:"Gran Bretagna",US:"Stati Uniti",TH:"Thailandia",AR:"Argentina",BR:"Brasile",DE:"Germania",NL:"Olanda",ID:"Indonesia",MY:"Malesia",QA:"Qatar",IN:"India",TR:"Turchia",AT:"Austria",CZ:"Rep. Ceca",HU:"Ungheria",SM:"San Marino",KZ:"Kazakistan"};
T.country=c=>CTRY[c]||c||"";
/* nomi squadre/nazionali più comuni in italiano */
const TEAMS={"Italy":"Italia","England":"Inghilterra","France":"Francia","Ireland":"Irlanda","Scotland":"Scozia","Wales":"Galles","Spain":"Spagna","Germany":"Germania","Netherlands":"Olanda","Belgium":"Belgio","Portugal":"Portogallo","Switzerland":"Svizzera","Croatia":"Croazia","Norway":"Norvegia","Denmark":"Danimarca","Sweden":"Svezia","Austria":"Austria","Poland":"Polonia","Turkey":"Turchia","Türkiye":"Turchia","Greece":"Grecia","Hungary":"Ungheria","Serbia":"Serbia","Ukraine":"Ucraina","Czechia":"Rep. Ceca","Czech Republic":"Rep. Ceca","Israel":"Israele","Estonia":"Estonia","Moldova":"Moldavia","Bosnia and Herzegovina":"Bosnia","North Macedonia":"Macedonia del Nord","Northern Ireland":"Irlanda del Nord","Iceland":"Islanda","Finland":"Finlandia","Romania":"Romania","Slovakia":"Slovacchia","Slovenia":"Slovenia","Albania":"Albania","Georgia":"Georgia","New Zealand":"Nuova Zelanda","South Africa":"Sudafrica","Australia":"Australia","Argentina":"Argentina","Japan":"Giappone","Fiji":"Figi","Samoa":"Samoa","Tonga":"Tonga","United States":"Stati Uniti","USA":"Stati Uniti","Brazil":"Brasile","Mexico":"Messico","Uruguay":"Uruguay","Morocco":"Marocco","Tunisia":"Tunisia","Canada":"Canada","Chile":"Cile","Colombia":"Colombia","Cyprus":"Cipro","Luxembourg":"Lussemburgo","Liechtenstein":"Liechtenstein","Malta":"Malta","Montenegro":"Montenegro","Lithuania":"Lituania","Latvia":"Lettonia","Kazakhstan":"Kazakistan","Armenia":"Armenia","Azerbaijan":"Azerbaigian","Belarus":"Bielorussia","Faroe Islands":"Isole Faroe","Gibraltar":"Gibilterra","San Marino":"San Marino","Andorra":"Andorra","Kosovo":"Kosovo","Bulgaria":"Bulgaria","Hong Kong":"Hong Kong","Portugal ":"Portogallo"};
T.team=n=>TEAMS[n]||n||"";
})();
