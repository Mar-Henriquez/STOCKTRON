"""
StockControl · Lógica de negocio de entradas y salidas.

Aquí viven las REGLAS del sistema (no en la pantalla ni en la base):
cada función valida, actualiza el stock y deja el historial, todo en una
sola transacción: o se guarda todo, o no se guarda nada.
"""

from datetime import date, datetime

# Datos obligatorios según el tipo (columna "Datos" de tus tablas).
CAMPOS_REQUERIDOS = {
    "TS-01": ["referencia"],                       # referencia de venta
    "TS-02": ["observacion"],                      # descripción del daño
    "TS-03": ["fecha_vencimiento", "observacion"],
    "TS-04": ["proveedor", "motivo"],
    "TS-05": ["motivo"],                           # área o motivo de uso
    "TS-06": ["observacion"],
    "TS-07": ["observacion"],
    "TS-08": ["motivo"],
    "TS-09": ["destino"],
    "TS-10": ["motivo"],                           # campaña o motivo
    "TS-11": ["destinatario", "motivo"],
    "TS-12": ["causa"],
    "TS-13": ["referencia"],                       # referencia de producción
    "TS-14": ["referencia"],                       # referencia del pedido
    "TS-15": ["motivo", "autorizacion"],
    "TE-01": ["proveedor", "factura", "costo_unitario"],
    "TE-02": ["referencia", "motivo"],             # venta original y motivo
    "TE-03": ["origen", "referencia"],
    "TE-04": ["motivo"],
    "TE-05": ["referencia"],
    "TE-06": ["donante"],
    "TE-07": ["fecha_corte"],
    "TE-08": ["proveedor", "referencia"],
    "TE-09": ["referencia"],                       # pérdida original
    "TE-10": ["proveedor", "referencia"],
}

PREFIJO_FOLIO = {"SALIDA": "SC", "ENTRADA": "EC"}


# ---------------------------------------------------------------- utilidades
def estado_producto(stock, minimo):
    if stock == 0:
        return "Agotado"
    return "Stock bajo" if stock <= minimo else "Disponible"


def _a_entero(valor):
    """Convierte a entero si es posible; devuelve None si no lo es."""
    if isinstance(valor, bool):
        return None
    if isinstance(valor, int):
        return valor
    if isinstance(valor, float):
        return int(valor) if valor.is_integer() else None
    if isinstance(valor, str):
        try:
            return int(valor.strip())
        except ValueError:
            return None
    return None


def _limpiar(datos):
    """Quita espacios y descarta campos vacíos."""
    limpio = {}
    for k, v in (datos or {}).items():
        if isinstance(v, str):
            v = v.strip()
        if v is not None and v != "":
            limpio[k] = v
    return limpio


def _siguiente_folio(con, direccion, ahora):
    prefijo = f"{PREFIJO_FOLIO[direccion]}-{ahora.year}-"
    fila = con.execute(
        "SELECT MAX(CAST(substr(folio, 9) AS INTEGER)) FROM movimientos WHERE folio LIKE ?",
        (prefijo + "%",)).fetchone()
    return f"{prefijo}{(fila[0] or 0) + 1:03d}"


def _advertencias(prod, nuevo):
    adv = []
    if nuevo == 0:
        adv.append("Producto agotado: la existencia llegó a cero.")
    elif nuevo <= prod["stock_minimo"]:
        adv.append(f"Stock bajo: quedan {nuevo} unidades (mínimo {prod['stock_minimo']}).")
    if prod["stock_maximo"] is not None and nuevo > prod["stock_maximo"]:
        adv.append(f"La existencia ({nuevo}) supera el nivel máximo ({prod['stock_maximo']}).")
    return adv


def _rechazo_sin_historial(mensaje):
    """Rechazo tan temprano que ni siquiera se puede registrar en el historial."""
    return {"aprobado": False, "folio": None, "errores": [mensaje], "advertencias": [],
            "stock_anterior": None, "stock_nuevo": None}


# ---------------------------------------------------------------- validaciones
def _validar_entrada(con, prod, tipo, datos, ahora):
    errores = []

    if "fecha_vencimiento" in datos:
        try:
            vence = date.fromisoformat(
                str(datos["fecha_vencimiento"])
            )

            if vence < ahora.date():
                errores.append(
                    "No se puede ingresar producto vencido."
                )

        except ValueError:
            errores.append(
                "La fecha de vencimiento no es válida "
                "(use AAAA-MM-DD)."
            )

    if tipo in ("TE-01", "TE-05") and prod["perecedero"]:
        for campo in ("lote", "fecha_vencimiento"):
            if campo not in datos:
                errores.append(
                    f"Producto perecedero: falta "
                    f"{campo.replace('_', ' ')}."
                )

    if tipo == "TE-01":

        try:
            if float(datos.get("costo_unitario", 0)) <= 0:
                errores.append(
                    "El costo unitario debe ser mayor que cero."
                )

        except (TypeError, ValueError):
            errores.append(
                "El costo unitario debe ser un número."
            )

        if "factura" in datos:
            proveedor_id = _buscar_proveedor_id(
                con,
                datos
            )

            if proveedor_id is not None:
                dup = con.execute(
                    """
                    SELECT m.folio
                    FROM movimientos m
                    JOIN detalle_movimiento dm
                        ON dm.folio = m.folio
                    WHERE m.estado = 'Aprobado'
                      AND m.tipo_codigo = 'TE-01'
                      AND dm.proveedor_id = ?
                      AND lower(dm.factura) = lower(?)
                    LIMIT 1
                    """,
                    (
                        proveedor_id,
                        str(datos["factura"])
                    )
                ).fetchone()

                if dup:
                    errores.append(
                        f"Factura duplicada: "
                        f"{datos['factura']} ya fue registrada "
                        f"para este proveedor ({dup['folio']})."
                    )

    return errores

def _validar(
    con,
    direccion,
    prod,
    cant,
    tipo,
    usuario,
    datos,
    ahora
):
    errores = []

    if cant is None:
        errores.append(
            "La cantidad debe ser un número entero."
        )

    elif cant <= 0:
        errores.append(
            "La cantidad debe ser mayor que cero."
        )

    fila_tipo = con.execute(
        """
        SELECT restringido
        FROM tipos_movimiento
        WHERE codigo = ?
        """,
        (tipo,)
    ).fetchone()

    if (
        fila_tipo is not None
        and fila_tipo["restringido"] == 1
        and usuario["rol"] != "Administrador"
    ):
        errores.append(
            "Este tipo de movimiento requiere "
            "un usuario administrador."
        )

    for campo in CAMPOS_REQUERIDOS.get(tipo, []):
        if campo not in datos:
            errores.append(
                f"Falta el dato obligatorio: "
                f"{campo.replace('_', ' ')}."
            )

    if direccion == "SALIDA":

        if cant and cant > prod["stock_actual"]:
            errores.append(
                f"Stock insuficiente: solo hay "
                f"{prod['stock_actual']} unidades disponibles."
            )

    else:
        errores += _validar_entrada(
            con,
            prod,
            tipo,
            datos,
            ahora
        )

    return errores
    
def _buscar_proveedor_id(con, datos):
    """
    Obtiene el proveedor relacionado con el movimiento.

    Temporalmente acepta:
    - proveedor_id
    - nombre del proveedor en 'proveedor'

    Más adelante el frontend enviará directamente proveedor_id.
    """

    if "proveedor_id" in datos:
        fila = con.execute(
            "SELECT id FROM proveedores WHERE id = ? AND estado = 'Activo'",
            (datos["proveedor_id"],)
        ).fetchone()

        return fila["id"] if fila else None

    if "proveedor" in datos:
        fila = con.execute(
            """
            SELECT id
            FROM proveedores
            WHERE lower(nombre) = lower(?)
              AND estado = 'Activo'
            """,
            (str(datos["proveedor"]),)
        ).fetchone()

        return fila["id"] if fila else None

    return None


def _guardar_detalle(con, folio, cantidad, datos):
    """
    Guarda los datos particulares del movimiento
    en detalle_movimiento.
    """

    proveedor_id = _buscar_proveedor_id(con, datos)

    costo_unitario = datos.get("costo_unitario")

    try:
        costo_unitario = (
            float(costo_unitario)
            if costo_unitario is not None
            and float(costo_unitario) > 0
            else None
        )
    except (TypeError, ValueError):
        costo_unitario = None

    total_compra = None

    if costo_unitario is not None:
        try:
            total_compra = round(
                cantidad * float(costo_unitario),
                2
            )
        except (TypeError, ValueError):
            total_compra = None

    con.execute(
        """
        INSERT INTO detalle_movimiento
        (
            folio,
            proveedor_id,
            factura,
            costo_unitario,
            total_compra,
            destino,
            destinatario,
            origen,
            donante,
            motivo,
            causa,
            autorizacion,
            estado_devuelto,
            fecha_corte,
            fecha_vencimiento,
            observacion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            folio,
            proveedor_id,
            datos.get("factura"),
            costo_unitario,
            total_compra,
            datos.get("destino"),
            datos.get("destinatario"),
            datos.get("origen"),
            datos.get("donante"),
            datos.get("motivo"),
            datos.get("causa"),
            datos.get("autorizacion"),
            datos.get("estado_devuelto"),
            datos.get("fecha_corte"),
            datos.get("fecha_vencimiento"),
            datos.get("observacion"),
        )
    )


def _guardar_lote(con, folio, producto_id, cantidad, datos):
    """
    Guarda el lote cuando el movimiento incluye
    número de lote y fecha de vencimiento.
    """

    numero_lote = datos.get("lote")
    fecha_vencimiento = datos.get("fecha_vencimiento")

    if not numero_lote or not fecha_vencimiento:
        return

    con.execute(
        """
        INSERT INTO lotes
        (
            producto_id,
            folio_entrada,
            numero_lote,
            fecha_vencimiento,
            cantidad_ingresada
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            producto_id,
            folio,
            numero_lote,
            fecha_vencimiento,
            cantidad,
        )
    )


def _guardar(
    con,
    folio,
    prod_id,
    tipo,
    cant,
    ahora,
    usuario_id,
    datos,
    estado,
    motivo_rechazo,
    stock_ant,
    stock_res
):
    """
    Guarda el movimiento principal y sus datos particulares.
    """

    referencia = (
        datos.get("referencia")
        or datos.get("factura")
    )

    con.execute(
        """
        INSERT INTO movimientos
        (
            folio,
            producto_id,
            tipo_codigo,
            cantidad,
            fecha_hora,
            usuario_id,
            referencia,
            estado,
            motivo_rechazo,
            stock_anterior,
            stock_resultante
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            folio,
            prod_id,
            tipo,
            cant,
            ahora.isoformat(timespec="seconds"),
            usuario_id,
            referencia,
            estado,
            motivo_rechazo,
            stock_ant,
            stock_res,
        )
    )

    _guardar_detalle(
        con,
        folio,
        cant,
        datos
    )

    if (
        estado == "Aprobado"
        and tipo.startswith("TE-")
    ):
        _guardar_lote(
            con,
            folio,
            prod_id,
            cant,
            datos
        )


def _registrar(con, direccion, producto_id, cantidad, tipo, usuario_id, datos, ahora):
    ahora = ahora or datetime.now()
    datos = _limpiar(datos)

    # Fase A: sin esto no se puede ni dejar constancia en el historial.
    usuario = con.execute("SELECT * FROM usuarios WHERE id = ?", (usuario_id,)).fetchone()
    if usuario is None:
        return _rechazo_sin_historial("Usuario no válido.")
    fila_tipo = con.execute("SELECT * FROM tipos_movimiento WHERE codigo = ?", (tipo,)).fetchone()
    if fila_tipo is None or fila_tipo["direccion"] != direccion:
        return _rechazo_sin_historial("Tipo de movimiento no válido para esta operación.")
    if not producto_id:
        return _rechazo_sin_historial("Debe indicar el producto.")                # RS-01
    if con.execute("SELECT 1 FROM productos WHERE id = ?", (producto_id,)).fetchone() is None:
        return _rechazo_sin_historial("Producto no encontrado en el inventario.")  # RS-06

    # Fase B: validar y actualizar en UNA transacción.
    cant = _a_entero(cantidad)
    con.execute("BEGIN IMMEDIATE")      # bloquea la base: evita dos movimientos a la vez
    try:
        prod = con.execute("SELECT * FROM productos WHERE id = ?", (producto_id,)).fetchone()
        stock_ant = prod["stock_actual"]
        errores = _validar(con, direccion, prod, cant, tipo, usuario, datos, ahora)
        folio = _siguiente_folio(con, direccion, ahora)

        if errores:                                   # RS-19 / RS-20: se rechaza y NO se toca el stock
            _guardar(con, folio, producto_id, tipo, cant or 0, ahora, usuario_id, datos,
                     "Rechazado", " ".join(errores), stock_ant, stock_ant)
            con.execute("COMMIT")
            return {"aprobado": False, "folio": folio, "errores": errores, "advertencias": [],
                    "stock_anterior": stock_ant, "stock_nuevo": stock_ant}

        if direccion == "SALIDA":                      # la condición protege contra stock negativo
            cur = con.execute("UPDATE productos SET stock_actual = stock_actual - ? "
                              "WHERE id = ? AND stock_actual >= ?", (cant, producto_id, cant))
            nuevo = stock_ant - cant
        else:
            cur = con.execute("UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?",
                              (cant, producto_id))
            nuevo = stock_ant + cant
        if cur.rowcount != 1:
            raise RuntimeError("No se pudo actualizar el stock")

        _guardar(con, folio, producto_id, tipo, cant, ahora, usuario_id, datos,
                 "Aprobado", None, stock_ant, nuevo)
        con.execute("COMMIT")
    except Exception:
        if con.in_transaction:
            con.execute("ROLLBACK")
        raise

    return {"aprobado": True, "folio": folio, "producto_id": producto_id, "tipo": tipo,
            "cantidad": cant, "fecha_hora": ahora.isoformat(timespec="seconds"),
            "stock_anterior": stock_ant, "stock_nuevo": nuevo,
            "estado_anterior": estado_producto(stock_ant, prod["stock_minimo"]),
            "estado_nuevo": estado_producto(nuevo, prod["stock_minimo"]),
            "errores": [], "advertencias": _advertencias(prod, nuevo)}


def registrar_salida(con, producto_id, cantidad, tipo, usuario_id, datos=None, ahora=None):
    """CU-04: registra una salida (resta stock)."""
    return _registrar(con, "SALIDA", producto_id, cantidad, tipo, usuario_id, datos, ahora)


def registrar_entrada(con, producto_id, cantidad, tipo, usuario_id, datos=None, ahora=None):
    """CU-03: registra una entrada (suma stock)."""
    return _registrar(con, "ENTRADA", producto_id, cantidad, tipo, usuario_id, datos, ahora)


# ---------------------------------------------------------------- consultas
def obtener_producto(con, producto_id):
    f = con.execute("SELECT * FROM productos WHERE id = ?", (producto_id,)).fetchone()
    if f is None:
        return None
    d = dict(f)
    d["estado"] = estado_producto(d["stock_actual"], d["stock_minimo"])
    return d


def consultar_movimientos(
    con,
    producto_id=None,
    tipo=None,
    desde=None,
    hasta=None,
    direccion=None,
    estado=None
):
    """
    Consulta el historial de movimientos.
    """

    sql = """
        SELECT
            m.*,
            t.nombre AS tipo_nombre,
            t.direccion
        FROM movimientos m
        JOIN tipos_movimiento t
            ON t.codigo = m.tipo_codigo
        WHERE 1 = 1
    """

    params = []

    filtros = [
        ("m.producto_id = ?", producto_id),
        ("m.tipo_codigo = ?", tipo),
        ("date(m.fecha_hora) >= ?", desde),
        ("date(m.fecha_hora) <= ?", hasta),
        ("t.direccion = ?", direccion),
        ("m.estado = ?", estado),
    ]

    for condicion, valor in filtros:
        if valor:
            sql += " AND " + condicion
            params.append(valor)

    sql += " ORDER BY m.fecha_hora DESC, m.folio DESC"

    filas = []

    for f in con.execute(sql, params):
        d = dict(f)

        detalle = con.execute(
            """
            SELECT
                dm.*,
                p.nombre AS proveedor_nombre
            FROM detalle_movimiento dm
            LEFT JOIN proveedores p
                ON p.id = dm.proveedor_id
            WHERE dm.folio = ?
            """,
            (d["folio"],)
        ).fetchone()

        d["detalles"] = (
            dict(detalle)
            if detalle
            else {}
        )

        lote = con.execute(
            """
            SELECT
                id,
                numero_lote,
                fecha_vencimiento,
                cantidad_ingresada
            FROM lotes
            WHERE folio_entrada = ?
            """,
            (d["folio"],)
        ).fetchone()

        d["lote"] = (
            dict(lote)
            if lote
            else None
        )

        filas.append(d)

    return filas
