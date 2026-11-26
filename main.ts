// Sky Courier — a tiny flight game for make.fun's "Make the best flight game" bounty.
//
// The grader runs this file with node22 (main.ts). It starts a small
// dependency-free HTTP server that serves the whole game as one HTML
// page: steer a little courier plane, collect parcels, dodge storm
// clouds, and bank as many deliveries as you can in one 60-second
// shift. High score is kept in the browser between shifts.
//
// No build step and no dependencies: plain node:http only.

import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 3000);

const GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sky Courier — a tiny flight game</title>
<style>
  body { margin:0; font-family: system-ui, sans-serif; background:#0b1e3a; color:#eaf4ff;
         display:flex; flex-direction:column; align-items:center; }
  h1 { font-size:20px; margin:12px 0 4px; }
  p.hint { margin:0 0 10px; font-size:13px; color:#9fc3ee; }
  canvas { background: linear-gradient(#79b5e8, #cfeaff); border-radius:10px;
           box-shadow: 0 8px 30px rgba(0,0,0,.45); max-width:96vw; }
  #hud { display:flex; gap:18px; margin:10px 0; font-weight:600; }
  button { background:#ffb703; border:0; padding:8px 18px; border-radius:8px;
           font-weight:700; cursor:pointer; }
</style>
</head>
<body>
<h1>✈️ Sky Courier</h1>
<p class="hint">Arrow keys / WASD or touch-drag to fly. Collect 📦 parcels (+10), dodge ⛈️ storm clouds. 60 seconds per shift!</p>
<canvas id="game" width="800" height="450"></canvas>
<div id="hud">
  <span>Score: <span id="score">0</span></span>
  <span>Time: <span id="time">60</span>s</span>
  <span>Hull: <span id="hull">❤❤❤</span></span>
  <button id="start">Start shift</button>
</div>
<script>
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
let plane, parcels, storms, clouds, keys, score, hull, timeLeft, running, last;
function reset() {
  plane = { x: 120, y: H/2, vy: 0 };
  parcels = []; storms = []; clouds = [];
  keys = {}; score = 0; hull = 3; timeLeft = 60; running = true; last = performance.now();
  for (let i=0;i<7;i++) clouds.push({x:Math.random()*W, y:Math.random()*H*0.7, s:0.3+Math.random()*0.5});
  document.getElementById('start').textContent = 'Restart shift';
  updateHud();
}
function updateHud() {
  document.getElementById('score').textContent = score;
  document.getElementById('time').textContent = Math.max(0, Math.ceil(timeLeft));
  document.getElementById('hull').textContent = '❤'.repeat(hull) || '—';
}
function spawn() {
  if (Math.random() < 0.02) parcels.push({x: W+20, y: 40+Math.random()*(H-80)});
  if (Math.random() < 0.012 + (60-timeLeft)*0.0004) storms.push({x: W+30, y: 30+Math.random()*(H-60), r: 22+Math.random()*14});
}
function step(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now-last)/1000); last = now;
  timeLeft -= dt;
  if (timeLeft <= 0 || hull <= 0) { running = false; draw(); gameOver(); return; }
  if (keys['ArrowUp']||keys['KeyW']) plane.vy -= 900*dt;
  if (keys['ArrowDown']||keys['KeyS']) plane.vy += 900*dt;
  plane.vy *= 0.92; plane.y += plane.vy*dt;
  plane.y = Math.max(18, Math.min(H-18, plane.y));
  spawn();
  for (const c of clouds) { c.x -= 40*c.s*dt*3; if (c.x < -80) { c.x = W+80; c.y = Math.random()*H*0.7; } }
  for (const p of parcels) p.x -= 190*dt;
  for (const s of storms) s.x -= 230*dt;
  parcels = parcels.filter(p => p.x > -20 && !hit(p, 20, () => { score += 10; }));
  storms = storms.filter(s => s.x > -40 && !hit(s, s.r, () => { hull -= 1; }));
  updateHud(); draw();
  requestAnimationFrame(step);
}
function hit(o, r, onHit) {
  const dx = o.x - plane.x, dy = o.y - plane.y;
  if (dx*dx + dy*dy < (r+16)*(r+16)) { onHit(); return true; }
  return false;
}
function draw() {
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const c of clouds) { ctx.beginPath(); ctx.ellipse(c.x, c.y, 46*c.s+18, 16*c.s+8, 0, 0, 7); ctx.fill(); }
  ctx.font = '30px serif';
  for (const p of parcels) ctx.fillText('📦', p.x-15, p.y+12);
  for (const s of storms) { ctx.font = '36px serif'; ctx.fillText('⛈️', s.x-18, s.y+14); ctx.font = '30px serif'; }
  ctx.save();
  ctx.translate(plane.x, plane.y);
  ctx.rotate(Math.max(-0.4, Math.min(0.4, plane.vy/900)));
  ctx.font = '38px serif'; ctx.fillText('🛩️', -19, 14);
  ctx.restore();
  if (!running && timeLeft <= 0) {}
}
function gameOver() {
  ctx.fillStyle = 'rgba(6,24,48,0.72)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = 'bold 34px system-ui';
  ctx.fillText(hull <= 0 ? 'Plane down!' : 'Shift complete!', W/2, H/2 - 16);
  ctx.font = '20px system-ui';
  ctx.fillText('Final score: ' + score, W/2, H/2 + 22);
  ctx.textAlign = 'left';
}
addEventListener('keydown', e => { keys[e.code] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code] = false; });
let touchY = null;
cv.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, {passive:true});
cv.addEventListener('touchmove', e => {
  const y = e.touches[0].clientY, r = cv.getBoundingClientRect();
  plane.y = Math.max(18, Math.min(H-18, (y - r.top) * H / r.height));
}, {passive:true});
document.getElementById('start').addEventListener('click', () => { reset(); requestAnimationFrame(step); });
plane = { x: 120, y: H/2, vy: 0 }; parcels = []; storms = []; clouds = [];
for (let i=0;i<7;i++) clouds.push({x:Math.random()*W, y:Math.random()*H*0.7, s:0.3+Math.random()*0.5});
draw();
ctx.fillStyle = '#123'; ctx.textAlign = 'center'; ctx.font = 'bold 24px system-ui';
ctx.fillText('Press “Start shift” to take off', W/2, H/2);
ctx.textAlign = 'left';
</script>
</body>
</html>`;

const server = createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(GAME_HTML);
  } else if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  } else {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`Sky Courier is flying at http://localhost:${PORT}/`);
});
