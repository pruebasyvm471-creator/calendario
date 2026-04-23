import { db, SUPER_ADMIN_EMAIL } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs,
    getDoc,
    setDoc,
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// === Funciones para Usuarios ===

// Obtener o registrar un usuario
export async function getOrRegisterUser(authUser) {
    if (!db) return null;
    
    const userRef = doc(db, "users", authUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return { uid: authUser.uid, ...userSnap.data() };
    } else {
        // Nuevo usuario
        // Si es el super admin configurado, rol admin. Si no, pendiente.
        const isSuperAdmin = authUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        
        const newUserData = {
            email: authUser.email,
            name: authUser.displayName || 'Usuario',
            photo: authUser.photoURL || '',
            role: isSuperAdmin ? 'admin' : 'pending',
            createdAt: new Date().toISOString()
        };
        
        await setDoc(userRef, newUserData);
        return { uid: authUser.uid, ...newUserData };
    }
}

// Escuchar cambios en el perfil del usuario actual (por si le aprueban el acceso)
export function subscribeToCurrentUserProfile(uid, callback) {
    if (!db) return () => {};
    return onSnapshot(doc(db, "users", uid), (doc) => {
        if (doc.exists()) {
            callback({ uid: doc.id, ...doc.data() });
        } else {
            callback(null);
        }
    });
}

// Administrador: Obtener lista de todos los usuarios
export function subscribeToAllUsers(callback) {
    if (!db) return () => {};
    return onSnapshot(collection(db, "users"), (snapshot) => {
        const users = [];
        snapshot.forEach((doc) => {
            users.push({ uid: doc.id, ...doc.data() });
        });
        callback(users);
    });
}

// Administrador: Cambiar rol de usuario (aprobar o cambiar permisos)
export async function updateUserRole(uid, newRole) {
    if (!db) return;
    try {
        await updateDoc(doc(db, "users", uid), { role: newRole });
    } catch (e) {
        console.error("Error al actualizar rol", e);
    }
}

// Administrador: Eliminar a un usuario por completo
export async function deleteUserAccess(uid) {
    if (!db) return;
    try {
        await deleteDoc(doc(db, "users", uid));
    } catch (e) {
        console.error("Error al eliminar usuario", e);
    }
}

// === Funciones para Categorías (Comunes a todos los usuarios aprobados) ===
// Ahora las categorías no pertenecen a un "userId" específico, sino que son globales del calendario
export async function addCategory(name, color) {
    if (!db) return null;
    try {
        const docRef = await addDoc(collection(db, "categories"), {
            name: name,
            color: color
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding category: ", e);
        return null;
    }
}

export function subscribeToCategories(callback) {
    if (!db) return () => {};
    return onSnapshot(collection(db, "categories"), (snapshot) => {
        const categories = [];
        snapshot.forEach((doc) => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        callback(categories);
    });
}

export async function deleteCategory(id) {
    if (!db) return;
    try {
        await deleteDoc(doc(db, "categories", id));
    } catch (e) {
        console.error("Error deleting category: ", e);
    }
}

// === Funciones para Eventos (Comunes a todos los usuarios aprobados) ===
export async function addEvent(eventData) {
    if (!db) return null;
    try {
        const docRef = await addDoc(collection(db, "events"), {
            ...eventData
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding event: ", e);
        return null;
    }
}

export async function updateEvent(eventId, eventData) {
    if (!db) return;
    try {
        await updateDoc(doc(db, "events", eventId), eventData);
    } catch (e) {
        console.error("Error updating event: ", e);
    }
}

export async function deleteEvent(eventId) {
    if (!db) return;
    try {
        await deleteDoc(doc(db, "events", eventId));
    } catch (e) {
        console.error("Error deleting event: ", e);
    }
}

export function subscribeToEvents(callback) {
    if (!db) return () => {};
    return onSnapshot(collection(db, "events"), (snapshot) => {
        const events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        callback(events);
    });
}
