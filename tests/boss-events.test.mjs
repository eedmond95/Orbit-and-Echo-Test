import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup() {
  const result = {exits:[], banners:[], vibration:[]};
  const classes = {add(){},remove(){}};
  const ctx = {
    window: {navigator:{vibrate(v){result.vibration.push(v);}}, addEventListener(){}},
    document: {getElementById(){return {classList:classes};}},
    novaBtn:{classList:classes},
    width:390,height:780,level:1,gameState:'MENU',mg:null,mgKeys:{},
    score:0,gems:0,runGems:0,glitchTimer:0,screenShake:0,
    isHolding:false,cutin:null,mgComms:null,
    clearCheer(){},pilotSay(){},mgBurst(){},missionStat(){},
    showBanner(name){result.banners.push(name);},
    sfx:{
      playRiser(){},playTone(){},playLevelUp(){},playExplosion(){},
      playLifeLost(){},playPowerUp(){},playGem(){}
    },
    startGame(){this.gameState='PLAYING';},
    startMinigame(gate){
      ctx.gameState='MINIGAME';
      ctx.mg={gate,game:gate.game,type:gate.game.id,phase:'play',shields:3,
              spawnCd:50,enemyFireCd:50,t:1,fx:0,fw:390,
              enemyBullets:[],bullets:[],enemies:[],drops:[],particles:[]};
    },
    exitMinigame(won){
      result.exits.push(won);
      ctx.mg=null;
      ctx.gameState='PLAYING';
    },
    updateMinigame(){},renderMinigame(){},
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../boss-events.js',import.meta.url),'utf8'),ctx);
  return {ctx,result};
}
function gate(lv) {
  return {level:lv,tint:[150,100,240],
    game:{id:['strike','breaker','invaders'][(lv-1)%3],name:'TEST GAME'}};
}
function clearBoss(ctx) {
  for(let i=0;i<156;i++)ctx.updateMinigame();
  assert.equal(ctx.mg.phase,'play');
  ctx.mg.boss.hp=0;
  ctx.updateMinigame();
  assert.equal(ctx.mg.phase,'victory');
  for(let i=0;i<112;i++)ctx.updateMinigame();
}
test('preserves the existing mini-game and invades after every second completion',()=>{
  const {ctx,result}=setup();
  ctx.startGame();
  const first=gate(1),second=gate(2),third=gate(3),fourth=gate(4);
  ctx.startMinigame(first);ctx.exitMinigame(true);
  assert.deepEqual(result.exits,[true]);
  assert.equal(ctx.mg,null);
  ctx.startMinigame(second);ctx.exitMinigame(true);
  assert.equal(ctx.mg.type,'boss');
  assert.equal(ctx.mg.phase,'warning');
  assert.equal(ctx.mg.boss.def.name,'RIFT HYDRA');
  assert.deepEqual(result.exits,[true]);
  clearBoss(ctx);
  assert.equal(second.bossCleared,true);
  assert.equal(second.bossPending,false);
  assert.deepEqual(result.exits,[true,true]);
  assert.ok(ctx.score>0);
  assert.ok(ctx.gems>0);
  ctx.startMinigame(third);ctx.exitMinigame(true);
  ctx.startMinigame(fourth);ctx.exitMinigame(true);
  assert.equal(ctx.mg.type,'boss');
  assert.equal(ctx.mg.boss.def.name,'PRISM WARDEN');
});
test('boss failure preserves boss rematch and only exits as loss once',()=>{
  const {ctx,result}=setup();
  ctx.startGame();
  ctx.startMinigame(gate(1));ctx.exitMinigame(true);
  const second=gate(2);
  ctx.startMinigame(second);ctx.exitMinigame(true);
  for(let i=0;i<156;i++)ctx.updateMinigame();
  ctx.mg.shields=1;
  const ship=ctx.mg.ship;
  ctx.mg.enemyBullets.push({x:ship.x,y:ship.y,vx:0,vy:0,r:5});
  ctx.updateMinigame();
  assert.equal(ctx.mg.phase,'defeat');
  for(let i=0;i<112;i++)ctx.updateMinigame();
  assert.deepEqual(result.exits,[true,false]);
  assert.equal(second.bossPending,true);
  ctx.startMinigame(second);
  assert.equal(ctx.mg.type,'boss');
  assert.equal(ctx.mg.phase,'warning');
});
test('later mini-games scale their shields and spawn pressure',()=>{
  const {ctx}=setup();
  ctx.startGame();
  const difficult=gate(10);difficult.game.id='strike';
  ctx.startMinigame(difficult);
  assert.equal(ctx.mg.shields,2);
  ctx.updateMinigame();
  assert.ok(ctx.mg.spawnCd<50);
});
test('boss expansion is installed as a classic script in the entry loader',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/game-original\.html/);
  assert.match(html,/boss-events\.js/);
});