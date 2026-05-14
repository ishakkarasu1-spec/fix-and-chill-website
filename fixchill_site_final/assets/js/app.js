
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

// Sends a one-time notification when a visitor stays longer than 5 seconds.
// Netlify records this as a Forms submission.
(function(){
  window.setTimeout(function(){
    const fields = {
      'form-name': 'visitor-notification',
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || 'Direct / unknown',
      visitor_time: new Date().toLocaleString(),
      user_agent: navigator.userAgent
    };

    fetch('/', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams(fields).toString()
    }).catch(function(){});
  }, 5000);
})();
