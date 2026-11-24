
from datetime import datetime

from flask import Flask, g, jsonify, request, send_from_directory

import db
from movimientos import (consultar_movimientos, estado_producto, obtener_producto,
                         registrar_entrada, registrar_salida)


ALIAS_PRINCIPALES = {
    "producto": ("product_id", "producto_id"),
    "cantidad": ("quantity", "cantidad"),
    "tipo": ("exit_type", "entry_type", "tipo"),
    "usuario": ("operator_id", "usuario_id"),
}

IGNORADOS = {"folio", "date_time", "status", "estado", "fecha_hora"}
CAJAS_DE_DETALLES = ("exit_details", "entry_details", "details", "detalles")


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
    app = Flask(
        __name__,
        static_folder=None
    )
    app.json.ensure_ascii = False          
    ruta = ruta_bd or db.RUTA_BD

    inicial = db.conectar(ruta)
    db.iniciar_bd(inicial)
    inicial.close()

    def con():
        if "con" not in g:                
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

    @app.get("/")
    def frontend():
        return send_from_directory(
            "..",
            "index.html"
        )

    @app.get("/style.css")
    def estilos():
        return send_from_directory(
            "..",
            "style.css"
        )

    @app.get("/script.js")
    def javascript():
        return send_from_directory(
            "..",
            "script.js"
        )

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

    @app.post("/api/products")
    def crear_producto():
        cuerpo = request.get_json(silent=True)

        if not isinstance(cuerpo, dict):
            return jsonify({
                "errores": [
                    "El cuerpo de la petición debe ser un JSON."
                ]
            }), 400

        producto_id = str(
            cuerpo.get("id", "")
        ).strip()

        nombre = str(
            cuerpo.get("nombre", "")
        ).strip()

        marca = str(
            cuerpo.get("marca", "")
        ).strip() or None

        try:
            precio_venta = float(
                cuerpo.get(
                    "precio_venta",
                    0
                )
            )

            tasa_itbis = float(
                cuerpo.get(
                    "tasa_itbis",
                    0.18
                )
            )

        except (TypeError, ValueError):
            return jsonify({
                "errores": [
                    "El precio de venta y la tasa de ITBIS deben ser numéricos."
                ]
            }), 400
          
        try:
            stock_actual = int(
                cuerpo.get("stock_actual", 0)
            )

            stock_minimo = int(
                cuerpo.get("stock_minimo", 0)
            )

            stock_maximo_raw = cuerpo.get(
                "stock_maximo"
            )

            stock_maximo = (
                int(stock_maximo_raw)
                if stock_maximo_raw not in (None, "")
                else None
            )

        except (TypeError, ValueError):
            return jsonify({
                "errores": [
                    "Los valores de stock deben ser números enteros."
                ]
            }), 400

        perecedero = cuerpo.get("perecedero", False)

        if isinstance(perecedero, bool):
            perecedero = 1 if perecedero else 0
        elif perecedero in (0, 1):
            perecedero = int(perecedero)
        else:
            return jsonify({
                "errores": [
                    "El campo perecedero debe ser verdadero o falso."
                ]
            }), 400

        errores = []

        if not producto_id:
            errores.append(
                "El código del producto es obligatorio."
            )

        if not nombre:
            errores.append(
                "El nombre del producto es obligatorio."
            )

        if precio_venta < 0:
            errores.append(
                "El precio de venta no puede ser negativo."
            )

        if tasa_itbis not in (
            0,
            0.16,
            0.18
        ):
            errores.append(
                "La tasa de ITBIS debe ser 0, 0.16 o 0.18."
            )
          

        if stock_actual < 0:
            errores.append(
                "El stock actual no puede ser negativo."
            )

        if stock_minimo < 0:
            errores.append(
                "El stock mínimo no puede ser negativo."
            )

        if (
            stock_maximo is not None
            and stock_maximo < stock_minimo
        ):
            errores.append(
                "El stock máximo no puede ser menor "
                "que el stock mínimo."
            )

        if errores:
            return jsonify({
                "errores": errores
            }), 400

        existente = con().execute(
            """
            SELECT id
            FROM productos
            WHERE id = ?
            """,
            (producto_id,)
        ).fetchone()

        if existente:
            return jsonify({
                "errores": [
                    "Ya existe un producto con ese código."
                ]
            }), 409

        con().execute(
            """
            INSERT INTO productos
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
            (
                producto_id,
                nombre,
                marca,
                stock_actual,
                stock_minimo,
                stock_maximo,
              perecedero,
              precio_venta,
              tasa_itbis
            )
        )

        producto = obtener_producto(
            con(),
            producto_id
        )

        return jsonify(producto), 201

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

    @app.post("/api/suppliers")
    def crear_proveedor():

        cuerpo = request.get_json(silent=True)

        if not isinstance(cuerpo, dict):
            return jsonify({
                "errores": [
                    "El cuerpo de la petición debe ser un JSON."
                ]
            }), 400


        nombre = str(
            cuerpo.get("nombre", "")
        ).strip()

        rnc = str(
            cuerpo.get("rnc", "")
        ).strip() or None

        contacto = str(
            cuerpo.get("contacto", "")
        ).strip() or None

        telefono = str(
            cuerpo.get("telefono", "")
        ).strip() or None

        correo = str(
            cuerpo.get("correo", "")
        ).strip() or None

        direccion = str(
            cuerpo.get("direccion", "")
        ).strip() or None

        observaciones = str(
            cuerpo.get("observaciones", "")
        ).strip() or None


        errores = []

        if not nombre:
            errores.append(
                "El nombre del proveedor es obligatorio."
            )


        if errores:
            return jsonify({
                "errores": errores
            }), 400


        if rnc:
            existente = con().execute(
                """
                SELECT id
                FROM proveedores
                WHERE rnc = ?
                """,
                (rnc,)
            ).fetchone()

            if existente:
                return jsonify({
                    "errores": [
                        "Ya existe un proveedor con ese RNC."
                    ]
                }), 409


        cursor = con().execute(
            """
            INSERT INTO proveedores
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
            VALUES (?, ?, ?, ?, ?, ?, 'Activo', ?)
            """,
            (
                nombre,
                rnc,
                contacto,
                telefono,
                correo,
                direccion,
                observaciones
            )
        )


        proveedor = con().execute(
            """
            SELECT
                id,
                nombre,
                rnc,
                contacto,
                telefono,
                correo,
                direccion,
                estado,
                observaciones
            FROM proveedores
            WHERE id = ?
            """,
            (cursor.lastrowid,)
        ).fetchone()


        return jsonify(
            dict(proveedor)
        ), 201



    @app.get("/api/suppliers")
    def proveedores():
        filas = con().execute(
            """
            SELECT
                id,
                nombre,
                rnc,
                contacto,
                telefono,
                correo,
                estado
            FROM proveedores
            WHERE estado = 'Activo'
            ORDER BY nombre
            """
        ).fetchall()

        return jsonify([
            dict(fila)
            for fila in filas
        ])
      
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
