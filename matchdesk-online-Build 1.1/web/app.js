'use strict';
const BUILD='v31-hwb-ocr-merge';
let _tt;function toast(m){let e=document.getElementById('toast');if(!e){e=document.createElement('div');e.id='toast';e.setAttribute('role','status');document.body.appendChild(e)}e.textContent=m;e.className='show';clearTimeout(_tt);_tt=setTimeout(()=>e.className='',2600)}
(function selfHeal(){try{if(localStorage.getItem('md_build')===BUILD)return;localStorage.setItem('md_build',BUILD);
 if(!('serviceWorker' in navigator)||!navigator.serviceWorker.controller)return;   // nothing stale is in control
 Promise.all([caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x)))),navigator.serviceWorker.getRegistrations().then(r=>Promise.all(r.map(x=>x.unregister())))]).then(()=>location.reload())}catch{}})();
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LEAGUES={'eng.1':'Premier League','eng.2':'Championship','esp.1':'La Liga','ita.1':'Serie A','ger.1':'Bundesliga','fra.1':'Ligue 1','ned.1':'Eredivisie','por.1':'Primeira Liga','sco.1':'Scottish Prem','tur.1':'Süper Lig','usa.1':'MLS','bra.1':'Brasileirão','arg.1':'Primera División','jpn.1':'J1 League','ksa.1':'Saudi Pro League','rsa.1':'SA Premier Division','rsa.mtn8':'MTN8 Cup','gha.1':'Ghana Premier League','caf.champions':'CAF Champions League','caf.confed':'CAF Confederation Cup','caf.nations':'Africa Cup of Nations','uefa.champions':'Champions League','uefa.europa':'Europa League','uefa.europa.conf':'Conference League','fifa.world':'FIFA World Cup','fifa.friendly':'International Friendly'};
const store={get:(k,d)=>{try{return JSON.parse(localStorage.getItem('md_'+k))??d}catch{return d}},set:(k,v)=>localStorage.setItem('md_'+k,JSON.stringify(v))};

// ---------- tabs ----------
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('nav button,.tab').forEach(e=>e.classList.remove('on'));
 b.classList.add('on');$('#'+b.dataset.t).classList.add('on');if(b.dataset.t==='history')renderHist();if(b.dataset.t==='dash')drawDash();if(b.dataset.t==='video')drawVideo();window.scrollTo(0,0)});
function goTab(name,plans){const btn=document.querySelector(`nav [data-t="${name}"]`);if(btn)btn.click();if(plans)setTimeout(()=>document.getElementById('plans-h')?.scrollIntoView(),60)}
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>goTab(b.dataset.go,b.dataset.plans));
// Delegated clicks for dynamically created buttons (Home actions, promos, analyzer CTAs)
document.addEventListener('click',e=>{
  const go=e.target.closest?.('[data-go]');
  if(go&&go.dataset.go){e.preventDefault();goTab(go.dataset.go,go.dataset.plans);return}
  if(e.target.closest?.('#reanalyze')){e.preventDefault();const s=store.get('last_slip','');if(!s){toast('No previous slip saved yet — analyze one first');return}goTab('analyzer');const box=$('#slip');if(box)box.value=s;setTimeout(()=>{try{$('#analyze').click()}catch{}},120);return}
  if(e.target.closest?.('#track-from-analysis')){e.preventDefault();const r=addSlipTeams(lastLegs);toast(r?`Tracking ${r[0]} of ${r[1]} team(s) from this analysis`:'No team names found on this slip — check match names');goTab('scores');try{loadScores()}catch{};return}
});

// ---------- live scores tracker (ported from the desktop TrackerTab) + cricket + F1 + video + dashboard ----------
const SPORTS={
 soccer:{label:'⚽ Soccer',path:'soccer',goal:'GOAL',leagues:[['eng.1','Premier League','🏴 England'],['eng.2','Championship','🏴 England'],['esp.1','La Liga','🇪🇸 Spain'],['ita.1','Serie A','🇮🇹 Italy'],['ger.1','Bundesliga','🇩🇪 Germany'],['fra.1','Ligue 1','🇫🇷 France'],['ned.1','Eredivisie','🇳🇱 Netherlands'],['por.1','Primeira Liga','🇵🇹 Portugal'],['sco.1','Scottish Prem','🏴 Scotland'],['bel.1','Pro League','🇧🇪 Belgium'],['tur.1','Süper Lig','🇹🇷 Turkey'],['mex.1','Liga MX','🇲🇽 Mexico'],['usa.1','MLS','🇺🇸 USA'],['bra.1','Brasileirão','🇧🇷 Brazil'],['arg.1','Primera División','🇦🇷 Argentina'],['jpn.1','J1 League','🇯🇵 Japan'],['ksa.1','Saudi Pro League','🇸🇦 Saudi Arabia'],['aus.1','A-League','🇦🇺 Australia'],['rsa.1','SA Premier Division','🇿🇦 South Africa'],['rsa.mtn8','MTN8 Cup','🇿🇦 South Africa'],['swe.1','Allsvenskan','🇸🇪 Sweden'],['den.1','Danish Superliga','🇩🇰 Denmark'],['gha.1','Ghana Premier League','🇬🇭 Ghana'],['caf.champions','CAF Champions League','🌍 Africa'],['caf.confed','CAF Confederation Cup','🌍 Africa'],['caf.nations','Africa Cup of Nations','🌍 Africa'],['caf.nations_qual','AFCON Qualifying','🌍 Africa'],['fifa.worldq.caf','World Cup Qualifying (CAF)','🌍 Africa'],['uefa.champions','Champions League','🌍 Europe'],['uefa.europa','Europa League','🌍 Europe'],['uefa.europa.conf','Conference League','🌍 Europe'],['uefa.nations','UEFA Nations League','🌍 Europe'],['fifa.world','FIFA World Cup','🌐 International'],['fifa.cwc','FIFA Club World Cup','🌐 International'],['fifa.friendly','International Friendly','🌐 International']]},
 rugby:{label:'🏉 Rugby Union',path:'rugby',goal:'TRY',leagues:[['267979','Gallagher Premiership','🏴 England'],['270559','French Top 14','🇫🇷 France'],['270557','United Rugby Championship','🌍 Europe/SA'],['242041','Super Rugby Pacific','🌏 Pacific'],['289262','Major League Rugby','🇺🇸 USA'],['271937','Champions Cup','🌍 Europe'],['180659','Six Nations','🌍 Europe'],['244293','The Rugby Championship','🌐 International'],['164205','Rugby World Cup','🌐 International'],['289234','International Test Match','🌐 International'],['268565','British & Irish Lions Tour','🌐 International']]},
 cricket:{label:'🏏 Cricket',goal:'WICKET',special:'cricket',leagues:[['current','Current / live matches','🏏 Cricket']]},
 f1:{label:'🏁 Formula 1',goal:'LAP',special:'f1',leagues:[['latest','Current / latest race weekend','🏁 Formula 1'],['season','Whole season','🏁 Formula 1']]}};
const spt=k=>SPORTS[k]||{label:'🏟 '+k,path:k,goal:'SCORE'};
const MAJOR=['eng.1','esp.1','ita.1','ger.1','fra.1','ned.1','por.1','rsa.1','uefa.champions','uefa.europa','uefa.europa.conf','caf.champions','caf.confed'];
const NATIONS=['India','Australia','England','South Africa','Pakistan','New Zealand','Sri Lanka','West Indies','Bangladesh','Afghanistan','Zimbabwe','Ireland'];
const fetchT=async(url,ms=10000)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{signal:c.signal})}finally{clearTimeout(t)}};
const MAX_TRACK=20,sleep=ms=>new Promise(r=>setTimeout(r,ms)),WILD=['','current','upcoming','latest','season'];
// Normalize team names for reliable matching (accents, FC/CF/SC, punctuation)
function normTeam(n){
  if(!n)return '';
  let s=String(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/&/g,' and ').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  // strip common club prefixes/suffixes that vary across sources
  s=s.replace(/\b(fc|cf|sc|afc|cfc|ac|as|ss|us|rc|cd|ud|sd|ca|bc|bk)\b/g,' ').replace(/\s+/g,' ').trim();
  return s;
}
function teamMatch(trackedName, displayName){
  if(!trackedName||!displayName)return false;
  const et=normTeam(alias?alias(trackedName):trackedName), hn=normTeam(displayName);
  if(!et||!hn)return false;
  if(hn===et||hn.includes(et)||et.includes(hn))return true;
  // token overlap: require the significant tokens of the shorter name to appear in the longer
  const tok=s=>s.split(' ').filter(w=>w.length>2&&!['and','the','united','city','town','hotspur','wanderers','athletic','sporting','real'].includes(w));
  const a=tok(et), b=tok(hn);
  if(!a.length||!b.length)return et.length>=4&&(hn.includes(et)||et.includes(hn));
  const [sh,lo]=a.length<=b.length?[a,b]:[b,a];
  return sh.every(t=>lo.some(x=>x===t||x.startsWith(t)||t.startsWith(x)));
}

$('#sport').innerHTML=Object.entries(SPORTS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
$('#sport').value=SPORTS[store.get('sport','soccer')]?store.get('sport','soccer'):'soccer';
function fillLeagues(){const g={};SPORTS[$('#sport').value].leagues.forEach(l=>(g[l[2]]=g[l[2]]||[]).push(l));
 $('#league').innerHTML=Object.entries(g).map(([r,a])=>`<optgroup label="${r}">${a.map(l=>`<option value="${l[0]}">${esc(l[1])}</option>`).join('')}</optgroup>`).join('')}
fillLeagues();{const sv=store.get('league','eng.1');if([...$('#league').options].some(o=>o.value===sv))$('#league').value=sv}
const leagueName=()=>$('#league').selectedOptions[0]?.textContent||'';
const tracked=()=>store.get('tracked',[]),setTracked=t=>{store.set('tracked',t);drawChips();drawTeams();if(typeof syncPushSoon==='function')syncPushSoon()};
const espn=async(sport,lg,kind,q='')=>{const r=await fetchT(`https://site.api.espn.com/apis/site/v2/sports/${spt(sport).path}/${lg}/${kind}${q?('?'+q):''}`);if(!r.ok)throw new Error(r.status);return r.json()};
let teams=[];
async function loadTeams(){const sport=$('#sport').value,lg=$('#league').value,sp=SPORTS[sport];teams=[];
 if(sp.special==='cricket'){teams=[...NATIONS];return drawTeams()}if(sp.special==='f1'){teams=[];$('#teams').innerHTML='<span class="muted">Formula 1 follows the whole race weekend – tap “Track whole league” to follow it.</span>';return}
 $('#teams').textContent='Loading teams…';
 try{const d=await espn(sport,lg,'teams'),seen=new Set();
  for(const s of d.sports||[])for(const l of s.leagues||[])for(const e of l.teams||[]){const t=e.team||{},n=t.displayName||t.name;if(n&&!seen.has(n.toLowerCase())){seen.add(n.toLowerCase());teams.push(n)}}
  teams.sort()}catch{teams=[]}drawTeams()}
function drawTeams(){if(SPORTS[$('#sport').value].special==='f1')return;const q=$('#tsearch').value.trim().toLowerCase(),tr=tracked(),sport=$('#sport').value;
 const on=n=>tr.some(e=>e.sport===sport&&e.team.toLowerCase()===n.toLowerCase()),list=teams.filter(n=>!q||n.toLowerCase().includes(q));
 $('#teams').innerHTML=(list.length?list.map(n=>`<button class="chip ${on(n)?'on':''}" data-t="${esc(n)}">${on(n)?'✓ ':''}${esc(n)}</button>`).join(''):'<span class="muted">No teams found for that league/search.</span>')
  +(q&&!teams.some(n=>n.toLowerCase()===q)?`<button class="chip add" data-t="${esc($('#tsearch').value.trim())}">＋ Add “${esc($('#tsearch').value.trim())}”</button>`:'')}
$('#teams').onclick=e=>{const n=e.target.dataset?.t;if(n)toggleTeam(n)};
function addEntries(list){const t=tracked();let add=0;for(const e of list){if(t.length>=MAX_TRACK)break;
  const tn=(e.team||'').toLowerCase().trim();if(!tn)continue;
  const exists=t.some(x=>x.sport===e.sport&&(x.team||'').toLowerCase().trim()===tn);
  if(exists){
    // Prefer keeping a specific league if the new one is empty, or upgrade empty to specific
    const idx=t.findIndex(x=>x.sport===e.sport&&(x.team||'').toLowerCase().trim()===tn);
    if(idx>=0&&!(t[idx].league||'')&&(e.league||'')){t[idx].league=e.league}
    continue}
  t.push({team:e.team.trim(),sport:e.sport||'soccer',league:e.league||''});add++}
 setTracked(t);return add}
function toggleTeam(n){let t=tracked();const sport=$('#sport').value,lg=$('#league').value,i=t.findIndex(e=>e.sport===sport&&e.team.toLowerCase()===n.toLowerCase());
 if(i>=0){t.splice(i,1);setTracked(t)}else{if(t.length>=MAX_TRACK){$('#status').textContent=`You can track up to ${MAX_TRACK} items.`;return}addEntries([{team:n,sport,league:lg}])}loadScores()}
$('#twhole').onclick=()=>{addEntries([{team:'🌐 '+leagueName(),sport:$('#sport').value,league:$('#league').value}]);loadScores()};
$('#madd').onclick=()=>{const sport=$('#msport').value.trim().toLowerCase(),lg=$('#mleague').value.trim(),team=$('#mteam').value.trim(),st=$('#mst');
 if(!sport||!lg){st.textContent='Enter a sport and a league code (for example soccer + eng.1).';return}
 const n=addEntries([{team:team||'🌐 '+sport+'/'+lg,sport,league:lg}]);st.textContent=n?`Tracking ${team||'the whole '+lg+' league'} (${sport}/${lg}). If nothing shows up, check the league code.`:'Already tracking that (or the limit of '+MAX_TRACK+' is reached).';$('#mteam').value='';loadScores()};
function detectLegSport(l){
  const blob=((l&&l.match)||'')+' '+((l&&l.market)||'')+' '+((l&&l.sel)||'')+' '+((l&&l.bookmaker)||'');
  const low=blob.toLowerCase();
  // Cricket: nations, formats, language
  const ckWords=/\b(cricket|t20|t20i|odi|test match|innings|wickets?|runs?|bowled|lbw|super over)\b/i;
  const nations=NATIONS.map(n=>n.toLowerCase());
  const hasNation=nations.some(n=>low.includes(n.toLowerCase()));
  if(ckWords.test(low)||hasNation&&/\b(vs?\.?|v)\b/.test(low)&&!/\b(united|city|fc|afc)\b/.test(low))return 'cricket';
  // Rugby
  if(/\b(rugby|try scorer|tries|scrum|lineout|urc|top 14|super rugby|premiership rugby|six nations|champions cup)\b/i.test(low))return 'rugby';
  return 'soccer';
}
function addSlipTeams(legs){
  const byKey=new Map();
  for(const l of (legs||[])){
    const sport=detectLegSport(l);
    const names=teamsOf(l.match).filter(Boolean);
    for(const n of names){
      const cleaned=(n||'').replace(/\s+/g,' ').trim();
      if(!cleaned||cleaned.length<2)continue;
      const can=typeof alias==='function'?alias(cleaned):cleaned;
      const key=sport+'|'+normTeam(can);
      if(!normTeam(can))continue;
      const prev=byKey.get(key);
      const entry={team:can,sport,league:sport==='cricket'?'current':sport==='rugby'?'':'',};
      if(!prev||can.length>prev.team.length)byKey.set(key,entry);
    }
  }
  const entries=[...byKey.values()];
  if(!entries.length)return null;
  return[addEntries(entries),entries.length]}
$('#fromslip').onclick=()=>{const r=addSlipTeams(lastLegs);$('#status').textContent=r?`Added ${r[0]} of ${r[1]} team(s) from your slip. Soccer, cricket and rugby teams are tagged by sport when possible; open the matching sport/league if a score does not appear.`:'No teams found – analyze a slip first.';loadScores()};
$('#scodebtn').onclick=async()=>{const raw=$('#scode').value.trim(),st=$('#scst');if(!raw){st.textContent='Type or paste a booking code, Bet ID or link first.';return}
 let text=raw;if(!looksLikeSlip(raw)){st.textContent='Loading the slip from the bookmaker…';const hr=await helperResolve(raw,'Auto',st);
  if(!hr){st.innerHTML='Loading a code needs the MatchDesk server (or the local helper). You can paste the slip text here instead. '+helpNeedBtn('why won’t my booking code load','Need help?');helpWireNeed(st);return}
  if(!hr.ok){st.innerHTML=esc(diagnoseCodeError(hr.message||'Could not load that code.',raw,'Auto'))+' '+helpNeedBtn('why won’t my booking code load','Need help?');helpWireNeed(st);return}text=hr.text}
 const r=addSlipTeams(parse(text));st.textContent=r?`Added ${r[0]} of ${r[1]} team(s) from that slip to your tracking.`:'No teams found in that slip.';loadScores()};
function clearTracking(){const n=tracked().length;browse=false;try{localStorage.removeItem('md_tracked')}catch{}setTracked([]);lastList=[];Object.keys(lastScores).forEach(k=>delete lastScores[k]);
 $('#matches').innerHTML='';$('#status').textContent='';try{drawVideo()}catch{}toast(n?`Cleared ${n} tracked item(s)`:'Nothing was being tracked');loadScores()}
document.addEventListener('click',e=>{const t=e.target.closest?e.target:null;if(!t)return;if(t.closest('#golimit')){document.querySelector('nav [data-t=about]').click();setTimeout(()=>document.getElementById('plans-h').scrollIntoView(),60);return}if(t.closest('#clrtrack'))clearTracking();else if(t.closest('#browsebtn')){browse=true;loadScores()}});
function drawChips(){const t=tracked();$('#chips').innerHTML=t.length?t.map((e,i)=>{
  const extra=e.sport!=='soccer'?' · '+esc(spt(e.sport).label.replace(/^\S+\s/,'')):(e.league&&!WILD.includes((e.league||'').toLowerCase())?' · '+esc(e.league):'');
  return `<button class="chip on" data-i="${i}" title="Tap to stop tracking">${esc(e.team)}${extra} ✕</button>`;
 }).join(''):'<span class="muted">Nothing tracked yet. Tap teams above or load a slip to follow them.</span>'}
$('#chips').onclick=e=>{const i=e.target.dataset?.i;if(i===undefined)return;const t=tracked();t.splice(+i,1);setTracked(t);loadScores()};
const fmtKick=d=>{if(!d)return '';const k=new Date(d);if(isNaN(k))return '';const n=new Date(),day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()),diff=Math.round((day(k)-day(n))/864e5);
 const p=diff===0?'Today':diff===1?'Tomorrow':diff===-1?'Yesterday':k.toLocaleDateString([], {weekday:'short',day:'2-digit',month:'short'});return p+' '+k.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})};
const comps=m=>{const c=(m.competitions||[{}])[0].competitors||[];return[c.find(x=>x.homeAway==='home')||c[0]||{},c.find(x=>x.homeAway==='away')||c[1]||{}]};
// ---- Formula 1 (ESPN public scoreboard) ----
async function f1Events(mode){const r=await fetchT('https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard'+(mode==='season'?'?dates='+new Date().getFullYear():''));if(!r.ok)throw new Error(r.status);
 return((await r.json()).events||[]).map(ev=>{const cs=ev.competitions||[],stt=c=>c.status?.type?.state,live=cs.filter(c=>stt(c)==='in'),pre=cs.filter(c=>stt(c)==='pre').sort((a,b)=>(a.date||'').localeCompare(b.date||'')),
  sess=live[0]||pre[0]||cs[cs.length-1]||{},ty=(sess.status||ev.status||{}).type||{},nm=c=>c.athlete?.displayName||c.athlete?.shortName||c.team?.displayName||'',
  ranked=(sess.competitors||[]).filter(c=>/^\d+$/.test(String(c.order??''))).sort((a,b)=>a.order-b.order);
  return{id:'f1-'+ev.id,name:ev.name,date:sess.date||ev.date,status:{type:{state:ty.state||'pre',detail:ty.detail||''}},_sport:'f1',_league:mode,_race:ev.shortName||ev.name||'Grand Prix',_venue:ev.circuit?.fullName||'',
   _session:sess.type?.abbreviation||sess.type?.text||sess.type?.name||'Session',_leader:ranked.length?'P1 '+nm(ranked[0]):'',_top:ranked.slice(0,10).map(c=>`P${c.order} ${nm(c)}`),competitions:[{competitors:[]}]}})}
// ---- Cricket (ESPN public per-series scoreboards, no key needed) ----
async function cricketLeagueIds(name){const c=cacheGet('cki_'+name,6*36e5);if(c)return c;
 const r=await fetchT('https://site.web.api.espn.com/apis/common/v3/search?query='+encodeURIComponent(name)+'&limit=12&sport=cricket');if(!r.ok)return[];
 const ids=[];for(const it of(await r.json()).items||[]){if(it.type!=='league')continue;const lg=it.defaultLeagueSlug||it.id||'';if(lg&&!ids.includes(String(lg)))ids.push(String(lg))}
 const out=ids.slice(0,4);cacheSet('cki_'+name,out);return out}
const recentCk=ev=>{const s=ev.status?.type?.state;if(s==='in'||s==='pre')return true;const d=new Date(ev.date||ev.competitions?.[0]?.date);return isNaN(d)?true:(Date.now()-d)/864e5<=3};
async function cricketEvents(names,limit){const ids=[];for(const n of names)try{for(const id of await cricketLeagueIds(n))if(!ids.includes(id))ids.push(id)}catch{}
 const out=[],seen=new Set();await Promise.allSettled(ids.slice(0,Math.max(1,limit)).map(async lg=>{const r=await fetchT(`https://site.api.espn.com/apis/site/v2/sports/cricket/${lg}/scoreboard`);if(!r.ok)return;
  for(const ev of(await r.json()).events||[])if(ev.id&&!seen.has(ev.id)&&recentCk(ev)){seen.add(ev.id);out.push({...ev,_sport:'cricket',_league:lg})}}));return out}
function filterEvents(ev,tr){if(!tr.length)return ev;
 return ev.filter(m=>{
  const[h,a]=comps(m),hn=h.team?.displayName||h.athlete?.displayName||'',an=a.team?.displayName||a.athlete?.displayName||'';
  return tr.some(e=>{
    if(m._sport==='f1')return e.sport==='f1';
    const et=(e.team||'').trim();
    if(et.startsWith('🌐'))return e.sport===m._sport&&(WILD.includes((e.league||'').toLowerCase())||e.league===m._league);
    // Match either side with robust name comparison (aliases + normalization)
    return teamMatch(et,hn)||teamMatch(et,an);
  });
 }).sort((x,y)=>{
  // Live first, then upcoming, then finished (most recent first among finished)
  const sx=x.status?.type?.state||'',sy=y.status?.type?.state||'';
  const rank=s=>({in:0,pre:1,post:2}[s]??3);
  const r=rank(sx)-rank(sy);if(r)return r;
  if(sx==='post'&&sy==='post')return new Date(y.date)-new Date(x.date);
  return new Date(x.date)-new Date(y.date);
 })}
const lastScores={};
function beep(){try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.15;o.start();o.stop(c.currentTime+.25)}catch{}}
function alertGoal(title,body){const st=store.get('alerts',{notif:false,sound:true});
 if(st.sound)beep();try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch{}
 if(st.notif&&window.Notification&&Notification.permission==='granted'){try{navigator.serviceWorker?.ready.then(r=>r.showNotification(title,{body,icon:'icons/icon-192.png'})).catch(()=>new Notification(title,{body}))}catch{try{new Notification(title,{body})}catch{}}}}
function card(m){const sp=spt(m._sport),st=m.status?.type||{},live=st.state==='in';
 if(m._sport==='f1')return `<div class="card f1"><div class="m"><span class="muted">${sp.label} · <span class="${live?'live':''}">${live?'● ':''}${esc(st.detail||m._session)}</span></span><span class="muted">🕒 ${esc(fmtKick(m.date))}</span></div>
  <b>${esc(m._race)}</b><div class="${live?'live':'muted'}">🏎 ${esc(m._session)}${m._leader?' • '+esc(m._leader):''}${m._venue?' • '+esc(m._venue):''}</div>
  ${m._top&&m._top.length?`<details><summary class="muted">Positions (top ${m._top.length})</summary>${m._top.map(p=>`<div class="pos"><span>${esc(p)}</span></div>`).join('')}</details>`:''}</div>`;
 const[h,a]=comps(m),pre=st.state==='pre',id=m.id||m.name,cur=`${h.score}-${a.score}`,changed=lastScores[id]!==undefined&&lastScores[id]!==cur&&live;
 if(changed)alertGoal('⚡ '+sp.goal+'!',`${h.team?.displayName} ${h.score} - ${a.score} ${a.team?.displayName}`);lastScores[id]=cur;
 const nm=c=>c.team?.displayName||c.athlete?.displayName||'?';
 const done=st.state==='post';
 return `<div class="card"><div class="m"><span class="muted">${sp.label} · <span class="${live?'live':done?'':''}">${live?'● ':''}${esc(st.shortDetail||st.detail||(done?'FT':''))}</span></span><span class="muted">🕒 ${esc(fmtKick(m.date))}</span></div>
 <div class="m" style="margin-top:6px"><div><b>${esc(nm(h))}</b><br><b>${esc(nm(a))}</b></div><div class="sc" style="${changed?'color:var(--r)':done?'opacity:.95':''}">${pre?'–':esc(h.score??'')+'<br>'+esc(a.score??'')}${done&&!pre?'<div class="muted" style="font-size:.75em;margin-top:2px">FT</div>':''}</div></div></div>`}
let lastList=[];
let browse=true;   // false right after Clear: show an empty state instead of the whole league
let loadSeq=0;   // a newer refresh always wins: a slow older one must never repaint over it
async function loadScores(){const my=++loadSeq,stEl=$('#status'),box=$('#matches'),tr=tracked(),pairs=new Set(),jobs=[];let f1Mode=null,ckNames=null,ckWhole=false;
 const consider=(sport,league,team)=>{const sp=spt(sport);
  if(sp.special==='f1')f1Mode=(league==='season'||f1Mode==='season')?'season':'latest';
  else if(sp.special==='cricket'){ckNames=ckNames||[];if(!team||team.startsWith('🌐'))ckWhole=true;else ckNames.push(team)}
  else if(league)pairs.add(sport+'|'+league);
  else if(sport==='soccer')MAJOR.forEach(l=>pairs.add('soccer|'+l));
  else if(sport==='rugby'&&SPORTS.rugby)SPORTS.rugby.leagues.forEach(L=>pairs.add('rugby|'+L[0]));
 };
 if(!tr.length&&!browse){lastList=[];box.innerHTML=`<div class="card"><b>Nothing is being tracked.</b><p class="muted">Pick a league above and tap teams to follow them, or <button class="chip" id="browsebtn">show all matches in ${esc(leagueName())}</button></p></div>`;stEl.textContent='';try{drawVideo()}catch{}if($('#dash').classList.contains('on'))drawDash();return}
 if(!tr.length)consider($('#sport').value,$('#league').value,'');else tr.forEach(e=>consider(e.sport,e.league,e.team));
 const ymd=d=>{const x=new Date(d);return x.getFullYear()+String(x.getMonth()+1).padStart(2,'0')+String(x.getDate()).padStart(2,'0')};
 const yday=ymd(Date.now()-864e5);
 [...pairs].forEach(p=>jobs.push({name:p.split('|')[1],run:async()=>{
  const[sport,lg]=p.split('|');
  // Current scoreboard + yesterday so finished matches from the last ~36h still appear with FT score
  const [cur,past]=await Promise.allSettled([
    espn(sport,lg,'scoreboard'),
    espn(sport,lg,'scoreboard','dates='+yday)
  ]);
  const seen=new Set(),out=[];
  for(const r of [cur,past]){
    if(r.status!=='fulfilled')continue;
    for(const e of (r.value.events||[])){
      if(e.id&&!seen.has(e.id)){seen.add(e.id);out.push({...e,_sport:sport,_league:lg})}
    }
  }
  return out;
 }}));
 if(f1Mode)jobs.push({name:'Formula 1',run:()=>f1Events(f1Mode)});
 if(ckNames)jobs.push({name:'Cricket',run:()=>cricketEvents(ckWhole||!ckNames.length?NATIONS:ckNames,ckWhole||!ckNames.length?10:6)});
 const res=await Promise.allSettled(jobs.map(j=>j.run()));if(my!==loadSeq)return;const ok=res.filter(r=>r.status==='fulfilled');
 if(!ok.length){stEl.textContent=navigator.onLine?'Could not reach the live data feed. Your tracked list is still saved — try Refresh when you are online.':'You are offline.';if(/loading…/.test(box.textContent))box.innerHTML='<p class="muted">Could not load scores right now. Check your connection, then press Refresh.</p>';return}
 const seen=new Set(),ev=[];ok.forEach(r=>r.value.forEach(e=>{if(e.id&&!seen.has(e.id)){seen.add(e.id);ev.push(e)}}));
 const list=filterEvents(ev,tr);lastList=list;
 box.innerHTML=(tr.length?'':`<p class="muted">Nothing tracked – showing all matches in ${esc(leagueName())}. Tap teams above to follow them.</p>`)+(list.length?list.map(card).join(''):`<p class="muted">${tr.length?'No live, upcoming or recent full-time results for what you track right now. Teams stay in the list above — scores appear when matches are scheduled or finished today/yesterday.':'No matches right now for this league.'}</p>`);
 const bad=res.map((r,i)=>r.status==='rejected'?jobs[i].name:null).filter(Boolean);
 stEl.textContent=`Updated ${new Date().toLocaleTimeString()}${bad.length?` (unreachable: ${bad.slice(0,4).join(', ')}${bad.length>4?'…':''})`:''}`;
 drawVideo();if($('#dash').classList.contains('on'))drawDash()}
$('#sport').onchange=()=>{browse=true;store.set('sport',$('#sport').value);fillLeagues();store.set('league',$('#league').value);loadTeams();loadScores()};
$('#league').onchange=()=>{browse=true;store.set('league',$('#league').value);loadTeams();loadScores()};
$('#tsearch').oninput=drawTeams;
$('#refresh').onclick=async()=>{const b=$('#refresh');b.disabled=true;b.textContent='Refreshing…';$('#status').textContent='Refreshing…';try{await loadScores();const bad=/Could not|offline/i.test($('#status').textContent);toast(bad?$('#status').textContent:`Refreshed ✓ ${lastList.length} match(es)`)}finally{b.disabled=false;b.textContent='Refresh'}};
let mon=store.get('monitor',true);const drawMon=()=>{$('#mon').textContent='Auto-refresh: '+(mon?'ON':'OFF');$('#mon').className=mon?'':'ghost'};drawMon();
$('#mon').onclick=()=>{mon=!mon;store.set('monitor',mon);drawMon()};
// ---- Video page: official, legal sources only ----
const SPORT_DEF={cricket:'current',f1:'latest'};
const officialFor=m=>OFFICIAL[m._league]||OFFICIAL[SPORT_DEF[m._sport]]||['Official site','https://www.google.com/search?q='+encodeURIComponent((m.name||'')+' official broadcaster')];
function drawVideo(){const el=$('#vlist');if(!el)return;const list=lastList.filter(m=>['in','pre'].includes(m.status?.type?.state)).sort((a,b)=>(b.status.type.state==='in')-(a.status.type.state==='in')||new Date(a.date)-new Date(b.date));
 el.innerHTML=list.length?list.map(m=>{const[n,u]=officialFor(m),[h,a]=comps(m),live=m.status.type.state==='in',title=m._sport==='f1'?m._race+' · '+m._session:`${h.team?.displayName||'?'} v ${a.team?.displayName||'?'}`;
  return `<div class="card"><div class="m"><span class="muted">${spt(m._sport).label} · <span class="${live?'live':''}">${live?'● LIVE':esc(fmtKick(m.date))}</span></span></div><b>${esc(title)}</b><br><a class="src" href="${esc(u)}" target="_blank" rel="noopener">▶ Watch on official source – ${esc(n)}</a></div>`}).join(''):'<p class="muted">No live or upcoming matches for what you track. Add teams on the Scores page.</p>';
 $('#vstatus').textContent=list.length?`${list.filter(m=>m.status.type.state==='in').length} live · ${list.length} total`:'';
 const codes=new Map();tracked().forEach(e=>{const c=spt(e.sport).special?SPORT_DEF[e.sport]:e.league;if(c&&OFFICIAL[c])codes.set(c,OFFICIAL[c])});if(!codes.size&&OFFICIAL[$('#league').value])codes.set($('#league').value,OFFICIAL[$('#league').value]);
 $('#vguide').innerHTML=[...codes.values()].map(([n,u])=>`<div class="card"><b>🏆 ${esc(n)}</b><br><span class="muted">Official league video portal</span><br><a class="src" href="${esc(u)}" target="_blank" rel="noopener">Open</a></div>`).join('')||'<p class="muted">Track a league or team to see its official broadcaster here.</p>'}
$('#vrefresh').onclick=()=>$('#refresh').click();
// ---- Dashboard ----
async function drawDash(){
 const t=tracked(),h=store.get('hist',[]),done=h.filter(x=>x.res),w=done.filter(x=>x.res==='won').length,live=lastList.filter(m=>m.status?.type?.state==='in').length,f=await findBase();
 let st;try{st=licStatus()}catch{st={state:'free'}}
 const planLabel=st.state==='licensed'?'Pro':st.state==='trial'?'Pro trial':'Free';
 const planSub=st.state==='trial'?(st.days_left+' day(s) left'):st.state==='licensed'?(st.expires?'until '+st.expires:'no expiry'):'enter a key in About';
 const hit=done.length?Math.round(w/done.length*100):null;
 $('#glance').innerHTML=[['Tracking',t.length,'teams / leagues'],['Live now',live,'in your tracked matches'],['Saved slips',h.length,hit!=null?hit+'% hit rate':'none settled yet'],['Plan',planLabel,planSub],['Form data',store.get('fdkey','')?'On':'Off','Football-Data key'],['Code loading',f?'Ready':'Page only',f?(f[0]==='/api'?'via server':'via local helper'):'needs the server']]
  .map(([a,b,c])=>`<div class="stat"><span class="muted">${a}</span><b>${b}</b><span class="muted">${c}</span></div>`).join('');
 // Hit-rate card on Home
 const hitEl=$('#dashhit');
 if(hitEl){
  if(done.length){hitEl.hidden=false;hitEl.innerHTML=`<b>Your settled results</b><div class="hit-big">${hit}%</div><p class="muted" style="margin:4px 0 0">${w} won · ${done.length-w} lost · ${done.length} settled (of ${h.length} saved). Estimates only — not a promise of future results.</p>`;}
  else{hitEl.hidden=false;hitEl.innerHTML=`<b>Your results</b><p class="muted" style="margin:6px 0 0">Save analyses from the Analyzer, then mark them <b>Won</b> or <b>Lost</b> in History. Your hit rate will show here.</p>`;}
 }
 // Promo / trial / free prompts
 const promo=$('#dashpromo');
 if(promo){
  let html='';
  if(st.state==='trial'&&st.days_left!=null&&st.days_left<=2){html=`<b style="color:var(--y)">Trial ending soon</b><p class="muted" style="margin:6px 0">Your Pro trial has ${st.days_left} day(s) left. Tracked teams and history stay either way. Unlock unlimited analyses with Pro.</p><button type="button" data-go="about" data-plans="1">See plans</button>`;}
  else if(st.state==='trial'&&st.days_left!=null&&st.days_left<=6){html=`<b>Pro trial active</b><p class="muted" style="margin:6px 0">${st.days_left} day(s) of full access left. After that MatchDesk continues on the Free plan (1 analysis/day).</p><button type="button" class="ghost" data-go="about" data-plans="1">View plans</button>`;}
  else if(st.state==='free'){const lic=st.ended==='license',ttl=lic?`Your Pro licence expired${st.expiredOn?' on '+st.expiredOn:''}`:st.ended==='trial'?'Your free trial has ended':'Free plan';
   html=`<b style="color:var(--o)">${ttl}</b><p class="muted" style="margin:6px 0">${st.ended?'You are now on the Free plan: ':''}${FREE_ANALYSES_PER_DAY} bet-slip analysis per day (${freeAnalysesLeft()} left today) and up to ${FREE_SAVED_SLIPS} saved slips. ${lic?'Renew Pro':'Upgrade to Pro'} for unlimited analyses.</p><button type="button" data-go="about" data-plans="1">${lic?'Renew Pro':'Upgrade to Pro'}</button>`;}
  else if(st.state==='licensed'&&st.days_left!=null&&st.days_left<=7){html=`<b style="color:var(--y)">Pro key expiring</b><p class="muted" style="margin:6px 0">${st.days_left} day(s) left on your key. Renew to keep unlimited analyses.</p><button type="button" data-go="about" data-plans="1">Renew / plans</button>`;}
  promo.hidden=!html;promo.innerHTML=html||'';
 }
 // Quick actions including Re-analyze last slip
 const act=$('#dashactions');
 if(act){
  const bits=[];
  const last=store.get('last_slip','');
  if(last)bits.push(`<button type="button" id="reanalyze">↻ Re-analyze last slip</button>`);
  bits.push(`<button type="button" class="ghost" data-go="analyzer">🎯 Analyzer</button>`);
  bits.push(`<button type="button" class="ghost" data-go="scores">⚽ Live Scores</button>`);
  if(h.some(x=>!x.res))bits.push(`<button type="button" class="ghost" data-go="history">📒 Settle slips</button>`);
  act.innerHTML=bits.join('');
 }
 try{drawPlanBar()}catch{}
}
function freeAnalysesLeft(){
 try{if(typeof isPro==='function'&&isPro())return '∞';
  const day=localISO(),u=store.get('usage',{}),slips=u.day===day?(u.slips||[]):[];
  return Math.max(0,(typeof FREE_ANALYSES_PER_DAY==='number'?FREE_ANALYSES_PER_DAY:1)-slips.length);
 }catch{return 1}
}
function drawPlanBar(){
 const bar=$('#planbar');if(!bar)return;
 try{
  const st=licStatus();let msg='';
  if(st.state==='trial')msg=`<span><b style="color:var(--y)">Pro trial:</b> ${st.days_left} day(s) left</span>`;
  else if(st.state==='licensed')msg=`<span><b>MatchDesk Pro</b>${st.expires?' · until '+st.expires:''}</span>`;
  else msg=`<span style="color:var(--o)"><b>${st.ended==='license'?'Licence expired':st.ended==='trial'?'Trial ended':'Free plan'}</b> · Free plan, ${freeAnalysesLeft()} analysis left today</span>`;
  bar.hidden=false;bar.innerHTML=msg+` <button type="button" class="ghost" id="planbar-go">${st.state==='free'?'Upgrade':'Plans'}</button>`;
  const go=$('#planbar-go');if(go)go.onclick=()=>{document.querySelector('nav [data-t=about]')?.click();setTimeout(()=>document.getElementById('plans-h')?.scrollIntoView(),60)};
 }catch{bar.hidden=true}
}


// ---------- analyzer: ported 1:1 from MatchDesk.py ----------
const MAX_COMBOS=20000,PAGE=15;
const MK=Object.entries({'1X2':'1X2','Double Chance':'Double Chance','BTTS (GG/NG)':'BTTS','BTTS':'BTTS','Both Teams To Score':'BTTS','Total':'Total','Over/Under':'Total','Handicap':'Handicap','Correct Score':'Correct Score','Draw No Bet':'Draw No Bet','DNB':'Draw No Bet','Corner 1X2':'Corner 1X2','Total Corners':'Total Corners','Exact Goals':'Exact Goals','Which Team To Score':'Team To Score'}).sort((a,b)=>b[0].length-a[0].length);
const MARGIN={'1X2':5,'Double Chance':5,'Total':4,'BTTS':5,'Handicap':4,'Draw No Bet':3,'Total Corners':5,'Corner 1X2':5};
function classify(t){const l=t.toLowerCase();for(const[k,n]of MK)if(l.includes(k.toLowerCase()))return n;
 if(/\b(over|under)\s*\d/.test(l))return 'Total';if(/match result|full time|to win/.test(l))return '1X2';return t.trim()||'Other'}
const nSub=l=>Math.max(1,(l.sub_legs||[]).length);
const adjF=l=>typeof l._form_adj==='number'?Math.max(.85,Math.min(1.12,1+l._form_adj)):1;
function fair(l){
 if(l.is_bab){if(l.odds<=1)return .35;const m=Math.min(.22,Math.max(.08,.03*nSub(l)+.05));return Math.max(.02,Math.min(.92,(1/l.odds)/(1+m)*adjF(l)))}
 return Math.max(.001,Math.min(.999,(l.odds>1?1/l.odds:0)/(1+(MARGIN[l.market]||5)/100)*adjF(l)))}
const marginPct=l=>l.is_bab?Math.min(22,Math.max(8,3*nSub(l)+5)):(MARGIN[l.market]||5);
function tier(p,o,n,m){const c=p*100*.45+Math.max(0,100-(n-1)*15)*.25+Math.max(0,100-m*4)*.15+Math.max(0,100-(o-1)*40)*.15;
 return c>=75?['LOW RISK','--g']:c>=60?['MEDIUM-LOW RISK','--l']:c>=45?['MEDIUM RISK','--y']:c>=30?['HIGH RISK','--o']:['VERY HIGH RISK','--r']}
const legRisk=p=>p>=.8?['LOW RISK','--g']:p>=.65?['MEDIUM-LOW RISK','--l']:p>=.5?['MEDIUM RISK','--y']:p>=.35?['HIGH RISK','--o']:['VERY HIGH RISK','--r'];

// Python rounds exact ties (like 1.625) to the even digit; JavaScript rounds them up. Match Python so every number reads identically.
{const tf=Number.prototype.toFixed;Number.prototype.toFixed=function(d){d=d||0;const x=this.valueOf();if(!isFinite(x)||d>40)return tf.call(x,d);
 const e=tf.call(Math.abs(x),Math.min(100,d+60)),dot=e.indexOf('.'),tail=e.slice(dot+1+d);
 if(/^50*$/.test(tail)){const digits=e.slice(0,dot+1+d).replace('.',''),t=BigInt(digits),r=Number(digits.slice(-1))%2===0?t:t+1n,s=r.toString().padStart(d+1,'0');
  return(x<0?'-':'')+(d?s.slice(0,-d)+'.'+s.slice(-d):s)}
 return tf.call(x,d)}}
function parseCrit(text){const raw=(text||'').trim(),low=raw.toLowerCase(),o={raw,kind:'other',side:null,line:null,market:null};let m;
 if(low.includes('double chance')){o.market='Double Chance';
  if(/\bor\s*draw\b/.test(low)||low.replace(/ /g,'').includes('1x')){if(/\b(home|1)\b/.test(low)||low.includes('draw'))o.kind='dc_team_or_draw';if(low.replace(/ /g,'').includes('12')||low.includes('home or away'))o.kind='dc_home_away'}
  if(/\b(x2|away\s*or\s*draw|draw\s*or\s*away)\b/.test(low))o.kind='dc_away_draw';
  if(/\b(1x|home\s*or\s*draw|draw\s*or\s*home)\b/.test(low))o.kind='dc_home_draw';
  m=low.match(/double chance:\s*(.+?)\s*[-–—]\s*or\s*draw/);if(m){o.kind='dc_team_or_draw';o.side=m[1].trim()}return o}
 if(low.includes('both teams to score')||low.includes('btts')||low.includes('gg/ng')){o.market='BTTS';
  if(/:\s*(no|ng)\b/.test(low)||/\b(no|ng)\s*$/.test(low))o.kind='btts_no';else if(/:\s*(yes|gg)\b/.test(low)||/\b(yes|gg)\s*$/.test(low))o.kind='btts_yes';else if(/\b(no|ng)\b/.test(low))o.kind='btts_no';else if(/\b(yes|gg)\b/.test(low))o.kind='btts_yes';
  if(/1st\s*half|first\s*half/.test(low))o.side='1h';else if(/2nd\s*half|second\s*half/.test(low))o.side='2h';return o}
 m=low.match(/(?:(?:1st|2nd|first|second)\s*half\s*[-–—]\s*)?([a-z][a-z0-9 .'#&]{2,}?)\s+total\s*:\s*(over|under)\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/);
 if(m&&!low.includes('corner')){const tb=m[1].trim().replace(/^[ \-–—.]+|[ \-–—.]+$/g,'');
  if(tb&&!tb.includes('half')&&!['total','goals','match','full time','ft'].includes(tb)&&/[a-z]{3,}/.test(tb)){o.market='Total';o.kind=m[2];o.line=parseFloat(m[3]);o.side='team:'+tb;return o}}
 m=low.match(/(?:(?:1st|2nd|first|second)\s*half[^:]*)?(?:total(?:\s*goals?)?)\s*:?\s*(over|under)\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/);
 if(!m)m=low.match(/\b(over|under)\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/);
 if(m&&!low.includes('corner')){o.market='Total';o.kind=m[1];o.line=parseFloat(m[2]);if(/1st\s*half|first\s*half/.test(low))o.side='1h';else if(/2nd\s*half|second\s*half/.test(low))o.side='2h';return o}
 if(low.includes('corner')){o.market='Total Corners';m=low.match(/\b(over|under)\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/);if(m){o.kind='corners_'+m[1];o.line=parseFloat(m[2])}return o}
 if(low.includes('highest scoring half')){o.market='Highest Scoring Half';if(/2nd|second/.test(low))o.kind='hsh_2h';else if(/1st|first/.test(low))o.kind='hsh_1h';return o}
 if(low.includes('win either half')){o.market='Win Either Half';o.kind='win_either_half';m=low.match(/^(.+?)\s+to\s+win either half/);if(m)o.side=m[1].trim();return o}
 if(/\b(match result|full time result|1x2|to win)\b/.test(low)||/^1x2\b/.test(low)){o.market='1X2';o.kind='win';
  if(/\bdraw\b/.test(low)||/(?:^|[\s:])x(?:\s|$)/.test(low)){o.kind='draw';o.side='draw'}
  else if(/\bhome\b/.test(low)||/(?:^|[\s:])1(?:\s|$)/.test(low)){o.kind='home';o.side='home'}
  else if(/\baway\b/.test(low)||/(?:^|[\s:])2(?:\s|$)/.test(low)){o.kind='away';o.side='away'}
  else{const after=(low.split(/[:\-–—]/).pop()||low).replace(/\b(to win|win|match result|full time|1x2|result)\b/g,'').trim();
   if(after&&after.length>=3&&!/^(home|away|draw|1|2|x)$/.test(after))o.side=after}
  return o}
 return o}

// Exact over rate for any line from stored per-match totals (home+away samples pooled)
function overRateFromTotals(hf,af,line){
  const arr=[...(hf&&hf.totals||[]),...(af&&af.totals||[])];
  if(arr.length<4)return null;
  // whole-number lines: push (exact = line) is a push/refund — count as neither over nor under for rate of "over landing"
  const over=arr.filter(t=>t>line).length, under=arr.filter(t=>t<line).length, push=arr.length-over-under;
  return{over_pct:over/arr.length*100, under_pct:under/arr.length*100, push_pct:push/arr.length*100, n:arr.length};
}
function evalCrit(c,hf,af,hn='',an=''){
 if(!c||c.kind==='other')return[null,'',0];hf=hf||{};af=af||{};
 if(!Object.keys(hf).length&&!Object.keys(af).length)return[null,'',0];
 if(Math.max(hf.played||0,af.played||0)<4)return[null,'',0];
 const kind=c.kind,line=c.line,avg=k=>{const v=[];if(hf[k]!=null)v.push(hf[k]);if(af[k]!=null)v.push(af[k]);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0};
 if((kind==='over'||kind==='under')&&line!=null&&[null,'1h','2h'].includes(c.side)){
  const pk={1.5:'over15_pct',2.5:'over25_pct',3.5:'over35_pct'}[line];
  const lb=`${kind==='over'?'Over':'Under'} ${line}`;
  if(pk){const a=avg(pk);
   if(kind==='over'){if(a>=58)return[true,`Form backs ${lb}: recent O${line} rate ~${a.toFixed(0)}%.`,.03];if(a<=35)return[false,`Form disagrees with ${lb}: recent O${line} rate only ~${a.toFixed(0)}%.`,-.04]}
   else{const u=100-a;if(u>=58)return[true,`Form backs ${lb}: recent U${line} rate ~${u.toFixed(0)}%.`,.03];if(u<=35)return[false,`Form disagrees with ${lb}: recent U${line} rate only ~${u.toFixed(0)}%.`,-.04]}
   return[null,'',0]}
  // Non-standard lines: exact rates from stored per-match totals when available
  const er=overRateFromTotals(hf,af,line);
  if(er){const a=er.over_pct,u=er.under_pct,pushNote=er.push_pct>=8?` (${er.push_pct.toFixed(0)}% pushed on exact ${line})`:'';
   if(kind==='over'){if(a>=58)return[true,`Form backs ${lb}: landed in ${a.toFixed(0)}% of ${er.n} recent games${pushNote}.`,.02];if(a<=32)return[false,`Form disagrees with ${lb}: only ${a.toFixed(0)}% of ${er.n} recent games${pushNote}.`,-.03]}
   else{if(u>=58)return[true,`Form backs ${lb}: under in ${u.toFixed(0)}% of ${er.n} recent games${pushNote}.`,.02];if(u<=32)return[false,`Form disagrees with ${lb}: under only ${u.toFixed(0)}% of ${er.n} recent games${pushNote}.`,-.03]}
   return[null,'',0]}
  // Fallback: avg goals only
  const t=avg('avg_total');if(t>0){
   if(kind==='under'&&line>=4.5&&t<=line-1.5)return[true,`Form backs Under ${line}: teams average only ${t.toFixed(1)} goals.`,.02];
   if(kind==='under'&&line>=4.5&&t>=line-.3)return[false,`Form questions Under ${line}: teams average ${t.toFixed(1)} goals.`,-.03];
   if(kind==='over'&&line<=1.5&&t>=2.4)return[true,`Form backs Over ${line}: teams average ${t.toFixed(1)} goals.`,.02]}
  return[null,'',0]}
 if((kind==='over'||kind==='under')&&typeof c.side==='string'&&c.side.startsWith('team:')){const tb=c.side.slice(5).trim();let use=null;const hl=hn.toLowerCase(),al=an.toLowerCase();
  if(hn&&tb&&hl.includes(tb))use=hf;else if(an&&tb&&al.includes(tb))use=af;
  else if(an&&tb.split(' ').some(w=>w.length>3&&al.includes(w)))use=af;else if(hn&&tb.split(' ').some(w=>w.length>3&&hl.includes(w)))use=hf;
  if(use&&use.avg_scored!=null&&line!=null){const a=use.avg_scored;
   if(kind==='under'&&a<=line-.3)return[true,`Form backs team Under ${line}: avg scored ${a.toFixed(1)}.`,.025];
   if(kind==='under'&&a>=line+.4)return[false,`Form disagrees with team Under ${line}: avg scored ${a.toFixed(1)}.`,-.035];
   if(kind==='over'&&a>=line+.3)return[true,`Form backs team Over ${line}: avg scored ${a.toFixed(1)}.`,.025];
   if(kind==='over'&&a<=line-.4)return[false,`Form disagrees with team Over ${line}: avg scored ${a.toFixed(1)}.`,-.035]}
  return[null,'',0]}
 if(kind==='btts_yes'||kind==='btts_no'){const a=avg('btts_pct');
  if(kind==='btts_yes'){if(a>=58)return[true,`Form backs BTTS Yes: recent BTTS rate ~${a.toFixed(0)}%.`,.03];if(a<=35)return[false,`Form disagrees with BTTS Yes: recent rate only ~${a.toFixed(0)}%.`,-.04]}
  else{const n=100-a;if(n>=55)return[true,`Form backs BTTS No: teams keep clean sheets / fail to score often (~${n.toFixed(0)}%).`,.03];if(n<=35)return[false,`Form disagrees with BTTS No: BTTS lands ~${a.toFixed(0)}% of the time.`,-.04]}
  return[null,'',0]}
 if(kind==='dc_team_or_draw'){const side=c.side||'';let use=null;
  if(side&&an&&side.split(' ').some(w=>w.length>3&&an.toLowerCase().includes(w)))use=af;else if(side&&hn&&side.split(' ').some(w=>w.length>3&&hn.toLowerCase().includes(w)))use=hf;else if(!side)return[null,'',0];
  if(use){const solid=(use.win_pct||0)+(use.draw_pct||0);
   if(solid>=65)return[true,`Form backs DC (team or draw): team avoids defeat ~${solid.toFixed(0)}% of recent games.`,.025];
   if(solid<=40)return[false,`Form questions DC (team or draw): team avoids defeat only ~${solid.toFixed(0)}%.`,-.03]}
  return[null,'',0]}
 if(['dc_home_draw','dc_away_draw','dc_home_away'].includes(kind))return[null,'',0];
 if(kind==='win_either_half'){let use=(c.side&&an&&an.toLowerCase().includes(c.side))?af:hf;if(!Object.keys(use).length)use=Object.keys(hf).length?hf:af;
  if(use&&use.avg_scored!=null){if(use.avg_scored>=1.4&&(use.win_pct||0)>=40)return[true,`Form mildly backs win-either-half: avg scored ${use.avg_scored.toFixed(1)}, win% ${(use.win_pct||0).toFixed(0)}.`,.015];
   if(use.avg_scored<=.7)return[false,`Form questions win-either-half: avg scored only ${use.avg_scored.toFixed(1)}.`,-.025]}
  return[null,'',0]}
 // 1X2 / win — information only (adj=0). Needs ≥6 matches; Mixed when signals conflict.
 if(kind==='win'||kind==='home'||kind==='away'||kind==='draw'){
  if(Math.min(hf.played||0,af.played||0)<6)return[null,'',0];
  const side=(c.side||'').toLowerCase().trim();
  if(kind==='draw'||side==='draw'||side==='x'){
   const dp=((hf.draw_pct||0)+(af.draw_pct||0))/2;
   if(dp>=34)return[true,`Form mildly backs a draw: recent draw rate ~${dp.toFixed(0)}% (small sample).`,0];
   if(dp<=16)return[false,`Form questions a draw: recent draw rate only ~${dp.toFixed(0)}%.`,0];
   return[null,'',0];
  }
  let use=null,label='';
  if(kind==='home'||side==='home'||side==='1'){use=hf;label=hn||'home'}
  else if(kind==='away'||side==='away'||side==='2'){use=af;label=an||'away'}
  else if(side){
   const hl=(hn||'').toLowerCase(),al=(an||'').toLowerCase();
   if(hl&&(hl.includes(side)||side.includes(hl.split(' ')[0]))){use=hf;label=hn}
   else if(al&&(al.includes(side)||side.includes(al.split(' ')[0]))){use=af;label=an}
   else{
    const toks=side.split(/\s+/).filter(w=>w.length>2);
    if(toks.some(w=>hl.includes(w))){use=hf;label=hn}
    else if(toks.some(w=>al.includes(w))){use=af;label=an}
   }
  }
  if(!use)return[null,'',0];
  const wp=use.win_pct||0, opp=use===hf?af:hf, owp=opp.win_pct||0;
  const edge=(use.avg_scored||0)-(use.avg_conceded||0), oedge=(opp.avg_scored||0)-(opp.avg_conceded||0);
  const strong=wp>=55&&wp>=owp+10, mild=wp>=48&&edge>=0.3&&edge>=oedge+0.2;
  const weak=wp<=28||(wp<=owp-12&&edge<=-0.3), poor=wp<=32&&edge<=-0.5;
  if(strong&&!weak)return[true,`Form leans ${label||'this side'}: win ${wp.toFixed(0)}% vs opp ${owp.toFixed(0)}% (last ${use.played} games — noisy).`,0];
  if(mild&&!weak&&!poor)return[true,`Form mildly leans ${label||'this side'}: win ${wp.toFixed(0)}%, goal edge ${edge>=0?'+':''}${edge.toFixed(1)}.`,0];
  if((weak||poor)&&!strong)return[false,`Form questions ${label||'this side'}: win only ${wp.toFixed(0)}% (opp ${owp.toFixed(0)}%).`,0];
  if((strong||mild)&&(weak||poor))return[null,`Form mixed for ${label||'this side'}: win ${wp.toFixed(0)}% but other signals conflict.`,0];
  return[null,'',0]}
 return[null,'',0]}
function legKind(l){for(const c of l._criteria||[]){if((c.kind==='over'||c.kind==='under')&&c.line!=null)return[c.kind,c.line];if(c.kind==='btts_yes'||c.kind==='btts_no')return[c.kind,null]}
 const sel=(l.sel||'').toLowerCase().trim(),m=sel.match(/\b(over|under)\s*(\d+(?:.\d+)?)/);if(m)return[m[1],parseFloat(m[2])];
 if(l.market==='BTTS'||sel.includes('both teams to score')){if(/\b(yes|gg)\b/.test(sel))return['btts_yes',null];if(/\b(no|ng)\b/.test(sel))return['btts_no',null]}return null}
function formCross(l){const S=l._form_support||[],F=l._form_flags||[];if(S.length||F.length)return F.length?[false,F[0]]:[true,S[0]];
 const hf=l.home_form,af=l.away_form;if(!hf||!af)return[null,''];if(Math.min(hf.played||0,af.played||0)<5)return[null,''];
 const k=legKind(l);if(!k)return[null,''];const[kind,line]=k,tag=`${l.sel||''} (${l.match||''})`;
 if(kind==='over'||kind==='under'){
  const pk={1.5:'over15_pct',2.5:'over25_pct',3.5:'over35_pct'}[line];
  let a=null;
  if(pk)a=((hf[pk]||0)+(af[pk]||0))/2;
  else{const er=overRateFromTotals(hf,af,line);if(er)a=er.over_pct}
  if(a==null)return[null,''];
  if(kind==='over'){if(a>=58)return[true,`Recent form backs ${tag}: O${line} rate ~${a.toFixed(0)}%.`];if(a<=35)return[false,`Recent form disagrees with ${tag}: O${line} rate only ~${a.toFixed(0)}%.`]}
  else{const u=100-a;if(u>=58)return[true,`Recent form backs ${tag}: U${line} rate ~${u.toFixed(0)}%.`];if(u<=35)return[false,`Recent form disagrees with ${tag}: U${line} rate only ~${u.toFixed(0)}%.`]}
  return[null,'']}
 const a=((hf.btts_pct||0)+(af.btts_pct||0))/2;
 if(kind==='btts_yes'){if(a>=58)return[true,`Recent form backs ${tag}: BTTS rate ~${a.toFixed(0)}%.`];if(a<=35)return[false,`Recent form disagrees with ${tag}: BTTS rate only ~${a.toFixed(0)}%.`]}
 else{if(a<=40)return[true,`Recent form backs ${tag}: BTTS only ~${a.toFixed(0)}%.`];if(a>=65)return[false,`Recent form disagrees with ${tag}: BTTS rate ~${a.toFixed(0)}%.`]}
 return[null,'']}
function corrNotes(legs){
 const by={},notes=[];
 for(const l of legs){const k=(l.match||'').trim().toLowerCase();if(!k||k==='unknown')continue;(by[k]=by[k]||[]).push(l)}
 for(const g of Object.values(by)){
  if(g.length<2&&!g.some(x=>x.is_bab))continue;
  let ms=[];for(const x of g){if(x.is_bab)for(const c of x._criteria||[])ms.push((c.market||c.kind||'').toLowerCase());else ms.push((x.market||'').toLowerCase())}
  ms=ms.filter(Boolean);
  if(g.length>=2)notes.push(`Multiple legs from the same match (${g[0].match}) — outcomes are correlated; combined % is optimistic.`);
  if(ms.some(m=>m.includes('btts'))&&ms.some(m=>['total','over','under'].includes(m)||m.includes('total')))notes.push('BTTS + Totals on the same match move together (both depend on goals).');
  if(ms.some(m=>m.includes('double'))&&ms.some(m=>m==='1x2'||m==='win'))notes.push('Double Chance + 1X2 on the same match overlap heavily.')}
 return [...new Set(notes)]}
function analyze(legs,odds,prob,margin,target){
 const re=[`${legs.length} leg(s) combined at ${odds.toFixed(2)} odds (target ${target.toFixed(2)}).`],st=[],fl=[],mk=legs.map(l=>l.market);
 for(const l of legs.filter(x=>x.is_bab)){const n=(l.sub_legs||[]).length;
  re.push(`Build-a-Bet with ${n} sub-criteria on ${l.match||'Unknown'} — evaluated as one combined leg (margin scales with sub-leg count).`);
  if(n>=6)fl.push(`Build-a-Bet has ${n} sub-legs — many correlated outcomes; one miss voids the whole price.`);
  else if(n>=4)fl.push('Build-a-Bet sub-legs compound margin and are correlated.')
  for(const x of (l._form_support||[]).slice(0,4))st.push(x);for(const x of (l._form_flags||[]).slice(0,4))fl.push(x);
  const kinds=[...new Set((l._criteria||[]).map(c=>c.kind).filter(k=>k&&k!=='other'))].sort();if(kinds.length)re.push('Sub-criteria: '+kinds.join(', ')+'.')}
 if(mk.includes('Total'))re.push('Contains a Total goals market — often lands in the safest band.');
 if(mk.includes('Double Chance'))re.push('Contains a Double Chance — structurally safer than straight 1X2.');
 if(mk.every(m=>m==='1X2'))re.push('All legs are straight 1X2 — the highest-variance market type.');
 const pc=prob*100;
 re.push(pc>=70?`Fair probability ${pc.toFixed(1)}% — high confidence.`:pc>=50?`Fair probability ${pc.toFixed(1)}% — reasonable but not bulletproof.`:pc>=30?`Fair probability ${pc.toFixed(1)}% — medium risk.`:`Fair probability ${pc.toFixed(1)}% — low probability.`);
 re.push(`Total margin ${margin.toFixed(1)}% — the tax on multi-leg structure.`);
 if(legs.some(l=>l.odds<=1.2))st.push('Contains a very short-priced leg (≤1.20).');
 if(mk.includes('Double Chance'))st.push('Double Chance covers two outcomes.');
 if(mk.includes('Total'))st.push('Totals are more predictable than 1X2.');
 if(legs.length===1)st.push('Single-leg — no compounding margin.');
 if(prob>=.65)st.push(`Fair probability ${(prob*100).toFixed(0)}% above break-even.`);
 if(legs.length>=4)fl.push(`${legs.length} legs — margin compounds and variance explodes.`);
 if(margin>15)fl.push(`Total margin ${margin.toFixed(1)}% is high.`);
 if(mk.includes('1X2')&&legs.length>=3)fl.push('Multiple 1X2 legs — one draw kills the slip.');
 if(legs.some(l=>l.odds>=2))fl.push('Contains a leg at 2.00+ — bookmaker sees it as a coin flip.');
 if(prob<.3)fl.push(`Fair probability under 30% — you'll lose roughly ${(100-prob*100).toFixed(0)} times out of 100.`);
 if(legs.length===1&&odds>=1.8)fl.push('Single leg at high odds — no safety net.');
 const seen={};for(const l of legs){const m=(l.match||'').trim().toLowerCase();if(m&&m!=='unknown'&&!l.is_bab)seen[m]=(seen[m]||0)+1}
 if(Object.values(seen).some(c=>c>1))fl.push('Two or more legs come from the SAME match — they are correlated, so the combined probability shown is only rough.');
 for(const n of corrNotes(legs))if(!fl.includes(n))fl.push(n);
 for(const l of legs){if(l.is_bab)continue;for(const x of (l._form_support||[]))if(!st.includes(x))st.push(x);for(const x of (l._form_flags||[]))if(!fl.includes(x))fl.push(x);
  if(!(l._form_support||[]).length&&!(l._form_flags||[]).length){const[ok,t]=formCross(l);if(ok===true&&!st.includes(t))st.push(t);else if(ok===false&&!fl.includes(t))fl.push(t)}}
 if(!fl.length)fl.push(`No obvious structural red flags, but at ${(prob*100).toFixed(0)}% you'll still lose ~${(100-prob*100).toFixed(0)} times out of 100.`);
 if(mk.includes('1X2'))fl.push('1X2 legs are affected by draws (~25% of matches).');
 return[re,st,fl]}
function combos(legs,target){
 const u=legs.filter(l=>l.odds>1&&l.odds<=target+1e-9).sort((a,b)=>a.odds-b.odds),raw=[];
 (function dfs(s,ch,co){if(raw.length>=MAX_COMBOS)return;if(ch.length)raw.push([ch.slice(),co]);
  for(let i=s;i<u.length;i++){const n=co*u[i].odds;if(n>target+1e-9)break;ch.push(u[i]);dfs(i+1,ch,n);ch.pop()}})(0,[],1);
 const res=raw.map(([c,co])=>{let p=1,g=1;c.forEach(l=>{p*=fair(l);g*=1+marginPct(l)/100});
  const ms=(g-1)*100,[re,st,fl]=analyze(c,co,p,ms,target),[t,col]=tier(p,co,c.length,ms);
  return{legs:c,odds:co,prob:p,margin:ms,n:c.length,re,st,fl,t,col}});
 const by={};res.forEach(r=>(by[r.n]=by[r.n]||[]).push(r));Object.values(by).forEach(a=>a.sort((x,y)=>y.prob-x.prob));
 const ks=Object.keys(by).map(Number).sort((a,b)=>a-b),mx=Math.max(0,...ks.map(k=>by[k].length)),out=[];
 for(let i=0;i<mx;i++)for(const k of ks)if(i<by[k].length)out.push(by[k][i]);return out}
function weakest(legs){
 for(const l of legs){if(l.is_bab)continue;if(l.odds>=2)return `Longer-priced leg @ ${l.odds.toFixed(2)}: ${l.sel}`}
 const p=[...legs].sort((a,b)=>b.odds-a.odds)[0];return p&&p.odds>1.01?`Highest-priced leg @ ${p.odds.toFixed(2)}: ${p.sel||p.match}`:''}

// ---- Betway-style "name / odds / details" reader, ported from MatchDesk.py ----
const FOOT=['total odds','multibet','potential','stake','place bet','bet saver','win boost','payout','returns','cash out','accept odds','boost','min odds'];
const isFoot=l=>FOOT.some(w=>l.toLowerCase().includes(w));
const ODDS_RE=/^\d+\.\d+$/,MATCH_RE=/^.+?\s+(?:-|–|—|vs\.?|v\.?)\s+.+$/i;
const KICK_RE=/^(today|tomorrow|\d{2}\/\d{2}|\w+day|\d{1,2}\s+[a-z]{3,9}\s+\d{4}).*/i;
const TAB_RE=/^(?:lucky\s*\d{1,2}|\d{1,2}\s*[-\s]?\s*(?:folds?|selections?|legs?|bets?|picks?)|(?:single|double|treble|accumulator|acca|multiple|multi|system|combination|combined|fourfold|fivefold|sixfold|sevenfold|eightfold|yankee|canadian|heinz|goliath|patent|trixie|flag|fold)s?|(?:four|five|six|seven|eight|nine|ten)\s*folds?|round\s*robin|bet\s*slip|betslip|bet\s*builder)\s*(?:\(\s*\d+\s*\))?$/i;
const UPW=new Set(['1up','2up','3up','4up','5up','1 up','2 up','3 up','4 up','5 up','up','ht','ft','ep','today','tonight','tomorrow','tmrw','live','match underway']);
const isTab=l=>{const s=l.trim();if(!s||s.length>40)return false;const lo=s.toLowerCase();
 if(['double chance','bet builder','build a bet','build-a-bet'].includes(lo))return false;
 const p=lo.split(/\s*[/&+,]\s*/).filter(Boolean);if(p.length>1&&p.every(x=>TAB_RE.test(x)))return true;return TAB_RE.test(s)};
const isUp=l=>{const t=l.trim().toLowerCase();return UPW.has(t)||/^\d{1,2}\s*up\b(?:\s*\(?\s*ep\s*\)?)?$/.test(t)||/^\d{1,2}:\d{2}(?:\s*(am|pm))?$/.test(t)||/^(today|tonight|tomorrow|tmrw|mon|tue|wed|thu|fri|sat|sun)\w*(\s+\d{1,2}[:.]\d{2})?\s*$/.test(t)};
function cleanBetway(t){return t.replace(/\[([^\]]+)\]\(\s*https?:\/\/[^)]*\)/g,'$1').replace(/https?:\/\/\S+/g,'').replace(/<[^>]+>/g,'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
function stripTabs(L){const o=[];for(let i=0;i<L.length;){
 if(!isTab(L[i])){o.push(L[i++]);continue}
 if(i+1<L.length&&ODDS_RE.test(L[i+1])){const n=L[i+2]||'',af=L[i+3]||'';
  const nsel=n&&!ODDS_RE.test(n)&&!isTab(n)&&!MATCH_RE.test(n)&&!KICK_RE.test(n)&&!isFoot(n);
  if(nsel&&!(af&&ODDS_RE.test(af))){o.push(n,L[i+1]);i+=3}else i+=2;continue}
 i++}return o}
function splitInline(L){const re=/^(.*?[A-Za-z]{2}.*?)\s+(\d{1,3}\.\d{2})((?:\s+\S{1,3}){0,2})\s*$/;
 return L.flatMap(l=>{const m=l.match(re);return m&&!isFoot(l)&&!KICK_RE.test(l)&&!/\d/.test(m[3]||'')&&parseFloat(m[2])>1?[m[1].trim(),m[2]]:[l]})}
function defMarket(sel){const s=sel.toLowerCase();if(/\bor\b/.test(s)||['1x','x2','12'].includes(s))return 'Double Chance';
 if(s.startsWith('over ')||s.startsWith('under '))return 'Total';if(['yes','no','gg','ng'].includes(s))return 'BTTS';return '1X2'}
const BABW=['build a bet','build-a-bet','bet builder'];
function anchored(L){
 const an=[];L.forEach((l,i)=>{if(i===0||!ODDS_RE.test(l))return;const v=parseFloat(l),h=L[i-1];
  if(v<=1||isFoot(h)||ODDS_RE.test(h))return;an.push([i,v,h])});
 if(!an.length||an.some(a=>a[2].includes(':')))return null;
 return an.map(([i,v,h],k)=>{const end=k+1<an.length?an[k+1][0]-1:L.length,body=[];
  for(const l of L.slice(i+1,end)){if(isFoot(l))break;body.push(l)}
  const bab=body.some(b=>BABW.includes(b.toLowerCase().trim()))||(MATCH_RE.test(h)&&body.filter(b=>b.includes(':')).length>=2);
  if(bab)return{sel:h,odds:v,market:'Build a Bet',match:h,sub_legs:body.filter(b=>!BABW.includes(b.toLowerCase().trim())&&!KICK_RE.test(b)),is_bab:true};
  let match=null,market=null;
  for(const l of body){
   if(match===null&&l.includes(' - ')&&!/^(total|over|under)/i.test(l)){match=l;continue}
   if(market===null&&MK.some(([k])=>l.toLowerCase().includes(k.toLowerCase()))){market=classify(l)}}
  return{sel:h,odds:v,market:market||defMarket(h),match:match||'Unknown',sub_legs:[],is_bab:false}})}
function junk(l){if(l.is_bab)return false;const s=l.sel.replace(/[\s:]+$/,'').trim();
 return isTab(s)||isUp(s)||KICK_RE.test(s)||isFoot(s)||(s.replace(/[^A-Za-z]/g,'').length<2&&l.match==='Unknown')}
// ---- SA bookmaker parsers, ported from MatchDesk.py ----
const toF=x=>{if(x==null)return null;const t=String(x).trim().replace(',','.').replace(/^[@xX×]\s*/,'').replace(/\s*[xX×]$/,'');const v=parseFloat(t);return /^\d+(\.\d+)?$/.test(t)&&v>1?v:null};
const toHW=x=>{if(x==null)return null;let t=String(x).trim().replace(',','.').replace(/^[@xX×]\s*/,'').replace(/\s*[xX×●•]$/,'');if(/^\.\d+$/.test(t))t='0'+t;const v=parseFloat(t);if(!/^\d+(\.\d+)?$/.test(t)||v<=0||v>500)return null;return v<=1?+(v+1).toFixed(2):v};
const lines0=t=>t.replace(/\r\n?/g,'\n').split('\n').map(l=>l.replace(/[ \t]+/g,' ').trim()).filter(Boolean);
const mkLeg=(o,b)=>({sub_legs:[],is_bab:false,bookmaker:b,...o});
const HWB_MK='full\\s*time(?:\\s*result)?|match\\s*result|match\\s*winner|1x2|double\\s*chance|draw\\s*no\\s*bet|dnb|total(?:\\s*goals|\\s*corners)?|over|under|btts|both\\s*teams(?:\\s*to\\s*score)?|handicap|asian\\s*handicap|correct\\s*score|half\\s*time|1st\\s*half|2nd\\s*half|win\\s*to\\s*nil|clean\\s*sheet|to\\s*score|odd\\/?even|exact\\s*goals|which\\s*team\\s*to\\s*score|home\\s*or\\s*draw|away\\s*or\\s*draw';
function hwbNormFix(s){return String(s||'').replace(/^[‘’'"`]+/,'').replace(/[‘’'"`,]+$/,'').replace(/\s+vs\.?\s+/i,' - ').replace(/\s+v\.?\s+/i,' - ').replace(/\s+[-–—]\s+/g,' - ').trim()}
function hwbIsFix(l){if(!l)return false;if(/^(over|under|total|handicap)\b/i.test(l))return false;return /\s(?:vs\.?|v\.?)\s/i.test(l)||/\s[-–—]\s/.test(l)}
function hwbIsDate(l){if(hwbIsPrice(l))return false;return/\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(l)||/\d{4}\s*\|/.test(l)||/^\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?(\s+\d{1,2}:\d{2})?$/.test(l)||/^\d{1,2}:\d{2}(\s*(am|pm))?$/i.test(l)}
function hwbIsPrice(l){const t=String(l||'').trim();return/^(?:[@x×]?\s*)(?:\d{1,3}[.,]\d{2}|\.\d{2})\s*[x×●•]?$/i.test(t)}
function hwbGoalLine(v){return v===0.5||v===1.5||v===2.5||v===3.5||v===4.5||v===5.5}
function hwbFlatten(text){
 const raw=lines0(text).filter(l=>!['×','x','X','•','●'].includes(l));
 const joined=[];
 for(let i=0;i<raw.length;i++){
  if(i+2<raw.length&&/^(?:vs\.?|v\.?)$/i.test(raw[i+1])&&/[A-Za-z]{2}/.test(raw[i])&&/[A-Za-z]{2}/.test(raw[i+2])){
   joined.push(raw[i]+' vs '+raw[i+2]);i+=2;continue}
  if(i+1<raw.length&&/^(?:vs\.?|v\.?)\s+\S/i.test(raw[i+1])&&/[A-Za-z]{2}/.test(raw[i])&&!hwbIsFix(raw[i])){
   joined.push(raw[i]+' '+raw[i+1]);i++;continue}
  joined.push(raw[i]);
 }
 const lead=new RegExp('^('+HWB_MK+')\\s*[-–—:]\\s*(.+)$','i');
 const mkOnly=new RegExp('^('+HWB_MK+')$','i');
 const foot=/^(multiple(?:\s+accumulator)?|accumulator|bonus|final\s*odds|total\s*odds|stake|potential|payout|simulate|real\b|bet\s*now|place\s*bet)/i;
 const out=[];
 for(const orig of joined){
  let line=orig.replace(/[‐‑‒–—]/g,'-');
  if(foot.test(line)&&out.length)break;
  if(hwbIsDate(line))continue;
  let rest=line;
  const mashed=rest.match(new RegExp('^('+HWB_MK+')\\s*[-–—:]\\s*(.+)$','i'));
  if(mashed){
   let pick=mashed[2].trim(),odds=null,fix=null;
   const pm=pick.match(/^(.*?)\s+(\d{0,3}[.,]\d{2}|\.\d{2})\s*[x×●•]?\s*(.*)$/i);
   if(pm&&!(hwbGoalLine(parseFloat(String(pm[2]).replace(',','.')))&&/over|under|total/i.test(mashed[1]+' '+pick))){pick=pm[1].trim();odds=pm[2];fix=(pm[3]||'').trim()}
   out.push(mashed[1].trim()+' - '+pick);
   if(odds)out.push(odds);
   if(fix){if(hwbIsFix(fix))out.push(hwbNormFix(fix));else if(fix)out.push(fix)}
   continue;
  }
  const tail=rest.match(/^(.*[A-Za-z].*?)\s+(\d{0,3}[.,]\d{2}|\.\d{2})\s*[x×●•]?\s*$/);
  if(tail&&!hwbIsFix(rest)&&!mkOnly.test(rest)){out.push(tail[1].trim());out.push(tail[2]);continue}
  const fx=rest.match(/^(.*?)(\S.{1,40}?\s+(?:vs\.?|v\.?)\s+\S.{1,40})$/i);
  if(fx&&fx[1].trim()&&lead.test(fx[1].trim())){out.push(fx[1].trim());out.push(hwbNormFix(fx[2]));continue}
  out.push(line);
 }
 return out;
}
function parseHWB(text){
 const L=hwbFlatten(text),legs=[];
 const lead=new RegExp('^('+HWB_MK+')\\s*[-–—:]\\s*(.+)$','i');
 const mkOnly=new RegExp('^('+HWB_MK+')$','i');
 const foot=/^(multiple(?:\s+accumulator)?|accumulator|bonus|final\s*odds|total\s*odds|stake|potential|payout|simulate|real\b|bet\s*now|place\s*bet)/i;
 const starts=[];
 for(let i=0;i<L.length;i++){
  if(lead.test(L[i])||mkOnly.test(L[i]))starts.push(i);
 }
 const takeBlock=(i,end)=>{
  const h=L[i].match(lead); let marketName,pick=null,odds=null,match=null;
  if(h){marketName=h[1].trim();pick=h[2].trim();
   const inline=pick.match(/^(.*?)\s+(\d{0,3}[.,]\d{2}|\.\d{2})\s*[x×●•]?$/i);
   if(inline){pick=inline[1].trim();odds=toHW(inline[2]);}
  }else{const m=L[i].match(mkOnly);if(!m)return null;marketName=m[1].trim()}
  for(let j=i+1;j<end;j++){
   const line=L[j];
   if(foot.test(line))break;
   if(!odds&&hwbIsPrice(line)){
    const o=toHW(line);
    if(o!=null&&!(hwbGoalLine(o)&&/total|over|under/i.test(marketName+(pick||''))))odds=o;
    continue}
   if(hwbIsDate(line))continue;
   if(!match&&hwbIsFix(line)){match=hwbNormFix(line);continue}
   if(!pick&&!hwbIsFix(line)&&!hwbIsPrice(line)&&!mkOnly.test(line)&&!lead.test(line)){pick=line;continue}
  }
  if(!match){
   for(let j=i-1;j>=Math.max(0,i-6);j--){
    if(lead.test(L[j])||mkOnly.test(L[j]))break;
    if(hwbIsFix(L[j])){match=hwbNormFix(L[j]);break}
   }
  }
  if(!pick)pick=marketName;
  if(!pick||odds==null)return null;
  const fixture=match||'Unknown',pair=fixture==='Unknown'?[null,null]:fixture.split(/\s+(?:-|–|—|vs\.?|v\.?)\s+/i);
  return mkLeg({sel:pick,odds,market:classify(marketName)||'1X2',match:fixture,
   home_team:pair&&pair.length>=2?pair[0].trim():null,
   away_team:pair&&pair.length>=2?pair.slice(1).join(' - ').trim():null},'Hollywoodbets');
 };
 for(let s=0;s<starts.length;s++){
  const end=s+1<starts.length?starts[s+1]:L.length;
  const leg=takeBlock(starts[s],end);
  if(leg)legs.push(leg);
 }
 if(legs.length>=2){
  for(let i=0;i<legs.length;i++){
   if(legs[i].match&&legs[i].match!=='Unknown')continue;
   const nxt=legs.slice(i+1).find(x=>x.match&&x.match!=='Unknown');
   const prv=legs.slice(0,i).reverse().find(x=>x.match&&x.match!=='Unknown');
   if(nxt&&(!prv||i===0))legs[i].match=nxt.match;
   else if(prv)legs[i].match=prv.match;
  }
 }
 const named=legs.filter(l=>l.match&&l.match!=='Unknown');
 if(named.length>=1&&legs.length>named.length){
  const unused=named.map(l=>l.match);
  legs.forEach((l,i)=>{if(l.match==='Unknown'&&unused[i])l.match=unused[i]});
 }
 const seen=new Set(),uniq=[];
 for(const l of legs){const k=(l.match||'')+'|'+(l.sel||'')+'|'+(l.odds||'');if(seen.has(k))continue;seen.add(k);uniq.push(l)}
 return uniq.length?uniq:null;
}
function sim(a,b){a=a.toLowerCase().replace(/[^a-z0-9]/g,'');b=b.toLowerCase().replace(/[^a-z0-9]/g,'');if(!a||!b)return 0;
 const d=Array.from({length:a.length+1},(_,i)=>[i,...Array(b.length).fill(0)]);for(let j=1;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
 return 1-d[a.length][b.length]/Math.max(a.length,b.length)}
function parse10Bet(text){
 const L=lines0(text),legs=[],dre=/^\d{4}-\d{2}-\d{2}/,mre=/^(1x2|draw\s*no\s*bet|double\s*chance|btts|both\s*teams(?:\s*to\s*score)?|total(?:\s*goals|\s*corners)?|over|under|match\s*result|match\s*winner|handicap|asian\s*handicap|correct\s*score|full\s*time|half\s*time|to\s*score|clean\s*sheet)$/i,sre=/^(multibet|total\s*odds|add\s*\d|amount|potential|r\s*\d|stake|betslip|single|multiple|combined)/i;
 for(let i=0;i<L.length;){let ms=i;if(dre.test(L[i]))ms=i+1;if(ms>=L.length)break;
  if(!mre.test(L[ms])){i++;continue}
  const market=classify(L[ms])||L[ms];let j=ms+1;if(j>=L.length)break;
  const sl=L[j],mo=sl.match(/(\d{1,4}[.,]\d{1,3})\s*$/),sp=mo?sl.slice(0,mo.index).trim():'';let odds=null,sel;
  if(mo&&sp&&toF(mo[1])&&!/\b(over|under|total|handicap|goals?|corners?|exact|asian|spread)\b\s*[-–—]?\s*$/i.test(sp)){odds=toF(mo[1]);sel=sp;j++}
  else{sel=sl;j++;if(j<L.length){odds=toF(L[j]);if(odds!=null)j++}}
  const ok=k=>k<L.length&&!dre.test(L[k])&&!mre.test(L[k])&&!sre.test(L[k]);let h=null,a=null;
  if(ok(j))h=L[j++];if(ok(j))a=L[j++];
  if(h&&a&&/^(1x2|draw\s*no\s*bet)$/i.test(L[ms])){const sh=sim(sel,h),sa=sim(sel,a);if(Math.max(sh,sa)>=.35){if(sh>=sa)h=sel;else a=sel}} // the pick IS one of the two teams and is read more reliably
  legs.push(mkLeg({sel,odds:odds??0,market,match:h&&a?`${h} - ${a}`:(h||'Unknown')},'10Bet'));i=Math.max(j,ms+1)}
 return legs.length?legs:null}
function parseSupa(text){
 const L=lines0(text),legs=[];
 const mk=/^(1x2|draw\s*no\s*bet|double\s*chance|match\s*result|total(?:\s*\([^)]+\))?|over|under|btts)(?:\s*[:\-]\s*|\s+)(.*)$/i,
 skip=/^(amount|odds|bonus|pot\.?\s*winnings|your free|single|multiple|combined\s*multiple|combined|betslip|bet\s*slip|reset|r\s*\d|1\s*up|2\s*up|3\s*up|xop|xep|oddo|odd[so]?)\b/i,up=/^(?:[xX]?[eo]?p?\s*)?(?:\d\s*up[\s/]*)+$/i;
 const oe=s=>{const m=(s||'').match(/(?<!\d)(\d{1,3}[.,]\d{2})\s*$/);if(!m){const m3=(s||'').match(/(?<!\d)(\d{3})\s*$/);if(m3&&+m3[1]>=101){const v=toF(m3[1][0]+'.'+m3[1].slice(1));if(v!=null)return[v,s.slice(0,m3.index).trim()]}return[null,s]}const v=toF(m[1]);return v==null?[null,s]:[v,s.slice(0,m.index).trim()]};
 const HA={'1':'Home','2':'Away','X':'Draw','x':'Draw'};
 for(let i=0;i<L.length;){const ln=L[i];if(skip.test(ln)||up.test(ln)){i++;continue}
  if((ln.includes(' - ')||/ vs /i.test(ln))&&!mk.test(ln)){
   let match=ln.replace(/\s+vs\s+/i,' - ').replace(/\s+v\s+/i,' - ');const om=match.match(/\s+(1x2|draw\s*no\s*bet|total|over|under|btts)\b.*$/i);if(om)match=match.slice(0,om.index).trim();
   let j=i+1,market='1X2',sel='',odds=null;while(j<L.length&&(up.test(L[j])||skip.test(L[j])))j++;
   if(j<L.length){const c=L[j],jm=c.match(/^(1x2)\s?([12x])\s+(\d{1,3}(?:[.,]\d{2})?)\b/i);
    if(jm){sel=HA[jm[2]]||jm[2];let ro=jm[3];if(/^\d{3}$/.test(ro)&&+ro>=101)ro=ro[0]+'.'+ro.slice(1);odds=toF(ro);j++}
    else{const[oi,cb]=oe(c),mm=(oi!=null?cb:c).match(mk);
     if(!mm){if(oi!=null&&!/[A-Za-z]{3,}/.test(cb||'')){odds=oi;sel='Home';j++}else if(toF(c)!=null){odds=toF(c);sel='Home';j++}}
     if(mm){market=classify(mm[1])||mm[1];let rest=(mm[2]||'').trim();if(oi!=null)odds=oi;const[o2,r2]=oe(rest);if(o2!=null){if(odds==null)odds=o2;rest=r2}
      if(/\b(over|under)\b/i.test(rest))sel=rest||market;else{const p=rest?rest.split(' '):[];if(p.length){const mb=toF(p[p.length-1]);if(mb!=null&&p.length>=2&&odds==null){odds=mb;sel=p.slice(0,-1).join(' ')}else sel=rest}}
      j++}}
    if(odds==null&&j<L.length){if(up.test(L[j])||skip.test(L[j]))j++;if(j<L.length){const[o3]=oe(L[j]);if(o3!=null){odds=o3;j++}else{odds=toF(L[j]);if(odds!=null)j++}}}}
   if(!sel)sel='Home';if(HA[sel.trim()])sel=HA[sel.trim()];if(/^[\d\s.]+$/.test(sel)&&!/over|under|home|away|draw/i.test(sel))sel='Home';
   if(odds==null||odds<=1){i=Math.max(j,i+1);continue}
   legs.push(mkLeg({sel,odds,market,match},'Supabets'));i=Math.max(j,i+1);continue}
  i++}
 return legs.length?legs:null}
function parseSporting(text){
 const sk=new Set(['single','multiple','combined','betslip','bet slip','treble','double','my bets','view legs','ep','xep']);
 const L=lines0(text).filter(ln=>{const lo=ln.toLowerCase().trim();
  if(sk.has(lo)||/^(legs?\s*selected|amount|your free|returns?|\+\d+%)/i.test(lo)||/^\d+\s*legs?\s*selected/i.test(lo)||/^(?:bet\s*s?lip|my\s*bets|treble|double|acca|accumulator)\b/i.test(lo)||/^(?:total\s*odds|combined\s*odds|returns?|final\s*odds)\b/i.test(lo))return false;
  return !(/(?:bet\s*s?lip|my\s*bets|view\s*legs)/i.test(lo)&&!(ln.includes(' - ')||lo.includes(' vs ')))});
 const mre=/^(draw\s*no\s*bet|match\s*result|match\s*winner|1x2|double\s*chance|total|over|under|btts|both\s*teams|handicap|correct\s*score|full\s*time)(?:\s*[-–—].*)?$/i,legs=[];
 const oe=x=>{const m=(x||'').match(/(?<!\d)(\d{1,3}[.,]\d{2})\s*$/);if(!m)return[null,x];const v=toF(m[1]);return v==null?[null,x]:[v,x.slice(0,m.index).trim()]};
 for(let i=0;i<L.length;){let sel=L[i];
  if(toF(sel)!=null&&!/[A-Za-z]{3,}/.test(sel)){i++;continue}
  if(['LIVE','EP'].includes(sel.toUpperCase())||/^live\s*$/i.test(sel)||mre.test(sel)){i++;continue}
  let odds;[odds,sel]=oe(sel);sel=(sel||'').replace(/^[@©•\s]+/,'').trim().replace(/^[^A-Za-z0-9]+/,'').replace(/^(?:fi|rl|il|l|i|r)\s+(?=[A-Z])/i,'');
  if(!sel||sel.length<2){i++;continue}
  if(i+1>=L.length)break;
  let market=null,match=null,j=i+1;
  for(let k=0;k<5&&j<L.length;k++){let c=L[j],lo=c.toLowerCase();
   if(/^live\s+/i.test(c)){c=c.replace(/^live\s+/i,'').trim();lo=c.toLowerCase()}
   if(odds==null&&toF(c)!=null&&!/[A-Za-z]{3,}/.test(c)){odds=toF(c);j++;continue}
   let body=c;const[o2,b2]=oe(c);if(o2!=null)body=b2;
   if(market==null&&(mre.test(body)||['draw no bet','match result','1x2','double chance','2up','1up','full time'].some(w=>lo.includes(w)))){
    if(o2!=null&&odds==null)odds=o2;market=classify(body)||body||'1X2';j++;continue}
   if(match==null&&(c.includes(' - ')||lo.includes(' vs ')||lo.includes(' v '))&&!mre.test(c)){match=c.replace(/\s+vs\s+/i,' - ').replace(/\s+v\s+/i,' - ');j++;continue}
   break}
  if(odds==null&&market==null){i++;continue}
  if(/^(treble|double|acca|returns?|view|2up|1up|bet\s*s?lip|my\s*bets|legs?\s*selected|final\s*odds|total\s*odds|combined)/i.test(sel)||sel.replace(/[^A-Za-z]/g,'').length<3||/(?:bet\s*s?lip|my\s*bets|view\s*legs|legs?\s*selected|\bstip\b)/i.test(sel)||!match||match.toLowerCase()==='unknown'||odds==null||odds<=1){i=Math.max(j,i+1);continue}
  legs.push(mkLeg({sel,odds,market:market||'1X2',match},'Sportingbet'));i=Math.max(j,i+1)}
 return legs.length?legs:null}
function detectBookie(t){const lo=t.toLowerCase();
 // Cropped Hollywoodbets screenshots often omit the bookmaker logo/header.
 const hwHead=(t.match(/^(?:double\s*chance|full\s*time(?:\s*result)?|match\s*result|match\s*winner|1x2|draw\s*no\s*bet|btts|both\s*teams)\s*[-–—:]/gim)||[]).length;
 const hwMkLine=(t.match(/^(?:double\s*chance|full\s*time(?:\s*result)?|match\s*result|1x2)$/gim)||[]).length;
 const hwFixtures=(t.match(/^.+?\s+(?:vs\.?|v\.?)\s+.+$/gim)||[]).length+(t.match(/^.+?\s[-–—]\s.+$/gm)||[]).length;
 const hwPrices=(t.match(/^\s*[@x×]?\s*\d{0,3}[.,]\d{2}\s*[x×]?\s*$/gim)||[]).length;
 if((hwHead>=1||hwMkLine>=1)&&hwFixtures>=1&&(hwPrices>=1||hwHead>=2||/multiple\s+accumulator|final\s+odds|betslip|hollywood/i.test(t))&&!/build a bet|betway/i.test(lo))return 'Hollywoodbets';
 if(/\b1x2\b/.test(lo)&&/\d{4}-\d{2}-\d{2}/.test(t)&&(lo.includes('multibet')||lo.includes('total odds')||lo.includes('potential return')))return '10Bet';
 if(!lo.includes('betway')&&!lo.includes('build a bet')&&(lo.includes('1x2:')||/\b1x2\s*[12x]\b/.test(lo)||/\b1x2[12x]\b/.test(lo)||/\btotal\s*\(\d/.test(lo))&&(/\s[-–—]\s/.test(t)||lo.includes('supabets')||lo.includes('combined multiple')))return 'Supabets';
 {const mk=['draw no bet','match result -','match result','2up','legs selected','share my bet','(ep)'].filter(w=>lo.includes(w)).length+(/(^|\n)ep(\n|$)/.test(lo)?1:0);
  if(!/betway|build a bet/.test(lo)&&!/\b1x2/.test(lo)&&(mk>=2||/\d+\s*legs?\s*selected/.test(lo)||lo.includes('sportingbet')))return 'Sportingbet'}
 if(!/betway|bet saver|build a bet|supabets|hollywood/.test(lo)){const ls=lines0(t);let h=0;for(let i=0;i<ls.length-1;i++)if(/^(1x2|x2|total|double chance|draw no bet|btts)$/i.test(ls[i])&&/[A-Za-z]{3}.*\d[.,]?\d{2}\s*$/.test(ls[i+1])&&!/ - /.test(ls[i+1]))h++;if(h>=1||/add \d+\s*selection/i.test(t))return '10Bet'}
 if(lo.includes('hollywood'))return 'Hollywoodbets';if(lo.includes('10bet'))return '10Bet';if(lo.includes('supabets'))return 'Supabets';
 return lo.includes('betway')||lo.includes('bet saver')?'Betway':'Unknown'}
const SPEC={Hollywoodbets:parseHWB,'10Bet':parse10Bet,Supabets:parseSupa,Sportingbet:parseSporting};
function parse(text){
 const bk=detectBookie(text),clean=cleanBetway(text);
 // Prefer the dedicated Hollywoodbets leg reader for cropped slip screenshots.
  if(bk==='Hollywoodbets'||/^(?:double\s*chance|full\s*time(?:\s*result)?|match\s*result|match\s*winner|1x2|draw\s*no\s*bet)\s*[-–—:]/im.test(text)||(/hollywood/i.test(text)&&hwbFlatten(text).length>=4)){
   for(const t of [text,clean]){let g;try{g=parseHWB(t)}catch{}
    g=(g||[]).filter(l=>!junk(l)&&!KICK_RE.test(l.sel)&&!isFoot(l.sel));if(g.length)return g}
  }
 if(SPEC[bk]&&bk!=='Hollywoodbets'){for(const t of [text,clean]){let g;try{g=SPEC[bk](t)}catch{}
  g=(g||[]).filter(l=>!junk(l)&&!KICK_RE.test(l.sel)&&!isFoot(l.sel));if(g.length)return g}}
 let L=stripTabs(clean.split('\n').map(x=>x.trim()).filter(Boolean));
 let legs=anchored(L)||anchored(splitInline(L));
 if(legs){legs=legs.filter(l=>!junk(l));if(legs.length)return legs}
 return parseGeneric(clean)}

// ---- generic fallback reader (price-last layouts) ----
const SKIP=/total odds|multibet|stake|potential|payout|return|booking|bet slip|bet saver|win boost|cash ?out|^R\s?\d|^\s*(singles?|multiple|accumulator)\s*$/i;
const FIX=/^(.{2,40}?)\s+(?:v|vs\.?|-|–|—)\s+(.{2,40})$/i;
function parseGeneric(text){
 const legs=[];let match='',pend=[],bab=false;
 for(const raw of text.split(/\r?\n/)){
  const ln=raw.trim();if(!ln||SKIP.test(ln))continue;
  if(/^(build a bet|build-a-bet|bet builder)$/i.test(ln)){bab=true;continue}
  const only=ln.match(/^[@x×]?\s*(\d{1,4}[.,]\d{1,3})\s*[x×]?$/i),tail=!only&&!ln.includes(':')&&ln.match(/^(.+?)\s+@?(\d{1,3}[.,]\d{2,3})$/);
  if(only||tail){
   const odds=parseFloat((only?only[1]:tail[2]).replace(',','.'));if(tail)pend.push(tail[1]);
   if(odds>1&&odds<=10000&&(match||pend.length)){
    const col=pend.filter(x=>x.includes(':'));
    if(bab||col.length>=2)legs.push({match:match||'Unknown',sel:'Build a Bet',market:'Build a Bet',odds,is_bab:true,sub_legs:col.length?col:pend.slice()});
    else{const j=pend.join(' · ');legs.push({match:match||'Unknown',sel:j,market:classify(pend.join(' ')),odds})}
    pend=[];bab=false}
   continue}
  if(FIX.test(ln)&&!/^(over|under)/i.test(ln)){match=ln;pend=[];continue}
  pend.push(ln)}
 return legs}

// ---- UI ----
function totalCheck(prod,text){
 const m=text.match(/(?:total\s*odds|multibet\s*odds|\bodd[so]?)\s*[:\-]?\s*(\d{1,4}\.\d{2})\b/i);if(!m)return '';
 const t=parseFloat(m[1]);if(!(t>1))return '';
 return Math.abs(prod-t)/t<=.015?`<div class="ok">✔ Legs multiply to ${prod.toFixed(2)}, matching the slip's own total of ${t.toFixed(2)}.</div>`
  :`<div class="card"><span class="flag">⚠ Legs multiply to ${prod.toFixed(2)} but the slip says ${t.toFixed(2)}. A leg or price may be missing or misread – check the text on the left.</span></div>`}
let lastLegs=[],lastCombos=[],lastTarget=5,shown=PAGE,lastText='';
const teamsOf=m=>{
 // Prefer explicit structured team fields when a bookmaker parser supplied them.
 if(m&&typeof m==='object'&&m.home_team&&m.away_team)return[String(m.home_team).trim(),String(m.away_team).trim()];
 // Parsed legs are objects; the fixture is in .match, not String(object).
 // String(object) becomes "[object Object]" and hides both team names in the UI.
 const raw=String(m&&typeof m==='object'?(m.match??m.fixture??''):m||'').trim();
 if(!raw||raw.toLowerCase()==='unknown')return[null,null];
 const p=raw.split(/\s+(?:-|–|—|vs\.?|v\.?)\s+/i);
 return p.length>=2&&p[0].trim()&&p.slice(1).join(' - ').trim()?[p[0].trim(),p.slice(1).join(' - ').trim()]:[null,null]
};
const alias=n=>ALIASES[(n||'').toLowerCase().trim()]||n;
function dataConf(l){
 const S=l._form_support||[],F=l._form_flags||[],src=l._src?' ('+l._src+')':'';
 const n=(l._criteria||[]).filter(c=>c.kind!=='other').length,nNote=n?` · ${n} criteria classified`:'';
 if(l.home_form&&l.away_form){
  if(F.length&&!S.length)return['Form disagrees','--o',`Recent form argues against this pick${src}${nNote}`];
  if(S.length&&!F.length)return['Form backs pick','--g',`Recent form supports this pick${src}${nNote}`];
  if(S.length&&F.length)return['Form mixed','--y',`Some signals back it, some disagree${src} · ${S.length} backed · ${F.length} disagreed${nNote}`];
  return['No clear signal','--mu',`Form loaded${src} but no strong lean either way${nNote}`];
 }
 if(l.home_form||l.away_form)return['Partial form','--y','Only one side matched — fair % is mostly the de-vigged price'];
 if(l._form_lookup==='failed')return['Odds only','--y','Teams not found in form data — showing book price with margin removed only'];
 return['Odds only','--mu','No recent form data — fair % is the book price with estimated margin removed']}
const formLine=(n,f)=>`${esc(n)}: form <b>${esc(f.form)}</b> (${f.played} matches) • scored ${f.avg_scored.toFixed(1)} • conceded ${f.avg_conceded.toFixed(1)} • BTTS ${f.btts_pct.toFixed(0)}% • O2.5 ${f.over25_pct.toFixed(0)}%`;
function exHtml(l,i){if(l.is_bab&&!l.home_form)return '';const[h,a]=teamsOf(l.match);
 if(l._exStatus==='nokey')return i===lastLegs.findIndex(x=>x._exStatus==='nokey')?'<div class="ex muted">📊 Form, league position &amp; head-to-head: add your free Football-Data key in <b>About → Settings</b>.</div>':'';
 if(l._exStatus==='loading')return '<div class="ex muted">📊 Loading form &amp; head-to-head… <span>(the first lookup can take a few seconds)</span></div>';
 if(l._exStatus==='auth')return '<div class="ex"><span class="flag">Football-Data rejected your key – check it in About → Settings.</span></div>';
 if(!l._exStatus||l._exStatus==='skip'||!h)return '';
 if(l._exStatus==='unavail')return '<div class="ex muted">📊 Form &amp; head-to-head unavailable right now.</div>';
 const[ct,cc,cd]=dataConf(l);let o=`<div class="ex"><span class="tag" style="background:var(${cc})">${ct}</span> <span class="muted">${esc(cd)}</span>`;
 if(l.home_form||l.away_form){o+='<div class="h">📊 Recent form</div>';if(l.home_form)o+=`<div class="muted">${formLine(h,l.home_form)}</div>`;if(l.away_form)o+=`<div class="muted">${formLine(a,l.away_form)}</div>`}
 else if(l._form_lookup==='failed')o+='<div class="flag">Form unavailable (no recent match data could be found for these teams in the ESPN league data.'+(store.get('fdkey','')?'':' You can add a free Football-Data key in About → Settings for extra coverage.')+')</div>';
 const st=l.standings||{};if(st.home_pos!=null||st.away_pos!=null)o+=`<div class="h">📋 League position</div><div class="muted">${[st.home_pos!=null?esc(h)+' '+st.home_pos:'',st.away_pos!=null?esc(a)+' '+st.away_pos:''].filter(Boolean).join(' · ')}</div>`;
 const ms=(l.h2h||{}).matches||[];if(ms.length){const s=h2hSummary(ms,l.h2h.home_id);
  o+=`<div class="h">⚔️ Head-to-head (recent)</div><div class="muted">${esc(h)} vs ${esc(a)}: last ${ms.length} → <b>${s.w}W-${s.d}D-${s.l}L</b> (${esc(h)}'s view)</div>
  <details><summary class="muted">Show matches</summary>${ms.map(m=>`<div class="muted">${esc((m.utcDate||'').slice(0,10))} · ${esc(m.homeTeam?.shortName||m.homeTeam?.name||'')} ${m.score?.fullTime?.home??'?'}–${m.score?.fullTime?.away??'?'} ${esc(m.awayTeam?.shortName||m.awayTeam?.name||'')}</div>`).join('')}</details>`}
 const S=l._form_support||[],F=l._form_flags||[];if(S.length||F.length)o+='<div class="h">Does recent form back this pick?</div>'+S.map(x=>`<div class="ok">✔ ${esc(x)}</div>`).join('')+F.map(x=>`<div class="flag">⚠ ${esc(x)}</div>`).join('');
 if(l._fdnote)o+=`<div class="muted">⚠ ${esc(l._fdnote)}</div>`;
 return o+'</div>'}
function renderLegs(){
 const el=$('#legs');if(!lastLegs.length){el.innerHTML=lastText?'<p class="flag">No legs detected. Each leg needs a decimal price on its own line (e.g. 1.85).</p>':'';return}
 const tot=lastLegs.reduce((a,l)=>a*l.odds,1),tp=lastLegs.reduce((a,l)=>a*fair(l),1),w=weakest(lastLegs);
 el.innerHTML=`<h3>Detected ${lastLegs.length} leg(s)</h3><p class="muted">Reader: ${detectBookie(lastText)}</p>`+lastLegs.map((l,li)=>{
  if(!(l.odds>1))return `<div class="card"><b>${esc(l.match)}</b><br>${esc(l.sel)} <div class="flag">⚠ Price read as ${l.odds} – not valid decimal odds, so this leg is ignored. Check the slip.</div></div>`;
  const p=fair(l),[rt,rc]=legRisk(p),low=window._lowLines&&l.match.split(/\s-\s/).some(n=>window._lowLines.has(n.trim()));
  const pair=teamsOf(l).filter(Boolean);
  const pairHtml=pair.length===2?`<div class="muted" style="margin:4px 0 2px">Teams: <b>${esc(pair[0])}</b> vs <b>${esc(pair[1])}</b></div>`:'';
  return `<div class="card"><input class="nm" value="${esc(l.match)}" onchange="renameLeg(${li},this.value)" title="Tap to edit the match name">${low?' <span class="flag">⚠ name may be misread – tap to fix</span>':''}${pairHtml}<br>${esc(l.sel)} <span class="muted">(${esc(l.market)})</span> @ <b>${l.odds.toFixed(2)}</b>
  ${l.is_bab?`<div class="muted">${l.sub_legs.map(esc).join('<br>')}</div>`:''}
  <div class="bar"><i style="width:${p*100}%;background:var(${rc})"></i></div><span class="tag" style="background:var(${rc})">${rt}</span> <span class="muted">fair ≈ ${(p*100).toFixed(1)}% · margin ${marginPct(l).toFixed(0)}%${typeof l._form_adj==='number'&&l._form_adj?` · form ${l._form_adj>0?'+':''}${(l._form_adj*100).toFixed(1)}%`:''}</span>${exHtml(l,li)}</div>`}).join('')
  +totalCheck(tot,lastText)+`<div class="card">Whole slip: <b>${tot.toFixed(2)}</b> odds · fair ≈ ${(tp*100).toFixed(2)}%${w?`<div class="flag">Weakest: ${esc(w)}</div>`:''}</div>`
  +`<div class="card track-cta"><b>Next step</b><p class="muted" style="margin:6px 0">Track these teams for live scores and goal alerts.</p><div class="row"><button type="button" id="track-from-analysis">⚽ Track teams + alerts</button><button type="button" class="ghost" data-go="scores">Open Live Scores</button></div></div>`;

}
$('#analyze').onclick=()=>{
 lastTarget=parseFloat($('#target').value)||5;lastText=$('#slip').value;
 if(lastText.trim()&&!canAnalyze(lastText)){$('#rempty').hidden=true;$('#legs').innerHTML=`<div class="card limit-card"><b>Daily free limit reached</b>${(()=>{try{const e=licStatus().ended;return e==='license'?'<p class="muted" style="margin:4px 0"><b>Your Pro licence has expired.</b></p>':e==='trial'?'<p class="muted" style="margin:4px 0"><b>Your 7-day free trial has ended.</b></p>':''}catch{return''}})()}<p class="muted">The Free plan includes <b>${FREE_ANALYSES_PER_DAY} analysis per day</b>. Re-running the same slip still works. Pro unlocks unlimited analyses, advanced stake tools and unlimited history. Resets at midnight local time.</p><div class="row"><button data-go="about" data-plans="1" id="golimit">See plans &amp; unlock Pro</button>${helpNeedBtn('daily free limit reached','Need help?')}</div><p class="muted" style="margin-top:8px;font-size:12px">Tracked teams, live scores and your history stay available on Free.</p></div>`;$('#combos').innerHTML='';$('#ctl').hidden=true;try{drawPlanBar()}catch{};setTimeout(()=>helpWireNeed($('#legs')),0);return}
if(lastText.trim())try{store.set('last_slip',lastText)}catch{}
lastLegs=parse(lastText);lastLegs.forEach(l=>{l._criteria=l.is_bab?(l.sub_legs||[]).map(parseCrit):[parseCrit(`${l.market}: ${l.sel}`)]});
 $('#rempty').hidden=true;$('#clear2').hidden=false;renderLegs();lastCombos=combos(lastLegs,lastTarget);shown=PAGE;
 const ns=[...new Set(lastCombos.map(c=>c.n))].sort((a,b)=>a-b);
 $('#flt').innerHTML='<option value="0">All legs</option>'+ns.map(n=>`<option value="${n}">${n} leg${n>1?'s':''}</option>`).join('');
 $('#ctl').hidden=!lastCombos.length;drawCombos();enrichLegs(lastLegs)};
const view=()=>{let c=lastCombos.slice();const n=+$('#flt').value,m=$('#srt').value;if(n)c=c.filter(x=>x.n===n);
 if(m==='fewest')c.sort((a,b)=>a.n-b.n||b.prob-a.prob);else if(m==='most')c.sort((a,b)=>b.n-a.n||b.prob-a.prob);
 else if(m==='closest')c.sort((a,b)=>lastTarget-a.odds-(lastTarget-b.odds)||b.prob-a.prob);return c};

// ---------- AI commentary (optional Groq primary, Gemini fallback) ----------
function aiErrText(src,s,m){
  const ml=String(m||'').toLowerCase();
  if(s===401||s===403||(s===400&&/api key|api_key|invalid key|key not valid/.test(ml)))return `${src}: your key was rejected (it may be wrong, expired or blocked). Create a new key and paste it in About → Settings.`;
  if(s===404)return `${src}: the AI model this app uses is no longer available (error 404). Please update the app or contact support.`;
  if(s===429)return `${src}: free usage limit reached. Wait a few minutes, then tap ↻ AI.`;
  if(s>=500)return `${src}: the service is having problems (error ${s}). Try again shortly.`;
  return `${src}: request failed (error ${s}${m?' – '+String(m).slice(0,120):''}).`;
}
async function aiCall(src,url,opts,pick){
  let r;
  try{r=await fetch(url,opts)}catch{return{err:`${src}: could not connect. Check your internet connection.`}}
  if(!r.ok){
    let m='';try{const j=await r.json();m=(j.error&&(j.error.message||j.error))||''}catch{}
    return{err:aiErrText(src,r.status,typeof m==='string'?m:''),status:r.status}
  }
  try{const j=await r.json();const t=pick(j);if(t)return{text:t}}catch{}
  return{err:`${src}: the AI replied but returned no text. Tap ↻ AI to try again.`}
}
async function aiComment(combo){
  const groq=store.get('groqkey',''), gem=store.get('gemkey','');
  if(!groq&&!gem)return {ok:false,text:'Add a free Groq or Gemini key in About → Settings for AI commentary.'};
  const legs=(combo.legs||[]).map(l=>`${l.match||''} – ${l.sel||''} @ ${Number(l.odds).toFixed(2)}`).join('; ');
  const prompt=`You are a sports-betting risk analyst. Give a short (3-5 sentences) neutral commentary on this multi-leg combination. Mention overall risk, any stand-out legs, and clearly state that this is an informational estimate only — not betting, financial or investment advice and that no outcome is guaranteed. Odds ${combo.odds?.toFixed?.(2)||combo.odds}, combined implied probability about ${((combo.prob||0)*100).toFixed(1)}%, margin ${Number(combo.margin||0).toFixed(1)}%. Legs: ${legs}`;
  const errs=[];
  if(groq){
    // Groq retired llama-3.1-8b-instant (16 Aug 2026); gpt-oss-20b is their recommended replacement.
    const gq=(extra)=>aiCall('Groq','https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+groq},
      body:JSON.stringify(Object.assign({model:'openai/gpt-oss-20b',messages:[{role:'user',content:prompt}],temperature:0.4,max_tokens:900},extra))},j=>j.choices?.[0]?.message?.content?.trim());
    let r=await gq({reasoning_effort:'low'});
    if(r.status===400&&!r.text)r=await gq({});
    if(r.text)return{ok:true,text:r.text,src:'Groq'};
    errs.push(r.err);
  }
  if(gem){
    // gemini-1.5-flash is shut down; "gemini-flash-latest" always points at Google's current Flash model.
    for(const model of ['gemini-flash-latest','gemini-3.1-flash-lite']){
      const r=await aiCall('Gemini','https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+encodeURIComponent(gem),
        {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.4,maxOutputTokens:1200}})},
        j=>(j.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join('').trim());
      if(r.text)return{ok:true,text:r.text,src:'Gemini'};
      if(r.status!==404){errs.push(r.err);break}
      if(model==='gemini-3.1-flash-lite')errs.push(r.err);
    }
  }
  return{ok:false,text:errs.join(' ')||'Could not reach AI. Check your key and network, then tap ↻ AI.'};
}
window.refreshAI=async function(i){
  const el=document.getElementById('ai-'+i);if(!el)return;
  el.className='ai-box loading';el.textContent='⏳ Loading AI comment…';
  const combo=lastCombos[i];if(!combo){el.className='ai-box err';el.textContent='Combo not found.';return}
  const res=await aiComment(combo);
  el.className='ai-box '+(res.ok?'ok':'err');
  el.textContent=(res.ok?(res.src?`🤖 ${res.src}: `:'🤖 '):'⚠ ')+res.text;
};

function drawCombos(){
 if(!lastLegs.length){$('#combos').innerHTML='';return}
 const all=view(),c=all.slice(0,shown);
 $('#combos').innerHTML=all.length?`<h3>${all.length} recommended combination(s) up to ${lastTarget} odds</h3>`+c.map(x=>{const i=lastCombos.indexOf(x);return `<div class="card"><span class="tag" style="background:var(${x.col})">${x.t}</span> <b>${x.odds.toFixed(2)}</b> odds · ${(x.prob*100).toFixed(1)}% · margin ${x.margin.toFixed(1)}% · ${x.n} leg(s)
  <ul>${x.legs.map(l=>`<li>${esc(l.match)} – ${esc(l.sel)} @ ${l.odds.toFixed(2)}</li>`).join('')}</ul>
  ${x.st.map(f=>`<div class="ok">✔ ${esc(f)}</div>`).join('')}${x.fl.map(f=>`<div class="flag">⚠ ${esc(f)}</div>`).join('')}
  <details><summary class="muted">Reasoning</summary>${x.re.map(f=>`<div class="muted">• ${esc(f)}</div>`).join('')}</details>
  ${kellyHtml(x,i)}
  <div class="row"><button onclick="copyC(${i})" class="ghost">Copy</button><button onclick="saveC(${i})">Save to history</button><button onclick="refreshAI(${i})" class="ghost">↻ AI</button></div>
  <div id="ai-${i}" class="ai-box muted">🤖 AI Commentary — tap ↻ AI (needs Groq or Gemini key in About → Settings). Informational estimate only — not advice.</div></div>`}).join('')
  +(all.length>shown?`<button onclick="shown+=PAGE;drawCombos()">Show more (${all.length-shown} left)</button>`:''):`<p class="muted">No combination fits under ${lastTarget.toFixed(2)} odds. Try a higher target or shorter-odds legs.</p>`;
 c.forEach(x=>{const i=lastCombos.indexOf(x);if(i>=0)try{kellyCalc(i)}catch{}});
 // auto AI commentary for top combinations when a key is present
 if(store.get('groqkey','')||store.get('gemkey','')){c.slice(0,3).forEach(x=>{const i=lastCombos.indexOf(x);if(i>=0)setTimeout(()=>refreshAI(i),400+i*600)})}
}
$('#flt').onchange=$('#srt').onchange=()=>{shown=PAGE;drawCombos()};
function clearAnalyzer(){enrichRun++;lastLegs=[];lastCombos=[];lastText='';window._lowLines=null;shown=PAGE;
 $('#slip').value='';$('#bcode').value='';$('#bst').textContent='';$('#ocrst').textContent='';
 $('#legs').innerHTML=$('#combos').innerHTML='';$('#ctl').hidden=true;$('#flt').innerHTML='<option value="0">All legs</option>';$('#srt').value='def';$('#rempty').hidden=false;$('#clear2').hidden=true}
$('#clear').onclick=clearAnalyzer;$('#clear2').onclick=clearAnalyzer;
// ---------- Kelly stake sizing (Pro) ----------
const KELLY_CAP=0.10;   // never suggest more than 10% of the bankroll on one slip, whatever the maths says
const kellyLocked=()=>{try{return !!licCfg().enforce&&!isPro()}catch{return false}};
const curSym=()=>{try{return(CURRENCY_BY_COUNTRY[deviceCountry()]||[])[1]||''}catch{return ''}};
const money=v=>curSym()+grp(v,2);
function kellyHtml(x,i){
 if(kellyLocked())return `<div class="muted kelly">🔒 Kelly stake sizing is a Pro feature. <button type="button" class="ghost" data-go="about" data-plans="1">Unlock Pro</button></div>`;
 const fr=store.get('kfrac',0.25),bank=store.get('bankroll','');
 return `<details class="kelly"><summary class="muted">💰 Stake sizing (Kelly)</summary>
  <p class="muted" style="margin:6px 0">The Kelly formula suggests what share of your bankroll to stake <i>if</i> your own win chance is better than the odds imply. It only means something with <b>your own estimate</b>: the box below starts at MatchDesk's fair estimate, which is the bookmaker's price with the margin removed, so it will normally show no edge.</p>
  <div class="kgrid">
   <label>Bankroll (${esc(curSym()||'amount')})<input id="kb-${i}" type="number" inputmode="decimal" min="0" step="any" placeholder="e.g. 1000" value="${bank}" oninput="kellyCalc(${i})"></label>
   <label>Your win chance %<input id="kp-${i}" type="number" inputmode="decimal" min="0.1" max="99.9" step="any" value="${(x.prob*100).toFixed(1)}" oninput="kellyCalc(${i})"></label>
   <label>Kelly fraction<select id="kf-${i}" onchange="kellyCalc(${i})"><option value="1"${fr==1?' selected':''}>Full Kelly</option><option value="0.5"${fr==0.5?' selected':''}>Half Kelly</option><option value="0.25"${fr==0.25?' selected':''}>Quarter Kelly</option></select></label>
  </div>
  <div id="ko-${i}" class="kout"></div>
  <p class="muted" style="font-size:11px;margin:6px 0 0">Informational estimate only, not betting or financial advice. Full Kelly is very aggressive; most people use half or quarter. Never stake money you cannot afford to lose. 18+ only.</p>
 </details>`}
window.kellyCalc=i=>{
 const c=lastCombos[i],out=document.getElementById('ko-'+i);if(!c||!out)return;
 const bank=parseFloat(document.getElementById('kb-'+i).value),pp=parseFloat(document.getElementById('kp-'+i).value),fr=parseFloat(document.getElementById('kf-'+i).value)||0.25;
 store.set('kfrac',fr);if(bank>0)store.set('bankroll',bank);
 out.className='kout';
 if(!(pp>0&&pp<100)){out.className='kout none';out.innerHTML='Enter a win chance between 0 and 100%.';return}
 const odds=c.odds,b=odds-1,p=pp/100,q=1-p,f=(b*p-q)/b,be=100/odds,ev=(p*odds-1)*100;
 if(!(f>0)){out.className='kout none';out.innerHTML=`<b>No edge at ${pp.toFixed(1)}%.</b> At ${odds.toFixed(2)} odds you need a win chance above <b>${be.toFixed(1)}%</b> just to break even, so Kelly suggests <b>no stake</b>.`;return}
 let share=f*fr,capped=false;if(share>KELLY_CAP){share=KELLY_CAP;capped=true}
 const amt=bank>0?`<br>Suggested stake: <b>${money(bank*share)}</b> of ${money(bank)}`:'<br>Enter your bankroll to see the stake amount.';
 out.innerHTML=`Full Kelly: <b>${(f*100).toFixed(1)}%</b> of bankroll · estimated edge <b>${ev>=0?'+':''}${ev.toFixed(1)}%</b> per unit staked<br>With ${fr==1?'full':fr==0.5?'half':'quarter'} Kelly: <b>${(share*100).toFixed(1)}%</b> of bankroll${capped?' <span class="flag">(capped at 10% for safety)</span>':''}${amt}`};
const txt=c=>c.legs.map(l=>`${l.match} – ${l.sel} @ ${l.odds.toFixed(2)}`).join('\n')+`\nTotal ${c.odds.toFixed(2)}`;
window.copyC=i=>navigator.clipboard.writeText(txt(lastCombos[i])).then(()=>alert('Copied'));
window.saveC=i=>{const h=store.get('hist',[]),c=lastCombos[i];if(licCfg().enforce&&!isPro()&&h.length>=FREE_SAVED_SLIPS){alert(`The Free plan keeps up to ${FREE_SAVED_SLIPS} saved slips. Delete one in History or unlock Pro.`);return}h.unshift({id:Date.now(),date:new Date().toLocaleDateString(),text:txt(c),odds:c.odds,prob:c.prob,res:''});store.set('hist',h);alert('Saved')};
window.renameLeg=(i,v)=>{lastLegs[i].match=v.trim()||'Unknown';enrichLegs(lastLegs)};

// ---------- screenshot import (OCR in the browser, Tesseract) ----------
function ocrClean(t){
 return t.split('\n').map(l=>{l=l.trim();
  if(/^[x×]2$/i.test(l))return '1X2';
  l=l.replace(/(?<![\w])x2([12x])(?=\s)/i,'1x2$1');
  l=l.replace(/(\d[.,]?\d{2})\s*[§®©xX×B●•]\s*$/,'$1');
  l=l.replace(/[‐‑‒–—]/g,'-');
  // Hollywoodbets headings are often read with a tilde instead of the separator.
  l=l.replace(/^(full\s*time(?:\s*result)?|double\s*chance|match\s*result|match\s*winner|draw\s*no\s*bet)\s*[~|:]\s*/i,'$1 - ');
  // OCR commonly joins the words in the Double Chance selection.
  l=l.replace(/\b([A-Za-z]{2,})\s*ORDRAW\b/i,'$1 OR DRAW');
  // A standalone three-digit price such as 130 is frequently a lost decimal (1.30).
  if(/^\d{3}$/.test(l)&&Number(l)>=101&&Number(l)<=500)l=l[0]+'.'+l.slice(1);
  if(/[A-Za-z]{3}/.test(l)&&! /\d{1,2}:\d{2}|\d{4}/.test(l))
   l=l.replace(/(\s)([1-9])(\d{2})(?=\s*(?:[xX×]|$))/,'$1$2.$3');
  return l}).filter(Boolean).join('\n')}

let tessP;const loadTess=()=>tessP||(tessP=new Promise((ok,no)=>{const e=document.createElement('script');
 e.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';e.onload=ok;
 e.onerror=()=>{tessP=null;no(new Error('Could not load the OCR engine. Are you online?'))};document.head.appendChild(e)}));
async function prepImage(file){
 const bm=await createImageBitmap(file),sc=Math.max(1,Math.min(3,Math.round(1800/bm.width))),c=document.createElement('canvas');
 c.width=bm.width*sc;c.height=bm.height*sc;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(bm,0,0,c.width,c.height);
 const d=x.getImageData(0,0,c.width,c.height),p=d.data,g=new Uint8Array(c.width*c.height),h=new Array(256).fill(0);let sum=0;
 for(let i=0,j=0;i<p.length;i+=4,j++){const v=Math.round(.299*p[i]+.587*p[i+1]+.114*p[i+2]);g[j]=v;h[v]++;sum+=v}
 const inv=sum/g.length<110,n=g.length,cut=n*.01;let lo=0,hi=255,a=0;
 for(;lo<255&&(a+=h[lo])<cut;lo++);a=0;for(;hi>0&&(a+=h[hi])<cut;hi--);if(hi<=lo){lo=0;hi=255}
 for(let i=0,j=0;i<p.length;i+=4,j++){let v=Math.max(0,Math.min(255,(g[j]-lo)*255/(hi-lo)));if(inv)v=255-v;p[i]=p[i+1]=p[i+2]=v;p[i+3]=255}
 x.putImageData(d,0,0);return c}
async function importImage(file){
 const st=$('#ocrst');if(!file||!file.type.startsWith('image/')){st.textContent='That is not an image file.';return}
 try{st.textContent='Loading OCR engine (first time downloads about 10 MB)…';await loadTess();
  const cv=await prepImage(file),w=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')st.textContent='Reading image… '+Math.round(m.progress*100)+'%'}});
  // Run two segmentation modes. Hollywoodbets uses small, separated cards;
  // PSM 11 usually recovers the fixture rows while PSM 6 may recover headings.
  await w.setParameters({tessedit_pageseg_mode:'6'});
  const r6=await w.recognize(cv);
  await w.setParameters({tessedit_pageseg_mode:'11'});
  const r11=await w.recognize(cv);
  await w.terminate();
  const textOf=r=>ocrClean(r.data.text||'');
  const quality=t=>{
   const fixtures=(t.match(/^.*\b(?:vs\.?|v\.?)\s+.*$/gim)||[]).length;
   const headers=(t.match(/^(?:full\s*time(?:\s*result)?|double\s*chance|match\s*result|match\s*winner|draw\s*no\s*bet)\b/gim)||[]).length;
   const prices=(t.match(/^\s*(?:\d{1,3}[.,]\d{2}|\.\d{2})\s*$/gm)||[]).length;
   const words=(t.match(/[A-Za-z]{3,}/g)||[]).length;
   return fixtures*100+headers*25+prices*8+words;
  };
  // Prefer the OCR pass that actually recovered the fixtures and selection
  // headers, not the pass that merely produced more stray text.
  const t6=textOf(r6),t11=textOf(r11);
  const use11=quality(t11)>=quality(t6),r=use11?r11:r6;
  let text=use11?t11:t6;
  // If the other pass contributes a fixture missing from the chosen pass,
  // append that fixture so the parser can associate it with its nearby leg.
  const other=use11?t6:t11;
  const fixtureLines=other.split('\n').filter(l=>/\b(?:vs\.?|v\.?)\s+\S/i.test(l));
  for(const line of fixtureLines){
   const key=line.toLowerCase().replace(/[^a-z0-9]/g,'');
   const present=text.split('\n').some(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'').includes(key)||key.includes(x.toLowerCase().replace(/[^a-z0-9]/g,'')));
   if(!present)text+='\n'+line;
  }
  const cf=Math.round(r.data.confidence);window._lowLines=new Set((r.data.lines||[]).filter(l=>l.confidence<75).map(l=>ocrClean(l.text).trim()));$('#slip').value=text;
  st.innerHTML=`Read from image (confidence ${cf}%). ${cf<60?'<span class="flag">Low confidence – a clearer, larger screenshot helps. </span>':''}Check the text below, fix anything wrong, then press Analyze.`;
  $('#analyze').click()}
 catch(e){st.textContent='Image import failed: '+e.message}}
$('#img').onchange=e=>{importImage(e.target.files[0]);e.target.value=''};
addEventListener('paste',e=>{const f=[...(e.clipboardData?.files||[])].find(x=>x.type.startsWith('image/'));if(f){e.preventDefault();$('#analyzer').classList.contains('on')||document.querySelector('[data-t=analyzer]').click();importImage(f)}});


// ---------- booking code / Bet ID / share link (ported from _extract_booking_code) ----------
function extractCode(raw,bookie='Auto'){raw=(raw||'').trim();if(!raw)return['',bookie];let m;
 if(m=raw.match(/[?&#]bookingCode=([A-Za-z0-9_-]+)/i))return[m[1],'Betway'];
 if(m=raw.match(/[?&#]shareCode=([A-Za-z0-9_-]+)/i))return[m[1],bookie];
 if(m=raw.match(/hollywoodbets\.net\/betting\/([0-9A-Za-z_-]+)\/code/i))return[m[1],'Hollywoodbets'];
 if(m=raw.match(/supabets\.co\.za\/Shared\/([0-9A-Za-z_-]+)/i))return[m[1],'Supabets'];
 if(m=raw.match(/sportingbet\.co\.za\/[^\s]*\/share-my-bet\/([0-9A-Za-z_-]+)/i))return[m[1],'Sportingbet'];
 if(m=raw.match(/\b(BW[0-9A-Fa-f]{6,12})\b/))return[m[1],'Betway'];
 if(m=raw.match(/\b(\d{8,14})\b/))return[m[1],['Auto','',null].includes(bookie)?'Hollywoodbets':bookie];
 if(/^[A-Za-z0-9_-]{5,20}$/.test(raw))return[raw,bookie];
 if(m=raw.match(/(?:booking\s*code|bet\s*code|code)\s*[:-]?\s*([A-Za-z0-9_-]{5,20})/i))return[m[1],bookie];
 return[raw,bookie]}
const SITE={Betway:c=>[`https://www.betway.co.za/book-a-bet-results?bookingCode=${encodeURIComponent(c)}`],
 Supabets:c=>[`https://old.supabets.co.za/Shared/${encodeURIComponent(c)}`,`https://www.supabets.co.za/Shared/${encodeURIComponent(c)}`],
 Hollywoodbets:c=>[`https://www.hollywoodbets.net/betting/${encodeURIComponent(c)}/code`]};
const looksLikeSlip=t=>t.includes('\n')&&(t.match(/(?<!\d)\d{1,3}[.,]\d{2}(?!\d)/g)||[]).length>=1;
const HELPER='http://127.0.0.1:8765',BASES=['/api',HELPER+'/api'];
async function findBase(){for(const b of BASES){try{const c=new AbortController(),t=setTimeout(()=>c.abort(),1500);
  const r=await fetch(b+'/ping',{signal:c.signal});clearTimeout(t);if(r.ok){const j=await r.json();if(j&&j.ok)return[b,j]}}catch{}}return null}
function diagnoseCodeError(msg,code,bookie){
 const m=(msg||'').toLowerCase(),bk=(bookie||'').toLowerCase(),raw=(code||'');
 if(/abort|timeout|did not answer|network|failed to fetch|load failed/i.test(m))return 'Timed out or the server did not respond. Check your connection and try again. Bookmaker sites are sometimes slow or block cloud servers.';
 if(/block|forbidden|403|cloud|datacenter|data.?centre|captcha/i.test(m))return 'The bookmaker may be blocking server requests (common from cloud hosts). Open the bookmaker page yourself, copy the slip text, and use Paste from Clipboard.';
 if(/10bet/i.test(bk)||/10bet/i.test(raw))return '10Bet has no public booking-code page. Copy the slip text from the 10Bet site or app and press Paste & Analyze.';
 if(/sportingbet/i.test(bk)||/sportingbet/i.test(raw))return 'Sportingbet needs the full Share My Bet link, not a short code. Paste the full link, or copy the slip text and press Paste & Analyze.';
 if(/hollywood/i.test(bk)||/hollywood/i.test(raw)||/\b\d{8,14}\b/.test(raw)){
  if(/403|block|forbidden/i.test(m))return 'Hollywoodbets blocked the server request. Copy the slip from the Hollywoodbets app or site and use Paste from Clipboard, or import a screenshot.';
  if(/not found|404|expired|invalid/i.test(m))return 'That Hollywoodbets Bet ID was not found or has expired. Confirm it in the Hollywoodbets app, or paste the slip text instead.';
 }
 if(/not found|404|unknown|invalid code|no slip/i.test(m))return 'That code was not found or is not supported. Confirm the code is still valid on the bookmaker site, or paste the slip text instead.';
 if(/unsupported|not supported/i.test(m))return 'That bookmaker is not supported for automatic code loading. Paste the slip text or open the bookmaker page and copy it.';
 return msg||'Could not load that code.';
}
async function helperResolve(code,bookie,st){
 const f=await findBase();if(!f)return null;
 st.textContent='Loading the slip from the bookmaker… this can take up to a minute.';
 try{const c=new AbortController(),t=setTimeout(()=>c.abort(),120000);
  const r=await fetch(`${f[0]}/resolve?code=${encodeURIComponent(code)}&bookie=${encodeURIComponent(bookie)}`,{signal:c.signal});clearTimeout(t);return await r.json()}
 catch(e){const name=e&&e.name||'Error';return{ok:false,message:name==='AbortError'?'Timed out waiting for the bookmaker (over 2 minutes). Try again or paste the slip text.':'The server did not answer ('+name+').'}}}
async function bookingOpen(){
 const raw=$('#bcode').value.trim(),st=$('#bst');if(!raw){st.textContent='Type or paste a booking code, Bet ID or share link first.';return}
 if(looksLikeSlip(raw)){$('#slip').value=raw;$('#bcode').value='';st.textContent='That looks like a full slip, so I analyzed it directly.';$('#analyze').click();return}
 const sel=$('#bsite').value;let[code,bk]=extractCode(raw,sel);if(sel!=='Auto')bk=sel;if(bk==='Auto'||!bk)bk=/^BW/i.test(code)?'Betway':(/^\d{8,14}$/.test(code)?'Hollywoodbets':'Auto');
 const hr=await helperResolve(raw,bk==='Auto'?sel:bk,st);
 if(hr){if(hr.ok&&hr.text){$('#slip').value=hr.text;st.textContent=(hr.message||'Loaded.')+' Analyzed on the right.';$('#analyze').click();
  if(!lastLegs.length)st.innerHTML=`The slip loaded, but I could not read any legs from it. This is what came back:<pre class="raw">${esc(hr.text.slice(0,600))}</pre>Copy this text to me and I will fix the reader.`;return}
  const diag=diagnoseCodeError(hr.message,raw,bk);
  if(bk==='Hollywoodbets'){
   st.innerHTML=`<b>Could not load Hollywoodbets Bet ID ${esc(code)}</b><br>${esc(diag)}<br><span class="muted">MatchDesk did not open Hollywoodbets in another tab. Copy the slip from the Hollywoodbets app or site and press Paste from Clipboard, or import a screenshot.</span> ${helpNeedBtn('why won’t my booking code load','Need help?')}`;
   helpWireNeed(st);return}
  st.innerHTML=`<b>Could not load automatically</b><br>${esc(diag)}<br><span class="muted">I will try to open the bookmaker page so you can copy the slip instead.</span> ${helpNeedBtn('why won’t my booking code load','Need help?')}`;
  helpWireNeed(st)}
 else if(bk==='Hollywoodbets'){
  st.innerHTML=`<b>Could not load Hollywoodbets Bet ID ${esc(code)}</b><br>The MatchDesk server is not reachable, so the Bet ID was not fetched. Start the server (or local helper) and try again, or paste the slip text / import a screenshot. ${helpNeedBtn('why won’t my booking code load','Need help?')}`;
  helpWireNeed(st);return}
 let urls=/^https?:\/\//i.test(raw)?[raw.match(/https?:\/\/\S+/)[0]]:(SITE[bk]?SITE[bk](code):[]);
 if(bk==='Hollywoodbets'){st.innerHTML=`<b>Could not load Hollywoodbets Bet ID ${esc(code)}</b><br>Paste the slip text or import a screenshot instead. ${helpNeedBtn('why won’t my booking code load','Need help?')}`;helpWireNeed(st);return}
 if(bk==='10Bet'){st.innerHTML='10Bet has no public booking-code page. Copy the slip text from the 10Bet site or app and press Paste & Analyze. '+helpNeedBtn('why won’t my booking code load','Need help?');helpWireNeed(st);return}
 if(bk==='Sportingbet'&&!urls.length){st.innerHTML='Sportingbet uses a Share My Bet link, not a short code. Paste the full link here, or copy the slip text and press Paste & Analyze. '+helpNeedBtn('why won’t my booking code load','Need help?');helpWireNeed(st);return}
 if(!urls.length){st.innerHTML='I could not tell which bookmaker that code is from. Pick one from the list, or paste the slip text instead. '+helpNeedBtn('why won’t my booking code load','Need help?');helpWireNeed(st);return}
 window.open(urls[0],'_blank','noopener');
 st.innerHTML=(st.innerHTML.includes('Could not load automatically')?st.innerHTML+'<br>':'')+`Code <b>${esc(code)}</b> (${esc(bk)}) opened in a new tab. There, select the slip (Ctrl+A), copy it (Ctrl+C), come back and press <b>Paste from Clipboard</b>.${urls[1]?` <a href="${esc(urls[1])}" target="_blank" rel="noopener">Alternative page</a>`:''}`}
async function pasteClipboard(){const st=$('#bst');
 const putText=t=>{t=(t||'').trim();
  if(!t){st.textContent='The clipboard is empty. Copy a slip, a booking code or a screenshot first.';return}
  if(!looksLikeSlip(t)&&t.length<=120&&(/^https?:\/\/\S+$/i.test(t)||/^[A-Za-z0-9_-]{5,24}$/.test(t))){$('#bcode').value=t;st.innerHTML='That looks like a booking code or link, so I put it in the code box. Press <b>Load code</b>.';$('#bopen').focus();return}
  $('#slip').value=t;st.textContent='Pasted from your clipboard.';$('#analyze').click()};
 try{
  if(navigator.clipboard&&navigator.clipboard.read){const items=await navigator.clipboard.read();
   for(const it of items){const ty=it.types.find(x=>x.startsWith('image/'));
    if(ty){const blob=await it.getType(ty);st.textContent='Screenshot found on the clipboard – reading it…';importImage(new File([blob],'clipboard.'+(ty.split('/')[1]||'png'),{type:ty}));return}}
   for(const it of items)if(it.types.includes('text/plain')){putText(await(await it.getType('text/plain')).text());return}
   st.textContent='Nothing I can use on the clipboard. Copy a slip, a booking code or a screenshot first.';return}
  putText(await navigator.clipboard.readText())}
 catch(e){const b=$('#slip');b.focus();b.select();
  st.innerHTML='Your browser did not allow automatic clipboard access. <b>Press Ctrl+V now</b> (or long-press and Paste on a phone) – text and screenshots both work, and I will read them as soon as they land. To allow it permanently, click the icon left of the address bar and set Clipboard to Allow.'}}
// Pasting a full slip straight into the slip box or the code box analyzes it automatically (no clipboard permission needed)
$('#slip').addEventListener('paste',()=>setTimeout(()=>{if($('#slip').value.trim()){$('#bst').textContent='Pasted – analyzed.';$('#analyze').click()}},50));
$('#bcode').addEventListener('paste',()=>setTimeout(()=>{if(looksLikeSlip($('#bcode').value.trim()))bookingOpen()},50));
$('#bopen').onclick=async()=>{const b=$('#bopen');b.disabled=true;b.textContent='Working…';$('#bst').textContent='Working…';
 try{await bookingOpen()}catch(e){$('#bst').textContent='Something went wrong: '+e.message}finally{b.disabled=false;b.textContent='Load code'}};
async function checkHelper(){const h=$('#hst'),f=await findBase();
 h.innerHTML=f?`<span class="ok">● ${f[0]==='/api'?'Connected to the MatchDesk server':'Local helper connected'}${f[1].playwright?' – codes load in one tap':' – but the browser engine is missing, so loading may fail'}</span>`
  :`<span class="flag">● No code-loading server found – Load code will open the bookmaker page instead (copy the slip there, then Paste).</span> <span class="muted">This page is at: ${esc(location.protocol==='file:'?'a file on your computer (opened by double-click)':location.origin)}. The server address is http://localhost:8080</span>`}
checkHelper();$('#hst').onclick=checkHelper;setInterval(()=>{if(!document.hidden)checkHelper()},15000);$('#bpaste').onclick=pasteClipboard;

// ---------- head-to-head (Football-Data.org fallback), ported from the desktop app ----------
const FD_COMPS=['PL','PD','BL1','SA','FL1','CL','ELC','PPL','DED','BSA'];
const TR_={ø:'o',æ:'ae',œ:'oe',ß:'ss',đ:'d',ł:'l',ð:'d',þ:'th'},PRE=new Set(['if','ifk','fc','sc','bk','ac','as','ss','rc','cd','afc','cf','fk']);
function normName(s){s=(s||'').toLowerCase().trim().replace(/[øæœßđłðþ]/g,c=>TR_[c]).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
 const p=s.split(' ');if(p.length>=2&&PRE.has(p[0]))s=p.slice(1).join(' ');return s}
function nameScore(query,team){const q=normName(query);if(!q)return 0;let best=0;const tla=normName(team.tla||'');if(tla&&q===tla)best=90;const pq=` ${q} `;
 for(const raw of [team.name||'',team.shortName||'']){const t=normName(raw);if(!t)continue;if(q===t){best=Math.max(best,100);continue}
  const pt=` ${t} `;if(Math.min(q.length,t.length)>=4&&(pt.includes(pq)||pq.includes(pt))){best=Math.max(best,80);continue}
  const qt=new Set(q.split(' ')),tt=new Set(t.split(' '));if(qt.size&&tt.size){const ov=[...qt].filter(x=>tt.has(x)).length/Math.max(qt.size,tt.size);if(ov>=.5)best=Math.max(best,Math.floor(60*ov))}}
 return best}
const cacheGet=(k,ttl)=>{const c=store.get('c_'+k,null);return c&&Date.now()-c.t<ttl?c.v:null},cacheSet=(k,v)=>{try{store.set('c_'+k,{t:Date.now(),v})}catch{}};
let fdCalls=[],baseCache=null;
async function fdBases(){if(!baseCache||Date.now()-baseCache.t>60000){const f=await findBase();baseCache={t:Date.now(),viaServer:!!f&&f[0]==='/api'}}
 return baseCache.viaServer?['/api/fd','https://api.football-data.org/v4']:['https://api.football-data.org/v4']}
async function fd(path,params={}){const key=store.get('fdkey','');if(!key)return null;
 for(let a=0;a<2;a++){
  for(;;){const n=Date.now();fdCalls=fdCalls.filter(t=>n-t<60000);if(fdCalls.length<9){fdCalls.push(n);break}await sleep(60000-(n-fdCalls[0])+300)}
  const qs=new URLSearchParams(params).toString();let r=null;
  for(const b of await fdBases()){try{r=await fetch(`${b}/${path}${qs?'?'+qs:''}`,{headers:{'X-Auth-Token':key}});if(r.status!==404)break}catch{r=null}}
  if(!r)return null;
  if(r.status===429&&a===0){const d=parseFloat(r.headers.get('Retry-After'));await sleep(Math.min(Math.max(isNaN(d)?20:d+1,5),65)*1000);continue}
  return r}return null}
async function compTeams(code){const c=cacheGet('teams_'+code,48*36e5);if(c)return c;const r=await fd('competitions/'+code+'/teams');
 if(!r)return[];if(r.status===401||r.status===403)throw new Error('auth');if(!r.ok)return[];
 const t=((await r.json()).teams||[]).map(x=>({id:x.id,name:x.name,shortName:x.shortName,tla:x.tla}));cacheSet('teams_'+code,t);return t}
async function findTeam(name,prefer,only){const map=store.get('fdmap',{}),k=name.toLowerCase().trim();if(map[k])return map[k];
 let best={s:0};for(const c of (only?[prefer]:[prefer,...FD_COMPS]).filter((x,i,a)=>x&&a.indexOf(x)===i)){
  for(const t of await compTeams(c)){const sc=nameScore(name,t);if(sc>best.s)best={s:sc,id:t.id,comp:c,name:t.name}}
  if(best.s>=100||(best.s>=80&&c===prefer))break}
 if(best.id&&best.s>=60){map[k]={id:best.id,comp:best.comp,name:best.name};store.set('fdmap',map);return map[k]}return null}
async function getH2H(tid,oid){const key=`h2h_${Math.min(tid,oid)}_${Math.max(tid,oid)}`,c=cacheGet(key,12*36e5);if(c)return c;
 let r=null;for(const yrs of [3,1]){const now=new Date(),from=new Date(now-365*864e5*yrs),f=d=>d.toISOString().slice(0,10);
  r=await fd(`teams/${tid}/matches`,{dateFrom:f(from),dateTo:f(now),status:'FINISHED'});if(r&&r.ok)break}
 if(!r||!r.ok)return null;
 const ms=((await r.json()).matches||[]).filter(m=>{const h=m.homeTeam?.id,a=m.awayTeam?.id;return(h===tid&&a===oid)||(h===oid&&a===tid)}).sort((x,y)=>(y.utcDate||'').localeCompare(x.utcDate||'')).slice(0,5);
 cacheSet(key,ms);return ms}
function h2hSummary(ms,hid){let w=0,d=0,l=0;
 for(const m of ms){const sc=m.score?.fullTime||{},hg=sc.home,ag=sc.away;if(hg==null||ag==null)continue;
  const homeWas=m.homeTeam?.id===hid,tg=homeWas?hg:ag,og=homeWas?ag:hg;if(tg>og)w++;else if(tg===og)d++;else l++}
 return{w,d,l}}
async function getForm(tid){const c=cacheGet('form_'+tid,6*36e5);if(c)return c;
 const now=new Date(),from=new Date(now-120*864e5),f=d=>d.toISOString().slice(0,10),r=await fd(`teams/${tid}/matches`,{dateFrom:f(from),dateTo:f(now),status:'FINISHED'});
 if(!r)return null;if(r.status===401||r.status===403)throw new Error('auth');if(!r.ok)return null;
 const ms=((await r.json()).matches||[]).sort((a,b)=>(a.utcDate||'').localeCompare(b.utcDate||'')).slice(-10);if(!ms.length)return null;
 let w=0,d=0,l=0,gf=0,ga=0,btts=0,o15=0,o25=0,o35=0,cs=0,fts=0;const form=[],totals=[];
 for(const m of ms){const sc=m.score?.fullTime||{},hg=sc.home,ag=sc.away;if(hg==null||ag==null)continue;
  const isHome=m.homeTeam?.id===tid,tg=isHome?hg:ag,og=isHome?ag:hg;gf+=tg;ga+=og;
  if(tg>og){w++;form.push('W')}else if(tg===og){d++;form.push('D')}else{l++;form.push('L')}
  if(hg>0&&ag>0)btts++;const t=hg+ag;totals.push(t);if(t>1.5)o15++;if(t>2.5)o25++;if(t>3.5)o35++;if(og===0)cs++;if(tg===0)fts++}
 const p=w+d+l;if(!p)return null;
 const out={form:form.slice(-5).reverse().join(' '),played:p,wins:w,draws:d,losses:l,avg_scored:gf/p,avg_conceded:ga/p,avg_total:(gf+ga)/p,btts_pct:btts/p*100,over15_pct:o15/p*100,over25_pct:o25/p*100,over35_pct:o35/p*100,win_pct:w/p*100,draw_pct:d/p*100,loss_pct:l/p*100,clean_sheet_pct:cs/p*100,failed_to_score_pct:fts/p*100,totals};
 cacheSet('form_'+tid,out);return out}
async function getTable(comp){const c=cacheGet('table_'+comp,24*36e5);if(c)return c;const r=await fd(`competitions/${comp}/standings`);if(!r||!r.ok)return null;
 const s=(await r.json()).standings||[],tot=s.filter(g=>(g.type||'TOTAL')==='TOTAL'),rows=(tot.length?tot:s).flatMap(g=>g.table||[]).map(x=>({id:x.team?.id,pos:x.position}));
 if(!rows.length)return null;cacheSet('table_'+comp,rows);return rows}
let enrichRun=0;
// ---------- ESPN form, league position & head-to-head (primary source, no key needed) ----------
// Football-Data (below) stays as an optional fallback for teams ESPN cannot supply.
const ESPN_COMPS=['eng.1','esp.1','ita.1','ger.1','fra.1','rsa.1','ned.1','por.1','sco.1','tur.1','bel.1','usa.1','mex.1','bra.1','arg.1','eng.2','nga.1','gha.1','ksa.1','jpn.1','aus.1','den.1','swe.1','nor.1','gre.1','aut.1'];
const espnSched=new Map(),espnMiss=new Map();
async function espnTeamList(lg){const c=cacheGet('etm_'+lg,48*36e5);if(c)return c;if(cacheGet('etmfail_'+lg,36e5))return[];
 try{const d=await espn('soccer',lg,'teams'),out=[];
  for(const sp of d.sports||[])for(const L of sp.leagues||[])for(const e of L.teams||[]){const t=e.team||{};if(t.id!=null)out.push({id:String(t.id),name:t.displayName||t.name||'',shortName:t.shortDisplayName||t.name||'',tla:t.abbreviation||''})}
  if(out.length)cacheSet('etm_'+lg,out);else cacheSet('etmfail_'+lg,1);return out}catch{cacheSet('etmfail_'+lg,1);return[]}}
async function espnFindTeam(name,prefer){const map=store.get('efmap',{}),k=String(name||'').toLowerCase().trim();if(!k)return null;if(map[k])return map[k];if(Date.now()-(espnMiss.get(k)||0)<6e5)return null;
 const comps=[prefer,...ESPN_COMPS].filter((x,i,a)=>x&&a.indexOf(x)===i);let best={s:0};
 for(let i=0;i<comps.length;i+=4){const batch=comps.slice(i,i+4),lists=await Promise.all(batch.map(espnTeamList));
  lists.forEach((tl,j)=>{for(const t of tl){const sc=nameScore(name,t);if(sc>best.s)best={s:sc,id:t.id,comp:batch[j],name:t.name}}});
  if(best.s>=100||(best.s>=80&&batch.includes(prefer)))break}
 if(best.id&&best.s>=80){map[k]={id:best.id,comp:best.comp,name:best.name};store.set('efmap',map);return map[k]}espnMiss.set(k,Date.now());return null}
const espnScore=x=>{const s=x&&x.score,v=(s&&typeof s==='object')?(s.value??s.displayValue):s,n=parseFloat(v);return Number.isFinite(n)?n:null};
function espnMatches(j){const out=[];
 for(const ev of(j&&j.events)||[]){const c=(ev.competitions||[])[0];if(!c)continue;
  const st=(c.status&&c.status.type)||(ev.status&&ev.status.type)||{};if(!(st.completed===true||st.state==='post'))continue;
  const cp=c.competitors||[],H=cp.find(x=>x.homeAway==='home'),A=cp.find(x=>x.homeAway==='away');if(!H||!A)continue;
  const hg=espnScore(H),ag=espnScore(A);if(hg==null||ag==null)continue;
  const tm=x=>({id:String((x.team&&x.team.id)??x.id),name:(x.team&&(x.team.displayName||x.team.name))||'',shortName:(x.team&&x.team.shortDisplayName)||''});
  out.push({utcDate:ev.date||c.date||'',homeTeam:tm(H),awayTeam:tm(A),score:{fullTime:{home:hg,away:ag}}})}
 return out.sort((x,y)=>String(x.utcDate).localeCompare(String(y.utcDate)))}
const espnYear=j=>{const y=j&&((j.requestedSeason&&j.requestedSeason.year)??(j.season&&j.season.year));if(y)return+y;const n=new Date();return n.getMonth()>=6?n.getFullYear():n.getFullYear()-1};
async function espnSeason(id,lg,season){const k=lg+'|'+id+'|'+(season||'cur'),c=espnSched.get(k);if(c&&Date.now()-c.t<36e5)return c.v;
 try{const j=await espn('soccer',lg,`teams/${id}/schedule`+(season?`?season=${season}`:'')),v={year:espnYear(j),ms:espnMatches(j)};espnSched.set(k,{t:Date.now(),v});return v}catch{return null}}
async function espnRecent(id,lg){const cur=await espnSeason(id,lg);if(!cur)return null;let ms=cur.ms.slice();
 if(ms.length<8){const prev=await espnSeason(id,lg,cur.year-1);if(prev)ms=prev.ms.concat(ms)}
 const cut=Date.now()-150*864e5;return ms.filter(m=>Date.parse(m.utcDate)>=cut).slice(-10)}
function formStats(ms,tid){let w=0,d=0,l=0,gf=0,ga=0,btts=0,o15=0,o25=0,o35=0,cs=0,fts=0;const form=[],totals=[];
 for(const m of ms){const hg=m.score.fullTime.home,ag=m.score.fullTime.away,isHome=String(m.homeTeam.id)===String(tid),tg=isHome?hg:ag,og=isHome?ag:hg;gf+=tg;ga+=og;
  if(tg>og){w++;form.push('W')}else if(tg===og){d++;form.push('D')}else{l++;form.push('L')}
  if(hg>0&&ag>0)btts++;const t=hg+ag;totals.push(t);if(t>1.5)o15++;if(t>2.5)o25++;if(t>3.5)o35++;if(og===0)cs++;if(tg===0)fts++}
 const p=w+d+l;if(!p)return null;
 return{form:form.slice(-5).reverse().join(' '),played:p,wins:w,draws:d,losses:l,avg_scored:gf/p,avg_conceded:ga/p,avg_total:(gf+ga)/p,btts_pct:btts/p*100,over15_pct:o15/p*100,over25_pct:o25/p*100,over35_pct:o35/p*100,win_pct:w/p*100,draw_pct:d/p*100,loss_pct:l/p*100,clean_sheet_pct:cs/p*100,failed_to_score_pct:fts/p*100,totals}}
async function espnForm(id,lg){const c=cacheGet('eform_'+id,6*36e5);if(c)return c;const ms=await espnRecent(id,lg);if(!ms||ms.length<3)return null;
 const o=formStats(ms,String(id));if(o)cacheSet('eform_'+id,o);return o}
async function espnTable(lg){const c=cacheGet('etable_'+lg,24*36e5);if(c)return c;
 try{const r=await fetchT(`https://site.api.espn.com/apis/v2/sports/soccer/${lg}/standings`);if(!r.ok)return null;const j=await r.json(),rows=[];
  const groups=(j.children&&j.children.length)?j.children.map(x=>x.standings):[j.standings];
  for(const g of groups)((g&&g.entries)||[]).forEach((e,i)=>{const rk=(e.stats||[]).find(x=>x.name==='rank'||x.type==='rank');rows.push({id:String(e.team&&e.team.id),pos:rk&&Number.isFinite(+rk.value)?+rk.value:i+1})});
  if(!rows.length)return null;cacheSet('etable_'+lg,rows);return rows}catch{return null}}
async function espnH2H(hm,am){const key=`eh2h_${hm.id}_${am.id}`,c=cacheGet(key,12*36e5);if(c)return c;
 const cur=await espnSeason(hm.id,hm.comp);if(!cur)return null;let all=cur.ms.slice();
 for(const y of[cur.year-1,cur.year-2]){const sn=await espnSeason(hm.id,hm.comp,y);if(sn)all=sn.ms.concat(all)}
 const ms=all.filter(m=>(m.homeTeam.id===hm.id&&m.awayTeam.id===am.id)||(m.homeTeam.id===am.id&&m.awayTeam.id===hm.id)).sort((x,y)=>String(y.utcDate).localeCompare(String(x.utcDate))).slice(0,5);
 cacheSet(key,ms);return ms}
function applyForm(l,hf,af,h,a,src){l.home_form=hf||undefined;l.away_form=af||undefined;l._src=src;
 const S=[],F=[];let adj=0,n=0;for(const c of l._criteria){const[ok,note,ad]=evalCrit(c,hf,af,h,a);
  if(ok===true&&note){S.push(note);if(ad){adj+=ad;n++}}
  else if(ok===false&&note){F.push(note);if(ad){adj+=ad;n++}}
  else if(note){F.push(note)} // mixed / informational (no probability change)
 }
 l._form_support=S;l._form_flags=F;l._form_adj=n?Math.max(-.1,Math.min(.1,adj/Math.max(1,n)*1.2)):0}
let ePrefer=null,fPrefer=null,fdBad=false;
// ESPN league code -> Football-Data competition code (leagues the Football-Data free tier covers)
const FD_OF={'eng.1':'PL','eng.2':'ELC','esp.1':'PD','ger.1':'BL1','ita.1':'SA','fra.1':'FL1','ned.1':'DED','por.1':'PPL','bra.1':'BSA'};
async function espnResolve(h,a,run){
 const hm=await espnFindTeam(h,ePrefer)||(alias(h)!==h?await espnFindTeam(alias(h),ePrefer):null);if(run!==enrichRun)return null;if(hm)ePrefer=hm.comp;
 const am=await espnFindTeam(a,ePrefer)||(alias(a)!==a?await espnFindTeam(alias(a),ePrefer):null);if(run!==enrichRun)return null;
 return{hm,am}}
async function espnData(l,h,a,R,run){const{hm,am}=R;if(!hm&&!am)return false;
 const[hf,af]=await Promise.all([hm?espnForm(hm.id,hm.comp):null,am?espnForm(am.id,am.comp):null]);if(run!==enrichRun)return false;
 if(!hf&&!af)return false;
 const tbl={};for(const t of[hm,am])if(t&&!(t.comp in tbl))tbl[t.comp]=await espnTable(t.comp);if(run!==enrichRun)return false;
 const pos=t=>t&&tbl[t.comp]?(tbl[t.comp].find(r=>r.id===t.id)||{}).pos:null,hp=pos(hm),ap=pos(am);
 if(hp!=null||ap!=null)l.standings={home_pos:hp??null,away_pos:ap??null};
 if(hm&&am&&hm.id!==am.id){const ms=await espnH2H(hm,am);if(run!==enrichRun)return false;if(ms&&ms.length)l.h2h={matches:ms,home_id:hm.id}}
 l._form_lookup='ok';applyForm(l,hf,af,h,a,'ESPN');l._exStatus='done';return true}
// Football-Data step. pc = {h,a} competition codes for a fast, single-league lookup (used when ESPN already told us the leagues).
async function fdEnrich(l,h,a,run,pc){
 const hm=await findTeam(alias(h),pc?pc.h:fPrefer,!!pc)||await findTeam(h,pc?pc.h:fPrefer,!!pc);if(run!==enrichRun)return false;if(hm)fPrefer=hm.comp;
 const am=await findTeam(alias(a),pc?pc.a:fPrefer,!!pc)||await findTeam(a,pc?pc.a:fPrefer,!!pc);if(run!==enrichRun)return false;
 l._form_lookup='none';const hf=hm?await getForm(hm.id):null,af=am?await getForm(am.id):null;if(run!==enrichRun)return false;
 if(hm||am)l._form_lookup=(hf||af)?'ok':'failed';
 const comp=hm?.comp||am?.comp,tb=comp?await getTable(comp):null;if(run!==enrichRun)return false;
 if(tb)l.standings={home_pos:hm?(tb.find(r=>r.id===hm.id)||{}).pos:null,away_pos:am?(tb.find(r=>r.id===am.id)||{}).pos:null};
 if(hm&&am&&hm.id!==am.id){const ms=await getH2H(hm.id,am.id);if(ms&&ms.length)l.h2h={matches:ms,home_id:hm.id}}
 applyForm(l,hf,af,h,a,'Football-Data');l._exStatus='done';return!!(hf||af)}
async function enrichLegs(legs){const run=++enrichRun,key=store.get('fdkey','');ePrefer=null;fPrefer=null;fdBad=false;
 legs.forEach(l=>{l._exStatus=undefined;l._fdnote=undefined;l._criteria=l.is_bab?(l.sub_legs||[]).map(parseCrit):[parseCrit(`${l.market}: ${l.sel}`)];delete l._form_support;delete l._form_flags;delete l._form_adj});
 lastCombos=combos(lastLegs,lastTarget);drawCombos();renderLegs();
 for(const l of legs){if(run!==enrichRun)return;const[h,a]=teamsOf(l.match);if(!h||!a||l.is_bab&&!h){l._exStatus='skip';continue}
  l._exStatus='loading';renderLegs();
  let done=false,fdRan=false,R=null;
  try{R=await espnResolve(h,a,run)}catch{R=null}
  if(run!==enrichRun)return;
  const fh=R&&R.hm&&FD_OF[R.hm.comp],fa=R&&R.am&&FD_OF[R.am.comp];
  // 1) key holder + both teams in a league Football-Data covers -> Football-Data first (it counts cup and European games too)
  if(key&&!fdBad&&fh&&fa){fdRan=true;
   try{done=await fdEnrich(l,h,a,run,{h:fh,a:fa})}
   catch(err){done=false;if(err.message==='auth'){fdBad=true;l._fdnote='Football-Data rejected your key, so ESPN data is shown instead. Check the key in About → Settings.'}}
   if(run!==enrichRun)return;if(!done){delete l.standings;delete l.h2h}}
  // 2) ESPN (everyone; also the backup when Football-Data had nothing)
  if(!done&&R&&(R.hm||R.am)){try{done=await espnData(l,h,a,R,run)}catch{done=false}if(run!==enrichRun)return}
  // 3) Football-Data as a backup for teams ESPN could not supply
  if(!done&&key&&!fdRan&&!fdBad){fdRan=true;
   try{done=await fdEnrich(l,h,a,run,null)}catch(err){l._exStatus=err.message==='auth'?'auth':'unavail';if(err.message==='auth')fdBad=true}
   if(run!==enrichRun)return}
  if(!done&&l._exStatus!=='auth'&&l._exStatus!=='unavail'){if(!fdRan)l._form_lookup='failed';l._exStatus='done'}
  if(run!==enrichRun)return;lastCombos=combos(lastLegs,lastTarget);drawCombos();renderLegs()}
 renderLegs()}
// settings: key + alerts
$('#fdkey').value=store.get('fdkey','');
$('#fdsave').onclick=()=>{store.set('fdkey',$('#fdkey').value.trim());$('#fdst').textContent=$('#fdkey').value.trim()?'Saved. Analyze a slip to see head-to-head.':'Key removed.'};
try{$('#groqkey').value=store.get('groqkey','');$('#gemkey').value=store.get('gemkey','');
$('#groqsave').onclick=()=>{store.set('groqkey',$('#groqkey').value.trim());$('#groqst').textContent=$('#groqkey').value.trim()?'Groq key saved on this device.':'Key removed.';};
$('#gemsave').onclick=()=>{store.set('gemkey',$('#gemkey').value.trim());$('#gemst').textContent=$('#gemkey').value.trim()?'Gemini key saved on this device.':'Key removed.';};
}catch(e){}
{const al=store.get('alerts',{notif:false,sound:true});$('#alsound').checked=al.sound;$('#alnotif').checked=al.notif;
 const save=()=>store.set('alerts',{sound:$('#alsound').checked,notif:$('#alnotif').checked});
 $('#alsound').onchange=save;$('#alnotif').onchange=async()=>{if($('#alnotif').checked&&window.Notification&&Notification.permission!=='granted'){const p=await Notification.requestPermission();if(p!=='granted'){$('#alnotif').checked=false;$('#alst').textContent='Notifications are blocked in your browser settings.'}}save()}}

// ---------- history ----------
function renderHist(){
 const h=store.get('hist',[]),open=h.filter(x=>!x.res),done=h.filter(x=>x.res),w=done.filter(x=>x.res==='won').length;
 const hit=done.length?Math.round(w/done.length*100):null;
 let head='';
 if(done.length)head=`<div class="card"><b>Hit rate</b><div class="hit-big">${hit}%</div><p class="muted" style="margin:4px 0 0">${w} won · ${done.length-w} lost · ${done.length} settled. Estimates only — not a guarantee of future results.</p></div>`;
 else head=`<div class="card"><b>History</b><p class="muted" style="margin:6px 0 0">Save combinations from the Analyzer, then mark them Won or Lost. Your hit rate appears here and on Home.</p></div>`;
 if(open.length)head+=`<p class="muted"><b>${open.length}</b> unsettled slip(s) — mark them below when you know the result.</p>`;
 $('#hist').innerHTML=head+
 (h.length?h.map(x=>`<div class="card"><span class="muted">${esc(x.date)} · ${Number(x.odds).toFixed(2)} odds · ${(Number(x.prob)*100).toFixed(0)}% est.${x.res?` · <b class="${x.res==='won'?'muted-ok':'flag'}">${x.res}</b>`:''}</span><pre style="white-space:pre-wrap;margin:6px 0">${esc(x.text)}</pre>
 <div class="hist-actions"><button type="button" class="${x.res==='won'?'':'ghost'}" onclick="mark(${x.id},'won')">${x.res==='won'?'✅ Won':'Won'}</button><button type="button" class="${x.res==='lost'?'':'ghost'}" onclick="mark(${x.id},'lost')">${x.res==='lost'?'❌ Lost':'Lost'}</button><button type="button" class="ghost" onclick="del(${x.id})">Delete</button></div></div>`).join(''):'<p class="muted">Nothing saved yet. On a recommended combo, tap Save.</p>');
}
window.mark=(id,r)=>{store.set('hist',store.get('hist',[]).map(x=>x.id===id?{...x,res:r}:x));renderHist();try{drawDash()}catch{};toast(r==='won'?'Marked won':'Marked lost')};
window.del=id=>{store.set('hist',store.get('hist',[]).filter(x=>x.id!==id));renderHist();try{drawDash()}catch{}};

// ---------- PWA ----------
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
let dp;
const isStandalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch{return false}};
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function syncInstall(){const done=isStandalone();$('#install').hidden=done||!dp;$('#installcard').hidden=done||!(dp||isIOS);if(done||dp)$('#installhint').hidden=true}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;syncInstall()});
addEventListener('appinstalled',()=>{dp=null;syncInstall();toast('MatchDesk installed')});
const doInstall=async()=>{
 if(dp){const p=dp;dp=null;try{p.prompt();await p.userChoice}catch{}syncInstall();return}
 if(isIOS){const h=$('#installhint');h.innerHTML='On iPhone / iPad: tap the <b>Share</b> button in Safari, then <b>Add to Home Screen</b>.';h.hidden=false}};
$('#install').onclick=doInstall;$('#install2').onclick=doInstall;
try{matchMedia('(display-mode: standalone)').addEventListener('change',syncInstall)}catch{}
syncInstall();

// ---------- Home-screen ads (configure in config.js) ----------
let adTimer=null,adIdx=0;
function drawAds(){const cfg=(window.MD_CONFIG||{}).ads||{},box=$('#adbox'),slot=$('#adslot');clearInterval(adTimer);
 let banners=(cfg.banners||[]).filter(b=>b&&b.img&&b.href);
 if(/[?&]ads=demo\b/.test(location.search)&&!banners.length)banners=[{img:'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="728" height="120"><rect width="728" height="120" rx="12" fill="#2f4a73"/><text x="364" y="52" font-size="26" font-family="sans-serif" fill="#fff" text-anchor="middle" font-weight="700">Your advert here</text><text x="364" y="84" font-size="15" font-family="sans-serif" fill="#cfe0f5" text-anchor="middle">Demo banner – add yours in config.js</text></svg>'),href:'https://example.com',alt:'Demo advert'}];
 if(!cfg.enabled||(!banners.length&&!(cfg.adsense&&cfg.adsense.client))){box.hidden=true;return}
 box.hidden=false;
 const show=()=>{const b=banners[adIdx%banners.length];slot.innerHTML=`<a href="${esc(b.href)}" target="_blank" rel="sponsored nofollow noopener"><img src="${esc(b.img)}" alt="${esc(b.alt||b.sponsor||'Advertisement')}"></a>`;adIdx++};
 if(banners.length){show();if(banners.length>1)adTimer=setInterval(show,Math.max(5,cfg.rotateSeconds||12)*1000)}
 else{const a=cfg.adsense;if(!document.getElementById('adsense-js')){const sc=document.createElement('script');sc.id='adsense-js';sc.async=true;sc.crossOrigin='anonymous';sc.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(a.client);document.head.appendChild(sc)}
  slot.innerHTML=`<ins class="adsbygoogle" style="display:block" data-ad-client="${esc(a.client)}"${a.slot?` data-ad-slot="${esc(a.slot)}"`:''} data-ad-format="auto" data-full-width-responsive="true"></ins>`;try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch{}}}

// ---------- branding: logo + dashboard image (same file names the desktop app looks for) ----------
const LOGO_FILES=['tristar_logo.png','Tristar_logo.png','TriStar_logo.png','tristar_logo.PNG','tristar_logo.jpg','tristar_logo.jpeg','logo.png','logo.PNG','logo.jpg'];
const DASH_FILES=['MatchDesk_Dashboard_Image.png','MatchDesk_Dashboard_Image.PNG','matchdesk_dashboard_image.png','MatchDesk_Dashboard_Image.jpg'];
const probeImage=urls=>new Promise(res=>{let i=0;const next=()=>{if(i>=urls.length)return res(null);const im=new Image(),u=urls[i++];im.onload=()=>res(u);im.onerror=next;im.src=u};next()});
const inDirs=names=>names.flatMap(f=>['images/'+f,f]);
async function loadBranding(){
 const logo=await probeImage(inDirs(LOGO_FILES));
 if(logo){$('#logoslot').innerHTML=`<img src="${esc(logo)}" alt="Tri-Star" style="height:36px;vertical-align:middle;border-radius:6px">`;
  document.querySelectorAll('link[rel=icon],link[rel=apple-touch-icon]').forEach(l=>l.setAttribute('href',logo))}
 const dash=await probeImage(inDirs(DASH_FILES));
 if(dash){$('#dashimg').innerHTML=`<img src="${esc(dash)}" alt="MatchDesk">`;$('#dashimg').hidden=false}}

// ---------- plans & pricing (ported from the desktop app: USD base, local-currency estimate, PayPal checkout) ----------
const PRICE_USD={monthly:4.99,annual:49.99},SAVING_USD=Math.round((12*4.99-49.99)*100)/100,FREE_ANALYSES_PER_DAY=1,FREE_SAVED_SLIPS=5,SUPPORT='Matchdesksupport@gmail.com';
const PF_CFG=()=>(window.MD_CONFIG&&MD_CONFIG.payfast)||{};
const PRICE_ZAR_DEFAULT={monthly:91.99,annual:829.00};
const zarOf=k=>{const v=Number((PF_CFG().prices||{})[k]);return Number.isFinite(v)&&v>0?v:PRICE_ZAR_DEFAULT[k]};
const fmtZar=n=>'R'+Number(n).toFixed(2);
const PAYPAL={monthly:'https://www.paypal.com/ncp/payment/G3JDJVPJ7UP6Y',annual:'https://www.paypal.com/ncp/payment/3VD4WJ5JWQXN6'};
const TZ_COUNTRY={'Africa/Johannesburg':'ZA','Africa/Lagos':'NG','Africa/Nairobi':'KE','Africa/Accra':'GH','Africa/Cairo':'EG','Europe/London':'GB','Europe/Dublin':'IE','Europe/Berlin':'DE','Europe/Paris':'FR','Europe/Madrid':'ES','Europe/Rome':'IT','Europe/Amsterdam':'NL','America/New_York':'US','America/Chicago':'US','America/Denver':'US','America/Los_Angeles':'US','America/Toronto':'CA','America/Sao_Paulo':'BR','America/Mexico_City':'MX','Australia/Sydney':'AU','Australia/Melbourne':'AU','Pacific/Auckland':'NZ','Asia/Kolkata':'IN','Asia/Tokyo':'JP','Asia/Dubai':'AE','Asia/Singapore':'SG','Africa/Gaborone':'BW','Africa/Windhoek':'NA','Africa/Lusaka':'ZM','Africa/Maputo':'MZ','Africa/Dar_es_Salaam':'TZ','Africa/Kampala':'UG','Africa/Maseru':'LS','Africa/Mbabane':'SZ','Africa/Casablanca':'MA','Africa/Addis_Ababa':'ET','Europe/Lisbon':'PT','Europe/Brussels':'BE','Europe/Vienna':'AT','Europe/Zurich':'CH','Europe/Stockholm':'SE','Europe/Oslo':'NO','Europe/Copenhagen':'DK','Europe/Warsaw':'PL','Europe/Prague':'CZ','Europe/Budapest':'HU','Europe/Bucharest':'RO','Europe/Athens':'GR','Europe/Helsinki':'FI','Europe/Istanbul':'TR','Asia/Istanbul':'TR','Europe/Kyiv':'UA','Europe/Kiev':'UA','America/Vancouver':'CA','America/Edmonton':'CA','America/Winnipeg':'CA','America/Halifax':'CA','America/Phoenix':'US','America/Anchorage':'US','Pacific/Honolulu':'US','America/Argentina/Buenos_Aires':'AR','America/Buenos_Aires':'AR','America/Santiago':'CL','America/Bogota':'CO','America/Lima':'PE','Australia/Brisbane':'AU','Australia/Perth':'AU','Australia/Adelaide':'AU','Australia/Hobart':'AU','Australia/Darwin':'AU','Asia/Calcutta':'IN','Asia/Karachi':'PK','Asia/Dhaka':'BD','Asia/Manila':'PH','Asia/Jakarta':'ID','Asia/Bangkok':'TH','Asia/Kuala_Lumpur':'MY','Asia/Shanghai':'CN','Asia/Seoul':'KR','Asia/Riyadh':'SA','Asia/Jerusalem':'IL'};
function deviceCountry(){
 // 1) time zone = where the device physically is (a phone set to English (US) in Johannesburg should still see Rands)
 try{const t=TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone];if(t&&CURRENCY_BY_COUNTRY[t])return t}catch{}
 // 2) otherwise the region of the device language (e.g. en-ZA, en-GB)
 const cand=[...(navigator.languages||[]),navigator.language].filter(Boolean);
 for(const c of cand){let r=null;try{r=new Intl.Locale(c).region}catch{}if(!r){const m=String(c).match(/[-_]([A-Za-z]{2})(?:$|[-_.@])/);r=m&&m[1]}
  if(r){r=r.toUpperCase();if(CURRENCY_BY_COUNTRY[r])return r}}
 return null}
let fxRates={USD:1};
async function loadRates(){const c=cacheGet('fx',12*36e5);if(c){fxRates=c;return}
 for(const u of['/api/rates','https://open.er-api.com/v6/latest/USD']){try{const r=await fetchT(u,4000);if(!r.ok)continue;const j=await r.json();
  if(j.result==='success'&&j.rates){const o={USD:1};for(const[k,v]of Object.entries(j.rates))if(typeof v==='number'&&v>0)o[k]=v;fxRates=o;cacheSet('fx',o);return}}catch{}}}
const grp=(x,d)=>Number(x.toFixed(d)).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
function fmtLocal(usd){const cc=deviceCountry(),[code,sym]=CURRENCY_BY_COUNTRY[cc]||[null,null],rate=code&&fxRates[code];
 if(!rate)return `$${grp(usd,2)} USD`;return sym+grp(usd*rate,['JPY','KRW'].includes(code)?0:2)}
function startPayFast(plan){
 const pf=PF_CFG(),amt=fmtZar(zarOf(plan)),label=plan==='annual'?'1 Year Access':'30 Day Access';
 openLegal('Pay with PayFast',`<p><b>${label}</b> &middot; <b>${amt}</b> (South African rand)</p>
  <p class="muted">Enter the email address where we should send your licence key.</p>
  <input id="pf-email" class="pf-input" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com">
  <div class="row" style="margin-top:10px"><button type="button" id="pf-go">Continue to PayFast</button></div>
  <p id="pf-msg" class="muted" style="margin-top:8px"></p>
  <p class="muted" style="font-size:12px">By continuing you agree to our Terms of Service, Privacy Policy and Refund Policy. 7-day money-back guarantee.</p>`);
 const go=document.getElementById('pf-go'),msg=document.getElementById('pf-msg'),inp=document.getElementById('pf-email');
 if(!go)return;
 go.onclick=()=>{const em=(inp.value||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){msg.textContent='Please enter a valid email address.';msg.style.color='var(--o)';return}
  if(!pf.checkoutUrl){msg.style.color='';msg.innerHTML='<b>Preview only:</b> PayFast is not connected yet, so no payment was started. When it is connected you will be taken to PayFast to pay '+amt+'.';return}
  window.open(pf.checkoutUrl+(pf.checkoutUrl.includes('?')?'&':'?')+'plan='+encodeURIComponent(plan)+'&email='+encodeURIComponent(em),'_blank','noopener')}
}
async function drawPlans(){await loadRates();const F=fmtLocal,cc=deviceCountry(),[code]=CURRENCY_BY_COUNTRY[cc]||[null];
 let region='';try{region=cc?new Intl.DisplayNames(['en'],{type:'region'}).of(cc):''}catch{region=cc||''}
 const st=(()=>{try{return licStatus().state}catch{return 'free'}})();
 const pfCan=!!(PF_CFG().checkoutUrl||PF_CFG().preview),pfShown=pfCan&&(cc==='ZA'||store.get('pf_show',0)==1),pfPreview=pfShown&&!PF_CFG().checkoutUrl;
 const hint=document.getElementById('plans-hint');if(hint)hint.hidden=pfShown;
 const openPay=k=>{const u=PAYPAL[k];if(u)window.open(u,'_blank','noopener');else alert('PayPal link not configured yet. Email '+SUPPORT)};
 const card=(key,name,price,period,tag,blurb,feats,cls)=>{
  const isCur=(key==='free'&&st==='free')||(key!=='free'&&st==='licensed');
  const paid=key==='monthly'||key==='annual',pfm=pfShown&&paid;
  const cta=isCur?'● Your current plan':(paid?'Click / tap to continue to PayPal →':' ');
  let ppSub='';if(pfm){const ppEst=F(PRICE_USD[key]);ppSub=ppEst.startsWith('$')?`$${PRICE_USD[key]} USD`:`$${PRICE_USD[key]} USD · ≈ ${ppEst}`}
  const pay=pfm?`<div class="pay-opts">${isCur?'<div class="cta">● Your current plan</div>':''}<button type="button" class="pay-btn" data-pf="${key}">Pay with PayFast<small>${fmtZar(zarOf(key))} · cards &amp; Instant EFT</small></button><button type="button" class="pay-btn ghost" data-pp="${key}">Pay with PayPal<small>${ppSub}</small></button></div>`:'';
  return `<div class="plan-card ${cls||key}${isCur?' current':''}${paid&&!pfm?' paid':''}${pfm?' pf':''}" ${paid&&!pfm?`data-plan="${key}" role="button" tabindex="0"`:''}>
   <span class="tag-line">${esc(tag)}</span>
   <h4>${esc(name)}</h4>
   <div class="price">${esc(price)}</div>
   <div class="period">${esc(period||'forever')}</div>
   <div class="muted" style="font-size:12px">${esc(blurb)}</div>
   <ul>${feats.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>
   ${paid&&!pfm?`<div class="muted" style="font-size:11px">PayPal price: $${PRICE_USD[key]} USD</div>`:''}
   ${pfm?pay:`<div class="cta">${cta}</div>`}
  </div>`};
 const introOrig=`${(region&&code&&code!=='USD'&&fxRates[code])?`Prices shown for ${esc(region)} (${code}). Estimates converted from USD; `:(code==='USD'?'Prices shown in US dollars (USD). ':'Prices shown in US dollars (USD) — a local-currency estimate is not available right now. ')}PayPal checkout is authoritative for the amount charged. After a successful payment the licence key is emailed to the PayPal account address.`;
 const introPF=`Prices shown in South African rand (ZAR). <b>PayFast</b> charges the rand price shown. <b>PayPal</b> charges in US dollars ($${PRICE_USD.monthly} / $${PRICE_USD.annual}) and converts at its own rate. After a successful payment your licence key is emailed: with PayFast to the email address you enter, with PayPal to your PayPal account address.`;
 $('#plans').innerHTML=`<p class="muted">${pfShown?introPF:introOrig}</p>
  ${pfPreview?'<div class="pf-preview"><b>PREVIEW:</b> PayFast is not connected yet. These buttons are for evaluation only and do not take payment.</div>':''}
  ${pfCan&&!pfShown?'<p class="muted" style="font-size:12px"><a href="#" id="pf-reveal" style="color:var(--ac)">Paying from South Africa? Show PayFast (rand) options</a></p>':''}
  <p class="muted" style="font-size:12px">By purchasing you agree to our <a href="#" id="plans-terms" style="color:var(--ac)">Terms of Service</a>, <a href="#" id="plans-privacy" style="color:var(--ac)">Privacy Policy</a> and <a href="#" id="plans-refunds" style="color:var(--ac)">Refund Policy</a>. <b>7-day money-back guarantee.</b></p>
 <div class="plans-grid">`
  +card('free','Free Forever','Free','','FREE FOREVER','For new users and casual bettors',['Basic live scores',`${FREE_ANALYSES_PER_DAY} bet-slip analysis per day`,'Basic odds & return calculations','Basic match information',`Save up to ${FREE_SAVED_SLIPS} slips`],'free')
  +card('monthly',pfShown?'30 Day Access':'PayPal 30 Day Access',pfShown?fmtZar(zarOf('monthly')):F(PRICE_USD.monthly),'30 day access','RECOMMENDED','For regular bettors who want the full toolkit',['Everything in Free','Unlimited bet-slip analyses','Advanced stake tools (Kelly sizing)','Unlimited saved slips & results history','No auto-renewal'],'monthly')
  +card('annual','MatchDesk 1 Year Access',pfShown?fmtZar(zarOf('annual')):F(PRICE_USD.annual),'1 year access','SAVE '+(pfShown?fmtZar(Math.max(0,12*zarOf('monthly')-zarOf('annual'))):F(SAVING_USD)),'Same Pro features, one upfront payment',['All Pro features','One upfront annual payment',`About ${pfShown?fmtZar(zarOf('annual')/12):F(PRICE_USD.annual/12)}/month`,'Best value for committed users'],'annual')
  +`</div>
  <p class="muted" style="font-size:12px">Keys do not renew automatically. Without one, MatchDesk keeps working on the Free plan. New installs may include a ${TRIAL_DAYS||7}-day Pro trial. Support: ${SUPPORT}</p>`;
 document.querySelectorAll('[data-pf]').forEach(b=>{b.onclick=e=>{e.preventDefault();startPayFast(b.dataset.pf)}});
 document.querySelectorAll('[data-pp]').forEach(b=>{b.onclick=e=>{e.preventDefault();openPay(b.dataset.pp)}});
 const rv=document.getElementById('pf-reveal');if(rv)rv.onclick=e=>{e.preventDefault();store.set('pf_show',1);drawPlans()};
 document.querySelectorAll('.plan-card.paid').forEach(el=>{
  const go=()=>openPay(el.dataset.plan);
  el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}};
 });
 const pt=document.getElementById('plans-terms'), pp=document.getElementById('plans-privacy'), pr=document.getElementById('plans-refunds');
 if(pt)pt.onclick=e=>{e.preventDefault();openLegal('Terms of Service', TERMS_HTML)};
 if(pp)pp.onclick=e=>{e.preventDefault();openLegal('Privacy Policy', PRIVACY_HTML)};
 if(pr)pr.onclick=e=>{e.preventDefault();openLegal('Refund Policy', REFUND_HTML)};
}

// ---------- licence keys (same format as the desktop app: "MD1" + base32 of a 12-byte payload and a 64-byte Ed25519 signature) ----------
const DEFAULT_PUB='7df9dc9a8f90e1d79f7840ebac4ce69ee5ca8f84ffcb3030c2ffef36d4cccee1',TRIAL_DAYS=7,LIC_EPOCH=Date.UTC(2020,0,1),LIC_PREFIX=new TextEncoder().encode('MatchDesk-license-v1|');
const licCfg=()=>((window.MD_CONFIG||{}).licensing||{}),localISO=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const hexBytes=x=>Uint8Array.from((x.match(/../g)||[]).map(v=>parseInt(v,16)));
function b32(str){const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,val=0;const out=[];for(const ch of str){const i=A.indexOf(ch);if(i<0)continue;val=((val<<5)|i)&0xFFFFFF;bits+=5;if(bits>=8){out.push((val>>>(bits-8))&255);bits-=8}}return Uint8Array.from(out)}
function decodeKey(key){try{let k=String(key||'').replace(/\s+/g,'').toUpperCase();if(k.startsWith('MD1'))k=k.slice(3);k=k.replace(/[^A-Z2-7]/g,'');
 if(!k)return[false,'Please paste your license key.'];const raw=b32(k);if(raw.length!==76)return[false,'That key looks incomplete. Please paste the whole key.'];
 const pay=raw.slice(0,12),sig=raw.slice(12),msg=new Uint8Array(LIC_PREFIX.length+12);msg.set(LIC_PREFIX);msg.set(pay,LIC_PREFIX.length);
 if(!nacl.sign.detached.verify(msg,sig,hexBytes(licCfg().publicKeyHex||DEFAULT_PUB)))return[false,'That license key is not valid.'];
 if(pay[0]!==1)return[false,'This key is for a different version of MatchDesk.'];
 const days=(pay[2]<<8)|pay[3];return[true,{expires:days?new Date(LIC_EPOCH+days*864e5).toISOString().slice(0,10):null,machine:[...pay.slice(4,8)],serial:[...pay.slice(8,12)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase()}]}
 catch{return[false,'That license key is not valid.']}}
function checkKey(key,today){const[ok,info]=decodeKey(key);if(!ok)return[false,info];
 if(info.machine.some(b=>b))return[false,'This key is locked to one specific computer (a desktop key), so it cannot unlock the web app. Ask support for a web / mobile key.'];
 if(info.expires&&today>info.expires)return[false,`This license expired on ${info.expires}.`];return[true,info]}
function licStatus(){const today=localISO(),lic=store.get('license',null);let note='';
 if(lic&&lic.key){const[ok,info]=checkKey(lic.key,today);
  if(ok){const left=info.expires?Math.max(0,Math.ceil((Date.parse(info.expires+'T23:59:59')-Date.now())/864e5)):null;
   return{state:'licensed',expires:info.expires,days_left:left,headline:'MatchDesk Pro – active'+(info.expires?' until '+info.expires:''),detail:info.expires?`${left} day(s) left. Keys do not renew automatically.`:'No expiry. Thank you for supporting MatchDesk.'}}
  note=info;
  // An expired licence means the Free plan straight away; the trial must not start again after someone has held a licence.
  const ex=/expired on (\d{4}-\d{2}-\d{2})/.exec(typeof note==='string'?note:'');
  if(ex)return{state:'free',ended:'license',expiredOn:ex[1],headline:'Licence expired on '+ex[1],detail:`Your Pro licence expired on ${ex[1]}, so MatchDesk is now on the Free plan (${FREE_ANALYSES_PER_DAY} bet-slip analysis per day). Enter a new license key to unlock Pro again.`}}
 let first=store.get('trial_first',null);if(!first){first=Date.now();store.set('trial_first',first)}
 const left=TRIAL_DAYS*864e5-(Date.now()-first);
 if(left>0){const d=Math.ceil(left/864e5);return{state:'trial',days_left:d,headline:`Pro free trial: ${d} day(s) left`,detail:'All Pro features are unlocked during the trial. Afterwards MatchDesk continues on the Free plan.'}}
 const expM=/expired on (\d{4}-\d{2}-\d{2})/.exec(note||'');
 if(expM)return{state:'free',ended:'license',expiredOn:expM[1],headline:'Licence expired on '+expM[1],detail:`Your Pro licence expired on ${expM[1]}, so MatchDesk is now on the Free plan (${FREE_ANALYSES_PER_DAY} bet-slip analysis per day). Enter a new license key to unlock Pro again.`};
 return{state:'free',ended:'trial',headline:'Free trial ended',detail:(note?note+' ':'')+`Your ${TRIAL_DAYS}-day Pro trial has ended, so MatchDesk is now on the Free plan (${FREE_ANALYSES_PER_DAY} bet-slip analysis per day and ${FREE_SAVED_SLIPS} saved slips). Enter a license key to unlock Pro.`}}
const isPro=()=>{try{const t=licStatus().state;return t==='licensed'||t==='trial'}catch{return true}};
function drawLicense(){const st=licStatus();$('#lichead').textContent=({licensed:'✅ ',trial:'🎁 ',free:'🆓 '})[st.state]+st.headline;$('#licdetail').textContent=st.detail;$('#licremove').hidden=st.state!=='licensed';$('#lickey').closest('.row').hidden=st.state==='licensed';
 const chk=$('#paypal-checklist');
 if(chk){chk.hidden=st.state==='licensed'}
 // Contextual help on trial ended / licence expired
 const need=$('#lic-need-help');
 if(need){
  if(st.state==='free'&&(st.ended==='trial'||st.ended==='license')){need.hidden=false;need.dataset.helpTopic=st.ended==='trial'?'what happens when my trial ends':'licence expired';need.textContent=st.ended==='trial'?'Need help with trial ending?':'Need help with an expired key?';helpWireNeed(need.parentElement||need)}
  else need.hidden=true
 }}
$('#licact').onclick=()=>{const m=$('#licmsg'),k=$('#lickey').value;const[ok,info]=checkKey(k,localISO());
 if(!ok){m.className='flag';m.textContent=info;return}store.set('license',{key:k.trim(),activated_at:new Date().toISOString()});$('#lickey').value='';m.className='ok';m.textContent='MatchDesk Pro activated. Thank you!';drawLicense();try{drawDash()}catch{}try{drawPlans()}catch{}toast('MatchDesk Pro activated')};
$('#licpaste').onclick=async()=>{try{const t=await navigator.clipboard.readText();if(!t.trim())throw 0;$('#lickey').value=t.trim();$('#licmsg').className='muted';$('#licmsg').textContent='Key pasted – press Activate.'}catch{$('#lickey').focus();$('#licmsg').className='muted';$('#licmsg').textContent='Press Ctrl+V (or long-press and Paste) in the box.'}};
$('#licremove').onclick=()=>{if(confirm('Remove this license key from this device?')){store.set('license',null);$('#licmsg').textContent='';drawLicense();try{drawDash()}catch{}try{drawPlans()}catch{}}};
// Free-plan limits (switched on with licensing.enforce in config.js; Pro and the trial are never limited)
const hashStr=t=>{let x=5381;for(const ch of t)x=((x<<5)+x+ch.charCodeAt(0))|0;return String(x)};
function canAnalyze(text){if(!licCfg().enforce||isPro())return true;const day=localISO(),u=store.get('usage',{}),slips=u.day===day?u.slips:[],h=hashStr(text.replace(/\s+/g,' ').trim().toLowerCase());
 if(slips.includes(h))return true;if(slips.length>=FREE_ANALYSES_PER_DAY)return false;slips.push(h);store.set('usage',{day,slips});return true}

// ---------- push notifications (alerts even when the app is closed) ----------
const pushOK=()=>window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const b64u=t=>{const r=atob((t+'='.repeat((4-t.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...r].map(c=>c.charCodeAt(0)))};
async function postJSON(url,obj){const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj),signal:c.signal});return await r.json()}finally{clearTimeout(t)}}
async function enablePush(){const st=$('#alpushst');
 if(!pushOK()){st.textContent=window.isSecureContext?'This browser does not support push notifications.':'Push needs a secure (HTTPS) address. It works on http://localhost on this computer, and on your phone once MatchDesk is hosted online (on iPhone, add it to the Home Screen first).';return false}
 const f=await findBase();if(!f||f[0]!=='/api'){st.textContent='Push needs the MatchDesk server (python server.py).';return false}
 let k=null;try{k=await(await fetchT('/api/push/key')).json()}catch{}
 if(!k||!k.enabled){st.textContent='This server cannot send push yet: '+((k&&k.reason)||'unavailable')+'.';return false}
 if(await Notification.requestPermission()!=='granted'){st.textContent='Notifications are blocked. Allow them for this site in your browser settings, then try again.';return false}
 try{const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(k.publicKey)});
  const r=await postJSON('/api/push/subscribe',{subscription:sub.toJSON(),tracked:tracked()});if(!r.ok)throw new Error(r.message||'subscribe failed');
  store.set('push',true);st.textContent=`Push is on for ${tracked().length} tracked item(s). Alerts arrive even when the app is closed.`;$('#alpushtest').hidden=false;return true}
 catch(e){st.textContent='Could not turn push on: '+(e.message||e);return false}}
async function disablePush(){try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub){try{await postJSON('/api/push/unsubscribe',{endpoint:sub.endpoint})}catch{}await sub.unsubscribe()}}catch{}store.set('push',false);$('#alpushst').textContent='Push is off.';$('#alpushtest').hidden=true}
let _ps;function syncPushSoon(){clearTimeout(_ps);_ps=setTimeout(async()=>{if(!store.get('push',false)||!pushOK())return;try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub)await postJSON('/api/push/subscribe',{subscription:sub.toJSON(),tracked:tracked()})}catch{}},1200)}
$('#alpush').checked=store.get('push',false);$('#alpushtest').hidden=!store.get('push',false);
$('#alpush').onchange=async()=>{if($('#alpush').checked){if(!await enablePush()){$('#alpush').checked=false;store.set('push',false)}}else await disablePush()};
$('#alpushtest').onclick=async()=>{const st=$('#alpushst');try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(!sub){st.textContent='Not subscribed yet.';return}
 const r=await postJSON('/api/push/test',{endpoint:sub.endpoint});st.textContent=r.ok?'Test sent – a notification should appear in a few seconds.':(r.message||'The test failed.')}catch{st.textContent='Could not reach the server.'}};
if(store.get('push',false)&&pushOK()&&Notification.permission==='granted')syncPushSoon();else if(store.get('push',false)){store.set('push',false);$('#alpush').checked=false}


// ---------- Terms of Service, Privacy Policy, Refund Policy & Responsible Gambling ----------
// Optional: fill these in and they appear automatically in the Terms (South African law expects
// a seller to show its registration number and physical address). Leave empty to hide the line.
const LEGAL_REG = '';      // e.g. 'Reg. no. 2024/123456/07'
const LEGAL_ADDR = '';     // e.g. '12 Example Street, Pretoria, 0001, South Africa'
const LEGAL_UPDATED = '27 October 2026';

const TERMS_HTML = `
<p class="muted">Please read these Terms carefully. By using MatchDesk or buying access you agree to them, to our <b>Privacy Policy</b>, and to our <b>Refund Policy</b>.</p>
<h4>1. Who we are</h4>
<p>MatchDesk is operated by <b>Tri-Star (Pty) Ltd</b> ("we", "us", "our"), a company registered in South Africa.${LEGAL_REG?` ${LEGAL_REG}.`:''}${LEGAL_ADDR?` Address: ${LEGAL_ADDR}.`:''} Contact: <b>Matchdesksupport@gmail.com</b>.</p>
<h4>2. What MatchDesk is, and is not</h4>
<p>MatchDesk is an <b>informational tool</b>. It shows live scores, analyses bet slips, estimates fair probabilities and risk, and can show optional form notes and AI commentary. MatchDesk is <b>not</b> a bookmaker. We do not accept bets, hold your money, pay winnings, or give betting, financial, investment or legal advice. We are not affiliated with, endorsed by, or sponsored by any bookmaker.</p>
<h4>3. Eligibility and local law</h4>
<ul>
<li>You must be <b>18 or older</b> (or the legal gambling age where you live, if higher).</li>
<li>You must be legally allowed to use gambling-related information services where you are. <b>You are responsible for checking and obeying the laws that apply to you.</b> Do not use MatchDesk where it is unlawful.</li>
<li>If we believe you are under age or using the service unlawfully, we may stop your access.</li>
</ul>
<h4>4. Licence, plans and keys</h4>
<ul>
<li><b>Free plan:</b> available without payment, with fair-use limits (for example a daily number of analyses and saved slips). We may change these limits.</li>
<li><b>Paid plans</b> (for example 30-day or 1-year access) give you the Pro features for the period you bought. Plans are bought through PayPal. After payment a licence key is emailed to your PayPal account email address. Delivery is normally prompt, but can take longer; check your spam folder and contact us if nothing arrives within 24 hours.</li>
<li><b>No automatic renewal.</b> When a key expires the app continues on the Free plan. We will never charge you again unless you buy again yourself.</li>
<li><b>Personal licence.</b> A key gives <b>you</b> a personal, non-exclusive, non-transferable right to use the Pro features on your own devices. You must not share, publish, resell or give away your key, or post it online. Keep it private like a password.</li>
<li>We may refuse, suspend or deactivate a key if it is shared or resold, obtained by fraud, linked to a charge-back or payment dispute you did not first raise with us, or used in breach of these Terms. If we deactivate a key and you did not breach these Terms, we will refund the unused part of your plan.</li>
<li>If you lose your key, contact us from your PayPal email with your PayPal transaction ID and we will resend it.</li>
</ul>
<h4>5. Prices and payment</h4>
<ul>
<li>Prices are set in US dollars. Amounts shown in other currencies are <b>estimates</b> from exchange rates; the amount PayPal shows at checkout is the amount charged.</li>
<li>Payments are handled by PayPal under PayPal's own terms. We never see or store your card details.</li>
<li>If you have a problem with a payment, please contact us first. We can usually fix it faster than a dispute process can.</li>
</ul>
<h4>6. Refunds and cancellation</h4>
<p>We offer a <b>7-day money-back guarantee</b> on your purchase. The full rules are in the <b>Refund Policy</b> (About &rarr; Legal), which forms part of these Terms. Nothing in these Terms removes any refund, cancellation or cooling-off right that the law gives you and that cannot be waived.</p>
<h4>7. Acceptable use</h4>
<p>You may use MatchDesk for personal, lawful purposes. You must not:</p>
<ul>
<li>copy, reverse-engineer, decompile, tamper with, or try to bypass the licence checks or usage limits of the app or service;</li>
<li>attack, overload, scrape or probe our servers, or use automated tools to call our service (including the booking-code loader) at scale;</li>
<li>resell, sub-license or build a competing service from MatchDesk;</li>
<li>use MatchDesk in a way that breaks a bookmaker's rules or the law, or that exposes us to liability;</li>
<li>present MatchDesk outputs to others as guaranteed predictions, tips or professional advice.</li>
</ul>
<h4>8. Third-party services and bookmakers</h4>
<ul>
<li><b>Bookmakers.</b> Bookmaker names and logos belong to their owners and are used only to identify the service you choose. The booking-code loader fetches the public share page for a code <b>you</b> enter, so you can analyse that slip. Bookmakers can change or restrict their websites at any time, so the loader may work only sometimes, or stop working, and we do not promise that any particular bookmaker will be supported. You can always paste your slip instead. You remain responsible for following each bookmaker's own terms.</li>
<li><b>Data and APIs.</b> Live scores, team form, league tables and head-to-head use public ESPN data. Optional extra coverage uses football-data.org with your own key, and optional AI commentary uses Groq or Google Gemini with <b>your own</b> API key and account. Those services have their own terms, limits and costs, and may change or end. We are not responsible for their availability, accuracy or charges.</li>
<li><b>PayPal</b> processes payments; <b>our hosting and infrastructure providers</b> run the service.</li>
</ul>
<h4>9. Estimates only: no advice, no guarantees</h4>
<p>All analysis, probabilities, risk ratings, Kelly-style stake figures, form notes and AI text are <b>estimates produced by software</b>. They can be wrong. They are not predictions, tips or advice, and no result is guaranteed. Past results do not predict future ones. Odds, scores and data may be delayed, incomplete or inaccurate. <b>Whether, how much and where you bet is entirely your decision and at your own risk.</b> Never bet money you cannot afford to lose.</p>
<h4>10. Responsible gambling</h4>
<p>Gambling can be addictive. If it is causing you or someone you know harm, please stop and get help &mdash; see the <b>Responsible Gambling</b> panel in About &rarr; Legal for support lines.</p>
<h4>11. Availability and changes to the service</h4>
<p>We work to keep MatchDesk running, but it is provided "as is" and "as available". It may be interrupted for maintenance, fail because of third-party services, or change over time. We may add, change or remove features, and we will try to avoid removing something you have paid for without a fair remedy (see the Refund Policy).</p>
<h4>12. Intellectual property</h4>
<p>MatchDesk's software, design, text and branding belong to us or our licensors. You receive only the limited right of use in section 4. Third-party data and marks belong to their owners.</p>
<h4>13. Limitation of liability</h4>
<p>To the fullest extent permitted by law, we are not liable for any loss or damage (including betting losses, lost winnings, lost profits, or indirect or consequential loss) arising from your use of, or inability to use, MatchDesk, or from relying on any output. Where liability cannot legally be excluded, it is limited, to the extent the law allows, to the amount you paid us in the 12 months before the claim. Nothing in these Terms excludes or limits liability that cannot be excluded or limited by law, including for fraud, gross negligence, or your rights under the South African <b>Consumer Protection Act 68 of 2008</b> where it applies.</p>
<h4>14. Suspension and ending</h4>
<p>You may stop using MatchDesk at any time. We may suspend or end your access if you seriously or repeatedly breach these Terms. Sections that by their nature should survive (for example 9, 12, 13 and 17) continue after the service ends.</p>
<h4>15. Changes to these Terms</h4>
<p>We may update these Terms. The "last updated" date below will change. For material changes affecting a plan you have already paid for, we will give reasonable notice where practical. Continuing to use MatchDesk after a change means you accept the updated Terms.</p>
<h4>16. Contact and complaints</h4>
<p>Questions or complaints: <b>Matchdesksupport@gmail.com</b>. We will try to resolve your complaint fairly. South African consumers may also approach the National Consumer Commission or the relevant ombud.</p>
<h4>17. Governing law</h4>
<p>These Terms are governed by the laws of the Republic of South Africa, and its courts have jurisdiction, <b>subject to</b> any mandatory consumer-protection rights you have under the law of the country where you live.</p>
<h4>18. General</h4>
<p>If any part of these Terms is found unenforceable, the rest still applies. If we do not enforce a right straight away, we have not given it up. These Terms, the Privacy Policy and the Refund Policy are the whole agreement between you and us about MatchDesk.</p>
<p class="muted">Last updated: ${LEGAL_UPDATED}</p>
`;

const REFUND_HTML = `
<p><b>In short:</b> if you are not happy, ask for your money back <b>within 7 days of paying</b> and we will refund you in full. If your key never arrives or does not work, we will fix it or refund you.</p>
<h4>1. 7-day money-back guarantee</h4>
<p>You may ask for a full refund of any paid plan (30-day or 1-year) within <b>7 days</b> of your payment date, for any reason. This applies to your first purchase of each plan type. You do not need to explain why.</p>
<h4>2. How to ask</h4>
<ol>
<li>Email <b>Matchdesksupport@gmail.com</b> from your PayPal email address.</li>
<li>Put "Refund" in the subject and include your <b>PayPal transaction ID</b> (it is in your PayPal receipt email).</li>
<li>We aim to reply within 2 business days. Approved refunds go back to the <b>same PayPal account</b> you paid with. PayPal usually shows them immediately and may take a few days to reach your bank or card.</li>
</ol>
<p>After a refund, that key must no longer be used and we may deactivate it. Your app simply continues on the Free plan.</p>
<h4>3. Key not received, or not working</h4>
<p>If your licence key does not arrive within 24 hours (check spam and junk first), or it will not activate, contact us. We will send a working key or, if we cannot solve it, <b>refund you in full</b> &mdash; including after the 7 days, for up to 30 days from payment.</p>
<h4>4. Features that stop working</h4>
<p>Some features depend on outside services (for example bookmaker share pages, ESPN data, or your own AI keys). We try to keep them working, but cannot control those services. If a major paid feature stays broken for a long time because of an outside change and we cannot fix it, you may ask for a <b>pro-rata refund</b> for the unused part of your plan, and we will consider it fairly.</p>
<h4>5. What we cannot refund</h4>
<ul>
<li>Requests made after the refund period, except as set out in sections 3 and 4 or where the law requires a refund.</li>
<li>Money lost or not won on bets. MatchDesk is an informational tool that gives estimates, not guaranteed results.</li>
<li>Costs of third-party accounts or API keys you set up yourself (such as Groq or Google).</li>
<li>Currency-conversion or bank fees charged by your bank or PayPal, where they are outside our control.</li>
</ul>
<h4>6. Cancelling</h4>
<p>Plans <b>do not renew automatically</b>, so there is nothing to cancel and we will not charge you again unless you buy again. If you see an unexpected charge, tell us straight away and we will investigate and refund it where it is an error.</p>
<h4>7. Disputes and charge-backs</h4>
<p>Please contact us before opening a PayPal dispute or card charge-back; we can usually sort things out faster. If a dispute is opened, we will respond to PayPal with our records.</p>
<h4>8. Your legal rights</h4>
<p>This policy is in addition to your legal rights. Nothing here limits any right you have under the law, including (where they apply) the South African Consumer Protection Act and Electronic Communications and Transactions Act, and the consumer-protection rules of the UK, EU or other place where you live, including any statutory cooling-off period for digital purchases. Where the law gives you a better right than this policy, the law applies.</p>
<p class="muted">Last updated: ${LEGAL_UPDATED}</p>
`;

const RG_HTML = `
<p>MatchDesk is for information only. Betting should be entertainment, never a way to make money or to chase losses.</p>
<h4>Keep it safe</h4>
<ul>
<li>Only bet what you can afford to lose, and set a budget before you start.</li>
<li>Set deposit and time limits with your bookmaker, and use their cool-off or self-exclusion tools.</li>
<li>Do not chase losses, and do not bet when upset, stressed, tired or after drinking.</li>
<li>Remember that no tool, tip or estimate (including MatchDesk) can guarantee a result.</li>
<li>Bets are for adults only (18+). Do not let anyone under 18 use your betting accounts.</li>
</ul>
<h4>Warning signs</h4>
<ul>
<li>Betting more than you planned, or hiding how much you bet.</li>
<li>Borrowing money or missing bills to bet.</li>
<li>Feeling anxious, irritable or low when you are not betting.</li>
</ul>
<h4>Get free, confidential help</h4>
<ul>
<li><b>South Africa:</b> South African Responsible Gambling Foundation &mdash; toll-free <b>0800 006 008</b> (responsiblegambling.org.za).</li>
<li><b>United Kingdom:</b> National Gambling Helpline (GamCare) &mdash; <b>0808 8020 133</b> (gamcare.org.uk); BeGambleAware (begambleaware.org).</li>
<li><b>United States:</b> <b>1-800-GAMBLER</b>.</li>
<li><b>Elsewhere:</b> search for your country's national gambling helpline, or ask your doctor.</li>
</ul>
<p class="muted">Helpline details can change. If a number does not connect, search online for the organisation's current contact details.</p>
`;

const PRIVACY_HTML = `
<p class="muted">This Policy explains what personal information MatchDesk handles and why. It follows South Africa's <b>Protection of Personal Information Act 4 of 2013 (POPIA)</b> and also covers the UK and EU <b>GDPR</b> and, briefly, US state privacy laws.</p>
<h4>1. Who is responsible</h4>
<p><b>Tri-Star (Pty) Ltd</b> is the "responsible party" under POPIA and the "controller" under GDPR. Contact and Information Officer: <b>Matchdesksupport@gmail.com</b>.</p>
<h4>2. What we handle</h4>
<ul>
<li><b>On your device only:</b> tracked teams, saved slips and history, settings, your optional API keys (Football-Data, Groq, Gemini), and your licence key and its status. This stays in your browser storage on your device and is not sent to us. Clearing your browser or app data removes it, including your licence key, so keep a copy of your key.</li>
<li><b>When you buy:</b> PayPal processes your payment and gives us your name, PayPal email address, country, the amount and the transaction ID. We use these to send your key, give support, handle refunds and meet tax and accounting duties. We never receive your card details.</li>
<li><b>Booking-code loading:</b> when you load a code, the code (or link) and chosen bookmaker are sent to our server, which fetches the public share page for you, using a remote browser service where configured. The result is kept in the server's short-term memory for a few minutes and is not stored permanently.</li>
<li><b>Form and league data:</b> team form, league tables and head-to-head are requested <b>directly from your device</b> to ESPN's public data service. If you also add an optional Football-Data key, those requests pass through our server to football-data.org, and your key is not written to disk by us.</li>
<li><b>Push notifications (optional):</b> if you switch them on, we store your browser's push subscription (an address used to reach your device) and the teams you track, so we can send goal, kick-off and full-time alerts. Turn them off in About to remove the subscription.</li>
<li><b>AI commentary (optional):</b> if you add a Groq or Gemini key, the slip details you ask about (teams, selections, odds) are sent <b>straight from your device</b> to that provider under your own account. We do not see them.</li>
<li><b>Support:</b> your emails to us and our replies.</li>
<li><b>Technical data:</b> our hosting provider and server may record your IP address, device/browser type, time and requested address, for security, abuse prevention (rate-limiting) and fixing faults.</li>
</ul>
<h4>3. Why we use it, and our legal basis</h4>
<ul>
<li><b>To provide the service and your purchase</b> (contract) &mdash; scores, analysis, key delivery, support, refunds.</li>
<li><b>To keep the service secure and fair</b> (legitimate interests) &mdash; stopping abuse, fraud and overload.</li>
<li><b>Push alerts</b> (your consent) &mdash; you can withdraw it any time by switching alerts off.</li>
<li><b>To meet legal duties</b> (legal obligation) &mdash; tax, accounting, responding to lawful requests.</li>
</ul>
<h4>4. Sharing</h4>
<p>We <b>do not sell</b> your personal information and we do not share it for cross-context advertising. We share it only with service providers that help us run MatchDesk, who may use it only for that purpose: <b>PayPal</b> (payments), <b>our hosting provider</b> (running the service), <b>a remote-browser provider</b> (booking-code loading), and <b>our email provider</b> (sending keys and support replies). Public data is fetched from ESPN, football-data.org and an exchange-rate service; those requests do not include your name or email. We may also disclose information where the law requires it, or to protect rights and safety.</p>
<h4>5. Advertising</h4>
<p>If we show adverts from a third-party network, that network may use cookies or similar identifiers. Where the law requires, we will ask for your consent first and explain the details here. Advertisers do not get your licence key or purchase details.</p>
<h4>6. Cookies and local storage</h4>
<p>MatchDesk uses your browser's local storage and a service-worker cache so the app works, remembers your settings and works offline. We do not use our own tracking or advertising cookies.</p>
<h4>7. Sending information abroad</h4>
<p>Our providers (for example PayPal, hosting and email) may process data outside your country, including outside South Africa, the UK and the EEA. Where the law requires, we rely on appropriate safeguards such as adequacy decisions, standard contractual clauses or equivalent protections.</p>
<h4>8. How long we keep it</h4>
<ul>
<li><b>Payment and key records:</b> as long as needed for support, refunds and the tax and accounting periods that apply to us (normally up to 5 years).</li>
<li><b>Push subscriptions:</b> until you turn alerts off, the subscription expires, or you ask us to delete it.</li>
<li><b>Support emails:</b> up to 3 years after the matter is closed, unless we must keep them longer.</li>
<li><b>Server and hosting logs:</b> a limited period set by the provider, normally weeks.</li>
<li><b>Booking-code results:</b> a few minutes, in memory only.</li>
</ul>
<h4>9. Security and breaches</h4>
<p>We use reasonable technical and organisational measures, including encrypted connections (HTTPS). No system is perfectly secure. If a breach affects your personal information, we will notify you and the regulator where the law requires.</p>
<h4>10. Your rights</h4>
<p>Depending on where you live, you may ask us to: give you a copy of your personal information; correct it; delete it; restrict or object to our use of it; give it to you in a portable format; or stop processing based on your consent. Email <b>Matchdesksupport@gmail.com</b>; we may need to confirm who you are first, and we aim to respond within 30 days. You will not be treated worse for using your rights.</p>
<ul>
<li><b>South Africa:</b> you may complain to the <b>Information Regulator</b> (inforegulator.org.za).</li>
<li><b>United Kingdom:</b> you may complain to the <b>Information Commissioner's Office</b> (ico.org.uk).</li>
<li><b>EU/EEA:</b> you may complain to the data-protection authority in your country.</li>
<li><b>California and other US states:</b> you may ask what we hold and ask us to delete it. We do not sell or share personal information.</li>
</ul>
<h4>11. Automated decisions</h4>
<p>MatchDesk's analysis, risk ratings and AI commentary are automated <b>estimates to inform you</b>. They do not make decisions with legal or similarly significant effects about you.</p>
<h4>12. Children</h4>
<p>MatchDesk is for adults aged 18+. We do not knowingly collect information from anyone under 18. If you think a child has given us information, contact us and we will delete it.</p>
<h4>13. Changes</h4>
<p>We may update this Policy. The date below will change, and we will take reasonable steps to tell you about important changes.</p>
<p class="muted">Last updated: ${LEGAL_UPDATED}</p>
`;

function openLegal(title, html){
  const modal = document.getElementById('legal-modal');
  const body = document.getElementById('legal-body');
  const t = document.getElementById('legal-title');
  if(!modal||!body||!t)return;
  t.textContent = title;
  body.innerHTML = html;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  body.scrollTop = 0;
}
function closeLegal(){
  const modal = document.getElementById('legal-modal');
  if(modal) modal.hidden = true;
  document.body.style.overflow = '';
}
document.getElementById('btn-terms')?.addEventListener('click', ()=>openLegal('Terms of Service', TERMS_HTML));
document.getElementById('btn-privacy')?.addEventListener('click', ()=>openLegal('Privacy Policy', PRIVACY_HTML));
document.getElementById('btn-refunds')?.addEventListener('click', ()=>openLegal('Refund Policy', REFUND_HTML));
document.getElementById('btn-rg')?.addEventListener('click', ()=>openLegal('Responsible Gambling', RG_HTML));
document.getElementById('legal-close')?.addEventListener('click', closeLegal);
document.getElementById('legal-backdrop')?.addEventListener('click', closeLegal);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLegal(); });


// ---------- Guided Tour ----------
const TOUR_STEPS=[
 {tab:'dash',sel:'header',title:'Welcome to MatchDesk',body:'This short tour shows you the main tools. You can restart it any time with the 🧭 Tour button.'},
 {tab:'dash',sel:'.tiles',title:'Quick Launch',body:'Jump straight to the Bet Analyzer, Live Scores, Plans, or Video Guide from these tiles.'},
 {tab:'dash',sel:'#glance',title:'At a glance',body:'See how many teams you track, live matches, saved slips, your plan status, and whether form data or code loading is ready.'},
 {tab:'analyzer',sel:'#analyzer .left',title:'Bet Analyzer – input',body:'Paste a booking code / Bet ID, load a share link, paste slip text, or import a screenshot. Set a target odds and tap Analyze.'},
 {tab:'analyzer',sel:'#analyzer .right',title:'Risk ratings & recommendations',body:'After analysis you get per-leg risk, fair probability estimates, form notes from recent results, and recommended combinations near your target odds.'},
 {tab:'scores',sel:'#scores .row',title:'Live Scores – choose sport & league',body:'Pick a sport and league, search teams, or track a whole league. Scores auto-refresh while this tab is open.'},
 {tab:'scores',sel:'#scores details.card',title:'Track from code or manually',body:'Add any ESPN sport/league/team manually, or load teams straight from a booking code. Use “Teams from my slip” after analyzing a slip.'},
 {tab:'scores',sel:'#chips',title:'Your tracked list',body:'Everything you track appears here. Tap a chip to stop tracking it, or use Clear to empty the list.'},
 {tab:'video',sel:'#video',title:'Live Video Feed',body:'Only official, legal broadcaster links are shown for the matches you track. Availability depends on your country and any subscription.'},
 {tab:'history',sel:'#history',title:'History',body:'Settled slips and hit-rate stats live here so you can review past analyses.'},
 {tab:'about',sel:'#plans-h',title:'License & Plans',body:'Activate a Pro key or start a free trial. Prices appear in your local currency (Rands, Pounds, Dollars, etc.). Payment is via PayPal.'},
 {tab:'about',sel:'#about .card',title:'Settings & alerts',body:'Optional API keys for form data and AI commentary stay on this device only. Turn on sound, pop-up or push notifications for goal alerts.'},
 {tab:'dash',sel:'.card',title:'Responsible Gambling',body:'MatchDesk is an informational tool only — estimates, not advice. 18+ and gamble responsibly. You can restart this tour any time with the Tour button.'}
];
let tourI=-1,tourHL=null,tourTip=null;
function tourGo(tab){const btn=document.querySelector(`nav [data-t="${tab}"]`);if(btn)btn.click()}
function tourClear(){if(tourHL){tourHL.remove();tourHL=null}if(tourTip){tourTip.remove();tourTip=null}document.body.classList.remove('tour-active');document.querySelectorAll('.tour-pulse').forEach(e=>e.classList.remove('tour-pulse'))}
function tourPlace(el,step,idx){
 const r=el.getBoundingClientRect(),pad=8;
 tourHL=document.createElement('div');tourHL.id='tour-highlight';
 tourHL.style.left=(r.left-pad+window.scrollX)+'px';tourHL.style.top=(r.top-pad+window.scrollY)+'px';
 tourHL.style.width=(r.width+pad*2)+'px';tourHL.style.height=(r.height+pad*2)+'px';
 document.body.appendChild(tourHL);
 tourTip=document.createElement('div');tourTip.id='tour-tooltip';
 tourTip.innerHTML=`<h4>${esc(step.title)}</h4><p>${esc(step.body)}</p>
  <div class="tour-nav"><span class="muted">${idx+1} / ${TOUR_STEPS.length}</span>
  <button type="button" class="ghost" id="tour-skip">Skip</button>
  <button type="button" id="tour-next">${idx===TOUR_STEPS.length-1?'Finish':'Next'}</button></div>`;
 document.body.appendChild(tourTip);
 const tipR=tourTip.getBoundingClientRect();
 let left=Math.max(12,Math.min(window.innerWidth-tipR.width-12,r.left+r.width/2-tipR.width/2));
 const spaceBelow=window.innerHeight-r.bottom,spaceAbove=r.top;
 let top=spaceBelow>tipR.height+24||spaceBelow>=spaceAbove?r.bottom+14:r.top-tipR.height-14;
 tourTip.style.left=left+'px';tourTip.style.top=Math.max(12,Math.min(window.innerHeight-tipR.height-12,top))+'px';
 $('#tour-skip').onclick=()=>{tourClear();toast('Tour skipped')};
 $('#tour-next').onclick=()=>tourShow(idx+1);
}
function tourShow(i){
 tourClear();
 if(i<0||i>=TOUR_STEPS.length){if(i>=TOUR_STEPS.length)toast('Tour complete — explore freely!');return}
 tourI=i;document.body.classList.add('tour-active');
 const step=TOUR_STEPS[i];
 tourGo(step.tab);
 setTimeout(()=>{
  let el=document.querySelector(step.sel);
  if(!el||(el.offsetParent===null&&step.tab!=='dash'))el=document.getElementById(step.tab)||document.querySelector(`nav [data-t="${step.tab}"]`);
  if(!el){tourShow(i+1);return}
  el.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>tourPlace(el,step,i),280);
 },140);
}
$('#tour-btn').onclick=()=>tourShow(0);

// ---------- built-in Help assistant (offline FAQ chatbot) ----------
const HELP_SUPPORT='Matchdesksupport@gmail.com';
const HELP_SUGGEST=[
  'How do I activate my key?',
  'Why won’t my booking code load?',
  'What happens when my trial ends?',
  'How do I pay with PayPal?',
  'What is the Free plan limit?',
  'How do goal alerts work?',
  'Where is form & H2H data from?',
  'How do I get a refund?',
  'Responsible gambling'
];
// Each entry: q = phrases, a = answer, go = optional deep-link actions [{label, tab, scroll?, tour?}]
const HELP_QA=[
  {q:['activate key','enter key','licence key','license key','how do i activate','put in my key','use my key','paste key','md1 key'],
   a:'Open the About tab → Licence & Plans. Paste or type your key (it usually starts with MD…) and tap Activate. Keys are emailed after a successful PayPal payment. Your key stays on this device only.',
   go:[{label:'Open Licence & Plans',tab:'about',scroll:'plans-h'}]},
  {q:['trial ends','trial end','when trial','what happens when my trial','after trial','trial over','free trial ends','trial finished'],
   a:'New installs can include a 7-day Pro trial with full access. When it ends, MatchDesk continues on the Free plan: 1 bet-slip analysis per day and up to 5 saved slips. Tracked teams, live scores and history remain available. You can unlock Pro anytime from About → Plans.',
   go:[{label:'See plans',tab:'about',scroll:'plans-h'}]},
  {q:['free plan','daily limit','analysis limit','how many analysis','free limit','1 analysis','one analysis','limit reached','daily free'],
   a:'The Free plan allows 1 new bet-slip analysis per day and up to 5 saved slips. Re-analysing the same slip still works. Live scores, tracking and basic tools stay available. Pro removes these limits.',
   go:[{label:'See plans',tab:'about',scroll:'plans-h'}]},
  {q:['booking code','load code','code won\'t load','code will not load','code not loading','why won\'t my booking','load & track','scode','bet id not loading','code fails','code failed','booking id'],
   a:'Paste a booking code, Bet ID or share link in Live Scores → “Load & track” or in the Analyzer, then tap Load code. It needs the server (or local helper) and a working connection.\n\nCommon reasons it fails:\n• Bookmaker blocks cloud servers\n• 10Bet has no public code page — paste the slip text instead\n• Sportingbet needs the full Share My Bet link\n• Timeout or temporary site change\n\nIf it fails, open the bookmaker page yourself or email support with the bookmaker name and a screenshot.',
   go:[{label:'Open Analyzer',tab:'analyzer'},{label:'Open Live Scores',tab:'scores'}]},
  {q:['payfast','pay with payfast','rand','zar payment','south africa pay'],
   a:'PayFast (rand / Instant EFT) is not available yet. For now please use PayPal from About → Plans. After payment your licence key is emailed to your PayPal account address. PayFast will be added when it is connected.',
   go:[{label:'Open Plans',tab:'about',scroll:'plans-h'}]},
  {q:['paypal','pay with paypal','how to pay','buy pro','purchase','checkout','payment'],
   a:'Open About → Plans & Pricing and tap a paid plan to open PayPal checkout. PayPal charges in USD ($4.99 for 30 days / $49.99 for 1 year) and converts at its own rate.\n\nAfter you pay:\n1. Check the email on your PayPal account for the licence key\n2. Paste the key in About → Licence & Plans\n3. Tap Activate — you are on Pro',
   go:[{label:'Open Plans',tab:'about',scroll:'plans-h'}]},
  {q:['refund','money back','cancel payment','7-day','money-back'],
   a:'There is a 7-day money-back guarantee. Email Matchdesksupport@gmail.com from your PayPal account email. Include the payment date and approximate amount. Full details are in About → Refund Policy.',
   go:[{label:'Refund Policy',tab:'about',legal:'refunds'}]},
  {q:['goal alert','push notification','alerts','notification','sound when score','push not working'],
   a:'In About → Goal alerts you can turn on:\n• Sound & vibration when a score changes\n• Pop-up notifications while the app is open\n• Push notifications (alerts even when the app is closed)\nTrack teams or leagues first on the Live Scores tab. Push needs a secure (HTTPS) address and permission from the browser.',
   go:[{label:'Open Goal alerts',tab:'about',scroll:'alpush'},{label:'Open Live Scores',tab:'scores'}]},
  {q:['form data','h2h','head to head','league position','football-data','where does data','espn data','data sources'],
   a:'Form, league position and head-to-head come from ESPN by default (no key needed). Optionally add a free Football-Data.org key in About → Settings; then Football-Data is tried first for major European leagues and ESPN covers everything else. Keys stay only on this device.',
   go:[{label:'Open Settings',tab:'about',scroll:'fdkey'}]},
  {q:['ai commentary','groq','gemini','ai key'],
   a:'Optional. In About → Settings you can add a Groq key (primary, fast) and/or Google Gemini key (fallback). When set, recommended combinations can show AI commentary. AI text is an automated estimate only and is not betting advice. Keys stay on this device.',
   go:[{label:'Open Settings',tab:'about',scroll:'groqkey'}]},
  {q:['install app','add to home','pwa','home screen'],
   a:'On supported phones, open the app in the browser and use “Install app” / “Add to Home Screen” (or the Install card on the Home tab). This gives one-tap access, a fuller-screen experience and better support for push alerts.',
   go:[{label:'Go Home',tab:'dash'}]},
  {q:['offline','no internet','works offline'],
   a:'The app caches recent data. You can still open it and view last-saved slips, history and settings while offline. Live scores and loading booking codes need a connection. A yellow bar appears when you are offline. Help answers also work offline.'},
  {q:['track team','add team','track league','from slip'],
   a:'On Live Scores: search or type a team and tap Track, or use “Track whole league”. You can also load a booking code and track those teams, or use “＋ Add teams from analyzed slip” after running the Analyzer.',
   go:[{label:'Open Live Scores',tab:'scores'}]},
  {q:['history','saved slips','hit rate'],
   a:'Analyses you save appear in the History tab. Mark them Won or Lost to build your personal hit-rate (shown on Home). Free plan keeps up to 5 saved slips; Pro has unlimited history.',
   go:[{label:'Open History',tab:'history'}]},
  {q:['video','live stream','watch match'],
   a:'The Video tab lists official / legal broadcasters and stream sources only. MatchDesk does not host or pirate streams.',
   go:[{label:'Open Video',tab:'video'}]},
  {q:['currency','price in rand','local price','exchange rate'],
   a:'Plan prices are based on USD ($4.99 / $49.99). The app shows an estimate in your local currency (from device region/timezone and live rates). PayPal charges in USD. Local-currency figures shown in the app are estimates only.'},
  {q:['key not working','invalid key','licence expired','license expired','key expired'],
   a:'Check you pasted the full key with no extra spaces. Keys are tied to the same public key as the desktop app. If a licence has an expiry date and that date has passed, you return to the Free plan — enter a new key or renew from About → Plans. Contact support if a freshly emailed key fails.',
   go:[{label:'Open Licence',tab:'about',scroll:'plans-h'}]},
  {q:['contact support','email support','help email','customer service'],
   a:'Email Matchdesksupport@gmail.com. For payment issues, write from your PayPal account email and include the date and amount. For booking-code problems, include the bookmaker name and what you tried.'},
  {q:['what is matchdesk','about the app','who made'],
   a:'MatchDesk is a live-scores + bet-slip analyzer app by Tri-Star (Pty) Ltd. It runs on your device; slips and keys stay local. Live scores use ESPN; optional Football-Data, Groq and Gemini keys enhance form/H2H and AI commentary.'},
  {q:['responsible gambling','gambling help','self exclude','addiction','problem gambling','gamble responsibly'],
   a:'18+ only. Gamble responsibly. No outcome is guaranteed. MatchDesk is an informational tool — estimates, not advice.\n\nIf gambling is causing harm, stop and get help. Open Responsible Gambling in About for support lines (including South Africa: 0800 006 008).',
   go:[{label:'Responsible Gambling',tab:'about',legal:'rg'}]},
  {q:['terms','privacy','legal'],
   a:'Terms of Service, Privacy Policy, Refund Policy and Responsible Gambling are available as buttons in the About tab. Tap any of them to read the full text in-app.',
   go:[{label:'Open About',tab:'about'}]},
  {q:['tour','how to use','getting started','first time'],
   a:'Tap the 🧭 Tour button (bottom-right) for a short guided walkthrough of the main screens. You can also open this Help chat anytime.',
   go:[{label:'Start Tour',tour:true}]},
  {q:['clear data','reset','remove key','logout'],
   a:'In About → Licence & Plans you can Remove key. Browser storage (keys, history, tracked teams) can be cleared from your browser/site settings. There is no cloud account to log out of — everything is device-local.',
   go:[{label:'Open Licence',tab:'about',scroll:'plans-h'}]},
  {q:['daily free limit reached','can\'t analyze','analysis blocked','cannot analyze'],
   a:'On the Free plan you get 1 new analysis per day. The same slip can be re-run. Upgrade to Pro (About → Plans) for unlimited analyses, or wait until tomorrow (resets at midnight local time).',
   go:[{label:'See plans',tab:'about',scroll:'plans-h'}]},
  {q:['push not working','no push','test notification'],
   a:'Push needs HTTPS (or localhost), browser permission, and the “Push notifications” toggle in About → Goal alerts. Use the “Send test notification” button if it appears. Some browsers or OS battery settings can block background push.',
   go:[{label:'Open Goal alerts',tab:'about',scroll:'alpush'}]},
  {q:['ocr','screenshot','import image','paste slip'],
   a:'In the Analyzer you can paste text, paste from clipboard, or import a screenshot of a slip. The app tries to read the image on-device. Clear, high-contrast screenshots work best.',
   go:[{label:'Open Analyzer',tab:'analyzer'}]},
  {q:['risk rating','recommendation','how does analyzer work'],
   a:'The Analyzer estimates probabilities from odds (with a bookmaker margin), optional form/H2H, and produces risk bands and combination suggestions. These are estimates only — not predictions or guarantees. Always bet responsibly.',
   go:[{label:'Open Analyzer',tab:'analyzer'},{label:'Responsible Gambling',tab:'about',legal:'rg'}]},
  {q:['plans','pricing','pro cost','how much'],
   a:'Free Forever (1 analysis/day, 5 saved slips).\n30-day Pro ≈ $4.99 USD.\n1-year Pro ≈ $49.99 USD.\nKeys are emailed after PayPal payment and do not auto-renew. See About → Plans for the current local-currency estimate and checkout.',
   go:[{label:'Open Plans',tab:'about',scroll:'plans-h'}]},
  {q:['server','deploy','self host','docker'],
   a:'This online build is meant to be hosted (Docker, Fly.io, Railway, etc.) so phones can open one link and load booking codes. For local testing use the start scripts or `python server.py`. See the project README for environment variables and notes about bookmaker blocking of cloud IPs.'}
];

const HELP_SYNONYMS=[
  ['licence','license','licen'],
  ['booking code','booking id','bet id','bet code','slip code','share link','share code'],
  ['won\'t load','will not load','not loading','doesn\'t load','does not load','failed to load','can\'t load','cannot load','code fails'],
  ['paypal','pay pal','payment','pay'],
  ['trial','free trial','pro trial'],
  ['alert','alerts','notification','notifications','push'],
  ['refund','money back','chargeback'],
  ['activate','activation','enter key','use key'],
  ['gambling','gamble','addiction','problem gambling']
];

function helpNorm(s){
  let t=(s||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[^\w\s']/g,' ').replace(/\s+/g,' ').trim();
  for(const group of HELP_SYNONYMS){
    const canon=group[0];
    for(const alt of group.slice(1)){
      if(t.includes(alt)) t=t.split(alt).join(canon);
    }
  }
  return t;
}
function helpScore(n, item){
  let score=0;
  for(const k of item.q){
    const kn=helpNorm(k);
    if(!kn)continue;
    if(n===kn)score+=kn.length+20;
    else if(n.includes(kn))score+=kn.length+12;
    else if(kn.includes(n)&&n.length>=4)score+=n.length+6;
    else{
      const words=kn.split(' ').filter(w=>w.length>2);
      const hits=words.filter(w=>n.includes(w)).length;
      if(hits)score+=hits*4+(hits===words.length?8:0);
    }
  }
  return score;
}
function helpMatch(text){
  const n=helpNorm(text);if(!n||n.length<2)return null;
  let best=null,bestScore=0,second=null,secondScore=0;
  for(const item of HELP_QA){
    const score=helpScore(n,item);
    if(score>bestScore){second=best;secondScore=bestScore;best=item;bestScore=score}
    else if(score>secondScore){second=item;secondScore=score}
  }
  if(bestScore>=8)return {item:best,score:bestScore,near:null};
  if(bestScore>=4)return {item:null,score:bestScore,near:best}; // did you mean
  return null;
}
function helpEmailLink(q){
  const sub=encodeURIComponent('MatchDesk help');
  const body=encodeURIComponent('Hi,\n\nI need help with:\n'+(q||'')+'\n\n(Please describe what you tried and any error messages.)\n');
  return `mailto:${HELP_SUPPORT}?subject=${sub}&body=${body}`;
}
function helpRunGo(action){
  if(!action)return;
  if(action.tour){helpClose();setTimeout(()=>tourShow(0),120);return}
  if(action.legal==='rg'){helpClose();goTab('about');setTimeout(()=>openLegal('Responsible Gambling', RG_HTML),200);return}
  if(action.legal==='refunds'){helpClose();goTab('about');setTimeout(()=>openLegal('Refund Policy', REFUND_HTML),200);return}
  if(action.tab){
    helpClose();
    goTab(action.tab, action.scroll==='plans-h'?1:0);
    if(action.scroll&&action.scroll!=='plans-h'){
      setTimeout(()=>{
        const el=document.getElementById(action.scroll);
        if(el)el.scrollIntoView({behavior:'smooth',block:'center'});
      },180);
    }
  }
}
function helpActionsHtml(item){
  const parts=[];
  (item.go||[]).forEach((g,i)=>{
    parts.push(`<button type="button" class="ghost" data-hgo="${i}">${esc(g.label)}</button>`);
  });
  parts.push(`<button type="button" class="ghost" data-more="1">More questions</button>`);
  return parts.length?`<div class="help-actions">${parts.join('')}</div>`:'';
}
function helpBindActions(item){
  const body=$('#help-body');if(!body)return;
  body.querySelectorAll('[data-hgo]').forEach(b=>{
    b.onclick=()=>{
      const i=parseInt(b.dataset.hgo,10);
      const act=(item&&item.go&&item.go[i])||null;
      helpRunGo(act);
    };
  });
  body.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>helpShowSuggestions());
  body.querySelectorAll('[data-near]').forEach(b=>{
    b.onclick=()=>{
      const idx=parseInt(b.dataset.near,10);
      if(HELP_QA[idx]) helpAsk(HELP_QA[idx].q[0]);
    };
  });
}
function helpAddMsg(role,html){
  const box=$('#help-messages');if(!box)return;
  const div=document.createElement('div');
  div.className='help-msg '+role;
  div.innerHTML=html;
  box.appendChild(div);
  const body=$('#help-body');if(body)body.scrollTop=body.scrollHeight;
}
function helpShowSuggestions(list){
  const el=$('#help-suggestions');if(!el)return;
  el.innerHTML=(list||HELP_SUGGEST).map(t=>`<button type="button" data-hq="${esc(t)}">${esc(t)}</button>`).join('');
  el.querySelectorAll('[data-hq]').forEach(b=>b.onclick=()=>{helpAsk(b.dataset.hq)});
}
function helpAsk(raw){
  const q=(raw||'').trim();if(!q)return;
  helpAddMsg('user',esc(q));
  const hit=helpMatch(q);
  if(hit&&hit.item){
    helpAddMsg('bot',esc(hit.item.a)+helpActionsHtml(hit.item));
    helpBindActions(hit.item);
  }else if(hit&&hit.near){
    const idx=HELP_QA.indexOf(hit.near);
    const label=hit.near.q[0];
    helpAddMsg('bot',`I don’t have an exact match. Did you mean: <b>${esc(label)}</b>?<div class="help-actions"><button type="button" data-near="${idx}">Yes — show that answer</button><a class="ghost" href="${helpEmailLink(q)}">Email support</a><button type="button" class="ghost" data-more="1">Show suggestions</button></div>`);
    helpBindActions(hit.near);
  }else{
    helpAddMsg('bot',`I don’t have a prepared answer for that yet. You can try one of the suggested questions, or email support and we’ll help you directly.<div class="help-actions"><a class="ghost" href="${helpEmailLink(q)}">Email support</a><button type="button" class="ghost" data-more="1">Show suggestions</button></div>`);
    helpBindActions(null);
  }
  $('#help-suggestions').innerHTML='';
  const inp=$('#help-input');if(inp)inp.value='';
}
function helpOpen(prefill){
  const m=$('#help-modal');if(!m)return;
  m.hidden=false;document.body.classList.add('help-open');
  const box=$('#help-messages');
  if(box&&!box.children.length){
    helpAddMsg('bot','Hi — ask me about plans, keys, booking codes, alerts, payments or anything else in MatchDesk. Tap a suggestion or type your own question.');
    helpShowSuggestions();
  }
  if(prefill){
    setTimeout(()=>helpAsk(prefill),60);
  }else{
    setTimeout(()=>$('#help-input')?.focus(),80);
  }
}
function helpClose(){
  const m=$('#help-modal');if(m)m.hidden=true;
  document.body.classList.remove('help-open');
}
function helpNeedBtn(topic,label){
  return `<button type="button" class="ghost help-need" data-help-topic="${esc(topic)}">${esc(label||'Need help?')}</button>`;
}
function helpWireNeed(root){
  (root||document).querySelectorAll('[data-help-topic]').forEach(b=>{
    if(b._helpWired)return;b._helpWired=true;
    b.onclick=e=>{e.preventDefault();e.stopPropagation();helpOpen(b.dataset.helpTopic)};
  });
}
$('#help-btn')&&($('#help-btn').onclick=()=>helpOpen());
$('#help-close')&&($('#help-close').onclick=helpClose);
$('#help-backdrop')&&($('#help-backdrop').onclick=helpClose);
$('#help-form')&&($('#help-form').onsubmit=e=>{e.preventDefault();helpAsk($('#help-input')?.value||'')});

// ---------- offline + network status ----------
function syncOfflineBar(){
  const bar=$('#offlinebar');if(!bar)return;
  bar.hidden=navigator.onLine;
}
addEventListener('online',()=>{syncOfflineBar();try{if(mon)loadScores()}catch{};toast('Back online')});
addEventListener('offline',()=>{syncOfflineBar();toast('Offline — showing saved data')});
syncOfflineBar();

// ---------- remember target odds ----------
try{const t=store.get('target_odds',null);if(t&&$('#target'))$('#target').value=t}catch{}
$('#target')?.addEventListener('change',()=>{try{store.set('target_odds',parseFloat($('#target').value)||5)}catch{}});

// ---------- start-up (last, so everything above is defined) ----------
drawChips();loadTeams();loadScores();drawDash();drawAds();loadBranding();drawPlans();drawLicense();
try{drawPlanBar()}catch{}
setInterval(()=>{if(mon&&!document.hidden)loadScores()},30000);
// Soft trial reminder once per day when <=2 days left
try{
  const st=licStatus();
  if(st.state==='trial'&&st.days_left!=null&&st.days_left<=2){
    const k='trial_nudge_'+localISO();
    if(!store.get(k,false)){store.set(k,true);setTimeout(()=>toast(`Pro trial: ${st.days_left} day(s) left — plans are in About`),1200)}
  }
}catch{}
