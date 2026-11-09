const PREFIX='rogue-walk:'+self.registration.scope+':',CACHE=PREFIX+'v0.4.0';
const ASSETS=['./','./index.html','./style.css','./app.js','./core.js','./storage.js','./hero.png','./icon.svg','./manifest.webmanifest'];
const urls=ASSETS.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})))));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(event.request);if(cached)return cached;try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate')return (await cache.match(new URL('./index.html',self.registration.scope).href))||Response.error();return Response.error();}})());
});
self.addEventListener('message',event=>{if(event.data==='CHECK_SHELL'&&event.ports?.[0])event.waitUntil((async()=>{const cache=await caches.open(CACHE),ready=(await Promise.all(urls.map(url=>cache.match(url)))).every(Boolean);event.ports[0].postMessage({ready});})());});
