import { auth } from './firebase-config.js';
import { getOrRegisterUser, subscribeToCurrentUserProfile } from './database.js';
import { 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// DOM Elements - Screens
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const pendingScreen = document.getElementById('pending-screen');

// DOM Elements - UI
const btnLogin = document.getElementById('btn-login-google');
const btnLogoutApp = document.getElementById('btn-logout');
const btnLogoutPending = document.getElementById('btn-logout-pending');
const userNameEl = document.getElementById('user-name');
const userPhotoEl = document.getElementById('user-photo');

// Estado global de usuario en DB
export let currentUserProfile = null;

// Callbacks para notificar a app.js
const onApproveCallbacks = [];
export function onUserApproved(callback) {
    onApproveCallbacks.push(callback);
}
export function onUserLogout(callback) {
    // Callback if needed for cleanup
}

// Inicializar Google Auth Provider
const provider = new GoogleAuthProvider();

// Iniciar sesión
btnLogin.addEventListener('click', async () => {
    try {
        if (!auth) {
            alert("Firebase no está configurado correctamente.");
            return;
        }
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error en inicio de sesión:", error);
    }
});

// Cerrar sesión
const handleLogout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
};

btnLogoutApp?.addEventListener('click', handleLogout);
btnLogoutPending?.addEventListener('click', handleLogout);

let profileSubscription = null;

// Escuchar cambios en el estado de autenticación (Google Auth)
if (auth) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Se logueó con Google, ahora buscar o registrar en Base de Datos
            loginScreen.classList.remove('active');
            
            // Mostrar un loading si quisiéramos, pero pasamos directo
            const initialProfile = await getOrRegisterUser(user);
            
            if (profileSubscription) profileSubscription(); // clean previous
            
            // Suscribirse a cambios en su propio documento
            profileSubscription = subscribeToCurrentUserProfile(user.uid, (updatedProfile) => {
                if (!updatedProfile) {
                    // El admin lo eliminó de la BD
                    handleLogout();
                    return;
                }
                
                currentUserProfile = updatedProfile;
                
                // Evaluar el rol
                if (updatedProfile.role === 'pending') {
                    // Pantalla de espera
                    appScreen.classList.remove('active');
                    pendingScreen.classList.add('active');
                } else {
                    // admin, editor o viewer -> Tienen acceso a la app
                    pendingScreen.classList.remove('active');
                    appScreen.classList.add('active');
                    
                    // Actualizar UI
                    if(userNameEl) userNameEl.textContent = updatedProfile.name;
                    if(userPhotoEl) userPhotoEl.src = updatedProfile.photo || 'https://via.placeholder.com/48';
                    
                    // Notificar a app.js que cargue los datos (pasando el profile para saber permisos)
                    onApproveCallbacks.forEach(cb => cb(updatedProfile));
                }
            });
            
        } else {
            // No hay usuario de Google logueado
            if (profileSubscription) {
                profileSubscription();
                profileSubscription = null;
            }
            currentUserProfile = null;
            
            // Mostrar pantalla de login
            appScreen.classList.remove('active');
            if(pendingScreen) pendingScreen.classList.remove('active');
            loginScreen.classList.add('active');
        }
    });
}
