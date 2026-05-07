
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

// Sends a one-time email notification when a visitor stays longer than 5 seconds.
// Works on static hosting by posting a hidden form to FormSubmit.
(function(){
  const storageKey = 'fixchill_visit_notice_sent';
  if(sessionStorage.getItem(storageKey)) return;

  window.setTimeout(function(){
    if(sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://formsubmit.co/fixandchill1@gmail.com';
    form.target = 'visitor-notify-frame';
    form.style.display = 'none';

    const fields = {
      _subject: 'Fix&Chill website visitor stayed 5+ seconds',
      _template: 'table',
      _captcha: 'false',
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || 'Direct / unknown',
      visitor_time: new Date().toLocaleString(),
      user_agent: navigator.userAgent
    };

    Object.keys(fields).forEach(function(name){
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = fields[name];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    window.setTimeout(function(){ form.remove(); }, 3000);
  }, 5000);
})();
