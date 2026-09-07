/* eslint-disable no-undef */
/* Service worker de push (FCM). Gerado no build a partir deste modelo; os valores
 * __FIREBASE_CONFIG__ vêm das variáveis VITE_FIREBASE_* (vite.config.js). */
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

firebase.initializeApp(__FIREBASE_CONFIG__);
const messaging = firebase.messaging();

// Mensagem recebida com o app fechado / em segundo plano
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const d = payload.data || {};
  const titulo = n.title || 'DEMOP GOCG';
  const opcoes = {
    body: n.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: d.conversaId ? `conv-${d.conversaId}` : 'demop',
    renotify: true,
    data: { url: d.url || '/mensagens' },
  };
  self.registration.showNotification(titulo, opcoes);
});

// Toque na notificação abre (ou foca) o app na conversa
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/mensagens';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      return clients.openWindow(url);
    })
  );
});
