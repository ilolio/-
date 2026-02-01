var CACHE_NAME = 'url-memo-v1';
var ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) {
          return name !== CACHE_NAME;
        }).map(function (name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // Share Target: let it pass through to the page with query params
  if (url.searchParams.has('title') || url.searchParams.has('text') || url.searchParams.has('url')) {
    e.respondWith(
      caches.match('./index.html').then(function (response) {
        return response || fetch(e.request);
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (response) {
      return response || fetch(e.request).then(function (fetchResponse) {
        return caches.open(CACHE_NAME).then(function (cache) {
          cache.put(e.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    }).catch(function () {
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
