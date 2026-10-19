"""
StockControl · Presentación para el profesor.

Un solo comando ejecuta todo:
    python presentacion.py            -> pruebas + demostración paso a paso (Enter para avanzar)
    python presentacion.py --rapido   -> igual, pero sin pausas
    python presentacion.py --api      -> enciende directamente la API web

La demostración usa una base de datos temporal (en memoria): no toca stockcontrol.db.
"""
import io
import sys
import unittest
from datetime import date, datetime, timedelta

import db
from movimientos import (consultar_movimientos, obtener_producto, registrar_entrada,
                         registrar_salida)

RAPIDO = "--rapido" in sys.argv
USA_COLOR = sys.stdout.isatty()


def c(codigo, texto):
    return f"\033[{codigo}m{texto}\033[0m" if USA_COLOR else texto


VERDE, ROJO, AMARILLO, AZUL, NEGRITA = "32", "31", "33", "36", "1"


def pausa():
    if RAPIDO or not sys.stdin.isatty():
        return
    try:
        input(c("2", "\n   [Enter para continuar]"))
    except EOFError:
        pass


def titulo(texto):
    print("\n" + c(AZUL, "=" * 72))
    print(c(NEGRITA, f"  {texto}"))
    print(c(AZUL, "=" * 72))


def escenario(numero, descripcion, regla):
    print("\n" + c(NEGRITA, f"{numero}. {descripcion}") + c("2", f"   [{regla}]"))


def mostrar(r):
    if r["aprobado"]:
        cambio = (f"   ({r['estado_anterior']} → {r['estado_nuevo']})"
                  if r["estado_anterior"] != r["estado_nuevo"] else "")
        print("   " + c(VERDE, "✔ APROBADA") +
              f"  folio {r['folio']}   stock {r['stock_anterior']} → {r['stock_nuevo']}" + cambio)
    else:
        folio = f"  folio {r['folio']}" if r["folio"] else "  (no se registra en el historial)"
        sin_cambio = (f"   stock {r['stock_anterior']} → {r['stock_nuevo']} (sin cambios)"
                      if r["stock_anterior"] is not None else "")
        print("   " + c(ROJO, "✘ RECHAZADA") + folio + sin_cambio)
    for e in r["errores"]:
        print("      " + c(ROJO, "error:  ") + e)
    for a in r["advertencias"]:
        print("      " + c(AMARILLO, "aviso:  ") + a)


# ------------------------------------------------------------------ 1. pruebas
def correr_pruebas():
    titulo("1. PRUEBAS AUTOMÁTICAS")
    print("   Ejecutando las pruebas de la lógica y de la API...")
    flujo = io.StringIO()
    suite = unittest.defaultTestLoader.discover(".", pattern="test_*.py")
    res = unittest.TextTestRunner(stream=flujo, verbosity=0).run(suite)
    problemas = len(res.failures) + len(res.errors)
    ok = res.testsRun - problemas
    color = VERDE if problemas == 0 else ROJO
    print("   " + c(color, f"{ok} de {res.testsRun} pruebas pasaron") + (" ✔" if problemas == 0 else " ✘"))
    if problemas:
        print(flujo.getvalue())
    return problemas == 0


# ------------------------------------------------------------------ 2. demostración
def demostracion():
    con = db.iniciar_bd(db.conectar(":memory:"))
    hoy = datetime.now()
    futuro = (date.today() + timedelta(days=365)).isoformat()
    pasado = (date.today() - timedelta(days=10)).isoformat()
    EMP, ADM = "EMP-023", "ADM-001"

    def existencias():
        print(f"\n   {'Producto':<10}{'Nombre':<24}{'Stock':>6}{'Mín.':>6}   Estado")
        for pid in ("PROD-101", "PROD-102", "PROD-103", "PROD-109"):
            p = obtener_producto(con, pid)
            col = {"Disponible": VERDE, "Stock bajo": AMARILLO, "Agotado": ROJO}[p["estado"]]
            print(f"   {pid:<10}{p['nombre']:<24}{p['stock_actual']:>6}{p['stock_minimo']:>6}   " + c(col, p["estado"]))

    titulo("2. DEMOSTRACIÓN: REGISTRO DE SALIDAS (CU-04)")
    print("\n   Inventario inicial:")
    existencias()
    pausa()

    escenario(1, "Venta de 5 unidades de Azúcar 5 lb (TS-01)", "RS-09 descuenta el stock")
    mostrar(registrar_salida(con, "PROD-103", 5, "TS-01", EMP, {"referencia": "VT-100"}, hoy))
    pausa()

    escenario(2, "Despacho de pedido de 10 unidades de Harina de trigo (TS-14)", "RS-13 advierte stock bajo")
    mostrar(registrar_salida(con, "PROD-101", 10, "TS-14", EMP,
                             {"referencia": "PED-2026-009", "destino": "Sucursal Norte",
                              "autorizacion": "Gerente de almacén"}, hoy))
    pausa()

    escenario(3, "Salida por producto vencido (TS-03), 2 unidades", "RS-05 datos según el tipo")
    mostrar(registrar_salida(con, "PROD-101", 2, "TS-03", EMP,
                             {"fecha_vencimiento": pasado, "observacion": "Lote vencido"}, hoy))
    pausa()

    escenario(4, "Venta de 8 unidades de Aceite, pero solo hay 5", "RS-08 stock suficiente / RS-20 sin cambios")
    mostrar(registrar_salida(con, "PROD-102", 8, "TS-01", EMP, {"referencia": "VT-310"}, hoy))
    pausa()

    escenario(5, "Salida con cantidad 0", "RS-07 cantidad mayor que cero")
    mostrar(registrar_salida(con, "PROD-103", 0, "TS-01", EMP, {"referencia": "VT-101"}, hoy))
    pausa()

    escenario(6, "Salida de un producto que no existe (PROD-999)", "RS-06 verificar que el producto exista")
    mostrar(registrar_salida(con, "PROD-999", 1, "TS-01", EMP, {"referencia": "VT-102"}, hoy))
    pausa()

    escenario(7, "Venta de las 5 unidades de Aceite: el stock llega a cero", "RS-14 producto agotado")
    mostrar(registrar_salida(con, "PROD-102", 5, "TS-01", EMP, {"referencia": "VT-311"}, hoy))
    pausa()

    escenario(8, "Baja definitiva (TS-15): primero un empleado, luego un administrador", "Permisos por tipo")
    datos = {"motivo": "Producto descontinuado", "autorizacion": "Gerencia"}
    mostrar(registrar_salida(con, "PROD-103", 1, "TS-15", EMP, datos, hoy))
    mostrar(registrar_salida(con, "PROD-103", 1, "TS-15", ADM, datos, hoy))
    pausa()

    titulo("3. DEMOSTRACIÓN: REGISTRO DE ENTRADAS (CU-03)")

    escenario(9, "Compra de 30 unidades de Azúcar (TE-01)", "RE-11 suma el stock")
    mostrar(registrar_entrada(con, "PROD-103", 30, "TE-01", EMP,
                              {"proveedor": "Distribuidora Caribe", "factura": "FAC-0900",
                               "costo_unitario": 20.0}, hoy))
    pausa()

    compra = {"proveedor": "Distribuidora Caribe", "factura": "FAC-1020", "costo_unitario": 48.0,
              "lote": "LOT-1026", "fecha_vencimiento": futuro}
    escenario(10, "Compra de 24 unidades de Harina integral, que estaba agotada", "RE-15 deja de estar agotado")
    mostrar(registrar_entrada(con, "PROD-109", 24, "TE-01", EMP, compra, hoy))
    pausa()

    escenario(11, "Se intenta registrar la misma factura otra vez", "RE-18 factura duplicada")
    mostrar(registrar_entrada(con, "PROD-109", 24, "TE-01", EMP, compra, hoy))
    pausa()

    escenario(12, "Ingreso de un lote con fecha de vencimiento ya pasada", "RE-10 no ingresar producto vencido")
    mostrar(registrar_entrada(con, "PROD-109", 10, "TE-01", EMP,
                              dict(compra, factura="FAC-1021", fecha_vencimiento=pasado), hoy))
    pausa()

    escenario(13, "Compra de producto perecedero sin lote ni vencimiento", "RE-09 lote y vencimiento")
    mostrar(registrar_entrada(con, "PROD-109", 10, "TE-01", EMP,
                              {"proveedor": "Distribuidora Caribe", "factura": "FAC-1022",
                               "costo_unitario": 48.0}, hoy))
    pausa()

    escenario(14, "Un cliente devuelve 2 unidades de Aceite (TE-02)", "RE-05 datos según el tipo")
    mostrar(registrar_entrada(con, "PROD-102", 2, "TE-02", EMP,
                              {"referencia": "VT-311", "motivo": "Envase en mal estado"}, hoy))
    pausa()

    titulo("4. CONSULTAS Y HISTORIAL")
    movs = consultar_movimientos(con)
    aprobados = sum(1 for m in movs if m["estado"] == "Aprobado")
    print(f"\n   Historial completo: {len(movs)} movimientos "
          f"({aprobados} aprobados, {len(movs) - aprobados} rechazados)\n")
    print(f"   {'Folio':<13}{'Tipo':<8}{'Producto':<10}{'Cant.':>6}  {'Estado':<10}Detalle")
    for m in reversed(movs):
        col = VERDE if m["estado"] == "Aprobado" else ROJO
        detalle = (m["motivo_rechazo"] or "")[:34]
        print(f"   {m['folio']:<13}{m['tipo_codigo']:<8}{m['producto_id']:<10}{m['cantidad']:>6}  "
              + c(col, f"{m['estado']:<10}") + detalle)
    print(f"\n   Solo entradas (RS-17):   {len(consultar_movimientos(con, direccion='ENTRADA'))} movimientos")
    print(f"   Solo PROD-109 (RS-16):   {len(consultar_movimientos(con, producto_id='PROD-109'))} movimientos")
    print(f"   Solo tipo TS-01 (RS-17): {len(consultar_movimientos(con, tipo='TS-01'))} movimientos")
    print("\n   Existencias finales:")
    existencias()


# ------------------------------------------------------------------ 3. API
def encender_api():
    from api import create_app
    titulo("5. API WEB")
    print("""
   Servidor encendido en http://127.0.0.1:5000   (Ctrl+C para apagarlo)

   Rutas para mostrar en el navegador (añadir al final de la dirección):
     /api/health                      comprobar que está activa
     /api/products                    productos y su estado
     /api/types?direccion=entrada     tipos de entrada
     /api/movements                   historial de movimientos
""")
    create_app().run(debug=False)


if __name__ == "__main__":
    if "--api" in sys.argv:
        encender_api()
        sys.exit()
    todo_ok = correr_pruebas()
    pausa()
    demostracion()
    print("\n" + c(VERDE if todo_ok else ROJO, "   Fin de la demostración."))
    if not RAPIDO and sys.stdin.isatty():
        if input("\n   ¿Encender la API web ahora? (s/n): ").strip().lower() == "s":
            encender_api()
