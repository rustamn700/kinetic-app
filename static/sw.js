// Змінюємо версію кешу, щоб змусити телефон оновитися
const CACHE_NAME = 'kinetic-v6-login-fix';

const urlsToCache = [
  '/static/dashboard.html',
  '/static/css/dashboard.css',  // <-- Новий CSS файл
  '/static/js/dashboard.js',
  '/static/js/profile.js',      // <-- Новий JS файл
  '/static/js/ai_search.js',
  '/static/manifest.json',
  '/static/icon.png'
];

// Встановлення: кешуємо нові файли
self.addEventListener('install', event => {
  self.skipWaiting(); // Змушуємо новий SW активуватися відразу
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Активація: видаляємо старий кеш (v1, v2...)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Видалення старого кешу:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Перехоплюємо контроль над сторінкою відразу
});

// Стратегія: Спочатку Мережа, якщо немає - Кеш (Network First)
// Це краще для розробки, щоб ти бачив зміни відразу
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Якщо інтернет є - оновлюємо кеш свіжою версією
        if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // Якщо інтернету немає - беремо з кешу
        return caches.match(event.request);
      })
  );
});