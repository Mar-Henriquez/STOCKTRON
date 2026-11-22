-- StockControl · Esquema de base de datos (SQLite)
-- Versión refactorizada según el diseño funcional aprobado.

PRAGMA foreign_keys = ON;

-- =========================================================
-- PRODUCTOS
-- =========================================================
CREATE TABLE IF NOT EXISTS productos (
    id              TEXT PRIMARY KEY,                       -- ej. PROD-101
    nombre          TEXT NOT NULL,
    marca           TEXT,
    stock_actual    INTEGER NOT NULL DEFAULT 0
                    CHECK (stock_actual >= 0),
    stock_minimo    INTEGER NOT NULL DEFAULT 0
                    CHECK (stock_minimo >= 0),
    stock_maximo    INTEGER
                    CHECK (
                        stock_maximo IS NULL
                        OR stock_maximo >= stock_minimo
                    ),
    perecedero      INTEGER NOT NULL DEFAULT 0
                    CHECK (perecedero IN (0, 1))
);

-- =========================================================
-- USUARIOS
-- =========================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id                  TEXT PRIMARY KEY,                   -- ej. EMP-023
    nombre              TEXT NOT NULL,
    correo              TEXT UNIQUE,
    contrasena_hash     TEXT,
    rol                 TEXT NOT NULL
                        CHECK (rol IN ('Administrador', 'Empleado')),
    estado              TEXT NOT NULL DEFAULT 'Activo'
                        CHECK (estado IN ('Activo', 'Inactivo')),
    observaciones       TEXT
);

-- =========================================================
-- PROVEEDORES
-- =========================================================
CREATE TABLE IF NOT EXISTS proveedores (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          TEXT NOT NULL,
    rnc             TEXT UNIQUE,
    contacto        TEXT,
    telefono        TEXT,
    correo          TEXT,
    direccion       TEXT,
    estado          TEXT NOT NULL DEFAULT 'Activo'
                    CHECK (estado IN ('Activo', 'Inactivo')),
    observaciones   TEXT
);

-- =========================================================
-- TIPOS DE MOVIMIENTO
-- =========================================================
CREATE TABLE IF NOT EXISTS tipos_movimiento (
    codigo          TEXT PRIMARY KEY,                       -- TS-01..TS-15 / TE-01..TE-10
    nombre          TEXT NOT NULL,
    direccion       TEXT NOT NULL
                    CHECK (direccion IN ('ENTRADA', 'SALIDA')),
    restringido     INTEGER NOT NULL DEFAULT 0
                    CHECK (restringido IN (0, 1))
);

-- =========================================================
-- MOVIMIENTOS
-- Historial único de entradas y salidas.
-- =========================================================
CREATE TABLE IF NOT EXISTS movimientos (
    folio               TEXT PRIMARY KEY,                  -- SC-2026-001 / EC-2026-001
    producto_id         TEXT NOT NULL,
    tipo_codigo         TEXT NOT NULL,
    cantidad            INTEGER NOT NULL
                        CHECK (cantidad >= 0),
    fecha_hora          TEXT NOT NULL,                     -- ISO 8601
    usuario_id          TEXT NOT NULL,
    referencia          TEXT,
    estado              TEXT NOT NULL
                        CHECK (estado IN ('Aprobado', 'Rechazado')),
    motivo_rechazo      TEXT,
    stock_anterior      INTEGER NOT NULL
                        CHECK (stock_anterior >= 0),
    stock_resultante    INTEGER NOT NULL
                        CHECK (stock_resultante >= 0),

    FOREIGN KEY (producto_id)
        REFERENCES productos(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (tipo_codigo)
        REFERENCES tipos_movimiento(codigo)
        ON DELETE RESTRICT,

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
);

-- =========================================================
-- DETALLE DE MOVIMIENTO
-- Datos específicos según el tipo de entrada o salida.
-- Una fila como máximo por movimiento.
-- =========================================================
CREATE TABLE IF NOT EXISTS detalle_movimiento (
    folio                   TEXT PRIMARY KEY,
    proveedor_id            INTEGER,

    factura                 TEXT,
    costo_unitario          NUMERIC CHECK (
                                costo_unitario IS NULL
                                OR costo_unitario > 0
                            ),
    total_compra            NUMERIC CHECK (
                                total_compra IS NULL
                                OR total_compra >= 0
                            ),

    destino                 TEXT,
    destinatario            TEXT,
    origen                  TEXT,
    donante                 TEXT,
    motivo                  TEXT,
    causa                   TEXT,
    autorizacion            TEXT,
    estado_devuelto         TEXT,

    fecha_corte             TEXT,
    fecha_vencimiento       TEXT,
    observacion             TEXT,

    FOREIGN KEY (folio)
        REFERENCES movimientos(folio)
        ON DELETE RESTRICT,

    FOREIGN KEY (proveedor_id)
        REFERENCES proveedores(id)
        ON DELETE RESTRICT
);

-- =========================================================
-- LOTES
-- Para productos perecederos.
-- =========================================================
CREATE TABLE IF NOT EXISTS lotes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id         TEXT NOT NULL,
    folio_entrada       TEXT NOT NULL UNIQUE,
    numero_lote         TEXT NOT NULL,
    fecha_vencimiento   TEXT NOT NULL,
    cantidad_ingresada  INTEGER NOT NULL
                        CHECK (cantidad_ingresada > 0),

    FOREIGN KEY (producto_id)
        REFERENCES productos(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (folio_entrada)
        REFERENCES movimientos(folio)
        ON DELETE RESTRICT
);

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX IF NOT EXISTS ix_mov_producto
ON movimientos(producto_id);

CREATE INDEX IF NOT EXISTS ix_mov_tipo
ON movimientos(tipo_codigo);

CREATE INDEX IF NOT EXISTS ix_mov_fecha
ON movimientos(fecha_hora);

CREATE INDEX IF NOT EXISTS ix_mov_usuario
ON movimientos(usuario_id);

CREATE INDEX IF NOT EXISTS ix_det_proveedor_factura
ON detalle_movimiento(proveedor_id, factura);

CREATE INDEX IF NOT EXISTS ix_lotes_producto
ON lotes(producto_id);

CREATE INDEX IF NOT EXISTS ix_lotes_vence
ON lotes(fecha_vencimiento);
