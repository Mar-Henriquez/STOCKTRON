"""Pruebas de la API.   Ejecutar:  python test_api.py"""
import os
import tempfile
import unittest
from datetime import datetime

from api import create_app

AHORA = datetime(2026, 9, 30, 13, 30)

# El mismo JSON de ejemplo de tu documento (sección 8).
EJEMPLO_DOC = {
    "folio": "SC-2026-045", "product_id": "PROD-101", "quantity": 10, "lot_number": "LOT-0926",
    "reference": "PED-2026-009", "exit_type": "TS-14", "date_time": "2026-09-30T13:30:00",
    "status": "Aprobado", "operator_id": "EMP-023",
    "exit_details": {"observation": "Despacho de pedido regular", "destination": "Sucursal Norte",
                     "authorization": "Gerente de almacén"},
}
COMPRA = {"product_id": "PROD-109", "quantity": 24, "entry_type": "TE-01", "operator_id": "EMP-023",
          "supplier": "Distribuidora Caribe", "invoice": "FAC-1020", "unit_cost": 48.0,
          "lot_number": "LOT-1026", "expiration_date": "2027-06-30"}


class PruebasApi(unittest.TestCase):
    def setUp(self):
        fd, self.ruta = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        self.cli = create_app(self.ruta, reloj=lambda: AHORA).test_client()

    def tearDown(self):
        os.remove(self.ruta)

    def test_health(self):
        self.assertEqual(self.cli.get("/api/health").json["estado"], "ok")

    def test_salida_con_el_json_del_documento(self):
        r = self.cli.post("/api/exit-records", json=EJEMPLO_DOC)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json["stock_nuevo"], 15)
        self.assertEqual(r.json["folio"], "SC-2026-001")       # el servidor asigna el folio
        self.assertEqual(r.json["estado"], "Aprobado")
        self.assertEqual(self.cli.get("/api/products/PROD-101").json["stock_actual"], 15)

    def test_stock_insuficiente_409(self):
        r = self.cli.post("/api/exit-records", json={"product_id": "PROD-102", "quantity": 8,
                          "exit_type": "TS-01", "operator_id": "EMP-023", "reference": "VT-1"})
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json["estado"], "Rechazado")
        self.assertEqual(self.cli.get("/api/products/PROD-102").json["stock_actual"], 5)

    def test_producto_inexistente_404(self):
        r = self.cli.post("/api/exit-records", json=dict(EJEMPLO_DOC, product_id="PROD-999"))
        self.assertEqual(r.status_code, 404)

    def test_cantidad_cero_400(self):
        self.assertEqual(self.cli.post("/api/exit-records", json=dict(EJEMPLO_DOC, quantity=0)).status_code, 400)

    def test_json_invalido_400(self):
        r = self.cli.post("/api/exit-records", data="esto no es json", content_type="application/json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.cli.post("/api/exit-records", json=[1, 2]).status_code, 400)

    def test_permiso_403(self):
        r = self.cli.post("/api/exit-records", json={"product_id": "PROD-103", "quantity": 1,
                          "exit_type": "TS-15", "operator_id": "EMP-023", "reason": "x", "authorization": "y"})
        self.assertEqual(r.status_code, 403)

    def test_compra_y_factura_duplicada(self):
        ok = self.cli.post("/api/entry-records", json=COMPRA)
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.json["estado_anterior"], "Agotado")
        self.assertEqual(ok.json["folio"], "EC-2026-001")
        dup = self.cli.post("/api/entry-records", json=COMPRA)
        self.assertEqual(dup.status_code, 409)

    def test_acepta_claves_en_espanol(self):
        r = self.cli.post("/api/entry-records", json={"producto_id": "PROD-103", "cantidad": 5,
                          "tipo": "TE-06", "usuario_id": "EMP-023", "donante": "ONG"})
        self.assertEqual(r.status_code, 201)

    def test_consultas(self):
        self.cli.post("/api/exit-records", json=EJEMPLO_DOC)
        self.cli.post("/api/entry-records", json=COMPRA)
        self.assertEqual(len(self.cli.get("/api/movements").json), 2)
        self.assertEqual(len(self.cli.get("/api/movements?producto=PROD-101").json), 1)
        self.assertEqual(len(self.cli.get("/api/movements?direccion=ENTRADA").json), 1)
        self.assertEqual(len(self.cli.get("/api/movements?desde=2026-10-01").json), 0)
        self.assertEqual(len(self.cli.get("/api/types?direccion=entrada").json), 10)
        self.assertEqual(len(self.cli.get("/api/products").json), 4)
        self.assertEqual(self.cli.get("/api/products/NOEXISTE").status_code, 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)
