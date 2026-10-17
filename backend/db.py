"""Conexión a la base de datos y datos iniciales de StockControl."""
import os
import sqlite3

CARPETA = os.path.dirname(os.path.abspath(__file__))
RUTA_BD = os.path.join(CARPETA, "stockcontrol.db")

TIPOS = [
    ("TS-01", "Venta", "SALIDA"), ("TS-02", "Producto dañado", "SALIDA"),
    ("TS-03", "Producto vencido", "SALIDA"), ("TS-04", "Devolución a proveedor", "SALIDA"),
    ("TS-05", "Consumo interno", "SALIDA"), ("TS-06", "Pérdida o extravío", "SALIDA"),
    ("TS-07", "Robo", "SALIDA"), ("TS-08", "Ajuste por inventario físico", "SALIDA"),
    ("TS-09", "Transferencia a otra sucursal", "SALIDA"), ("TS-10", "Muestra o promoción", "SALIDA"),
    ("TS-11", "Donación", "SALIDA"), ("TS-12", "Merma", "SALIDA"),
    ("TS-13", "Uso para producción", "SALIDA"), ("TS-14", "Despacho de pedido", "SALIDA"),
    ("TS-15", "Baja definitiva", "SALIDA"),
    ("TE-01", "Compra a proveedor", "ENTRADA"), ("TE-02", "Devolución de cliente", "ENTRADA"),
    ("TE-03", "Transferencia recibida", "ENTRADA"), ("TE-04", "Ajuste por inventario físico", "ENTRADA"),
    ("TE-05", "Producción terminada", "ENTRADA"), ("TE-06", "Donación recibida", "ENTRADA"),
    ("TE-07", "Inventario inicial", "ENTRADA"), ("TE-08", "Bonificación del proveedor", "ENTRADA"),
    ("TE-09", "Producto recuperado", "ENTRADA"), ("TE-10", "Reposición por garantía", "ENTRADA"),
]

USUARIOS_DEMO = [("EMP-023", "Empleado de ejemplo", "Empleado"),
                 ("ADM-001", "Administrador de ejemplo", "Administrador")]

# (id, nombre, stock_actual, stock_minimo, stock_maximo, perecedero)
PRODUCTOS_DEMO = [
    ("PROD-101", "Harina de trigo 1 lb", 25, 15, 100, 1),
    ("PROD-102", "Aceite vegetal 1 L", 5, 10, 80, 0),
    ("PROD-103", "Azúcar 5 lb", 40, 12, 120, 0),
    ("PROD-109", "Harina integral 1 lb", 0, 8, 60, 1),
]


def conectar(ruta=RUTA_BD):
    """Abre la base. isolation_level=None: las transacciones se controlan a mano."""
    con = sqlite3.connect(ruta, isolation_level=None)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def iniciar_bd(con, con_datos_demo=True):
    """Crea las tablas (si no existen) y carga los tipos de movimiento."""
    with open(os.path.join(CARPETA, "schema.sql"), encoding="utf-8") as f:
        con.executescript(f.read())
    con.executemany("INSERT OR IGNORE INTO tipos_movimiento VALUES (?, ?, ?)", TIPOS)
    if con_datos_demo:
        con.executemany("INSERT OR IGNORE INTO usuarios VALUES (?, ?, ?)", USUARIOS_DEMO)
        con.executemany("INSERT OR IGNORE INTO productos VALUES (?, ?, ?, ?, ?, ?)", PRODUCTOS_DEMO)
    return con
