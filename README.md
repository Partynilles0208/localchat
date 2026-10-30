# Clean Slate — Monochrom Messenger

Ein kompromisslos minimalistisches, extrem reduziertes Chat-System im **Schweizer Monochrom-Stil** mit **Supabase-Echtzeit-Server**, **Local-First Datensparsamkeit**, **Swipe-to-Reply**, **Meinungen/Reaktionen**, **automatischem Kontakt-Verzeichnis**, **P2P LAN-Transfer** und **Android APK**.

---

## 🔒 Zugangscode & Permanente Authentifizierung

- **Sicherheits-Gate (Code: `0202818`):** Einmalige Eingabe. Dank dauerhafter Speicherung in `localStorage` wird der Code auf demselben Gerät nie wieder abgefragt (außer der Browser-Speicher wird geleert).
- **Permanenter Login:** Nach der Anmeldung bleibt die Sitzung dauerhaft aktiv.
- **Vertrauenswürdiges Interface:** Klare, professionelle Eingabemaske ohne Spielereien.

---

## ⚡ Automatische Kontakt-Erkennung (Kein manuelles Erstellen)

- Chats müssen nicht manuell erstellt werden: **Jeder registrierte Benutzer taucht automatisch in der Kontaktleiste auf.**
- Unter jedem Benutzernamen wird der Live-Status angezeigt:
  - `Online` (grüner Status-Indikator)
  - `Zuletzt online [Zeit]`
  - `Schreibt...` (Live-Tipp-Indikator in Echtzeit)

---

## 🌐 Supabase Server & Vercel Deployment

- **Supabase-Anbindung:** Konfiguriert über `config.js`, Vercel-Umgebungsvariablen (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) oder bequem zur Laufzeit über das Menü (3 Punkte `⋮` -> *Supabase Server Konfig*).
- **SQL-Schema:** Die Datei [`supabase_schema.sql`](file:///c:/Users/andreas/Downloads/localchat/supabase_schema.sql) enthält alle Tabellen (`profiles`, `ephemeral_messages`) und Realtime-Trigger für Supabase.
- **Vercel-Bereitstellung:** Zero-Config dank [`vercel.json`](file:///c:/Users/andreas/Downloads/localchat/vercel.json). Einfach Repository mit Vercel verknüpfen.

---

## 💾 Datensparsamkeit (Local-First)

- **Keine Server-Massenarchive:** Alle Nachrichten werden lokal im `localStorage` des jeweiligen Geräts verwaltet.
- Der Server fungiert nur als schlankes Relais für den Echtzeit-Austausch.
- Meldet man sich auf einem neuen Gerät an, werden aus Datenschutz- und Bandbreitengründen **keine alten Verläufe vom Server heruntergeladen**.

---

## 📲 LAN Chat-Übertragung (P2P ohne Server)

Über das Menü (3 Punkte `⋮` -> *Chats übertragen (LAN)*):
1. **Direkt-Sync (WebRTC P2P):** Altes Gerät erzeugt einen 6-stelligen Sync-Code. Neues Gerät tippt ihn ein. Der gesamte Chatverlauf wird direkt über das lokale WLAN/LAN von Gerät zu Gerät gestreamt — **ohne dass auch nur ein Byte über den Supabase-Server läuft!**
2. **Offline-Datei:** 1-Klick Export aller Verläufe in eine `.json`-Datei und 1-Klick Import auf jedem beliebigen Endgerät.

---

## ↩️ Swipe-to-Reply & Meinungen / Reaktionen

- **Swipe-to-Reply:** Wische eine Nachricht einfach nach rechts (Touch oder Maus), um direkt darauf zu antworten. Die geantwortete Nachricht wird im Eingabefeld als Zitat eingeblendet und in der neuen Nachricht mit sauberer Zitat-Markierung dargestellt.
- **Meinungen & Reaktionen:** Unter jeder Nachricht können Meinungen und Reaktionen (z. B. 👍, ❤️, 💡, 🔥, 🎯, 💬) abgegeben werden. Reaktionszähler und Nutzer-Markierungen aktualisieren sich in Echtzeit.

---

## 📱 Mobile Optimierung & Android APK (`localchat.apk`)

- **Exklusives Mobile-Layout:** Safe-Area-Unterstützung (`viewport-fit=cover`), native Wischgesten, Touch-Targets und Swiss Typography.
- **Native Android APK:** Die kompilierte Android App [`localchat.apk`](file:///c:/Users/andreas/Downloads/localchat/localchat.apk) liegt direkt im Projektordner bereit zur Installation.
