-- Um registro por acesso. Sem IP: só a localização aproximada que a Cloudflare deduz dele.
CREATE TABLE IF NOT EXISTS acessos (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  quando  TEXT NOT NULL,   -- data e hora em UTC, ISO 8601
  cidade  TEXT,
  estado  TEXT,
  pais    TEXT,            -- código ISO de 2 letras
  pagina  TEXT
);
CREATE INDEX IF NOT EXISTS idx_acessos_quando ON acessos (quando);
