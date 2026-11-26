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
