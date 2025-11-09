importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAzuGsd4YmmrdagwR9ncRW4jg6P4ZCH7Qk',
  authDomain: 'vaichover-b3c07.firebaseapp.com',
  projectId: 'vaichover-b3c07',
  storageBucket: 'vaichover-b3c07.firebasestorage.app',
  messagingSenderId: '253610691487',
  appId: '1:253610691487:web:6b9678db73d323247d4baa',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Será que vai chover?'
  const notificationOptions = {
    body:
      payload.notification?.body ||
      'Abra o app para conferir a previsão detalhada e descobrir se precisa de guarda-chuva.',
    icon: payload.notification?.icon || '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.fcmOptions?.link || '/',
    tag: 'vaichover-alert',
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destination = event.notification.data || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const matchingClient = clientList.find((client) => client.url === destination)
      if (matchingClient) {
        return matchingClient.focus()
      }
      return clients.openWindow(destination)
    }),
  )
})
