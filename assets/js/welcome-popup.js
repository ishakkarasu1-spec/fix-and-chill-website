(() => {
  const key = 'fixchill-welcome-seen-v1';
  try { if(sessionStorage.getItem(key)) return; } catch(e) {}
  if(location.hash || document.querySelector('.site-modal.is-open')) return;
  const cfg = window.popupConfig;
  if(!cfg || typeof HTMLDialogElement === 'undefined') return;
  const dialog = document.createElement('dialog');
  dialog.id = 'welcome-popup';
  dialog.setAttribute('aria-labelledby','welcome-slogan');
  dialog.innerHTML = `<div class="content"><button class="close" aria-label="Close welcome message">×</button><img class="logo" src="assets/img/fixchill-logo.png" alt="Fix and Chill Mobile Phone Repair"><h2 id="welcome-slogan"></h2><p class="description"></p><div class="trust"></div><a class="cta"></a><p class="note"></p></div><div class="progress"><div class="bar"></div></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('h2').textContent = cfg.slogan;
  dialog.querySelector('.description').textContent = cfg.description;
  dialog.querySelector('.trust').textContent = cfg.trust;
  const book = dialog.querySelector('.cta');
  book.textContent = cfg.button + ' →';
  book.href = cfg.bookingUrl;
  let timer, animation, opening = true;
  const note = dialog.querySelector('.note');
  note.textContent = 'Closes automatically in ' + cfg.durationMs / 1000 + ' seconds';
  function pause(){
    if(opening) return;
    clearTimeout(timer);
    if(animation) animation.pause();
    note.textContent = 'Ready when you are.';
  }
  dialog.querySelector('.close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    clearTimeout(timer);
    if(animation) animation.cancel();
  });
  book.addEventListener('click', e => {
    dialog.close();
    if(typeof openModalById === 'function' && openModalById('repair-modal')) e.preventDefault();
  });
  dialog.addEventListener('pointerdown',pause);
  dialog.addEventListener('keydown',pause);
  dialog.addEventListener('focusin',pause);
  dialog.querySelector('.content').addEventListener('pointerenter',pause);
  dialog.showModal();
  try { sessionStorage.setItem(key,'1'); } catch(e) {}
  animation = dialog.querySelector('.bar').animate([{width:'100%'},{width:'0%'}],{duration:cfg.durationMs,fill:'forwards'});
  timer = setTimeout(() => dialog.close(), cfg.durationMs);
  opening = false;
})();
