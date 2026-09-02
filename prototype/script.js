// --- Application State and Data Management ---
const APP_STATE = {
    isOnline: false,
    user: { name: "Juan Dela Cruz", id: "2024-00123" },
    activeEvent: { name: "General Assembly 2024", location: "Main Hall", time: "10:00 AM" },
    records: [
        { id: 1, event: "General Assembly 2024", date: "May 20, 2024", time: "10:02 AM", status: "PRESENT", synced: true },
        { id: 2, event: "Orientation 2024", date: "May 15, 2024", time: "09:00 AM", status: "PRESENT", synced: true }
    ]
};

let html5QrCodeScanner = null;

// Initialize System on DOM Load
document.addEventListener("DOMContentLoaded", () => {
    loadLocalRecords();
    renderRecords();
    renderAdminRecent();
    checkCameraAccess();
});

// View Navigation Switcher
function switchView(viewId) {
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

// Toast Notifications
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
}

// Local Storage Handlers
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
    document.getElementById("pending-count").innerText = unsynced;
    document.getElementById("total-events").innerText = APP_STATE.records.length;
    document.getElementById("present-count").innerText = APP_STATE.records.filter(r => r.status === "PRESENT").length;
}

// Attendance Logic
function recordAttendance(eventName, location) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const newRecord = {
        id: Date.now(),
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

    // Populate Receipt View
    document.getElementById("rec-student").innerText = APP_STATE.user.name;
    document.getElementById("rec-id").innerText = APP_STATE.user.id;
    document.getElementById("rec-event").innerText = newRecord.event;
    document.getElementById("rec-loc").innerText = location || APP_STATE.activeEvent.location;
    document.getElementById("rec-time").innerText = timeStr;

    stopQRScanner();
    switchView("view-success");
    showToast("Saved locally (Offline Mode)");
}

// Dynamic Rendering
function renderRecords() {
    const list = document.getElementById("records-list");
    list.innerHTML = "";
    APP_STATE.records.forEach(rec => {
        const card = document.createElement("div");
        card.className = "record-card";
        card.innerHTML = `
      <div>
        <strong>${rec.event}</strong>
        <div class="subtext">${rec.date} • ${rec.time}</div>
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
    list.innerHTML = "";
    APP_STATE.records.slice(0, 3).forEach(r => {
        const item = document.createElement("div");
        item.className = "receipt-row";
        item.style.padding = "8px 0";
        item.innerHTML = `<span>${APP_STATE.user.name}</span> <strong>${r.time} <i class="fa-solid fa-check text-green"></i></strong>`;
    });
}

// QR Code Scanner Integration
function checkCameraAccess() {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        document.getElementById("camera-notice").classList.remove("hidden");
    }
}

function startQRScanner() {
    if (html5QrCodeScanner) return;

    html5QrCodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 180, height: 180 } };

    html5QrCodeScanner.start({ facingMode: "environment" }, config, (decodedText) => {
        recordAttendance(decodedText, "Scanned Location");
    }).catch(() => {
        document.getElementById("camera-notice").classList.remove("hidden");
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

function simulateScan() {
    recordAttendance(APP_STATE.activeEvent.name, APP_STATE.activeEvent.location);
}

// Sync Functionality
function syncData() {
    showToast("Syncing with central database...");
    setTimeout(() => {
        APP_STATE.records.forEach(r => r.synced = true);
        saveLocalRecords();
        renderRecords();
        showToast("Sync Successful!");
    }, 1200);
}

// Admin Event Creation
function handleCreateEvent(e) {
    e.preventDefault();
    const name = document.getElementById("ev-name").value;
    const loc = document.getElementById("ev-loc").value;
    const time = document.getElementById("ev-time").value;

    APP_STATE.activeEvent = { name, location: loc, time };

    // Update Student Dashboard
    document.getElementById("dash-event-name").innerText = name;
    document.getElementById("dash-event-loc").innerText = loc;
    document.getElementById("dash-event-time").innerText = time;

    // Generate QR Representation
    const qrOutput = document.getElementById("qr-output");
    qrOutput.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(name)}" alt="Event QR">`;
    document.getElementById("qr-event-label").innerText = `${name} (${loc})`;
    document.getElementById("generated-qr-card").classList.remove("hidden");

    showToast("Event Created!");
}