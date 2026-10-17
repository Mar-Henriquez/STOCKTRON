"""Demostración rápida:  python demo.py   (crea stockcontrol.db con datos de ejemplo)"""
import os
from datetime import datetime

import db
from movimientos import consultar_movimientos, obtener_producto, registrar_entrada, registrar_salida

if os.path.exists(db.RUTA_BD):
    os.remove(db.RUTA_BD)                      # empieza siempre desde cero
con = db.iniciar_bd(db.conectar())
AHORA = datetime(2026, 9, 30, 13, 30)


def mostrar(titulo, r):
    estado = "APROBADA" if r["aprobado"] else "RECHAZADA"
    print(f"\n{titulo}\n  -> {estado}  folio={r['folio']}  stock {r['stock_anterior']} -> {r['stock_nuevo']}")
    for e in r["errores"]:
        print("     error:", e)
    for a in r["advertencias"]:
        print("     aviso:", a)


mostrar("Salida TS-14: despacho de 10 uds de PROD-101",
        registrar_salida(con, "PROD-101", 10, "TS-14", "EMP-023", {"referencia": "PED-2026-009", "destino": "Sucursal Norte"}, AHORA))
mostrar("Salida TS-01: venta de 8 uds de PROD-102 (solo hay 5)",
        registrar_salida(con, "PROD-102", 8, "TS-01", "EMP-023", {"referencia": "VT-310"}, AHORA))
compra = {"proveedor": "Distribuidora Caribe", "factura": "FAC-1020", "costo_unitario": 48.0,
          "lote": "LOT-1026", "fecha_vencimiento": "2027-06-30"}
mostrar("Entrada TE-01: compra de 24 uds de PROD-109 (agotado)",
        registrar_entrada(con, "PROD-109", 24, "TE-01", "EMP-023", compra, AHORA))
mostrar("Entrada TE-01: misma factura otra vez",
        registrar_entrada(con, "PROD-109", 24, "TE-01", "EMP-023", compra, AHORA))

print("\nHistorial:")
for m in consultar_movimientos(con):
    print(f"  {m['folio']}  {m['tipo_codigo']}  {m['producto_id']}  x{m['cantidad']}  {m['estado']}")
print("\nExistencias:")
for pid in ("PROD-101", "PROD-102", "PROD-103", "PROD-109"):
    p = obtener_producto(con, pid)
    print(f"  {pid}  {p['nombre']:<22} {p['stock_actual']:>3}  ({p['estado']})")
