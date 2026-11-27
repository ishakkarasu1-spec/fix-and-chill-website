(function(){
 'use strict';
 const marker='\nRepair: ';
 window.FC_FORMAT={
  shortToken(hex){return btoa(String.fromCharCode(...hex.match(/../g).map(x=>parseInt(x,16)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');},
  token(value){
   let v=value.trim();
   if(/^https?:\/\//i.test(v)){try{v=new URL(v).hash.slice(1);}catch(_){return '';}}
   if(v.startsWith('token='))v=new URLSearchParams(v).get('token')||'';
   if(/^[a-f0-9]{64}$/i.test(v))return v.toLowerCase();
   if(!/^[A-Za-z0-9_-]{43}$/.test(v))return '';
   try{const bytes=atob(v.replace(/-/g,'+').replace(/_/g,'/')+'=');return bytes.length===32?Array.from(bytes,c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join(''):'';}catch(_){return '';}
  },
  device(value){const i=value.lastIndexOf(marker);return i<0?{device:value,repair:''}:{device:value.slice(0,i),repair:value.slice(i+marker.length)};},
  combined(device,repair){return device+(repair?marker+repair:'');}
 };
})();
