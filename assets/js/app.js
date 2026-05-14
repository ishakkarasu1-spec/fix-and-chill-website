
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
