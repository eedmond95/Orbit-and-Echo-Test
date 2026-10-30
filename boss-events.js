/* Orbit & Echo — Boss Invasion expansion. Loaded after the original game script.
   Keeps the existing orbital gameplay, collectibles, pilots, and leaderboard intact. */
(() => {
  'use strict';
  if (typeof startMinigame !== 'function' || typeof updateMinigame !== 'function' ||
      typeof renderMinigame !== 'function' || typeof exitMinigame !== 'function') return;

  const previousStart = startGame;
  const previousEnter = startMinigame;
  const previousExit = exitMinigame;
  const previousUpdate = updateMinigame;
  const previousRender = renderMinigame;

  const bosses = [
    {name:'RIFT HYDRA', tag:'SERPENT OF THE FRACTURE', hue:'#fb487b',
     tip:'DODGE THE SWEEPING RIFT • AUTO FIRE', brief:'Lyra: Its sweep has a warning. Slip past it!'},
    {name:'PRISM WARDEN', tag:'THE MIRROR SENTINEL', hue:'#7b8cff',
     tip:'WAIT FOR THE OPEN CORE • TAP FOR PULSE', brief:'Lyra: Its mirrors shut! Shoot when the core glows!'},
    {name:'NULL REAPER', tag:'THE PHANTOM HUNTER', hue:'#bf64ff',
     tip:'TRACK THE REAL REAPER • EVADE THE CLONES', brief:'Lyra: Ignore the echoes. Watch the real one!'},
    {name:'STARFORGE TITAN', tag:'THE SIEGE MACHINE', hue:'#ffb33e',
     tip:'DODGE MARKED LANES • HIT THE LIT VENT', brief:'Lyra: Its cannons mark the floor. MOVE!'}
  ];
  let clearedMiniGames = 0;
  let defeatedBosses = 0;

  startGame = function() {
    clearedMiniGames = 0;
    defeatedBosses = 0;
    return previousStart.apply(this, arguments);
  };

  startMinigame = function(gate) {
    if (gate.bossPending && !gate.bossCleared) return beginBoss(gate);
    const result = previousEnter.apply(this, arguments);
    // Keep the first sectors welcoming, then increase the pressure.
    if (mg && gate.level >= 8) mg.shields = gate.level >= 18 ? 1 : 2;
    return result;
  };

  exitMinigame = function(won) {
    if (!mg || mg.type === 'boss') return previousExit.apply(this, arguments);
    const gate = mg.gate;
    if (won && !gate.invasionCounted) {
      gate.invasionCounted = true;
      clearedMiniGames++;
    }
    if (won && clearedMiniGames > 0 && clearedMiniGames % 2 === 0 && !gate.bossCleared) {
      gate.bossPending = true;
      return beginBoss(gate);
    }
    return previousExit.apply(this, arguments);
  };

  updateMinigame = function() {
    if (mg && mg.type === 'boss') return updateBoss();
    const before = mg;
    const result = previousUpdate.apply(this, arguments);
    if (!mg || before !== mg || mg.phase !== 'play') return result;
    const extra = Math.max(0, mg.gate.level - 2);
    if (!extra) return result;
    if (mg.type === 'strike') {
      mg.spawnCd = Math.min(mg.spawnCd, Math.max(9, 36 - extra * 1.7));
      if (mg.t % Math.max(95, 240 - extra * 12) === 0) {
        addFan(mg.fx + 25 + Math.random() * (mg.fw - 50), -12,
               mg.ship.x, mg.ship.y, 2 + Math.min(extra, 15) * 0.12, extra >= 6 ? 3 : 1, 0.2);
      }
    } else if (mg.type === 'invaders') {
      mg.enemyFireCd = Math.min(mg.enemyFireCd, Math.max(12, 50 - extra * 2));
    } else if (mg.type === 'breaker' && mg.paddle) {
      mg.paddle.w = Math.max(56, mg.paddle.w - Math.min(extra * 0.012, 0.12));
    }
    return result;
  };

  renderMinigame = function() {
    if (mg && mg.type === 'boss') return renderBoss();
    return previousRender.apply(this, arguments);
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function eventBeep(freq) {
    try { sfx.playTone(freq, 'sawtooth', 0.13, 0.16); } catch (e) {}
  }
  function beginBoss(gate) {
    clearCheer();
    isHolding = false;
    const index = defeatedBosses % bosses.length;
    const kind = Math.max(0, index);
    const def = bosses[kind];
    const fw = Math.min(width, 560);
    const fx = (width - fw) / 2;
    const maxHp = Math.round(190 + 43 * gate.level + Math.max(0, defeatedBosses - 3) * 70);
    mg = {
      gate, game: {name:def.name, brief:def.brief, hint:def.tip}, type:'boss', tint:gate.tint,
      phase:'warning', t:0, time:3300,
      fx, fw, ship:{x:width/2,y:height-105}, target:{x:width/2,y:height-105},
      shields:3, invuln:0, hitFlash:0, tapped:false, fireCd:0, bullets:[],
      enemyBullets:[], enemies:[], drops:[], particles:[], camY:0,
      boss: {
        type:kind, def, hp:maxHp, maxHp, x:width/2, y:clamp(height * 0.23, 118, 190),
        radius:kind === 3 ? 62 : 47, t:0, attackCd:110, meter:20,
        exposed:true, beat:0, hazards:[], prizes:[], flash:0, pulseFx:0, ragePhase:1, phaseFlash:0, nearMissCd:0,
        safeLane:0, weakIndex:0, lastX:width/2, afterimage:0, projectilesFired:0
      }
    };
    gameState = 'MINIGAME';
    document.getElementById('hud').classList.add('opacity-0');
    document.getElementById('hudLives').classList.add('opacity-0');
    novaBtn.classList.add('hidden');
    cutin = null;
    mgComms = null;
    sfx.playRiser();
    eventBeep(180);
    glitchTimer = 75;
    screenShake = 15;
    try { window.navigator.vibrate && window.navigator.vibrate([80,65,140]); } catch(e) {}
  }

  function addFan(x,y,tx,ty,speed,n,spread) {
    const a = Math.atan2(ty-y, tx-x);
    for (let i=0;i<n;i++) {
      const ang=a+(i-(n-1)/2)*spread;
      mg.enemyBullets.push({x,y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,r:5});
    }
  }
  function addRing(x,y,n,speed,offset) {
    for (let i=0;i<n;i++) {
      const a=offset+i*Math.PI*2/n;
      mg.enemyBullets.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:4.5});
    }
  }
  function markLane(x,w,delay,active) {
    mg.boss.hazards.push({x,w,delay,active,age:0});
  }
  function bossHit() {
    if (!mg || mg.type!=='boss' || mg.phase!=='play' || mg.invuln>0) return;
    mg.shields--;
    mg.invuln=92;
    mg.hitFlash=38;
    screenShake=19;
    sfx.playLifeLost();
    mgBurst(mg.ship.x,mg.ship.y,'#ff3e7b',18);
    if (mg.shields<=0) endBoss(false);
    else pilotSay('Hull damage! '+mg.shields+' shields remaining!', {priority:2});
  }
  function firePulse() {
    if (mg.phase!=='play' || mg.boss.meter<100) return;
    const b=mg.boss;
    b.meter=0;
    b.pulseFx=52;
    b.flash=20;
    b.hp=Math.max(0,b.hp-b.maxHp*0.155);
    mg.enemyBullets.length=0;
    b.hazards.length=0;
    mg.invuln=Math.max(mg.invuln,50);
    mgBurst(mg.ship.x,mg.ship.y,'#80faff',38);
    mgBurst(b.x,b.y,b.def.hue,28);
    screenShake=18;
    sfx.playExplosion();
    pilotSay('HYPER PULSE! Shields purged!',{priority:3});
    if(b.hp<=0) endBoss(true);
  }
  window.addEventListener('keydown',e=>{
    if (mg && mg.type==='boss' && (e.code==='KeyE' || e.code==='Space') && !e.repeat) {
      e.preventDefault(); mg.tapped=true;
    }
  });

  function tickBossAttacks() {
    const b=mg.boss, kind=b.type;
    const hard=(1+Math.min(2.65,mg.gate.level*0.075 + defeatedBosses*0.035))*(b.ragePhase===3?1.33:b.ragePhase===2?1.15:1);
    const sp=(2.45+Math.min(4.4,mg.gate.level*0.17 + defeatedBosses*0.06))*(b.ragePhase===3?1.17:1);
    if (--b.attackCd>0) return;
    b.attackCd=Math.max(38,Math.round((kind===3 ? 133 : 111)/hard));
    if (kind===0) {
      addFan(b.x,b.y+22,mg.ship.x,mg.ship.y,sp, b.hp<b.maxHp*.5 ? 7 : 5,0.21);
      if (b.t%3===0 || b.hp<b.maxHp*.5)
        markLane(clamp(mg.ship.x+Math.sin(b.t)*38,mg.fx+28,mg.fx+mg.fw-28),
                 43,48,31);
    } else if(kind===1) {
      addRing(b.x,b.y, b.hp<b.maxHp*.5?16:12, sp*.82, b.t*.08);
      if (b.t%2===0) markLane(clamp(b.x,mg.fx+25,mg.fx+mg.fw-25),34,48,25);
    } else if(kind===2) {
      b.lastX=b.x;
      b.afterimage=65;
      addFan(b.x,b.y,mg.ship.x,mg.ship.y,sp*1.22,7,0.12);
      if(b.hp<b.maxHp*.65)
        addFan(clamp(b.x+100,mg.fx+15,mg.fx+mg.fw-15),b.y+30,mg.ship.x,mg.ship.y,sp,3,0.2);
      b.beat+=2;
    } else {
      const laneW=mg.fw/3;
      b.safeLane=(b.safeLane+1+Math.floor(Math.random()*2))%3;
      for(let i=0;i<3;i++)
        if(i!==b.safeLane) markLane(mg.fx+(i+.5)*laneW,laneW-8,58,38);
      addFan(b.x,b.y,mg.ship.x,mg.ship.y,sp*.82,3,0.18);
    }
    if (mg.enemyBullets.length>180) mg.enemyBullets.splice(0,mg.enemyBullets.length-180);
  }

  function endBoss(won) {
    if(!mg || mg.type!=='boss' || mg.phase!=='play') return;
    mg.phase=won?'victory':'defeat';
    mg.t=0;
    mg.enemyBullets=[];
    mg.boss.hazards=[];
    screenShake=won?20:17;
    if(won) {
      sfx.playLevelUp();
      mgBurst(mg.boss.x,mg.boss.y,mg.boss.def.hue,65);
      pilotSay('Target destroyed! Stellar work!',{priority:3});
    } else {
      sfx.playExplosion();
      pilotSay('Pull back! We can challenge it again!',{priority:3});
    }
  }

  function finishBoss() {
    const won=mg.phase==='victory', gate=mg.gate;
    if (won) {
      gate.bossCleared=true;
      gate.bossPending=false;
      defeatedBosses++;
      const points=gate.level*850 + Math.ceil(mg.time/60)*20;
      const reward=Math.min(15,3+Math.floor(gate.level/2));
      score+=points;
      gems+=reward;
      runGems+=reward;
      missionStat('score',Math.floor(score),true);
      missionStat('pulses',runGems,true);
      previousExit(true);
      showBanner('BOSS DEFEATED','+'+points+' PTS  •  +'+reward+' GEMS','text-yellow-300 neon-text-cyan','Lyra: That is how you clear a sector!');
      return;
    }
    gate.bossPending=true;
    previousExit(false);
  }

  function updateBoss() {
    const m=mg,b=m.boss;
    m.t++;
    m.camY-=1.8;
    if (m.phase==='warning') {
      if(m.t%28===0) eventBeep(m.t%56===0?190:310);
      if(m.t>=156) {
        m.phase='play';m.t=0;
        eventBeep(570);
        pilotSay(b.def.brief,{priority:3});
      }
      return;
    }
    if (m.phase!=='play') {
      if(m.t>=112) finishBoss();
      for(const p of m.particles) p.update();
      m.particles=m.particles.filter(p=>p.life>0);
      return;
    }
    b.t++;
    m.time--;
    if(m.time<=0) {endBoss(false);return;}
    const diff=1+Math.min(1.75,m.gate.level*.065);
    const kx=(mgKeys.ArrowRight||mgKeys.KeyD?1:0)-(mgKeys.ArrowLeft||mgKeys.KeyA?1:0);
    const ky=(mgKeys.ArrowDown||mgKeys.KeyS?1:0)-(mgKeys.ArrowUp||mgKeys.KeyW?1:0);
    m.target.x+=kx*8;
    m.target.y+=ky*8;
    m.target.x=clamp(m.target.x,m.fx+22,m.fx+m.fw-22);
    m.target.y=clamp(m.target.y,height*.38,height-40);
    m.ship.x+=(m.target.x-m.ship.x)*.27;
    m.ship.y+=(m.target.y-m.ship.y)*.27;
    if(m.invuln>0)m.invuln--;
    if(m.hitFlash>0)m.hitFlash--;
    if(b.flash>0)b.flash--;
    if(b.phaseFlash>0)b.phaseFlash--;
    if(b.nearMissCd>0)b.nearMissCd--;
    const nextPhase=b.hp<=b.maxHp*.30?3:b.hp<=b.maxHp*.65?2:1;
    if(nextPhase>b.ragePhase){
      b.ragePhase=nextPhase;b.phaseFlash=105;b.attackCd=Math.max(b.attackCd,72);
      screenShake=19;eventBeep(nextPhase===3?125:210);
      mgBurst(b.x,b.y,b.def.hue,34);
      pilotSay(nextPhase===3?'DANGER! '+b.def.name+' IS ENRAGED!':'Its attack pattern is changing!',{priority:3});
    }
    if(b.pulseFx>0)b.pulseFx--;
    b.meter=Math.min(100,b.meter+.055);
    if(m.tapped)firePulse();
    m.tapped=false;

    // Telegraphs can always be dodged. Avoid opaque instant-hit attacks.
    b.lastX=b.x;
    const swing=Math.sin(b.t*(b.type===2?.025:.011))*m.fw*(b.type===0?.29:.21);
    b.x=clamp(m.fx+m.fw/2+swing,m.fx+68,m.fx+m.fw-68);
    b.y=clamp(height*.22,115,190)+Math.sin(b.t*.023)*14;
    b.exposed=b.type!==1 || (b.t%150>=53 && b.t%150<116);
    b.weakIndex=Math.floor(b.t/125)%3;

    // Auto-aim protects one-thumb accessibility; precision still matters when dodging.
    if(--m.fireCd<=0) {
      m.fireCd=Math.max(6,Math.round(10-Math.min(3,m.gate.level*.12)));
      const wx=b.type===3?b.x+(b.weakIndex-1)*34:b.x;
      const wy=b.type===3?b.y+16:b.y;
      for(const off of [-7,7]) {
        const dx=wx-m.ship.x+off,dy=wy-m.ship.y;
        const mag=Math.hypot(dx,dy)||1;
        m.bullets.push({x:m.ship.x+off,y:m.ship.y-14,vx:dx/mag*13,vy:dy/mag*13,damage:1.6+m.gate.level*.065});
      }
    }
    for(const bullet of m.bullets) {
      bullet.x+=bullet.vx;bullet.y+=bullet.vy;
      const wx=b.type===3?b.x+(b.weakIndex-1)*34:b.x;
      const wy=b.type===3?b.y+16:b.y;
      if(Math.hypot(bullet.x-wx,bullet.y-wy)<(b.type===3?24:b.radius)) {
        bullet.dead=true;
        if(b.exposed) {
          b.hp-=bullet.damage;
          b.meter=Math.min(100,b.meter+1.35);
          if(b.nearMissCd<=0 && b.t%22===0){b.nearMissCd=16; if(b.hp<b.maxHp*.3)screenShake=Math.max(screenShake,3);}
          b.flash=4;
          if(b.t%9===0)mgBurst(bullet.x,bullet.y,b.def.hue,2);
        } else if(b.t%12===0)mgBurst(bullet.x,bullet.y,'#8ea5ff',3);
      }
    }
    m.bullets=m.bullets.filter(p=>!p.dead&&p.y>-30&&p.x>m.fx-20&&p.x<m.fx+m.fw+20);
    if(b.hp<=0){endBoss(true);return;}

    tickBossAttacks();
    for(const e of m.enemyBullets) {
      e.x+=e.vx; e.y+=e.vy;
      if(Math.hypot(e.x-m.ship.x,e.y-m.ship.y)<(e.r||5)+11) {
        e.dead=true; bossHit();
      }
    }
    m.enemyBullets=m.enemyBullets.filter(e=>!e.dead&&e.y<height+30&&e.y>-30&&e.x>m.fx-35&&e.x<m.fx+m.fw+35);
    for(const lane of b.hazards) {
      lane.age++;
      if(lane.age>=lane.delay && lane.age<lane.delay+lane.active &&
         Math.abs(m.ship.x-lane.x)<lane.w/2+8) bossHit();
    }
    b.hazards=b.hazards.filter(lane=>lane.age<lane.delay+lane.active);
    if(b.t%660===0) b.prizes.push({x:m.fx+40+Math.random()*(m.fw-80),y:b.y+35,r:12});
    for(const p of b.prizes) {
      p.y+=2.35;
      if(Math.hypot(p.x-m.ship.x,p.y-m.ship.y)<28) {
        p.dead=true;
        if(m.shields<3){m.shields++;sfx.playPowerUp();}
        else {b.meter=Math.min(100,b.meter+30);sfx.playGem();}
        mgBurst(p.x,p.y,'#80ffbc',18);
        pilotSay('Repair spark acquired!',{priority:2});
      }
    }
    b.prizes=b.prizes.filter(p=>!p.dead&&p.y<height+30);
    for(const p of m.particles)p.update();
    m.particles=m.particles.filter(p=>p.life>0);
    if(mgComms&&++mgComms.t>130)mgComms=null;
  }

  function polygon(x,y,r,n,spin) {
    ctx.beginPath();
    for(let i=0;i<n;i++){
      const a=spin+i*Math.PI*2/n;
      const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();
  }
  function drawBossShape(b) {
    const x=b.x,y=b.y,k=b.type,c=b.def.hue;
    ctx.save();
    ctx.shadowColor=c;ctx.shadowBlur=20;
    ctx.strokeStyle=c;ctx.lineWidth=3;
    ctx.fillStyle='#131024';
    if(k===0){
      for(let i=6;i>=0;i--) {
        const t=b.t-i*12, sx=x+Math.sin(t*.032)*i*11, sy=y+i*13;
        ctx.globalAlpha=1-i*.09;
        polygon(sx,sy,clamp(28-i*2,10,25),6,t*.02);
        ctx.fill();ctx.stroke();
      }
      ctx.globalAlpha=1;
      polygon(x,y,48,6,Math.PI/6);ctx.fill();ctx.stroke();
      ctx.fillStyle='#ff4a78';
      ctx.fillRect(x-22,y-5,13,8);ctx.fillRect(x+9,y-5,13,8);
      ctx.strokeStyle='#ffccdd';
      ctx.beginPath();ctx.moveTo(x-16,y+22);ctx.lineTo(x,y+32);ctx.lineTo(x+16,y+22);ctx.stroke();
    } else if(k===1){
      ctx.rotate(0);
      for(let i=0;i<4;i++){
        const a=b.t*.023+i*Math.PI/2;
        ctx.save();ctx.translate(x+Math.cos(a)*69,y+Math.sin(a)*69);ctx.rotate(a);
        polygon(0,0,14,4,Math.PI/4);ctx.fill();ctx.stroke();ctx.restore();
      }
      polygon(x,y,52,8,b.t*.009);ctx.fill();ctx.stroke();
      polygon(x,y,34,6,-b.t*.018);ctx.stroke();
      ctx.fillStyle=b.exposed?'#d5fff4':'#465172';
      ctx.shadowColor=b.exposed?'#8fffff':'#2d3252';
      ctx.beginPath();ctx.arc(x,y,b.exposed?16:11,0,Math.PI*2);ctx.fill();
      if(!b.exposed){ctx.strokeStyle='#99b4ff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(x,y,47,-.3,Math.PI*1.3);ctx.stroke();}
    } else if(k===2){
      if(b.afterimage>0) {
        ctx.globalAlpha=b.afterimage/135;
        for(const off of [-115,115]){
          polygon(clamp(x+off,mg.fx+38,mg.fx+mg.fw-38),y+8,37,5,b.t*.014);ctx.fill();ctx.stroke();
        }
        b.afterimage--;
        ctx.globalAlpha=1;
      }
      ctx.beginPath();
      ctx.moveTo(x,y-56);ctx.quadraticCurveTo(x-96,y-34,x-88,y+57);
      ctx.quadraticCurveTo(x-46,y+10,x-23,y+28);
      ctx.lineTo(x+23,y+28);
      ctx.quadraticCurveTo(x+46,y+10,x+88,y+57);
      ctx.quadraticCurveTo(x+96,y-34,x,y-56);
      ctx.closePath();ctx.fill();ctx.stroke();
      polygon(x,y,34,5,-Math.PI/2);ctx.fillStyle='#29103d';ctx.fill();ctx.stroke();
      ctx.fillStyle='#f4aaff';ctx.beginPath();ctx.arc(x-12,y-4,5,0,7);ctx.arc(x+12,y-4,5,0,7);ctx.fill();
    } else {
      ctx.fillStyle='#281b22';
      ctx.fillRect(x-57,y-26,114,70);
      ctx.strokeRect(x-57,y-26,114,70);
      ctx.fillRect(x-68,y-42,28,68);ctx.strokeRect(x-68,y-42,28,68);
      ctx.fillRect(x+40,y-42,28,68);ctx.strokeRect(x+40,y-42,28,68);
      polygon(x,y+5,50,6,Math.PI/6);ctx.fill();ctx.stroke();
      for(let i=-1;i<=1;i++) {
        ctx.fillStyle=b.weakIndex===i+1?'#fff5ab':'#5b3434';
        ctx.shadowColor='#ffb33e';
        ctx.fillRect(x+i*34-10,y+6,20,20);
        ctx.strokeRect(x+i*34-10,y+6,20,20);
      }
    }
    if(b.flash>0){ctx.globalAlpha=.22;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,b.radius+22,0,7);ctx.fill();}
    ctx.restore();
  }

  // Vector-only hostile silhouettes: sharp armor, malicious eyes, animated scars.
  // No images or downloads; scales crisply on phones and desktop.
  function drawEvilDetails(b, silhouette=false) {
    const x=b.x, y=b.y, t=b.t, k=b.type;
    ctx.save();
    ctx.translate(x,y);
    ctx.shadowColor=b.ragePhase===3?'#ff174c':b.def.hue;
    ctx.shadowBlur=b.ragePhase===3?36:19;
    ctx.lineJoin='round';
    ctx.strokeStyle=b.ragePhase===3?'#ff476d':b.def.hue;
    ctx.fillStyle='#0b0716';
    ctx.lineWidth=3;
    const horn=(sx,sy,dir,scale=1)=>{
      ctx.beginPath();ctx.moveTo(sx,sy);
      ctx.lineTo(sx+dir*18*scale,sy-24*scale);
      ctx.lineTo(sx+dir*9*scale,sy-46*scale);
      ctx.lineTo(sx-dir*4*scale,sy-27*scale);
      ctx.closePath();ctx.fill();ctx.stroke();
    };
    if(k===0){
      // Hydra: crown spines, multiple jaws and a pulsing third eye.
      for(const dir of [-1,1]){
        horn(dir*29,-17,dir,1.23);
        horn(dir*18,-28,dir,.75);
        ctx.beginPath();ctx.moveTo(dir*13,10);ctx.lineTo(dir*37,25);ctx.lineTo(dir*19,32);
        ctx.lineTo(dir*6,20);ctx.closePath();ctx.fill();ctx.stroke();
      }
      ctx.fillStyle='#ff1749';ctx.beginPath();ctx.ellipse(0,-10,5+Math.sin(t*.15)*2,9,0,0,7);ctx.fill();
      ctx.strokeStyle='#ffbdc9';ctx.lineWidth=2;
      for(const dir of [-1,1]){ctx.beginPath();ctx.moveTo(dir*15,25);ctx.lineTo(dir*13,36);ctx.lineTo(dir*5,27);ctx.stroke();}
    }else if(k===1){
      // Warden: broken black halo, blade shards and a hostile iris.
      for(let i=0;i<7;i++){
        const a=t*.008+i*Math.PI*2/7, r=79+Math.sin(t*.06+i)*5;
        ctx.save();ctx.translate(Math.cos(a)*r,Math.sin(a)*r);ctx.rotate(a);
        ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(9,2);ctx.lineTo(0,25);ctx.lineTo(-9,2);
        ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
      }
      horn(-24,-30,-1,.72);horn(24,-30,1,.72);
      ctx.strokeStyle=b.exposed?'#ffb7ed':'#ff3565';
      ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,24,b.exposed?15:4,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#ff365d';ctx.beginPath();ctx.arc(0,0,b.exposed?7:4,0,7);ctx.fill();
    }else if(k===2){
      // Reaper: horned skull, jagged cloak, scythe and glowing eyes.
      horn(-30,-25,-1,1.4);horn(30,-25,1,1.4);
      ctx.fillStyle='#090713';
      ctx.beginPath();ctx.moveTo(-32,20);ctx.lineTo(-80,74);ctx.lineTo(-43,55);
      ctx.lineTo(-24,88);ctx.lineTo(0,58);ctx.lineTo(27,91);ctx.lineTo(43,55);
      ctx.lineTo(83,74);ctx.lineTo(34,20);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#ff397e';
      for(const dir of [-1,1]){ctx.beginPath();ctx.moveTo(dir*4,-10);ctx.lineTo(dir*27,-16);ctx.lineTo(dir*17,-2);ctx.closePath();ctx.fill();}
      ctx.strokeStyle='#e39bff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(69,70);ctx.lineTo(95,-55);ctx.stroke();
      ctx.lineWidth=7;ctx.beginPath();ctx.arc(98,-49,31,-2.3,.5);ctx.stroke();
    }else{
      // Titan: armored devil-face, shoulder cannons and molten teeth.
      for(const dir of [-1,1]){
        horn(dir*41,-38,dir,1.3);
        ctx.fillStyle='#0e0b10';ctx.fillRect(dir*50-13,-29,26,29);ctx.strokeRect(dir*50-13,-29,26,29);
        ctx.fillStyle='#ff392d';ctx.fillRect(dir*50-6,-28,12,17);
        ctx.beginPath();ctx.moveTo(dir*42,8);ctx.lineTo(dir*20,0);ctx.lineTo(dir*16,17);ctx.closePath();ctx.fill();
      }
      ctx.fillStyle='#ff3c25';ctx.beginPath();ctx.moveTo(-26,-11);ctx.lineTo(-6,-5);ctx.lineTo(-17,4);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(26,-11);ctx.lineTo(6,-5);ctx.lineTo(17,4);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#ffcb73';ctx.lineWidth=3;
      for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*9-3,29);ctx.lineTo(i*9,39);ctx.stroke();}
    }
    if(b.ragePhase>=2 && !silhouette){
      ctx.strokeStyle=b.ragePhase===3?'#ff2657':b.def.hue;
      ctx.globalAlpha=.35+.25*Math.sin(t*.11);
      ctx.lineWidth=2;
      for(let i=0;i<3;i++){
        const a=t*.042+i*Math.PI*2/3;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*54,Math.sin(a)*54);
        ctx.lineTo(Math.cos(a+.15)*74,Math.sin(a+.15)*74);ctx.stroke();
      }
    }
    ctx.restore();
  }

  function hudText(str,x,y,max,size,color,align) {
    ctx.textAlign=align||'left';ctx.textBaseline='middle';ctx.fillStyle=color;
    fillFitText(str,x,y,max,size,800);
  }
  function renderBoss() {
    const m=mg,b=m.boss,def=b.def;
    starfield.render(ctx,m.camY);
    ctx.save();
    ctx.fillStyle='rgba(12,6,24,.35)';ctx.fillRect(m.fx,0,m.fw,height);
    ctx.strokeStyle=def.hue;ctx.globalAlpha=.42;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(m.fx+2,0);ctx.lineTo(m.fx+2,height);ctx.moveTo(m.fx+m.fw-2,0);ctx.lineTo(m.fx+m.fw-2,height);ctx.stroke();
    ctx.globalAlpha=1;
    if(m.phase!=='warning') {
      for(const h of b.hazards) {
        const active=h.age>=h.delay;
        const opacity=active?.52:.13+.25*(.5+.5*Math.sin(h.age*.22));
        ctx.fillStyle=active?'rgba(255,54,100,'+opacity+')':'rgba(255,90,90,'+opacity+')';
        ctx.fillRect(h.x-h.w/2,0,h.w,height);
        ctx.strokeStyle=active?'#fffbfa':'#ff4860';
        ctx.lineWidth=active?3:1;
        ctx.strokeRect(h.x-h.w/2,0,h.w,height);
      }
      drawBossShape(b);
      drawEvilDetails(b);
      for(const bullet of m.bullets) {
        ctx.fillStyle='#8bffff';ctx.shadowColor='#8bffff';ctx.shadowBlur=9;
        ctx.beginPath();ctx.arc(bullet.x,bullet.y,3.7,0,7);ctx.fill();
      }
      ctx.shadowBlur=10;ctx.fillStyle='#ff577e';ctx.shadowColor='#ff3d68';
      for(const bullet of m.enemyBullets) {
        ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.r||4.5,0,7);ctx.fill();
      }
      ctx.shadowBlur=13;
      for(const p of b.prizes) {
        ctx.fillStyle='#8bffb6';ctx.shadowColor='#71ffd1';
        polygon(p.x,p.y,p.r,4,Math.PI/4);ctx.fill();
        hudText('+',p.x,p.y,16,12,'#082e2c','center');
      }
      m.particles.forEach(p=>p.render(ctx,0));
      if(m.invuln<=0||Math.floor(m.invuln/6)%2!==0) drawShip(m.ship.x,m.ship.y,getActiveSkin());
      if(b.pulseFx>0) {
        const progress=1-b.pulseFx/52;
        ctx.strokeStyle='#abffff';ctx.shadowColor='#abffff';ctx.shadowBlur=28;ctx.lineWidth=9*(1-progress)+1;
        ctx.globalAlpha=1-progress;
        ctx.beginPath();ctx.arc(m.ship.x,m.ship.y,Math.hypot(width,height)*progress,0,7);ctx.stroke();ctx.globalAlpha=1;
      }
      ctx.shadowBlur=0;
      // Boss life bar and unique mechanic
      hudText((b.ragePhase===3?'☠ ENRAGED • ':b.ragePhase===2?'⚠ PHASE II • ':'BOSS • ')+def.name,15,21,width-104,12,b.ragePhase===3?'#ff768c':'#ffffff');
      drawPilotBadge(width-34,33,16,m.hitFlash>0?'#ff3969':getActivePilot().color);
      ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(15,40,width-30,12);
      ctx.fillStyle=def.hue;ctx.fillRect(15,40,(width-30)*clamp(b.hp/b.maxHp,0,1),12);
      hudText(Math.max(0,Math.ceil(b.hp/b.maxHp*100))+'%   '+(b.type===1?(b.exposed?'CORE OPEN':'SHIELD ACTIVE'):b.type===3?'HIT THE GLOWING VENT':'TARGET LOCKED'),15,61,width-30,10,'#f1f5f9');
      hudText('♥'.repeat(Math.max(0,m.shields))+'♡'.repeat(3-Math.max(0,m.shields)),15,84,width*.55,20,'#ff669b');
      hudText(Math.ceil(m.time/60)+'s',width-15,85,60,17,'#f5d7ff','right');
      const meterW=Math.min(width-30,270),mx=(width-meterW)/2;
      ctx.fillStyle='rgba(255,255,255,.17)';ctx.fillRect(mx,height-27,meterW,9);
      ctx.fillStyle=b.meter>=100?'#ffffff':'#64eaff';ctx.fillRect(mx,height-27,meterW*b.meter/100,9);
      hudText(b.meter>=100?'PULSE READY • TAP / SPACE':'PULSE CHARGING '+Math.floor(b.meter)+'%',width/2,height-40,width-20,10,b.meter>=100?'#ffffff':'#9feaff','center');
      if(b.phaseFlash>0){
        ctx.save();ctx.globalAlpha=Math.min(.8,b.phaseFlash/80);ctx.fillStyle='rgba(185,8,40,.13)';ctx.fillRect(0,0,width,height);
        hudText(b.ragePhase===3?'FINAL PHASE — RAMPAGE':'PHASE II — THREAT ESCALATING',width/2,height*.33,width-22,Math.min(20,width*.055),'#ff93ae','center');ctx.restore();
      }
      if(mgComms&&m.phase==='play') hudText(getActivePilot().name+' ▸ '+mgComms.text,width/2,108,width-32,11,'#dfbcff','center');
    }
    if(m.phase==='warning') {
      ctx.fillStyle='rgba(8,0,13,.88)';ctx.fillRect(0,0,width,height);
      const beat=Math.sin(m.t*.19)>.0;
      ctx.save();ctx.globalAlpha=.19+.14*Math.sin(m.t*.13);drawEvilDetails(b,true);ctx.restore();
      ctx.fillStyle=beat?'rgba(255,35,65,.22)':'rgba(255,35,65,.07)';
      ctx.fillRect(0,0,width,height);
      for(let y=0;y<height;y+=18) {
        ctx.fillStyle='rgba(255,82,105,.08)';ctx.fillRect(0,y,width,2);
      }
      ctx.strokeStyle='#ff4362';ctx.lineWidth=5;ctx.shadowColor='#ff2244';ctx.shadowBlur=32;
      polygon(width/2,height*.27,47,3,-Math.PI/2);ctx.stroke();
      hudText('!',width/2,height*.29,62,48,'#ffffff','center');
      ctx.shadowBlur=25;
      hudText('WARNING',width/2,height*.43,width-24,Math.min(65,width*.14),beat?'#ffffff':'#ff4c68','center');
      ctx.shadowBlur=0;
      hudText('HOSTILE SIGNATURE DETECTED',width/2,height*.49,width-25,12,'#ffbdc8','center');
      hudText(def.name,width/2,height*.57,width-24,31,'#ffffff','center');
      hudText(def.tag,width/2,height*.615,width-24,11,def.hue,'center');
      hudText(def.tip,width/2,height*.71,width-30,11,'#f7d8ee','center');
      hudText('LYRA ▸ '+def.brief.replace('Lyra: ',''),width/2,height*.78,width-22,11,'#d5b2ff','center');
      ctx.fillStyle='#ff3558';ctx.fillRect(0,height-7,width*m.t/156,7);
    } else if(m.phase==='victory'||m.phase==='defeat') {
      const won=m.phase==='victory';
      ctx.fillStyle='rgba(8,3,14,.7)';ctx.fillRect(0,0,width,height);
      hudText(won?'BOSS DESTROYED':'MISSION FAILED',width/2,height*.43,width-26,42,won?'#93ffdd':'#ff718d','center');
      hudText(won?'SECTOR UNLOCKED • BONUS REWARDS':'SHIELD LOST • RETRY THE BOSS',width/2,height*.51,width-26,12,'#ffffff','center');
      drawPilotBadge(width/2,height*.35,28,won?'#96ffe2':'#ff4d86');
    }
    ctx.restore();
  }
  // A tiny debug hook supports automated tests without exposing gameplay controls.
  window.ORBIT_BOSS_VERSION='1.2';
})();