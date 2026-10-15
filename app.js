(() => {
'use strict';
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
const mini=document.getElementById('minimap'),mctx=mini.getContext('2d');
const W=canvas.width,H=canvas.height, WORLD_W=3000,WORLD_H=2200;
const keys=Object.create(null);
const cars=[
{name:'NOVA GT',color:'#21a9d1',max:5.8,acc:.13,turn:.052,width:30,length:53},
{name:'VORTEX R',color:'#e34255',max:7.1,acc:.16,turn:.058,width:29,length:55},
{name:'ROYAL S',color:'#d7a84c',max:5.3,acc:.105,turn:.043,width:34,length:58},
{name:'VIPER X',color:'#36b77b',max:7.7,acc:.17,turn:.061,width:28,length:51},
{name:'GHOST LIMO',color:'#dce4e9',max:4.8,acc:.09,turn:.037,width:36,length:70}
];
let carIndex=0,car={x:1500,y:1100,a:0,speed:0,damage:0},playing=false,paused=false,last=0,toastTime=0,toastText='',distance=0,missionDone=false,showMap=false,city=[],buildings=[],traffic=[],particles=[],wanted=0,shake=0;
const roadW=132,blockW=260,blockH=220;
function makeCity(){
  buildings=[];city=[];
  for(let x=150;x<WORLD_W-100;x+=blockW+roadW){
    for(let y=120;y<WORLD_H-100;y+=blockH+roadW){
      const bw=blockW*(.58+Math.random()*.34),bh=blockH*(.58+Math.random()*.34);
      buildings.push({x:x+Math.random()*30,y:y+Math.random()*25,w:bw,h:bh,c:['#1b2b36','#26323b','#303641','#20343b','#34343b'][Math.floor(Math.random()*5)],roof:Math.random()});
    }
  }
  // Park and plaza accents
  city.push({x:570,y:350,w:340,h:250,type:'park'},{x:2130,y:1400,w:400,h:300,type:'park'},{x:1330,y:700,w:270,h:210,type:'plaza'});
  traffic=[];
  for(let i=0;i<26;i++){
    const horizontal=Math.random()<.5;
    traffic.push({x:200+Math.random()*(WORLD_W-400),y:200+Math.random()*(WORLD_H-400),a:horizontal?(Math.random()<.5?0:Math.PI):(Math.random()<.5?Math.PI/2:-Math.PI/2),speed:1.1+Math.random()*1.2,color:['#cbd3d8','#e6b75d','#a94d5b','#5f879a','#d8d8d8'][i%5],horizontal});
  }
}
function roadAt(x,y){
  const rx=((x%(blockW+roadW))+(blockW+roadW))%(blockW+roadW);
  const ry=((y%(blockH+roadW))+(blockH+roadW))%(blockH+roadW);
  return rx>=blockW||ry>=blockH;
}
function toast(t){toastText=t;toastTime=2.5;const el=document.getElementById('toast');el.textContent=t;el.classList.add('show');}
function chooseCar(i){carIndex=(i+cars.length)%cars.length;const c=cars[carIndex];document.querySelectorAll('.car-option').forEach((b,j)=>b.classList.toggle('active',j===carIndex));document.getElementById('vehicleName').textContent=c.name;toast(c.name+' انتخاب شد');}
function reset(){car={x:1500,y:1100,a:0,speed:0,damage:0};distance=0;missionDone=false;wanted=0;updateUI();}
function start(){playing=true;paused=false;document.getElementById('startScreen').classList.add('hidden');document.getElementById('pauseScreen').classList.add('hidden');document.querySelector('.viewport').classList.toggle('touch-mode',window.matchMedia('(pointer:coarse)').matches);toast('به شهر سن شَدو خوش آمدی!');last=performance.now();}
function pause(){if(!playing)return;paused=!paused;document.getElementById('pauseScreen').classList.toggle('hidden',!paused);if(!paused){last=performance.now();requestAnimationFrame(loop);}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function update(dt){
 const c=cars[carIndex];const oldX=car.x,oldY=car.y;
 const forward=keys.w||keys.W||keys.ArrowUp,back=keys.s||keys.S||keys.ArrowDown,left=keys.a||keys.A||keys.ArrowLeft,right=keys.d||keys.D||keys.ArrowRight,brake=keys.Space;
 if(forward)car.speed+=c.acc;else if(back)car.speed-=c.acc*.78;else car.speed*=.986;
 if(brake)car.speed*=.91;
 car.speed=clamp(car.speed,-c.max*.38,c.max);
 const turn=(left?-1:0)+(right?1:0);
 if(Math.abs(car.speed)>.08)car.a+=turn*c.turn*(car.speed<0?-1:1)*Math.min(1,Math.abs(car.speed)/2);
 let nx=car.x+Math.cos(car.a)*car.speed*60*dt,ny=car.y+Math.sin(car.a)*car.speed*60*dt;
 // Buildings are solid: avoid driving through a building footprint.
 const hit=buildings.some(b=>nx>b.x-18&&nx<b.x+b.w+18&&ny>b.y-18&&ny<b.y+b.h+18);
 if(hit){car.speed*=-.25;car.damage=clamp(car.damage+.7,0,100);shake=5;if(car.damage>30&&Math.random()<.02)toast('خودرو آسیب دیده؛ تعمیرش کن!');}
 else {car.x=clamp(nx,40,WORLD_W-40);car.y=clamp(ny,40,WORLD_H-40);}
 distance+=Math.hypot(car.x-oldX,car.y-oldY);
 if(distance>=500&&!missionDone){missionDone=true;toast('چالش گشت شهری کامل شد!');}
 for(const t of traffic){t.x+=Math.cos(t.a)*t.speed*60*dt;t.y+=Math.sin(t.a)*t.speed*60*dt;if(t.x<50)t.x=WORLD_W-50;if(t.x>WORLD_W-50)t.x=50;if(t.y<50)t.y=WORLD_H-50;if(t.y>WORLD_H-50)t.y=50;}
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)document.getElementById('toast').classList.remove('show');}
 shake=Math.max(0,shake-dt*12);
 updateUI();
}
function updateUI(){
 const c=cars[carIndex];document.getElementById('speed').textContent=String(Math.round(Math.abs(car.speed)*42)).padStart(3,'0');
 document.getElementById('vehicleName').textContent=c.name;
 document.getElementById('distanceBar').style.width=Math.min(100,distance/5)+'%';
 document.getElementById('distanceText').textContent=Math.min(500,Math.floor(distance))+' / 500 m';
 document.getElementById('missionHud').textContent=missionDone?'گشت کامل شد':'گشت آزاد';
 document.querySelectorAll('#wanted span').forEach((s,i)=>s.classList.toggle('active',i<wanted));
}
function drawCar(g,x,y,a,c,scale=1){
 g.save();g.translate(x,y);g.rotate(a);g.scale(scale,scale);
 g.fillStyle='#05090c99';g.beginPath();g.ellipse(2,4,c.length*.55,c.width*.8,0,0,Math.PI*2);g.fill();
 g.fillStyle=c.color;roundRect(g,-c.length/2,-c.width/2,c.length,c.width,7);g.fill();
 g.fillStyle='#101c27';roundRect(g,-c.length*.12,-c.width*.38,c.length*.34,c.width*.76,5);g.fill();
 g.fillStyle='#9fd8e7';g.globalAlpha=.72;g.fillRect(-c.length*.09,-c.width*.34,c.length*.11,c.width*.68);g.globalAlpha=1;
 g.fillStyle='#f9f0d3';g.fillRect(c.length*.36,-c.width*.32,4,6);g.fillRect(c.length*.36,c.width*.14,4,6);
 g.fillStyle='#ff354f';g.fillRect(-c.length*.45,-c.width*.32,4,6);g.fillRect(-c.length*.45,c.width*.14,4,6);
 g.fillStyle='#080d12';g.fillRect(-c.length*.25,-c.width*.57,c.length*.23,4);g.fillRect(c.length*.1,-c.width*.57,c.length*.23,4);g.fillRect(-c.length*.25,c.width*.42,c.length*.23,4);g.fillRect(c.length*.1,c.width*.42,c.length*.23,4);
 g.restore();
}
function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function drawWorld(){
 const c=cars[carIndex];ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 ctx.fillStyle='#182b2b';ctx.fillRect(0,0,W,H);
 const camX=clamp(car.x-W/2,0,WORLD_W-W),camY=clamp(car.y-H/2,0,WORLD_H-H);
 ctx.translate(-camX,-camY);
 // Grass/ground
 ctx.fillStyle='#203b35';ctx.fillRect(camX,camY,W,H);
 // road grid
 const stepX=blockW+roadW,stepY=blockH+roadW;
 ctx.fillStyle='#353d43';
 for(let x=Math.floor(camX/stepX)*stepX;x<camX+W+stepX;x+=stepX)ctx.fillRect(x,camY-10,roadW,WORLD_H+20);
 for(let y=Math.floor(camY/stepY)*stepY;y<camY+H+stepY;y+=stepY)ctx.fillRect(camX-10,y,WORLD_W+20,roadW);
 // Sidewalks and road markings
 ctx.fillStyle='#59605f';
 for(let x=Math.floor(camX/stepX)*stepX;x<camX+W+stepX;x+=stepX){ctx.fillRect(x-6,camY-10,6,WORLD_H+20);ctx.fillRect(x+roadW,camY-10,6,WORLD_H+20);}
 for(let y=Math.floor(camY/stepY)*stepY;y<camY+H+stepY;y+=stepY){ctx.fillRect(camX-10,y-6,WORLD_W+20,6);ctx.fillRect(camX-10,y+roadW,WORLD_W+20,6);}
 ctx.strokeStyle='#d0b97888';ctx.lineWidth=2;ctx.setLineDash([17,19]);
 for(let x=Math.floor(camX/stepX)*stepX;x<camX+W+stepX;x+=stepX){ctx.beginPath();ctx.moveTo(x+roadW/2,camY);ctx.lineTo(x+roadW/2,camY+H);ctx.stroke();}
 for(let y=Math.floor(camY/stepY)*stepY;y<camY+H+stepY;y+=stepY){ctx.beginPath();ctx.moveTo(camX,y+roadW/2);ctx.lineTo(camX+W,y+roadW/2);ctx.stroke();}
 ctx.setLineDash([]);
 // decorative park patches
 for(const p of city){ctx.fillStyle=p.type==='park'?'#2b5948':'#495451';ctx.fillRect(p.x,p.y,p.w,p.h);if(p.type==='park'){for(let i=0;i<12;i++){let tx=p.x+15+(i*47)%Math.max(30,p.w-30),ty=p.y+20+(i*31)%Math.max(30,p.h-30);ctx.fillStyle='#39765b';ctx.beginPath();ctx.arc(tx,ty,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#244737';ctx.fillRect(tx-2,ty+4,4,8);}}}
 for(const b of buildings){if(b.x+b.w<camX-20||b.x>camX+W+20||b.y+b.h<camY-20||b.y>camY+H+20)continue;
  ctx.fillStyle='#11191d99';ctx.fillRect(b.x+8,b.y+10,b.w,b.h);ctx.fillStyle=b.c;ctx.fillRect(b.x,b.y,b.w,b.h);
  ctx.fillStyle='#ffffff10';ctx.fillRect(b.x+7,b.y+7,b.w-14,5);ctx.fillStyle='#0a1217';ctx.fillRect(b.x+13,b.y+13,b.w-26,b.h-26);
  ctx.fillStyle='#4c6470';for(let wx=b.x+20;wx<b.x+b.w-10;wx+=25){ctx.fillRect(wx,b.y+20,9,5);ctx.fillRect(wx,b.y+b.h-26,9,5);}
  ctx.fillStyle='#18242b';ctx.fillRect(b.x+b.w*.25,b.y+b.h*.35,b.w*.5,b.h*.3);
 }
 // traffic cars
 for(const t of traffic){if(t.x<camX-50||t.x>camX+W+50||t.y<camY-50||t.y>camY+H+50)continue;drawCar(ctx,t.x,t.y,t.a,{...cars[0],color:t.color,width:19,length:34},.72);}
 // player car
 drawCar(ctx,car.x,car.y,car.a,c,1);
 // world boundaries
 ctx.restore();
}
function drawMinimap(){
 const w=mini.width,h=mini.height; mctx.fillStyle='#0a1418';mctx.fillRect(0,0,w,h);
 const sx=w/WORLD_W,sy=h/WORLD_H;
 mctx.fillStyle='#596367';
 for(let x=0;x<WORLD_W;x+=blockW+roadW)mctx.fillRect(x*sx,0,roadW*sx,h);
 for(let y=0;y<WORLD_H;y+=blockH+roadW)mctx.fillRect(0,y*sy,w,roadW*sy);
 mctx.fillStyle='#263c36';for(const p of city)if(p.type==='park')mctx.fillRect(p.x*sx,p.y*sy,p.w*sx,p.h*sy);
 mctx.fillStyle='#26313b';for(const b of buildings)mctx.fillRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy);
 mctx.fillStyle='#ffcc6c';mctx.beginPath();mctx.arc(1500*sx,1100*sy,3,0,Math.PI*2);mctx.fill();
 mctx.fillStyle='#58e1db';mctx.beginPath();mctx.arc(car.x*sx,car.y*sy,4,0,Math.PI*2);mctx.fill();
 mctx.strokeStyle='#58e1db';mctx.lineWidth=2;mctx.beginPath();mctx.moveTo(car.x*sx,car.y*sy);mctx.lineTo((car.x+Math.cos(car.a)*20)*sx,(car.y+Math.sin(car.a)*20)*sy);mctx.stroke();
}
function render(){drawWorld();drawMinimap();}
function loop(now){if(!playing||paused)return;const dt=Math.min(.04,(now-last)/1000||.016);last=now;update(dt);render();requestAnimationFrame(loop);}
document.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key]=true;if((e.key==='e'||e.key==='E')&&playing)chooseCar(carIndex+1);if((e.key==='m'||e.key==='M')&&playing){showMap=!showMap;document.querySelector('.minimap-wrap').style.transform=showMap?'scale(1.45)':'scale(1)';}if(e.key==='Escape')pause();});
document.addEventListener('keyup',e=>keys[e.key]=false);
document.querySelectorAll('[data-car]').forEach(b=>b.addEventListener('click',()=>chooseCar(Number(b.dataset.car))));
document.getElementById('playBtn').addEventListener('click',()=>{start();requestAnimationFrame(loop);});
document.getElementById('pauseBtn').addEventListener('click',pause);
document.getElementById('resumeBtn').addEventListener('click',pause);
document.getElementById('nextCar').addEventListener('click',()=>chooseCar(carIndex+1));
document.getElementById('touchCar').addEventListener('click',()=>chooseCar(carIndex+1));
document.getElementById('repairBtn').addEventListener('click',()=>{car.damage=0;car.speed=0;toast('خودرو تعمیر شد؛ هزینه: $0');});
document.querySelectorAll('[data-key]').forEach(b=>{
 const key=b.dataset.key;
 const down=e=>{e.preventDefault();keys[key]=true;};
 const up=e=>{e.preventDefault();keys[key]=false;};
 b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);
});
makeCity();reset();render();
})();