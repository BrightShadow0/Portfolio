/* ===== Scrollytelling engine — story.js ===== */
(function(){
"use strict";
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var coarse = window.matchMedia('(pointer: coarse)').matches;
var body = document.body;

/* debug/screenshot hooks: #p=0.42 forces pin progress; #all=1 reveals everything */
var forceP = null, pm = /[#&]p=([\d.]+)/.exec(location.hash || '');
if (pm) forceP = Math.min(1, Math.max(0, parseFloat(pm[1])));
var flatMode = /[#&]flat=1/.test(location.hash || '');

/* ---- nav flush: classic bar flows away, dock settles ---- */
var navAway = false;
function navCheck(y){
  if (forceP !== null) return;
  var away = y > 40;
  if (away !== navAway){ navAway = away; body.classList.toggle('nav-away', away); }
}

/* ---- cursor spotlight ---- */
var spot = document.querySelector('.spot');
var tx = innerWidth/2, ty = innerHeight*0.35, sx = tx, sy = ty;
if (!reduce && !coarse && spot){
  addEventListener('pointermove', function(e){ tx = e.clientX; ty = e.clientY; body.classList.add('spot-on'); }, {passive:true});
}

/* ---- intro pin ---- */
var pin = document.querySelector('.pin');
var markOrbit = document.querySelector('.mark-orbit');
var beats = Array.prototype.slice.call(document.querySelectorAll('.beat'));
var hint = document.querySelector('.scroll-hint');

/* ---- orb light: travels the rim on its own; follows the pointer when it is in range, brighter when closer; white once clicked ---- */
var markEl = document.querySelector('.mark');
var markPath = markEl ? markEl.querySelector('path') : null;
var ptr = null, angC = 0, lvlC = 0.42, lastT = 0;
function pointerInfo(){
 var r = markEl.getBoundingClientRect(), dx = ptr.x - (r.left + r.width/2), dy = ptr.y - (r.top + r.height/2);
 var inside = false;
 try {
 var ctm = markPath.getScreenCTM(), svg = markPath.ownerSVGElement, pt = svg.createSVGPoint();
 pt.x = ptr.x; pt.y = ptr.y;
 inside = markPath.isPointInFill(pt.matrixTransform(ctm.inverse()));
 } catch (err) {}
 return { d: Math.hypot(dx, dy), r: r.width/2, ang: Math.atan2(dx, -dy) * 180 / Math.PI, inside: inside };
}
/* glow layers: blur lives on a parent so the spill is not clipped by the spade-shaped mask */
if (markEl && !markOrbit.querySelector('.glow')) {
 ['g3','g2','g1'].forEach(function(c){
 var g = document.createElement('div'); g.className = 'glow ' + c; g.setAttribute('aria-hidden','true');
 g.appendChild(document.createElement('i')); markOrbit.insertBefore(g, markEl);
 });
}
if (markEl && !markOrbit.querySelector('.gr')) {
 ['gr0','gr1'].forEach(function(c){
 var g = document.createElement('div'); g.className = 'glow gr ' + c; g.setAttribute('aria-hidden','true');
 g.appendChild(document.createElement('i')); markOrbit.insertBefore(g, markEl.nextSibling);
 });
}
function lightTick(t){
 requestAnimationFrame(lightTick);
 if (!markEl || !pin || pin.getBoundingClientRect().bottom < 0) return;
 var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
 var follow = false, n = 0;
 if (ptr && !coarse && !flatMode) {
 var m = pointerInfo();
 n = Math.max(0, Math.min(1, 1 - (m.d - m.r) / 220));
 follow = n > 0 && !m.inside;
 if (follow) { var da = ((((m.ang - angC + 180) % 360) + 360) % 360) - 180; var stp = da * (1 - Math.exp(-dt * 3.2)); var mx = 140 * dt; angC += Math.max(-mx, Math.min(mx, stp)); }
 }
 if (!follow && !reduce) angC += 30 * dt;
 angC = ((angC % 360) + 360) % 360;
 var AMB = 0.42; var target = AMB; if (ptr && !coarse && !flatMode) { target = (m.inside) ? 1 : (follow ? AMB + (1 - AMB) * Math.pow(n, 1.1) : AMB); }
 lvlC += (target - lvlC) * (1 - Math.exp(-dt * 5));
 markOrbit.style.setProperty('--ang', angC.toFixed(1));
 markOrbit.style.setProperty('--lvl', lvlC.toFixed(3));
}
if (markEl) {
 requestAnimationFrame(lightTick);
 addEventListener('pointermove', function(e){ ptr = { x: e.clientX, y: e.clientY }; }, {passive:true});
 addEventListener('click', function(e){
 var r = markEl.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
 if (r.width > 0 && d <= r.width/2 * 1.1 && parseFloat(markOrbit.style.opacity || '1') > 0.5) body.classList.toggle('mark-white');
 });
}


function ease(t){ return t<0?0:t>1?1:t*t*(3-2*t); }

function pinUpdate(){
  if (!pin || reduce || flatMode) return;
  var r = pin.getBoundingClientRect();
  var total = pin.offsetHeight - innerHeight;
  var p = forceP !== null ? forceP : ease(Math.min(1, Math.max(0, -r.top / total)));

  /* mark: drifts + breathes, then shrinks away */
  var drift = Math.sin(p * Math.PI) * -26;             /* slight rise mid-sequence */
  var settle = ease(Math.min(1, Math.max(0, (p - 0.86) / 0.14))); /* final settle */
  var scale = 1 - settle * 0.55;
  markOrbit.style.transform = 'translateY(' + (drift - settle * 60) + 'px) scale(' + scale + ')';
  markOrbit.style.opacity = String(1 - settle);

  /* beats: four caption beats across the pin */
  var windows = [[0.04,0.22],[0.30,0.48],[0.56,0.74],[0.80,0.93]];
  for (var i=0;i<beats.length;i++){
    var w = windows[i], b = beats[i];
    var fadeIn = ease((p - w[0]) / 0.07);
    var fadeOut = 1 - ease((p - (w[1]-0.06)) / 0.07);
    var o = Math.min(fadeIn, fadeOut);
    b.style.opacity = o.toFixed(3);
    b.style.transform = 'translateX(-50%) translateY(' + ((1-fadeIn)*26 - (1-fadeOut)*18) + 'px)';
    b.style.filter = 'blur(' + ((1-o)*6).toFixed(2) + 'px)';
    b.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
  }
  if (hint) hint.style.opacity = String(Math.max(0, 1 - p * 6));

  /* mark settles into the background watermark */
  body.classList.toggle('mark-settled', forceP !== null ? p > 0.985 : (p > 0.985 || r.bottom < 0));
}

/* ---- chapter reveals ---- */
var io = new IntersectionObserver(function(es){
  es.forEach(function(e){
    if (e.isIntersecting){ e.target.classList.add('vin'); io.unobserve(e.target); }
  });
}, {threshold:.16, rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });

/* stagger inside grids */
document.querySelectorAll('[data-stagger]').forEach(function(group){
  Array.prototype.forEach.call(group.children, function(kid, i){
    kid.style.setProperty('--d', (i*0.08).toFixed(2) + 's');
  });
});

/* ---- project cards: cursor glow + tilt ---- */
if (!reduce && !coarse){
  document.querySelectorAll('.card').forEach(function(card){
    card.addEventListener('pointermove', function(e){
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x+'px');
      card.style.setProperty('--my', y+'px');
      var rx = ((y / r.height) - .5) * -4, ry = ((x / r.width) - .5) * 5;
      card.style.transform = 'perspective(800px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    });
    card.addEventListener('pointerleave', function(){ card.style.transform = ''; });
  });
}

/* ---- research pipeline: wires draw with scroll, then the break shows ---- */
var pipeWrap = document.querySelector('.pipe-wrap');
var wires = Array.prototype.slice.call(document.querySelectorAll('.pipe .wire'));
wires.forEach(function(w){
  var len = w.getTotalLength();
  w.style.strokeDasharray = len;
  w.style.strokeDashoffset = len;
});
function pipeUpdate(){
  if (!pipeWrap || flatMode) return;
  var r = pipeWrap.getBoundingClientRect();
  var p = ease(Math.min(1, Math.max(0, (innerHeight*0.82 - r.top) / (innerHeight*0.7))));
  wires.forEach(function(w, i){
    var len = w.getTotalLength();
    var local = ease(Math.min(1, Math.max(0, (p - i*0.22) / 0.34)));
    w.style.strokeDashoffset = String(len * (1 - local));
  });
  document.querySelector('.pipe').classList.toggle('break-shown', p > 0.82);
}

/* ---- education timeline draw ---- */
var tline = document.querySelector('.tline');
function tlUpdate(){
  if (!tline || flatMode) return;
  var r = tline.getBoundingClientRect();
  var p = ease(Math.min(1, Math.max(0, (innerHeight*0.8 - r.top) / (r.height + innerHeight*0.25))));
  tline.style.setProperty('--tl', p.toFixed(3));
}

/* ---- progress dots ---- */
var chapters = Array.prototype.slice.call(document.querySelectorAll('.chapter'));
var dots = Array.prototype.slice.call(document.querySelectorAll('.dots a'));
function dotsUpdate(){
  var mid = scrollY + innerHeight*0.4;
  var active = -1;
  chapters.forEach(function(ch, i){ if (ch.offsetTop <= mid) active = i; });
  dots.forEach(function(d, i){ d.classList.toggle('on', i === active); });
}

/* ---- master rAF loop ---- */
if (forceP !== null) { navAway = true; body.classList.add('nav-away'); }
if (/[#&]all=1/.test(location.hash || '')) {
  document.querySelectorAll('.rv').forEach(function(el){ el.classList.add('vin'); });
  var pq = document.querySelector('.pipe'); if (pq) pq.classList.add('break-shown');
  var tq = document.querySelector('.tline'); if (tq) tq.style.setProperty('--tl', '1');
}
if (/[#&]flat=1/.test(location.hash || '')) {
  body.classList.add('flat', 'nav-away', 'mark-settled');
  document.querySelectorAll('.rv').forEach(function(el){ el.classList.add('vin'); });
  var pf = document.querySelector('.pipe'); if (pf) pf.classList.add('break-shown');
  wires.forEach(function(w){ w.style.strokeDashoffset = '0'; });
  var tf = document.querySelector('.tline'); if (tf) tf.style.setProperty('--tl', '1');
  document.querySelectorAll('.beat').forEach(function(b){ b.style.opacity = '1'; b.style.visibility = 'visible'; });
}
var ticking = false;
function frame(){
  ticking = false;
  sx += (tx - sx) * 0.12; sy += (ty - sy) * 0.12;
  if (spot) spot.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0)';
  navCheck(scrollY);
  pinUpdate(); pipeUpdate(); tlUpdate(); dotsUpdate();
}
function request(){ if (!ticking){ ticking = true; requestAnimationFrame(frame); } }
addEventListener('scroll', request, {passive:true});
addEventListener('resize', request);
request();
if (!reduce) setInterval(request, 90); /* keep spotlight lerp alive without scroll */
})();
