const CACHE_NAME = 'weather-api-v1';
const urlsToCache = [
    '/',
    '/styles.css',
    '/script.js',
    'https://openweathermap.org/img/wn/01d@2x.png', // Sample weather icon
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});