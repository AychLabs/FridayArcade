(function (global) {
  "use strict";

  class Technician {
    constructor(x, y) { this.x = x; this.y = y; this.radius = 17; this.speed = 205; this.facing = "down"; this.walk = 0; this.moving = false; this.reaction = null; this.reactionUntil = 0; }
    react(kind) { this.reaction = kind; this.reactionUntil = performance.now() + 900; }
    update(dt, keys, world) {
      let dx = 0; let dy = 0;
      if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
      this.moving = dx !== 0 || dy !== 0;
      if (!this.moving) return;
      const length = Math.hypot(dx, dy); dx /= length; dy /= length;
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? "right" : "left"; else this.facing = dy > 0 ? "down" : "up";
      const nx = this.x + dx * this.speed * dt; const ny = this.y + dy * this.speed * dt;
      if (!world.collides(nx, this.y, this.radius)) this.x = nx;
      if (!world.collides(this.x, ny, this.radius)) this.y = ny;
      this.walk += dt * 10;
    }
    draw(ctx, carrying) {
      if (this.reactionUntil < performance.now()) this.reaction = null;
      const celebrate = this.reaction === "success" ? -Math.abs(Math.sin(performance.now() / 90)) * 7 : 0;
      const bob = (this.moving ? Math.sin(this.walk) * 2 : 0) + celebrate;
      ctx.save(); ctx.translate(this.x, this.y + bob);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(0, 16, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
      const step = this.moving ? Math.sin(this.walk) * 5 : 0;
      ctx.strokeStyle = "#13213b"; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-7 + step, 18); ctx.moveTo(6, 8); ctx.lineTo(7 - step, 18); ctx.stroke();
      ctx.fillStyle = "#22cde4"; ctx.fillRect(-13, -10, 26, 24);
      ctx.fillStyle = "#eabf9a"; ctx.beginPath(); ctx.arc(0, -18, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#17243c"; ctx.fillRect(-10, -25, 20, 7);
      ctx.fillStyle = "#fff";
      const eyeX = this.facing === "left" ? -6 : this.facing === "right" ? 6 : 0;
      ctx.fillRect(eyeX - 3, -20, 3, 3); ctx.fillRect(eyeX + 2, -20, 3, 3);
      if (carrying === "HDMI Cable") {
        ctx.strokeStyle="#ffc95c";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-39,12,.2,Math.PI*1.8);ctx.stroke();ctx.fillStyle="#d9e5ea";ctx.fillRect(-16,-43,7,6);ctx.fillRect(9,-43,7,6);
      } else if (carrying === "RAM Module") {
        ctx.fillStyle="#55d890";ctx.strokeStyle="#c2ffe1";ctx.lineWidth=2;ctx.fillRect(-17,-44,34,10);ctx.strokeRect(-17,-44,34,10);ctx.fillStyle="#19362a";[-10,-2,6].forEach(x=>ctx.fillRect(x,-42,6,6));ctx.fillStyle="#edcf66";for(let x=-14;x<15;x+=5)ctx.fillRect(x,-34,3,3);
      } else if (carrying) {
        ctx.fillStyle="#d85d50";ctx.strokeStyle="#ffd0c8";ctx.lineWidth=2;ctx.fillRect(-15,-45,30,13);ctx.strokeRect(-15,-45,30,13);
      }
      if(this.reaction === "failure"){ctx.fillStyle="#ffcf56";ctx.font="bold 22px sans-serif";ctx.textAlign="center";ctx.fillText("?",20,-27);ctx.strokeStyle="#eabf9a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-13,-4);ctx.lineTo(-22,-12);ctx.moveTo(13,-4);ctx.lineTo(22,-12);ctx.stroke();}
      ctx.restore();
    }
  }

  class LegacyCustomer {
    constructor() { this.x = 925; this.y = 548; this.targetX = 765; this.targetY = 475; this.state = "arriving"; this.bounce = 0; this.reactionUntil = 0; this.message = ""; }
    update(dt) {
      if (this.state !== "arriving") return;
      const dx = this.targetX - this.x; const dy = this.targetY - this.y; const distance = Math.hypot(dx, dy);
      if (distance < 3) { this.x = this.targetX; this.y = this.targetY; this.state = "waiting"; return; }
      this.x += dx / distance * 90 * dt; this.y += dy / distance * 90 * dt; this.bounce += dt * 8;
    }
    celebrate() { this.state = "celebrating"; this.bounce = 0; this.message = "That's it!"; }
    worry(message) { this.state = "worried"; this.reactionUntil = performance.now() + 1300; this.message = message || "Still not right?"; }
    draw(ctx, name, active, patience) {
      if(this.state === "worried" && this.reactionUntil < performance.now()){this.state="waiting";this.message="";}
      const pace=this.state==="worried"?Math.sin(performance.now()/120)*5:0;
      const hop = this.state === "celebrating" ? Math.abs(Math.sin(this.bounce)) * -12 : (this.state === "arriving" ? Math.sin(this.bounce) * 1.5 : 0);
      if (this.state === "celebrating") this.bounce += .09;
      ctx.save(); ctx.translate(this.x + pace, this.y + hop);
      if(active){ctx.strokeStyle="#8ef7ff";ctx.lineWidth=3;ctx.shadowColor="#52eaf5";ctx.shadowBlur=14;ctx.beginPath();ctx.arc(0,-5,25,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#8ef7ff";ctx.beginPath();ctx.moveTo(-6,-48);ctx.lineTo(6,-48);ctx.lineTo(0,-40);ctx.fill();}
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(0, 17 - hop, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8d6bff"; ctx.fillRect(-12, -8, 24, 25); ctx.fillStyle = "#d99b72"; ctx.beginPath(); ctx.arc(0, -17, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3a2134"; ctx.beginPath(); ctx.arc(0, -21, 10, Math.PI, Math.PI * 2); ctx.fill();
      if (this.state === "waiting" || this.state === "celebrating") { ctx.fillStyle = this.state === "celebrating" ? "#55efa9" : "#ffcf56"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText(this.state === "celebrating" ? "♥" : "!", 0, -37); }
      if(this.state==="celebrating"){ctx.fillStyle="#effff7";ctx.strokeStyle="#55efa9";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-34,-65,68,19,7);ctx.fill();ctx.stroke();ctx.fillStyle="#18362b";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.fillText(this.message,0,-52);}
      if(this.state==="worried"){ctx.fillStyle="#f5fbff";ctx.strokeStyle="#7690a0";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-50,-57,100,22,7);ctx.fill();ctx.stroke();ctx.fillStyle="#17232c";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.fillText(this.message,0,-43);ctx.fillStyle="#f5fbff";ctx.beginPath();ctx.moveTo(-5,-35);ctx.lineTo(4,-35);ctx.lineTo(0,-29);ctx.fill();}
      ctx.fillStyle = "#eaf7ff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.fillText(name || "Customer", 0, 34);
      if (patience !== null && patience !== undefined) { const value=Math.max(0,Math.round(patience));ctx.fillStyle="#07121b";ctx.fillRect(-34,39,68,16);ctx.strokeStyle="#8aa5b4";ctx.lineWidth=1;ctx.strokeRect(-34,39,68,16);ctx.fillStyle="#eaf7ff";ctx.font="bold 8px sans-serif";ctx.fillText(`Patience ${value}%`,0,50); }
      ctx.restore();
    }
  }
  class Customer {
    constructor(){this.x=925;this.y=568;this.state="entering";this.bounce=0;this.message="";this.messageFor=0;this.waitFor=0;this.path=[];this.onArrival=null;this.setPath([{x:925,y:520},{x:965,y:475},{x:765,y:475}],"entering",()=>{this.state="waitingAtCounter";});}
    setPath(points,state,onArrival){this.path=points.map(p=>({x:p.x,y:p.y}));this.state=state;this.onArrival=onArrival||null;}
    goToWaiting(position){this.setPath([{x:965,y:475},{x:965,y:250},{x:position.x,y:240},{x:position.x,y:position.y}],"walkingToWaitingRoom",()=>{this.state="waitingForRepair";this.waitFor=7;});}
    returnForPickup(){this.message="It's ready!";this.messageFor=1.8;this.setPath([{x:940,y:240},{x:965,y:475},{x:765,y:475}],"returningForPickup",()=>{this.state="pickup";});}
    leave(){this.message="Thanks!";this.messageFor=1.5;this.setPath([{x:965,y:475},{x:965,y:540},{x:925,y:580}],"leaving",()=>{this.state="gone";});}
    celebrate(){this.message="That's it!";this.messageFor=2;this.bounce=0;}
    worry(message){this.message=message||"Still not right?";this.messageFor=1.3;}
    update(dt){this.messageFor=Math.max(0,this.messageFor-dt);if(!this.messageFor)this.message="";if(this.state==="waitingForRepair"){this.bounce+=dt*2;this.waitFor-=dt;if(this.waitFor<=0){const comments=["I hope my files are okay...","Maybe I should have backed that up.","That toolbar seemed useful."];this.message=comments[Math.floor(this.bounce)%comments.length];this.messageFor=2.4;this.waitFor=12+Math.floor(this.bounce)%6;}return;}if(!this.path.length)return;const target=this.path[0],dx=target.x-this.x,dy=target.y-this.y,distance=Math.hypot(dx,dy);if(distance<3){this.x=target.x;this.y=target.y;this.path.shift();if(!this.path.length&&this.onArrival){const done=this.onArrival;this.onArrival=null;done();}return;}this.x+=dx/distance*90*dt;this.y+=dy/distance*90*dt;this.bounce+=dt*8;}
    draw(ctx,name,active,patience){if(this.state==="gone")return;const walking=this.path.length>0,seated=this.state==="waitingForRepair",hop=walking?Math.sin(this.bounce)*1.5:seated?Math.sin(this.bounce)*.8:0;ctx.save();ctx.translate(this.x,this.y+hop);if(active){ctx.strokeStyle="#8ef7ff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-5,25,0,Math.PI*2);ctx.stroke();}ctx.fillStyle="rgba(0,0,0,.3)";ctx.beginPath();ctx.ellipse(0,17-hop,15,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#8d6bff";ctx.fillRect(-12,-8,24,seated?20:25);ctx.fillStyle="#d99b72";ctx.beginPath();ctx.arc(0,-17,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#3a2134";ctx.beginPath();ctx.arc(0,-21,10,Math.PI,Math.PI*2);ctx.fill();if(this.state==="waitingAtCounter"){ctx.fillStyle="#ffcf56";ctx.font="bold 18px sans-serif";ctx.textAlign="center";ctx.fillText("!",0,-37);}if(this.message){const width=Math.min(150,Math.max(72,this.message.length*4.8));ctx.fillStyle="#f5fbff";ctx.strokeStyle="#7690a0";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-width/2,-62,width,22,7);ctx.fill();ctx.stroke();ctx.fillStyle="#17232c";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.fillText(this.message,0,-48);}ctx.fillStyle="#eaf7ff";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText(name||"Customer",0,34);if(patience!==null&&patience!==undefined){const value=Math.max(0,Math.round(patience));ctx.fillStyle="#07121b";ctx.fillRect(-34,39,68,16);ctx.strokeStyle="#8aa5b4";ctx.strokeRect(-34,39,68,16);ctx.fillStyle="#eaf7ff";ctx.font="bold 8px sans-serif";ctx.fillText(`Patience ${value}%`,0,50);}ctx.restore();}
  }
  global.RepairEntities = Object.freeze({ Technician, Customer });
}(window));
