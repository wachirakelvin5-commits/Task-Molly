importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC5O1XN5aWK-G9UabibbvNaa4o1HNlv-d8",
  authDomain: "gen-lang-client-0157826223.firebaseapp.com",
  projectId: "gen-lang-client-0157826223",
  storageBucket: "gen-lang-client-0157826223.firebasestorage.app",
  messagingSenderId: "69431435522",
  appId: "1:69431435522:web:a008d038305d932d29a21b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
