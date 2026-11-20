/* Local export only. No network requests and no changes to stored records. */
(function () {
 'use strict';
 const button = document.getElementById('download-local-backup');
 if (!button) return;
 const status = document.getElementById('backup-status');
 button.addEventListener('click', function () {
  let url;
  try {
   const raw = localStorage.getItem('fixChillRepairManager.v1');
   if (!raw) { status.textContent = 'No saved records in this browser. Open the panel in the browser where you created your records.'; return; }
   const data = JSON.parse(raw);
   if (!data || !Array.isArray(data.customers) || !Array.isArray(data.tickets)) throw new Error('Invalid record structure');
   const backup = {format:'fixchill-local-backup',version:1,exportedAt:new Date().toISOString(),data:data};
   url = URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
   const a = document.createElement('a'); a.href = url;
   a.download = 'fixchill-private-backup-' + new Date().toISOString().slice(0,10) + '.json';
   document.body.appendChild(a); a.click(); a.remove();
   status.textContent = 'Backup download requested. Contains customer information: keep it private; do not upload it to GitHub.';
  } catch (_) { status.textContent = 'Backup could not be created. Saved records have not been changed.'; }
  finally { if (url) setTimeout(function(){URL.revokeObjectURL(url);},1000); }
 });
})();
