document.getElementById("salidaForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const producto = document.getElementById("producto").value.trim();
  const cantidad = Number(document.getElementById("cantidad").value);
  const mensaje = document.getElementById("mensaje");

  if (!producto) {
    mensaje.innerText = "El producto es obligatorio.";
    return;
  }

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    mensaje.innerText = "La cantidad debe ser un número entero mayor a 0.";
    return;
  }

  fetch("/salidas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ producto, cantidad })
  })
  .then(async response => {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.mensaje || "No se pudo registrar la salida.");
    }

    mensaje.innerText = data.mensaje;
    document.getElementById("salidaForm").reset();
  })
  .catch(error => {
    mensaje.innerText = error.message;
  });
});
