-- =============================================================================
-- CLEAN SLATE // Supabase Schema & Realtime Setup
-- =============================================================================
-- Führe diesen SQL-Code im Supabase SQL Editor aus (SQL Editor -> New Query -> Run)

-- 1. Tabelle für registrierte Benutzer (Sichere Authentifizierung & Kontaktfindung)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,                       -- Eindeutige Kennung (username klein)
    username TEXT UNIQUE NOT NULL,             -- Anzeigename
    display_name TEXT,
    password_hash TEXT,                        -- SHA-256 kryptografischer Passwort-Hash
    avatar_url TEXT,
    status TEXT DEFAULT 'Online',              -- 'Online', 'Abwesend', etc.
    last_seen TIMESTAMPTZ DEFAULT NOW(),       -- Zuletzt online
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spalte hinzufügen falls bereits erstellt
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- RLS aktivieren (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Leserecht für alle (damit jeder registrierte Benutzer automatisch sichtbar ist)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

-- Schreibrecht für alle (Einfügen und Aktualisieren des eigenen Profils)
DROP POLICY IF EXISTS "Profiles can be inserted/updated" ON public.profiles;
CREATE POLICY "Profiles can be inserted/updated" 
ON public.profiles FOR ALL USING (true);

-- 2. Ephemere Echtzeit-Tabelle für sparsame Nachrichten-Zustellung
-- Nachrichten werden auf den Endgeräten in localStorage gespeichert.
-- Diese Tabelle dient nur als schlanke Relais-Station für Offline-Zustellung.
CREATE TABLE IF NOT EXISTS public.ephemeral_messages (
    id BIGSERIAL PRIMARY KEY,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    payload JSONB NOT NULL,
    delivered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ephemeral_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ephemeral messages access" ON public.ephemeral_messages;
CREATE POLICY "Ephemeral messages access" 
ON public.ephemeral_messages FOR ALL USING (true);

-- Automatische Bereinigung alter ephemerer Nachrichten nach 7 Tagen (spart Speicher)
CREATE OR REPLACE FUNCTION delete_old_ephemeral_messages() 
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.ephemeral_messages WHERE created_at < NOW() - INTERVAL '7 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clean_old_messages ON public.ephemeral_messages;
CREATE TRIGGER trigger_clean_old_messages
AFTER INSERT ON public.ephemeral_messages
EXECUTE FUNCTION delete_old_ephemeral_messages();

-- 3. Supabase Realtime für profiles und ephemeral_messages aktivieren
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ephemeral_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ephemeral_messages;
  END IF;
END $$;
