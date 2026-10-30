/**
 * CLEAN SLATE // Monochrom Minimal Messenger
 * High-Precision Local-First Chat Architecture
 * 
 * Features:
 * - Permanent Gate (0202818) & Session Persistence (localStorage)
 * - Automatic User Discovery (No Manual Chat Creation)
 * - Live Presence ("Online", "Zuletzt online [Zeit]", "Schreibt...")
 * - Data Efficiency: Local-First Storage (No Bulk Server Downloads)
 * - P2P / Direct LAN Chat Transfer (3-Dots Menu)
 * - Swipe-to-Reply (Right swipe on messages)
 * - Opinion / Reaction system under messages
 * - Supabase Realtime & Offline Fallback
 */

(function () {
  "use strict";

  // =============================================================================
  // 1. CONSTANTS & KEYS
  // =============================================================================
  const GATE_KEY = "clean_slate_gate_passed_v1";
  const AUTH_KEY = "clean_slate_auth_user_v1";
  const THEME_KEY = "clean_slate_theme_v1";
  const PROFILES_KEY = "clean_slate_known_profiles_v1";
  const MSGS_PREFIX = "clean_slate_msgs_";
  const APP_VERSION = "1.0.1";
  const GITHUB_VERSION_URL = "https://raw.githubusercontent.com/Partynilles0208/localchat/main/version.json";

  const VALID_GATE_CODES = ["0202818", "020818"];

  // =============================================================================
  // 2. STATE MANAGEMENT
  // =============================================================================
  let currentUser = null;
  let activePeer = null; // currently selected username
  let replyingTo = null; // { id, sender, text }
  let isRegisterMode = false;
  let supabaseClient = null;
  let supabaseChannel = null;
  let typingTimeout = null;
  let isTyping = false;
  let localBroadcast = null;

  // Active opinions target message
  let activeOpinionTargetMsgId = null;

  // WebRTC LAN State
  let rtcPeerConnection = null;
  let rtcDataChannel = null;

  // =============================================================================
  // 3. DOM ELEMENT REFERENCES
  // =============================================================================
  // Gate
  const gateScreen = document.getElementById("gateScreen");
  const gateForm = document.getElementById("gateForm");
  const gateCodeInput = document.getElementById("gateCodeInput");
  const gateErrorMsg = document.getElementById("gateErrorMsg");

  // Auth
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

  // Shell & Layout
  const chatLayout = document.getElementById("chatLayout");
  const sidebar = document.getElementById("sidebar");
  const chatList = document.getElementById("chatList");
  const chatsCount = document.getElementById("chatsCount");
  const searchInput = document.getElementById("searchInput");
  const btnThemeToggle = document.getElementById("btnThemeToggle");

  // 3-Dots Dropdown
  const btnDotsMenu = document.getElementById("btnDotsMenu");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const menuItemLanTransfer = document.getElementById("menuItemLanTransfer");
  const menuItemCheckUpdates = document.getElementById("menuItemCheckUpdates");
  const menuItemTheme = document.getElementById("menuItemTheme");
  const menuItemLogout = document.getElementById("menuItemLogout");

  // Update Modal
  const modalUpdate = document.getElementById("modalUpdate");
  const btnCloseUpdateModal = document.getElementById("btnCloseUpdateModal");
  const btnDismissUpdate = document.getElementById("btnDismissUpdate");
  const btnApplyUpdate = document.getElementById("btnApplyUpdate");
  const updateVersionText = document.getElementById("updateVersionText");
  const updateChangelogText = document.getElementById("updateChangelogText");
  let pendingUpdateData = null;

  // User Footer
  const currentUserAvatar = document.getElementById("currentUserAvatar");
  const currentUserName = document.getElementById("currentUserName");
  const currentUserStatus = document.getElementById("currentUserStatus");

  // Main Stage
  const mainHeader = document.getElementById("mainHeader");
  const btnMobileBack = document.getElementById("btnMobileBack");
  const peerAvatar = document.getElementById("peerAvatar");
  const peerName = document.getElementById("peerName");
  const peerStatus = document.getElementById("peerStatus");
  const peerStatusDot = document.getElementById("peerStatusDot");
  const emptyView = document.getElementById("emptyView");
  const messagesStream = document.getElementById("messagesStream");

  // Stage Action Buttons
  const btnVoiceCall = document.getElementById("btnVoiceCall");
  const btnVideoCall = document.getElementById("btnVideoCall");
  const btnDeleteChat = document.getElementById("btnDeleteChat");

  // Composer & Reply Banner
  const composer = document.getElementById("composer");
  const replyBanner = document.getElementById("replyBanner");
  const replyBannerAuthor = document.getElementById("replyBannerAuthor");
  const replyBannerSnippet = document.getElementById("replyBannerSnippet");
  const btnCancelReply = document.getElementById("btnCancelReply");
  const messageInput = document.getElementById("messageInput");
  const btnSend = document.getElementById("btnSend");
  const btnAttach = document.getElementById("btnAttach");

  // LAN Transfer Modal
  const modalLanTransfer = document.getElementById("modalLanTransfer");
  const btnCloseLanModal = document.getElementById("btnCloseLanModal");
  const btnDoneLanModal = document.getElementById("btnDoneLanModal");
  const lanTabSend = document.getElementById("lanTabSend");
  const lanTabReceive = document.getElementById("lanTabReceive");
  const lanTabFile = document.getElementById("lanTabFile");
  const lanPanelSend = document.getElementById("lanPanelSend");
  const lanPanelReceive = document.getElementById("lanPanelReceive");
  const lanPanelFile = document.getElementById("lanPanelFile");
  const btnGenerateSyncCode = document.getElementById("btnGenerateSyncCode");
  const sendCodeBox = document.getElementById("sendCodeBox");
  const syncCodeText = document.getElementById("syncCodeText");
  const sendSyncStatus = document.getElementById("sendSyncStatus");
  const receiveCodeInput = document.getElementById("receiveCodeInput");
  const btnConnectSync = document.getElementById("btnConnectSync");
  const receiveSyncStatus = document.getElementById("receiveSyncStatus");
  const btnExportChatsFile = document.getElementById("btnExportChatsFile");
  const inputImportFile = document.getElementById("inputImportFile");

  // Reaction Popover & Toast
  const reactionPopover = document.getElementById("reactionPopover");
  const toastHub = document.getElementById("toastHub");

  // =============================================================================
  // 4. STORAGE HELPERS (LOCAL-FIRST & SPARSAM)
  // =============================================================================

  // Bereinigt alte Demo-Kontakte aus dem Browserspeicher
  function cleanupOldDemoProfiles() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      if (raw) {
        let arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr = arr.filter(p => !["sarah", "maximilian", "system"].includes(p.username.toLowerCase()));
          localStorage.setItem(PROFILES_KEY, JSON.stringify(arr));
        }
      }
    } catch (_) {}
  }

  function getProfiles() {
    cleanupOldDemoProfiles();
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {
      console.warn("Profil-Ladefehler:", e);
    }
    return [];
  }

  function saveProfiles(profiles) {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.warn("Profil-Speicherfehler:", e);
    }
  }

  function upsertProfile(username, displayName = null, status = "Online") {
    if (!username) return;
    const profiles = getProfiles();
    const existing = profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
    const now = new Date().toISOString();

    if (existing) {
      existing.status = status;
      existing.lastSeen = now;
      if (displayName) existing.displayName = displayName;
    } else {
      profiles.push({
        username: username,
        displayName: displayName || username,
        status: status,
        lastSeen: now
      });
    }
    saveProfiles(profiles);
  }

  function getChatKey(peer) {
    if (!currentUser || !peer) return null;
    return `${MSGS_PREFIX}${currentUser}_${peer}`;
  }

  function loadPeerMessages(peer) {
    const key = getChatKey(peer);
    if (!key) return [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Fehler beim Laden von Peer-Nachrichten:", e);
    }
    return [];
  }

  function savePeerMessages(peer, messages) {
    const key = getChatKey(peer);
    if (!key) return;
    try {
      // Schutz vor Speicherüberlauf (QuotaExceededError): Hält die 300 neuesten Nachrichten
      const capped = Array.isArray(messages) && messages.length > 300 ? messages.slice(-300) : messages;
      localStorage.setItem(key, JSON.stringify(capped));
    } catch (e) {
      console.warn("Fehler beim Speichern von Peer-Nachrichten:", e);
    }
  }

  // =============================================================================
  // 5. ZUGANGSCODE & AUTHENTIFIZIERUNG (PERMANENT)
  // =============================================================================

  function checkGate() {
    // Einmalige dauerhafte Freischaltung solange localStorage nicht geleert wird
    const isPassed = localStorage.getItem(GATE_KEY) === "true";
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
      // Dauerhaft in localStorage hinterlegen
      localStorage.setItem(GATE_KEY, "true");
      if (gateScreen) gateScreen.style.display = "none";
      checkAuth();
      showToast("Zugang autorisiert");
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
    // Permanenter Login
    const savedUser = localStorage.getItem(AUTH_KEY);
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
    currentUser = username.trim();
    localStorage.setItem(AUTH_KEY, currentUser);

    currentUserName.textContent = currentUser;
    currentUserAvatar.textContent = currentUser.charAt(0).toUpperCase();

    // Eigenes Profil aktualisieren & in Supabase synchronisieren
    upsertProfile(currentUser, currentUser, "Online");
    syncProfileToSupabase(currentUser);

    authScreen.style.display = "none";
    chatLayout.style.display = "flex";

    // BroadcastChannel initialisieren für lokale Multi-Tab Kommunikation
    initLocalBroadcast();

    // Supabase Verbindung & Realtime Listener starten
    initSupabase();

    // Kontakte rendern
    renderSidebar();

    // Wenn bereits ein aktiver Peer vorhanden ist, Stage laden
    if (activePeer) {
      renderStage();
    } else {
      // Wähle ersten anderen Kontakt
      const profiles = getProfiles().filter(p => p.username.toLowerCase() !== currentUser.toLowerCase());
      if (profiles.length > 0) {
        selectPeer(profiles[0].username);
      } else {
        renderStage();
      }
    }

    if (showWelcomeToast) {
      showToast(`Willkommen, ${currentUser}`);
    }
  }

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "_clean_slate_salt_2026");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = authUsername.value.trim();
    const password = authPassword.value;

    if (!username) {
      showAuthError("Bitte gib einen Benutzernamen ein.");
      authUsername.focus();
      return;
    }

    if (!password || password.length < 4) {
      showAuthError("Das Passwort muss mindestens 4 Zeichen lang sein.");
      authPassword.focus();
      return;
    }

    // Sicherheitsprüfung: Nur sichere Zeichen im Benutzernamen (verhindert Injection)
    if (!/^[a-zA-Z0-9_\-\.]{2,20}$/.test(username)) {
      showAuthError("Benutzername darf nur 2-20 Zeichen (Buchstaben, Zahlen, _ oder -) enthalten.");
      authUsername.focus();
      return;
    }

    btnAuthSubmit.disabled = true;
    const btnSpan = btnAuthSubmit.querySelector("span");
    const originalBtnText = btnSpan.textContent;
    btnSpan.textContent = "Prüfe...";

    try {
      const pwdHash = await hashPassword(password);
      const userId = username.toLowerCase();

      // Wenn Supabase aktiv ist: Prüfung gegen die zentrale Datenbank
      if (supabaseClient) {
        if (isRegisterMode) {
          // 1. Registrierung: Prüfe ob der Benutzername bereits existiert
          const { data: existingUser } = await supabaseClient
            .from("profiles")
            .select("username")
            .eq("id", userId)
            .maybeSingle();

          if (existingUser) {
            showAuthError("Dieser Benutzername ist bereits vergeben. Bitte melde dich an.");
            btnAuthSubmit.disabled = false;
            btnSpan.textContent = originalBtnText;
            return;
          }

          // 2. Neues Profil mit sicherem SHA-256 Hash anlegen
          await supabaseClient.from("profiles").insert({
            id: userId,
            username: username,
            display_name: username,
            password_hash: pwdHash,
            status: "Online",
            last_seen: new Date().toISOString()
          });
        } else {
          // Anmeldung: Profil abrufen und Passwort-Hash vergleichen
          const { data: userProfile } = await supabaseClient
            .from("profiles")
            .select("password_hash, username")
            .eq("id", userId)
            .maybeSingle();

          if (!userProfile) {
            showAuthError("Benutzer nicht gefunden. Bitte erstelle zuerst ein Konto.");
            btnAuthSubmit.disabled = false;
            btnSpan.textContent = originalBtnText;
            return;
          }

          if (userProfile.password_hash && userProfile.password_hash !== pwdHash) {
            showAuthError("Ungültiges Passwort.");
            btnAuthSubmit.disabled = false;
            btnSpan.textContent = originalBtnText;
            return;
          }

          // Status auf Online aktualisieren
          await supabaseClient
            .from("profiles")
            .update({ status: "Online", last_seen: new Date().toISOString() })
            .eq("id", userId);
        }
      }

      // Erfolgreich authentifiziert
      loginSuccess(username, true);
    } catch (err) {
      console.warn("Auth Prüfung:", err);
      loginSuccess(username, true);
    } finally {
      btnAuthSubmit.disabled = false;
      btnSpan.textContent = isRegisterMode ? "Konto erstellen" : "Anmelden";
    }
  }

  function handleLogout() {
    if (confirm("Möchtest du dich abmelden? Deine lokalen Chats bleiben erhalten.")) {
      localStorage.removeItem(AUTH_KEY);
      currentUser = null;
      activePeer = null;
      if (localBroadcast) {
        try { localBroadcast.close(); } catch (_) {}
      }
      showAuthScreen();
      showToast("Abgemeldet");
    }
  }

  function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    hideAuthError();

    if (isRegisterMode) {
      authTitle.textContent = "Konto erstellen";
      authSubtitle.textContent = "Lege dein Profil an. Jeder registrierte Nutzer ist automatisch sichtbar.";
      btnAuthSubmit.querySelector("span").textContent = "Konto erstellen";
      authSwitchPrompt.textContent = "Bereits ein Profil?";
      btnAuthToggleMode.textContent = "Anmelden";
    } else {
      authTitle.textContent = "Anmeldung";
      authSubtitle.textContent = "Gib deine Zugangsdaten ein, um fortzufahren.";
      btnAuthSubmit.querySelector("span").textContent = "Anmelden";
      authSwitchPrompt.textContent = "Noch kein Profil?";
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
  // 6. SUPABASE REALTIME & SERVER SCHNITTSTELLE
  // =============================================================================

  function getSupabaseConfig() {
    const config = window.SUPABASE_CONFIG || {};
    const url = config.url || "";
    const key = config.anonKey || "";
    return { url: url.trim(), key: key.trim() };
  }

  function initSupabase() {
    const { url, key } = getSupabaseConfig();
    if (!url || !key || typeof window.supabase === "undefined") {
      return;
    }

    try {
      supabaseClient = window.supabase.createClient(url, key);

      // 1. Registrierte Profile laden
      loadProfilesFromSupabase();

      // 2. Realtime Channel abonnieren
      subscribeRealtime();

      // 3. Ephemere Offline-Nachrichten abrufen
      fetchPendingEphemeralMessages();

      // 4. Echtzeit-Aktualisierung für neue Profile
      supabaseClient
        .channel("profiles_realtime_sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
          loadProfilesFromSupabase();
        })
        .subscribe();
    } catch (e) {
      console.warn("Supabase Init Fehler:", e);
    }
  }

  async function fetchPendingEphemeralMessages() {
    if (!supabaseClient || !currentUser) return;
    try {
      const { data, error } = await supabaseClient
        .from("ephemeral_messages")
        .select("*")
        .eq("recipient", currentUser);

      if (!error && Array.isArray(data) && data.length > 0) {
        data.forEach(item => {
          handleIncomingMessage({
            sender: item.sender,
            recipient: item.recipient,
            message: item.payload
          });
        });

        // Nach Zustellung aus dem Relais löschen (spart Speicher)
        const ids = data.map(d => d.id);
        await supabaseClient.from("ephemeral_messages").delete().in("id", ids);
      }
    } catch (e) {
      console.warn("Ephemeral Sync Fehler:", e);
    }
  }

  async function syncProfileToSupabase(username) {
    if (!supabaseClient) return;
    try {
      await supabaseClient
        .from("profiles")
        .upsert({
          id: username.toLowerCase(),
          username: username,
          display_name: username,
          status: "Online",
          last_seen: new Date().toISOString()
        });
    } catch (e) {
      console.warn("Supabase Sync Profil:", e);
    }
  }

  async function loadProfilesFromSupabase() {
    if (!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .order("last_seen", { ascending: false });

      if (!error && Array.isArray(data)) {
        const local = getProfiles();
        data.forEach(p => {
          const match = local.find(l => l.username.toLowerCase() === p.username.toLowerCase());
          if (match) {
            match.status = p.status || "Online";
            match.lastSeen = p.last_seen;
            if (p.display_name) match.displayName = p.display_name;
          } else {
            local.push({
              username: p.username,
              displayName: p.display_name || p.username,
              status: p.status || "Online",
              lastSeen: p.last_seen
            });
          }
        });
        saveProfiles(local);
        renderSidebar();
        if (activePeer) updatePeerHeader();
      }
    } catch (e) {
      console.warn("Supabase Profile Fetch:", e);
    }
  }

  function subscribeRealtime() {
    if (!supabaseClient || !currentUser) return;

    if (supabaseChannel) {
      try { supabaseClient.removeChannel(supabaseChannel); } catch (_) {}
    }

    // Globaler Broadcast Raum für sparsame Echtzeit-Übertragung
    supabaseChannel = supabaseClient.channel("localchat_room", {
      config: { broadcast: { self: false } }
    });

    supabaseChannel
      // Empfang neuer Nachrichten
      .on("broadcast", { event: "direct_message" }, ({ payload }) => {
        handleIncomingMessage(payload);
      })
      // Empfang von Tipp-Indikator
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        handleIncomingTyping(payload);
      })
      // Empfang von Reaktionen / Meinungen
      .on("broadcast", { event: "opinion" }, ({ payload }) => {
        handleIncomingOpinion(payload);
      })
      // Empfang von Status-Updates
      .on("broadcast", { event: "presence" }, ({ payload }) => {
        handleIncomingPresence(payload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Eigene Anwesenheit ankündigen
          broadcastPresence("Online");
        }
      });
  }

  function broadcastPresence(status) {
    const payload = {
      user: currentUser,
      status: status,
      time: new Date().toISOString()
    };

    if (supabaseChannel) {
      supabaseChannel.send({
        type: "broadcast",
        event: "presence",
        payload: payload
      });
    }

    if (localBroadcast) {
      localBroadcast.postMessage({ type: "presence", payload: payload });
    }
  }

  function handleIncomingPresence(payload) {
    if (!payload || !payload.user || payload.user.toLowerCase() === currentUser?.toLowerCase()) return;
    upsertProfile(payload.user, payload.user, payload.status || "Online");
    renderSidebar();
    if (activePeer && activePeer.toLowerCase() === payload.user.toLowerCase()) {
      updatePeerHeader();
    }
  }

  // =============================================================================
  // 7. MULTI-TAB & LOKALER BROADCAST (FALLBACK OHNE SUPABASE)
  // =============================================================================

  function initLocalBroadcast() {
    if (typeof BroadcastChannel !== "undefined") {
      try {
        localBroadcast = new BroadcastChannel("clean_slate_local_sync");
        localBroadcast.onmessage = (e) => {
          const { type, payload } = e.data || {};
          if (type === "direct_message") handleIncomingMessage(payload);
          if (type === "typing") handleIncomingTyping(payload);
          if (type === "opinion") handleIncomingOpinion(payload);
          if (type === "presence") handleIncomingPresence(payload);
        };
      } catch (err) {
        console.warn("BroadcastChannel nicht verfügbar:", err);
      }
    }
  }

  // =============================================================================
  // 8. AUTOMATISCHE NUTZER-ÜBERSICHT & SIDEBAR RENDERING
  // =============================================================================

  function renderSidebar() {
    const allProfiles = getProfiles();
    // Exclude current user from contact list
    const contacts = allProfiles.filter(p => !currentUser || p.username.toLowerCase() !== currentUser.toLowerCase());
    
    chatsCount.textContent = contacts.length;

    if (contacts.length === 0) {
      chatList.innerHTML = `
        <div class="empty-sidebar">
          <span>Keine anderen Kontakte registriert</span>
          <p style="font-size:11.5px; color:var(--text-dim); margin-top:4px;">
            Sobald sich ein weiterer Nutzer anmeldet, erscheint er automatisch hier.
          </p>
        </div>
      `;
      return;
    }

    const searchQuery = (searchInput.value || "").toLowerCase();

    chatList.innerHTML = contacts
      .filter(c => {
        if (!searchQuery) return true;
        return (c.displayName || c.username).toLowerCase().includes(searchQuery);
      })
      .map(c => {
        const isActive = activePeer && activePeer.toLowerCase() === c.username.toLowerCase();
        const msgs = loadPeerMessages(c.username);
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const initial = (c.displayName || c.username).charAt(0).toUpperCase();

        const isOnline = (c.status || "").toLowerCase().includes("online");
        const statusClass = c.isTyping ? "typing" : (isOnline ? "online" : "");
        const statusText = c.isTyping ? "Schreibt..." : (c.status || "Online");

        // Snippet
        let snippetText = lastMsg ? lastMsg.text : "Unterhaltung beginnen";
        if (lastMsg && lastMsg.quote) {
          snippetText = "↩ " + snippetText;
        }

        return `
          <div class="chat-row ${isActive ? 'active' : ''}" data-peer="${escapeHtml(c.username)}">
            <div class="avatar-mono-wrap">
              <div class="avatar-mono">${initial}</div>
              <span class="avatar-status-dot ${isOnline ? 'online' : ''}"></span>
            </div>
            <div class="chat-meta">
              <div class="chat-top-line">
                <span class="chat-name">${escapeHtml(c.displayName || c.username)}</span>
                <span class="chat-time">${lastMsg ? lastMsg.time : ""}</span>
              </div>
              <div class="chat-sub-line">
                <span class="chat-presence ${statusClass}">${escapeHtml(statusText)}</span>
              </div>
            </div>
          </div>
        `;
      }).join("");

    // Click handler on contacts
    chatList.querySelectorAll(".chat-row").forEach(row => {
      row.addEventListener("click", () => {
        const peer = row.dataset.peer;
        selectPeer(peer);
      });
    });
  }

  function selectPeer(username) {
    if (!username) return;
    activePeer = username;
    renderSidebar();
    renderStage();
    chatLayout.classList.add("chat-open");
    setTimeout(() => {
      if (messageInput) messageInput.focus();
    }, 60);
  }

  function updatePeerHeader() {
    if (!activePeer) return;
    const profiles = getProfiles();
    const peerObj = profiles.find(p => p.username.toLowerCase() === activePeer.toLowerCase()) || {
      username: activePeer,
      displayName: activePeer,
      status: "Online"
    };

    peerAvatar.textContent = (peerObj.displayName || peerObj.username).charAt(0).toUpperCase();
    peerName.textContent = peerObj.displayName || peerObj.username;

    const isOnline = (peerObj.status || "").toLowerCase().includes("online");
    const isTyping = peerObj.isTyping;

    if (isTyping) {
      peerStatus.textContent = "Schreibt...";
      peerStatus.style.color = "#60a5fa";
      peerStatusDot.classList.add("online");
    } else {
      peerStatus.textContent = peerObj.status || (isOnline ? "Online" : "Offline");
      peerStatus.style.color = "";
      if (isOnline) {
        peerStatusDot.classList.add("online");
      } else {
        peerStatusDot.classList.remove("online");
      }
    }
  }

  // =============================================================================
  // 9. CHAT STAGE RENDERING (SWIPE-TO-REPLY & OPINIONS)
  // =============================================================================

  function renderStage() {
    if (!activePeer) {
      mainHeader.style.display = "none";
      messagesStream.style.display = "none";
      composer.style.display = "none";
      emptyView.style.display = "flex";
      return;
    }

    mainHeader.style.display = "flex";
    messagesStream.style.display = "flex";
    composer.style.display = "flex";
    emptyView.style.display = "none";

    updatePeerHeader();

    const messages = loadPeerMessages(activePeer);

    if (messages.length === 0) {
      messagesStream.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 13px; margin: auto; max-width: 280px; line-height: 1.5;">
          Noch keine Nachrichten mit <strong>${escapeHtml(activePeer)}</strong>.<br>
          <span style="font-size:11.5px; color:var(--text-dim);">Schreibe eine Nachricht oder wische nach rechts zum Antworten.</span>
        </div>
      `;
      return;
    }

    messagesStream.innerHTML = messages.map(m => {
      const isSent = m.sender === currentUser;
      const opinions = m.opinions || [];

      // Quoted Reply Preview inside bubble
      let quoteHtml = "";
      if (m.quote) {
        quoteHtml = `
          <div class="quote-snippet">
            <span class="quote-author">${escapeHtml(m.quote.sender)}</span>
            <span class="quote-text">${escapeHtml(m.quote.text)}</span>
          </div>
        `;
      }

      // Opinions / Reactions underneath bubble
      let opinionsHtml = "";
      const opinionsPills = opinions.map(op => {
        const hasReacted = op.users && op.users.includes(currentUser);
        const safeEmoji = escapeHtml(op.emoji || "");
        const safeCount = Number(op.count) || 0;
        return `
          <button class="opinion-pill ${hasReacted ? 'active' : ''}" data-msg-id="${escapeHtml(m.id)}" data-emoji="${safeEmoji}">
            <span>${safeEmoji}</span>
            <span>${safeCount}</span>
          </button>
        `;
      }).join("");

      opinionsHtml = `
        <div class="message-opinions">
          ${opinionsPills}
          <button class="btn-add-opinion" data-msg-id="${escapeHtml(m.id)}" title="Meinung / Reaktion hinzufügen">+</button>
        </div>
      `;

      return `
        <div class="message-item-container" data-id="${escapeHtml(m.id)}">
          <div class="message-row ${isSent ? 'sent' : 'received'}" data-id="${escapeHtml(m.id)}">
            <!-- Visual Swipe Indicator -->
            <div class="swipe-reply-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 17 4 12 9 7"></polyline>
                <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
              </svg>
            </div>

            <div class="bubble">
              ${quoteHtml}
              <div class="bubble-content">${escapeHtml(m.text)}</div>
            </div>

            <div class="bubble-meta">
              <span>${escapeHtml(m.time || "")}</span>
              ${isSent ? `<span>• Gesendet</span>` : ''}
            </div>

            ${opinionsHtml}
          </div>
        </div>
      `;
    }).join("");

    // Attach Swipe-to-Reply & Opinion events
    initSwipeToReply();
    initOpinionButtons();

    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesStream) messagesStream.scrollTop = messagesStream.scrollHeight;
    }, 10);
  }

  // =============================================================================
  // 10. SWIPE-TO-REPLY IMPLEMENTATION
  // =============================================================================

  function initSwipeToReply() {
    const rows = messagesStream.querySelectorAll(".message-row");

    rows.forEach(row => {
      let startX = 0;
      let currentX = 0;
      let isDragging = false;
      const msgId = row.dataset.id;

      // Touch handlers (Mobile)
      row.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        isDragging = true;
      }, { passive: true });

      row.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        const deltaX = currentX - startX;

        // Nur Wischen nach rechts erlauben
        if (deltaX > 8) {
          const clamped = Math.min(deltaX * 0.55, 65);
          row.style.transform = `translateX(${clamped}px)`;
          if (clamped > 35) {
            row.classList.add("swiping");
          } else {
            row.classList.remove("swiping");
          }
        }
      }, { passive: true });

      row.addEventListener("touchend", () => {
        if (!isDragging) return;
        isDragging = false;
        const deltaX = currentX - startX;
        row.style.transform = "";
        row.classList.remove("swiping");

        if (deltaX > 45) {
          triggerReply(msgId);
        }
      });

      // Mouse drag handlers (Desktop)
      row.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || e.target.closest(".opinion-pill") || e.target.closest(".btn-add-opinion")) return;
        startX = e.clientX;
        isDragging = true;

        const onMouseMove = (ev) => {
          if (!isDragging) return;
          const deltaX = ev.clientX - startX;
          if (deltaX > 5) {
            const clamped = Math.min(deltaX * 0.5, 65);
            row.style.transform = `translateX(${clamped}px)`;
            if (clamped > 35) {
              row.classList.add("swiping");
            } else {
              row.classList.remove("swiping");
            }
          }
        };

        const onMouseUp = (ev) => {
          if (!isDragging) return;
          isDragging = false;
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
          const deltaX = ev.clientX - startX;
          row.style.transform = "";
          row.classList.remove("swiping");

          if (deltaX > 45) {
            triggerReply(msgId);
          }
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      });
    });
  }

  function triggerReply(msgId) {
    if (!activePeer) return;
    const msgs = loadPeerMessages(activePeer);
    const target = msgs.find(m => m.id === msgId);
    if (!target) return;

    replyingTo = {
      id: target.id,
      sender: target.sender === currentUser ? "Dir selbst" : (activePeer || target.sender),
      text: target.text
    };

    replyBannerAuthor.textContent = replyingTo.sender;
    replyBannerSnippet.textContent = replyingTo.text;
    replyBanner.style.display = "flex";

    // Vibration haptics
    if (typeof navigator.vibrate === "function") {
      try { navigator.vibrate(25); } catch (_) {}
    }

    messageInput.focus();
  }

  function cancelReply() {
    replyingTo = null;
    replyBanner.style.display = "none";
  }

  // =============================================================================
  // 11. OPINIONS & REACTIONS SYSTEM
  // =============================================================================

  function initOpinionButtons() {
    // Add Opinion '+' button click
    messagesStream.querySelectorAll(".btn-add-opinion").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const msgId = btn.dataset.msgId;
        openReactionPopover(btn, msgId);
      });
    });

    // Toggle Opinion Pill click
    messagesStream.querySelectorAll(".opinion-pill").forEach(pill => {
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        const msgId = pill.dataset.msgId;
        const emoji = pill.dataset.emoji;
        toggleOpinion(msgId, emoji);
      });
    });
  }

  function openReactionPopover(anchorEl, msgId) {
    activeOpinionTargetMsgId = msgId;
    const rect = anchorEl.getBoundingClientRect();
    reactionPopover.style.display = "flex";
    reactionPopover.style.top = `${rect.top - 44}px`;
    reactionPopover.style.left = `${Math.min(rect.left, window.innerWidth - 240)}px`;
  }

  function closeReactionPopover() {
    reactionPopover.style.display = "none";
    activeOpinionTargetMsgId = null;
  }

  function toggleOpinion(msgId, emoji) {
    if (!activePeer || !currentUser) return;
    const msgs = loadPeerMessages(activePeer);
    const msg = msgs.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.opinions) msg.opinions = [];

    const existingOp = msg.opinions.find(o => o.emoji === emoji);
    if (existingOp) {
      if (!existingOp.users) existingOp.users = [];
      const userIndex = existingOp.users.indexOf(currentUser);

      if (userIndex > -1) {
        // Entfernen
        existingOp.users.splice(userIndex, 1);
        existingOp.count = Math.max(0, existingOp.count - 1);
        if (existingOp.count === 0) {
          msg.opinions = msg.opinions.filter(o => o.emoji !== emoji);
        }
      } else {
        // Hinzufügen
        existingOp.users.push(currentUser);
        existingOp.count++;
      }
    } else {
      msg.opinions.push({
        emoji: emoji,
        count: 1,
        users: [currentUser]
      });
    }

    savePeerMessages(activePeer, msgs);
    renderStage();

    // Broadcast Opinion to peer
    const opinionPayload = {
      msgId: msgId,
      sender: currentUser,
      recipient: activePeer,
      emoji: emoji,
      opinions: msg.opinions
    };

    if (supabaseChannel) {
      supabaseChannel.send({
        type: "broadcast",
        event: "opinion",
        payload: opinionPayload
      });
    }

    if (localBroadcast) {
      localBroadcast.postMessage({ type: "opinion", payload: opinionPayload });
    }
  }

  function handleIncomingOpinion(payload) {
    if (!payload || !payload.recipient || !payload.sender) return;
    if (payload.recipient.toLowerCase() !== currentUser?.toLowerCase()) return;

    const msgs = loadPeerMessages(payload.sender);
    const target = msgs.find(m => m.id === payload.msgId);
    if (target) {
      target.opinions = payload.opinions;
      savePeerMessages(payload.sender, msgs);
      if (activePeer && activePeer.toLowerCase() === payload.sender.toLowerCase()) {
        renderStage();
      }
    }
  }

  // =============================================================================
  // 12. NACHRICHTEN VERSENDEN & EMPFANGEN (LOCAL-FIRST)
  // =============================================================================

  function handleSendMessage() {
    const text = messageInput.value.trim();
    if (!text || !activePeer) return;

    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

    const newMsg = {
      id: "m-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      sender: currentUser,
      recipient: activePeer,
      text: text,
      time: timeStr,
      quote: replyingTo ? { sender: replyingTo.sender, text: replyingTo.text } : null,
      opinions: []
    };

    // 1. In eigenem LocalStorage speichern
    const myMsgs = loadPeerMessages(activePeer);
    myMsgs.push(newMsg);
    savePeerMessages(activePeer, myMsgs);

    // 2. Realtime Broadcast an Empfänger senden (extrem sparsam, kein Vorrat auf Server)
    const broadcastPayload = {
      message: newMsg,
      sender: currentUser,
      recipient: activePeer
    };

    if (supabaseChannel) {
      supabaseChannel.send({
        type: "broadcast",
        event: "direct_message",
        payload: broadcastPayload
      });
    }

    if (localBroadcast) {
      localBroadcast.postMessage({
        type: "direct_message",
        payload: broadcastPayload
      });
    }

    // 3. Ephemeres Relais in Supabase (garantierte Zustellung, falls Empfänger kurz offline)
    if (supabaseClient) {
      try {
        supabaseClient.from("ephemeral_messages").insert({
          sender: currentUser,
          recipient: activePeer,
          payload: newMsg
        }).then(() => {});
      } catch (_) {}
    }

    // 4. UI bereinigen & rendern
    messageInput.value = "";
    cancelReply();
    stopTyping();
    renderSidebar();
    renderStage();
  }

  function handleIncomingMessage(payload) {
    if (!payload || !payload.recipient || !payload.sender || !payload.message) return;
    if (payload.recipient.toLowerCase() !== currentUser?.toLowerCase()) return;

    const sender = payload.sender;
    const msg = payload.message;

    // In lokalem Speicher ablegen
    const msgs = loadPeerMessages(sender);
    // Verhindere Duplikate
    if (!msgs.some(m => m.id === msg.id)) {
      msgs.push(msg);
      savePeerMessages(sender, msgs);
    }

    // Bekanntes Profil sicherstellen
    upsertProfile(sender, sender, "Online");

    // UI aktualisieren
    renderSidebar();
    if (activePeer && activePeer.toLowerCase() === sender.toLowerCase()) {
      renderStage();
    } else {
      showToast(`Neue Nachricht von ${sender}: ${msg.text.substring(0, 30)}`);
    }
  }

  // =============================================================================
  // 13. LIVE TYPING INDIKATOR
  // =============================================================================

  function handleTypingInput() {
    if (!activePeer || !currentUser) return;

    if (!isTyping) {
      isTyping = true;
      sendTypingBroadcast(true);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      stopTyping();
    }, 2000);
  }

  function stopTyping() {
    if (isTyping) {
      isTyping = false;
      sendTypingBroadcast(false);
    }
    clearTimeout(typingTimeout);
  }

  function sendTypingBroadcast(typingState) {
    const payload = {
      sender: currentUser,
      recipient: activePeer,
      typing: typingState
    };

    if (supabaseChannel) {
      supabaseChannel.send({
        type: "broadcast",
        event: "typing",
        payload: payload
      });
    }

    if (localBroadcast) {
      localBroadcast.postMessage({ type: "typing", payload: payload });
    }
  }

  function handleIncomingTyping(payload) {
    if (!payload || !payload.recipient || !payload.sender) return;
    if (payload.recipient.toLowerCase() !== currentUser?.toLowerCase()) return;

    const profiles = getProfiles();
    const senderProfile = profiles.find(p => p.username.toLowerCase() === payload.sender.toLowerCase());
    if (senderProfile) {
      senderProfile.isTyping = payload.typing;
      renderSidebar();
      if (activePeer && activePeer.toLowerCase() === payload.sender.toLowerCase()) {
        updatePeerHeader();
      }
    }
  }

  function deleteCurrentChat() {
    if (!activePeer) return;
    if (confirm(`Möchtest du den gesamten Chatverlauf mit "${activePeer}" auf diesem Gerät löschen?`)) {
      savePeerMessages(activePeer, []);
      renderSidebar();
      renderStage();
      showToast(`Chatverlauf mit ${activePeer} geleert`);
    }
  }

  // =============================================================================
  // 14. LAN CHAT TRANSFER (P2P WEBRTC & OFFLINE DATEI)
  // =============================================================================

  function openLanModal() {
    modalLanTransfer.classList.add("open");
    selectLanTab("send");
  }

  function closeLanModal() {
    modalLanTransfer.classList.remove("open");
    cleanupWebRTC();
  }

  function selectLanTab(tab) {
    lanTabSend.classList.remove("active");
    lanTabReceive.classList.remove("active");
    lanTabFile.classList.remove("active");
    lanPanelSend.style.display = "none";
    lanPanelReceive.style.display = "none";
    lanPanelFile.style.display = "none";

    if (tab === "send") {
      lanTabSend.classList.add("active");
      lanPanelSend.style.display = "flex";
    } else if (tab === "receive") {
      lanTabReceive.classList.add("active");
      lanPanelReceive.style.display = "flex";
    } else {
      lanTabFile.classList.add("active");
      lanPanelFile.style.display = "flex";
    }
  }

  function generateAllChatsExport() {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: currentUser,
      profiles: getProfiles(),
      chats: {}
    };

    // Collect all chats from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(MSGS_PREFIX)) {
        try {
          exportData.chats[key] = JSON.parse(localStorage.getItem(key));
        } catch (_) {}
      }
    }

    return exportData;
  }

  function importAllChats(data) {
    if (!data || typeof data !== "object") throw new Error("Ungültiges Format");

    if (Array.isArray(data.profiles)) {
      saveProfiles(data.profiles);
    }

    if (data.chats && typeof data.chats === "object") {
      for (const [key, val] of Object.entries(data.chats)) {
        if (key.startsWith(MSGS_PREFIX)) {
          localStorage.setItem(key, JSON.stringify(val));
        }
      }
    }

    renderSidebar();
    if (activePeer) renderStage();
    showToast("Chats erfolgreich übertragen!");
  }

  function handleFileExport() {
    const data = generateAllChatsExport();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `localchat_backup_${currentUser || 'all'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Chat-Sicherung heruntergeladen");
  }

  function handleFileImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        importAllChats(parsed);
        closeLanModal();
      } catch (err) {
        showToast("Fehler beim Lesen der Datei: Ungültiges JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // WebRTC LAN Direct Transfer
  function startLanSender() {
    const syncCode = Math.floor(100000 + Math.random() * 900000).toString();
    syncCodeText.textContent = syncCode;
    sendCodeBox.style.display = "flex";
    btnGenerateSyncCode.style.display = "none";
    sendSyncStatus.textContent = "Bereit im lokalen Netzwerk. Warte auf Verbindung...";

    cleanupWebRTC();

    rtcPeerConnection = new RTCPeerConnection({
      iceServers: [] // Reines LAN (kein externer STUN/TURN nötig)
    });

    rtcDataChannel = rtcPeerConnection.createDataChannel("lan_chat_sync");

    rtcDataChannel.onopen = () => {
      sendSyncStatus.textContent = "Verbunden! Sende Chatdaten...";
      const payload = JSON.stringify(generateAllChatsExport());
      rtcDataChannel.send(payload);
      setTimeout(() => {
        sendSyncStatus.textContent = "✓ Übertragung erfolgreich abgeschlossen!";
        showToast("LAN-Übertragung erfolgreich abgeschlossen!");
      }, 500);
    };

    // Signaling bridge via BroadcastChannel or Supabase
    const signalChannel = new BroadcastChannel(`lan_signal_${syncCode}`);
    signalChannel.onmessage = async (e) => {
      const msg = e.data;
      if (msg.type === "answer" && rtcPeerConnection) {
        await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.type === "candidate" && rtcPeerConnection) {
        try {
          await rtcPeerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (_) {}
      }
    };

    rtcPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalChannel.postMessage({ type: "candidate", candidate: event.candidate });
      }
    };

    rtcPeerConnection.createOffer().then(offer => {
      return rtcPeerConnection.setLocalDescription(offer);
    }).then(() => {
      signalChannel.postMessage({
        type: "offer",
        sdp: rtcPeerConnection.localDescription
      });
    });
  }

  function connectLanReceiver() {
    const code = receiveCodeInput.value.trim();
    if (code.length !== 6) {
      showToast("Bitte gib den 6-stelligen Code ein.");
      return;
    }

    receiveSyncStatus.style.display = "block";
    receiveSyncStatus.textContent = "Suche Gerät im lokalen Netzwerk...";

    cleanupWebRTC();

    rtcPeerConnection = new RTCPeerConnection({ iceServers: [] });

    const signalChannel = new BroadcastChannel(`lan_signal_${code}`);

    rtcPeerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (msgEvent) => {
        try {
          const imported = JSON.parse(msgEvent.data);
          importAllChats(imported);
          receiveSyncStatus.textContent = "✓ Alle Chats erfolgreich empfangen!";
          setTimeout(() => {
            closeLanModal();
          }, 1200);
        } catch (err) {
          receiveSyncStatus.textContent = "Fehler beim Verarbeiten der Chats.";
        }
      };
    };

    signalChannel.onmessage = async (e) => {
      const msg = e.data;
      if (msg.type === "offer") {
        await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await rtcPeerConnection.createAnswer();
        await rtcPeerConnection.setLocalDescription(answer);
        signalChannel.postMessage({ type: "answer", sdp: answer });
        receiveSyncStatus.textContent = "Verbindung hergestellt! Empfange Daten...";
      } else if (msg.type === "candidate") {
        try {
          await rtcPeerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (_) {}
      }
    };

    rtcPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalChannel.postMessage({ type: "candidate", candidate: event.candidate });
      }
    };
  }

  function cleanupWebRTC() {
    if (rtcDataChannel) {
      try { rtcDataChannel.close(); } catch (_) {}
      rtcDataChannel = null;
    }
    if (rtcPeerConnection) {
      try { rtcPeerConnection.close(); } catch (_) {}
      rtcPeerConnection = null;
    }
  }

  // =============================================================================
  // 15. THEME UMSCHALTER (DARK / LIGHT)
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
  // 17. AUTO-UPDATE SYSTEM
  // =============================================================================

  function isNewerVersion(remote, local) {
    const r = (remote || "").replace(/^v/, "").split(".").map(Number);
    const l = (local || "").replace(/^v/, "").split(".").map(Number);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
      const rv = r[i] || 0;
      const lv = l[i] || 0;
      if (rv > lv) return true;
      if (rv < lv) return false;
    }
    return false;
  }

  async function checkForUpdates(silent = true) {
    try {
      const res = await fetch(`${GITHUB_VERSION_URL}?_t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.version) return;

      if (isNewerVersion(data.version, APP_VERSION)) {
        pendingUpdateData = data;
        updateVersionText.textContent = `v${data.version}`;
        updateChangelogText.textContent = data.changelog || "Neue Version verfügbar.";
        modalUpdate.classList.add("open");
      } else if (!silent) {
        showToast(`App ist auf dem neuesten Stand (v${APP_VERSION})`);
      }
    } catch (err) {
      if (!silent) showToast("Keine Verbindung zum Update-Server");
    }
  }

  function closeUpdateModal() {
    modalUpdate.classList.remove("open");
  }

  function applyUpdate() {
    if (!pendingUpdateData) return;
    const isAndroid = navigator.userAgent.toLowerCase().includes("android") || window.location.protocol === "file:";

    if (isAndroid && pendingUpdateData.apkDownloadUrl) {
      showToast("Lade neues APK herunter...");
      window.location.href = pendingUpdateData.apkDownloadUrl;
    } else {
      showToast("Aktualisiere...");
      setTimeout(() => {
        window.location.reload(true);
      }, 400);
    }
    closeUpdateModal();
  }

  // =============================================================================
  // 18. TOAST & HELFER
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
    }, 2400);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =============================================================================
  // 18. INITIALISIERUNG
  // =============================================================================

  function init() {
    initTheme();

    // Gate Submit & Auto-Submit on 7 chars
    if (gateForm) gateForm.addEventListener("submit", handleGateSubmit);
    if (gateCodeInput) {
      gateCodeInput.addEventListener("input", () => {
        hideGateError();
        if (gateCodeInput.value.length === 7) {
          handleGateSubmit();
        }
      });
    }

    // Auth Form
    authForm.addEventListener("submit", handleAuthSubmit);
    btnAuthToggleMode.addEventListener("click", toggleAuthMode);
    btnTogglePwd.addEventListener("click", togglePasswordVisibility);
    btnForgotPwd.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("Lokale Schlüsselverwaltung: Melde dich mit deinem Nutzernamen an.");
    });

    // 3-Dots Dropdown Menu
    btnDotsMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("show");
    });

    document.addEventListener("click", () => {
      dropdownMenu.classList.remove("show");
      closeReactionPopover();
    });

    menuItemLanTransfer.addEventListener("click", () => {
      dropdownMenu.classList.remove("show");
      openLanModal();
    });

    menuItemCheckUpdates.addEventListener("click", () => {
      dropdownMenu.classList.remove("show");
      checkForUpdates(false);
    });

    menuItemTheme.addEventListener("click", () => {
      dropdownMenu.classList.remove("show");
      toggleTheme();
    });

    menuItemLogout.addEventListener("click", () => {
      dropdownMenu.classList.remove("show");
      handleLogout();
    });

    // Sidebar search filter
    searchInput.addEventListener("input", () => {
      renderSidebar();
    });

    // Composer Input & Send
    btnSend.addEventListener("click", handleSendMessage);
    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSendMessage();
      }
    });

    messageInput.addEventListener("input", handleTypingInput);
    btnCancelReply.addEventListener("click", cancelReply);

    // Call simulations
    btnVoiceCall.addEventListener("click", () => showToast("Sprachanruf wird aufgebaut..."));
    btnVideoCall.addEventListener("click", () => showToast("Videoanruf wird aufgebaut..."));
    btnDeleteChat.addEventListener("click", deleteCurrentChat);
    btnAttach.addEventListener("click", () => showToast("Dateianhang ausgewählt"));

    // Theme toggle button
    btnThemeToggle.addEventListener("click", toggleTheme);

    // Mobile back button
    btnMobileBack.addEventListener("click", () => {
      chatLayout.classList.remove("chat-open");
    });

    // LAN Modal Events
    btnCloseLanModal.addEventListener("click", closeLanModal);
    btnDoneLanModal.addEventListener("click", closeLanModal);
    lanTabSend.addEventListener("click", () => selectLanTab("send"));
    lanTabReceive.addEventListener("click", () => selectLanTab("receive"));
    lanTabFile.addEventListener("click", () => selectLanTab("file"));

    btnGenerateSyncCode.addEventListener("click", startLanSender);
    btnConnectSync.addEventListener("click", connectLanReceiver);
    btnExportChatsFile.addEventListener("click", handleFileExport);
    inputImportFile.addEventListener("change", handleFileImport);

    // Update Modal Events
    if (btnCloseUpdateModal) btnCloseUpdateModal.addEventListener("click", closeUpdateModal);
    if (btnDismissUpdate) btnDismissUpdate.addEventListener("click", closeUpdateModal);
    if (btnApplyUpdate) btnApplyUpdate.addEventListener("click", applyUpdate);

    // Reaction Popover click on emojis
    reactionPopover.querySelectorAll(".btn-opinion-quick").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const emoji = btn.dataset.opinion;
        if (activeOpinionTargetMsgId) {
          toggleOpinion(activeOpinionTargetMsgId, emoji);
        }
        closeReactionPopover();
      });
    });

    // Check Gate & Login
    checkGate();

    // Automatischer Update-Check im Hintergrund
    setTimeout(() => checkForUpdates(true), 2500);
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
