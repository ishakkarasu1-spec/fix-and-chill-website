
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

const siteModals = Array.from(document.querySelectorAll('.site-modal'));
function openModalById(id){
  const modal = document.getElementById(id);
  if(!modal) return false;
  siteModals.forEach(function(otherModal){
    otherModal.classList.remove('is-open');
    otherModal.setAttribute('aria-hidden', 'true');
  });
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setTimeout(function(){
    if(window.Tally && typeof window.Tally.loadEmbeds === 'function'){
      window.Tally.loadEmbeds();
    }
  }, 60);
  const closeButton = modal.querySelector('[data-modal-close]');
  if(closeButton) closeButton.focus({preventScroll:true});
  return true;
}

function closeModal(modal){
  if(!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  if(!document.querySelector('.site-modal.is-open')){
    document.body.classList.remove('modal-open');
  }
}

document.querySelectorAll('[data-modal-target]').forEach(function(trigger){
  trigger.addEventListener('click', function(e){
    const targetId = trigger.getAttribute('data-modal-target');
    if(openModalById(targetId)){
      e.preventDefault();
    }
  });
});

document.addEventListener('click', function(e){
  if(!e.target.matches('[data-modal-close]')) return;
  closeModal(e.target.closest('.site-modal'));
});

document.addEventListener('keydown', function(e){
  if(e.key !== 'Escape') return;
  closeModal(document.querySelector('.site-modal.is-open'));
});

const serviceAreaSearch = document.querySelector('#service-area-search');
if(serviceAreaSearch){
  const areaLinks = Array.from(document.querySelectorAll('.area-links a'));
  const futureLocationLinks = Array.from(document.querySelectorAll('.location-future-link'));
  const bookRepair = document.querySelector('#book-repair');
  const availableLocationPages = new Set([
    '/rehoboth-beach-phone-repair',
    '/lewes-phone-repair',
    '/georgetown-phone-repair',
    '/milford-phone-repair',
    '/milton-phone-repair',
    '/millsboro-phone-repair',
    '/ocean-city-phone-repair',
    '/salisbury-phone-repair'
  ]);

  function goToBookRepair(){
    if(openModalById('repair-modal')) return;
    if(!bookRepair) return;
    bookRepair.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function normalizedPath(link){
    try{
      return new URL(link.getAttribute('href'), window.location.origin).pathname.replace(/\/$/,'');
    }catch(e){
      return '';
    }
  }

  function handleAreaLink(link){
    const path = normalizedPath(link);
    if(availableLocationPages.has(path)){
      window.location.href = link.getAttribute('href');
      return;
    }
    goToBookRepair();
  }

  serviceAreaSearch.addEventListener('input', function(){
    const query = serviceAreaSearch.value.trim().toLowerCase();
    areaLinks.forEach(function(link){
      const match = !query || link.textContent.toLowerCase().includes(query);
      link.style.display = match ? 'inline-flex' : 'none';
      const parentPanel = link.closest('details');
      if(query && match && parentPanel){
        parentPanel.open = true;
      }
    });
  });

  serviceAreaSearch.addEventListener('change', function(){
    const query = serviceAreaSearch.value.trim().toLowerCase().replace(/,\s*(de|md)$/,'');
    const match = areaLinks.find(function(link){
      return link.textContent.trim().toLowerCase() === query;
    });
    if(match){
      handleAreaLink(match);
    }
  });

  areaLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      handleAreaLink(link);
    });
  });

  futureLocationLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      handleAreaLink(link);
    });
  });
}
