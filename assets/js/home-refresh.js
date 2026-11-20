(() => {
  const buttons = document.querySelectorAll('[data-language]');
  const translated = [...document.querySelectorAll('[data-es]')];
  translated.forEach(el => el.dataset.en = el.textContent);
  function language(lang) {
    document.documentElement.lang = lang;
    translated.forEach(el => el.textContent = el.dataset[lang]);
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.language === lang)));
    try { localStorage.setItem('fc-language', lang); } catch (_) {}
    document.querySelectorAll('[data-es-attr]').forEach(el=>{
      const attr=el.dataset.esAttr;
      if(!el.dataset.enAttrValue)el.dataset.enAttrValue=el.getAttribute(attr)||'';
      el.setAttribute(attr,lang==='es'?el.dataset.esAttrValue:el.dataset.enAttrValue);
    });
    document.dispatchEvent(new CustomEvent('fixchill:language',{detail:lang}));
  }
  buttons.forEach(b => b.addEventListener('click', () => language(b.dataset.language)));
  try { if (localStorage.getItem('fc-language') === 'es') language('es'); } catch (_) {}
  const carousel = document.querySelector('.home-carousel');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('.slideshow-slide')];
  let current = 0;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pause = carousel.querySelector('.carousel-pause');
  function show(n) {
    current = (n + slides.length) % slides.length;
    slides.forEach((slide,i) => {slide.classList.toggle('is-active', i === current);slide.setAttribute('aria-hidden',String(i !== current));});
    carousel.querySelector('.slide-count').textContent = `${current + 1} / ${slides.length}`;
  }
  function pauseLabel(){const es=document.documentElement.lang==='es';pause.textContent = paused ? '▶' : 'Ⅱ';pause.setAttribute('aria-label',paused ? (es?'Reproducir diapositivas':'Play slideshow') : (es?'Pausar diapositivas':'Pause slideshow'));pause.setAttribute('aria-pressed',String(paused));}
  document.addEventListener('fixchill:language',pauseLabel);
  pause.addEventListener('click',() => {paused = !paused; pauseLabel();});
  carousel.querySelectorAll('[data-slide]').forEach(b => b.addEventListener('click',() => {show(current + (b.dataset.slide === 'next' ? 1 : -1));paused=true;pauseLabel();}));
  setInterval(() => {if (!paused && !document.hidden && !carousel.matches(':hover') && !carousel.contains(document.activeElement)) show(current+1);},6000);
  show(0); pauseLabel();
})();
