(function(){
 'use strict';
 const key='fc.repair.session.v1';let session=null,persistent=false,pending=null,generation=0;
 function read(){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}}
 function save(){if(persistent&&session)localStorage.setItem(key,JSON.stringify(session));}
 function clear(){generation++;session=null;persistent=false;try{localStorage.removeItem(key);}catch(_){}}
 function set(data,remember){session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)};persistent=remember;if(persistent){try{save();}catch(_){persistent=false;}}else{try{localStorage.removeItem(key);}catch(_){}}}
 async function renew(){
  if(persistent){const stored=read();if(!stored){clear();throw Error('Please sign in.');}session=stored;}
  if(session?.access_token&&session.expires_at>Date.now()/1000+60)return session.access_token;
  if(!session?.refresh_token){clear();throw Error('Please sign in.');}
  const epoch=generation,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(FC_CLOUD.projectUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:FC_CLOUD.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),signal:controller.signal});
   if(!response.ok){if(response.status===400||response.status===401)clear();throw Error('Session could not be refreshed. Please sign in again.');}
   const data=await response.json();if(epoch!==generation)throw Error('Signed out.');set(data,persistent);return session.access_token;
  }finally{clearTimeout(timer);}
 }
 async function access(){if(!pending)pending=(navigator.locks?navigator.locks.request(key,renew):renew()).finally(()=>{pending=null;});return pending;}
 window.FC_SESSION={key,set,clear,access,saved(){const stored=read();if(!stored?.refresh_token)return false;session=stored;persistent=true;return true;}};
})();
