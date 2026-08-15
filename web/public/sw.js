// web/public/sw.js

// 1. ÉVÉNEMENTS DE CYCLE DE VIE (Installation & Activation immédiates)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
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
    // 🔥 CORRIGÉ : plus de repli forcé sur le logo LCD (bug de code mort en
    // plus — le fallback derrière un OR sur une chaîne non-vide n'était
    // jamais atteint). Si le backend n'a pas fourni d'icône, le navigateur
    // affiche son icône par défaut plutôt qu'un logo qui n'a de sens que
    // pour une seule association.
    icon: notification.icon || '/icon-192x192.png',
    badge: notification.badge,
    vibrate: notification.vibrate || [100, 50, 100],
    tag: notification.tag || 'default',
    requireInteraction: notification.requireInteraction || false,
    actions: notification.actions || [],
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

  let urlToOpen = notificationData.url || '/member/notifications';

  if (!notificationData.url) {
    if (notificationData?.type === 'CONTRIBUTION') {
      urlToOpen = '/member/contributions';
    } else if (notificationData?.type === 'PROJECT') {
      urlToOpen = '/member/projets';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
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
        return fetch('/api/member/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      })
  );
});