(() => {
'use strict';
const $ = id => document.getElementById(id);
const LIBRARY_KEY='hs_v5_personal_collection';
const label={ballad:'Ballad',rap:'Rap-Hip Hop',rock:'Rock Alternative',electronic:'Electronic EDM',instrumental:'Instrumental Classical',nature:'Natural Sounds ASMR',other:'Other'};
let currentUser={stress:5,energy:3,mood:'neutral',goal:'calm',genre:'any'};
let recommendationPool=[], selectedSound=null, lastTop=[];
let researchPre=null, researchSubmitted=false, activeParticipantCode=null, activeCondition=null, restInterval=null, restRemaining=180, restCompleted=false;

const safeRead=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v??fallback}catch{return fallback}};
const safeWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{toast('Không thể lưu dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.');return false}};
const getCollection=()=>safeRead(LIBRARY_KEY,[]);
const toast=message=>{const el=$('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600)};
const normalize=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLocaleLowerCase('vi').replace(/[^a-z0-9]+/g,' ').trim();
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A small physical spring engine: integrates position + velocity, keeps velocity
// when the target changes, and runs only while something is moving.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function createSpring(initial, onUpdate, options={}) {
  const stiffness=options.stiffness??190, damping=options.damping??27, mass=options.mass??1;
  const value={...initial}, velocity={}, target={...initial};
  Object.keys(initial).forEach(k=>velocity[k]=0);
  let raf=0, last=0;
  const keys=Object.keys(initial);
  function frame(now){
    if(!last) last=now;
    let remaining=Math.min((now-last)/1000,.032); last=now;
    // Small fixed substeps keep the integration stable across refresh rates.
    while(remaining>0){
      const dt=Math.min(remaining,1/120); remaining-=dt;
      for(const k of keys){
        const acceleration=(-stiffness*(value[k]-target[k])-damping*velocity[k])/mass;
        velocity[k]+=acceleration*dt;
        value[k]+=velocity[k]*dt;
      }
    }
    let moving=false;
    for(const k of keys){
      if(Math.abs(value[k]-target[k])<.012 && Math.abs(velocity[k])<.025){value[k]=target[k];velocity[k]=0;}
      else moving=true;
    }
    onUpdate({...value});
    if(moving) raf=requestAnimationFrame(frame); else {raf=0;last=0;}
  }
  return {
    set(next){Object.keys(next).forEach(k=>{if(k in target)target[k]=next[k]});if(!raf){last=0;raf=requestAnimationFrame(frame)}},
    snap(next){Object.keys(next).forEach(k=>{if(k in target){target[k]=value[k]=next[k];velocity[k]=0}});onUpdate({...value});}
  };
}
function springReveal(el){
  if(!el || reduceMotion) return;
  el.style.translate='0 13px'; el.style.opacity='.82';
  const spring=createSpring({y:13,opacity:.82},v=>{el.style.translate=`0 ${v.y.toFixed(2)}px`;el.style.opacity=v.opacity.toFixed(3)},{stiffness:210,damping:29});
  spring.set({y:0,opacity:1});
}
function showMain(name){
 if(name!=='discover')stopRestTimer();
  document.querySelectorAll('.main-view').forEach(v=>{const active=v.dataset.view===name;v.classList.toggle('active',active);if(active)springReveal(v)});
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  if(name==='discover'){$('d-checkin').classList.add('active');$('d-top5').classList.remove('active');$('d-rest').classList.remove('active');$('d-research').classList.remove('active');$('d-feedback').classList.remove('active')}
  if(name==='mymusic')renderLibrary();
  window.scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});
}
function showSub(id){const target=$(id);if(!target)return;const parent=target.closest('.main-view');parent.querySelectorAll('.subview').forEach(v=>{const active=v.id===id;v.classList.toggle('active',active);if(active)springReveal(v)});parent.querySelectorAll('.subtab').forEach(b=>b.classList.toggle('active',b.dataset.sub===id));window.scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});}
document.querySelectorAll('.nav-tab').forEach(b=>b.addEventListener('click',()=>showMain(b.dataset.tab)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{showMain(b.dataset.go);if(b.dataset.go==='discover'){$('d-checkin').classList.add('active');$('d-top5').classList.remove('active');$('d-feedback').classList.remove('active')}}));
document.querySelectorAll('.subtab').forEach(b=>b.addEventListener('click',()=>showSub(b.dataset.sub)));
document.querySelectorAll('[data-subgo]').forEach(b=>b.addEventListener('click',()=>showSub(b.dataset.subgo)));
function getUser(){return {stress:+$('stress').value,energy:+$('energy').value,mood:$('mood').value,goal:$('goal').value,genre:$('genre').value}}
$('stress').addEventListener('input',e=>$('stressOut').textContent=e.target.value+'/10');$('energy').addEventListener('input',e=>$('energyOut').textContent=e.target.value+'/5');
function coverPath(s){const g=s.genre||'nature';const file=({ballad:'cover-ballad.svg',rap:'cover-rap.svg',rock:'cover-rock.svg',electronic:'cover-electronic.svg',instrumental:'cover-instrumental.svg',nature:'cover-nature.svg'})[g]||'cover-nature.svg';return 'assets/'+file;}
function metadata(s){const bpm=s.bpm?`${s.bpm} BPM`:'BPM chưa xác minh';const energy=s.energy!=null?`Energy ${s.energy}/5${String(s.note||'').toLowerCase().includes('tạm thời')?' · tạm':''}`:'Energy chưa xác minh';const vocal=s.vocal===true?'Có lời':s.vocal===false?'Không lời':'Vocal chưa xác minh';const mood=Array.isArray(s.mood)&&s.mood.length&&!s.mood.includes('neutral')?s.mood.join(', '):'Mood chưa xác minh';return `<div class="track-meta-grid"><span>${escapeHTML(label[s.genre]||s.category||'Chưa phân loại')}</span><span>${bpm}</span><span>${energy}</span><span>${vocal}</span><span>${escapeHTML(mood)}</span></div>`}
function allCandidates(){return [...(window.SOUNDS||[])];}
async function createPlaylist(){
 currentUser=getUser();
 const condition=$('researchCondition').value;
 if(!['A','B','C','D'].includes(condition)){toast('Nhóm nghiên cứu cần phân công điều kiện A/B/C/D trước.');return;}
 activeCondition=condition;
 const isNewParticipant=!activeParticipantCode||researchSubmitted;
 if(isNewParticipant){
  $('researchConsent').checked=false;$('postStress').value=5;$('postStressOut').textContent='5/10';$('postEnergy').value=3;$('postEnergyOut').textContent='3/5';$('goalAchievement').value='3';$('researchSatisfaction').value='3';
  const cfg=window.HS_SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||cfg.url.includes('YOUR_PROJECT')||cfg.anonKey.includes('YOUR_PUBLISHABLE')){ $('researchStatus').textContent='Chưa cấu hình Supabase nên chưa thể cấp mã tham gia tự động.'; return; }
  $('participantCode').value='Đang cấp mã…';
  try{const base=cfg.url.replace(/\/$/,'');const response=await fetch(base+'/rest/v1/rpc/next_hs_participant_code',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.anonKey,'Authorization':'Bearer '+cfg.anonKey},body:'{}'});if(!response.ok)throw new Error('HTTP '+response.status+' — '+await response.text());activeParticipantCode=await response.json();if(typeof activeParticipantCode!=='string')activeParticipantCode=String(activeParticipantCode);$('participantCode').value=activeParticipantCode;}catch(err){activeParticipantCode=null;$('participantCode').value='Chưa cấp được mã';$('researchStatus').textContent='Không tạo được mã tự động: '+err.message+'. Kiểm tra SQL function trong hướng dẫn rồi thử lại.';return;}
 }
 $('researchConditionLabel').value=condition+' — '+({A:'Âm thanh tiêu chuẩn',B:'Theo sở thích',C:'Theo trạng thái + mục tiêu + sở thích',D:'Nghỉ yên tĩnh'}[condition]);
 researchPre={...currentUser,capturedAt:new Date().toISOString(),condition};researchSubmitted=false;restCompleted=false;
 recommendationPool=allCandidates();
 if(condition==='D'){
  lastTop=[];$('refreshPlaylist').disabled=true;$('d-checkin').classList.remove('active');$('d-top5').classList.remove('active');$('d-feedback').classList.remove('active');$('d-research').classList.remove('active');$('d-rest').classList.add('active');
  $('restTimer').textContent='03:00';$('restStatus').textContent='Sẵn sàng bắt đầu khoảng nghỉ 3 phút.';$('startRest').disabled=false;$('startRest').textContent='Bắt đầu 3 phút nghỉ yên tĩnh';restRemaining=180;
  $('researchStatus').textContent='Đã ghi nhận đánh giá trước Discover. Mã tham gia: '+activeParticipantCode+'. Hoàn thành 3 phút nghỉ yên tĩnh rồi đánh giá sau.';
  $('d-rest').scrollIntoView({behavior:'smooth',block:'start'});
 } else {
  lastTop=window.HSRecommender.recommendByCondition(recommendationPool,currentUser,condition).slice(0,5);
  renderTop(lastTop);$('resultHint').textContent=`Điều kiện ${condition} · ${lastTop.length} gợi ý`;
  $('d-checkin').classList.remove('active');$('d-rest').classList.remove('active');$('d-top5').classList.add('active');$('d-feedback').classList.remove('active');$('d-research').classList.add('active');
  $('refreshPlaylist').disabled=condition!=='C';$('learnStatus').textContent=window.HSRecommender.load().feedbackCount?`Hồ sơ đã có ${window.HSRecommender.load().feedbackCount} phản hồi được lưu trên thiết bị này.`:'Chưa có phản hồi cá nhân.';
  $('researchStatus').textContent='Đã ghi nhận đánh giá trước Discover. Mã tham gia: '+activeParticipantCode+'. Lưu ý: website hiện chưa có trình phát nhạc; đây là bản kiểm tra logic phân nhóm, không phải phiên nghe nhạc thực tế.';
  $('d-top5').scrollIntoView({behavior:'smooth',block:'start'});
 }
}
function stopRestTimer(){if(restInterval){clearInterval(restInterval);restInterval=null;}}
$('startRest').addEventListener('click',()=>{
 if(restInterval||restCompleted)return;
 restRemaining=180;$('startRest').disabled=true;$('restStatus').textContent='Đang nghỉ yên tĩnh. Không mở nhạc trong khoảng thời gian này.';
 const tick=()=>{restRemaining--;const m=String(Math.floor(restRemaining/60)).padStart(2,'0'),sec=String(restRemaining%60).padStart(2,'0');$('restTimer').textContent=m+':'+sec;if(restRemaining<=0){stopRestTimer();restCompleted=true;$('restStatus').textContent='Đã hoàn thành khoảng nghỉ yên tĩnh. Bạn có thể chuyển sang đánh giá sau trải nghiệm.';$('d-rest').classList.remove('active');$('d-research').classList.add('active');$('d-research').scrollIntoView({behavior:'smooth',block:'start'});}};
 restInterval=setInterval(tick,1000);
});

function attachCardSpring(card){
  if(reduceMotion || !window.matchMedia('(pointer:fine)').matches || card.dataset.springReady) return;
  card.dataset.springReady='1';
  const spring=createSpring({x:0,y:0,rx:0,ry:0},v=>{
    card.style.setProperty('--spring-card-x',v.x.toFixed(2)+'px');
    card.style.setProperty('--spring-card-y',v.y.toFixed(2)+'px');
    card.style.setProperty('--spring-card-rx',v.rx.toFixed(2)+'deg');
    card.style.setProperty('--spring-card-ry',v.ry.toFixed(2)+'deg');
  },{stiffness:230,damping:30});
  card.addEventListener('pointermove',e=>{
    const r=card.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
    spring.set({x:px*1.5,y:py*1.5,rx:-py*2.2,ry:px*2.8});
  });
  card.addEventListener('pointerleave',()=>spring.set({x:0,y:0,rx:0,ry:0}));
}

function renderTop(items){const host=$('playlist');host.replaceChildren();if(!items.length){host.textContent='Chưa có dữ liệu phù hợp để gợi ý.';return}items.forEach((item,index)=>{const s=item.sound||item;const card=document.createElement('article');card.className='catalog-track recommendation-card';const cover=document.createElement('img');cover.className='track-cover';cover.src=coverPath(s);cover.alt='Minh họa thể loại '+(label[s.genre]||'âm nhạc');cover.loading='lazy';const rank=document.createElement('div');rank.className='track-no';rank.textContent=String(index+1).padStart(2,'0');const info=document.createElement('div');const title=document.createElement('strong');title.textContent=s.title;const artist=document.createElement('small');artist.textContent=s.artist||'Nghệ sĩ chưa cập nhật';const meta=document.createElement('div');meta.innerHTML=metadata(s);const reason=document.createElement('p');reason.className='track-reason';reason.textContent=reasonFor(s,currentUser);info.append(title,artist,meta,reason);const actions=document.createElement('div');actions.className='track-actions';const save=document.createElement('button');save.className='track-save';save.type='button';save.textContent='♡ Yêu thích';save.addEventListener('click',()=>saveSong(s));const rate=document.createElement('button');rate.type='button';rate.textContent='Đánh giá';rate.addEventListener('click',()=>selectForFeedback(s));actions.append(save,rate);card.append(cover,rank,info,actions);host.append(card);attachCardSpring(card)})}
function reasonFor(s,u){const reasons=[];if(activeCondition==='A')return 'Bộ âm thanh tiêu chuẩn được cố định giống nhau cho các người tham gia thuộc điều kiện A.';if(activeCondition==='B')return 'Được xếp hạng theo thể loại bạn yêu thích; không dùng trạng thái hoặc mục tiêu cảm xúc.';if(u.genre!=='any')reasons.push(s.genre===u.genre?'đúng thể loại bạn chọn':'được cân nhắc cùng sở thích thể loại');if(u.goal==='calm')reasons.push('ưu tiên năng lượng thấp hơn');if(u.goal==='focus')reasons.push('ưu tiên mức năng lượng trung bình');if(u.goal==='energize')reasons.push('ưu tiên năng lượng cao hơn');if(u.goal==='maintain')reasons.push('cân nhắc mức năng lượng hiện tại của bạn');return 'Lý do xếp hạng: '+(reasons.join('; ')||'phù hợp theo điểm tổng hợp của hồ sơ hiện tại')+'. Đây là gợi ý theo quy tắc thử nghiệm, không phải kết luận khoa học.'}
$('makePlaylist').addEventListener('click',createPlaylist);$('refreshPlaylist').addEventListener('click',createPlaylist);
function selectForFeedback(s){selectedSound=s;$('feedbackTarget').textContent=`Đang đánh giá: ${s.title} — ${s.artist||'Nghệ sĩ chưa cập nhật'}`;$('saveFeedback').disabled=false;$('d-feedback').classList.add('active');springReveal($('d-feedback'));$('d-feedback').scrollIntoView({behavior:'smooth',block:'start'});}
$('saveFeedback').addEventListener('click',()=>{if(!selectedSound)return;const profile=window.HSRecommender.learn(selectedSound,currentUser,+$('fit').value,+$('comfort').value);$('learnStatus').textContent=`Đã lưu phản hồi thứ ${profile.feedbackCount}. Hồ sơ gợi ý sẽ được điều chỉnh ở lần tiếp theo.`;$('saveFeedback').disabled=true;selectedSound=null;toast('Đã lưu phản hồi của bạn.');});
function saveSong(s){const list=getCollection();if(list.some(x=>normalize(x.title)===normalize(s.title)&&normalize(x.artist)===normalize(s.artist)))return toast('Bài hát đã có trong bộ sưu tập.');const copy={id:'USER_'+(s.id||Date.now()),title:s.title,artist:s.artist||'',genre:s.genre||'other',category:s.category||label[s.genre]||'Other',bpm:s.bpm??null,energy:s.energy??null,vocal:s.vocal??null,mood:s.mood||[],origin:'user',sourceUrl:s.sourceUrl||'',provider:s.provider||'HILL AND STILL Library',addedAt:new Date().toISOString()};list.unshift(copy);if(safeWrite(LIBRARY_KEY,list)){window.HSRecommender.favorite(s);renderLibrary();toast('Đã thêm vào My Music. Sở thích này sẽ được dùng cho gợi ý sau.')}}
function renderLibrary(){const host=$('myLibrary'),q=normalize($('myLibrarySearch')?.value||''),items=getCollection().filter(s=>!q||normalize(s.title+' '+s.artist).includes(q));host.replaceChildren();$('libraryCount').textContent=`${getCollection().length} bài đã lưu`;if(!items.length){host.className='library-empty';host.textContent=getCollection().length?'Không tìm thấy bài phù hợp.':'Bộ sưu tập của bạn đang chờ những bài hát đầu tiên.';return}host.className='catalog-list';items.forEach(s=>{const row=document.createElement('article');row.className='catalog-track library-track';const cover=document.createElement('img');cover.className='track-cover';cover.src=coverPath(s);cover.alt='Minh họa thể loại '+(label[s.genre]||'âm nhạc');cover.loading='lazy';const no=document.createElement('div');no.className='track-no';no.textContent='♪';const info=document.createElement('div');const title=document.createElement('strong');title.textContent=s.title;const artist=document.createElement('small');artist.textContent=s.artist||'Nghệ sĩ chưa cập nhật';const meta=document.createElement('div');meta.innerHTML=metadata(s);info.append(title,artist,meta);const actions=document.createElement('div');actions.className='track-actions';if(s.sourceUrl){const link=document.createElement('a');link.href=s.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Mở nguồn ↗';actions.append(link)}const remove=document.createElement('button');remove.type='button';remove.textContent='♥ Bỏ yêu thích';remove.setAttribute('aria-label','Bỏ yêu thích '+s.title);remove.addEventListener('click',()=>{if(!confirm(`Bỏ yêu thích “${s.title}” và xóa khỏi My Music?`))return;safeWrite(LIBRARY_KEY,getCollection().filter(x=>x.id!==s.id));renderLibrary();toast('Đã bỏ yêu thích bài hát.')});actions.append(remove);row.append(cover,no,info,actions);host.append(row);attachCardSpring(row)})}
$('myLibrarySearch').addEventListener('input',renderLibrary);

function mapGenre(name){const n=normalize(name);if(/rock/.test(n))return'rock';if(/hip hop|rap/.test(n))return'rap';if(/electronic|dance/.test(n))return'electronic';if(/classical|instrumental/.test(n))return'instrumental';if(/ambient|nature/.test(n))return'nature';if(/pop|ballad|singer songwriter/.test(n))return'ballad';return'other'}
$('resetProfile').addEventListener('click',()=>{if(!confirm('Đặt lại toàn bộ hồ sơ gợi ý và phản hồi đã lưu trên thiết bị này?'))return;localStorage.removeItem('hs_mvp01_profile');$('learnStatus').textContent='Hồ sơ đã được đặt lại.';toast('Đã đặt lại hồ sơ gợi ý.')});
const progress=$('scrollProgress');window.addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-window.innerHeight;progress.style.width=(max>0?window.scrollY/max*100:0)+'%'},{passive:true});

// Motion system V5.4 — velocity-aware springs, interruptible pointer response.
if(!reduceMotion){
 document.documentElement.classList.add('motion-ready');
 const revealTargets=document.querySelectorAll('.panel,.feature-card,.hero-copy,.hero-art,.hero-foot');
 if('IntersectionObserver' in window){
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target)}}),{threshold:.1,rootMargin:'0px 0px -28px 0px'});
  revealTargets.forEach(el=>{el.classList.add('motion-reveal');revealObserver.observe(el)});
 } else revealTargets.forEach(el=>el.classList.add('is-visible'));
 const art=document.querySelector('.shelf-scene');
 if(art && window.matchMedia('(pointer:fine)').matches){
  const heroSpring=createSpring({rx:0,ry:0,x:0,y:0},v=>{
   art.style.setProperty('--spring-hero-rx',v.rx.toFixed(2)+'deg');
   art.style.setProperty('--spring-hero-ry',v.ry.toFixed(2)+'deg');
   art.style.setProperty('--spring-hero-x',v.x.toFixed(2)+'px');
   art.style.setProperty('--spring-hero-y',v.y.toFixed(2)+'px');
  },{stiffness:155,damping:24});
  art.addEventListener('pointermove',e=>{const r=art.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;heroSpring.set({rx:-y*3.2,ry:x*4.2,x:x*2.5,y:y*2.5})});
  art.addEventListener('pointerleave',()=>heroSpring.set({rx:0,ry:0,x:0,y:0}));
 }
 // Press feedback starts on pointer-down, then springs home on release.
 const pressControllers=new WeakMap();
 function pressTarget(el){
  let spring=pressControllers.get(el);if(!spring){spring=createSpring({scale:1},v=>el.style.setProperty('--press-scale',v.scale.toFixed(3)),{stiffness:430,damping:42});pressControllers.set(el,spring)}
  return spring;
 }
 document.addEventListener('pointerdown',e=>{const el=e.target.closest('button,a[role="button"]');if(el&&!el.matches(':disabled'))pressTarget(el).set({scale:.965})},{capture:true});
 const releasePress=e=>{const el=e.target.closest?.('button,a[role="button"]');if(el&&pressControllers.has(el))pressControllers.get(el).set({scale:1})};
 document.addEventListener('pointerup',releasePress,{capture:true});
 document.addEventListener('pointercancel',releasePress,{capture:true});
 document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const el=e.target.closest?.('button,a[role="button"]');if(el&&!el.matches(':disabled'))pressTarget(el).set({scale:.965})},{capture:true});
 document.addEventListener('keyup',releasePress,{capture:true});
}
// Research submission: participant code prefix assigns the pre-defined A/B/C/D condition.
$('postStress').addEventListener('input',e=>$('postStressOut').textContent=e.target.value+'/10');
$('postEnergy').addEventListener('input',e=>$('postEnergyOut').textContent=e.target.value+'/5');
$('submitResearch').addEventListener('click',async()=>{
 const status=$('researchStatus');
 if(!researchPre){status.textContent='Bạn cần hoàn thành phần đánh giá trước và tạo Top 5 trước.';return;}
 if(researchSubmitted){status.textContent='Bản ghi này đã được gửi trên thiết bị hiện tại.';return;}
 const code=activeParticipantCode;
 if(activeCondition==='D'&&!restCompleted){status.textContent='Bạn cần hoàn thành 3 phút nghỉ yên tĩnh trước khi gửi đánh giá.';return;}
 if(!code){status.textContent='Chưa có mã tham gia tự động. Hãy tạo Top 5 lại.';return;}
 if(!$('researchConsent').checked){status.textContent='Bạn cần xác nhận đồng ý trước khi gửi.';return;}
 const cfg=window.HS_SUPABASE_CONFIG||{};
 if(!cfg.url||!cfg.anonKey||cfg.url.includes('YOUR_PROJECT')||cfg.anonKey.includes('YOUR_PUBLISHABLE')){status.textContent='Chưa cấu hình Supabase. Nhóm nghiên cứu cần điền Project URL và Publishable Key trong supabase-config.js.';return;}
 const condition=$('researchCondition').value;
 if(!['A','B','C','D'].includes(condition)){status.textContent='Nhóm nghiên cứu cần chọn điều kiện A/B/C/D đã phân công trước khi gửi.';return;}
 const payload={participant_code:code,condition,pre_discover:researchPre,discover_data:{assigned_condition:condition,recommendation_method:condition==='A'?'fixed_standard_set':condition==='B'?'genre_preference_only':condition==='C'?'preference_state_goal':'quiet_rest',recommendations:lastTop.map((x,i)=>{const t=x.sound||x;return {rank:i+1,id:t.id||null,title:t.title||'',genre:t.genre||null,bpm:t.bpm??null,energy:t.energy??null,mood:t.mood||[]}}),rest_completed:condition==='D'?restCompleted:null,audio_played:false,interaction_note:condition==='D'?'Điều kiện D: nghỉ yên tĩnh 3 phút; website không phát âm thanh.': 'Website chỉ hiển thị danh sách gợi ý; chưa có trình phát âm thanh tích hợp nên không xác nhận người tham gia đã nghe nhạc.'},post_discover:{stress:Number($('postStress').value),energy:Number($('postEnergy').value),goal_achievement:Number($('goalAchievement').value),satisfaction:Number($('researchSatisfaction').value),submitted_at:new Date().toISOString()},consent_to_submit:true};
 const btn=$('submitResearch');btn.disabled=true;status.textContent='Đang gửi dữ liệu lên hệ thống nghiên cứu…';
 try{const base=cfg.url.replace(/\/$/,'');const response=await fetch(base+'/rest/v1/hs_discover_submissions',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.anonKey,'Authorization':'Bearer '+cfg.anonKey,'Prefer':'return=minimal'},body:JSON.stringify(payload)});if(!response.ok){const detail=await response.text();throw new Error('HTTP '+response.status+': '+detail)}researchSubmitted=true;status.textContent='Gửi dữ liệu thành công. Mã tham gia: '+code+'. Cảm ơn bạn đã tham gia nghiên cứu.';$('researchCondition').value='';toast('Đã gửi dữ liệu nghiên cứu.');}catch(err){status.textContent='Chưa gửi được dữ liệu: '+err.message+' Bạn có thể thử lại sau.';}finally{btn.disabled=researchSubmitted;}
});
renderLibrary();$('learnStatus').textContent=window.HSRecommender.load().feedbackCount?`Hồ sơ cá nhân đã có ${window.HSRecommender.load().feedbackCount} phản hồi trên thiết bị này.`:'Chưa có phản hồi cá nhân.';
})();
