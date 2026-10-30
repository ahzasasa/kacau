const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "kacau-bazar-437b6.firebaseapp.com",
    databaseURL: "https://kacau-bazar-437b6-default-rtdb.firebaseio.com",
    projectId: "kacau-bazar-437b6",
    storageBucket: "kacau-bazar-437b6.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();