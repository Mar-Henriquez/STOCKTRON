from flask import Flask, request, jsonify
import sqlite3
from datetime import datetime

app = Flask(__name__)


def conectar():
	return sqlite3.connect("inventario.db")


@app.route("/salidas", methods=["POST"])
def registrar_salida():
	data = request.json
	producto = data["producto"]
	cantidad = int(data["cantidad"])

	conn = conectar()
	cursor = conn.cursor()

	# Verificar stock actual
	cursor.execute(
		"SELECT cantidad_disponible, cantidad_minima FROM productos WHERE nombre=?",
		(producto,),
	)
	resultado = cursor.fetchone()

	if not resultado:
		conn.close()
		return jsonify({"mensaje": "Producto no encontrado"}), 404

	stock_actual, stock_minimo = resultado

	if cantidad > stock_actual:
		conn.close()
		return jsonify({"mensaje": "No hay suficiente stock"}), 400

	# Actualizar inventario
	nuevo_stock = stock_actual - cantidad
	cursor.execute(
		"UPDATE productos SET cantidad_disponible=? WHERE nombre=?",
		(nuevo_stock, producto),
	)

	# Registrar movimiento en historial
	cursor.execute(
		"INSERT INTO movimientos (producto, cantidad, tipo, fecha) VALUES (?, ?, ?, ?)",
		(producto, cantidad, "salida", datetime.now()),
	)

	conn.commit()
	conn.close()

	mensaje = (
		f"Salida registrada: {cantidad} unidades de {producto}. "
		f"Stock actual: {nuevo_stock}"
	)
	if nuevo_stock <= stock_minimo:
		mensaje += " ⚠️ Bajo stock"

	return jsonify({"mensaje": mensaje})
