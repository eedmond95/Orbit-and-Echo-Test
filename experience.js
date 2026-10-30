/* Orbit & Echo — Replay and polish expansion. Non-invasive enhancement layer. */
(()=>{
'use strict';
if(window.ORBIT_EXPERIENCE_VERSION)return;
window.ORBIT_EXPERIENCE_VERSION='2.0';
const doc=document, root=doc.body;
const style=doc.createElement('style');
style.textContent=`
#orbit-experience-toggle{position:fixed;z-index:901;left:12px;bottom:calc(12px + env(safe-area-inset-bottom));border:1px solid #79e8ff77;border-radius:24px;color:#e5fbff;background:#091326dc;backdrop-filter:blur(14px);font:700 11px/1.2 system-ui;padding:10px 13px;box-shadow:0 4px 23px #0008;cursor:pointer;touch-action:manipulation}
#orbit-experience-toggle:active{transform:scale(.95)}
#orbit-experience-panel{position:fixed;z-index:9998;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:#020611d9;backdrop-filter:blur(12px);font-family:system-ui;color:#e8f8ff}
#orbit-experience-panel.open{display:flex}
#orbit-experience-card{width:min(100%,420px);max-height:min(85vh,730px);overflow:auto;border:1px solid #6be9ff66;border-radius:24px;background:linear-gradient(154deg,#14213d,#0c1025 55%,#160f2c);box-shadow:0 0 65px #6c59ff33;padding:23px;box-sizing:border-box}
#orbit-experience-card h2{margin:0 0 8px;font-size:25px;letter-spacing:1px;background:linear-gradient(90deg,#75f6ff,#dfa7ff);background-clip:text;-webkit-background-clip:text;color:transparent}
#orbit-experience-card p{color:#afc2d9;line-height:1.5;font-size:13px}
.orbit-exp-row{display:flex;align-items:center;justify-content:space-between;gap:14px;border-top:1px solid #93baff24;padding:13px 0;font-size:13px}
.orbit-exp-row b{color:#a1ecff}
.orbit-exp-button{border:1px solid #8ceaff77;border-radius:13px;background:linear-gradient(135deg,#243e67,#282147);color:white;font:800 13px system-ui;padding:11px 15px;cursor:pointer;touch-action:manipulation}
.orbit-exp-button.primary{background:linear-gradient(110deg,#218ba8,#6651c8)}
.orbit-exp-progress{height:7px;border-radius:9px;background:#ffffff18;overflow:hidden;margin-top:7px}
.orbit-exp-progress>div{height:100%;width:0;background:linear-gradient(90deg,#59f9ff,#da78ff);transition:width .35s}
#orbit-exp-toast{position:fixed;z-index:960;top:calc(78px + env(safe-area-inset-top));left:50%;transform:translate(-50%,-20px);width:max-content;max-width:88vw;box-sizing:border-box;padding:12px 19px;border:1px solid #98fff5a0;border-radius:16px;background:linear-gradient(115deg,#081a2cf5,#26143af5);color:#f1feff;text-align:center;font:800 13px system-ui;box-shadow:0 0 35px #79fff944;opacity:0;pointer-events:none;transition:opacity .2s,transform .25s}
#orbit-exp-toast.visible{opacity:1;transform:translate(-50%,0)}
#orbit-exp-fx{position:fixed;inset:0;z-index:850;pointer-events:none}
@media(max-width:450px){#orbit-experience-toggle{font-size:10px;padding:9px 11px}#orbit-experience-card{padding:18px}}
@media(prefers-reduced-motion:reduce){#orbit-exp-toast,.orbit-exp-progress>div{transition:none}}
`;
doc.head.appendChild(style);
const storageKey='orbit-echo-experience-v1';
let saved={};
try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{}}catch(_){}
const data={best:Number(saved.best)||0,runs:Number(saved.runs)||0,sector:Number(saved.sector)||0,scoreMilestones:Array.isArray(saved.scoreMilestones)?saved.scoreMilestones:[],daily:saved.daily||'',dailyBest:Number(saved.dailyBest)||0,bossWins:Number(saved.bossWins)||0,
 claimed:(saved.claimed&&typeof saved.claimed==='object'&&!Array.isArray(saved.claimed))?saved.claimed:{},stardust:Number(saved.stardust)||0,selectedTrail:String(saved.selectedTrail||'standard')};
const rewards=[
 {id:'first',name:'First Flight',needed:()=>data.runs>0,prize:'100 stardust + Azure Trail',dust:100,trail:'azure'},
 {id:'rising',name:'Rising Star',needed:()=>data.best>=5000,prize:'250 stardust + Solar Trail',dust:250,trail:'solar'},
 {id:'master',name:'Orbit Master',needed:()=>data.best>=15000,prize:'500 stardust + Nebula Trail',dust:500,trail:'nebula'},
 {id:'legend',name:'Cosmic Legend',needed:()=>data.best>=50000,prize:'1,000 stardust + Royal Trail',dust:1000,trail:'royal'},
 {id:'daily',name:'Daily Ace',needed:()=>data.dailyBest>=dailyGoal(),prize:'150 stardust (daily)',dust:150,trail:null}
];
function dailyGoal(){return 3000+(Number(dateKey().replaceAll('-',''))%5)*1000}
function claimId(reward){return reward.id==='daily'?'daily:'+dateKey():reward.id}
function dustBalance(){return data.stardust}
function ownTrail(id){return id==='standard'||rewards.some(r=>r.trail===id&&!!data.claimed[r.id])}
function claimReward(id){
 const reward=rewards.find(r=>r.id===id);
 if(!reward||!reward.needed()||data.claimed[claimId(reward)])return false;
 data.claimed[claimId(reward)]=true;
 data.stardust+=reward.dust;
 if(reward.trail)data.selectedTrail=reward.trail;
 persist();notify('REWARD CLAIMED',reward.prize,true);panel();return true;
}
function selectedColor(){return {azure:'#80faff',solar:'#ffdc65',nebula:'#cd80ff',royal:'#ff7b9b'}[data.selectedTrail]||null}
function claimableCount(){return rewards.filter(r=>r.needed()&&!data.claimed[claimId(r)]).length}

const dateKey=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
if(data.daily!==dateKey()){data.daily=dateKey();data.dailyBest=0}
const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(data))}catch(_){}};
const el=(tag,id)=>{const node=doc.createElement(tag);if(id)node.id=id;return node};
const toggle=el('button','orbit-experience-toggle');toggle.type='button';toggle.textContent='✦ MISSIONS';toggle.setAttribute('aria-label','View missions and achievements');root.appendChild(toggle);
const backdrop=el('div','orbit-experience-panel'),card=el('section','orbit-experience-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','Orbit and Echo missions');
backdrop.appendChild(card);root.appendChild(backdrop);
const toast=el('div','orbit-exp-toast');toast.setAttribute('role','status');root.appendChild(toast);
const canvas=el('canvas','orbit-exp-fx');root.appendChild(canvas);const fx=canvas.getContext('2d');
let particles=[],ticker=0,toastTimer=0,roundActive=false,roundTop=0,previousState='',lastLevel=0,lastBossState='',lastMilestone=0;
const reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function rand(x){return Math.random()*x}
function sparkles(n=42){
 if(reduced||!fx)return;
 const w=canvas.width=innerWidth*Math.min(devicePixelRatio||1,2),h=canvas.height=innerHeight*Math.min(devicePixelRatio||1,2);
 const scale=w/innerWidth;
 for(let i=0;i<n;i++)particles.push({x:w*.5+(rand(130)-65)*scale,y:h*.4,vx:(rand(11)-5.5)*scale,vy:(rand(4)-9)*scale,life:35+rand(40),size:2+rand(5),color:['#7bf6ff','#ff83d7','#ffe88a','#b493ff'][i%4]});
 if(!ticker)animate();
}
function animate(){
 ticker=0;if(!fx||!particles.length){fx&&fx.clearRect(0,0,canvas.width,canvas.height);return}
 fx.clearRect(0,0,canvas.width,canvas.height);
 for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.14;p.life--;fx.globalAlpha=Math.min(1,p.life/24);fx.fillStyle=p.color;fx.fillRect(p.x,p.y,p.size,p.size*1.6)}
 fx.globalAlpha=1;particles=particles.filter(p=>p.life>0);ticker=requestAnimationFrame(animate)
}
function notify(title,subtitle='',celebrate=false){
 clearTimeout(toastTimer);toast.textContent=title+(subtitle?'  ·  '+subtitle:'');toast.classList.add('visible');
 toastTimer=setTimeout(()=>toast.classList.remove('visible'),3200);
 if(celebrate)sparkles();
}
const close=()=>{backdrop.classList.remove('open');toggle.focus()};
const trailCanvas=el('canvas','orbit-reward-trail');trailCanvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:95';root.appendChild(trailCanvas);
const trailCtx=trailCanvas.getContext('2d');let trailFrame=0;
function drawTrail(){
 if(!trailCtx)return;
 if(data.selectedTrail==='standard'){trailCtx.clearRect(0,0,trailCanvas.width,trailCanvas.height);return;}
 const st=getState();if(!['PLAYING','GAME','PLAY','MINIGAME'].includes(st)){trailCtx.clearRect(0,0,trailCanvas.width,trailCanvas.height);return;}
 let ship=null;try{if(typeof mg!=='undefined'&&mg&&mg.ship)ship=mg.ship}catch(_){}
 if(!ship){trailCtx.clearRect(0,0,trailCanvas.width,trailCanvas.height);return;}
 const dpr=Math.min(devicePixelRatio||1,2), w=innerWidth,h=innerHeight;
 if(trailCanvas.width!==Math.round(w*dpr)||trailCanvas.height!==Math.round(h*dpr)){trailCanvas.width=Math.round(w*dpr);trailCanvas.height=Math.round(h*dpr)}
 trailCtx.clearRect(0,0,trailCanvas.width,trailCanvas.height);
 const x=ship.x*dpr,y=ship.y*dpr,color=selectedColor();
 if(!color)return;
 trailCtx.strokeStyle=color;trailCtx.shadowColor=color;trailCtx.shadowBlur=15*dpr;
 for(let i=0;i<5;i++){trailCtx.globalAlpha=.43-i*.075;trailCtx.lineWidth=(5-i*.7)*dpr;trailCtx.beginPath();trailCtx.arc(x,y+16*dpr+i*9*dpr,(7+i*3)*dpr,.15,Math.PI-.15);trailCtx.stroke()}
 trailCtx.globalAlpha=1;
}
setInterval(drawTrail,60);
function format(v){return Math.max(0,Math.floor(v)).toLocaleString()}
function getScore(){try{return typeof score==='number'&&Number.isFinite(score)?score:0}catch(_){return 0}}
function getLevel(){try{return typeof level==='number'?level:typeof currentLevel==='number'?currentLevel:typeof gateLevel==='number'?gateLevel:0}catch(_){return 0}}
function getState(){try{return typeof gameState!=='undefined'?String(gameState):''}catch(_){return ''}}
function panel(){
 const dailyTarget=dailyGoal();
 const progress=Math.min(100,Math.round(data.dailyBest/dailyTarget*100));
 const unlocks=rewards.map(r=>[r.name,r.needed()]);
 card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h2>✦ PILOT MISSIONS</h2><button type="button" class="orbit-exp-button" id="orbit-exp-close">✕</button></div>'+
 '<p>Every run counts. Beat your personal best, master the invasion, and share your high score.</p>'+
 '<div class="orbit-exp-row"><span>🏆 Personal best</span><b>'+format(data.best)+'</b></div>'+
 '<div class="orbit-exp-row"><span>🚀 Runs launched</span><b>'+format(data.runs)+'</b></div>'+
 '<div class="orbit-exp-row"><span>⭐ Highest sector</span><b>'+format(data.sector)+'</b></div>'+
 '<div class="orbit-exp-row"><span>🌠 Daily challenge<br><small style="color:#9baec6">Score '+format(dailyTarget)+' points today</small></span><b>'+format(data.dailyBest)+' / '+format(dailyTarget)+'</b></div>'+
 '<div class="orbit-exp-progress"><div style="width:'+progress+'%"></div></div>'+
 '<p style="margin-top:24px">ACHIEVEMENTS · '+unlocks.filter(a=>a[1]).length+'/'+unlocks.length+' unlocked · ✦ '+format(dustBalance())+' stardust collected</p>'+
 rewards.map(r=>{const done=!!data.claimed[claimId(r)],earned=r.needed();return '<div class="orbit-exp-row"><span>'+(earned?'✨':'🔒')+' <strong>'+r.name+'</strong><br><small style="color:#a9c3de">'+r.prize+'</small></span>'+(done?'<b>CLAIMED ✓</b>':earned?'<button class="orbit-exp-button primary orbit-claim" data-reward="'+r.id+'" type="button">CLAIM</button>':'<b>LOCKED</b>')+'</div>'}).join('')+
 '<p>Equip unlocked thruster trails (cosmetic reward)</p>'+
 '<div class="orbit-exp-row"><label for="orbit-trail-choice">Ship trail</label><select id="orbit-trail-choice" style="background:#171e3b;color:#fff;border:1px solid #7bdefc;border-radius:8px;padding:8px">'+[['standard','Standard'],['azure','Azure'],['solar','Solar'],['nebula','Nebula'],['royal','Royal']].filter(a=>ownTrail(a[0])).map(a=>'<option value="'+a[0]+'" '+(data.selectedTrail===a[0]?'selected':'')+'>'+a[1]+'</option>').join('')+'</select></div>'+
 '<div style="display:flex;gap:9px;margin-top:17px"><button class="orbit-exp-button primary" id="orbit-exp-share" type="button" style="flex:1">↗ SHARE SCORE</button><button class="orbit-exp-button" id="orbit-exp-play" type="button">PLAY ▶</button></div>'+
 '<p style="text-align:center;font-size:11px;margin:16px 0 0">Hold to orbit • Release to launch • Dodge closely to charge Hyper Pulse during bosses.</p>';
 card.querySelector('#orbit-exp-close').onclick=close;
 card.querySelectorAll('.orbit-claim').forEach(btn=>btn.onclick=()=>claimReward(btn.dataset.reward));
 card.querySelector('#orbit-trail-choice').onchange=e=>{const choice=e.target.value;if(ownTrail(choice)){data.selectedTrail=choice;persist();notify('SHIP TRAIL EQUIPPED',choice.toUpperCase())}};
 card.querySelector('#orbit-exp-play').onclick=close;
 card.querySelector('#orbit-exp-share').onclick=async()=>{
  const value='🚀 I scored '+format(data.best)+' in Orbit & Echo! Can you beat my score? https://eedmond95.github.io/Orbit-and-Echo-Test/';
  try{if(navigator.share)await navigator.share({title:'Orbit & Echo',text:value,url:'https://eedmond95.github.io/Orbit-and-Echo-Test/'});
  else if(navigator.clipboard){await navigator.clipboard.writeText(value);notify('CHALLENGE COPIED','Share it with your friends')}
  else notify('SHARE THIS SCORE',format(data.best))}catch(e){if(e.name!=='AbortError')notify('SHARE UNAVAILABLE')}
 };
}
toggle.onclick=()=>{panel();backdrop.classList.add('open')};
backdrop.addEventListener('pointerdown',e=>{if(e.target===backdrop)close()});
doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&backdrop.classList.contains('open'))close()});
function observe(){
 const st=getState(),s=getScore(),lv=getLevel();
 // A session starts when game state enters a play scene; track progress without modifying the engine.
 const playing=st==='PLAYING'||st==='GAME'||st==='PLAY'||st==='MINIGAME';
 if(playing&&!roundActive){roundActive=true;roundTop=s;data.runs++;persist()}
 if(roundActive){roundTop=Math.max(roundTop,s)}
 if(playing&&s>data.best){data.best=s;persist()}
 if(playing&&s>data.dailyBest){data.dailyBest=s}
 if(lv>data.sector&&lv<10000){data.sector=lv;persist();if(lv>2)notify('SECTOR '+lv+' REACHED','Keep the momentum!',true)}
 const marks=[1000,3000,5000,10000,20000,50000,100000];
 for(const m of marks)if(s>=m&&!data.scoreMilestones.includes(m)&&playing){data.scoreMilestones.push(m);lastMilestone=m;persist();notify('✦ '+format(m)+' POINTS','New milestone!',true)}
 const dailyGoal=3000+(Number(dateKey().replaceAll('-',''))%5)*1000;
 if(playing&&data.dailyBest>=dailyGoal&&!data.scoreMilestones.includes('daily:'+dateKey())){data.scoreMilestones.push('daily:'+dateKey());persist();notify('DAILY CHALLENGE COMPLETE','Brilliant flying!',true)}
 if(roundActive&&!playing&&previousState!==st){roundActive=false;persist()}
 const pending=claimableCount();toggle.textContent=pending?'✦ MISSIONS • '+pending+' REWARDS':'✦ MISSIONS';
 // Keep controls away from combat and preserve original game's pointer interactions.
 toggle.style.display=st==='MINIGAME'?'none':'block';
 if(!backdrop.classList.contains('open')&&st!==previousState&&st==='MENU')persist();
 previousState=st;
}
setInterval(observe,500);
addEventListener('pagehide',persist);
window.ORBIT_EXP_DEBUG={version:'2.0',refresh:panel,claim:claimReward};
})();