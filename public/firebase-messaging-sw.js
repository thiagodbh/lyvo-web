importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAMjEvIi1LIMXMxYPfaB6-042hs8bApK2k",
  authDomain: "lyvo-web.firebaseapp.com",
  projectId: "lyvo-web",
  storageBucket: "lyvo-web.firebasestorage.app",
  messagingSenderId: "501648718670",
  appId: "1:501648718670:web:cc5a8e6e2119cc8222bc1f",
});

const messaging = firebase.messaging();

// Recebe notificações quando o app está em background ou fechado
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Lyvo';
  const body = payload.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.eventId || 'lyvo-reminder',
    requireInteraction: false,
    data: payload.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
