
// Make entire cards clickable and optionally open in new tab
document.addEventListener('click', function(e){
  const card = e.target.closest('.card');
  if(!card) return;
  if(e.target.closest('a')) return; // let buttons/links work as is
  const url = card.dataset.url;
  if(!url) return;
  const blank = card.dataset.blank === 'true';
  if(blank){
    window.open(url, '_blank', 'noopener,noreferrer');
  }else{
    window.location.href = url;
  }
});

document.querySelectorAll('video[data-stop-at]').forEach(function(video){
  const stopAt = Number(video.dataset.stopAt);
  if(!Number.isFinite(stopAt) || stopAt <= 0) return;
  video.addEventListener('timeupdate', function(){
    if(video.currentTime >= stopAt){
      video.currentTime = 0;
      video.play().catch(function(){});
    }
  });
});

document.querySelectorAll('.top-slideshow').forEach(function(slideshow){
  const slides = Array.from(slideshow.querySelectorAll('.slideshow-slide'));
  const dotsWrap = slideshow.querySelector('.slideshow-dots');
  if(slides.length < 2 || !dotsWrap) return;

  const dots = slides.map(function(_, index){
    const dot = document.createElement('span');
    dot.className = 'slideshow-dot' + (index === 0 ? ' is-active' : '');
    dotsWrap.appendChild(dot);
    return dot;
  });

  let current = Math.max(0, slides.findIndex(function(slide){ return slide.classList.contains('is-active'); }));

  function showSlide(next){
    slides[current].classList.remove('is-active');
    dots[current].classList.remove('is-active');
    const oldVideo = slides[current].querySelector('video');
    if(oldVideo) oldVideo.pause();

    current = next % slides.length;
    slides[current].classList.add('is-active');
    dots[current].classList.add('is-active');
    const video = slides[current].querySelector('video');
    if(video){
      video.currentTime = 0;
      video.play().catch(function(){});
    }
  }

  setInterval(function(){
    showSlide(current + 1);
  }, 4000);
});

const mobileScrollQuery = window.matchMedia('(max-width: 1024px)');
function updateMobileScrolledNav(){
  const shouldCompact = mobileScrollQuery.matches && window.scrollY > 24;
  document.body.classList.toggle('mobile-nav-scrolled', shouldCompact);
}
updateMobileScrolledNav();
window.addEventListener('scroll', updateMobileScrolledNav, {passive:true});
mobileScrollQuery.addEventListener('change', updateMobileScrolledNav);

const serviceAreaSearch = document.querySelector('#service-area-search');
if(serviceAreaSearch){
  const areaLinks = Array.from(document.querySelectorAll('.area-links a'));
  const bookRepair = document.querySelector('#book-repair');

  function goToBookRepair(){
    if(!bookRepair) return;
    bookRepair.scrollIntoView({behavior:'smooth', block:'start'});
  }

  serviceAreaSearch.addEventListener('click', goToBookRepair);
  serviceAreaSearch.addEventListener('focus', goToBookRepair);

  serviceAreaSearch.addEventListener('input', function(){
    const query = serviceAreaSearch.value.trim().toLowerCase();
    areaLinks.forEach(function(link){
      const match = !query || link.textContent.toLowerCase().includes(query);
      link.style.display = match ? 'inline-flex' : 'none';
    });
  });

  areaLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      goToBookRepair();
    });
  });
}
