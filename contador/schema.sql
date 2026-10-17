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

-- Mensagens do Fale conosco. Sem IP: o IP só entra no limite de envios por minuto e não é gravado.
CREATE TABLE IF NOT EXISTS mensagens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  quando       TEXT NOT NULL,     -- data e hora em UTC, ISO 8601
  assunto      TEXT NOT NULL,     -- relato, serra, dado, problema, sugestao, elogio
  mensagem     TEXT NOT NULL,
  carro        TEXT,              -- só no relato de subida
  serra        TEXT,              -- só no relato de subida
  bateria_pe   INTEGER,           -- % no pé da serra (relato)
  bateria_topo INTEGER,           -- % no topo (relato)
  link         TEXT,              -- gravação de GPS ou fonte do dado
  nome         TEXT,              -- opcional
  email        TEXT,              -- opcional, só para responder
  cidade       TEXT,
  estado       TEXT,
  pais         TEXT,
  lida         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mensagens_lida ON mensagens (lida, id);
