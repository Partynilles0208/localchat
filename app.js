/**
 * CLEAN SLATE // Monochrom Minimal Messenger
 * Logik: Schlicht, reaktionsschnell, vertrauenswürdig & persistent.
 */

// =============================================================================
// 1. PERSISTENZ (LocalStorage & Session)
// =============================================================================
const STORAGE_KEY = "clean_slate_messenger_v1";
const THEME_KEY = "clean_slate_theme_v1";
const AUTH_KEY = "clean_slate_auth_user_v1";
const GATE_KEY = "clean_slate_gate_passed_v1";
const VALID_GATE_CODES = ["0202818", "020818"];

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Ladefehler:", e);
  }
  return []; // Startet komplett leer ohne Beispielkontakte
}

function saveChats(chats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (e) {
    console.warn("Speicherfehler:", e);
  }
}

let CHATS = loadChats();
let activeChatId = CHATS.length > 0 ? CHATS[0].id : null;
let currentUser = null;
let isRegisterMode = false;

// =============================================================================
// 2. DOM ELEMENTE
// =============================================================================
// Gate Elements
const gateScreen = document.getElementById("gateScreen");
const gateForm = document.getElementById("gateForm");
const gateCodeInput = document.getElementById("gateCodeInput");
const gateErrorMsg = document.getElementById("gateErrorMsg");

// Auth Elements
const authScreen = document.getElementById("authScreen");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authRemember = document.getElementById("authRemember");
const authErrorMsg = document.getElementById("authErrorMsg");
const btnAuthSubmit = document.getElementById("btnAuthSubmit");
const btnTogglePwd = document.getElementById("btnTogglePwd");
const btnAuthToggleMode = document.getElementById("btnAuthToggleMode");
const authSwitchPrompt = document.getElementById("authSwitchPrompt");
const btnForgotPwd = document.getElementById("btnForgotPwd");

// App Shell
const chatLayout = document.getElementById("chatLayout");
const chatList = document.getElementById("chatList");
const chatsCount = document.getElementById("chatsCount");
const searchInput = document.getElementById("searchInput");
const btnNewChat = document.getElementById("btnNewChat");
const btnThemeToggle = document.getElementById("btnThemeToggle");

// Main Chat Stage
const mainHeader = document.getElementById("mainHeader");
const emptyView = document.getElementById("emptyView");
const messagesStream = document.getElementById("messagesStream");
const composer = document.getElementById("composer");
const messageInput = document.getElementById("messageInput");
const btnSend = document.getElementById("btnSend");
const btnAttach = document.getElementById("btnAttach");
const btnStageNewChat = document.getElementById("btnStageNewChat");
const btnDeleteChat = document.getElementById("btnDeleteChat");
const btnMobileBack = document.getElementById("btnMobileBack");

// Header & User Details
const peerAvatar = document.getElementById("peerAvatar");
const peerName = document.getElementById("peerName");
const peerStatus = document.getElementById("peerStatus");
const currentUserAvatar = document.getElementById("currentUserAvatar");
const currentUserName = document.getElementById("currentUserName");
const btnLogout = document.getElementById("btnLogout");

// Modal Elements
const modalNewChat = document.getElementById("modalNewChat");
const btnCloseModal = document.getElementById("btnCloseModal");
const btnCancelModal = document.getElementById("btnCancelModal");
const btnCreateChat = document.getElementById("btnCreateChat");
const contactNameInput = document.getElementById("contactNameInput");
const contactStatusInput = document.getElementById("contactStatusInput");
const toastHub = document.getElementById("toastHub");

// =============================================================================
// 3. ZUGANGSCODE & AUTHENTIFIZIERUNG
// =============================================================================

function checkGate() {
  const isPassed = sessionStorage.getItem(GATE_KEY) === "true";
  if (isPassed) {
    if (gateScreen) gateScreen.style.display = "none";
    checkAuth();
  } else {
    if (gateScreen) gateScreen.style.display = "flex";
    if (authScreen) authScreen.style.display = "none";
    if (chatLayout) chatLayout.style.display = "none";
    if (gateCodeInput) {
      gateCodeInput.value = "";
      hideGateError();
      setTimeout(() => gateCodeInput.focus(), 60);
    }
  }
}

function handleGateSubmit(e) {
  if (e) e.preventDefault();
  const code = gateCodeInput.value.trim();

  if (VALID_GATE_CODES.includes(code)) {
    sessionStorage.setItem(GATE_KEY, "true");
    if (gateScreen) gateScreen.style.display = "none";
    checkAuth();
  } else {
    showGateError("Ungültiger Zugangscode.");
    gateCodeInput.focus();
    gateCodeInput.select();
  }
}

function showGateError(msg) {
  if (gateErrorMsg) {
    gateErrorMsg.textContent = msg;
    gateErrorMsg.style.display = "block";
  }
}

function hideGateError() {
  if (gateErrorMsg) {
    gateErrorMsg.textContent = "";
    gateErrorMsg.style.display = "none";
  }
}

function checkAuth() {
  const savedUser = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
  if (savedUser) {
    loginSuccess(savedUser, false);
  } else {
    showAuthScreen();
  }
}

function showAuthScreen() {
  authScreen.style.display = "flex";
  chatLayout.style.display = "none";
  authUsername.value = "";
  authPassword.value = "";
  hideAuthError();
  setTimeout(() => authUsername.focus(), 60);
}

function loginSuccess(username, showWelcomeToast = true) {
  currentUser = username;
  currentUserName.textContent = username;
  currentUserAvatar.textContent = username.charAt(0).toUpperCase();

  authScreen.style.display = "none";
  chatLayout.style.display = "flex";

  renderSidebar();
  renderStage();

  if (showWelcomeToast) {
    showToast(`Willkommen, ${username}`);
  }
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const username = authUsername.value.trim();
  const password = authPassword.value;

  if (!username) {
    showAuthError("Bitte gib einen Benutzernamen oder deine E-Mail ein.");
    authUsername.focus();
    return;
  }

  if (!password || password.length < 4) {
    showAuthError("Das Passwort muss mindestens 4 Zeichen lang sein.");
    authPassword.focus();
    return;
  }

  // Session persistieren
  if (authRemember.checked) {
    localStorage.setItem(AUTH_KEY, username);
  } else {
    sessionStorage.setItem(AUTH_KEY, username);
  }

  loginSuccess(username, true);
}

function handleLogout() {
  if (confirm("Möchtest du dich wirklich abmelden?")) {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    currentUser = null;
    showAuthScreen();
    showToast("Erfolgreich abgemeldet");
  }
}

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  hideAuthError();

  if (isRegisterMode) {
    authTitle.textContent = "Konto erstellen";
    authSubtitle.textContent = "Lege dein lokales Profil an. Deine Daten bleiben auf diesem Gerät.";
    btnAuthSubmit.querySelector("span").textContent = "Konto erstellen";
    authSwitchPrompt.textContent = "Bereits ein Profil?";
    btnAuthToggleMode.textContent = "Anmelden";
  } else {
    authTitle.textContent = "Anmeldung";
    authSubtitle.textContent = "Gib deine Zugangsdaten ein, um fortzufahren.";
    btnAuthSubmit.querySelector("span").textContent = "Anmelden";
    authSwitchPrompt.textContent = "Noch kein Konto?";
    btnAuthToggleMode.textContent = "Konto erstellen";
  }
}

function togglePasswordVisibility() {
  const isPwd = authPassword.type === "password";
  authPassword.type = isPwd ? "text" : "password";

  const eyeShow = btnTogglePwd.querySelector(".eye-show");
  const eyeHide = btnTogglePwd.querySelector(".eye-hide");

  if (isPwd) {
    eyeShow.style.display = "none";
    eyeHide.style.display = "block";
  } else {
    eyeShow.style.display = "block";
    eyeHide.style.display = "none";
  }
}

function showAuthError(msg) {
  authErrorMsg.textContent = msg;
  authErrorMsg.style.display = "block";
}

function hideAuthError() {
  authErrorMsg.textContent = "";
  authErrorMsg.style.display = "none";
}

// =============================================================================
// 4. RENDERING & CHAT VERWALTUNG
// =============================================================================

function renderSidebar() {
  chatsCount.textContent = CHATS.length;

  if (CHATS.length === 0) {
    chatList.innerHTML = `
      <div class="empty-sidebar">
        <span>Keine Unterhaltungen</span>
        <button class="btn-secondary" id="btnEmptyCreate" style="font-size:12px; padding:6px 12px;">+ Neuer Chat</button>
      </div>
    `;
    const btn = document.getElementById("btnEmptyCreate");
    if (btn) btn.addEventListener("click", openModal);
    return;
  }

  chatList.innerHTML = CHATS.map(c => {
    const isActive = c.id === activeChatId;
    const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
    const snippet = lastMsg ? lastMsg.text : "Noch keine Nachrichten";
    const initial = c.name.charAt(0).toUpperCase();

    return `
      <div class="chat-row ${isActive ? 'active' : ''}" data-id="${c.id}">
        <div class="avatar-mono">${initial}</div>
        <div class="chat-meta">
          <div class="chat-top-line">
            <span class="chat-name">${escapeHtml(c.name)}</span>
            <span class="chat-time">${c.time || ""}</span>
          </div>
          <span class="chat-snippet">${escapeHtml(snippet)}</span>
        </div>
      </div>
    `;
  }).join("");

  chatList.querySelectorAll(".chat-row").forEach(row => {
    row.addEventListener("click", () => {
      selectChat(row.dataset.id);
    });
  });
}

function renderStage() {
  const currentChat = CHATS.find(c => c.id === activeChatId);

  if (!currentChat) {
    mainHeader.style.display = "none";
    messagesStream.style.display = "none";
    composer.style.display = "none";
    emptyView.style.display = "flex";
    return;
  }

  mainHeader.style.display = "flex";
  messagesStream.style.display = "flex";
  composer.style.display = "block";
  emptyView.style.display = "none";

  peerAvatar.textContent = currentChat.name.charAt(0).toUpperCase();
  peerName.textContent = currentChat.name;
  peerStatus.textContent = currentChat.status || "Online";

  if (!currentChat.messages || currentChat.messages.length === 0) {
    messagesStream.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 13px; margin: auto;">
        Keine Nachrichten vorhanden. Schreibe die erste Nachricht an ${escapeHtml(currentChat.name)}.
      </div>
    `;
    return;
  }

  messagesStream.innerHTML = currentChat.messages.map(m => {
    const isSent = m.sender === "me";
    return `
      <div class="message-row ${isSent ? 'sent' : 'received'}">
        <div class="bubble">${escapeHtml(m.text)}</div>
        <span class="bubble-meta">${m.time}</span>
      </div>
    `;
  }).join("");

  scrollToBottom();
}

function scrollToBottom() {
  setTimeout(() => {
    messagesStream.scrollTop = messagesStream.scrollHeight;
  }, 10);
}

// =============================================================================
// 5. CHAT INTERAKTIONEN
// =============================================================================

function selectChat(id) {
  activeChatId = id;
  renderSidebar();
  renderStage();
  chatLayout.classList.add("chat-open");
  messageInput.focus();
}

function handleSendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const chat = CHATS.find(c => c.id === activeChatId);
  if (!chat) return;

  const now = new Date();
  const timeStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

  if (!chat.messages) chat.messages = [];
  chat.messages.push({
    id: "m-" + Date.now(),
    sender: "me",
    text: text,
    time: timeStr
  });
  chat.time = timeStr;

  saveChats(CHATS);
  messageInput.value = "";
  renderSidebar();
  renderStage();
}

function deleteCurrentChat() {
  if (!activeChatId) return;
  const chat = CHATS.find(c => c.id === activeChatId);
  if (!chat) return;

  if (confirm(`Chat mit "${chat.name}" löschen?`)) {
    CHATS = CHATS.filter(c => c.id !== activeChatId);
    activeChatId = CHATS.length > 0 ? CHATS[0].id : null;
    saveChats(CHATS);
    renderSidebar();
    renderStage();
    showToast(`Chat mit ${chat.name} gelöscht`);
  }
}

// =============================================================================
// 6. MODAL: NEUER CHAT
// =============================================================================

function openModal() {
  modalNewChat.classList.add("open");
  contactNameInput.value = "";
  contactStatusInput.value = "";
  setTimeout(() => contactNameInput.focus(), 60);
}

function closeModal() {
  modalNewChat.classList.remove("open");
}

function createNewChat() {
  const name = contactNameInput.value.trim();
  if (!name) {
    contactNameInput.focus();
    return;
  }

  const status = contactStatusInput.value.trim() || "Online";

  const newChat = {
    id: "c-" + Date.now(),
    name: name,
    status: status,
    time: "Neu",
    messages: []
  };

  CHATS.unshift(newChat);
  activeChatId = newChat.id;
  saveChats(CHATS);

  closeModal();
  renderSidebar();
  renderStage();
  showToast(`Chat mit ${name} erstellt`);
}

// =============================================================================
// 7. THEME UMSCHALTER (DARK / LIGHT)
// =============================================================================

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);

  const iconMoon = btnThemeToggle.querySelector(".icon-moon");
  const iconSun = btnThemeToggle.querySelector(".icon-sun");

  if (theme === "light") {
    iconMoon.style.display = "none";
    iconSun.style.display = "block";
  } else {
    iconMoon.style.display = "block";
    iconSun.style.display = "none";
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
}

// =============================================================================
// 8. TOAST & HELFER
// =============================================================================

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;
  toastHub.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.2s ease";
    setTimeout(() => toast.remove(), 200);
  }, 2200);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// =============================================================================
// 9. INITIALISIERUNG
// =============================================================================

function init() {
  initTheme();

  // Auth Events
  authForm.addEventListener("submit", handleAuthSubmit);
  btnAuthToggleMode.addEventListener("click", toggleAuthMode);
  btnTogglePwd.addEventListener("click", togglePasswordVisibility);
  btnLogout.addEventListener("click", handleLogout);
  btnForgotPwd.addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Passwort-Reset: Lokale Schlüsselprüfung aktiv");
  });

  // Chat Send Events
  btnSend.addEventListener("click", handleSendMessage);
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Modal Events
  btnNewChat.addEventListener("click", openModal);
  btnStageNewChat.addEventListener("click", openModal);
  btnCloseModal.addEventListener("click", closeModal);
  btnCancelModal.addEventListener("click", closeModal);
  btnCreateChat.addEventListener("click", createNewChat);

  contactNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") createNewChat();
  });

  // Delete Chat
  btnDeleteChat.addEventListener("click", deleteCurrentChat);

  // Theme Toggle
  btnThemeToggle.addEventListener("click", toggleTheme);

  // Search Filter
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    chatList.querySelectorAll(".chat-row").forEach(row => {
      const name = row.querySelector(".chat-name").textContent.toLowerCase();
      if (name.includes(q)) {
        row.style.display = "flex";
      } else {
        row.style.display = "none";
      }
    });
  });

  // Mobile Back Button
  btnMobileBack.addEventListener("click", () => {
    chatLayout.classList.remove("chat-open");
  });

  // Close modal on backdrop click
  modalNewChat.addEventListener("click", (e) => {
    if (e.target === modalNewChat) closeModal();
  });

  // Attach button (simuliert)
  btnAttach.addEventListener("click", () => {
    showToast("Dateiauswahl geöffnet...");
  });

  // Call buttons (simuliert)
  document.getElementById("btnVoiceCall").addEventListener("click", () => {
    showToast("Sprachanruf wird aufgebaut...");
  });
  document.getElementById("btnVideoCall").addEventListener("click", () => {
    showToast("Videoanruf wird aufgebaut...");
  });

  // Gate Events
  if (gateForm) gateForm.addEventListener("submit", handleGateSubmit);
  if (gateCodeInput) {
    gateCodeInput.addEventListener("input", () => {
      hideGateError();
      if (gateCodeInput.value.length === 7) {
        handleGateSubmit();
      }
    });
  }

  // Check gate / login state
  checkGate();
}

document.addEventListener("DOMContentLoaded", init);
