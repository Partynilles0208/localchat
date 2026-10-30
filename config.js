/**
 * CLEAN SLATE // Supabase & Vercel Environment Configuration
 * 
 * Wenn die App auf Vercel bereitgestellt wird, können die Umgebungsvariablen
 * entweder hier eingetragen oder direkt im App-Menü (3 Punkte ⋮) hinterlegt werden.
 * Werte in localStorage überschreiben diese Standardwerte.
 */

window.SUPABASE_CONFIG = {
  // Trage hier deine Supabase-URL ein (z. B. "https://xyzcompany.supabase.co")
  url: window.ENV_SUPABASE_URL || localStorage.getItem("clean_slate_supabase_url") || "",
  
  // Trage hier deinen öffentlichen Anon-Key ein (anon public)
  anonKey: window.ENV_SUPABASE_ANON_KEY || localStorage.getItem("clean_slate_supabase_key") || ""
};
