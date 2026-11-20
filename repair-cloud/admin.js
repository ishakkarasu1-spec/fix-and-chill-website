(function(){
'use strict';
const $=s=>document.querySelector(s),cfg=window.FC_CLOUD;
const statuses=['Booked','Item Ordered','Item Received','Waiting for Part','Device Received','In Repair','Ready for Pickup','Repair Completed','Delivered','Cancelled','Refunded'];
const form=$('#ticket-form');let accessToken='',rows=[],editing=null,sourceId=null,localTickets=[];
function note(s){$('#notice').textContent=s;}
function clear(){form.reset();editing=null;sourceId=null;$('#editor-title').textContent='New repair record';$('#links').hidden=true;$('#tracking-link').value='';}
function lock(){accessToken='';rows=[];$('#tickets').replaceChildren();$('#workspace').hidden=true;$('#login').hidden=false;clear();}
async function api(path,method='GET',body,auth=true){
 const headers={apikey:cfg.publishableKey,'Content-Type':'application/json'};
 if(auth){if(!accessToken)throw Error('Please sign in.');headers.Authorization='Bearer '+accessToken;headers.Prefer='return=representation';}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const r=await fetch(cfg.projectUrl+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
  if(!r.ok){if(r.status===401&&auth){lock();throw Error('Your session expired. Sign in again. Unsaved changes were cleared.');}if(r.status===409)throw Error('That ticket number already exists. Edit the saved record instead.');throw Error(auth?'Request failed. Check your connection and administrator permissions.':'Sign in failed. Check your email and password.');}
  return r.status===204?null:await r.json();
 }catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw Error('Connection unavailable. Please retry. A save may have reached the server; refresh records before creating it again.');throw e;}
 finally{clearTimeout(timer);}
}
async function busy(button,fn){button.disabled=true;try{await fn();}catch(e){note(e.message);}finally{button.disabled=false;}}
statuses.forEach(s=>form.elements.status.add(new Option(s,s)));
$('#login-form').addEventListener('submit',e=>{e.preventDefault();busy(e.submitter,async()=>{
 const f=e.target;const result=await api('/auth/v1/token?grant_type=password','POST',{email:f.elements.email.value.trim(),password:f.elements.password.value},false);f.elements.password.value='';accessToken=result.access_token;
 try{const admins=await api('/rest/v1/fc_admins?select=user_id&user_id=eq.'+encodeURIComponent(result.user.id));if(!admins.length)throw Error('This account is not authorized to manage repairs.');await refresh();loadLocal();$('#login').hidden=true;$('#workspace').hidden=false;note('Signed in. Updates are saved online.');}catch(err){lock();throw err;}
 });});
$('#logout').addEventListener('click',()=>{const token=accessToken;lock();note('Signed out of this page.');if(token)fetch(cfg.projectUrl+'/auth/v1/logout',{method:'POST',headers:{apikey:cfg.publishableKey,Authorization:'Bearer '+token}}).catch(()=>{});});
function edit(r){clear();editing=r.id;sourceId=r.source_id;['ticket_number','device','status','estimated_completion','public_message'].forEach(k=>form.elements[k].value=r[k]||'');$('#editor-title').textContent='Edit '+r.ticket_number;form.scrollIntoView({behavior:'smooth'});}
async function refresh(){
 rows=await api('/rest/v1/fc_repair_tickets?select=id,source_id,ticket_number,device,status,estimated_completion,public_message,tracking_enabled,tracking_expires_at,updated_at&order=updated_at.desc');
 $('#tickets').replaceChildren();if(!rows.length){$('#tickets').textContent='No online records yet.';return;}
 rows.forEach(r=>{
 const card=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=r.ticket_number+' — '+r.device;p.textContent=r.status+' · Tracking '+(r.tracking_enabled&&new Date(r.tracking_expires_at)>new Date()?'active':'inactive');card.append(h,p);
 for(const [label,fn] of [['Edit',async()=>edit(r)],['Create / replace tracking link',async()=>{
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,'0')).join('');
  const updated=await api('/rest/v1/fc_repair_tickets?id=eq.'+r.id,'PATCH',{tracking_token_hash:hash,tracking_enabled:true,tracking_expires_at:new Date(Date.now()+180*86400000).toISOString()});if(!updated.length)throw Error('Record was not updated. Refresh and retry.');
  const link=new URL('https://fixandchillphonerepair.com/track-repair/index.html');link.hash='token='+token;$('#tracking-link').value=link.href;$('#customer-code').value=token;$('#customer-message').value='Fix & Chill — Repair '+r.ticket_number+'\nView your repair status: '+link.href+'\nKeep this link private. Questions? Call (302) 727-3842.';$('#links').hidden=false;note('Private tracking link created. Copy it for the customer; the previous link no longer works.');await refresh();$('#links').scrollIntoView({behavior:'smooth'});
 }],['Disable tracking',async()=>{const updated=await api('/rest/v1/fc_repair_tickets?id=eq.'+r.id,'PATCH',{tracking_enabled:false,tracking_token_hash:null});if(!updated.length)throw Error('Record was not updated.');$('#links').hidden=true;$('#tracking-link').value='';await refresh();note('Tracking disabled for '+r.ticket_number);} ]]){
 const b=document.createElement('button');b.textContent=label;b.className='secondary';b.addEventListener('click',()=>busy(b,fn));card.append(b);
 }$('#tickets').append(card);
 });
}
form.addEventListener('submit',e=>{e.preventDefault();busy(e.submitter,async()=>{
 const record=Object.fromEntries(['ticket_number','device','status','estimated_completion','public_message'].map(k=>[k,form.elements[k].value.trim()]));if(!record.ticket_number||!record.device)throw Error('Ticket number and device are required.');if(sourceId)record.source_id=sourceId;
 const saved=await api('/rest/v1/fc_repair_tickets'+(editing?'?id=eq.'+editing:''),editing?'PATCH':'POST',record);if(!saved.length)throw Error('No record was saved. Refresh and try again.');editing=saved[0].id;$('#editor-title').textContent='Edit '+record.ticket_number;await refresh();note('Saved online. Customer tracking reflects these fields.');
 });});
function loadLocal(){
 const list=$('#local-tickets');list.replaceChildren(new Option('Choose a ticket',''));localTickets=[];
 try{const data=JSON.parse(localStorage.getItem('fixChillRepairManager.v1')||'{}');localTickets=Array.isArray(data.tickets)?data.tickets:[];localTickets.forEach((t,i)=>list.add(new Option(t.ticketNumber+' — '+(t.deviceModel||''),String(i))));}catch(_){note('Local records could not be read. Online records are available.');}
}
$('#load-local').addEventListener('click',()=>{const index=$('#local-tickets').value;if(index===''){note('Choose a local ticket first.');return;}const t=localTickets[Number(index)],existing=rows.find(r=>r.source_id===t.id||r.ticket_number===t.ticketNumber);if(existing){edit(existing);note('This ticket is already online. Editing its current online version.');return;}clear();sourceId=t.id||null;form.elements.ticket_number.value=t.ticketNumber||'';form.elements.device.value=[t.deviceBrand,t.deviceModel].filter(Boolean).join(' ');form.elements.status.value=statuses.includes(t.status)?t.status:'Booked';form.elements.estimated_completion.value=t.estimatedCompletion||'';form.elements.public_message.value=t.publicMessage||'';note('Local ticket loaded. Review and Save to publish these fields online.');});
$('#reload').addEventListener('click',e=>busy(e.target,async()=>{await refresh();loadLocal();note('Records refreshed.');}));$('#new-ticket').addEventListener('click',clear);
$('#copy-link').addEventListener('click',e=>busy(e.target,async()=>{try{await navigator.clipboard.writeText($('#tracking-link').value);note('Tracking link copied.');}catch(_){$('#tracking-link').select();note('Select and copy the link manually.');}}));
$('#copy-customer-message').addEventListener('click',e=>busy(e.target,async()=>{try{await navigator.clipboard.writeText($('#customer-message').value);note('Customer message copied. Send it by text or email.');}catch(_){$('#customer-message').select();note('Select and copy the message manually.');}}));
})();
