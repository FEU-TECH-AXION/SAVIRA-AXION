// SAVIRA/web/frontend/public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');


firebase.initializeApp({
  apiKey: "AIzaSyD0pcZwaHFpiiJ1J07BWcxlotC-i58GAVY",
  authDomain: "savira-76e2e.firebaseapp.com",
  projectId: "savira-76e2e",
  storageBucket: "savira-76e2e.firebasestorage.app",
  messagingSenderId: "530604154450",
  appId: "1:530604154450:web:b1a03d0c43ab1b33e2498b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: '/sasha-logo-white.png', 
  });
});