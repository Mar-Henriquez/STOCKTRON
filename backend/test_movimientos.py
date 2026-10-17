"""
Pruebas automáticas (corresponden a tus PF-01..PF-20 y a los ejemplos de entradas).
Ejecutar:   python test_movimientos.py
"""
import unittest
from datetime import datetime

import db
from movimientos import (CAMPOS_REQUERIDOS, consultar_movimientos, obtener_producto,
                         registrar_entrada, registrar_salida)

AHORA = datetime(2026, 9, 30, 13, 30)
EMP, ADM = "EMP-023", "ADM-001"


def datos_validos(tipo):
    """Arma datos completos para un tipo, según CAMPOS_REQUERIDOS."""
    especiales = {"fecha_vencimiento": "2027-06-30", "costo_unitario": 48.0, "fecha_corte": "2026-09-30"}
    return {c: especiales.get(c, f"dato-{c}") for c in CAMPOS_REQUERIDOS[tipo]}


class Base(unittest.TestCase):
    def setUp(self):
        self.con = db.iniciar_bd(db.conectar(":memory:"))

    def stock(self, pid):
        return obtener_producto(self.con, pid)["stock_actual"]

    def fijar(self, pid, stock, minimo=None):
        self.con.execute("UPDATE productos SET stock_actual = ? WHERE id = ?", (stock, pid))
        if minimo is not None:
            self.con.execute("UPDATE productos SET stock_minimo = ? WHERE id = ?", (minimo, pid))

    def salida(self, pid, cant, tipo, usuario=EMP, datos=None):
        return registrar_salida(self.con, pid, cant, tipo, usuario, datos, AHORA)

    def entrada(self, pid, cant, tipo, usuario=EMP, datos=None):
        return registrar_entrada(self.con, pid, cant, tipo, usuario, datos, AHORA)


class PruebasSalidas(Base):
    def test_pf01_venta_valida(self):
        self.fijar("PROD-103", 30)
        r = self.salida("PROD-103", 5, "TS-01", datos={"referencia": "VT-100"})
        self.assertTrue(r["aprobado"])
        self.assertEqual(self.stock("PROD-103"), 25)          # Ejemplo 1: 30 - 5 = 25
        self.assertEqual(r["folio"], "SC-2026-001")
        self.assertEqual(consultar_movimientos(self.con)[0]["tipo_codigo"], "TS-01")

    def test_pf02_a_pf15_todos_los_tipos_de_salida(self):
        self.fijar("PROD-103", 100)
        for n in range(1, 16):
            tipo = f"TS-{n:02d}"
            r = self.salida("PROD-103", 1, tipo, usuario=ADM, datos=datos_validos(tipo))
            self.assertTrue(r["aprobado"], f"{tipo}: {r['errores']}")
        self.assertEqual(self.stock("PROD-103"), 85)
        self.assertEqual(len(consultar_movimientos(self.con)), 15)

    def test_salida_sin_dato_obligatorio_se_rechaza(self):
        r = self.salida("PROD-103", 1, "TS-02")                # falta descripción del daño
        self.assertFalse(r["aprobado"])
        self.assertEqual(self.stock("PROD-103"), 40)

    def test_pf16_producto_inexistente(self):
        r = self.salida("PROD-999", 1, "TS-01", datos={"referencia": "x"})
        self.assertFalse(r["aprobado"])
        self.assertEqual(consultar_movimientos(self.con), [])  # no inventa historial

    def test_pf17_stock_insuficiente(self):
        r = self.salida("PROD-102", 8, "TS-01", datos={"referencia": "VT-310"})   # Ejemplo 8
        self.assertFalse(r["aprobado"])
        self.assertIn("Stock insuficiente", r["errores"][0])
        self.assertEqual(self.stock("PROD-102"), 5)            # RS-20: sin cambios
        self.assertEqual(consultar_movimientos(self.con)[0]["estado"], "Rechazado")

    def test_pf18_cantidad_invalida(self):
        for malo in (0, -3, "abc", 2.5, None, True):
            r = self.salida("PROD-103", malo, "TS-01", datos={"referencia": "x"})
            self.assertFalse(r["aprobado"], f"debió rechazar {malo!r}")
        self.assertEqual(self.stock("PROD-103"), 40)

    def test_pf19_bajo_stock_genera_advertencia(self):
        r = self.salida("PROD-101", 10, "TS-14", datos={"referencia": "PED-2026-009"})
        self.assertTrue(r["aprobado"])
        self.assertEqual((r["stock_anterior"], r["stock_nuevo"]), (25, 15))
        self.assertEqual(r["estado_nuevo"], "Stock bajo")
        self.assertTrue(any("Stock bajo" in a for a in r["advertencias"]))

    def test_pf20_stock_en_cero_queda_agotado(self):
        r = self.salida("PROD-102", 5, "TS-01", datos={"referencia": "VT-1"})
        self.assertTrue(r["aprobado"])
        self.assertEqual(r["estado_nuevo"], "Agotado")
        self.assertEqual(obtener_producto(self.con, "PROD-102")["estado"], "Agotado")

    def test_permisos_tipo_restringido(self):
        malo = self.salida("PROD-103", 1, "TS-15", usuario=EMP, datos=datos_validos("TS-15"))
        bueno = self.salida("PROD-103", 1, "TS-15", usuario=ADM, datos=datos_validos("TS-15"))
        self.assertFalse(malo["aprobado"])
        self.assertTrue(bueno["aprobado"])

    def test_tipo_de_entrada_no_sirve_en_una_salida(self):
        self.assertFalse(self.salida("PROD-103", 1, "TE-01")["aprobado"])


class PruebasEntradas(Base):
    COMPRA = {"proveedor": "Distribuidora Caribe", "factura": "FAC-1020", "costo_unitario": 48.0,
              "lote": "LOT-1026", "fecha_vencimiento": "2027-06-30"}

    def test_ejemplo1_compra_suma_stock(self):
        self.fijar("PROD-103", 20)
        r = self.entrada("PROD-103", 30, "TE-01", datos=self.COMPRA)
        self.assertTrue(r["aprobado"])
        self.assertEqual(self.stock("PROD-103"), 50)
        self.assertEqual(r["folio"], "EC-2026-001")

    def test_ejemplo2_producto_agotado_deja_de_estarlo(self):
        r = self.entrada("PROD-109", 24, "TE-01", datos=self.COMPRA)
        self.assertTrue(r["aprobado"])
        self.assertEqual((r["estado_anterior"], r["estado_nuevo"]), ("Agotado", "Disponible"))
        self.assertEqual(self.stock("PROD-109"), 24)

    def test_ejemplo4_sigue_bajo_el_minimo(self):
        self.fijar("PROD-103", 4, minimo=15)
        r = self.entrada("PROD-103", 6, "TE-01", datos=self.COMPRA)
        self.assertTrue(r["aprobado"])
        self.assertEqual(r["stock_nuevo"], 10)
        self.assertTrue(any("Stock bajo" in a for a in r["advertencias"]))

    def test_ejemplo5_cantidad_cero(self):
        r = self.entrada("PROD-103", 0, "TE-01", datos=self.COMPRA)
        self.assertFalse(r["aprobado"])
        self.assertEqual(self.stock("PROD-103"), 40)

    def test_ejemplo6_producto_vencido(self):
        datos = dict(self.COMPRA, fecha_vencimiento="2026-09-20")
        r = self.entrada("PROD-109", 10, "TE-01", datos=datos)
        self.assertFalse(r["aprobado"])
        self.assertIn("vencido", " ".join(r["errores"]))
        self.assertEqual(self.stock("PROD-109"), 0)

    def test_ejemplo7_factura_duplicada(self):
        self.assertTrue(self.entrada("PROD-103", 5, "TE-01", datos=self.COMPRA)["aprobado"])
        r = self.entrada("PROD-103", 5, "TE-01", datos=self.COMPRA)
        self.assertFalse(r["aprobado"])
        self.assertIn("Factura duplicada", r["errores"][0])
        self.assertEqual(self.stock("PROD-103"), 45)
        otro = dict(self.COMPRA, proveedor="Otro Proveedor")     # misma factura, otro proveedor: válido
        self.assertTrue(self.entrada("PROD-103", 5, "TE-01", datos=otro)["aprobado"])

    def test_perecedero_exige_lote_y_vencimiento(self):
        datos = {"proveedor": "X", "factura": "F-1", "costo_unitario": 10}
        self.assertFalse(self.entrada("PROD-109", 5, "TE-01", datos=datos)["aprobado"])

    def test_supera_maximo_advierte_pero_aprueba(self):
        r = self.entrada("PROD-103", 100, "TE-01", datos=self.COMPRA)   # 140 > máximo 120
        self.assertTrue(r["aprobado"])
        self.assertTrue(any("máximo" in a for a in r["advertencias"]))

    def test_todos_los_tipos_de_entrada(self):
        for n in range(1, 11):
            tipo = f"TE-{n:02d}"
            r = self.entrada("PROD-103", 1, tipo, usuario=ADM, datos=datos_validos(tipo))
            self.assertTrue(r["aprobado"], f"{tipo}: {r['errores']}")
        self.assertEqual(self.stock("PROD-103"), 50)


class PruebasConsultas(Base):
    def test_filtros(self):
        self.salida("PROD-103", 2, "TS-01", datos={"referencia": "a"})
        self.salida("PROD-101", 3, "TS-14", datos={"referencia": "b"})
        self.entrada("PROD-103", 4, "TE-06", datos={"donante": "ONG"})
        self.assertEqual(len(consultar_movimientos(self.con, producto_id="PROD-103")), 2)    # RS-16
        self.assertEqual(len(consultar_movimientos(self.con, tipo="TS-14")), 1)              # RS-17
        self.assertEqual(len(consultar_movimientos(self.con, desde="2026-09-01", hasta="2026-09-30")), 3)  # RS-18
        self.assertEqual(consultar_movimientos(self.con, desde="2026-10-01"), [])
        self.assertEqual(len(consultar_movimientos(self.con, direccion="ENTRADA")), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
