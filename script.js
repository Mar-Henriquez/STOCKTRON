const titulos = {
    panel: {
        titulo: "Panel",
        subtitulo: "Resumen general del inventario"
    },
    productos: {
        titulo: "Productos",
        subtitulo: "Catálogo general del inventario"
    },
    entradas: {
        titulo: "Entradas",
        subtitulo: "Registro de mercancía recibida"
    },
    salidas: {
        titulo: "Salidas",
        subtitulo: "Registro de mercancía despachada"
    },
    despachos: {
        titulo: "Despachos",
        subtitulo: "Gestión de pedidos, reservas y entregas"
    },
    reportes: {
        titulo: "Reportes",
        subtitulo: "Consultas e informes del inventario"
    },
    usuarios: {
        titulo: "Usuarios",
        subtitulo: "Administración de acceso al sistema"
    }
};


/* =========================================================
   NAVEGACIÓN
========================================================= */

function mostrarSeccion(nombre) {

    document
        .querySelectorAll(".content-section")
        .forEach(seccion => {
            seccion.classList.remove("active-section");
        });

    document
        .querySelectorAll(".nav-item")
        .forEach(boton => {
            boton.classList.remove("active");
        });

    const seccion = document.getElementById(nombre);

    if (seccion) {
        seccion.classList.add("active-section");
    }

    const boton = document.querySelector(
        `.nav-item[data-section="${nombre}"]`
    );

    if (boton) {
        boton.classList.add("active");
    }

    if (titulos[nombre]) {
        document.getElementById("pageTitle").textContent =
            titulos[nombre].titulo;

        document.getElementById("pageSubtitle").textContent =
            titulos[nombre].subtitulo;
    }
}


document
    .querySelectorAll(".nav-item")
    .forEach(boton => {

        boton.addEventListener("click", () => {

            const seccion = boton.dataset.section;

            mostrarSeccion(seccion);
        });

    });


document
    .querySelectorAll("[data-go]")
    .forEach(boton => {

        boton.addEventListener("click", () => {
            mostrarSeccion(boton.dataset.go);
        });

    });


/* =========================================================
   UTILIDADES
========================================================= */

function mostrarToast(mensaje) {

    const toast = document.getElementById("toast");

    toast.textContent = mensaje;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


function claseEstado(estado) {

    if (estado === "Disponible") {
        return "status-available";
    }

    if (estado === "Stock bajo") {
        return "status-low";
    }

    if (estado === "Agotado") {
        return "status-empty";
    }

    if (estado === "Aprobado") {
        return "status-approved";
    }

    if (estado === "Rechazado") {
        return "status-rejected";
    }

    return "";
}


function escapeHtml(valor) {

    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   PRODUCTOS
========================================================= */

async function cargarProductos() {

    const tabla = document.getElementById("productsTable");
    const dashboard = document.getElementById("dashboardProducts");

    try {

        const respuesta = await fetch("/api/products");

        if (!respuesta.ok) {
            throw new Error(
                "No se pudieron obtener los productos."
            );
        }

        const productos = await respuesta.json();

        document.getElementById(
            "metricProductos"
        ).textContent = productos.length;

        const stockBajo = productos.filter(
            producto =>
                producto.estado === "Stock bajo"
        ).length;

        const agotados = productos.filter(
            producto =>
                producto.estado === "Agotado"
        ).length;

        document.getElementById(
            "metricStockBajo"
        ).textContent = stockBajo;

        document.getElementById(
            "metricAgotados"
        ).textContent = agotados;


        /* TABLA COMPLETA */

        if (productos.length === 0) {

            tabla.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        No hay productos registrados.
                    </td>
                </tr>
            `;

        } else {

            tabla.innerHTML = productos
                .map(producto => `

                    <tr>

                        <td>
                            ${escapeHtml(producto.id)}
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(producto.nombre)}
                            </strong>
                        </td>

                        <td>
                            ${escapeHtml(producto.marca || "—")}
                        </td>

                        <td>
                            ${producto.stock_actual}
                        </td>

                        <td>
                            ${producto.stock_minimo}
                        </td>

                        <td>
                            ${
                                producto.stock_maximo ??
                                "—"
                            }
                        </td>

                        <td>

                            <span
                                class="
                                    status-badge
                                    ${claseEstado(producto.estado)}
                                "
                            >
                                ${escapeHtml(producto.estado)}
                            </span>

                        </td>

                    </tr>

                `)
                .join("");
        }


        /* TABLA DEL PANEL */

        const destacados = productos.slice(0, 6);

        if (destacados.length === 0) {

            dashboard.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        No hay productos registrados.
                    </td>
                </tr>
            `;

        } else {

            dashboard.innerHTML = destacados
                .map(producto => `

                    <tr>

                        <td>
                            ${escapeHtml(producto.nombre)}
                        </td>

                        <td>
                            ${escapeHtml(producto.marca || "—")}
                        </td>

                        <td>
                            ${producto.stock_actual}
                        </td>

                        <td>
                            ${producto.stock_minimo}
                        </td>

                        <td>

                            <span
                                class="
                                    status-badge
                                    ${claseEstado(producto.estado)}
                                "
                            >
                                ${escapeHtml(producto.estado)}
                            </span>

                        </td>

                    </tr>

                `)
                .join("");
        }

    } catch (error) {

        tabla.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No fue posible cargar los productos.
                </td>
            </tr>
        `;

        dashboard.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No fue posible cargar el inventario.
                </td>
            </tr>
        `;

        mostrarToast(error.message);
    }
}


/* =========================================================
   MOVIMIENTOS
========================================================= */

async function cargarMovimientos() {

    const contenedor =
        document.getElementById("recentMovements");

    try {

        const respuesta = await fetch("/api/movements");

        if (!respuesta.ok) {
            throw new Error(
                "No se pudieron obtener los movimientos."
            );
        }

        const movimientos = await respuesta.json();

        document.getElementById(
            "metricMovimientos"
        ).textContent = movimientos.length;


        if (movimientos.length === 0) {

            contenedor.innerHTML = `
                <div class="empty-state">
                    Todavía no hay movimientos registrados.
                </div>
            `;

            return;
        }


        const recientes = movimientos.slice(0, 6);

        contenedor.innerHTML = recientes
            .map(movimiento => {

                const simbolo =
                    movimiento.direccion === "ENTRADA"
                        ? "+"
                        : "-";

                return `

                    <div class="movement-item">

                        <div class="movement-main">

                            <strong>
                                ${escapeHtml(
                                    movimiento.tipo_nombre
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    movimiento.producto_id
                                )}
                                ·
                                ${escapeHtml(
                                    movimiento.folio
                                )}
                            </span>

                            <span>

                                <span
                                    class="
                                        status-badge
                                        ${claseEstado(
                                            movimiento.estado
                                        )}
                                    "
                                >
                                    ${escapeHtml(
                                        movimiento.estado
                                    )}
                                </span>

                            </span>

                        </div>

                        <div class="movement-quantity">

                            ${simbolo}${movimiento.cantidad}

                        </div>

                    </div>

                `;

            })
            .join("");

    } catch (error) {

        contenedor.innerHTML = `
            <div class="empty-state">
                No fue posible cargar los movimientos.
            </div>
        `;

        mostrarToast(error.message);
    }
}


/* =========================================================
   BOTONES TODAVÍA NO IMPLEMENTADOS
========================================================= */

document
    .getElementById("btnNuevoProducto")
    .addEventListener("click", () => {

        mostrarToast(
            "El formulario de productos será el siguiente módulo."
        );

    });


document
    .getElementById("btnNuevaEntrada")
    .addEventListener("click", () => {

        mostrarToast(
            "El asistente de entradas se implementará a continuación."
        );

    });


document
    .getElementById("btnNuevaSalida")
    .addEventListener("click", () => {

        mostrarToast(
            "El asistente de salidas se implementará a continuación."
        );

    });


document
    .getElementById("btnNuevoDespacho")
    .addEventListener("click", () => {

        mostrarToast(
            "El módulo de despachos se implementará después de entradas y salidas."
        );

    });


document
    .getElementById("btnNuevoUsuario")
    .addEventListener("click", () => {

        mostrarToast(
            "La administración de usuarios se implementará posteriormente."
        );

    });


/* =========================================================
   INICIO
========================================================= */

async function iniciarAplicacion() {

    mostrarSeccion("panel");

    await Promise.all([
        cargarProductos(),
        cargarMovimientos()
    ]);
}


document.addEventListener(
    "DOMContentLoaded",
    iniciarAplicacion
);
