import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCy8uHLAb1IFZ7VFYKNpJmEhJR56aKI6Ok",
  authDomain: "community-guard-23464.firebaseapp.com",
  projectId: "community-guard-23464",
  storageBucket: "community-guard-23464.firebasestorage.app",
  messagingSenderId: "540945410471",
  appId: "1:540945410471:web:1fdf3cad5de85508c4ee82",
  measurementId: "G-ZJLCZFFVCB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

export const getFCMToken = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
    });
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });