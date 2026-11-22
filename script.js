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

const productModal =
    document.getElementById("productModal");

const productForm =
    document.getElementById("productForm");

const productFormErrors =
    document.getElementById("productFormErrors");


function abrirModalProducto() {

    productForm.reset();

    document.getElementById(
        "productStock"
    ).value = 0;

    document.getElementById(
        "productMin"
    ).value = 0;

    productFormErrors.innerHTML = "";

    productModal.classList.add("show");

    productModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.getElementById(
        "productId"
    ).focus();
}


function cerrarModalProducto() {

    productModal.classList.remove("show");

    productModal.setAttribute(
        "aria-hidden",
        "true"
    );

    productFormErrors.innerHTML = "";
}


document
    .getElementById("btnNuevoProducto")
    .addEventListener(
        "click",
        abrirModalProducto
    );


document
    .getElementById("btnCerrarProducto")
    .addEventListener(
        "click",
        cerrarModalProducto
    );


document
    .getElementById("btnCancelarProducto")
    .addEventListener(
        "click",
        cerrarModalProducto
    );


productModal.addEventListener(
    "click",
    event => {

        if (event.target === productModal) {
            cerrarModalProducto();
        }

    }
);


productForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        productFormErrors.innerHTML = "";

        const stockMaximoRaw =
            document
                .getElementById("productMax")
                .value
                .trim();

        const datos = {

            id:
                document
                    .getElementById("productId")
                    .value
                    .trim(),

            nombre:
                document
                    .getElementById("productName")
                    .value
                    .trim(),

            marca:
                document
                    .getElementById("productBrand")
                    .value
                    .trim(),

            stock_actual:
                Number(
                    document
                        .getElementById("productStock")
                        .value
                ),

            stock_minimo:
                Number(
                    document
                        .getElementById("productMin")
                        .value
                ),

            stock_maximo:
                stockMaximoRaw === ""
                    ? null
                    : Number(stockMaximoRaw),

            perecedero:
                document
                    .getElementById(
                        "productPerishable"
                    )
                    .checked
        };


        try {

            const respuesta = await fetch(
                "/api/products",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(datos)
                }
            );


            const resultado =
                await respuesta.json();


            if (!respuesta.ok) {

                const errores =
                    resultado.errores ||
                    [
                        "No se pudo registrar el producto."
                    ];

                productFormErrors.innerHTML =
                    errores
                        .map(
                            error =>
                                `<div>${escapeHtml(error)}</div>`
                        )
                        .join("");

                return;
            }


            cerrarModalProducto();

            mostrarToast(
                "Producto registrado correctamente."
            );


            await cargarProductos();

        } catch (error) {

            productFormErrors.innerHTML =
                `<div>
                    ${escapeHtml(error.message)}
                </div>`;

        }

    }
);

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
   ASISTENTE DE ENTRADAS
========================================================= */

let entryStep = 1;
let entryProducts = [];


async function cargarDatosEntradas() {

    try {

        const [respuestaProductos, respuestaTipos] =
            await Promise.all([
                fetch("/api/products"),
                fetch("/api/types?direccion=ENTRADA")
            ]);

        if (
            !respuestaProductos.ok ||
            !respuestaTipos.ok
        ) {
            throw new Error(
                "No se pudieron cargar los datos del formulario."
            );
        }

        entryProducts =
            await respuestaProductos.json();

        const tipos =
            await respuestaTipos.json();


        const productSelect =
            document.getElementById(
                "entryProduct"
            );

        productSelect.innerHTML = `
            <option value="">
                Selecciona un producto
            </option>
        `;

        entryProducts.forEach(producto => {

            const opcion =
                document.createElement("option");

            opcion.value = producto.id;

            opcion.textContent =
                `${producto.id} · ${producto.nombre}`;

            productSelect.appendChild(opcion);
        });


        const typeSelect =
            document.getElementById(
                "entryType"
            );

        typeSelect.innerHTML = `
            <option value="">
                Selecciona el tipo
            </option>
        `;

        tipos.forEach(tipo => {

            const opcion =
                document.createElement("option");

            opcion.value = tipo.codigo;

            opcion.textContent =
                `${tipo.codigo} · ${tipo.nombre}`;

            typeSelect.appendChild(opcion);
        });

    } catch (error) {

        mostrarToast(error.message);
    }
}


function actualizarPasoEntrada() {

    document
        .querySelectorAll(
            "[data-entry-panel]"
        )
        .forEach(panel => {

            panel.classList.toggle(
                "active",
                Number(panel.dataset.entryPanel)
                    === entryStep
            );

        });


    document
        .querySelectorAll(
            "[data-entry-step]"
        )
        .forEach(indicador => {

            const numero =
                Number(
                    indicador.dataset.entryStep
                );

            indicador.classList.toggle(
                "active",
                numero === entryStep
            );

            indicador.classList.toggle(
                "completed",
                numero < entryStep
            );

        });


    document.getElementById(
        "entryPrevious"
    ).disabled = entryStep === 1;


    document.getElementById(
        "entryNext"
    ).classList.toggle(
        "hidden",
        entryStep === 4
    );


    document.getElementById(
        "entrySubmit"
    ).classList.toggle(
        "hidden",
        entryStep !== 4
    );
}


function validarPasoEntrada() {

    const errores = [];


    if (entryStep === 1) {

        const producto =
            document.getElementById(
                "entryProduct"
            ).value;

        if (!producto) {
            errores.push(
                "Debes seleccionar un producto."
            );
        }
    }


    if (entryStep === 2) {

        const cantidad =
            Number(
                document.getElementById(
                    "entryQuantity"
                ).value
            );

        const tipo =
            document.getElementById(
                "entryType"
            ).value;

        if (
            !Number.isInteger(cantidad) ||
            cantidad <= 0
        ) {
            errores.push(
                "La cantidad debe ser un entero mayor que cero."
            );
        }

        if (!tipo) {
            errores.push(
                "Debes seleccionar el tipo de entrada."
            );
        }
    }


    if (errores.length > 0) {

        mostrarToast(
            errores[0]
        );

        return false;
    }

    return true;
}


document
    .getElementById("entryProduct")
    .addEventListener(
        "change",
        event => {

            const producto =
                entryProducts.find(
                    item =>
                        item.id ===
                        event.target.value
                );

            const resumen =
                document.getElementById(
                    "entryProductInfo"
                );


            if (!producto) {

                resumen.classList.add(
                    "hidden"
                );

                return;
            }


            document.getElementById(
                "entryCurrentStock"
            ).textContent =
                producto.stock_actual;


            document.getElementById(
                "entryMinimumStock"
            ).textContent =
                producto.stock_minimo;


            document.getElementById(
                "entryProductStatus"
            ).textContent =
                producto.estado;


            document.getElementById(
                "entryProductBrand"
            ).textContent =
                producto.marca || "—";


            resumen.classList.remove(
                "hidden"
            );

        }
    );


function actualizarVistaStockEntrada() {

    const productoId =
        document.getElementById(
            "entryProduct"
        ).value;

    const cantidad =
        Number(
            document.getElementById(
                "entryQuantity"
            ).value
        );


    const producto =
        entryProducts.find(
            item => item.id === productoId
        );


    const vista =
        document.getElementById(
            "entryStockPreview"
        );


    if (
        !producto ||
        !Number.isInteger(cantidad) ||
        cantidad <= 0
    ) {

        vista.textContent =
            "Selecciona producto y cantidad para calcular la existencia resultante.";

        return;
    }


    const nuevoStock =
        producto.stock_actual + cantidad;


    vista.textContent =
        `Existencia actual: ${producto.stock_actual} · ` +
        `Entrada: +${cantidad} · ` +
        `Existencia resultante: ${nuevoStock}`;
}


document
    .getElementById("entryQuantity")
    .addEventListener(
        "input",
        actualizarVistaStockEntrada
    );


document
    .getElementById("entryProduct")
    .addEventListener(
        "change",
        actualizarVistaStockEntrada
    );


document
    .getElementById("entryNext")
    .addEventListener(
        "click",
        () => {

            if (!validarPasoEntrada()) {
                return;
            }


            if (entryStep < 4) {
                entryStep += 1;
            }


            actualizarPasoEntrada();
        }
    );


document
    .getElementById("entryPrevious")
    .addEventListener(
        "click",
        () => {

            if (entryStep > 1) {
                entryStep -= 1;
            }

            actualizarPasoEntrada();
        }
    );


document
    .getElementById("entryCancel")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "entryForm"
                )
                .reset();

            document
                .getElementById(
                    "entryProductInfo"
                )
                .classList
                .add("hidden");


            document.getElementById(
                "entryStockPreview"
            ).textContent =
                "Selecciona producto y cantidad para calcular la existencia resultante.";


            entryStep = 1;

            actualizarPasoEntrada();

            mostrarToast(
                "Registro de entrada cancelado."
            );
        }
    );


document
    .getElementById("btnNuevaEntrada")
    .addEventListener(
        "click",
        () => {

            entryStep = 1;

            document
                .getElementById(
                    "entryForm"
                )
                .reset();

            document
                .getElementById(
                    "entryProductInfo"
                )
                .classList
                .add("hidden");


            document.getElementById(
                "entryDateTime"
            ).value =
                new Date()
                    .toLocaleString("es-DO");


            actualizarPasoEntrada();

            mostrarSeccion("entradas");
        }
    );

/* =========================================================
   INICIO
========================================================= */

async function iniciarAplicacion() {

    mostrarSeccion("panel");

    await Promise.all([
        cargarProductos(),
        cargarMovimientos(),
        cargarDatosEntradas()
    ]);

    document.getElementById(
        "entryDateTime"
    ).value =
        new Date()
            .toLocaleString("es-DO");

    actualizarPasoEntrada();
}


document.addEventListener(
    "DOMContentLoaded",
    iniciarAplicacion
);
