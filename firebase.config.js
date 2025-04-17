import { initializeApp } from "firebase/app";

const firebaseConfig = {
    apiKey: "AIzaSyAqRi9-T-fhE69dVfjkuKYVpHCFac1AUxk",
    authDomain: "recipeapp-db.firebaseapp.com",
    projectId: "recipeapp-db",
    storageBucket: "recipeapp-db.firebasestorage.app",
    messagingSenderId: "368896809211",
    appId: "1:368896809211:ios:615d8b9cce733ccd25385e",
};

const app = initializeApp(firebaseConfig);

export { app };