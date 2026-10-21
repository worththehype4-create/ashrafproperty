// BrotherCond Sales Academy — app logic
const M = window.M, BRANDS = window.BRANDS, SKILLS = window.SKILLS;
const OPEN_ALL = false;             // step-by-step: each module, tab and lesson unlocks after the one before
const FINAL_PER_SKILL = 6;          // 7 skills × 6 = 42 questions
const FINAL_PASS = 80;

const toAr = n => Number(n).toLocaleString('ar-EG');
const KEY = 'bc-academy';
const EMAIL_DOMAIN = 'academy.brothercond.app';
const sb = window.supabase.createClient(window.ACADEMY.url, window.ACADEMY.anonKey);
let ME = null;                                   // signed-in profile
let S = {quiz:{}, scen:{}, read:{}, name:""};    // progress (synced to Supabase)
let _saveT = null;
const save = () => { clearTimeout(_saveT); _saveT = setTimeout(pushProgress, 700); };
async function pushProgress(){
  if(!ME || !ME.id) return; clearTimeout(_saveT);
  const {error} = await sb.from('progress').upsert({user_id:ME.id, state:{quiz:S.quiz, scen:S.scen, read:S.read}, rev:S.rev||0, updated_at:new Date().toISOString()});
  if(error && /progress_reset/.test(error.message||'')){
    // the admin reset this trainee's progress while they were signed in: load the new state
    await loadMine(); cur={mod:'home'}; saveCur(); render();
    showOverlay(`<h3 id="ovl-t">تقدّمك اتعمله إعادة</h3><p class="setup">المدير رجّع جزء من الكورس أو الكورس كله من الأول. كمّل من أول مستوى مفتوح.</p><button class="btn" data-act="ok">تمام</button>`);
    return;
  }
  if(error) toast('مش قادر يحفظ تقدّمك، اتأكد من النت');
}
let cur = {mod:'home'};
const saveCur = () => { try{ if(ME) localStorage.setItem(KEY+'-cur-'+ME.id, JSON.stringify(cur)); }catch(e){} };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ids for every question (used by the locked final exam)
M.forEach(m=>m.quiz.forEach((q,i)=>{ q.id = m.id+'-'+i; }));
const ALLQ = {}; M.forEach(m=>m.quiz.forEach(q=>ALLQ[q.id]=q)); (window.FINAL_EXTRA||[]).forEach(q=>ALLQ[q.id]=q);

const passed = id => (S.quiz[id]||0) >= 70;
const finalPassed = () => !!S.finalDone && (S.final||0) >= FINAL_PASS;
const allPassed = () => M.every(m=>passed(m.id));
const lessonsDone = m => OPEN_ALL || (S.read[m.id]||0) >= m.lessons.length;
const isLocked = i => !OPEN_ALL && i>0 && !passed(M[i-1].id);
const firstOpen = () => { const i=M.findIndex(m=>!passed(m.id)); return i<0?M.length-1:i; };
const arDigits = s => +String(s).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g,'');
const totalHours = () => Math.round(M.reduce((a,m)=>a+arDigits(m.time),0)/60);

// ── points, badges, levels ─────────────────────────────
const BADGE = {start:'أول خطوة', product:'خبير المنتج', howitworks:'فاهم الدورة', brands:'خبير الماركات', sizing:'حاسب الحِمل', talk:'صاحب الكلمة', steps:'مهندس البيعة', showroom:'نجم المعرض', services:'خبير الخدمات', homevisit:'منسّق المعاينات', b2b:'صياد المشاريع', objections:'قاهر الاعتراضات', closing:'القفّال'};
const GROUP_COLOR = {'البداية':'--accent','اعرف منتجك':'--accent','مهارات البيع':'--warm','قنوات البيع':'--good','الاحتراف':'--gold'};
const LEVELS = [[0,'مبتدئ'],[500,'متدرب'],[1300,'مندوب'],[2300,'مندوب محترف'],[3300,'خبير مبيعات']];
const modPoints = m => ({l:Math.min(S.read[m.id]||0,m.lessons.length)*10, s:(S.scen[m.id]||0)*20, q:passed(m.id)?(S.quiz[m.id]+50):0});
const finalPoints = () => finalPassed()? S.final*2+200 : 0;
const points = () => M.reduce((a,m)=>{const x=modPoints(m); return a+x.l+x.s+x.q;},0) + finalPoints();
const badgeCount = () => M.filter(m=>passed(m.id)).length + (finalPassed()?1:0);
const levelOf = p => { let i=0; LEVELS.forEach((l,k)=>{ if(p>=l[0]) i=k; }); return i; };
function badgeSVG(num, on, color, size){
  size=size||64; const c = on?`var(${color})`:'var(--sunk)';
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
   <path d="M20 40 L14 62 L24 56 L30 62 L32 42Z" fill="${c}" opacity=".7"/><path d="M44 40 L50 62 L40 56 L34 62 L32 42Z" fill="${c}" opacity=".7"/>
   <circle cx="32" cy="27" r="23" fill="${c}" stroke="${on?'none':'var(--line)'}" stroke-width="1.5"/>
   <circle cx="32" cy="27" r="18" fill="none" stroke="${on?'#ffffff':'var(--line)'}" stroke-width="1.6" stroke-dasharray="2 3"/>
   <text x="32" y="34" text-anchor="middle" font-family="Cairo,Tahoma,sans-serif" font-weight="700" font-size="${String(num).length>1?17:20}" fill="${on?'#ffffff':'var(--muted)'}">${num}</text></svg>`;
}
function ring(pct, size){
  const r=44, c=2*Math.PI*r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--sunk)" stroke-width="9"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--accent)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c*pct/100} ${c}" transform="rotate(-90 50 50)"/><text x="50" y="57" text-anchor="middle" font-family="Cairo,Tahoma,sans-serif" font-weight="700" font-size="22" fill="var(--ink)">${toAr(Math.round(pct))}٪</text></svg>`;
}
function toast(msg){ const t=$('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,1800); }
function showOverlay(html, onBtn){
  const o=$('ovl'); $('ovl-body').innerHTML=html; o.hidden=false;
  o.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{ o.hidden=true; if(onBtn) onBtn(b.dataset.act); });
  const f=o.querySelector('[data-act]'); if(f) f.focus();
}
function stats(){
  const p=points(), li=levelOf(p), nx=LEVELS[li+1];
  $('pts').textContent=toAr(p); $('bdg').textContent=toAr(badgeCount()); $('lvl').textContent=LEVELS[li][1];
  $('pbar').style.width = nx? (100*(p-LEVELS[li][0])/(nx[0]-LEVELS[li][0]))+'%' : '100%';
}
function go(c){ cur=c; saveCur(); render(); topOfMain(); }
function topOfMain(){ const el=$('main'); window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+window.scrollY-80),behavior:'smooth'}); }

// ── navigation ─────────────────────────────────────────
function renderNav(){
  const nav = $('nav'); nav.innerHTML='';
  const item = (cls, n, t, s, on, cur_, disabled) => { const b=document.createElement('button'); b.className='mod-btn '+cls; b.disabled=!!disabled; b.setAttribute('aria-current', cur_?'true':'false'); b.innerHTML=`<span class="n">${n}</span><span class="tx"><span class="t">${t}</span><span class="s">${s}</span></span>`; b.onclick=on; nav.appendChild(b); return b; };
  const sep = t => { const s=document.createElement('div'); s.className='nav-sep'; s.textContent=t; nav.appendChild(s); };
  item('home', HOME_ICON, 'الرئيسية', 'تقدّمك والموديولات', ()=>go({mod:'home'}), cur.mod==='home');
  let lastGroup=null;
  M.forEach((m,i)=>{
    if(m.group!==lastGroup){ sep(m.group); lastGroup=m.group; }
    const lk=isLocked(i);
    item((passed(m.id)?'done ':'')+(lk?'locked':''), passed(m.id)?'✓':(lk?LOCK:toAr(i+1)), m.title, lk?'بيفتح بعد اللي قبله':m.sub, ()=>go({mod:i,tab:'lesson',l:0}), cur.mod===i, lk);
  });
  sep('الختام');
  const fOpen = allPassed() || (ME && ME.final_unlocked);
  item((finalPassed()?'done ':'')+(fOpen?'':'locked'), finalPassed()?'✓':(S.finalDone?'!':(fOpen?'★':LOCK)), 'الاختبار النهائي', S.finalDone?('النتيجة '+toAr(S.final)+'٪'):(fOpen?'محاولة واحدة بس':'بعد ما تعدّي كل الموديولات'), ()=>go({mod:'final'}), cur.mod==='final');
  item('ach', toAr(badgeCount()), 'شاراتي والشهادة', toAr(points())+' نقطة · '+LEVELS[levelOf(points())][1], ()=>go({mod:'ach'}), cur.mod==='ach');
  if(ME && ME.role==='admin'){ sep('الإدارة'); item('', '⚙', 'لوحة الإدارة', 'المتدربين والنتايج', ()=>go({mod:'admin'}), cur.mod==='admin'); }
}
const LOCK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const HOME_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>';

function render(){
  if(ME && ME.role==='admin'){ cur={mod:'admin'}; return renderAdmin($('main')); }
  if(cur.mod==='admin' && !(ME && ME.role==='admin')) cur={mod:'home'};
  if(cur.mod!=='home' && cur.mod!=='final' && cur.mod!=='ach' && cur.mod!=='admin' && (typeof cur.mod!=='number' || !M[cur.mod] || isLocked(cur.mod))) cur={mod:'home'};
  if(typeof cur.mod==='number'){
    if(cur.tab==='quiz' && !OPEN_ALL && S.scen[M[cur.mod].id]==null) cur.tab='scen';
    if((cur.tab==='say'||cur.tab==='scen') && !lessonsDone(M[cur.mod])) cur.tab='lesson';
  }
  renderNav(); stats();
  const main=$('main');
  if(cur.mod==='home') return renderHome(main);
  if(cur.mod==='final') return renderFinal(main);
  if(cur.mod==='ach') return renderAch(main);
  if(cur.mod==='admin') return renderAdmin(main);
  renderModule(main, M[cur.mod]);
}

// ── home ───────────────────────────────────────────────
function renderHome(main){
  const done=M.filter(m=>passed(m.id)).length, pct=100*done/M.length;
  const next = M.findIndex(m=>!passed(m.id));
  const nm = (S.name||'').trim();
  main.innerHTML = `
   <section class="hero">
    <div class="hero-tx">
      <div class="eyebrow">أكاديمية برازر كوند للمبيعات</div>
      <h2>${nm?('أهلاً يا '+esc(nm.split(' ')[0])):'أهلاً بيك في الأكاديمية'}</h2>
      <p>برنامج تدريب كامل لمندوب مبيعات التكييف: ${toAr(M.length)} موديول، حوالي ${toAr(totalHours())} ساعة تدريب، مواقف حقيقية، واختبار نهائي بشهادة معتمدة من برازر كوند.</p>
      ${nm?'':`<div class="namebox"><label for="hname">اكتب اسمك بالكامل زي ما هيتكتب في الشهادة</label><div class="row"><input id="hname" class="inp" placeholder="الاسم بالكامل" autocomplete="name"><button class="btn" id="hsave">حفظ</button></div></div>`}
      <div class="row" style="margin-top:6px">${next>=0?`<button class="btn" id="hgo">${done?'كمّل':'ابدأ'}: ${M[next].title}</button>`:`<button class="btn" id="hfinal">${S.finalDone?'شوف نتيجتك':'روح للاختبار النهائي'}</button>`}<button class="btn ghost" id="hach">شاراتي والشهادة</button></div>
    </div>
    <div class="hero-ring">${ring(pct,140)}<div class="sl">${toAr(done)} من ${toAr(M.length)} موديول</div></div>
   </section>
   <section class="facts">
    <div><b>من ١٩٩٠</b><span>أكتر من ٣٥ سنة في السوق</span></div>
    <div><b>موزع معتمد</b><span>لكل ماركات التكييف</span></div>
    <div><b>الموزع العام المعتمد</b><span>لتكييفات تراين المنزلية</span></div>
    <div><b>٤ فروع</b><span>الرحاب · مدينتي · مدينة نصر · التجمع الأول</span></div>
   </section>
   <section>
    <div class="sec-h"><h3>الموديولات</h3><span class="sl">كل موديول: دروس ← قول ومتقولش ← موقف ← اختبار</span></div>
    <div class="mgrid">${M.map((m,i)=>{ const st = passed(m.id)?'done':((S.read[m.id]||S.quiz[m.id]!=null)?'prog':''); const lab = passed(m.id)?('عدّيت · '+toAr(S.quiz[m.id])+'٪'):(st==='prog'?'شغال فيه':'لسه'); return `<button class="mcard ${st}" data-i="${i}" ${isLocked(i)?'disabled':''}><span class="mc-top">${badgeSVG(toAr(i+1),passed(m.id),GROUP_COLOR[m.group]||'--accent',44)}<span class="chip ${st==='done'?'ok':''}">${isLocked(i)?'مقفول':lab}</span></span><span class="mc-g">${m.group}</span><span class="mc-t">${m.title}</span><span class="mc-s">${m.sub}</span><span class="mc-f">${m.time} · ${toAr(m.lessons.length)} دروس</span></button>`; }).join('')}
     <button class="mcard final ${finalPassed()?'done':''}" id="hfcard"><span class="mc-top">${badgeSVG('★',finalPassed(),'--gold',44)}<span class="chip ${finalPassed()?'ok':''}">${S.finalDone?('النتيجة '+toAr(S.final)+'٪'):'محاولة واحدة'}</span></span><span class="mc-g">الختام</span><span class="mc-t">الاختبار النهائي والشهادة</span><span class="mc-s">${toAr(FINAL_PER_SKILL*Object.keys(SKILLS).length)} موقف من ٧ مهارات، وتقرير بمستواك</span><span class="mc-f">النجاح ${toAr(FINAL_PASS)}٪</span></button>
    </div>
   </section>`;
  main.querySelectorAll('.mcard[data-i]').forEach(b=>b.onclick=()=>go({mod:+b.dataset.i,tab:'lesson',l:0}));
  $('hfcard').onclick=()=>go({mod:'final'});
  const hg=$('hgo'); if(hg) hg.onclick=()=>go({mod:next,tab:'lesson',l:0});
  const hf=$('hfinal'); if(hf) hf.onclick=()=>go({mod:'final'});
  $('hach').onclick=()=>go({mod:'ach'});
  const hs=$('hsave'); if(hs) hs.onclick=()=>{ const v=$('hname').value.trim(); if(!v) return; S.name=v; save(); render(); };
}

// ── module ─────────────────────────────────────────────
function renderModule(main, m){
  const i=M.indexOf(m);
  const tabs = [['lesson','الدروس'],['say','قول ومتقولش'],['scen','جرّب الموقف'],['quiz','الاختبار']];
  main.innerHTML = `
    <div class="mhead">
      <div class="mh-badge">${badgeSVG(toAr(i+1),passed(m.id),GROUP_COLOR[m.group]||'--accent',64)}</div>
      <div class="mh-tx">
        <div class="eyebrow">${m.group} · موديول ${toAr(i+1)} من ${toAr(M.length)} · شارة «${BADGE[m.id]}»</div>
        <h2>${m.title}</h2>
        <p>${m.intro}</p>
        <div class="meta"><span class="chip">${m.time}</span><span class="chip ${(S.read[m.id]||0)>=m.lessons.length?'ok':''}">الدروس: ${toAr(Math.min(S.read[m.id]||0,m.lessons.length))} من ${toAr(m.lessons.length)}</span>${passed(m.id)?`<span class="chip ok">عدّيت الاختبار بـ ${toAr(S.quiz[m.id])}٪</span>`:(S.quiz[m.id]!=null?`<span class="chip">أعلى نتيجة ${toAr(S.quiz[m.id])}٪</span>`:'')}</div>
      </div>
    </div>
    <div class="tabs" role="tablist">${tabs.map(([k,l],n)=>{const dis = (!OPEN_ALL && k==='quiz' && S.scen[m.id]==null) || ((k==='say'||k==='scen') && !lessonsDone(m)); return `<button role="tab" aria-selected="${cur.tab===k}" data-k="${k}" ${dis?'disabled':''}><span class="tn">${toAr(n+1)}</span>${l}${dis?' '+LOCK:''}</button>`;}).join('')}</div>
    <div class="pane" id="pane"></div>`;
  main.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{cur.tab=b.dataset.k; if(b.dataset.k==='lesson') cur.l=0; saveCur(); render();});
  const pane=$('pane');
  if(cur.tab==='lesson') renderLesson(pane,m);
  else if(cur.tab==='say') renderSay(pane,m);
  else if(cur.tab==='scen') renderScen(pane,m);
  else renderQuiz(pane,m);
}
function nextBtn(label){ return `<div class="row"><button class="btn" id="nxt">${label}</button></div>`; }
function wireNext(tab){ const b=$('nxt'); if(b) b.onclick=()=>{cur.tab=tab; saveCur(); render(); topOfMain();}; }
function renderLesson(p,m){
  const n=m.lessons.length, read=S.read[m.id]||0;
  let i = Math.max(0, Math.min(cur.l||0, n-1, OPEN_ALL?n-1:read)); cur.l=i;
  const L=m.lessons[i], last=i===n-1;
  const steps = m.lessons.map((x,k)=>`<button class="lstep ${k<read?'done':''}" data-k="${k}" ${OPEN_ALL||k<=read?'':'disabled'} aria-current="${k===i}"><span class="ln">${k<read&&k!==i?'✓':toAr(k+1)}</span><span class="lt">${x.h}</span></button>`).join('');
  p.innerHTML = `<div class="lsteps">${steps}</div>
   <article class="lesson"><div class="lcount">الدرس ${toAr(i+1)} من ${toAr(n)}</div><h3>${L.h}</h3>${L.html}</article>
   ${last && m.calc?calcHTML():''}
   <div class="row lnav">${i>0?'<button class="btn ghost" id="lprev">الدرس اللي قبله</button>':'<span></span>'}<button class="btn" id="lnext">${last?'خلصت الدروس، كمّل':'فهمت، الدرس اللي بعده'}</button></div>`;
  if(last && m.calc) wireCalc();
  if(m.brandTool){ const bt=$('brandtool'); if(bt){ bt.innerHTML=brandToolHTML(); wireBrandTool(); } const bl=$('brandlines'); if(bl){ bl.innerHTML=brandLinesHTML(); wireBrandLines(); } }
  p.querySelectorAll('.lstep').forEach(b=>b.onclick=()=>{cur.l=+b.dataset.k; saveCur(); render(); topOfMain();});
  const pv=$('lprev'); if(pv) pv.onclick=()=>{cur.l=i-1; saveCur(); render(); topOfMain();};
  $('lnext').onclick=()=>{ if(i+1>read) toast('+١٠ نقط'); S.read[m.id]=Math.max(read,i+1); save(); if(last) cur.tab='say'; else cur.l=i+1; saveCur(); render(); topOfMain(); };
}
function renderSay(p,m){
  p.innerHTML = `<p class="setup">جمل حقيقية من الشغل. اقرأ الفرق وقولها بصوت عالي بأسلوبك.</p><div class="saylist">`+
    m.say.map(([y,n])=>`<div class="say"><div class="yes"><span class="k">قول</span>${y}</div><div class="no"><span class="k">متقولش</span>${n}</div></div>`).join('')+`</div>`+nextBtn('كمّل: جرّب الموقف');
  wireNext('scen');
}
function renderScen(p,m){
  const sc=m.scenario; let i=0, score=0;
  p.innerHTML = `<div class="scene"><b>الموقف</b>${sc.setup} اختار أحسن رد في كل خطوة.</div><div id="steps" class="pane"></div>`;
  const box=p.querySelector('#steps');
  function step(){
    if(i>=sc.steps.length){
      const prev=S.scen[m.id]||0; S.scen[m.id]=Math.max(prev,score); save(); stats(); if(score>prev) toast('+'+toAr((score-prev)*20)+' نقطة');
      const d=document.createElement('div'); d.className='pane';
      d.innerHTML = `<div class="fb ${score===sc.steps.length?'right':'wrong'}"><b>${score===sc.steps.length?'ممتاز، اخترت الصح في كل خطوة.':'خلصت الموقف.'}</b>نتيجتك ${toAr(score)} من ${toAr(sc.steps.length)}.</div><div class="row"><button class="btn ghost" id="again">أعد الموقف</button><button class="btn" id="nxt">كمّل: الاختبار</button></div>`;
      box.appendChild(d); d.querySelector('#again').onclick=()=>renderScen(p,m); wireNext('quiz'); return;
    }
    const st=sc.steps[i], order=shuffle(st.o.map((_,k)=>k));
    const d=document.createElement('div'); d.className='pane';
    d.innerHTML = `<div class="bubble"><div class="who">العميل</div>${st.c}</div><div class="opts">${order.map(k=>`<button class="opt" data-k="${k}">${st.o[k].t}</button>`).join('')}</div><div class="fbx"></div>`;
    box.appendChild(d);
    d.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
      const o=st.o[+b.dataset.k]; if(o.ok) score++;
      d.querySelectorAll('.opt').forEach(x=>{ x.disabled=true; if(st.o[+x.dataset.k].ok) x.classList.add('right'); });
      if(!o.ok) b.classList.add('wrong');
      d.querySelector('.fbx').innerHTML=`<div class="fb ${o.ok?'right':'wrong'}"><b>${o.ok?'رد ممتاز':'مش أحسن رد'}</b>${o.fb}</div>`;
      i++; setTimeout(step,250);
    });
  }
  step();
}
function renderQuiz(p,m){
  const qs = shuffle(m.quiz).map(x=>{ const idx=shuffle(x.o.map((_,k)=>k)); return {...x, o:idx.map(k=>x.o[k]), a:idx.indexOf(x.a)}; });
  let i=0, right=0;
  function q(){
    if(i>=qs.length){
      const sc=Math.round(100*right/qs.length), was=passed(m.id), before=points();
      S.quiz[m.id]=Math.max(S.quiz[m.id]||0,sc); save(); stats(); renderNav();
      const ok=sc>=70, mi=M.indexOf(m);
      p.innerHTML = `<div class="result-card ${ok?'ok':'no'}"><div class="score">${toAr(sc)}٪</div><div><b>${ok?'عدّيت الاختبار!':'لسه شوية.'}</b><br><span class="setup">${toAr(right)} من ${toAr(qs.length)} صح. المطلوب ٧٠٪.</span></div></div>
        <div class="row"><button class="btn ghost" id="again">${ok?'جرّب تاني':'راجع وجرّب تاني'}</button>${ok&&mi<M.length-1?'<button class="btn" id="nm">الموديول اللي بعده</button>':''}${ok&&mi===M.length-1?'<button class="btn" id="fn">روح للاختبار النهائي</button>':''}</div>`;
      $('again').onclick=()=>renderQuiz(p,m);
      const nm=$('nm'); if(nm) nm.onclick=()=>go({mod:mi+1,tab:'lesson',l:0});
      const fn=$('fn'); if(fn) fn.onclick=()=>go({mod:'final'});
      if(!was && passed(m.id)){ const gain=points()-before; setTimeout(()=>showOverlay(`${badgeSVG(toAr(mi+1),true,GROUP_COLOR[m.group]||'--accent',110)}<h3 id="ovl-t">مبروك! كسبت شارة جديدة</h3><div class="big-b">«${BADGE[m.id]}»</div><div class="plus">+${toAr(gain)} نقطة</div><div class="setup">عدّيت اختبار «${m.title}» بـ ${toAr(sc)}٪</div><button class="btn" data-act="ok">كمّل</button>`),350); }
      return;
    }
    const x=qs[i];
    p.innerHTML = `<div class="qhead"><span class="qnum">سؤال ${toAr(i+1)} من ${toAr(qs.length)}</span><span class="qbar"><i style="width:${100*i/qs.length}%"></i></span></div><div class="qtext">${x.q}</div><div class="opts">${x.o.map((o,k)=>`<button class="opt" data-k="${k}"><span class="ol">${'أبجد'[k]}</span>${o}</button>`).join('')}</div><div class="fbx"></div>`;
    p.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
      const k=+b.dataset.k, ok=k===x.a; if(ok) right++;
      p.querySelectorAll('.opt').forEach((y,j)=>{ y.disabled=true; if(j===x.a) y.classList.add('right'); });
      if(!ok) b.classList.add('wrong');
      p.querySelector('.fbx').innerHTML=`<div class="fb ${ok?'right':'wrong'}"><b>${ok?'صح':'غلط'}</b>${x.why}</div><div class="row" style="margin-top:12px"><button class="btn" id="nq">${i+1<qs.length?'السؤال اللي بعده':'شوف النتيجة'}</button></div>`;
      $('nq').onclick=()=>{ i++; q(); };
    });
  }
  q();
}

// ── final exam (one attempt, resumable, locked) ────────
async function startFinal(){
  const pool = shuffle(Object.values(ALLQ));
  const ids = shuffle(Object.keys(SKILLS).flatMap(k=>pool.filter(q=>q.k===k).slice(0,FINAL_PER_SKILL).map(q=>q.id)));
  const perms = ids.map(id=>shuffle(ALLQ[id].o.map((_,k)=>k)));
  await pushProgress();
  const {data, error} = await sb.rpc('start_final', {p_ids:ids, p_perms:perms});
  if(error){ toast(error.message.includes('modules')?'لازم تعدّي كل الموديولات الأول':'مش قادر يبدأ الاختبار، جرّب تاني'); return; }
  applyFinal(data);
}
function skillScores(fx){ const o={}; fx.ids.forEach((id,n)=>{ const q=ALLQ[id]; if(!q) return; o[q.k]=o[q.k]||{r:0,n:0}; o[q.k].n++; if(fx.ans[n]===q.a) o[q.k].r++; }); return o; }
function skillReport(sc){
  const keys=Object.keys(SKILLS).filter(k=>sc[k]);
  const tot=keys.reduce((a,k)=>a+sc[k].r,0), n=keys.reduce((a,k)=>a+sc[k].n,0), pct=n?Math.round(100*tot/n):0;
  const weak=keys.filter(k=>sc[k].r/sc[k].n<.67).map(k=>SKILLS[k]);
  const v = pct>=85&&!weak.length ? ['مندوب جاهز للشغل','--good','حكمه على المواقف سليم في كل المهارات.']
    : pct>=FINAL_PASS ? ['مندوب كويس ومحتاج متابعة','--gold', weak.length?('يركّز على: '+weak.join('، ')+'.'):'يراجع المواقف اللي غلط فيها.']
    : ['محتاج تدريب تاني قبل ما يبيع','--warm','يرجع للموديولات الخاصة بـ: '+(weak.join('، ')||'كل المهارات')+'.'];
  return `<section class="card"><h3>تقرير المهارات</h3><div class="verdict" style="--vc:var(${v[1]})"><b>${v[0]}</b><span>${v[2]}</span></div>
   <div class="skills">${keys.map(k=>{const p=Math.round(100*sc[k].r/sc[k].n), col=p>=67?'--good':(p>=34?'--gold':'--warm'); return `<div class="sk"><span class="skn">${SKILLS[k]}</span><span class="skb"><i style="width:${p}%;background:var(${col})"></i></span><span class="skv">${toAr(sc[k].r)} من ${toAr(sc[k].n)}</span></div>`;}).join('')}</div></section>`;
}
function renderFinal(main){
  const N=FINAL_PER_SKILL*Object.keys(SKILLS).length, open=allPassed()||(ME&&ME.final_unlocked);
  const head = `<div class="mhead"><div class="mh-badge">${badgeSVG('★',finalPassed(),'--gold',64)}</div><div class="mh-tx"><div class="eyebrow">الختام</div><h2>الاختبار النهائي</h2><p>${toAr(N)} موقف من ٧ مهارات بيع. النجاح ${toAr(FINAL_PASS)}٪ وبيدّيك شارة «مستشار مبيعات معتمد» وشهادة برازر كوند.</p></div></div>`;
  if(S.finalDone){
    const ok=finalPassed();
    main.innerHTML = head+`<div class="result-card ${ok?'ok':'no'}"><div class="score">${toAr(S.final)}٪</div><div><b>${ok?'نجحت في الاختبار النهائي':'لم تجتز الاختبار النهائي'}</b><br><span class="setup">الاختبار اتقفل، ومينفعش يتعاد. ${ok?'شهادتك جاهزة.':'كلّم مديرك عشان يحدد معاك الخطوة الجاية.'}</span></div></div>
      ${S.finalSkills?skillReport(S.finalSkills):''}${ok?'<div class="row"><button class="btn" id="gocert">روح للشهادة</button></div>':''}`;
    const g=$('gocert'); if(g) g.onclick=()=>go({mod:'ach'});
    return;
  }
  if(!open){
    main.innerHTML = head+`<section class="card"><h3>الاختبار لسه مقفول</h3><p class="setup">بيفتح لما تعدّي اختبار كل موديول بـ ٧٠٪ أو أكتر. فاضلك:</p><ul class="checklist">${M.map(m=>`<li class="${passed(m.id)?'ok':''}">${m.title}</li>`).join('')}</ul></section>`;
    return;
  }
  if(!S.fx){
    main.innerHTML = head+`<section class="card warnbox"><h3>قبل ما تبدأ، اقرا كويس</h3>
      <ul><li>عندك <b>محاولة واحدة بس</b>. بعد ما تخلص، الاختبار بيتقفل ومينفعش يتعاد.</li>
      <li>${toAr(N)} سؤال، وكل إجابة بتتسجل أول ما تختارها ومينفعش ترجع فيها.</li>
      <li>مش هتشوف الإجابة الصح أثناء الاختبار. في الآخر هتاخد نتيجتك وتقرير بمستواك في كل مهارة.</li>
      <li>لو الصفحة اتقفلت، هتكمّل من نفس السؤال.</li>
      <li>خلّي عندك حوالي ٤٥ دقيقة من غير مقاطعة.</li></ul>
      <label class="agree"><input type="checkbox" id="fok"> فهمت إن عندي محاولة واحدة بس</label>
      <div class="row"><button class="btn" id="fstart" disabled>ابدأ الاختبار النهائي</button></div></section>`;
    const ok=$('fok'), st=$('fstart');
    ok.onchange=()=>{ st.disabled=!ok.checked; };
    st.onclick=async()=>{ st.disabled=true; await startFinal(); render(); topOfMain(); };
    return;
  }
  main.innerHTML = head+`<section class="card" id="fq"></section>`;
  finalQuestion($('fq'));
}
function finalQuestion(box){
  const fx=S.fx, n=fx.ans.length, N=fx.ids.length;
  if(n>=N) return finishFinal();
  const q=ALLQ[fx.ids[n]], perm=fx.perms[n];
  box.innerHTML = `<div class="qhead"><span class="qnum">سؤال ${toAr(n+1)} من ${toAr(N)}</span><span class="qbar"><i style="width:${100*n/N}%"></i></span><span class="chip">${SKILLS[q.k]}</span></div>
   <div class="qtext">${q.q}</div><div class="opts">${perm.map((k,j)=>`<button class="opt" data-k="${k}"><span class="ol">${'أبجد'[j]}</span>${q.o[k]}</button>`).join('')}</div>
   <div class="row" style="margin-top:12px"><button class="btn" id="fnext" disabled>${n+1<N?'سجّل إجابتي واللي بعده':'سجّل إجابتي وشوف النتيجة'}</button></div>`;
  let pick=null;
  box.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{ pick=+b.dataset.k; box.querySelectorAll('.opt').forEach(x=>x.classList.toggle('sel',x===b)); $('fnext').disabled=false; });
  $('fnext').onclick=async()=>{ if(pick==null) return; const bt=$('fnext'); bt.disabled=true;
    const {data, error} = await sb.rpc('answer_final', {p_n:n, p_k:pick});
    if(error){ bt.disabled=false; toast('مش قادر يسجّل الإجابة، اتأكد من النت وجرّب تاني'); return; }
    if(data===n+1) fx.ans.push(pick); else { const {data:row}=await sb.from('final_results').select('*').eq('user_id',ME.id).single(); applyFinal(row); }
    if(S.fx.ans.length>=N) finishFinal(); else { finalQuestion(box); topOfMain(); } };
}
async function finishFinal(){
  const before=points();
  const {data, error} = await sb.rpc('finish_final');
  if(error){ toast('مش قادر يقفل الاختبار، جرّب تاني'); return; }
  applyFinal(data);
  render(); topOfMain();
  if(finalPassed()){ const gain=points()-before; setTimeout(()=>showOverlay(`${badgeSVG('★',true,'--gold',110)}<h3 id="ovl-t">مبروك! نجحت في الاختبار النهائي</h3><div class="big-b">«مستشار مبيعات معتمد»</div><div class="plus">+${toAr(gain)} نقطة</div><button class="btn" data-act="cert">اطلع شهادتك</button><button class="btn ghost" data-act="ok">بعدين</button>`, a=>{ if(a==='cert') go({mod:'ach'}); }),350); }
}

// ── achievements, certificate, manager ─────────────────
function renderAch(main){
  const p=points(), li=levelOf(p);
  const badges = M.map((m,i)=>{const on=passed(m.id); return `<div class="bdg ${on?'':'off'}">${badgeSVG(toAr(i+1),on,GROUP_COLOR[m.group]||'--accent',56)}<div class="bn">${BADGE[m.id]}</div><div class="bm">${on?toAr(S.quiz[m.id])+'٪':m.title}</div></div>`;}).join('')
    + `<div class="bdg ${finalPassed()?'':'off'}">${badgeSVG('★',finalPassed(),'--gold',56)}<div class="bn">مستشار مبيعات معتمد</div><div class="bm">${finalPassed()?toAr(S.final)+'٪':'الاختبار النهائي'}</div></div>`;
  const rows = M.map(m=>{const x=modPoints(m); return `<tr><td>${m.title}</td><td>${toAr(x.l)}</td><td>${toAr(x.s)}</td><td>${toAr(x.q)}</td><td><b>${toAr(x.l+x.s+x.q)}</b></td></tr>`;}).join('')+`<tr><td>الاختبار النهائي</td><td>-</td><td>-</td><td>${toAr(finalPoints())}</td><td><b>${toAr(finalPoints())}</b></td></tr>`;
  main.innerHTML = `<div class="mhead"><div class="mh-tx"><div class="eyebrow">إنجازاتي</div><h2>شاراتي والشهادة</h2><p>كل درس بـ ١٠ نقط، وكل رد صح في الموقف بـ ٢٠ نقطة، وكل اختبار تعدّيه بياخد نتيجته + ٥٠ نقطة وشارة. الاختبار النهائي بيدّي شارة «مستشار مبيعات معتمد» والشهادة.</p></div></div>
   <section class="card lvlcard"><div><div class="sl">نقطك</div><div class="bigp">${toAr(p)}</div></div><div style="flex:1;min-width:220px"><div class="sl">المستوى الحالي</div><div class="lv" style="font-size:20px">${LEVELS[li][1]}</div><div class="ladder">${LEVELS.map((l,k)=>`<span class="${k<=li?'on':''}">${l[1]} · ${toAr(l[0])}</span>`).join('')}</div></div></section>
   <section class="card" id="certsec"><h3>شهادة الإتمام</h3><div id="certbox"></div></section>
   ${S.finalSkills?skillReport(S.finalSkills):''}
   <section class="card"><h3>الشارات (${toAr(badgeCount())} من ${toAr(M.length+1)})</h3><div class="badges">${badges}</div></section>
   <section class="card"><h3>تفاصيل النقط</h3><div class="tw"><table class="t"><thead><tr><th>الموديول</th><th>الدروس</th><th>الموقف</th><th>الاختبار</th><th>المجموع</th></tr></thead><tbody>${rows}</tbody></table></div></section>
   `;
  certBox($('certbox'));

}
function certBox(box){
  if(!finalPassed()){
    box.innerHTML = `<p class="setup">الشهادة بتتعمل بعد ما تنجح في الاختبار النهائي.</p><ul class="checklist"><li class="${allPassed()?'ok':''}">تعدّي اختبار كل الموديولات بـ ٧٠٪ أو أكتر (${toAr(M.filter(m=>passed(m.id)).length)} من ${toAr(M.length)})</li><li class="${finalPassed()?'ok':''}">تنجح في الاختبار النهائي بـ ${toAr(FINAL_PASS)}٪ أو أكتر${S.finalDone&&!finalPassed()?' (النتيجة '+toAr(S.final)+'٪، كلّم مديرك)':''}</li></ul>`;
    return;
  }
  if(!S.cert){
    box.innerHTML = `<p class="setup">الشهادة هتطلع بالاسم ده. راجعه كويس، لأنه بيتثبت بعد ما الشهادة تتعمل. لو فيه غلط كلّم المدير يصلّحه الأول.</p><div class="namefix">${esc(ME.full_name)}</div><div class="row"><button class="btn" id="mkcert">اعمل الشهادة</button></div><div id="cerr"></div>`;
    $('mkcert').onclick=async()=>{ $('mkcert').disabled=true; const {data, error}=await sb.rpc('make_certificate',{p_name:ME.full_name}); if(error){ $('mkcert').disabled=false; $('cerr').innerHTML='<div class="fb wrong"><b>مش قادر يعمل الشهادة</b>جرّب تاني بعد شوية.</div>'; return; } applyFinal(data); certBox(box); };
    return;
  }
  box.innerHTML = `<p class="setup">جاري تجهيز الشهادة...</p>`;
  drawCert().then(cv=>{
    const url=cv.toDataURL('image/png');
    box.innerHTML = `<img class="certimg" src="${url}" alt="شهادة إتمام باسم ${esc(S.cert.name)}">
      <div class="row" style="margin-top:12px"><button class="btn" id="dlpdf">تحميل الشهادة PDF للطباعة</button><button class="btn ghost" id="dlpng">تحميل صورة PNG</button></div>
      <p class="setup" id="dlmsg" style="margin-top:6px">الـ PDF مقاس A4 بالعرض، جاهز للطباعة الملونة.</p>`;
    const direct = {save: async ({filename, data})=>{ const u=URL.createObjectURL(data); const a=document.createElement('a'); a.href=u; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); return {status:'saved'}; }};
    (window.claude?.use ? window.claude.use('downloads') : Promise.resolve(direct)).catch(()=>direct).then(dl=>{
      if(!dl){ $('dlpdf').hidden=true; $('dlpng').hidden=true; $('dlmsg').textContent='عشان تحفظ الشهادة: كليك يمين عليها واختار «حفظ الصورة»، أو على الموبايل دوس عليها كتير. الصورة عالية الجودة ومناسبة للطباعة A4.'; return; }
      const fname='BrotherCond-Certificate-'+S.cert.id;
      $('dlpdf').onclick=async()=>{ try{ const { jsPDF } = window.jspdf; const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}); pdf.addImage(cv.toDataURL('image/jpeg',0.95),'JPEG',0,0,297,210); await dl.save({filename:fname+'.pdf', data:pdf.output('blob')}); toast('اتحفظت الشهادة'); }catch(e){ if(e&&e.code!=='declined') $('dlmsg').textContent='التحميل مش متاح دلوقتي. جرّب صورة PNG أو كليك يمين على الشهادة واحفظها.'; } };
      $('dlpng').onclick=async()=>{ try{ const blob=await new Promise(r=>cv.toBlob(r,'image/png')); await dl.save({filename:fname+'.png', data:blob}); toast('اتحفظت الصورة'); }catch(e){} };
    });
  });
}
async function drawCert(){
  try{ await Promise.all([document.fonts.load('700 60px Cairo'),document.fonts.load('400 30px Cairo')]); }catch(e){}
  const W=3508, H=2480, c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
  const navy='#0f2f45', teal='#1279a3', gold='#b8862a', ink='#0f2533', muted='#5a6f7c';
  const F=(w,sz,f)=>`${w} ${sz}px ${f||'Cairo'}, Tahoma, sans-serif`;
  x.fillStyle='#ffffff'; x.fillRect(0,0,W,H);
  // soft background pattern
  x.fillStyle='#f3f8fb'; x.fillRect(90,90,W-180,H-180);
  x.save(); x.beginPath(); x.rect(100,100,W-200,H-200); x.clip(); x.globalAlpha=.05; x.strokeStyle=teal; x.lineWidth=3;
  for(let r=200;r<1700;r+=70){ x.beginPath(); x.arc(W/2,H/2+120,r,0,Math.PI*2); x.stroke(); } x.restore();
  // frames
  x.strokeStyle=navy; x.lineWidth=22; x.strokeRect(90,90,W-180,H-180);
  x.strokeStyle=gold; x.lineWidth=5; x.strokeRect(150,150,W-300,H-300);
  x.fillStyle=gold; [[150,150],[W-150,150],[150,H-150],[W-150,H-150]].forEach(([a,b])=>{ x.save(); x.translate(a,b); x.rotate(Math.PI/4); x.fillRect(-22,-22,44,44); x.restore(); });
  // header band
  x.direction='rtl'; x.textAlign='center'; x.textBaseline='alphabetic';
  // company logo
  try{ const lg=await new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src='bc-logo.png'; }); x.drawImage(lg, W/2-170, 190, 340, 340); }catch(e){}
  x.fillStyle=teal; x.font=F(600,40); x.direction='ltr'; x.fillText('SINCE 1990', W/2, 600); x.direction='rtl';
  x.fillStyle=ink; x.font=F(700,150); x.fillText('شهادة إتمام', W/2, 860);
  x.fillStyle=gold; x.fillRect(W/2-260,905,520,8);
  x.fillStyle=muted; x.font=F(400,62); x.fillText('تشهد أكاديمية برازر كوند للمبيعات بأن', W/2, 1040);
  x.fillStyle=navy; x.font=F(700,150); x.fillText(S.cert.name, W/2, 1240, W-700);
  x.strokeStyle='#c9d6de'; x.lineWidth=4; x.beginPath(); x.moveTo(W/2-900,1300); x.lineTo(W/2+900,1300); x.stroke();
  x.fillStyle=ink; x.font=F(400,62);
  x.fillText('قد أتمّ بنجاح البرنامج التدريبي «مندوب مبيعات التكييف المعتمد»', W/2, 1420);
  x.fillText(`واجتاز الاختبار النهائي بنتيجة ${toAr(S.final)}٪`, W/2, 1510);
  // stat chips
  const st=[[toAr(M.length),'موديول تدريبي'],[toAr(totalHours())+' ساعة','مدة البرنامج'],[toAr(S.final)+'٪','الاختبار النهائي'],[LEVELS[levelOf(points())][1],'المستوى']];
  const cw=520, gap=60, tw=st.length*cw+(st.length-1)*gap; let sx=W/2+tw/2-cw/2;
  st.forEach(([v,l])=>{ x.fillStyle='#ffffff'; x.strokeStyle='#d8e2e8'; x.lineWidth=4; roundRect(x,sx-cw/2,1600,cw,200,28); x.fill(); x.stroke(); x.fillStyle=teal; x.font=F(700,74); x.fillText(v,sx,1710); x.fillStyle=muted; x.font=F(400,40); x.fillText(l,sx,1770); sx-=cw+gap; });
  // signatures
  x.strokeStyle='#9fb3bd'; x.lineWidth=4;
  [[W-760,'مدير المبيعات'],[760,'مدير التدريب']].forEach(([px,l])=>{ x.beginPath(); x.moveTo(px-330,2030); x.lineTo(px+330,2030); x.stroke(); x.fillStyle=muted; x.font=F(400,44); x.fillText(l,px,2100); });
  // seal
  const cx=W/2, cy=2000; x.fillStyle=gold; x.beginPath(); for(let k=0;k<48;k++){ const a=k*Math.PI/24, r=k%2?175:190; x.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r); } x.closePath(); x.fill();
  x.strokeStyle='#ffffff'; x.lineWidth=5; x.setLineDash([10,14]); x.beginPath(); x.arc(cx,cy,140,0,Math.PI*2); x.stroke(); x.setLineDash([]);
  x.fillStyle='#ffffff'; x.font=F(700,52); x.fillText('معتمد',cx,cy-20); x.font=F(700,44); x.fillText('منذ ١٩٩٠',cx,cy+50);
  // footer
  const d=new Date(S.cert.date);
  x.fillStyle=muted; x.font=F(400,38);
  x.fillText('التاريخ: '+d.toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'})+'     ·     رقم الشهادة: '+S.cert.id, W/2, 2250);
  x.fillStyle=teal; x.font=F(600,36);
  x.fillText('الرحاب  ·  مدينتي  ·  مدينة نصر  ·  التجمع الأول', W/2, 2310);
  return c;
}
function roundRect(x,a,b,w,h,r){ x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }

// ── brand tool & calculator ────────────────────────────
function brandMark(b, big){
  return b.logo ? `<img class="blogo${big?' big':''}" src="${b.logo}" alt="شعار ${b.n}">` : `<span class="bname${big?' big':''}"><b>${b.en}</b><small>${b.n}</small></span>`;
}
function linesTable(b){
  return `<table class="t"><thead><tr><th>الخط</th><th>النوع</th><th>الأحصنة</th><th>بارد / ساخن</th></tr></thead><tbody>${b.lines.map(l=>`<tr><td><b dir="ltr">${l[0]}</b></td><td>${l[1]}</td><td>${l[2]}</td><td>${l[3]}</td></tr>`).join('')}</tbody></table>`;
}
function brandLinesHTML(){
  return `<div class="bpick" role="tablist">${BRANDS.map((b,i)=>`<button class="bchip" role="tab" data-i="${i}" aria-selected="${i===0}">${brandMark(b)}${b.verified?'<span class="vf" title="معتمدة من برازر كوند">✓</span>':''}</button>`).join('')}</div><div id="blbody"></div>`;
}
function wireBrandLines(){
  const show=i=>{ const b=BRANDS[i]; document.querySelectorAll('.bchip').forEach(c=>c.setAttribute('aria-selected', +c.dataset.i===i)); $('blbody').innerHTML=`<div class="bl-head">${brandMark(b,true)}<div><div class="lv">${b.n} · ${b.origin}</div><div class="sl">${b.eg}</div><div class="chip ${b.verified?'ok':''}">${b.verified?'خطوط معتمدة من برازر كوند':'اتأكد من القايمة: من المعروض في السوق ٢٠٢٦'}</div></div></div><div class="tw">${linesTable(b)}</div><p class="setup" style="margin-top:8px">${window.HP45_RULE}</p>`; };
  document.querySelectorAll('.bchip').forEach(c=>c.onclick=()=>show(+c.dataset.i)); show(0);
}
function brandToolHTML(){
  const opts = sel => BRANDS.map((b,i)=>`<option value="${i}" ${i===sel?'selected':''}>${b.n}</option>`).join('');
  return `<div class="row" style="margin-bottom:12px"><label for="b1" class="setup">ماركة ١</label><select id="b1" class="inp bsel">${opts(0)}</select><label for="b2" class="setup">ماركة ٢</label><select id="b2" class="inp bsel">${opts(1)}</select></div><div class="tw" id="bcmp"></div>
  <details style="margin-top:14px"><summary style="cursor:pointer;font-weight:600">كل الماركات في جدول واحد</summary><div class="tw" style="margin-top:10px"><table class="t"><thead><tr><th>الماركة</th><th>المنشأ</th><th>المستوى</th><th>مناسبة لـ</th></tr></thead><tbody>${BRANDS.map(b=>`<tr><td><b>${b.n}</b></td><td>${b.origin}</td><td>${b.tier}</td><td>${b.fit}</td></tr>`).join('')}</tbody></table></div></details>`;
}
function wireBrandTool(){
  const rows=[['المنشأ','origin'],['في مصر','eg'],['مستوى السعر','tier'],['خطوط الموديلات','lines'],['نقط القوة','plus'],['ممكن العميل يسأل عن','watch'],['مناسبة لـ','fit']];
  const cell=(b,k)=> k==='lines' ? b.lines.map(l=>`<div><b dir="ltr">${l[0]}</b> · ${l[1]} · ${l[2]}</div>`).join('') : b[k];
  const run=()=>{ const a=BRANDS[+$('b1').value], b=BRANDS[+$('b2').value]; $('bcmp').innerHTML=`<table class="t"><thead><tr><th></th><th>${brandMark(a)}</th><th>${brandMark(b)}</th></tr></thead><tbody>${rows.map(([l,k])=>`<tr><th>${l}</th><td>${cell(a,k)}</td><td>${cell(b,k)}</td></tr>`).join('')}</tbody></table>`; };
  document.querySelectorAll('.bsel').forEach(s=>s.addEventListener('change',run)); run();
}
function calcHTML(){
  return `<section class="card"><h3>حاسبة الحصان المبدئية</h3><p class="setup">استخدمها مع العميل وانت بتسأله. النتيجة استرشادية والمعاينة الفنية هي اللي بتأكد.</p>
  <div class="calc"><div class="fields">
   <label for="c-area">مساحة المكان (م²)<input id="c-area" class="inp" type="number" min="5" max="200" value="18"></label>
   <label for="c-people">عدد الناس عادةً في المكان<input id="c-people" class="inp" type="number" min="1" max="40" value="2"></label>
   <label for="c-face">الواجهة<select id="c-face" class="inp"><option value="0">بحري / مفيش شمس مباشرة</option><option value="0.10" selected>قبلي أو غربي</option></select></label>
   <div class="checks">
    <label><input type="checkbox" id="c-top" checked> آخر دور / تحت السطح</label>
    <label><input type="checkbox" id="c-glass"> شبابيك أو زجاج كبير</label>
    <label><input type="checkbox" id="c-kitchen"> مطبخ مفتوح على المكان</label>
    <label><input type="checkbox" id="c-high"> سقف أعلى من ٣ متر</label>
   </div></div>
   <div class="result" aria-live="polite"><small>الحمل التقريبي</small><div id="c-btu" style="font-weight:600;font-size:18px"></div><small>الترشيح</small><div class="big" id="c-hp"></div><small id="c-note"></small></div>
  </div></section>`;
}
function wireCalc(){
  const ids=['c-area','c-people','c-face','c-top','c-glass','c-kitchen','c-high'];
  const sizes=[[12000,'١٫٥ حصان'],[18000,'٢٫٢٥ حصان'],[24000,'٣ حصان'],[30000,'٤ حصان'],[36000,'٥ حصان']];
  function run(){
    const g=$; const area=Math.max(0,+g('c-area').value||0), ppl=Math.max(1,+g('c-people').value||1);
    let btu=area*680*(1+(+g('c-face').value)+(g('c-top').checked?0.15:0)+(g('c-glass').checked?0.10:0)+(g('c-high').checked?0.10:0)) + Math.max(0,ppl-2)*600 + (g('c-kitchen').checked?4000:0);
    btu=Math.round(btu/100)*100; g('c-btu').textContent=toAr(btu)+' وحدة حرارية';
    const s=sizes.find(x=>x[0]>=btu);
    if(s){ g('c-hp').textContent=s[1]; g('c-note').textContent='أقرب حصان يغطي الحمل. أكّد في المعاينة.'; }
    else { g('c-hp').textContent='أكتر من ٥ حصان'; g('c-note').textContent='جرّب تقسيم المكان على '+toAr(Math.ceil(btu/24000))+' أجهزة ٣ حصان، أو دولابي/كونسيلد، وارجع للقسم الفني.'; }
  }
  ids.forEach(id=>{const e=$(id); e.addEventListener('input',run); e.addEventListener('change',run);}); run();
}

$('statsbtn').onclick=()=>go({mod:'ach'});
$('brandhome').onclick=()=>go({mod:'home'});
$('logout').onclick=logout;
window.addEventListener('beforeunload', ()=>{ if(_saveT) pushProgress(); });

// ── cloud: login, profile, progress, final exam rows ───
function applyFinal(row){
  S.fx = row ? {ids:[...row.ids], perms:row.perms.map(x=>[...x]), ans:[...(row.answers||[])]} : null;
  S.finalDone = !!(row && row.finished_at); S.final = row ? row.score : null; S.finalSkills = row ? row.skills : null;
  S.cert = row && row.cert_id ? {name:row.cert_name, id:row.cert_id, date:row.cert_date} : null;
}
async function loadMine(){
  const [{data:prof},{data:prog},{data:fin}] = await Promise.all([
    sb.from('profiles').select('*').eq('id', ME.id).single(),
    sb.from('progress').select('state, rev').eq('user_id', ME.id).maybeSingle(),
    sb.from('final_results').select('*').eq('user_id', ME.id).maybeSingle()]);
  if(prof) ME = prof;
  const st = (prog && prog.state) || {};
  S = {quiz:st.quiz||{}, scen:st.scen||{}, read:st.read||{}, rev:(prog && prog.rev)||0, name:ME.full_name||''};
  applyFinal(fin);
}
function showLogin(msg){
  document.body.classList.add('signed-out');
  $('login').hidden=false; $('app').hidden=true;
  $('lerr').textContent = msg||'';
  $('lform').onsubmit = async e => {
    e.preventDefault();
    const u=$('luser').value.trim().toLowerCase(), p=$('lpass').value;
    if(!u||!p){ $('lerr').textContent='اكتب اسم المستخدم وكلمة السر.'; return; }
    $('lbtn').disabled=true; $('lerr').textContent='';
    const email = u.includes('@') ? u : u+'@'+EMAIL_DOMAIN;
    const {error} = await sb.auth.signInWithPassword({email, password:p});
    $('lbtn').disabled=false;
    if(error){ $('lerr').textContent = 'اسم المستخدم أو كلمة السر غلط.'; return; }
    boot();
  };
}
async function boot(){
  const {data:{session}} = await sb.auth.getSession();
  if(!session) return showLogin();
  ME = {id: session.user.id};
  try{ await loadMine(); }catch(e){ return showLogin('مش قادر يوصل للسيرفر. اتأكد من النت وجرّب تاني.'); }
  if(!ME.username){ await sb.auth.signOut(); return showLogin('الحساب ده مش متسجل في الأكاديمية. كلّم المدير.'); }
  if(!ME.active){ await sb.auth.signOut(); return showLogin('الحساب ده متوقف. كلّم المدير.'); }
  try{ const c=JSON.parse(localStorage.getItem(KEY+'-cur-'+ME.id)||'null'); if(c) cur=c; }catch(e){}
  document.body.classList.remove('signed-out');
  $('login').hidden=true; $('app').hidden=false;
  $('who').textContent = ME.full_name;
  document.body.classList.toggle('is-admin', ME.role==='admin');
  render();
}
async function logout(){ await pushProgress(); await sb.auth.signOut(); ME=null; S={quiz:{},scen:{},read:{},name:''}; document.body.classList.remove('is-admin'); showLogin(); }

// ── admin page ─────────────────────────────────────────
async function callAdmin(body){
  const {data, error} = await sb.functions.invoke('admin-users', {body});
  if(error){ let m=error.message; try{ const j=await error.context.json(); m=j.error||m; }catch(e){} throw new Error(m); }
  if(data && data.error) throw new Error(data.error);
  return data;
}
function stateSummary(st){
  st=st||{}; const q=st.quiz||{}, rd=st.read||{}, sc=st.scen||{};
  const pass=M.filter(m=>(q[m.id]||0)>=70).length;
  const pts=M.reduce((a,m)=>a+Math.min(rd[m.id]||0,m.lessons.length)*10+(sc[m.id]||0)*20+((q[m.id]||0)>=70?q[m.id]+50:0),0);
  return {pass, pts};
}
function verdictOf(skills, score){
  if(!skills) return '';
  const keys=Object.keys(SKILLS).filter(k=>skills[k]); const weak=keys.filter(k=>skills[k].r/skills[k].n<.67);
  return score>=85&&!weak.length?'جاهز للشغل':(score>=FINAL_PASS?'كويس ومحتاج متابعة':'محتاج تدريب تاني');
}
async function renderAdmin(main){
  main.innerHTML = `<div class="mhead"><div class="mh-tx"><div class="eyebrow">الإدارة</div><h2>لوحة الإدارة</h2><p>اعمل حسابات المتدربين، وتابع تقدّم كل واحد ونتيجة الاختبار النهائي وتقرير المهارات.</p></div></div>
   <section class="card"><h3>إضافة متدرب</h3>
    <form id="addf" class="addf">
     <label>الاسم بالكامل (هيتكتب في الشهادة)<input id="af-name" class="inp" required></label>
     <label>اسم المستخدم (إنجليزي صغير، زي ahmed.ali)<input id="af-user" class="inp" dir="ltr" required pattern="[a-z0-9._-]{3,30}"></label>
     <label>كلمة السر (٦ حروف على الأقل)<span class="row" style="gap:6px"><input id="af-pass" class="inp" dir="ltr" required minlength="6" style="flex:1"><button type="button" class="btn ghost" id="af-gen">اقترح</button></span></label>
     <label>الصلاحية<select id="af-role" class="inp"><option value="trainee">متدرب</option><option value="admin">مدير</option></select></label>
     <div class="row"><button class="btn" id="af-btn">إضافة</button><span id="af-msg" class="setup"></span></div>
    </form></section>
   <section class="card"><div class="sec-h"><h3>المتدربين</h3><button class="btn ghost" id="arefresh">تحديث</button></div><div id="alist" class="setup">جاري التحميل...</div></section>
   <section class="card"><h3>التحقق من شهادة</h3><div class="row"><input id="vcode" class="inp" dir="ltr" placeholder="BC-XXXXXX"><button class="btn ghost" id="vbtn">تحقق</button><span id="vmsg"></span></div></section>`;
  const gen=()=>{ const c='abcdefghjkmnpqrstuvwxyz23456789'; let s=''; for(let i=0;i<8;i++) s+=c[Math.floor(Math.random()*c.length)]; return s; };
  $('af-gen').onclick=()=>{ $('af-pass').value=gen(); };
  $('addf').onsubmit=async e=>{
    e.preventDefault(); $('af-btn').disabled=true; $('af-msg').textContent='جاري الإضافة...';
    const u=$('af-user').value.trim().toLowerCase(), p=$('af-pass').value;
    try{ await callAdmin({action:'create', full_name:$('af-name').value.trim(), username:u, password:p, role:$('af-role').value});
      $('af-msg').innerHTML=`اتعمل الحساب. ابعت للمتدرب: اسم المستخدم <b dir="ltr">${esc(u)}</b> وكلمة السر <b dir="ltr">${esc(p)}</b>`;
      $('addf').reset(); loadList();
    }catch(err){ $('af-msg').textContent=err.message; }
    $('af-btn').disabled=false;
  };
  $('arefresh').onclick=loadList;
  $('vbtn').onclick=async()=>{ const {data}=await sb.rpc('verify_certificate',{p_cert:$('vcode').value}); const r=data&&data[0]; $('vmsg').innerHTML = r?`<span class="chip ok">شهادة صحيحة: ${esc(r.full_name)} · ${toAr(r.score)}٪ · ${new Date(r.cert_date).toLocaleDateString('ar-EG')}</span>`:'<span class="chip">مفيش شهادة بالرقم ده</span>'; };
  async function loadList(){
    const {data, error} = await sb.rpc('admin_overview');
    if(error){ $('alist').textContent='مش قادر يحمّل القايمة: '+error.message; return; }
    if(!data.length){ $('alist').textContent='لسه مفيش متدربين.'; return; }
    $('alist').innerHTML = `<div class="tw"><table class="t adm"><thead><tr><th>الاسم</th><th>المستخدم</th><th>الموديولات</th><th>النقط</th><th>الاختبار النهائي</th><th>التقييم</th><th>الشهادة</th><th>إجراءات</th></tr></thead><tbody>${data.map(r=>{
      const s=stateSummary(r.state);
      const fin = r.finished_at ? `<b style="color:var(${r.score>=FINAL_PASS?'--good':'--warm'})">${toAr(r.score)}٪</b>` : (r.started_at?`شغال (${toAr(r.answered)}/${toAr(r.total)})`:(r.final_unlocked?'مفتوح':'—'));
      return `<tr class="${r.active?'':'off'}"><td><b>${esc(r.full_name)}</b>${r.role==='admin'?' <span class="chip">مدير</span>':''}${r.active?'':' <span class="chip">متوقف</span>'}<div class="sl">${r.progress_at?('آخر نشاط '+new Date(r.progress_at).toLocaleDateString('ar-EG')):'لسه مدخلش'}</div></td><td dir="ltr">${esc(r.username)}</td><td>${toAr(s.pass)} / ${toAr(M.length)}</td><td>${toAr(s.pts + (r.score>=FINAL_PASS?r.score*2+200:0))}</td><td>${fin}</td><td>${r.skills?`<button class="lnk" data-sk="${r.id}">${verdictOf(r.skills,r.score)}</button>`:'—'}</td><td dir="ltr">${r.cert_id||'—'}</td>
       <td><div class="acts"><button class="mini" data-pw="${r.id}">كلمة سر جديدة</button><button class="mini warn" data-prog="${r.id}">إعادة الكورس</button><button class="mini" data-act="${r.id}" data-on="${r.active?0:1}">${r.active?'إيقاف':'تفعيل'}</button>${r.started_at?`<button class="mini warn" data-reset="${r.id}">إعادة الاختبار</button>`:`<button class="mini" data-unlock="${r.id}" data-on="${r.final_unlocked?0:1}">${r.final_unlocked?'اقفل النهائي':'افتح النهائي'}</button>`}</div></td></tr>
       <tr class="skrow" id="sk-${r.id}" hidden><td colspan="8">${r.skills?skillReport(r.skills):''}</td></tr>`;}).join('')}</tbody></table></div>`;
    $('alist').querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{ const t=$('sk-'+b.dataset.sk); t.hidden=!t.hidden; });
    $('alist').querySelectorAll('[data-pw]').forEach(b=>b.onclick=async()=>{ const p=gen(); try{ await callAdmin({action:'password', user_id:b.dataset.pw, password:p}); showOverlay(`<h3 id="ovl-t">كلمة السر الجديدة</h3><div class="big-b" dir="ltr">${p}</div><p class="setup">ابعتها للمتدرب. مش هتظهر تاني.</p><button class="btn" data-act="ok">تمام</button>`); }catch(e){ toast(e.message); } });
    $('alist').querySelectorAll('[data-act]').forEach(b=>b.onclick=async()=>{ try{ await callAdmin({action:'active', user_id:b.dataset.act, active:b.dataset.on==='1'}); loadList(); }catch(e){ toast(e.message); } });
    $('alist').querySelectorAll('[data-unlock]').forEach(b=>b.onclick=async()=>{ const {error}=await sb.rpc('admin_set_unlock',{p_user:b.dataset.unlock, p_on:b.dataset.on==='1'}); if(error) toast(error.message); loadList(); });
    $('alist').querySelectorAll('[data-prog]').forEach(b=>b.onclick=()=>{
      const r=data.find(x=>x.id===b.dataset.prog), st=r.state||{}, q=st.quiz||{}, rd=st.read||{};
      const opts=M.map((m,i)=>{ const sc=q[m.id], seen=(rd[m.id]||0)>0;
        const tag = sc!=null ? (sc>=70?`✓ ${toAr(sc)}٪`:`${toAr(sc)}٪`) : (seen?'بدأه':'لسه');
        return `<option value="${i}">مستوى ${toAr(i+1)}: ${esc(m.title)} (${tag})</option>`; }).join('');
      showOverlay(`<h3 id="ovl-t">إعادة الكورس: ${esc(r.full_name)}</h3>
        <div class="rp">
         <label class="rp-o"><input type="radio" name="rpm" value="all" checked> الكورس كله من الأول</label>
         <label class="rp-o"><input type="radio" name="rpm" value="from"> من مستوى معيّن واللي بعده</label>
         <label class="rp-o"><input type="radio" name="rpm" value="one"> مستوى واحد بس</label>
         <select id="rp-mod" class="inp">${opts}</select>
         <label class="rp-o"><input type="checkbox" id="rp-fin"${r.started_at?'':' disabled'}> امسح كمان الاختبار النهائي والشهادة${r.started_at?'':' (لسه مدخلوش)'}</label>
         <p class="setup">بيتمسح للمستوى: الدروس اللي قراها، المواقف، ودرجة الكويز. المستويات اللي بعد مستوى ممسوح بتتقفل لحد ما يعدّيه تاني.</p>
        </div>
        <button class="btn" data-act="yes">امسح</button><button class="btn ghost" data-act="no">إلغاء</button>`, async a=>{
        if(a!=='yes') return;
        const mode=(document.querySelector('input[name=rpm]:checked')||{}).value, i=+$('rp-mod').value, fin=$('rp-fin').checked;
        const mods = mode==='all' ? null : (mode==='from' ? M.slice(i).map(m=>m.id) : [M[i].id]);
        const {error}=await sb.rpc('admin_reset_progress',{p_user:r.id, p_mods:mods, p_final:fin});
        if(error) return toast(error.message);
        toast(mode==='all' ? 'اتعمل إعادة للكورس كله' : (mode==='from' ? `اتعمل إعادة من مستوى ${toAr(i+1)}` : `اتعمل إعادة لمستوى ${toAr(i+1)}`));
        loadList();
      });
      const sel=$('rp-mod'), sync=()=>{ sel.disabled = document.querySelector('input[name=rpm]:checked').value==='all'; };
      document.querySelectorAll('input[name=rpm]').forEach(x=>x.onchange=sync); sync();
    });
    $('alist').querySelectorAll('[data-reset]').forEach(b=>b.onclick=()=>showOverlay(`<h3 id="ovl-t">إعادة الاختبار النهائي؟</h3><p class="setup">هيتمسح الاختبار ونتيجته والشهادة، والمتدرب ياخد محاولة جديدة.</p><button class="btn" data-act="yes">أيوه، امسح</button><button class="btn ghost" data-act="no">لأ</button>`, async a=>{ if(a!=='yes') return; const {error}=await sb.rpc('admin_reset_final',{p_user:b.dataset.reset}); if(error) toast(error.message); else toast('اتمسح الاختبار النهائي'); loadList(); }));
  }
  loadList();
}

boot();

