importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCQLpXGdAjwBG2_5wZFiE44lkYThPqLh9o",
  authDomain: "task-molly.firebaseapp.com",
  projectId: "task-molly",
  storageBucket: "task-molly.firebasestorage.app",
  messagingSenderId: "868862767243",
  appId: "1:868862767243:web:a6000dc4bf78bd0aafa48e"
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
