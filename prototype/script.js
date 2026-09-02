// --- Application State and Data Management ---
const APP_STATE = {
    isOnline: false,
    user: { name: "Juan Dela Cruz", id: "2024-00123", role: 'student' },
    activeEvent: { name: "General Assembly 2024", location: "Main Hall", time: "10:00 AM" },
    records: [
        { id: 1, studentId: "2024-00123", studentName: "Juan Dela Cruz", event: "General Assembly 2024", date: "May 20, 2024", time: "10:02 AM", status: "PRESENT", synced: true },
        { id: 2, studentId: "2024-00123", studentName: "Juan Dela Cruz", event: "Orientation 2024", date: "May 15, 2024", time: "09:00 AM", status: "PRESENT", synced: true }
    ]
};

let html5QrCodeScanner = null;
let currentEventId = null;
let currentEventName = null;
let currentEventLocation = null;

// ============================================
// AUTHENTICATION
// ============================================

// Load users from localStorage, or create a default one if empty
function getUsers() {
    let users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    if (users.length === 0) {
        users.push({
            id: "2024-00123",
            name: "Juan Dela Cruz",
            email: "juan@school.com",
            password: "password"
        });
        localStorage.setItem('mock_users', JSON.stringify(users));
    }
    return users;
}

// --- SIGN UP HANDLER ---
function handleSignup(e) {
    e.preventDefault();
    
    const id = document.getElementById('signup-id').value.trim();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-pass').value.trim();
    const confirm = document.getElementById('signup-confirm').value.trim();

    if (!id || !name || !email || !password || !confirm) {
        showToast('Please fill in all fields');
        return;
    }

    if (password !== confirm) {
        showToast('Passwords do not match!');
        document.getElementById('signup-pass').style.borderColor = '#ef4444';
        document.getElementById('signup-confirm').style.borderColor = '#ef4444';
        return;
    }

    document.getElementById('signup-pass').style.borderColor = '';
    document.getElementById('signup-confirm').style.borderColor = '';

    let users = getUsers();
    if (users.find(u => u.id === id)) {
        showToast('Student ID already registered!');
        return;
    }

    users.push({ id, name, email, password });
    localStorage.setItem('mock_users', JSON.stringify(users));
    
    showToast('Account created successfully! Please log in.');
    switchView('view-login');
    document.getElementById('form-signup').reset();
}

// --- STUDENT LOGIN HANDLER ---
function handleStudentLogin(e) {
    e.preventDefault();

    const id = document.getElementById('login-id').value.trim();
    const password = document.getElementById('login-pass').value.trim();

    if (!id || !password) {
        showToast('Please enter your Student ID and Password');
        return;
    }

    const users = getUsers();
    const user = users.find(u => u.id === id && u.password === password);

    if (!user) {
        showToast('Invalid Student ID or Password');
        return;
    }

    APP_STATE.user = { name: user.name, id: user.id, role: 'student' };

    document.getElementById('student-display-name').innerText = user.name;
    document.getElementById('student-display-id').innerText = user.id;

    generateStudentQR();
    renderNav();
    switchView('view-student-dash');
    showToast(`Welcome, ${user.name}!`);
}

// --- ADMIN LOGIN HANDLER ---
function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.querySelector('#view-admin-login input[type="text"]').value.trim();
    const password = document.querySelector('#view-admin-login input[type="password"]').value.trim();

    if (email === 'admin@school.com' && password === 'password') {
        APP_STATE.user.role = 'admin';
        renderNav();
        renderAdminEvents();
        switchView('view-admin-dash');
        showToast('Admin logged in!');
    } else {
        showToast('Invalid admin credentials');
    }
}

// ============================================
// NAVIGATION
// ============================================

// --- ROLE-BASED NAVIGATION ---
function renderNav() {
    const nav = document.getElementById('bottom-nav');
    if (!nav) {
        console.error('Bottom nav element not found!');
        return;
    }
    
    const role = APP_STATE.user.role || 'student';
    let html = '';

    if (role === 'student') {
        html = `
            <button class="nav-item active" onclick="switchView('view-student-dash'); setActiveNav(this)">
                <i class="fa-solid fa-house"></i><span>Home</span>
            </button>
            <button class="nav-item" onclick="switchView('view-records'); setActiveNav(this)">
                <i class="fa-solid fa-clipboard-list"></i><span>Records</span>
            </button>
            <button class="nav-item" onclick="logout()">
                <i class="fa-solid fa-right-from-bracket"></i><span>Logout</span>
            </button>
        `;
    } else if (role === 'admin') {
        html = `
            <button class="nav-item active" onclick="switchView('view-admin-dash'); setActiveNav(this)">
                <i class="fa-solid fa-gauge-high"></i><span>Dashboard</span>
            </button>
            <button class="nav-item" onclick="switchView('view-admin-create-event'); setActiveNav(this)">
                <i class="fa-solid fa-plus-circle"></i><span>Create</span>
            </button>
            <button class="nav-item" onclick="logout()">
                <i class="fa-solid fa-right-from-bracket"></i><span>Logout</span>
            </button>
        `;
    }
    nav.innerHTML = html;
}

// --- LOGOUT ---
function logout() {
    stopQRScanner();
    APP_STATE.user.role = 'student';
    renderNav();
    switchView('view-login');
    showToast('Logged out successfully');
}

// --- VIEW NAVIGATION ---
function switchView(viewId) {
    // Stop scanner if leaving scanner view
    if (viewId !== 'view-scanner') {
        stopQRScanner();
    }
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add("active");
}

function setActiveNav(btnElement) {
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    btnElement.classList.add("active");
}

function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
}

// ============================================
// LOCAL STORAGE
// ============================================

function loadLocalRecords() {
    const stored = localStorage.getItem("attendance_records");
    if (stored) {
        APP_STATE.records = JSON.parse(stored);
    } else {
        saveLocalRecords();
    }
    updateSyncCounters();
}

function saveLocalRecords() {
    localStorage.setItem("attendance_records", JSON.stringify(APP_STATE.records));
    updateSyncCounters();
}

function updateSyncCounters() {
    const unsynced = APP_STATE.records.filter(r => !r.synced).length;
    const pendingEl = document.getElementById("pending-count");
    if (pendingEl) pendingEl.innerText = unsynced;
    
    const totalEl = document.getElementById("total-events");
    const presentEl = document.getElementById("present-count");
    if (totalEl) totalEl.innerText = APP_STATE.records.length;
    if (presentEl) presentEl.innerText = APP_STATE.records.filter(r => r.status === "PRESENT").length;
}

// ============================================
// QR CODE GENERATION (STUDENT)
// ============================================

function generateStudentQR() {
    const studentId = APP_STATE.user.id;
    const img = document.getElementById('student-qr-img');
    const enlargedImg = document.getElementById('enlarged-qr-img');
    const label = document.getElementById('enlarged-qr-label');
    
    if (img) {
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(studentId)}`;
    }
    if (enlargedImg) {
        enlargedImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(studentId)}`;
    }
    if (label) {
        label.innerText = `Student ID: ${studentId}`;
    }
}

function enlargeQR() {
    const modal = document.getElementById('qr-enlarged-modal');
    if (!modal) {
        alert('Modal element not found!');
        return;
    }
    const studentId = APP_STATE.user.id;
    const img = document.getElementById('enlarged-qr-img');
    if (img) {
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(studentId)}`;
    }
    modal.classList.remove('hidden');
}

function closeEnlargedQR() {
    const modal = document.getElementById('qr-enlarged-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// ============================================
// ATTENDANCE RECORDING
// ============================================

// --- RECORD ATTENDANCE (Student scans Event QR) ---
function recordAttendance(eventName, location) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    showToast(`📝 Recording attendance for ${APP_STATE.user.name}...`);

    const newRecord = {
        id: Date.now(),
        studentId: APP_STATE.user.id,
        studentName: APP_STATE.user.name,
        event: eventName || APP_STATE.activeEvent.name,
        date: dateStr,
        time: timeStr,
        status: "PRESENT",
        synced: false
    };

    APP_STATE.records.unshift(newRecord);
    saveLocalRecords();
    renderRecords();
    renderAdminRecent();

    document.getElementById("rec-student").innerText = APP_STATE.user.name;
    document.getElementById("rec-id").innerText = APP_STATE.user.id;
    document.getElementById("rec-event").innerText = newRecord.event;
    document.getElementById("rec-loc").innerText = location || APP_STATE.activeEvent.location;
    document.getElementById("rec-time").innerText = timeStr;

    stopQRScanner();
    switchView("view-success");
    showToast(`✅ ${APP_STATE.user.name} checked in to ${newRecord.event}!`);
}

// --- RECORD ATTENDANCE FOR SPECIFIC EVENT (Admin scans Student) ---
function recordAttendanceForEvent(studentId, studentName, eventName, location) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    showToast(`📝 Recording attendance for ${studentName}...`);

    // 1. Update the event's attendee list
    let events = JSON.parse(localStorage.getItem('events') || '[]');
    const eventIndex = events.findIndex(e => e.name === eventName);
    if (eventIndex !== -1) {
        if (!events[eventIndex].attendees) events[eventIndex].attendees = [];
        const existing = events[eventIndex].attendees.find(a => a.id === studentId);
        if (existing) {
            showToast(`⚠️ ${studentName} already checked in!`);
            stopQRScanner();
            switchView('view-event-detail');
            renderAdminEvents();
            return;
        }
        events[eventIndex].attendees.push({ id: studentId, name: studentName, time: timeStr });
        localStorage.setItem('events', JSON.stringify(events));
        showToast(`✅ ${studentName} added to ${eventName}!`);
    } else {
        showToast(`⚠️ Event "${eventName}" not found`);
        return;
    }

    // 2. Create a record in the global attendance list
    const newRecord = {
        id: Date.now(),
        studentId: studentId,
        studentName: studentName,
        event: eventName,
        date: dateStr,
        time: timeStr,
        status: "PRESENT",
        synced: false
    };

    APP_STATE.records.unshift(newRecord);
    saveLocalRecords();
    renderRecords();
    renderAdminRecent();
    renderAdminEvents();

    document.getElementById("rec-student").innerText = studentName;
    document.getElementById("rec-id").innerText = studentId;
    document.getElementById("rec-event").innerText = eventName;
    document.getElementById("rec-loc").innerText = location || "Unknown";
    document.getElementById("rec-time").innerText = timeStr;

    stopQRScanner();
    switchView("view-success");
    
    // Update DONE button to go back to event detail
    const doneBtn = document.querySelector('#view-success .btn-primary');
    if (doneBtn) {
        doneBtn.onclick = function() {
            if (currentEventName) {
                switchView('view-event-detail');
                refreshEventDetail();
                renderAdminEvents();
            } else {
                switchView('view-student-dash');
            }
        };
    }
}

function refreshEventDetail() {
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const event = events.find(e => e.name === currentEventName);
    if (event) {
        document.getElementById('event-attendee-count').innerText = event.attendees ? event.attendees.length : 0;
        const attendeeList = document.getElementById('event-attendee-list');
        attendeeList.innerHTML = '';
        if (event.attendees && event.attendees.length > 0) {
            event.attendees.forEach(a => {
                const item = document.createElement('div');
                item.className = 'receipt-row';
                item.style.padding = '6px 0';
                item.innerHTML = `<span>${a.name}</span> <strong>${a.time}</strong>`;
                attendeeList.appendChild(item);
            });
        } else {
            attendeeList.innerHTML = '<p class="subtext" style="text-align:center; padding:20px 0;">No students checked in yet</p>';
        }
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderRecords() {
    const list = document.getElementById("records-list");
    if (!list) return;
    list.innerHTML = "";
    APP_STATE.records.forEach(rec => {
        const card = document.createElement("div");
        card.className = "record-card";
        card.innerHTML = `
            <div>
                <strong>${rec.event}</strong>
                <div class="subtext">${rec.studentName || rec.studentId} • ${rec.date} • ${rec.time}</div>
            </div>
            <span class="record-status status-${rec.status.toLowerCase()}">${rec.status} ${rec.synced ? '' : '• Local'}</span>
        `;
        list.appendChild(card);
    });
}

function filterRecords() {
    const query = document.getElementById("record-search").value.toLowerCase();
    const cards = document.querySelectorAll("#records-list .record-card");
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(query) ? "flex" : "none";
    });
}

function renderAdminRecent() {
    const list = document.getElementById("admin-recent-list");
    if (!list) return;
    list.innerHTML = "";
    APP_STATE.records.slice(0, 5).forEach(r => {
        const item = document.createElement("div");
        item.className = "receipt-row";
        item.style.padding = "8px 0";
        item.innerHTML = `<span>${r.studentName || r.studentId}</span> <strong>${r.time} <i class="fa-solid fa-check text-green"></i></strong>`;
        list.appendChild(item);
    });
}

function renderAdminEvents() {
    const list = document.getElementById('admin-events-list');
    if (!list) return;
    
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    
    if (events.length === 0) {
        list.innerHTML = '<p class="subtext" style="text-align:center; padding:20px 0;">No events created yet. Click "Create Event" to add one.</p>';
        return;
    }
    
    list.innerHTML = '';
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'record-card';
        card.style.marginBottom = '10px';
        card.innerHTML = `
            <div>
                <strong>${event.name}</strong>
                <div class="subtext">${event.location} • ${event.date} • ${event.time}</div>
                <div class="subtext" style="font-size:0.75rem; color: var(--purple);">
                    ${event.attendees ? event.attendees.length : 0} students checked in
                </div>
            </div>
            <button class="btn btn-small btn-purple" onclick="openEventDetail(${event.id})">
                <i class="fa-solid fa-qrcode"></i> Manage
            </button>
        `;
        list.appendChild(card);
    });
}

// ============================================
// QR CODE SCANNER
// ============================================

function checkCameraAccess() {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        const notice = document.getElementById("camera-notice");
        if (notice) notice.classList.remove("hidden");
    }
}

function startQRScanner() {
    if (html5QrCodeScanner) return;

    html5QrCodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 180, height: 180 } };

    html5QrCodeScanner.start({ facingMode: "environment" }, config, (decodedText) => {
        recordAttendance(decodedText, "Scanned Location");
    }).catch(() => {
        const notice = document.getElementById("camera-notice");
        if (notice) notice.classList.remove("hidden");
    });
}

function stopQRScanner() {
    if (html5QrCodeScanner) {
        html5QrCodeScanner.stop().then(() => {
            html5QrCodeScanner.clear();
            html5QrCodeScanner = null;
        }).catch(() => { html5QrCodeScanner = null; });
    }
}

// ============================================
// SIMULATE SCANS
// ============================================

function simulateScan() {
    if (currentEventName) {
        simulateEventScan();
        return;
    }
    
    const studentId = APP_STATE.user.id;
    const studentName = APP_STATE.user.name;
    const eventName = APP_STATE.activeEvent.name || "General Assembly 2024";
    const location = APP_STATE.activeEvent.location || "Main Hall";
    
    showToast(`📱 Simulating scan for ${studentName}...`);
    recordAttendance(eventName, location);
}

function simulateEventScan() {
    if (!currentEventName) {
        showToast('❌ No event selected. Please go back and select an event.');
        return;
    }
    
    const studentId = APP_STATE.user.id || "2024-00123";
    const defaultName = APP_STATE.user.name || "Juan Dela Cruz";
    
    const demoName = prompt(
        `📸 Simulating scan for event: "${currentEventName}"\n\nEnter student name:`,
        defaultName
    );
    
    if (demoName === null) {
        showToast('Scan cancelled');
        return;
    }
    
    if (demoName.trim() === '') {
        showToast('Please enter a student name');
        return;
    }
    
    showToast(`✅ Recording attendance for ${demoName.trim()}...`);
    recordAttendanceForEvent(
        studentId, 
        demoName.trim(), 
        currentEventName, 
        currentEventLocation || "Unknown Location"
    );
}

// ============================================
// SYNC
// ============================================

function syncData() {
    showToast("Syncing with central database...");
    setTimeout(() => {
        APP_STATE.records.forEach(r => r.synced = true);
        saveLocalRecords();
        renderRecords();
        renderAdminRecent();
        showToast("✅ Sync Successful!");
    }, 1200);
}

// ============================================
// ADMIN: EVENT MANAGEMENT
// ============================================

function handleCreateEvent(e) {
    e.preventDefault();
    const name = document.getElementById("ev-name").value;
    const loc = document.getElementById("ev-loc").value;
    const date = document.getElementById("ev-date").value;
    const time = document.getElementById("ev-time").value;

    if (!name || !loc || !date || !time) {
        showToast('Please fill in all fields');
        return;
    }

    let events = JSON.parse(localStorage.getItem('events') || '[]');
    const newEvent = {
        id: Date.now(),
        name: name,
        location: loc,
        date: date,
        time: time,
        attendees: []
    };
    events.push(newEvent);
    localStorage.setItem('events', JSON.stringify(events));

    APP_STATE.activeEvent = { name, location: loc, time: `${date} • ${time}` };

    document.getElementById("dash-event-name").innerText = name;
    document.getElementById("dash-event-loc").innerText = loc;
    document.getElementById("dash-event-time").innerText = `${date} • ${time}`;

    showToast(`✅ Event "${name}" created successfully!`);
    switchView('view-admin-dash');
    renderAdminEvents();
    document.getElementById('create-event-form').reset();
}

function openEventDetail(eventId) {
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const event = events.find(e => e.id === eventId);
    if (!event) {
        showToast('Event not found');
        return;
    }
    
    currentEventId = event.id;
    currentEventName = event.name;
    currentEventLocation = event.location;
    
    document.getElementById('event-detail-name').innerText = event.name;
    document.getElementById('event-detail-loc').innerText = event.location;
    document.getElementById('event-detail-time').innerText = `${event.date} • ${event.time}`;
    document.getElementById('event-attendee-count').innerText = event.attendees ? event.attendees.length : 0;
    
    const attendeeList = document.getElementById('event-attendee-list');
    attendeeList.innerHTML = '';
    if (event.attendees && event.attendees.length > 0) {
        event.attendees.forEach(a => {
            const item = document.createElement('div');
            item.className = 'receipt-row';
            item.style.padding = '6px 0';
            item.innerHTML = `<span>${a.name}</span> <strong>${a.time}</strong>`;
            attendeeList.appendChild(item);
        });
    } else {
        attendeeList.innerHTML = '<p class="subtext" style="text-align:center; padding:20px 0;">No students checked in yet</p>';
    }
    
    switchView('view-event-detail');
    showToast(`Managing: ${event.name}`);
}

// --- START EVENT SCANNER ---
function startEventScanner() {
    if (html5QrCodeScanner) {
        showToast('Scanner is already running');
        return;
    }
    
    if (!currentEventName) {
        showToast('No event selected. Please go back and select an event.');
        return;
    }
    
    switchView('view-scanner');
    
    setTimeout(() => {
        html5QrCodeScanner = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 180, height: 180 } };

        html5QrCodeScanner.start({ facingMode: "environment" }, config, (decodedText) => {
            const studentId = decodedText.trim();
            const studentName = prompt(`Enter name for Student ID: ${studentId}`, "Student Name");
            if (studentName !== null && studentName.trim() !== '') {
                recordAttendanceForEvent(studentId, studentName.trim(), currentEventName, currentEventLocation);
            } else {
                showToast('Scan cancelled or invalid name');
                switchView('view-event-detail');
            }
        }).catch((err) => {
            console.error(err);
            document.getElementById("camera-notice").classList.remove("hidden");
            showToast('Camera access failed. Please use the Simulate button below.');
            document.querySelector('.scanner-controls').innerHTML = `
                <button class="btn btn-secondary" onclick="simulateEventScan()">
                    <i class="fa-solid fa-bolt"></i> Simulate Student Scan
                </button>
            `;
        });
    }, 300);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    loadLocalRecords();
    renderRecords();
    renderAdminRecent();
    checkCameraAccess();
    generateStudentQR();
    renderNav();
    renderAdminEvents();
});