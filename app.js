import { currentUserProfile, onUserApproved } from './auth.js';
import { 
    addCategory, 
    subscribeToCategories, 
    deleteCategory,
    addEvent,
    updateEvent,
    deleteEvent,
    subscribeToEvents,
    subscribeToAllUsers,
    updateUserRole,
    deleteUserAccess
} from './database.js';

// DOM Elements - Calendar
const monthYearEl = document.getElementById('current-month-year');
const calendarDaysEl = document.getElementById('calendar-days');
const btnPrevMonth = document.getElementById('btn-prev-month');
const btnNextMonth = document.getElementById('btn-next-month');
const btnToday = document.getElementById('btn-today');

// Modals
const eventModal = document.getElementById('event-modal');
const categoryModal = document.getElementById('category-modal');
const usersModal = document.getElementById('users-modal');
const btnCloseEventModal = document.getElementById('btn-close-event-modal');
const btnCloseCategoryModal = document.getElementById('btn-close-category-modal');
const btnCloseUsersModal = document.getElementById('btn-close-users-modal');
const btnCancelEvent = document.querySelector('.cancel-btn');

// Forms & Inputs
const eventForm = document.getElementById('event-form');
const btnNewEvent = document.getElementById('btn-new-event');
const btnManageCategories = document.getElementById('btn-manage-categories');
const btnManageUsers = document.getElementById('btn-manage-users');
const categoryForm = document.getElementById('category-form');
const categoryListEl = document.getElementById('category-list');
const eventCategorySelect = document.getElementById('event-category');
const btnDeleteEvent = document.getElementById('btn-delete-event');
const eventModalTitle = document.getElementById('event-modal-title');
const btnSaveEvent = document.getElementById('btn-save-event');

// Admin Panel Elements
const manageCategoryListEl = document.getElementById('manage-category-list');
const pendingUsersList = document.getElementById('pending-users-list');
const activeUsersList = document.getElementById('active-users-list');
const pendingBadge = document.getElementById('pending-badge');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// App State
let currentDate = new Date();
let categories = [];
let events = [];
let allUsers = [];
let unsubCategories = null;
let unsubEvents = null;
let unsubUsers = null;

// Initialization when user logs in AND is approved (admin, editor, or viewer)
onUserApproved((profile) => {
    // Restringir UI según rol
    setupRolePermissions(profile.role);

    // Cleanup previous subscriptions if any
    if (unsubCategories) unsubCategories();
    if (unsubEvents) unsubEvents();
    if (unsubUsers) unsubUsers();

    // Subscribe to shared categories
    unsubCategories = subscribeToCategories((newCategories) => {
        categories = newCategories;
        renderCategoryLists();
        renderCalendar();
    });

    // Subscribe to shared events
    unsubEvents = subscribeToEvents((newEvents) => {
        events = newEvents;
        renderCalendar();
    });

    // Si es admin, cargar la lista de usuarios
    if (profile.role === 'admin') {
        unsubUsers = subscribeToAllUsers((usersData) => {
            allUsers = usersData;
            renderAdminUsersPanel();
        });
    }

    renderCalendar();
});

// === Roles & Permissions ===
function setupRolePermissions(role) {
    if (role === 'admin') {
        btnNewEvent.classList.remove('hidden');
        btnManageCategories.classList.remove('hidden');
        btnManageUsers.classList.remove('hidden');
        btnSaveEvent.disabled = false;
    } else if (role === 'editor') {
        btnNewEvent.classList.remove('hidden');
        btnManageCategories.classList.add('hidden'); // Solo admin gestiona cats
        btnManageUsers.classList.add('hidden');
        btnSaveEvent.disabled = false;
    } else if (role === 'viewer') {
        btnNewEvent.classList.add('hidden');
        btnManageCategories.classList.add('hidden');
        btnManageUsers.classList.add('hidden');
        btnSaveEvent.disabled = true; // No puede guardar
        btnDeleteEvent.classList.add('hidden'); // No puede borrar
    }
}

// === Calendar Logic ===
function renderCalendar() {
    calendarDaysEl.innerHTML = '';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthYearEl.textContent = `${monthNames[month]} ${year}`;

    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('day', 'empty');
        calendarDaysEl.appendChild(emptyDiv);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }

        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(i).padStart(2, '0');
        const dateString = `${year}-${monthStr}-${dayStr}`;
        dayDiv.dataset.date = dateString;

        const numberSpan = document.createElement('span');
        numberSpan.classList.add('day-number');
        numberSpan.textContent = i;
        dayDiv.appendChild(numberSpan);

        dayDiv.addEventListener('click', (e) => {
            if(e.target.classList.contains('event-badge')) return;
            if(currentUserProfile?.role !== 'viewer') {
                openEventModal(dateString);
            }
        });

        const dayEvents = events.filter(e => e.date === dateString);
        dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

        dayEvents.forEach(evt => {
            const cat = categories.find(c => c.id === evt.categoryId);
            const color = cat ? cat.color : 'var(--accent-primary)';
            
            const badge = document.createElement('div');
            badge.classList.add('event-badge');
            badge.style.backgroundColor = color;
            badge.textContent = `${evt.startTime} ${evt.title}`;
            badge.title = evt.title;
            
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                openEventModal(null, evt);
            });

            dayDiv.appendChild(badge);
        });

        calendarDaysEl.appendChild(dayDiv);
    }
}

// Navigation
btnPrevMonth.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
btnNextMonth.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
btnToday.addEventListener('click', () => { currentDate = new Date(); renderCalendar(); });

// === Category Logic ===
function renderCategoryLists() {
    categoryListEl.innerHTML = '';
    categories.forEach(cat => {
        const li = document.createElement('li');
        li.classList.add('category-item');
        li.innerHTML = `<span class="category-color" style="background-color: ${cat.color}; color: ${cat.color};"></span>${cat.name}`;
        categoryListEl.appendChild(li);
    });

    const currentSelectVal = eventCategorySelect.value;
    eventCategorySelect.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        eventCategorySelect.appendChild(option);
    });
    if (categories.some(c => c.id === currentSelectVal)) {
        eventCategorySelect.value = currentSelectVal;
    } else if (categories.length > 0) {
        eventCategorySelect.value = categories[0].id;
    }

    manageCategoryListEl.innerHTML = '';
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.classList.add('manage-category-item');
        div.innerHTML = `
            <div class="cat-info">
                <span class="category-color" style="background-color: ${cat.color}; color: ${cat.color};"></span>
                <span>${cat.name}</span>
            </div>
            <button class="btn-icon small text-danger btn-del-cat" data-id="${cat.id}"><i class="fa-solid fa-trash"></i></button>
        `;
        manageCategoryListEl.appendChild(div);
    });

    document.querySelectorAll('.btn-del-cat').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm("¿Eliminar esta categoría?")) {
                await deleteCategory(id);
            }
        });
    });
}

categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserProfile?.role !== 'admin') return;
    
    const name = document.getElementById('new-category-name').value;
    const color = document.getElementById('new-category-color').value;
    
    if (name && color) {
        await addCategory(name, color);
        categoryForm.reset();
        document.getElementById('new-category-color').value = '#00f2fe';
    }
});

// === Modals Logic ===
btnManageCategories.addEventListener('click', () => categoryModal.classList.remove('hidden'));
btnCloseCategoryModal.addEventListener('click', () => categoryModal.classList.add('hidden'));

btnManageUsers.addEventListener('click', () => usersModal.classList.remove('hidden'));
btnCloseUsersModal.addEventListener('click', () => usersModal.classList.add('hidden'));

btnNewEvent.addEventListener('click', () => openEventModal());
btnCloseEventModal.addEventListener('click', () => eventModal.classList.add('hidden'));
btnCancelEvent.addEventListener('click', () => eventModal.classList.add('hidden'));

function openEventModal(dateStr = null, existingEvent = null) {
    if (categories.length === 0 && currentUserProfile?.role !== 'viewer') {
        alert("Pídele al administrador que cree una categoría primero.");
        return;
    }

    eventForm.reset();
    document.getElementById('event-id').value = '';
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    
    document.getElementById('event-date').value = dateStr || todayStr;
    if (categories.length > 0) {
        document.getElementById('event-category').value = categories[0].id;
    }

    if (existingEvent) {
        eventModalTitle.textContent = currentUserProfile?.role === 'viewer' ? "Detalles del Evento" : "Editar Evento";
        document.getElementById('event-id').value = existingEvent.id;
        document.getElementById('event-title').value = existingEvent.title;
        document.getElementById('event-date').value = existingEvent.date;
        document.getElementById('event-time-start').value = existingEvent.startTime;
        document.getElementById('event-time-end').value = existingEvent.endTime;
        document.getElementById('event-category').value = existingEvent.categoryId;
        document.getElementById('event-desc').value = existingEvent.description || '';
        
        if(currentUserProfile?.role !== 'viewer') {
            btnDeleteEvent.classList.remove('hidden');
        }
    } else {
        eventModalTitle.textContent = "Nuevo Evento";
        btnDeleteEvent.classList.add('hidden');
    }

    // Disable form fields if viewer
    const isViewer = currentUserProfile?.role === 'viewer';
    document.querySelectorAll('#event-form input, #event-form select, #event-form textarea').forEach(el => {
        el.disabled = isViewer;
    });

    eventModal.classList.remove('hidden');
}

// Event Form Submit
eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserProfile?.role === 'viewer') return;

    const eventId = document.getElementById('event-id').value;
    const eventData = {
        title: document.getElementById('event-title').value,
        date: document.getElementById('event-date').value,
        startTime: document.getElementById('event-time-start').value,
        endTime: document.getElementById('event-time-end').value,
        categoryId: document.getElementById('event-category').value,
        description: document.getElementById('event-desc').value
    };

    if (eventId) {
        await updateEvent(eventId, eventData);
    } else {
        await addEvent(eventData);
    }
    eventModal.classList.add('hidden');
});

// Delete Event
btnDeleteEvent.addEventListener('click', async () => {
    const eventId = document.getElementById('event-id').value;
    if (eventId && confirm("¿Estás seguro de eliminar este evento?")) {
        await deleteEvent(eventId);
        eventModal.classList.add('hidden');
    }
});


// === ADMIN: User Management Logic ===
// Tabs
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

function renderAdminUsersPanel() {
    pendingUsersList.innerHTML = '';
    activeUsersList.innerHTML = '';

    const pendingUsers = allUsers.filter(u => u.role === 'pending');
    const activeUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'editor' || u.role === 'viewer');

    // Actualizar badge
    pendingBadge.textContent = pendingUsers.length;
    if (pendingUsers.length === 0) pendingBadge.classList.add('hidden');
    else pendingBadge.classList.remove('hidden');

    // Render Pendientes
    if (pendingUsers.length === 0) {
        pendingUsersList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No hay solicitudes pendientes.</p>';
    } else {
        pendingUsers.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="user-card-info">
                    <img src="${user.photo || 'https://via.placeholder.com/40'}" alt="Foto">
                    <div>
                        <span class="user-card-name">${user.name}</span>
                        <span class="user-card-email">${user.email}</span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn-primary small btn-approve" data-uid="${user.uid}">Aprobar</button>
                    <button class="btn-danger small btn-reject" data-uid="${user.uid}">Rechazar</button>
                </div>
            `;
            pendingUsersList.appendChild(card);
        });
    }

    // Render Activos
    activeUsers.forEach(user => {
        const isAdmin = user.role === 'admin';
        const card = document.createElement('div');
        card.className = 'user-card';
        card.innerHTML = `
            <div class="user-card-info">
                <img src="${user.photo || 'https://via.placeholder.com/40'}" alt="Foto">
                <div>
                    <span class="user-card-name">${user.name} ${isAdmin ? '<span style="color:var(--accent-primary);font-size:0.8em;">(Admin)</span>' : ''}</span>
                    <span class="user-card-email">${user.email}</span>
                </div>
            </div>
            <div class="user-actions">
                ${!isAdmin ? `
                    <select class="select-role role-changer" data-uid="${user.uid}">
                        <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor</option>
                        <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Solo Lectura</option>
                    </select>
                    <button class="btn-danger small btn-reject" data-uid="${user.uid}" title="Revocar acceso"><i class="fa-solid fa-ban"></i></button>
                ` : '<span>Propietario</span>'}
            </div>
        `;
        activeUsersList.appendChild(card);
    });

    // Event Listeners for Admin actions
    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const uid = e.target.dataset.uid;
            // Por defecto, aprobamos como "viewer". El admin puede cambiarlo luego en la otra pestaña.
            await updateUserRole(uid, 'viewer');
        });
    });

    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const uid = e.target.closest('button').dataset.uid;
            if (confirm("¿Estás seguro de denegar/eliminar el acceso a este usuario?")) {
                await deleteUserAccess(uid);
            }
        });
    });

    document.querySelectorAll('.role-changer').forEach(select => {
        select.addEventListener('change', async (e) => {
            const uid = e.target.dataset.uid;
            const newRole = e.target.value;
            await updateUserRole(uid, newRole);
        });
    });
}
