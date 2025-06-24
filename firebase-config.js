const firebaseConfig = {
  apiKey: "AIzaSyDMMu-QNPL6RlGYdGGQVJLzZqCC_hsLa8I",
  authDomain: "night-ac2a0.firebaseapp.com",
  databaseURL: "https://night-ac2a0-default-rtdb.firebaseio.com", // ← أضف هذا السطر
  projectId: "night-ac2a0",
  storageBucket: "night-ac2a0.firebasestorage.app",
  messagingSenderId: "202751732517",
  appId: "1:202751732517:web:5d458d19aac8d7135848cc"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
