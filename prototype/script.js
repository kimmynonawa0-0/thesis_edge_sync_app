/* ================================================================
   APPLICATION STATE
================================================================ */
const APP_STATE = {
    isOnline: false,
    isLoggedIn: false,          // ✅ track login status
    user: { name: "Juan Dela Cruz", id: "2024-00123", role: 'student' },
    activeEvent: { name: "General Assembly 2024", location: "Main Hall", time: "10:00 AM" },
    records: []
};

let html5QrCodeScanner = null;
let currentEventId = null;
let currentEventName = null;
let currentEventLocation = null;

/* ================================================================
   LOCAL STORAGE HELPERS
================================================================ */
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

function loadLocalRecords() {
    const stored = localStorage.getItem("attendance_records");
    if (stored) {
        APP_STATE.records = JSON.parse(stored);
    } else {
        APP_STATE.records = [];
        saveLocalRecords();
    }
    updateCounters();
}

function saveLocalRecords() {
    localStorage.setItem("attendance_records", JSON.stringify(APP_STATE.records));
    updateCounters();
}

function updateCounters() {
    const unsynced = APP_STATE.records.filter(r => !r.synced).length;
    const pendingEl = document.getElementById("pending-count");
    if (pendingEl) pendingEl.innerText = unsynced;

    const totalEl = document.getElementById("total-events");
    const presentEl = document.getElementById("present-count");
    const absentEl = document.getElementById("absent-count");
    const rateEl = document.getElementById("attendance-rate");

    const total = APP_STATE.records.length;
    const present = APP_STATE.records.filter(r => r.status === "PRESENT").length;
    const absent = total - present;
    const rate = total === 0 ? 0 : Math.round((present / total) * 100);

    if (totalEl) totalEl.innerText = total;
    if (presentEl) presentEl.innerText = present;
    if (absentEl) absentEl.innerText = absent;
    if (rateEl) rateEl.innerText = rate + '%';

    // Admin metrics
    const adminTotal = document.getElementById("admin-total-val");
    const adminPresent = document.getElementById("admin-present-val");
    if (adminTotal) adminTotal.innerText = total;
    if (adminPresent) adminPresent.innerText = present;
}

/* ================================================================
   TOAST
================================================================ */
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.remove("hidden");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add("hidden"), 3000);
}

/* ================================================================
   UPDATE NAV VISIBILITY (NEW)
================================================================ */
function updateNavVisibility(viewId) {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;
    const authViews = ['view-login', 'view-signup', 'view-admin-login'];
    if (authViews.includes(viewId) || !APP_STATE.isLoggedIn) {
        nav.style.display = 'none';
    } else {
        nav.style.display = 'flex';
    }
}

/* ================================================================
   VIEW NAVIGATION (updated)
================================================================ */
function switchView(viewId) {
    if (viewId !== 'view-scanner') {
        stopQRScanner();
    }
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const target = document.getElementById(viewId);
    if (target) target.classList.add("active");

    // ✅ Show/hide bottom nav based on view and login status
    updateNavVisibility(viewId);
}

function setActiveNav(btn) {
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    btn.classList.add("active");
}

function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}

/* ================================================================
   AUTHENTICATION
================================================================ */
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

    const users = getUsers();
    if (users.find(u => u.id === id)) {
        showToast('Student ID already registered!');
        return;
    }
    users.push({ id, name, email, password });
    localStorage.setItem('mock_users', JSON.stringify(users));
    showToast('Account created! Please log in.');
    switchView('view-login');
    document.getElementById('form-signup').reset();
}

function handleStudentLogin(e) {
    e.preventDefault();
    const id = document.getElementById('login-id').value.trim();
    const password = document.getElementById('login-pass').value.trim();

    if (!id || !password) {
        showToast('Please enter Student ID and Password');
        return;
    }
    const users = getUsers();
    const user = users.find(u => u.id === id && u.password === password);
    if (!user) {
        showToast('Invalid Student ID or Password');
        return;
    }

    APP_STATE.isLoggedIn = true;   // ✅ set logged in
    APP_STATE.user = { name: user.name, id: user.id, role: 'student' };
    document.getElementById('student-display-name').innerText = user.name;
    document.getElementById('student-display-id').innerText = user.id;

    generateStudentQR();
    renderNav();
    loadLocalRecords();
    renderRecords();
    renderAdminRecent();
    switchView('view-student-dash');
    showToast(`Welcome, ${user.name}!`);
}

function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-pass').value.trim();

    if (email === 'admin@school.com' && password === 'password') {
        APP_STATE.isLoggedIn = true;   // ✅ set logged in
        APP_STATE.user.role = 'admin';
        renderNav();
        loadLocalRecords();
        renderAdminEvents();
        renderAdminRecent();
        switchView('view-admin-dash');
        showToast('Admin logged in!');
    } else {
        showToast('Invalid admin credentials');
    }
}

/* ================================================================
   CUSTOM CONFIRMATION DIALOG
================================================================ */
function showConfirmDialog(message, onConfirm, onCancel) {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');

    msgEl.innerText = message;

    const newOk = okBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newOk.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (onConfirm) onConfirm();
    });
    newCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (onCancel) onCancel();
    });

    modal.classList.remove('hidden');
}

/* ================================================================
   LOGOUT (updated)
================================================================ */
function logout() {
    showConfirmDialog('Are you sure you want to logout?', () => {
        stopQRScanner();
        APP_STATE.isLoggedIn = false;   // ✅ set logged out
        APP_STATE.user.role = 'student';
        renderNav();                    // will hide nav
        switchView('view-login');
        showToast('Logged out');
    }, () => {
        showToast('Logout cancelled');
    });
}

/* ================================================================
   NAVIGATION BAR
================================================================ */
function renderNav() {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;
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
    // ✅ Show nav only if logged in
    nav.style.display = APP_STATE.isLoggedIn ? 'flex' : 'none';
}

/* ================================================================
   QR CODE GENERATION (Student)
================================================================ */
function generateStudentQR() {
    const id = APP_STATE.user.id || '2024-00123';
    const img = document.getElementById('student-qr-img');
    const enlarged = document.getElementById('enlarged-qr-img');
    const label = document.getElementById('enlarged-qr-label');
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(id)}`;
    const urlBig = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(id)}`;
    if (img) img.src = url;
    if (enlarged) enlarged.src = urlBig;
    if (label) label.innerText = `Student ID: ${id}`;
}

function enlargeQR() {
    const modal = document.getElementById('qr-enlarged-modal');
    if (!modal) return;
    const id = APP_STATE.user.id || '2024-00123';
    const img = document.getElementById('enlarged-qr-img');
    if (img) {
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(id)}`;
    }
    modal.classList.remove('hidden');
}

function closeEnlargedQR() {
    const modal = document.getElementById('qr-enlarged-modal');
    if (modal) modal.classList.add('hidden');
}

/* ================================================================
   RECORDS
================================================================ */
function renderRecords() {
    const list = document.getElementById("records-list");
    if (!list) return;
    list.innerHTML = "";
    if (APP_STATE.records.length === 0) {
        list.innerHTML = '<p class="subtext" style="text-align:center; padding:20px 0;">No attendance records yet.</p>';
        return;
    }
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
    document.querySelectorAll("#records-list .record-card").forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(query) ? "flex" : "none";
    });
}

function renderAdminRecent() {
    const list = document.getElementById("admin-recent-list");
    if (!list) return;
    list.innerHTML = "";
    const recent = APP_STATE.records.slice(0, 5);
    if (recent.length === 0) {
        list.innerHTML = '<p class="subtext" style="text-align:center; padding:12px 0;">No recent check-ins.</p>';
        return;
    }
    recent.forEach(r => {
        const item = document.createElement("div");
        item.className = "receipt-row";
        item.style.padding = "8px 0";
        item.innerHTML = `<span>${r.studentName || r.studentId}</span> <strong>${r.time} <i class="fa-solid fa-check text-green" style="color:var(--success);"></i></strong>`;
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
                <div class="subtext" style="font-size:0.75rem; color:var(--purple);">
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

/* ================================================================
   ATTENDANCE RECORDING
================================================================ */

// --- Student scans Event QR ---
function recordAttendance(eventName, location) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
    showToast(`✅ Checked in to ${newRecord.event}!`);
}

// --- Admin scans Student QR for a specific event ---
function recordAttendanceForEvent(studentId, studentName, eventName, location) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let events = JSON.parse(localStorage.getItem('events') || '[]');
    const eventIndex = events.findIndex(e => e.name === eventName);
    if (eventIndex === -1) {
        showToast(`⚠️ Event "${eventName}" not found`);
        return;
    }
    if (!events[eventIndex].attendees) events[eventIndex].attendees = [];
    const existing = events[eventIndex].attendees.find(a => a.id === studentId);
    if (existing) {
        showToast(`⚠️ ${studentName} already checked in!`);
        stopQRScanner();
        switchView('view-event-detail');
        refreshEventDetail();
        renderAdminEvents();
        return;
    }
    events[eventIndex].attendees.push({ id: studentId, name: studentName, time: timeStr });
    localStorage.setItem('events', JSON.stringify(events));

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
    showToast(`✅ ${studentName} checked in to ${eventName}!`);
}

function refreshEventDetail() {
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const event = events.find(e => e.name === currentEventName);
    if (!event) return;
    document.getElementById('event-attendee-count').innerText = event.attendees ? event.attendees.length : 0;
    const list = document.getElementById('event-attendee-list');
    list.innerHTML = '';
    if (event.attendees && event.attendees.length > 0) {
        event.attendees.forEach(a => {
            const item = document.createElement('div');
            item.className = 'receipt-row';
            item.style.padding = '6px 0';
            item.innerHTML = `<span>${a.name}</span> <strong>${a.time}</strong>`;
            list.appendChild(item);
        });
    } else {
        list.innerHTML = '<p class="subtext" style="text-align:center; padding:20px 0;">No students checked in yet</p>';
    }
}

/* ================================================================
   QR SCANNER
================================================================ */
function startQRScanner() {
    if (html5QrCodeScanner) return;
    try {
        html5QrCodeScanner = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 180, height: 180 } };
        html5QrCodeScanner.start({ facingMode: "environment" }, config, (decodedText) => {
            recordAttendance(decodedText, "Scanned Location");
        }).catch(() => {
            document.getElementById("camera-notice").classList.remove("hidden");
        });
    } catch (e) {
        document.getElementById("camera-notice").classList.remove("hidden");
    }
}

function stopQRScanner() {
    if (html5QrCodeScanner) {
        html5QrCodeScanner.stop().then(() => {
            html5QrCodeScanner.clear();
            html5QrCodeScanner = null;
        }).catch(() => { html5QrCodeScanner = null; });
    }
}

/* ================================================================
   SIMULATE SCANS
================================================================ */
function simulateScan() {
    if (currentEventName) {
        simulateEventScan();
        return;
    }
    const studentName = APP_STATE.user.name || "Juan Dela Cruz";
    const eventName = APP_STATE.activeEvent.name || "General Assembly 2024";
    const location = APP_STATE.activeEvent.location || "Main Hall";
    showToast(`📱 Simulating scan for ${studentName}...`);
    recordAttendance(eventName, location);
}

function simulateEventScan() {
    if (!currentEventName) {
        showToast('❌ No event selected.');
        return;
    }
    const defaultName = APP_STATE.user.name || "Juan Dela Cruz";
    const studentId = APP_STATE.user.id || "2024-00123";
    const demoName = prompt(
        `📸 Simulating scan for: "${currentEventName}"\n\nEnter student name:`,
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
    recordAttendanceForEvent(studentId, demoName.trim(), currentEventName, currentEventLocation || "Unknown Location");
}

/* ================================================================
   SYNC
================================================================ */
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

/* ================================================================
   ADMIN: EVENT MANAGEMENT
================================================================ */
function handleCreateEvent(e) {
    e.preventDefault();
    const name = document.getElementById("ev-name").value.trim();
    const loc = document.getElementById("ev-loc").value.trim();
    const date = document.getElementById("ev-date").value;
    const time = document.getElementById("ev-time").value;

    if (!name || !loc || !date || !time) {
        showToast('Please fill in all fields');
        return;
    }

    let events = JSON.parse(localStorage.getItem('events') || '[]');
    const newEvent = { id: Date.now(), name, location: loc, date, time, attendees: [] };
    events.push(newEvent);
    localStorage.setItem('events', JSON.stringify(events));

    APP_STATE.activeEvent = { name, location: loc, time: `${date} • ${time}` };
    document.getElementById("dash-event-name").innerText = name;
    document.getElementById("dash-event-loc").innerText = loc;
    document.getElementById("dash-event-time").innerText = `${date} • ${time}`;

    showToast(`✅ Event "${name}" created!`);
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

    const list = document.getElementById('event-attendee-list');
    list.innerHTML = '';
    if (event.attendees && event.attendees.length > 0) {
        event.attendees.forEach(a => {
            const item = document.createElement('div');
            item.className = 'receipt-row';
            item.style.padding = '6px 0';
            item.innerHTML = `<span>${a.name}</span> <strong>${a.time}</strong>`;
            list.appendChild(item);
        });
    } else {
        list.innerHTML = '<p class="subtext" style="text-align:center; padding:20px 0;">No students checked in yet</p>';
    }
    switchView('view-event-detail');
    showToast(`Managing: ${event.name}`);
}

function startEventScanner() {
    if (html5QrCodeScanner) {
        showToast('Scanner already running');
        return;
    }
    if (!currentEventName) {
        showToast('No event selected.');
        return;
    }
    switchView('view-scanner');

    setTimeout(() => {
        try {
            html5QrCodeScanner = new Html5Qrcode("reader");
            const config = { fps: 10, qrbox: { width: 180, height: 180 } };
            html5QrCodeScanner.start({ facingMode: "environment" }, config, (decodedText) => {
                const studentId = decodedText.trim();
                const studentName = prompt(`Enter name for Student ID: ${studentId}`, "Student Name");
                if (studentName !== null && studentName.trim() !== '') {
                    recordAttendanceForEvent(studentId, studentName.trim(), currentEventName, currentEventLocation);
                } else {
                    showToast('Scan cancelled');
                    switchView('view-event-detail');
                }
            }).catch(() => {
                document.getElementById("camera-notice").classList.remove("hidden");
                showToast('Camera access failed. Use Simulate button.');
                document.querySelector('.scanner-controls').innerHTML = `
                    <button class="btn btn-secondary" onclick="simulateEventScan()">
                        <i class="fa-solid fa-bolt"></i> Simulate Student Scan
                    </button>
                `;
            });
        } catch (e) {
            document.getElementById("camera-notice").classList.remove("hidden");
            showToast('Camera error. Use Simulate button.');
        }
    }, 300);
}

/* ================================================================
   NETWORK STATUS (Simulated)
================================================================ */
function updateNetworkStatus() {
    const statusEl = document.getElementById('status-text');
    const badge = document.getElementById('network-status');
    if (navigator.onLine) {
        APP_STATE.isOnline = true;
        badge.className = 'status-badge synced';
        statusEl.textContent = 'Online';
    } else {
        APP_STATE.isOnline = false;
        badge.className = 'status-badge offline';
        statusEl.textContent = 'Offline';
    }
}
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

/* ================================================================
   INIT
================================================================ */
document.addEventListener("DOMContentLoaded", () => {
    updateNetworkStatus();
    loadLocalRecords();
    renderRecords();
    renderAdminRecent();
    generateStudentQR();
    renderNav();                    // will hide nav because isLoggedIn = false
    renderAdminEvents();

    const ev = APP_STATE.activeEvent;
    document.getElementById("dash-event-name").innerText = ev.name;
    document.getElementById("dash-event-loc").innerText = ev.location;
    document.getElementById("dash-event-time").innerText = ev.time;

    switchView('view-login');       // starts at login, nav hidden
});