const firebaseConfig = {
  apiKey: "AIzaSyDMMu-QNPL6RlGYdGGQVJLzZqCC_hsLa8I",
  authDomain: "night-ac2a0.firebaseapp.com",
  databaseURL: "https://night-ac2a0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "night-ac2a0",
  storageBucket: "night-ac2a0.appspot.com",
  messagingSenderId: "202751732517",
  appId: "1:202751732517:web:5d458d19aac8d7135848cc"
};

// ✅ تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// ✅ قاعدة البيانات
const db = firebase.database();

// ✅ الرسائل (إذا كان مدعومًا على المتصفح)
let messaging = null;
if (firebase.messaging.isSupported()) {
  messaging = firebase.messaging();
}
