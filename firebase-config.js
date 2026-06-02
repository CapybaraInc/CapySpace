// Инициализация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCDqJL5NZ7pSXzjCrL6LtxkPPhetDOeqI4",
  authDomain: "capyspace-f7e08.firebaseapp.com",
  projectId: "capyspace-f7e08",
  storageBucket: "capyspace-f7e08.firebasestorage.app",
  messagingSenderId: "303562964425",
  appId: "1:303562964425:web:84be04f79d102a1144fc18",
  measurementId: "G-JNLGZG4Q56"
};

// Инициализируем приложение
firebase.initializeApp(firebaseConfig);

// Подключаем модули
const auth = firebase.auth();       // <- Добавили
const db = firebase.database();     // База данных
const storage = firebase.storage(); // Хранилище
