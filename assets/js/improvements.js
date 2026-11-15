/* No customer answers, contact details or submission IDs are sent to analytics. */
(() => {
  'use strict';
  const forms = {rjJyop:'repair', yPoZDX:'buyback'};
  const submitted = new Set();
  function track(name, extra = {}) {
    let internal = false;
    try { internal = localStorage.getItem('fixchill-internal') === '1'; } catch (_) {}
    if (internal || !['fixandchillphonerepair.com','www.fixandchillphonerepair.com'].includes(location.hostname)) return;
    const params = Object.assign({page_path:location.pathname}, extra);
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
    if (typeof window.clarity === 'function') window.clarity('event', name);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('tel:')) track('phone_click');
    if (href.startsWith('mailto:')) track('email_click');
    if (href.includes('book-repair.html') && !a.hasAttribute('data-modal-target')) track('booking_link_click');
    if (href.startsWith('https://tally.so/r/')) track('form_external_open', {form_type:forms[href.split('/').pop()] || 'unknown'});
  });
  document.addEventListener('fixchill:modal-open', e => {
    track(e.detail.id === 'repair-modal' ? 'booking_open' : 'buyback_open');
  });
  window.addEventListener('message', e => {
    // Only messages from an actual embedded Tally form are trusted.
    if (e.origin !== 'https://tally.so') return;
    const frame = Array.from(document.querySelectorAll('iframe[data-tally-src]')).find(f => f.contentWindow === e.source);
    if (!frame) return;
    let message = e.data;
    if (typeof message === 'string') { try { message = JSON.parse(message); } catch (_) { return; } }
    if (!message || !message.payload) return;
    const payload = message.payload;
    const formType = forms[payload.formId];
    if (!formType || !frame.getAttribute('data-tally-src').includes('/'+payload.formId+'?')) return;
    if (message.event === 'Tally.FormLoaded') track('booking_form_loaded', {form_type:formType});
    if (message.event !== 'Tally.FormSubmitted' || !payload.id || submitted.has(payload.id)) return;
    submitted.add(payload.id);
    track('generate_lead', {form_type:formType, lead_type:formType === 'repair' ? 'repair_request' : 'buyback_request'});
  });
  // Keep the mobile menu available while scrolling, including keyboard access.
  document.querySelectorAll('header.nav').forEach((header,i) => {
    const nav=header.querySelector('nav'); if(!nav) return;
    nav.id=nav.id || 'main-navigation-'+i;
    const button=document.createElement('button'); button.type='button'; button.className='nav-menu-toggle';
    button.textContent='Menu'; button.setAttribute('aria-controls',nav.id); button.setAttribute('aria-expanded','false');
    header.insertBefore(button,nav); header.classList.add('has-menu');
    function close(){header.classList.remove('menu-open');button.setAttribute('aria-expanded','false');}
    button.addEventListener('click',()=>{const open=header.classList.toggle('menu-open');button.setAttribute('aria-expanded',String(open));});
    nav.addEventListener('click',e=>{if(e.target.closest('a')) close();});
    header.addEventListener('keydown',e=>{if(e.key==='Escape'){close();button.focus();}});
  });
  // A keyboard user can reach the embedded form and return to the opener.
  document.addEventListener('keydown', e => {
    if(e.key !== 'Tab') return;
    const panel=document.querySelector('.site-modal.is-open .site-modal-panel'); if(!panel) return;
    const items=Array.from(panel.querySelectorAll('a[href],button,iframe,input,select,textarea,[tabindex="0"]')).filter(el=>el.getClientRects().length);
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
  });
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_API.customStyle={visibility:{desktop:{position:'bl',xOffset:16,yOffset:20},mobile:{position:'bl',xOffset:12,yOffset:88}}};
  if(document.body && document.body.classList.contains('book-page')) {
    const previousLoad=window.Tawk_API.onLoad;
    window.Tawk_API.onLoad=function(){
      if(typeof previousLoad==='function') previousLoad.apply(this,arguments);
      if(typeof window.Tawk_API.hideWidget==='function') window.Tawk_API.hideWidget();
    };
    if(typeof window.Tawk_API.hideWidget==='function') window.Tawk_API.hideWidget();
  }
})();
