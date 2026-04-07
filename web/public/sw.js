// web/public/sw.js

// 1. ÉVÉNEMENTS DE CYCLE DE VIE (Installation & Activation immédiates)
self.addEventListener('install', () => {
  // Force le nouveau service worker à prendre le contrôle immédiatement
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Revendique le contrôle des clients immédiatement après l'activation
  event.waitUntil(clients.claim());
});

// 2. RÉCEPTION DES NOTIFICATIONS PUSH
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  
  // Compatibilité avec les deux formats de payload (direct ou encapsulé dans 'notification')
  const notification = data.notification || data;

  const options = {
    body: notification.body || 'Nouvelle notification',
    // On priorise l'icône fournie, sinon on utilise ton logo lcd par défaut, puis le fallback
    icon: notification.icon || '/assets/images/logolcd.jpg' || '/icon-192x192.png',
    badge: notification.badge || '/badge-72x72.png',
    // On conserve la vibration
    vibrate: notification.vibrate || [100, 50, 100],
    // Options avancées
    tag: notification.tag || 'default',
    requireInteraction: notification.requireInteraction || false,
    actions: notification.actions || [],
    // On fusionne les données personnalisées et l'URL
    data: notification.data || { url: data.url || '/' },
  };

  const title = notification.title || data.title || 'Notification';

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 3. GESTION DU CLIC SUR LA NOTIFICATION
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  
  // 1. Priorité à l'URL fournie directement dans les data
  // 2. Sinon, fallback de base vers /member/notifications
  let urlToOpen = notificationData.url || '/member/notifications';

  // Redirection intelligente selon le type (si aucune URL spécifique n'a été forcée)
  if (!notificationData.url) {
    if (notificationData?.type === 'CONTRIBUTION') {
      urlToOpen = '/member/contributions';
    } else if (notificationData?.type === 'PROJECT') {
      urlToOpen = '/member/projets';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, on la focus
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon on ouvre une nouvelle fenêtre avec la bonne URL
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 4. GESTION DU DÉSABONNEMENT OU EXPIRATION
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // Notifie le backend du changement pour mettre à jour la base de données
        return fetch('/api/member/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      })
  );
});