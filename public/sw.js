// gunnchAI3k Hub Service Worker
// Optimized for current phones (not newest flagships)

const CACHE_NAME = 'gunnchai3k-hub-v1';
const OFFLINE_CACHE = 'gunnchai3k-hub-offline-v1';

// Hub-specific cache strategies
const HUB_CACHE_PATTERNS = [
  /games/,
  /projects/,
  /profile/,
  /settings/,
  /anime-aggressors/,
  /3k-mlv/
];

// Critical resources for offline hub support
const CRITICAL_RESOURCES = [
  '/',
  '/games/anime-aggressors',
  '/games/3k-mlv',
  '/projects/finds',
  '/projects/edgegesture',
  '/projects/gunnchai3k',
  '/projects/portfolio',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('🏠 gunnchAI3k Hub Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📱 Caching critical hub resources...');
        return cache.addAll(CRITICAL_RESOURCES);
      })
      .then(() => {
        console.log('✅ Hub resources cached successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 gunnchAI3k Hub Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Hub Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement hub-focused caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Hub API requests - cache with network-first strategy
  if (HUB_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(handleHubRequest(request));
    return;
  }
  
  // Static assets - cache first strategy
  if (request.destination === 'image' || 
      request.destination === 'script' || 
      request.destination === 'style') {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // Game requests - network first with cache fallback
  if (url.pathname.startsWith('/games/')) {
    event.respondWith(handleGameRequest(request));
    return;
  }
  
  // Project requests - network first with cache fallback
  if (url.pathname.startsWith('/projects/')) {
    event.respondWith(handleProjectRequest(request));
    return;
  }
  
  // Default - network first with cache fallback
  event.respondWith(handleDefaultRequest(request));
});

// Hub request handler - network first for real-time hub data
async function handleHubRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🏠 Hub request failed, trying cache...');
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline hub guidance
    return new Response(JSON.stringify({
      message: 'gunnchAI3k Hub is offline',
      guidance: 'Basic hub features available offline',
      games: [
        'Anime Aggressors - Offline mode',
        '3k MLV - Offline mode'
      ],
      projects: [
        'FINDS - Offline info',
        'EdgeGesture - Offline info',
        'gunnchAI3k - Offline info',
        'Portfolio - Offline info'
      ]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Game request handler - network first with cache fallback
async function handleGameRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🎮 Game request failed, trying cache...');
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline game info
    return new Response(JSON.stringify({
      error: 'Game not available offline',
      offline: true,
      message: 'gunnchAI3k Hub is working offline',
      games: [
        {
          name: 'Anime Aggressors',
          status: 'offline',
          description: 'Shōnen-style PvP arena brawler'
        },
        {
          name: '3k MLV',
          status: 'offline',
          description: 'My Little Vicinity - Cozy multiplayer hub'
        }
      ]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Project request handler - network first with cache fallback
async function handleProjectRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📁 Project request failed, trying cache...');
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline project info
    return new Response(JSON.stringify({
      error: 'Project not available offline',
      offline: true,
      message: 'gunnchAI3k Hub is working offline',
      projects: [
        {
          name: 'FINDS',
          status: 'offline',
          description: 'Shark hotspot forecaster using satellite data'
        },
        {
          name: 'EdgeGesture',
          status: 'offline',
          description: 'On-device ML for fall detection'
        },
        {
          name: 'gunnchAI3k',
          status: 'offline',
          description: 'AI-powered Discord bot with learning system'
        },
        {
          name: 'Portfolio',
          status: 'offline',
          description: 'Your professional portfolio website'
        }
      ]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Static asset handler - cache first
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.log('📱 Static asset not available offline:', request.url);
    return new Response('Asset not available offline', { status: 404 });
  }
}

// Default request handler - network first with cache fallback
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network request failed, trying cache...');
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline hub page
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>gunnchAI3k Hub - Offline</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            color: #4ecdc4;
            text-align: center;
            padding: 2rem;
            margin: 0;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
          }
          h1 { color: #4ecdc4; }
          .offline-features {
            text-align: left;
            margin: 2rem 0;
          }
          .feature {
            padding: 0.5rem 0;
            border-bottom: 1px solid #333;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏠 gunnchAI3k Hub</h1>
          <p>You're currently offline, but your hub is still here!</p>
          
          <div class="offline-features">
            <h3>Available Offline:</h3>
            <div class="feature">🎮 Game launcher</div>
            <div class="feature">📁 Project gallery</div>
            <div class="feature">👤 Profile management</div>
            <div class="feature">⚙️ Settings</div>
            <div class="feature">📱 Hub navigation</div>
          </div>
          
          <p><strong>Your digital home is always accessible!</strong></p>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background sync for hub data
self.addEventListener('sync', (event) => {
  if (event.tag === 'hub-data-sync') {
    event.waitUntil(syncHubData());
  }
});

// Sync hub data when back online
async function syncHubData() {
  console.log('🔄 Syncing hub data...');
  
  try {
    // Sync any pending hub data
    const pendingData = await getPendingHubData();
    
    for (const data of pendingData) {
      await fetch('/api/hub/sync', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Hub data synced successfully');
  } catch (error) {
    console.log('❌ Hub data sync failed:', error);
  }
}

// Get pending hub data from IndexedDB
async function getPendingHubData() {
  // Implementation would depend on your data storage strategy
  return [];
}

// Push notifications for hub updates
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'gunnchAI3k hub update',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View Hub',
          icon: '/icons/view-96x96.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss-96x96.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'gunnchAI3k Hub', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('🏠 gunnchAI3k Hub Service Worker loaded successfully!');