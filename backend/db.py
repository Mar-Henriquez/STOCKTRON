"""Conexión a la base de datos y datos iniciales de StockControl."""

import os
import sqlite3


CARPETA = os.path.dirname(os.path.abspath(__file__))
RUTA_BD = os.path.join(CARPETA, "stockcontrol.db")


# =========================================================
# TIPOS DE MOVIMIENTO
# (codigo, nombre, direccion, restringido)
#
# restringido:
# 0 = Empleado o Administrador
# 1 = Solo Administrador
# =========================================================

TIPOS = [
    # SALIDAS
    ("TS-01", "Venta", "SALIDA", 0),
    ("TS-02", "Producto dañado", "SALIDA", 0),
    ("TS-03", "Producto vencido", "SALIDA", 0),
    ("TS-04", "Devolución a proveedor", "SALIDA", 0),
    ("TS-05", "Consumo interno", "SALIDA", 0),
    ("TS-06", "Pérdida o extravío", "SALIDA", 0),
    ("TS-07", "Robo", "SALIDA", 1),
    ("TS-08", "Ajuste por inventario físico", "SALIDA", 1),
    ("TS-09", "Transferencia a otra sucursal", "SALIDA", 0),
    ("TS-10", "Muestra o promoción", "SALIDA", 0),
    ("TS-11", "Donación", "SALIDA", 1),
    ("TS-12", "Merma", "SALIDA", 0),
    ("TS-13", "Uso para producción", "SALIDA", 0),
    ("TS-14", "Despacho de pedido", "SALIDA", 0),
    ("TS-15", "Baja definitiva", "SALIDA", 1),

    # ENTRADAS
    ("TE-01", "Compra a proveedor", "ENTRADA", 0),
    ("TE-02", "Devolución de cliente", "ENTRADA", 0),
    ("TE-03", "Transferencia recibida", "ENTRADA", 0),
    ("TE-04", "Ajuste por inventario físico", "ENTRADA", 1),
    ("TE-05", "Producción terminada", "ENTRADA", 0),
    ("TE-06", "Donación recibida", "ENTRADA", 0),
    ("TE-07", "Inventario inicial", "ENTRADA", 1),
    ("TE-08", "Bonificación del proveedor", "ENTRADA", 0),
    ("TE-09", "Producto recuperado", "ENTRADA", 0),
    ("TE-10", "Reposición por garantía", "ENTRADA", 0),
]


# =========================================================
# USUARIOS DE DEMOSTRACIÓN
# =========================================================

USUARIOS_DEMO = [
    (
        "EMP-023",
        "Empleado de ejemplo",
        "empleado@stockcontrol.local",
        None,
        "Empleado",
        "Activo",
        None,
    ),
    (
        "ADM-001",
        "Administrador de ejemplo",
        "admin@stockcontrol.local",
        None,
        "Administrador",
        "Activo",
        None,
    ),
]


# =========================================================
# PRODUCTOS DE DEMOSTRACIÓN
#
# id, nombre, marca, stock_actual,
# stock_minimo, stock_maximo, perecedero
# =========================================================

PRODUCTOS_DEMO = [
    (
        "PROD-101",
        "Harina de trigo 1 lb",
        "La Famosa",
        25,
        15,
        100,
        1,
        85.00,
        0.18,
    ),
    (
        "PROD-102",
        "Aceite vegetal 1 L",
        "Crisol",
        5,
        10,
        80,
        0,
        210.00,
        0.18,
    ),
    (
        "PROD-103",
        "Azúcar 5 lb",
        "Cristal",
        40,
        12,
        120,
        0,
        245.00,
        0.18,
    ),
    (
        "PROD-109",
        "Harina integral 1 lb",
        "La Famosa",
        0,
        8,
        60,
        1,
        110.00,
        0.18,
    ),
]

# =========================================================
# PROVEEDORES DE DEMOSTRACIÓN
# =========================================================

PROVEEDORES_DEMO = [
    (
        "Distribuidora Caribe",
        "131000001",
        "Carlos Pérez",
        "809-555-0101",
        "ventas@distribuidoracaribe.local",
        "Santo Domingo",
        "Activo",
        "Proveedor de demostración",
    ),
    (
        "Suplidora Nacional",
        "131000002",
        "Ana Rodríguez",
        "809-555-0102",
        "ventas@suplidoranacional.local",
        "Santo Domingo",
        "Activo",
        None,
    ),
]


def conectar(ruta=RUTA_BD):
    """
    Abre una conexión SQLite.

    isolation_level=None permite controlar manualmente
    BEGIN, COMMIT y ROLLBACK desde la lógica de negocio.
    """

    con = sqlite3.connect(ruta, isolation_level=None)
    con.row_factory = sqlite3.Row

    # SQLite no activa las llaves foráneas automáticamente.
    con.execute("PRAGMA foreign_keys = ON")

    return con


def iniciar_bd(con, con_datos_demo=True):
    """
    Crea las tablas del sistema y carga los catálogos iniciales.
    """

    # Crear estructura de base de datos
    with open(
        os.path.join(CARPETA, "schema.sql"),
        encoding="utf-8"
    ) as archivo:
        con.executescript(archivo.read())

    # -----------------------------------------------------
    # Migración de productos
    # -----------------------------------------------------

    columnas_productos = {
        fila["name"]
        for fila in con.execute(
            "PRAGMA table_info(productos)"
        )
    }

    if "precio_venta" not in columnas_productos:
        con.execute(
            """
            ALTER TABLE productos
            ADD COLUMN precio_venta REAL
            NOT NULL DEFAULT 0
            CHECK (precio_venta >= 0)
            """
        )

    if "tasa_itbis" not in columnas_productos:
        con.execute(
            """
            ALTER TABLE productos
            ADD COLUMN tasa_itbis REAL
            NOT NULL DEFAULT 0.18
            CHECK (tasa_itbis IN (0, 0.16, 0.18))
            """
        )
        
    
    # -----------------------------------------------------
    # Tipos de movimiento
    # -----------------------------------------------------

    con.executemany(
        """
        INSERT OR IGNORE INTO tipos_movimiento
        (
            codigo,
            nombre,
            direccion,
            restringido
        )
        VALUES (?, ?, ?, ?)
        """,
        TIPOS,
    )

    if con_datos_demo:

        # -------------------------------------------------
        # Usuarios
        # -------------------------------------------------

        con.executemany(
            """
            INSERT OR IGNORE INTO usuarios
            (
                id,
                nombre,
                correo,
                contrasena_hash,
                rol,
                estado,
                observaciones
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            USUARIOS_DEMO,
        )

        # -------------------------------------------------
        # Productos
        # -------------------------------------------------

        con.executemany(
            """
            INSERT OR IGNORE INTO productos
            (
                id,
                nombre,
                marca,
                stock_actual,
                stock_minimo,
                stock_maximo,
                perecedero,
                precio_venta,
                tasa_itbis
            )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            PRODUCTOS_DEMO,
        )

        
        # Actualizar precio e ITBIS de los productos demo
        # aunque ya existieran antes de la migración.

        con.executemany(
            """
            UPDATE productos
            SET
                precio_venta = ?,
                tasa_itbis = ?
            WHERE id = ?
            """,
            [
                (
                    producto[7],
                    producto[8],
                    producto[0],
                )
                for producto in PRODUCTOS_DEMO
            ],
        )
        
        
        # -------------------------------------------------
        # Proveedores
        # -------------------------------------------------

        con.executemany(
            """
            INSERT OR IGNORE INTO proveedores
            (
                nombre,
                rnc,
                contacto,
                telefono,
                correo,
                direccion,
                estado,
                observaciones
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            PROVEEDORES_DEMO,
        )

    return con
