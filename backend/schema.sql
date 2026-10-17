-- StockControl · Esquema de la base de datos (SQLite)
-- Una sola tabla "movimientos" guarda entradas y salidas; la columna
-- "direccion" de tipos_movimiento indica si suma o resta stock.

CREATE TABLE IF NOT EXISTS productos (
    id            TEXT PRIMARY KEY,                       -- ej. PROD-101
    nombre        TEXT NOT NULL,
    stock_actual  INTEGER NOT NULL DEFAULT 0
                  CHECK (stock_actual >= 0),              -- RS-15: nunca negativo
    stock_minimo  INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    stock_maximo  INTEGER CHECK (stock_maximo IS NULL OR stock_maximo >= stock_minimo),
    perecedero    INTEGER NOT NULL DEFAULT 0              -- 1 = exige lote y vencimiento
);

CREATE TABLE IF NOT EXISTS usuarios (
    id      TEXT PRIMARY KEY,                             -- ej. EMP-023
    nombre  TEXT NOT NULL,
    rol     TEXT NOT NULL CHECK (rol IN ('Administrador', 'Empleado'))
);

CREATE TABLE IF NOT EXISTS tipos_movimiento (
    codigo     TEXT PRIMARY KEY,                          -- TS-01..TS-15, TE-01..TE-10
    nombre     TEXT NOT NULL,
    direccion  TEXT NOT NULL CHECK (direccion IN ('ENTRADA', 'SALIDA'))
);

CREATE TABLE IF NOT EXISTS movimientos (
    folio            TEXT PRIMARY KEY,                    -- SC-2026-045 / EC-2026-031
    producto_id      TEXT NOT NULL REFERENCES productos(id),
    tipo_codigo      TEXT NOT NULL REFERENCES tipos_movimiento(codigo),
    cantidad         INTEGER NOT NULL,
    fecha_hora       TEXT NOT NULL,                       -- ISO: 2026-09-30T13:30:00
    usuario_id       TEXT NOT NULL REFERENCES usuarios(id),
    referencia       TEXT,
    estado           TEXT NOT NULL CHECK (estado IN ('Aprobado', 'Rechazado')),
    motivo_rechazo   TEXT,
    stock_anterior   INTEGER,
    stock_resultante INTEGER,
    detalles         TEXT NOT NULL DEFAULT '{}'           -- JSON con los datos propios del tipo
);

CREATE INDEX IF NOT EXISTS ix_mov_producto ON movimientos(producto_id);
CREATE INDEX IF NOT EXISTS ix_mov_tipo     ON movimientos(tipo_codigo);
CREATE INDEX IF NOT EXISTS ix_mov_fecha    ON movimientos(fecha_hora);
