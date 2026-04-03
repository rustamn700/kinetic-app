const CACHE_NAME = 'kinetic-dynamic-cache-v10';

// Встановлення: примушуємо новий Service Worker відразу почати роботу
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Активація: видаляємо всі старі кеші, щоб телефон забув старий дизайн
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Видаляємо всі кеші, крім поточного
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Головна магія: Стратегія "Network First"
self.addEventListener('fetch', (event) => {
    // 🛑 Ігнорувати запити до API та AI
    if (event.request.url.includes('/ai-search') || event.request.url.includes('/api')) {
        return; 
    }
    
    // 🔥 НАЙГОЛОВНІШИЙ ФІКС: Ігноруємо POST, PUT, DELETE запити!
    // Кешувати можна тільки GET запити (сторінки, картинки, стилі). Відправка фото - це POST.
    if (event.request.method !== 'GET') {
        return; 
    }

    // Ігноруємо запити до сторонніх API (наприклад, до Google) та розширень браузера
    if (!event.request.url.startsWith(self.location.origin) || event.request.url.includes('chrome-extension')) {
        return;
    }

    event.respondWith(
        // 1. Спочатку завжди пробуємо скачати найсвіжіший файл з сервера
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                // Якщо скачали успішно - зберігаємо свіжу копію в пам'ять телефону
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // 2. Якщо інтернету немає взагалі — дістаємо з кешу
                return caches.match(event.request);
            })
    );
});

// --- ОБРОБКА КЛІКУ ПО СПОВІЩЕННЮ ---
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Закриваємо сповіщення
    
    // Перевіряємо, чи додаток вже відкритий. Якщо так - фокусуємось на ньому, якщо ні - відкриваємо
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url.indexOf('/') !== -1 && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});