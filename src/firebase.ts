import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  projectId: 'beer-vote-82320',
  appId: '1:850250983879:web:4584b29cb204a06e2b51e2',
  storageBucket: 'beer-vote-82320.firebasestorage.app',
  apiKey: 'AIzaSyBlD2v94aBtA0Z7mLntrR_Y8-wmMnCce5E',
  authDomain: 'beer-vote-82320.firebaseapp.com',
  messagingSenderId: '850250983879',
  measurementId: 'G-6NK15VF2ML',
};

const app = initializeApp(firebaseConfig);

export { app };
