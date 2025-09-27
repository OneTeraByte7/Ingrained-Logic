importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCy8uHLAb1IFZ7VFYKNpJmEhJR56aKI6Ok",
  authDomain: "community-guard-23464.firebaseapp.com",
  projectId: "community-guard-23464",
  storageBucket: "community-guard-23464.firebasestorage.app",
  messagingSenderId: "540945410471",
  appId: "1:540945410471:web:1fdf3cad5de85508c4ee82",
  measurementId: "G-ZJLCZFFVCB"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});