const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "kacau-bazaar.firebaseapp.com",
    databaseURL: "https://kacau-bazaar-default-rtdb.firebaseio.com",
    projectId: "kacau-bazaar",
    storageBucket: "kacau-bazaar.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();