(function(){
'use strict';
const $=s=>document.querySelector(s), cfg=window.FC_CLOUD;
let requestId=0;
async function lookup(){
 const id=++requestId;
 const token=FC_FORMAT.token($('#tracking-code').value);
 $('#result').hidden=true;
 if(!/^[0-9a-f]{64}$/.test(token)){ $('#message').textContent='Enter the full tracking code from your private link.'; return; }
 $('#check').disabled=true; $('#message').textContent='Checking your repair…';
 const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(cfg.projectUrl+'/rest/v1/rpc/fc_track_repair',{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_token:token}),signal:controller.signal,cache:'no-store',referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('service');
  const rows=await response.json();if(id!==requestId)return;
  if(!Array.isArray(rows)||!rows.length){$('#message').textContent='This tracking link is invalid, expired or no longer active. Please contact Fix & Chill.';return;}
  const r=rows[0];
  const parts=FC_FORMAT.device(r.device);$('#device').textContent=parts.device;$('#repair-type').textContent=parts.repair?'Repair: '+parts.repair:'';$('#repair-type').hidden=!parts.repair; $('#repair-status').textContent=r.status;
  $('#ticket-number').textContent='Ticket: '+r.ticket_number;
  $('#estimate').textContent='Estimated completion: '+(r.estimated_completion||'We will confirm with you.');
  $('#public-message').textContent=r.public_message||'Please contact us if you have questions.';
  $('#updated').textContent='Last updated: '+new Date(r.updated_at).toLocaleString();
  $('#result').hidden=false;$('#message').textContent='Status retrieved. Check again for the latest update.';
 }catch(_){if(id===requestId)$('#message').textContent='We cannot retrieve your repair status right now. Please try again or call us. This does not mean your repair record is missing.';}
 finally{clearTimeout(timer);if(id===requestId)$('#check').disabled=false;}
}
$('#tracking-form').addEventListener('submit',e=>{e.preventDefault();lookup();});
const token=FC_FORMAT.token(location.hash.slice(1));
if(token){$('#tracking-code').value=token;history.replaceState(null,'',location.pathname);lookup();}
})();
