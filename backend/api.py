"""
StockControl · API web (Flask).

La API NO contiene reglas de negocio: recibe el JSON, lo traduce y llama a
movimientos.py (capa de lógica). Luego convierte el resultado en una respuesta HTTP.

Ejecutar:   python api.py        (queda en http://127.0.0.1:5000)
"""
from datetime import datetime

from flask import Flask, g, jsonify, request

import db
from movimientos import (consultar_movimientos, estado_producto, obtener_producto,
                         registrar_entrada, registrar_salida)

# Campos que vienen al nivel principal del JSON (con sus alias en inglés, como tu ejemplo).
ALIAS_PRINCIPALES = {
    "producto": ("product_id", "producto_id"),
    "cantidad": ("quantity", "cantidad"),
    "tipo": ("exit_type", "entry_type", "tipo"),
    "usuario": ("operator_id", "usuario_id"),
}
# El servidor asigna estos datos; si el cliente los envía, se ignoran.
IGNORADOS = {"folio", "date_time", "status", "estado", "fecha_hora"}
CAJAS_DE_DETALLES = ("exit_details", "entry_details", "details", "detalles")

# Traduce los nombres en inglés de tu JSON a los nombres que usa la lógica.
CLAVES = {
    "observation": "observacion", "destination": "destino", "authorization": "autorizacion",
    "reason": "motivo", "supplier": "proveedor", "invoice": "factura",
    "unit_cost": "costo_unitario", "lot_number": "lote", "expiration_date": "fecha_vencimiento",
    "recipient": "destinatario", "cause": "causa", "origin": "origen", "donor": "donante",
    "cutoff_date": "fecha_corte", "reference": "referencia",
}


def _codigo_http(errores):
    """Elige el código HTTP según el tipo de error (404, 409, 403 o 400)."""
    texto = " ".join(errores)
    if "no encontrado" in texto:
        return 404
    if "Stock insuficiente" in texto or "Factura duplicada" in texto:
        return 409
    if "administrador" in texto or "Usuario no válido" in texto:
        return 403
    return 400


def _leer_cuerpo(cuerpo):
    """Devuelve (producto, cantidad, tipo, usuario, datos) o lanza ValueError."""
    if not isinstance(cuerpo, dict):
        raise ValueError("El cuerpo de la petición debe ser un JSON (objeto).")
    principales = {}
    for destino, nombres in ALIAS_PRINCIPALES.items():
        principales[destino] = next((cuerpo[n] for n in nombres if n in cuerpo), None)
    usados = {n for nombres in ALIAS_PRINCIPALES.values() for n in nombres}
    datos = {}
    for k, v in cuerpo.items():
        if k in usados or k in IGNORADOS or k in CAJAS_DE_DETALLES:
            continue
        datos[CLAVES.get(k, k)] = v
    for caja in CAJAS_DE_DETALLES:
        if caja in cuerpo:
            if not isinstance(cuerpo[caja], dict):
                raise ValueError(f"'{caja}' debe ser un objeto JSON.")
            for k, v in cuerpo[caja].items():
                datos[CLAVES.get(k, k)] = v
    return (principales["producto"], principales["cantidad"], principales["tipo"],
            principales["usuario"], datos)


def create_app(ruta_bd=None, reloj=datetime.now):
    app = Flask(__name__)
    app.json.ensure_ascii = False          # que los acentos se vean bien
    ruta = ruta_bd or db.RUTA_BD

    inicial = db.conectar(ruta)
    db.iniciar_bd(inicial)
    inicial.close()

    def con():
        if "con" not in g:                 # una conexión por petición
            g.con = db.conectar(ruta)
        return g.con

    @app.teardown_appcontext
    def cerrar(_):
        c = g.pop("con", None)
        if c is not None:
            c.close()

    def _registrar(funcion):
        try:
            args = _leer_cuerpo(request.get_json(silent=True))
        except ValueError as e:
            return jsonify({"aprobado": False, "errores": [str(e)]}), 400
        producto, cantidad, tipo, usuario, datos = args
        r = funcion(con(), producto, cantidad, tipo, usuario, datos, reloj())
        r["estado"] = "Aprobado" if r["aprobado"] else "Rechazado"
        return jsonify(r), (201 if r["aprobado"] else _codigo_http(r["errores"]))

    @app.get("/api/health")
    def health():
        return jsonify({"estado": "ok"})

    @app.post("/api/exit-records")
    def salida():
        return _registrar(registrar_salida)

    @app.post("/api/entry-records")
    def entrada():
        return _registrar(registrar_entrada)

    @app.get("/api/movements")
    def movimientos():
        a = request.args
        return jsonify(consultar_movimientos(
            con(), producto_id=a.get("producto"), tipo=a.get("tipo"), desde=a.get("desde"),
            hasta=a.get("hasta"), direccion=a.get("direccion"), estado=a.get("estado")))

    @app.get("/api/products")
    def productos():
        filas = []
        for f in con().execute("SELECT * FROM productos ORDER BY id"):
            d = dict(f)
            d["estado"] = estado_producto(d["stock_actual"], d["stock_minimo"])
            filas.append(d)
        return jsonify(filas)

    @app.get("/api/products/<producto_id>")
    def producto(producto_id):
        p = obtener_producto(con(), producto_id)
        if p is None:
            return jsonify({"errores": ["Producto no encontrado en el inventario."]}), 404
        return jsonify(p)

    @app.get("/api/types")
    def tipos():
        sql, params = "SELECT * FROM tipos_movimiento", []
        if request.args.get("direccion"):
            sql += " WHERE direccion = ?"
            params.append(request.args["direccion"].upper())
        return jsonify([dict(f) for f in con().execute(sql + " ORDER BY codigo", params)])

    return app


if __name__ == "__main__":
    create_app().run(debug=True)
