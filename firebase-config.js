import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9rygaXDBe-PX-CVsAIPN0IsLQjBcN2ZE",
  authDomain: "calendario-9cb43.firebaseapp.com",
  projectId: "calendario-9cb43",
  storageBucket: "calendario-9cb43.firebasestorage.app",
  messagingSenderId: "958576227355",
  appId: "1:958576227355:web:a728c74510bcb511a934be"
};

let app, auth, db;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Error al inicializar Firebase.", error);
}

// Correo del Administrador Principal (Super Admin)
const SUPER_ADMIN_EMAIL = "pruebasyvm471@gmail.com";

export { auth, db, SUPER_ADMIN_EMAIL };
