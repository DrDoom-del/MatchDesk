'use strict';
const BUILD='v27';
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
$('#sport').innerHTML=Object.entries(SPORTS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
$('#sport').value=SPORTS[store.get('sport','soccer')]?store.get('sport','soccer'):'soccer';
function fillLeagues(){const g={};SPORTS[$('#sport').value].leagues.forEach(l=>(g[l[2]]=g[l[2]]||[]).push(l));
 $('#league').innerHTML=Object.entries(g).map(([r,a])=>`<optgroup label="${r}">${a.map(l=>`<option value="${l[0]}">${esc(l[1])}</option>`).join('')}</optgroup>`).join('')}
fillLeagues();{const sv=store.get('league','eng.1');if([...$('#league').options].some(o=>o.value===sv))$('#league').value=sv}
const leagueName=()=>$('#league').selectedOptions[0]?.textContent||'';
const tracked=()=>store.get('tracked',[]),setTracked=t=>{store.set('tracked',t);drawChips();drawTeams();if(typeof syncPushSoon==='function')syncPushSoon()};
const espn=async(sport,lg,kind)=>{const r=await fetchT(`https://site.api.espn.com/apis/site/v2/sports/${spt(sport).path}/${lg}/${kind}`);if(!r.ok)throw new Error(r.status);return r.json()};
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
function addEntries(list){const t=tracked();let add=0;for(const e of list){if(t.length>=MAX_TRACK)break;if(!t.some(x=>x.sport===e.sport&&x.team.toLowerCase()===e.team.toLowerCase()&&(x.league||'')===(e.league||''))){t.push(e);add++}}setTracked(t);return add}
function toggleTeam(n){let t=tracked();const sport=$('#sport').value,lg=$('#league').value,i=t.findIndex(e=>e.sport===sport&&e.team.toLowerCase()===n.toLowerCase());
 if(i>=0){t.splice(i,1);setTracked(t)}else{if(t.length>=MAX_TRACK){$('#status').textContent=`You can track up to ${MAX_TRACK} items.`;return}addEntries([{team:n,sport,league:lg}])}loadScores()}
$('#twhole').onclick=()=>{addEntries([{team:'🌐 '+leagueName(),sport:$('#sport').value,league:$('#league').value}]);loadScores()};
$('#madd').onclick=()=>{const sport=$('#msport').value.trim().toLowerCase(),lg=$('#mleague').value.trim(),team=$('#mteam').value.trim(),st=$('#mst');
 if(!sport||!lg){st.textContent='Enter a sport and a league code (for example soccer + eng.1).';return}
 const n=addEntries([{team:team||'🌐 '+sport+'/'+lg,sport,league:lg}]);st.textContent=n?`Tracking ${team||'the whole '+lg+' league'} (${sport}/${lg}). If nothing shows up, check the league code.`:'Already tracking that (or the limit of '+MAX_TRACK+' is reached).';$('#mteam').value='';loadScores()};
function addSlipTeams(legs){const names=[...new Set((legs||[]).flatMap(l=>teamsOf(l.match)).filter(Boolean))];if(!names.length)return null;
 return[addEntries(names.map(n=>({team:n,sport:'soccer',league:''}))),names.length]}
$('#fromslip').onclick=()=>{const r=addSlipTeams(lastLegs);$('#status').textContent=r?`Added ${r[0]} of ${r[1]} team(s) from your slip. They are looked up in the major leagues and cups; for a team in another league, open that league and tap the team.`:'No teams found – analyze a slip first.';loadScores()};
$('#scodebtn').onclick=async()=>{const raw=$('#scode').value.trim(),st=$('#scst');if(!raw){st.textContent='Type or paste a booking code, Bet ID or link first.';return}
 let text=raw;if(!looksLikeSlip(raw)){st.textContent='Loading the slip from the bookmaker…';const hr=await helperResolve(raw,'Auto',st);
  if(!hr){st.textContent='Loading a code needs the MatchDesk server (or the local helper). You can paste the slip text here instead.';return}
  if(!hr.ok){st.textContent=hr.message||'Could not load that code.';return}text=hr.text}
 const r=addSlipTeams(parse(text));st.textContent=r?`Added ${r[0]} of ${r[1]} team(s) from that slip to your tracking.`:'No teams found in that slip.';loadScores()};
function clearTracking(){const n=tracked().length;browse=false;try{localStorage.removeItem('md_tracked')}catch{}setTracked([]);lastList=[];Object.keys(lastScores).forEach(k=>delete lastScores[k]);
 $('#matches').innerHTML='';$('#status').textContent='';try{drawVideo()}catch{}toast(n?`Cleared ${n} tracked item(s)`:'Nothing was being tracked');loadScores()}
document.addEventListener('click',e=>{const t=e.target.closest?e.target:null;if(!t)return;if(t.closest('#golimit')){document.querySelector('nav [data-t=about]').click();setTimeout(()=>document.getElementById('plans-h').scrollIntoView(),60);return}if(t.closest('#clrtrack'))clearTracking();else if(t.closest('#browsebtn')){browse=true;loadScores()}});
function drawChips(){const t=tracked();$('#chips').innerHTML=t.length?t.map((e,i)=>`<button class="chip on" data-i="${i}" title="Tap to stop tracking">${esc(e.team)}${e.sport!=='soccer'?' · '+esc(spt(e.sport).label.replace(/^\S+\s/,'')):''} ✕</button>`).join(''):'<span class="muted">Nothing tracked yet. Tap teams above to follow them.</span>'}
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
 return ev.filter(m=>{const[h,a]=comps(m),hn=(h.team?.displayName||'').toLowerCase(),an=(a.team?.displayName||'').toLowerCase();
  return tr.some(e=>{const et=e.team.toLowerCase();if(m._sport==='f1')return e.sport==='f1';
   if(et.startsWith('🌐'))return e.sport===m._sport&&(WILD.includes((e.league||'').toLowerCase())||e.league===m._league);return et&&(hn.includes(et)||an.includes(et))})}).sort((x,y)=>new Date(x.date)-new Date(y.date))}
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
 return `<div class="card"><div class="m"><span class="muted">${sp.label} · <span class="${live?'live':''}">${live?'● ':''}${esc(st.shortDetail||st.detail||'')}</span></span><span class="muted">🕒 ${esc(fmtKick(m.date))}</span></div>
 <div class="m" style="margin-top:6px"><div><b>${esc(nm(h))}</b><br><b>${esc(nm(a))}</b></div><div class="sc" style="${changed?'color:var(--r)':''}">${pre?'–':esc(h.score??'')+'<br>'+esc(a.score??'')}</div></div></div>`}
let lastList=[];
let browse=true;   // false right after Clear: show an empty state instead of the whole league
let loadSeq=0;   // a newer refresh always wins: a slow older one must never repaint over it
async function loadScores(){const my=++loadSeq,stEl=$('#status'),box=$('#matches'),tr=tracked(),pairs=new Set(),jobs=[];let f1Mode=null,ckNames=null,ckWhole=false;
 const consider=(sport,league,team)=>{const sp=spt(sport);
  if(sp.special==='f1')f1Mode=(league==='season'||f1Mode==='season')?'season':'latest';
  else if(sp.special==='cricket'){ckNames=ckNames||[];if(!team||team.startsWith('🌐'))ckWhole=true;else ckNames.push(team)}
  else if(league)pairs.add(sport+'|'+league);else if(sport==='soccer')MAJOR.forEach(l=>pairs.add('soccer|'+l))};
 if(!tr.length&&!browse){lastList=[];box.innerHTML=`<div class="card"><b>Nothing is being tracked.</b><p class="muted">Pick a league above and tap teams to follow them, or <button class="chip" id="browsebtn">show all matches in ${esc(leagueName())}</button></p></div>`;stEl.textContent='';try{drawVideo()}catch{}if($('#dash').classList.contains('on'))drawDash();return}
 if(!tr.length)consider($('#sport').value,$('#league').value,'');else tr.forEach(e=>consider(e.sport,e.league,e.team));
 [...pairs].forEach(p=>jobs.push({name:p.split('|')[1],run:async()=>{const[sport,lg]=p.split('|');return((await espn(sport,lg,'scoreboard')).events||[]).map(e=>({...e,_sport:sport,_league:lg}))}}));
 if(f1Mode)jobs.push({name:'Formula 1',run:()=>f1Events(f1Mode)});
 if(ckNames)jobs.push({name:'Cricket',run:()=>cricketEvents(ckWhole||!ckNames.length?NATIONS:ckNames,ckWhole||!ckNames.length?10:6)});
 const res=await Promise.allSettled(jobs.map(j=>j.run()));if(my!==loadSeq)return;const ok=res.filter(r=>r.status==='fulfilled');
 if(!ok.length){stEl.textContent=navigator.onLine?'Could not reach the live data feed. Your tracked list is still saved — try Refresh when you are online.':'You are offline.';if(/loading…/.test(box.textContent))box.innerHTML='<p class="muted">Could not load scores right now. Check your connection, then press Refresh.</p>';return}
 const seen=new Set(),ev=[];ok.forEach(r=>r.value.forEach(e=>{if(e.id&&!seen.has(e.id)){seen.add(e.id);ev.push(e)}}));
 const list=filterEvents(ev,tr);lastList=list;
 box.innerHTML=(tr.length?'':`<p class="muted">Nothing tracked – showing all matches in ${esc(leagueName())}. Tap teams above to follow them.</p>`)+(list.length?list.map(card).join(''):`<p class="muted">${tr.length?'No live or upcoming events for what you track right now.':'No matches right now for this league.'}</p>`);
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
  else if(st.state==='free'){html=`<b style="color:var(--o)">Free plan</b><p class="muted" style="margin:6px 0">${freeAnalysesLeft()} analysis slot(s) left today · up to ${FREE_SAVED_SLIPS} saved slips. Pro unlocks unlimited analyses.</p><button type="button" data-go="about" data-plans="1">Upgrade to Pro</button>`;}
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
  else msg=`<span style="color:var(--o)"><b>Free plan</b> · ${freeAnalysesLeft()} analysis left today</span>`;
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
 if(/\b(match result|full time result|1x2|to win)\b/.test(low)){o.market='1X2';o.kind='win';return o}
 return o}
function evalCrit(c,hf,af,hn='',an=''){
 if(!c||c.kind==='other')return[null,'',0];hf=hf||{};af=af||{};
 if(!Object.keys(hf).length&&!Object.keys(af).length)return[null,'',0];
 if(Math.max(hf.played||0,af.played||0)<4)return[null,'',0];
 const kind=c.kind,line=c.line,avg=k=>{const v=[];if(hf[k]!=null)v.push(hf[k]);if(af[k]!=null)v.push(af[k]);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0};
 if((kind==='over'||kind==='under')&&line!=null&&[null,'1h','2h'].includes(c.side)){
  const pk={1.5:'over15_pct',2.5:'over25_pct',3.5:'over35_pct'}[line];
  if(pk){const a=avg(pk),lb=`${kind==='over'?'Over':'Under'} ${line}`;
   if(kind==='over'){if(a>=58)return[true,`Form backs ${lb}: recent O${line} rate ~${a.toFixed(0)}%.`,.03];if(a<=35)return[false,`Form disagrees with ${lb}: recent O${line} rate only ~${a.toFixed(0)}%.`,-.04]}
   else{const u=100-a;if(u>=58)return[true,`Form backs ${lb}: recent U${line} rate ~${u.toFixed(0)}%.`,.03];if(u<=35)return[false,`Form disagrees with ${lb}: recent U${line} rate only ~${u.toFixed(0)}%.`,-.04]}}
  else{const t=avg('avg_total');if(t>0){
   if(kind==='under'&&line>=4.5&&t<=line-1.5)return[true,`Form backs Under ${line}: teams average only ${t.toFixed(1)} goals.`,.02];
   if(kind==='under'&&line>=4.5&&t>=line-.3)return[false,`Form questions Under ${line}: teams average ${t.toFixed(1)} goals.`,-.03];
   if(kind==='over'&&line<=1.5&&t>=2.4)return[true,`Form backs Over ${line}: teams average ${t.toFixed(1)} goals.`,.02]}}
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
 return[null,'',0]}
function legKind(l){for(const c of l._criteria||[]){if((c.kind==='over'||c.kind==='under')&&c.line!=null)return[c.kind,c.line];if(c.kind==='btts_yes'||c.kind==='btts_no')return[c.kind,null]}
 const sel=(l.sel||'').toLowerCase().trim(),m=sel.match(/\b(over|under)\s*(\d+(?:.\d+)?)/);if(m)return[m[1],parseFloat(m[2])];
 if(l.market==='BTTS'||sel.includes('both teams to score')){if(/\b(yes|gg)\b/.test(sel))return['btts_yes',null];if(/\b(no|ng)\b/.test(sel))return['btts_no',null]}return null}
function formCross(l){const S=l._form_support||[],F=l._form_flags||[];if(S.length||F.length)return F.length?[false,F[0]]:[true,S[0]];
 const hf=l.home_form,af=l.away_form;if(!hf||!af)return[null,''];if(Math.min(hf.played||0,af.played||0)<5)return[null,''];
 const k=legKind(l);if(!k)return[null,''];const[kind,line]=k,tag=`${l.sel||''} (${l.match||''})`;
 if(kind==='over'||kind==='under'){const pk={1.5:'over15_pct',2.5:'over25_pct',3.5:'over35_pct'}[line];if(!pk)return[null,''];const a=((hf[pk]||0)+(af[pk]||0))/2;
  if(kind==='over'){if(a>=58)return[true,`Recent form backs ${tag}: O${line} rate ~${a.toFixed(0)}%.`];if(a<=35)return[false,`Recent form disagrees with ${tag}: O${line} rate only ~${a.toFixed(0)}%.`]}
  else{const u=100-a;if(u>=58)return[true,`Recent form backs ${tag}: U${line} rate ~${u.toFixed(0)}%.`];if(u<=35)return[false,`Recent form disagrees with ${tag}: U${line} rate only ~${u.toFixed(0)}%.`]}return[null,'']}
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
const toHW=x=>{/* v5: same as Betway, no +1 */if(x==null)return null;const t=String(x).trim().replace(',','.').replace(/^[@xX×]\s*/,'').replace(/\s*[xX×]$/,'');const v=parseFloat(t);if(!/^\d+(\.\d+)?$/.test(t)||v<=0||v>500)return null;return v<=1?v+1:v};
const lines0=t=>t.replace(/\r\n?/g,'\n').split('\n').map(l=>l.replace(/[ \t]+/g,' ').trim()).filter(Boolean);
const mkLeg=(o,b)=>({sub_legs:[],is_bab:false,bookmaker:b,...o});
function parseHWB(text){
 const L=lines0(text).filter(l=>!['×','x','X','•'].includes(l)),legs=[];
 const lead=/^(full\s*time(?:\s*result)?|match\s*result|match\s*winner|1x2|double\s*chance|draw\s*no\s*bet|dnb|total(?:\s*goals|\s*corners)?|over|under|btts|both\s*teams(?:\s*to\s*score)?|handicap|asian\s*handicap|correct\s*score|half\s*time|1st\s*half|2nd\s*half|win\s*to\s*nil|clean\s*sheet|to\s*score|odd\/?even|exact\s*goals|which\s*team\s*to\s*score)\s*[-–—:]\s*(.+?)(?:\s+([0-9]+[.,][0-9]{2}))?$/i;
 const foot=/^(multiple|accumulator|odds|bonus|final\s*odds|total\s*odds|stake|potential|payout|ticket|single|simulate|real\b)/i,oo=/^[0-9]+[.,][0-9]{2}$/;
 const pull=c=>{const m=c.match(/(?<!\d)(\d{1,3}[.,]\d{2})\s*$/);if(!m)return[null,c];const v=toHW(m[1]);return v==null?[null,c]:[v,c.slice(0,m.index).trim().replace(/^[ \-–—|]+|[ \-–—|]+$/g,'')]};
 for(let i=0;i<L.length;){const m=L[i].match(lead);if(!m){i++;continue}
  let mk=m[1].trim(),pick=m[2].trim();if(isUp(pick)){i++;continue}
  let odds=m[3]?toHW(m[3]):null;if(odds==null){const[o2,p2]=pull(pick);if(o2!=null){odds=o2;pick=p2}}
  let match=null,j=i+1;
  while(j<L.length&&j<i+6){const c=L[j],lo=c.toLowerCase();if(foot.test(c)||lead.test(c))break;
   if(oo.test(c.replace(',','.'))){if(odds==null){const v=toHW(c);if(v!=null)odds=v}j++;continue}
   if(odds==null){const[o2,r]=pull(c);if(o2!=null&&(!r||r.length<=3)){odds=o2;j++;continue}}
   if((lo.includes(' vs ')||lo.includes(' v ')||/\s[-–—]\s/.test(c))&&!match){match=c.replace(/\s+vs\s+/i,' - ').replace(/\s+v\s+/i,' - ');const[o2,m2]=pull(match);if(o2!=null&&odds==null){odds=o2;match=m2}j++;continue}
   if(/\d{4}\s*\|/.test(c)||/\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(c)){j++;continue}
   break}
  if(pick)legs.push(mkLeg({sel:pick,odds:odds??0,market:classify(mk)||'1X2',match:match||'Unknown'},'Hollywoodbets'));
  i=Math.max(j,i+1)}
 return legs.length?legs:null}
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
 if((lo.includes('full time -')||lo.includes('fulltime -'))&&(lo.includes('multiple accumulator')||lo.includes('final odds')||t.includes('×')||/\n[x×]\n/.test(t))&&!lo.includes('build a bet')&&!lo.includes('betway'))return 'Hollywoodbets';
 if(lo.includes('full time -')&&/ vs | v /.test(lo)&&!lo.includes('betway')&&!lo.includes('build a bet'))return 'Hollywoodbets';
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
 if(SPEC[bk]){for(const t of [text,clean]){let g;try{g=SPEC[bk](t)}catch{}
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
const teamsOf=m=>{const p=String(m||'').split(/\s+(?:-|–|—|vs\.?|v\.?)\s+/i);return p.length>=2&&p[0].trim()&&p[1].trim()&&String(m).toLowerCase()!=='unknown'?[p[0].trim(),p.slice(1).join(' - ').trim()]:[null,null]};
const alias=n=>ALIASES[(n||'').toLowerCase().trim()]||n;
function dataConf(l){if(l.home_form&&l.away_form){const n=(l._criteria||[]).filter(c=>c.kind!=='other').length;return['Form available','--g',`Form loaded · ${(l._form_support||[]).length} backed · ${(l._form_flags||[]).length} disagreed`+(n?` · ${n} criteria classified`:'')]}
 if(l.home_form||l.away_form)return['Partial form','--y','Only one side matched in Football-Data'];
 if(l._form_lookup==='failed')return['Odds only','--y','Teams not on Football-Data free tier'];return['Odds only','--mu','No form key or no match data']}
const formLine=(n,f)=>`${esc(n)}: form <b>${esc(f.form)}</b> (${f.played} matches) • scored ${f.avg_scored.toFixed(1)} • conceded ${f.avg_conceded.toFixed(1)} • BTTS ${f.btts_pct.toFixed(0)}% • O2.5 ${f.over25_pct.toFixed(0)}%`;
function exHtml(l,i){if(l.is_bab&&!l.home_form)return '';const[h,a]=teamsOf(l.match);
 if(l._exStatus==='nokey')return i===lastLegs.findIndex(x=>x._exStatus==='nokey')?'<div class="ex muted">📊 Form, league position &amp; head-to-head: add your free Football-Data key in <b>About → Settings</b>.</div>':'';
 if(l._exStatus==='loading')return '<div class="ex muted">📊 Loading form &amp; head-to-head… <span>(the first lookup can take a minute on the free plan)</span></div>';
 if(l._exStatus==='auth')return '<div class="ex"><span class="flag">Football-Data rejected your key – check it in About → Settings.</span></div>';
 if(!l._exStatus||l._exStatus==='skip'||!h)return '';
 if(l._exStatus==='unavail')return '<div class="ex muted">📊 Form &amp; head-to-head unavailable right now.</div>';
 const[ct,cc,cd]=dataConf(l);let o=`<div class="ex"><span class="tag" style="background:var(${cc})">${ct}</span> <span class="muted">${esc(cd)}</span>`;
 if(l.home_form||l.away_form){o+='<div class="h">📊 Recent form</div>';if(l.home_form)o+=`<div class="muted">${formLine(h,l.home_form)}</div>`;if(l.away_form)o+=`<div class="muted">${formLine(a,l.away_form)}</div>`}
 else if(l._form_lookup==='failed')o+='<div class="flag">Form unavailable (team not covered by Football-Data – its free tier only covers major European leagues)</div>';
 const st=l.standings||{};if(st.home_pos!=null||st.away_pos!=null)o+=`<div class="h">📋 League position</div><div class="muted">${[st.home_pos!=null?esc(h)+' '+st.home_pos:'',st.away_pos!=null?esc(a)+' '+st.away_pos:''].filter(Boolean).join(' · ')}</div>`;
 const ms=(l.h2h||{}).matches||[];if(ms.length){const s=h2hSummary(ms,l.h2h.home_id);
  o+=`<div class="h">⚔️ Head-to-head (recent)</div><div class="muted">${esc(h)} vs ${esc(a)}: last ${ms.length} → <b>${s.w}W-${s.d}D-${s.l}L</b> (${esc(h)}'s view)</div>
  <details><summary class="muted">Show matches</summary>${ms.map(m=>`<div class="muted">${esc((m.utcDate||'').slice(0,10))} · ${esc(m.homeTeam?.shortName||m.homeTeam?.name||'')} ${m.score?.fullTime?.home??'?'}–${m.score?.fullTime?.away??'?'} ${esc(m.awayTeam?.shortName||m.awayTeam?.name||'')}</div>`).join('')}</details>`}
 const S=l._form_support||[],F=l._form_flags||[];if(S.length||F.length)o+='<div class="h">Does recent form back this pick?</div>'+S.map(x=>`<div class="ok">✔ ${esc(x)}</div>`).join('')+F.map(x=>`<div class="flag">⚠ ${esc(x)}</div>`).join('');
 return o+'</div>'}
function renderLegs(){
 const el=$('#legs');if(!lastLegs.length){el.innerHTML=lastText?'<p class="flag">No legs detected. Each leg needs a decimal price on its own line (e.g. 1.85).</p>':'';return}
 const tot=lastLegs.reduce((a,l)=>a*l.odds,1),tp=lastLegs.reduce((a,l)=>a*fair(l),1),w=weakest(lastLegs);
 el.innerHTML=`<h3>Detected ${lastLegs.length} leg(s)</h3><p class="muted">Reader: ${detectBookie(lastText)}</p>`+lastLegs.map((l,li)=>{
  if(!(l.odds>1))return `<div class="card"><b>${esc(l.match)}</b><br>${esc(l.sel)} <div class="flag">⚠ Price read as ${l.odds} – not valid decimal odds, so this leg is ignored. Check the slip.</div></div>`;
  const p=fair(l),[rt,rc]=legRisk(p),low=window._lowLines&&l.match.split(/\s-\s/).some(n=>window._lowLines.has(n.trim()));
  return `<div class="card"><input class="nm" value="${esc(l.match)}" onchange="renameLeg(${li},this.value)" title="Tap to edit the match name">${low?' <span class="flag">⚠ name may be misread – tap to fix</span>':''}<br>${esc(l.sel)} <span class="muted">(${esc(l.market)})</span> @ <b>${l.odds.toFixed(2)}</b>
  ${l.is_bab?`<div class="muted">${l.sub_legs.map(esc).join('<br>')}</div>`:''}
  <div class="bar"><i style="width:${p*100}%;background:var(${rc})"></i></div><span class="tag" style="background:var(${rc})">${rt}</span> <span class="muted">fair ≈ ${(p*100).toFixed(1)}% · margin ${marginPct(l).toFixed(0)}%${typeof l._form_adj==='number'&&l._form_adj?` · form ${l._form_adj>0?'+':''}${(l._form_adj*100).toFixed(1)}%`:''}</span>${exHtml(l,li)}</div>`}).join('')
  +totalCheck(tot,lastText)+`<div class="card">Whole slip: <b>${tot.toFixed(2)}</b> odds · fair ≈ ${(tp*100).toFixed(2)}%${w?`<div class="flag">Weakest: ${esc(w)}</div>`:''}</div>`
  +`<div class="card track-cta"><b>Next step</b><p class="muted" style="margin:6px 0">Track these teams for live scores and goal alerts.</p><div class="row"><button type="button" id="track-from-analysis">⚽ Track teams + alerts</button><button type="button" class="ghost" data-go="scores">Open Live Scores</button></div></div>`;

}
$('#analyze').onclick=()=>{
 lastTarget=parseFloat($('#target').value)||5;lastText=$('#slip').value;
 if(lastText.trim()&&!canAnalyze(lastText)){$('#rempty').hidden=true;$('#legs').innerHTML=`<div class="card limit-card"><b>Daily free limit reached</b><p class="muted">The Free plan includes <b>${FREE_ANALYSES_PER_DAY} analysis per day</b>. Re-running the same slip still works. Pro unlocks unlimited analyses, advanced stake tools and unlimited history.</p><div class="row"><button data-go="about" data-plans="1" id="golimit">See plans &amp; unlock Pro</button></div><p class="muted" style="margin-top:8px;font-size:12px">Tracked teams, live scores and your history stay available on Free.</p></div>`;$('#combos').innerHTML='';$('#ctl').hidden=true;try{drawPlanBar()}catch{}return}
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
async function aiComment(combo){
  const groq=store.get('groqkey',''), gem=store.get('gemkey','');
  if(!groq&&!gem)return {ok:false,text:'Add a free Groq or Gemini key in About → Settings for AI commentary.'};
  const legs=(combo.legs||[]).map(l=>`${l.match||''} – ${l.sel||''} @ ${Number(l.odds).toFixed(2)}`).join('; ');
  const prompt=`You are a sports-betting risk analyst. Give a short (3-5 sentences) neutral commentary on this multi-leg combination. Mention overall risk, any stand-out legs, and clearly state that this is an informational estimate only — not betting, financial or investment advice and that no outcome is guaranteed. Odds ${combo.odds?.toFixed?.(2)||combo.odds}, combined implied probability about ${((combo.prob||0)*100).toFixed(1)}%, margin ${Number(combo.margin||0).toFixed(1)}%. Legs: ${legs}`;
  if(groq){
    try{
      const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+groq},
        body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'user',content:prompt}],temperature:0.4,max_tokens:220})});
      if(r.ok){const j=await r.json();const t=j.choices?.[0]?.message?.content?.trim();if(t)return{ok:true,text:t,src:'Groq'}}
    }catch{}
  }
  if(gem){
    try{
      const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='+encodeURIComponent(gem),
        {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.4,maxOutputTokens:220}})});
      if(r.ok){const j=await r.json();const t=j.candidates?.[0]?.content?.parts?.[0]?.text?.trim();if(t)return{ok:true,text:t,src:'Gemini'}}
    }catch{}
  }
  return{ok:false,text:'Could not reach AI. Check your key and network, then try Refresh.'};
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
  if(/^[x×]2$/i.test(l))return '1X2';                                   // "1X2" loses its leading 1
  l=l.replace(/(?<![\w])x2([12x])(?=\s)/i,'1x2$1');                      // "x21 150" -> "1x21 150"
  l=l.replace(/(\d[.,]?\d{2})\s+[§®©xX×B]\s*$/,'$1');                    // stray chip symbols after the price
  if(/[A-Za-z]{3}/.test(l)&&!/\d{1,2}:\d{2}|\d{4}/.test(l))               // dropped decimal: "Al-Masry 141" -> 1.41
   l=l.replace(/(\s)([1-9])(\d{2})(?=\s*(?:[xX×]|$))/,(m,a,b,c)=>`${a}${b}.${c}`);
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
  await w.setParameters({tessedit_pageseg_mode:'6'});const r=await w.recognize(cv);await w.terminate();
  const text=ocrClean(r.data.text),cf=Math.round(r.data.confidence);window._lowLines=new Set((r.data.lines||[]).filter(l=>l.confidence<75).map(l=>ocrClean(l.text).trim()));$('#slip').value=text;
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
async function helperResolve(code,bookie,st){
 const f=await findBase();if(!f)return null;
 st.textContent='Loading the slip from the bookmaker… this can take up to a minute.';
 try{const c=new AbortController(),t=setTimeout(()=>c.abort(),120000);
  const r=await fetch(`${f[0]}/resolve?code=${encodeURIComponent(code)}&bookie=${encodeURIComponent(bookie)}`,{signal:c.signal});clearTimeout(t);return await r.json()}
 catch(e){return{ok:false,message:'The server did not answer ('+e.name+').'}}}
async function bookingOpen(){
 const raw=$('#bcode').value.trim(),st=$('#bst');if(!raw){st.textContent='Type or paste a booking code, Bet ID or share link first.';return}
 if(looksLikeSlip(raw)){$('#slip').value=raw;$('#bcode').value='';st.textContent='That looks like a full slip, so I analyzed it directly.';$('#analyze').click();return}
 const hr=await helperResolve(raw,$('#bsite').value,st);
 if(hr){if(hr.ok&&hr.text){$('#slip').value=hr.text;st.textContent=(hr.message||'Loaded.')+' Analyzed on the right.';$('#analyze').click();
  if(!lastLegs.length)st.innerHTML=`The slip loaded, but I could not read any legs from it. This is what came back:<pre class="raw">${esc(hr.text.slice(0,600))}</pre>Copy this text to me and I will fix the reader.`;return}
  st.innerHTML='The helper could not load it: '+esc(hr.message||'unknown reason')+'<br>I will open the page so you can copy the slip instead.'}
 const sel=$('#bsite').value;let[code,bk]=extractCode(raw,sel);if(sel!=='Auto')bk=sel;if(bk==='Auto'||!bk)bk=/^BW/i.test(code)?'Betway':'Auto';
 let urls=/^https?:\/\//i.test(raw)?[raw.match(/https?:\/\/\S+/)[0]]:(SITE[bk]?SITE[bk](code):[]);
 if(bk==='10Bet'){st.textContent='10Bet has no public booking-code page. Copy the slip text from the 10Bet site or app and press Paste & Analyze.';return}
 if(bk==='Sportingbet'&&!urls.length){st.textContent='Sportingbet uses a Share My Bet link, not a short code. Paste the full link here, or copy the slip text and press Paste & Analyze.';return}
 if(!urls.length){st.textContent='I could not tell which bookmaker that code is from. Pick one from the list.';return}
 window.open(urls[0],'_blank','noopener');
 st.innerHTML=(st.innerHTML.includes('helper could not')?st.innerHTML+'<br>':'')+`Code <b>${esc(code)}</b> (${esc(bk)}) opened in a new tab. There, select the slip (Ctrl+A), copy it (Ctrl+C), come back and press <b>Paste from Clipboard</b>.${urls[1]?` <a href="${esc(urls[1])}" target="_blank" rel="noopener">Alternative page</a>`:''}`}
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

// ---------- head-to-head (Football-Data.org), ported from the desktop app ----------
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
async function findTeam(name,prefer){const map=store.get('fdmap',{}),k=name.toLowerCase().trim();if(map[k])return map[k];
 let best={s:0};for(const c of [prefer,...FD_COMPS].filter((x,i,a)=>x&&a.indexOf(x)===i)){
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
 let w=0,d=0,l=0,gf=0,ga=0,btts=0,o15=0,o25=0,o35=0,cs=0,fts=0;const form=[];
 for(const m of ms){const sc=m.score?.fullTime||{},hg=sc.home,ag=sc.away;if(hg==null||ag==null)continue;
  const isHome=m.homeTeam?.id===tid,tg=isHome?hg:ag,og=isHome?ag:hg;gf+=tg;ga+=og;
  if(tg>og){w++;form.push('W')}else if(tg===og){d++;form.push('D')}else{l++;form.push('L')}
  if(hg>0&&ag>0)btts++;const t=hg+ag;if(t>1.5)o15++;if(t>2.5)o25++;if(t>3.5)o35++;if(og===0)cs++;if(tg===0)fts++}
 const p=w+d+l;if(!p)return null;
 const out={form:form.slice(-5).reverse().join(' '),played:p,wins:w,draws:d,losses:l,avg_scored:gf/p,avg_conceded:ga/p,avg_total:(gf+ga)/p,btts_pct:btts/p*100,over15_pct:o15/p*100,over25_pct:o25/p*100,over35_pct:o35/p*100,win_pct:w/p*100,draw_pct:d/p*100,loss_pct:l/p*100,clean_sheet_pct:cs/p*100,failed_to_score_pct:fts/p*100};
 cacheSet('form_'+tid,out);return out}
async function getTable(comp){const c=cacheGet('table_'+comp,24*36e5);if(c)return c;const r=await fd(`competitions/${comp}/standings`);if(!r||!r.ok)return null;
 const s=(await r.json()).standings||[],tot=s.filter(g=>(g.type||'TOTAL')==='TOTAL'),rows=(tot.length?tot:s).flatMap(g=>g.table||[]).map(x=>({id:x.team?.id,pos:x.position}));
 if(!rows.length)return null;cacheSet('table_'+comp,rows);return rows}
let enrichRun=0;
async function enrichLegs(legs){const run=++enrichRun,key=store.get('fdkey','');
 legs.forEach(l=>{l._exStatus=key?undefined:'nokey';l._criteria=l.is_bab?(l.sub_legs||[]).map(parseCrit):[parseCrit(`${l.market}: ${l.sel}`)];if(!key){delete l._form_support;delete l._form_flags;delete l._form_adj}});
 lastCombos=combos(lastLegs,lastTarget);drawCombos();renderLegs();if(!key)return;
 let prefer=null;
 for(const l of legs){if(run!==enrichRun)return;const[h,a]=teamsOf(l.match);if(!h||!a||l.is_bab&&!h){l._exStatus='skip';continue}
  l._exStatus='loading';renderLegs();
  try{
   const hm=await findTeam(alias(h),prefer)||await findTeam(h,prefer);if(run!==enrichRun)return;if(hm)prefer=hm.comp;
   const am=await findTeam(alias(a),prefer)||await findTeam(a,prefer);if(run!==enrichRun)return;
   l._form_lookup='none';const hf=hm?await getForm(hm.id):null,af=am?await getForm(am.id):null;if(run!==enrichRun)return;
   if(hm||am)l._form_lookup=(hf||af)?'ok':'failed';
   const comp=hm?.comp||am?.comp,tb=comp?await getTable(comp):null;if(run!==enrichRun)return;
   if(tb)l.standings={home_pos:hm?(tb.find(r=>r.id===hm.id)||{}).pos:null,away_pos:am?(tb.find(r=>r.id===am.id)||{}).pos:null};
   if(hm&&am&&hm.id!==am.id){const ms=await getH2H(hm.id,am.id);if(ms&&ms.length)l.h2h={matches:ms,home_id:hm.id}}
   l.home_form=hf||undefined;l.away_form=af||undefined;
   const S=[],F=[];let adj=0,n=0;for(const c of l._criteria){const[ok,note,ad]=evalCrit(c,hf,af,h,a);if(ok===true&&note){S.push(note);adj+=ad;n++}else if(ok===false&&note){F.push(note);adj+=ad;n++}}
   l._form_support=S;l._form_flags=F;l._form_adj=n?Math.max(-.1,Math.min(.1,adj/Math.max(1,n)*1.2)):0;l._exStatus='done'
  }catch(err){l._exStatus=err.message==='auth'?'auth':'unavail'}
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
async function drawPlans(){await loadRates();const F=fmtLocal,cc=deviceCountry(),[code]=CURRENCY_BY_COUNTRY[cc]||[null];
 let region='';try{region=cc?new Intl.DisplayNames(['en'],{type:'region'}).of(cc):''}catch{region=cc||''}
 const st=(()=>{try{return licStatus().state}catch{return 'free'}})();
 const openPay=k=>{const u=PAYPAL[k];if(u)window.open(u,'_blank','noopener');else alert('PayPal link not configured yet. Email '+SUPPORT)};
 const card=(key,name,price,period,tag,blurb,feats,cls)=>{
  const isCur=(key==='free'&&st==='free')||(key!=='free'&&st==='licensed');
  const paid=key==='monthly'||key==='annual';
  const cta=isCur?'● Your current plan':(paid?'Click / tap to continue to PayPal →':' ');
  return `<div class="plan-card ${cls||key}${isCur?' current':''}${paid?' paid':''}" ${paid?`data-plan="${key}" role="button" tabindex="0"`:''}>
   <span class="tag-line">${esc(tag)}</span>
   <h4>${esc(name)}</h4>
   <div class="price">${esc(price)}</div>
   <div class="period">${esc(period||'forever')}</div>
   <div class="muted" style="font-size:12px">${esc(blurb)}</div>
   <ul>${feats.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>
   ${paid?`<div class="muted" style="font-size:11px">PayPal price: $${PRICE_USD[key]} USD</div>`:''}
   <div class="cta">${cta}</div>
  </div>`};
 $('#plans').innerHTML=`<p class="muted">${region?`Prices shown for ${esc(region)}${code?' ('+code+')':''}. `:''}Estimates converted from USD; PayPal checkout is authoritative for the amount charged. After a successful payment the licence key is emailed to the PayPal account address.</p>
  <p class="muted" style="font-size:12px">By purchasing you agree to our <a href="#" id="plans-terms" style="color:var(--ac)">Terms of Service</a> and <a href="#" id="plans-privacy" style="color:var(--ac)">Privacy Policy</a>.</p>
 <div class="plans-grid">`
  +card('free','Free Forever','Free','','FREE FOREVER','For new users and casual bettors',['Basic live scores',`${FREE_ANALYSES_PER_DAY} bet-slip analysis per day`,'Basic odds & return calculations','Basic match information',`Save up to ${FREE_SAVED_SLIPS} slips`],'free')
  +card('monthly','PayPal 30 Day Access',F(PRICE_USD.monthly),'30 day access','RECOMMENDED','For regular bettors who want the full toolkit',['Everything in Free','Unlimited bet-slip analyses','Advanced stake tools (Kelly sizing)','Unlimited saved slips & results history','No auto-renewal'],'monthly')
  +card('annual','MatchDesk 1 Year Access',F(PRICE_USD.annual),'1 year access','SAVE '+F(SAVING_USD),'Same Pro features, one upfront payment',['All Pro features','One upfront annual payment',`About ${F(PRICE_USD.annual/12)}/month`,'Best value for committed users'],'annual')
  +`</div>
  <p class="muted" style="font-size:12px">Keys do not renew automatically. Without one, MatchDesk keeps working on the Free plan. New installs may include a ${TRIAL_DAYS||7}-day Pro trial. Support: ${SUPPORT}</p>`;
 document.querySelectorAll('.plan-card.paid').forEach(el=>{
  const go=()=>openPay(el.dataset.plan);
  el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}};
 });
 const pt=document.getElementById('plans-terms'), pp=document.getElementById('plans-privacy');
 if(pt)pt.onclick=e=>{e.preventDefault();openLegal('Terms of Service', TERMS_HTML)};
 if(pp)pp.onclick=e=>{e.preventDefault();openLegal('Privacy Policy', PRIVACY_HTML)};
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
  note=info}
 let first=store.get('trial_first',null);if(!first){first=Date.now();store.set('trial_first',first)}
 const left=TRIAL_DAYS*864e5-(Date.now()-first);
 if(left>0){const d=Math.ceil(left/864e5);return{state:'trial',days_left:d,headline:`Pro free trial: ${d} day(s) left`,detail:'All Pro features are unlocked during the trial. Afterwards MatchDesk continues on the Free plan.'}}
 return{state:'free',headline:'Free plan',detail:note||`${FREE_ANALYSES_PER_DAY} analysis per day and ${FREE_SAVED_SLIPS} saved slips. Enter a license key to unlock Pro.`}}
const isPro=()=>{try{const t=licStatus().state;return t==='licensed'||t==='trial'}catch{return true}};
function drawLicense(){const st=licStatus();$('#lichead').textContent=({licensed:'✅ ',trial:'🎁 ',free:'🆓 '})[st.state]+st.headline;$('#licdetail').textContent=st.detail;$('#licremove').hidden=st.state!=='licensed';$('#lickey').closest('.row').hidden=st.state==='licensed'}
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


// ---------- Terms of Service & Privacy Policy ----------
const TERMS_HTML = `
<h4>1. Who we are</h4>
<p>MatchDesk is operated by <b>Tri-Star (Pty) Ltd</b> ("we", "us"). Contact: Matchdesksupport@gmail.com.</p>
<h4>2. What MatchDesk is</h4>
<p>MatchDesk is an <b>informational tool</b>. It provides live scores, bet-slip analysis, estimated fair probabilities, risk ratings, optional form notes and optional AI commentary. It does <b>not</b> accept bets, hold funds, pay winnings, or provide betting, financial or investment advice.</p>
<h4>3. Eligibility</h4>
<p>You must be <b>18 years or older</b> and legally allowed to use gambling-related information services in your jurisdiction. By using the app you confirm you meet this requirement.</p>
<h4>4. Accounts, keys and subscriptions</h4>
<ul>
<li>Free features are available without payment, subject to fair-use limits that may change.</li>
<li>Paid access (e.g. 30-day or 1-year) is purchased via PayPal. After successful payment a licence key is emailed to the PayPal account address.</li>
<li>Keys do not auto-renew. When a key expires the app continues on the Free plan.</li>
<li>We may refuse, suspend or revoke a key in cases of abuse, chargebacks, or material breach of these Terms.</li>
</ul>
<h4>5. Acceptable use</h4>
<p>You may use MatchDesk for personal, lawful purposes. You must not: reverse-engineer or attack the service; use it to break any bookmaker’s terms in a way that creates liability for us; scrape or overload our servers; or misrepresent MatchDesk outputs as guaranteed predictions or professional advice.</p>
<h4>6. Estimates only — no advice, no guarantees</h4>
<p>All analysis, probabilities, risk ratings, form notes and AI text are <b>estimates only</b>. They are not predictions, tips, or advice. No outcome is guaranteed. Past results and historical data do not predict future performance. You alone decide whether and how to wager and you do so entirely at your own risk.</p>
<h4>7. Limitation of liability</h4>
<p>To the fullest extent permitted by South African law, Tri-Star (Pty) Ltd, its directors and contributors are not liable for any loss, damage, or consequence arising from your use of MatchDesk or reliance on any output. Nothing in these Terms limits liability that cannot legally be limited (including for gross negligence or under the Consumer Protection Act where it applies).</p>
<h4>8. Third-party services</h4>
<p>Live scores use public ESPN endpoints. Optional form data and AI commentary use third-party APIs you configure. Booking-code loading reads public share pages. PayPal processes payments. Those services have their own terms; we are not responsible for their availability or content.</p>
<h4>9. Changes</h4>
<p>We may update these Terms. Continued use after changes constitutes acceptance of the updated Terms. Material changes to paid plans will be communicated reasonably in advance where practical.</p>
<h4>10. Governing law</h4>
<p>These Terms are governed by the laws of the Republic of South Africa. Courts of South Africa have jurisdiction, subject to any non-excludable consumer rights.</p>
<p class="muted">Last updated: October 2026</p>
`;

const PRIVACY_HTML = `
<h4>1. Introduction</h4>
<p>Tri-Star (Pty) Ltd ("we") respects your privacy. This Policy explains what information MatchDesk processes and why, in line with the Protection of Personal Information Act 4 of 2013 (POPIA).</p>
<h4>2. What we process</h4>
<ul>
<li><b>On your device only:</b> tracked teams, saved slips/history, alert preferences, optional API keys (Football-Data, Groq, Gemini), and licence key status. This data stays in your browser storage unless you clear it.</li>
<li><b>When you buy access:</b> PayPal processes your payment. We receive confirmation and the email address needed to send your licence key. We do not store full card details.</li>
<li><b>If you enable push notifications:</b> a push subscription endpoint is stored on our server so we can send goal/kick-off/full-time alerts for teams you track.</li>
<li><b>Technical logs:</b> standard server logs (IP, time, request path) for security, rate-limiting and diagnostics, retained for a limited period.</li>
</ul>
<h4>3. Why we process it</h4>
<p>To provide the service you request (analysis, scores, alerts, licence activation), to secure the service, to communicate about your purchase, and to meet legal obligations.</p>
<h4>4. Sharing</h4>
<p>We do not sell your personal information. We share data only with: payment processors (PayPal), infrastructure providers necessary to run the service, and authorities if legally required. Optional third-party AI/form APIs are called only when you supply a key and request those features; those requests go from your device or our server under your control.</p>
<h4>5. Cross-border transfers</h4>
<p>Payment and some infrastructure providers may process data outside South Africa. Where POPIA requires, we take reasonable steps to ensure appropriate protection.</p>
<h4>6. Security and retention</h4>
<p>We apply reasonable technical and organisational measures. Licence and push data are kept only as long as needed for the service or legal requirements. You can clear local app data in your browser at any time.</p>
<h4>7. Your rights (POPIA)</h4>
<p>You may request access to, correction of, or deletion of personal information we hold about you, or object to certain processing. Contact Matchdesksupport@gmail.com. You may also lodge a complaint with the Information Regulator (inforegulator.org.za).</p>
<h4>8. Children</h4>
<p>MatchDesk is for users 18+. We do not knowingly collect personal information from children.</p>
<h4>9. Contact / Information Officer</h4>
<p>For privacy requests: Matchdesksupport@gmail.com (Tri-Star (Pty) Ltd).</p>
<p class="muted">Last updated: October 2026</p>
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
document.getElementById('legal-close')?.addEventListener('click', closeLegal);
document.getElementById('legal-backdrop')?.addEventListener('click', closeLegal);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLegal(); });


// ---------- Guided Tour ----------
const TOUR_STEPS=[
 {tab:'dash',sel:'header',title:'Welcome to MatchDesk',body:'This short tour shows you the main tools. You can restart it any time with the 🧭 Tour button.'},
 {tab:'dash',sel:'.tiles',title:'Quick Launch',body:'Jump straight to the Bet Analyzer, Live Scores, Plans, or Video Guide from these tiles.'},
 {tab:'dash',sel:'#glance',title:'At a glance',body:'See how many teams you track, live matches, saved slips, your plan status, and whether form data or code loading is ready.'},
 {tab:'analyzer',sel:'#analyzer .left',title:'Bet Analyzer – input',body:'Paste a booking code / Bet ID, load a share link, paste slip text, or import a screenshot. Set a target odds and tap Analyze.'},
 {tab:'analyzer',sel:'#analyzer .right',title:'Risk ratings & recommendations',body:'After analysis you get per-leg risk, fair probability estimates, form notes (with a Football-Data key), and recommended combinations near your target odds.'},
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
