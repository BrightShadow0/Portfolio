(function(){var els=document.querySelectorAll('main section>*:not(.hero-in),.row,.contact-block>*,footer');
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('vin');io.unobserve(e.target)}})},{threshold:.12});
els.forEach(function(el,i){if(el.classList.contains('reveal'))return;el.classList.add('vr');el.style.setProperty('--vd',(i%4)*.06+'s');io.observe(el)})})();
