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

/* =========================================================
   PROVEEDORES
========================================================= */

let suppliersList = [];


async function cargarProveedores() {

    const tabla =
        document.getElementById(
            "suppliersTableBody"
        );

    try {

        const respuesta =
            await fetch(
                "/api/suppliers?include_inactive=1"
            );

        if (!respuesta.ok) {
            throw new Error(
                "No se pudieron cargar los proveedores."
            );
        }

        suppliersList =
            await respuesta.json();

        renderizarProveedores(
            suppliersList
        );

    } catch (error) {

        tabla.innerHTML = `
            <tr>
                <td colspan="7">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}


function renderizarProveedores(
    proveedores
) {

    const tabla =
        document.getElementById(
            "suppliersTableBody"
        );


    if (
        !proveedores ||
        proveedores.length === 0
    ) {

        tabla.innerHTML = `
            <tr>
                <td colspan="7">
                    No hay proveedores registrados.
                </td>
            </tr>
        `;

        return;
    }


    tabla.innerHTML =
        proveedores
            .map(
                proveedor => `

                    <tr>

                        <td>
                            ${escapeHtml(
                                proveedor.nombre || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                proveedor.rnc || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                proveedor.contacto || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                proveedor.telefono || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                proveedor.correo || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                proveedor.estado || "—"
                            )}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="secondary-button supplier-edit"
                                data-id="${proveedor.id}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="secondary-button supplier-toggle"
                                data-id="${proveedor.id}"
                            >
                                ${
                                    proveedor.estado ===
                                    "Activo"
                                        ? "Desactivar"
                                        : "Activar"
                                }
                            </button>

                            <button
                                type="button"
                                class="secondary-button supplier-delete"
                                data-id="${proveedor.id}"
                            >
                                Eliminar
                            </button>

                        </td>

                    </tr>
                `
            )
            .join("");
}


document
    .getElementById(
        "suppliersTableBody"
    )
    .addEventListener(
        "click",
        async event => {

            const botonEstado =
                event.target.closest(
                    ".supplier-toggle"
                );

            const botonEliminar =
                event.target.closest(
                    ".supplier-delete"
                );


            if (botonEstado) {

                const id =
                    botonEstado.dataset.id;

                const proveedor =
                    suppliersList.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );


                if (!proveedor) {
                    return;
                }


                const nuevoEstado =
                    proveedor.estado === "Activo"
                        ? "Inactivo"
                        : "Activo";


                try {

                    const respuesta =
                        await fetch(
                            `/api/suppliers/${id}/status`,
                            {
                                method: "PATCH",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        estado:
                                            nuevoEstado
                                    })
                            }
                        );


                    const resultado =
                        await respuesta.json();


                    if (!respuesta.ok) {
                        throw new Error(
                            resultado.errores?.[0] ||
                            "No se pudo cambiar el estado."
                        );
                    }


                    mostrarToast(
                        `Proveedor ${nuevoEstado.toLowerCase()}.`
                    );


                    await cargarProveedores();
                    await cargarProveedoresEntradas();

                } catch (error) {

                    mostrarToast(
                        error.message
                    );
                }


                return;
            }


            if (botonEliminar) {

                const id =
                    botonEliminar.dataset.id;


                const confirmar =
                    window.confirm(
                        "¿Deseas eliminar este proveedor?"
                    );


                if (!confirmar) {
                    return;
                }


                try {

                    const respuesta =
                        await fetch(
                            `/api/suppliers/${id}`,
                            {
                                method: "DELETE"
                            }
                        );


                    const resultado =
                        await respuesta.json();


                    if (!respuesta.ok) {
                        throw new Error(
                            resultado.errores?.[0] ||
                            "No se pudo eliminar el proveedor."
                        );
                    }


                    mostrarToast(
                        "Proveedor eliminado correctamente."
                    );


                    await cargarProveedores();
                    await cargarProveedoresEntradas();

                } catch (error) {

                    mostrarToast(
                        error.message
                    );
                }
            }

        }
    );


document
    .getElementById(
        "supplierSearch"
    )
    .addEventListener(
        "input",
        event => {

            const termino =
                event.target.value
                    .trim()
                    .toLowerCase();


            if (!termino) {

                renderizarProveedores(
                    suppliersList
                );

                return;
            }


            const filtrados =
                suppliersList.filter(
                    proveedor => {

                        const texto = [
                            proveedor.nombre,
                            proveedor.rnc,
                            proveedor.contacto,
                            proveedor.telefono,
                            proveedor.correo
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();


                        return texto.includes(
                            termino
                        );
                    }
                );


            renderizarProveedores(
                filtrados
            );
        }
    );


const supplierModal =
    document.getElementById("supplierModal");

const supplierForm =
    document.getElementById("supplierForm");

const supplierFormErrors =
    document.getElementById(
        "supplierFormErrors"
    );


function abrirModalProveedor() {

    supplierForm.reset();

    supplierFormErrors.innerHTML = "";

    supplierModal.classList.add("show");

    supplierModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.getElementById(
        "supplierName"
    ).focus();
}


function cerrarModalProveedor() {

    supplierModal.classList.remove("show");

    supplierModal.setAttribute(
        "aria-hidden",
        "true"
    );

    supplierFormErrors.innerHTML = "";
}


document
    .getElementById(
        "btnNuevoProveedor"
    )
    .addEventListener(
        "click",
        abrirModalProveedor
    );


document
    .getElementById(
        "btnCerrarProveedor"
    )
    .addEventListener(
        "click",
        cerrarModalProveedor
    );


document
    .getElementById(
        "btnCancelarProveedor"
    )
    .addEventListener(
        "click",
        cerrarModalProveedor
    );


supplierModal.addEventListener(
    "click",
    event => {

        if (event.target === supplierModal) {
            cerrarModalProveedor();
        }
    }
);


supplierForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        supplierFormErrors.innerHTML = "";


        const cuerpo = {

            nombre:
                document.getElementById(
                    "supplierName"
                ).value.trim(),

            rnc:
                document.getElementById(
                    "supplierRnc"
                ).value.trim(),

            contacto:
                document.getElementById(
                    "supplierContact"
                ).value.trim(),

            telefono:
                document.getElementById(
                    "supplierPhone"
                ).value.trim(),

            correo:
                document.getElementById(
                    "supplierEmail"
                ).value.trim(),

            direccion:
                document.getElementById(
                    "supplierAddress"
                ).value.trim(),

            observaciones:
                document.getElementById(
                    "supplierNotes"
                ).value.trim()
        };


        try {

            const respuesta =
                await fetch(
                    "/api/suppliers",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                cuerpo
                            )
                    }
                );


            const resultado =
                await respuesta.json();


            if (!respuesta.ok) {

                const errores =
                    resultado.errores ||
                    [
                        "No se pudo registrar el proveedor."
                    ];

                supplierFormErrors.innerHTML =
                    errores
                        .map(
                            error =>
                                `<div>${escapeHtml(error)}</div>`
                        )
                        .join("");

                return;
            }


            mostrarToast(
                "Proveedor registrado correctamente."
            );


            cerrarModalProveedor();

            await cargarProveedores();
            await cargarProveedoresEntradas();

        } catch (error) {

            supplierFormErrors.innerHTML =
                `<div>${escapeHtml(error.message)}</div>`;
        }
    }
);

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

    if (entryStep === 3) {

    const tipo =
        document.getElementById(
            "entryType"
        ).value;

    if (tipo === "TE-01") {

        const factura =
            document.getElementById(
                "entryInvoice"
            )?.value.trim();

        if (!factura || factura.length !== 11) {
            errores.push(
                "El NCF de la factura debe tener exactamente 11 caracteres."
            );
        }

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

          if (entryStep === 3) {

    if (!validarDetallesEntrada()) {
        return;
    }
}

if (entryStep < 4) {
    entryStep += 1;
}

if (entryStep === 3) {
    renderizarCamposEntrada();
}

if (entryStep === 4) {
    prepararConfirmacionEntrada();
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
   CAMPOS DINÁMICOS DE ENTRADAS TE-01 A TE-10
========================================================= */

let entrySuppliers = [];


async function cargarProveedoresEntradas() {

    try {

        const respuesta =
            await fetch("/api/suppliers");

        if (!respuesta.ok) {
            throw new Error(
                "No se pudieron cargar los proveedores."
            );
        }

        entrySuppliers =
            await respuesta.json();

    } catch (error) {

        entrySuppliers = [];

        mostrarToast(error.message);
    }
}


function opcionesProveedores() {

    if (entrySuppliers.length === 0) {
        return `
            <option value="">
                No hay proveedores activos
            </option>
        `;
    }

    return `
        <option value="">
            Selecciona un proveedor
        </option>
        ${entrySuppliers
            .map(
                proveedor => `
                    <option value="${escapeHtml(proveedor.nombre)}">
                        ${escapeHtml(proveedor.nombre)}
                    </option>
                `
            )
            .join("")}
    `;
}


function campoObservacion() {

    return `
        <div class="form-group dynamic-field-full">
            <label for="entryObservation">
                Observación
            </label>

            <input
                type="text"
                id="entryObservation"
                maxlength="250"
                placeholder="Información adicional"
            >
        </div>
    `;
}


function renderizarCamposEntrada() {

    const tipo =
        document.getElementById(
            "entryType"
        ).value;

    const contenedor =
        document.getElementById(
            "entryDynamicFields"
        );

    const productoId =
        document.getElementById(
            "entryProduct"
        ).value;

    const producto =
        entryProducts.find(
            item => item.id === productoId
        );

    const perecedero =
        producto?.perecedero === 1 ||
        producto?.perecedero === true;


    if (!tipo) {

        contenedor.innerHTML = `
            <div class="empty-state">
                Selecciona un tipo de entrada
                en el paso anterior.
            </div>
        `;

        return;
    }


    if (tipo === "TE-01") {

        contenedor.innerHTML = `
            <div class="dynamic-fields-grid">

                <div class="form-group">
                    <label for="entryInvoice">
                        Número de factura
                    </label>

                <input
                   type="text"
                   id="entryInvoice"
                   minlength="11"
                   maxlength="11"
                   placeholder="Ej. B0100000001"
                   required
                >
                </div>


                <div class="form-group">
                    <label for="entrySupplier">
                        Proveedor
                    </label>

                    <select
                        id="entrySupplier"
                        required
                    >
                        ${opcionesProveedores()}
                    </select>
                </div>


                <div class="form-group">
                    <label for="entryBrand">
                        Marca del producto
                    </label>

                    <input
                        type="text"
                        id="entryBrand"
                        maxlength="30"
                        value="${escapeHtml(producto?.marca || "")}"
                        placeholder="Marca recibida"
                        required
                    >
                </div>


                <div class="form-group">
                    <label for="entryBilledQuantity">
                        Cantidad facturada
                    </label>

                    <input
                        type="number"
                        id="entryBilledQuantity"
                        min="1"
                        step="1"
                        required
                    >
                </div>


                <div class="form-group">
                    <label for="entryUnitCost">
                        Costo unitario
                    </label>

                    <input
                        type="number"
                        id="entryUnitCost"
                        min="0.01"
                        step="0.01"
                        placeholder="RD$ 0.00"
                        required
                    >
                </div>


                ${
                    perecedero
                        ? `
                            <div class="form-group">
                                <label for="entryLot">
                                    Número de lote
                                </label>

                                <input
                                    type="text"
                                    id="entryLot"
                                    maxlength="10"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label for="entryExpiration">
                                    Fecha de vencimiento
                                </label>

                                <input
                                    type="date"
                                    id="entryExpiration"
                                    required
                                >
                            </div>
                        `
                        : ""
                }


                <div class="dynamic-field-full">

                    <div
                        id="entryPurchaseTotal"
                        class="currency-preview"
                    >
                        Total de la compra: RD$ 0.00
                    </div>

                </div>


                ${campoObservacion()}

            </div>
        `;

        const cantidad =
            document.getElementById(
                "entryQuantity"
            ).value;

        document.getElementById(
            "entryBilledQuantity"
        ).value = cantidad;

        conectarCalculoCompra();

        return;
    }


    if (tipo === "TE-02") {

        contenedor.innerHTML = `
            <div class="dynamic-fields-grid">

                <div class="form-group">
                    <label for="entryReference">
                        Referencia de la venta original
                    </label>

                    <input
                        type="text"
                        id="entryReference"
                        maxlength="11"
                        placeholder="Ej. VT-2026-205"
                        required
                    >
                </div>


                <div class="form-group">
                    <label for="entryReason">
                        Motivo de la devolución
                    </label>

                    <input
                        type="text"
                        id="entryReason"
                        maxlength="100"
                        required
                    >
                </div>


                <div class="form-group">
                    <label for="entryReturnedStatus">
                        Estado del producto devuelto
                    </label>

                    <select id="entryReturnedStatus">
                        <option value="">
                            Selecciona
                        </option>
                        <option value="Nuevo">
                            Nuevo
                        </option>
                        <option value="Usado">
                            Usado
                        </option>
                        <option value="Con defecto">
                            Con defecto
                        </option>
                    </select>
                </div>


                ${campoObservacion()}

            </div>
        `;

        return;
    }


    if (tipo === "TE-03") {

        contenedor.innerHTML = `
            <div class="dynamic-fields-grid">

                <div class="form-group">
                    <label for="entryOrigin">
                        Sucursal de origen
                    </label>

                    <input
                        type="text"
                        id="entryOrigin"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="entryReference">
                        Referencia de transferencia
                    </label>

                    <input
                        type="text"
                        id="entryReference"
                        required
                    >
                </div>

                ${campoObservacion()}

            </div>
        `;

        return;
    }


    if (tipo === "TE-04") {

        contenedor.innerHTML = `
            <div class="dynamic-fields-grid">

                <div class="form-group dynamic-field-full">
                    <label for="entryReason">
                        Motivo del ajuste
                    </label>

                    <input
                        type="text"
                        id="entryReason"
                        required
                    >
                </div>

                ${campoObservacion()}

            </div>
        `;

        return;
    }


    if (tipo === "TE-05") {

        contenedor.innerHTML = `
            <div class="dynamic-fields-grid">

                <div class="form-group">
                    <label for="entryReference">
                        Referencia de producción
                    </label>

                    <input
                        type="text"
                        id="entryReference"
                        required
                    >
                </div>

                ${
                    perecedero
                        ? `
                            <div class="form-group">
                                <label for="entryLot">
                                    Número de lote
                                </label>

                                <input
                                    type="text"
                                    id="entryLot"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label for="entryExpiration">
                                    Fecha de vencimiento
                                </label>

                                <input
                                    type="date"
                                    id="entryExpiration"
                                    required
                                >
                            </div>
                        `
                        : ""
                }

                ${campoObservacion()}

            </div>
        `;

        return;
    }


    if (tipo === "TE-06") {

        contenedor.innerHTML = `
            <div class="dynamic-fields-grid">

                <div class="form-group">
                    <label for="entryDonor">
                        Donante
                    </label>

                    <input
                        type="text"
                        id="entryDonor"
                        required
                    >
                </div>

                ${campoObservacion()}

            </div>
        `;

        return;
    }


    if (tipo === "TE-07") {

        contenedor.innerHTML = `
            <div class="dynamic-fields-grid">

                <div class="form-group">
                    <label for="entryCutoffDate">
                        Fecha de corte
                    </label>

                    <input
                        type="date"
                        id="entryCutoffDate"
                        required
                    >
                </div>

                ${campoObservacion()}

            </div>
        `;

        return;
    }


    if (tipo === "TE-08") {

        contenedor.innerHTML = `
            <div class="dynamic-fields-grid">

                <div class="form-group">
                    <label for="entrySupplier">
                        Proveedor
                    </label>

                    <select
                        id="entrySupplier"
                        required
                    >
                        ${opcionesProveedores()}
                    </select>
                </div>

                <div class="form-group">
                    <label for="entryReference">
                        Referencia de la compra
                    </label>

                    <input
                        type="text"
                        id="entryReference"
                        required
                    >
                </div>

                ${campoObservacion()}

            </div>
        `;

        return;
    }


    if (tipo === "TE-09") {

        contenedor.innerHTML = `
            <div class="dynamic-fields-grid">

                <div class="form-group">
                    <label for="entryReference">
                        Referencia de la pérdida original
                    </label>

                    <input
                        type="text"
                        id="entryReference"
                        required
                    >
                </div>

                ${campoObservacion()}

            </div>
        `;

        return;
    }


    if (tipo === "TE-10") {

        contenedor.innerHTML = `
            <div class="dynamic-fields-grid">

                <div class="form-group">
                    <label for="entrySupplier">
                        Proveedor
                    </label>

                    <select
                        id="entrySupplier"
                        required
                    >
                        ${opcionesProveedores()}
                    </select>
                </div>

                <div class="form-group">
                    <label for="entryReference">
                        Referencia de la devolución
                    </label>

                    <input
                        type="text"
                        id="entryReference"
                        required
                    >
                </div>

                ${campoObservacion()}

            </div>
        `;
    }
}


function conectarCalculoCompra() {

    const costo =
        document.getElementById(
            "entryUnitCost"
        );

    const cantidadFacturada =
        document.getElementById(
            "entryBilledQuantity"
        );

    const total =
        document.getElementById(
            "entryPurchaseTotal"
        );


    function calcular() {

        const cantidad =
            Number(
                cantidadFacturada?.value
            );

        const unitario =
            Number(
                costo?.value
            );

        const resultado =
            Number.isFinite(cantidad) &&
            Number.isFinite(unitario)
                ? cantidad * unitario
                : 0;


        total.textContent =
            "Total de la compra: " +
            new Intl.NumberFormat(
                "es-DO",
                {
                    style: "currency",
                    currency: "DOP"
                }
            ).format(resultado);
    }


    costo?.addEventListener(
        "input",
        calcular
    );

    cantidadFacturada?.addEventListener(
        "input",
        calcular
    );

    calcular();
}

/* =========================================================
   DATOS, CONFIRMACIÓN Y REGISTRO DE ENTRADAS
========================================================= */

function obtenerDatosParticularesEntrada() {

    const tipo =
        document.getElementById("entryType").value;

    const datos = {};


    const valor = id =>
        document.getElementById(id)?.value?.trim() || "";


    if (valor("entryObservation")) {
        datos.observacion =
            valor("entryObservation");
    }


    if (tipo === "TE-01") {

        datos.factura =
            valor("entryInvoice");

        datos.proveedor =
            valor("entrySupplier");

        datos.costo_unitario =
            Number(
                document.getElementById(
                    "entryUnitCost"
                )?.value
            );

        if (valor("entryLot")) {
            datos.lote =
                valor("entryLot");
        }

        if (valor("entryExpiration")) {
            datos.fecha_vencimiento =
                valor("entryExpiration");
        }
    }


    if (tipo === "TE-02") {

        datos.referencia =
            valor("entryReference");

        datos.motivo =
            valor("entryReason");

        if (valor("entryReturnedStatus")) {
            datos.estado_devuelto =
                valor("entryReturnedStatus");
        }
    }


    if (tipo === "TE-03") {

        datos.origen =
            valor("entryOrigin");

        datos.referencia =
            valor("entryReference");
    }


    if (tipo === "TE-04") {

        datos.motivo =
            valor("entryReason");
    }


    if (tipo === "TE-05") {

        datos.referencia =
            valor("entryReference");

        if (valor("entryLot")) {
            datos.lote =
                valor("entryLot");
        }

        if (valor("entryExpiration")) {
            datos.fecha_vencimiento =
                valor("entryExpiration");
        }
    }


    if (tipo === "TE-06") {

        datos.donante =
            valor("entryDonor");
    }


    if (tipo === "TE-07") {

        datos.fecha_corte =
            valor("entryCutoffDate");
    }


    if (tipo === "TE-08") {

        datos.proveedor =
            valor("entrySupplier");

        datos.referencia =
            valor("entryReference");
    }


    if (tipo === "TE-09") {

        datos.referencia =
            valor("entryReference");
    }


    if (tipo === "TE-10") {

        datos.proveedor =
            valor("entrySupplier");

        datos.referencia =
            valor("entryReference");
    }


    return datos;
}


function validarDetallesEntrada() {

    const campos =
        document.querySelectorAll(
            "#entryDynamicFields [required]"
        );

    for (const campo of campos) {

        if (!campo.checkValidity()) {

            campo.reportValidity();

            return false;
        }
    }


    const tipo =
        document.getElementById(
            "entryType"
        ).value;


    if (tipo === "TE-01") {

        const factura =
            document.getElementById(
                "entryInvoice"
            ).value.trim();

        if (factura.length !== 11) {

            mostrarToast(
                "El NCF debe tener exactamente 11 caracteres."
            );

            return false;
        }


        const cantidad =
            Number(
                document.getElementById(
                    "entryQuantity"
                ).value
            );

        const cantidadFacturada =
            Number(
                document.getElementById(
                    "entryBilledQuantity"
                ).value
            );

        if (cantidad !== cantidadFacturada) {

            mostrarToast(
                "La cantidad facturada debe coincidir con la cantidad de entrada."
            );

            return false;
        }
    }


    return true;
}


function prepararConfirmacionEntrada() {

    const productoId =
        document.getElementById(
            "entryProduct"
        ).value;

    const producto =
        entryProducts.find(
            p => p.id === productoId
        );

    const cantidad =
        Number(
            document.getElementById(
                "entryQuantity"
            ).value
        );

    const tipoSelect =
        document.getElementById(
            "entryType"
        );

    const tipoTexto =
        tipoSelect.options[
            tipoSelect.selectedIndex
        ]?.textContent || "";

    const datos =
        obtenerDatosParticularesEntrada();

    const nuevoStock =
        producto.stock_actual + cantidad;


    let detallesExtra = "";


    if (datos.proveedor) {

        detallesExtra += `
            <div class="review-item">
                <span>Proveedor</span>
                <strong>
                    ${escapeHtml(datos.proveedor)}
                </strong>
            </div>
        `;
    }


    if (datos.factura) {

        detallesExtra += `
            <div class="review-item">
                <span>NCF / Factura</span>
                <strong>
                    ${escapeHtml(datos.factura)}
                </strong>
            </div>
        `;
    }


    if (datos.costo_unitario) {

        const total =
            cantidad *
            Number(datos.costo_unitario);

        detallesExtra += `
            <div class="review-item">
                <span>Costo unitario</span>
                <strong>
                    ${new Intl.NumberFormat(
                        "es-DO",
                        {
                            style: "currency",
                            currency: "DOP"
                        }
                    ).format(datos.costo_unitario)}
                </strong>
            </div>

            <div class="review-item">
                <span>Total</span>
                <strong>
                    ${new Intl.NumberFormat(
                        "es-DO",
                        {
                            style: "currency",
                            currency: "DOP"
                        }
                    ).format(total)}
                </strong>
            </div>
        `;
    }


    if (datos.lote) {

        detallesExtra += `
            <div class="review-item">
                <span>Lote</span>
                <strong>
                    ${escapeHtml(datos.lote)}
                </strong>
            </div>
        `;
    }


    if (datos.fecha_vencimiento) {

        detallesExtra += `
            <div class="review-item">
                <span>Vencimiento</span>
                <strong>
                    ${escapeHtml(
                        datos.fecha_vencimiento
                    )}
                </strong>
            </div>
        `;
    }


    document.getElementById(
        "entryReview"
    ).innerHTML = `

        <div class="review-item">
            <span>Producto</span>
            <strong>
                ${escapeHtml(producto.nombre)}
            </strong>
        </div>

        <div class="review-item">
            <span>Código</span>
            <strong>
                ${escapeHtml(producto.id)}
            </strong>
        </div>

        <div class="review-item">
            <span>Marca</span>
            <strong>
                ${escapeHtml(producto.marca || "—")}
            </strong>
        </div>

        <div class="review-item">
            <span>Cantidad</span>
            <strong>
                ${cantidad}
            </strong>
        </div>

        <div class="review-item full">
            <span>Tipo de entrada</span>
            <strong>
                ${escapeHtml(tipoTexto)}
            </strong>
        </div>

        <div class="review-item">
            <span>Existencia anterior</span>
            <strong>
                ${producto.stock_actual}
            </strong>
        </div>

        <div class="review-item">
            <span>Existencia resultante</span>
            <strong>
                ${nuevoStock}
            </strong>
        </div>

        ${detallesExtra}

        <div class="review-item">
            <span>Responsable</span>
            <strong>ADM-001</strong>
        </div>
    `;
}


document
    .getElementById("entryForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!validarDetallesEntrada()) {
                return;
            }


            const cuerpo = {

                product_id:
                    document.getElementById(
                        "entryProduct"
                    ).value,

                quantity:
                    Number(
                        document.getElementById(
                            "entryQuantity"
                        ).value
                    ),

                entry_type:
                    document.getElementById(
                        "entryType"
                    ).value,

                operator_id:
                    "ADM-001",

                entry_details:
                    obtenerDatosParticularesEntrada()
            };


            const errores =
                document.getElementById(
                    "entryFormErrors"
                );

            errores.innerHTML = "";


            try {

                const respuesta =
                    await fetch(
                        "/api/entry-records",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(cuerpo)
                        }
                    );


                const resultado =
                    await respuesta.json();


                if (!respuesta.ok) {

                    errores.innerHTML =
                        (resultado.errores || [
                            "No se pudo registrar la entrada."
                        ])
                        .map(
                            error =>
                                `<div>
                                    ${escapeHtml(error)}
                                </div>`
                        )
                        .join("");

                    return;
                }


                mostrarToast(
                    `Entrada ${resultado.folio} registrada correctamente.`
                );


                await Promise.all([
                    cargarProductos(),
                    cargarMovimientos(),
                    cargarDatosEntradas()
                ]);


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


                entryStep = 1;

                actualizarPasoEntrada();

                mostrarSeccion("panel");

            } catch (error) {

                errores.innerHTML =
                    `<div>
                        ${escapeHtml(error.message)}
                    </div>`;
            }
        }
    );

document
    .getElementById("entryType")
    .addEventListener(
        "change",
        renderizarCamposEntrada
    );

/* =========================================================
   ASISTENTE DE SALIDAS
========================================================= */

let exitStep = 1;
let exitProducts = [];


async function cargarDatosSalidas() {

    try {

        const [
            respuestaProductos,
            respuestaTipos
        ] = await Promise.all([
            fetch("/api/products"),
            fetch("/api/types?direccion=SALIDA")
        ]);


        if (
            !respuestaProductos.ok ||
            !respuestaTipos.ok
        ) {
            throw new Error(
                "No se pudieron cargar los datos de salidas."
            );
        }


        exitProducts =
            await respuestaProductos.json();

        const tipos =
            await respuestaTipos.json();


        const productSelect =
            document.getElementById(
                "exitProduct"
            );

        const typeSelect =
            document.getElementById(
                "exitType"
            );


        productSelect.innerHTML =
            `<option value="">
                Selecciona un producto
            </option>`;


        exitProducts.forEach(producto => {

            const opcion =
                document.createElement(
                    "option"
                );

            opcion.value =
                producto.id;

            opcion.textContent =
                `${producto.id} · ${producto.nombre}` +
                `${producto.marca
                    ? " · " + producto.marca
                    : ""
                }`;

            productSelect.appendChild(
                opcion
            );
        });


        typeSelect.innerHTML =
            `<option value="">
                Selecciona el tipo
            </option>`;


        tipos.forEach(tipo => {

            const opcion =
                document.createElement(
                    "option"
                );

            opcion.value =
                tipo.codigo;

            opcion.textContent =
                `${tipo.codigo} · ${tipo.nombre}`;

            typeSelect.appendChild(
                opcion
            );
        });

    } catch (error) {

        mostrarToast(
            error.message
        );
    }
}


function actualizarPasoSalida() {

    document
        .querySelectorAll(
            "[data-exit-panel]"
        )
        .forEach(panel => {

            panel.classList.toggle(
                "active",
                Number(
                    panel.dataset.exitPanel
                ) === exitStep
            );
        });


    document
        .querySelectorAll(
            "[data-exit-step]"
        )
        .forEach(indicador => {

            const numero =
                Number(
                    indicador.dataset.exitStep
                );

            indicador.classList.toggle(
                "active",
                numero === exitStep
            );

            indicador.classList.toggle(
                "completed",
                numero < exitStep
            );
        });


    document.getElementById(
        "exitPrevious"
    ).disabled =
        exitStep === 1;


    document.getElementById(
        "exitNext"
    ).classList.toggle(
        "hidden",
        exitStep === 4
    );


    document.getElementById(
        "exitSubmit"
    ).classList.toggle(
        "hidden",
        exitStep !== 4
    );
}


function validarPasoSalida() {

    if (exitStep === 1) {

        const producto =
            document.getElementById(
                "exitProduct"
            ).value;

        if (!producto) {

            mostrarToast(
                "Debes seleccionar un producto."
            );

            return false;
        }
    }


    if (exitStep === 2) {

        const cantidad =
            Number(
                document.getElementById(
                    "exitQuantity"
                ).value
            );

        const tipo =
            document.getElementById(
                "exitType"
            ).value;


        if (
            !Number.isInteger(cantidad) ||
            cantidad <= 0
        ) {

            mostrarToast(
                "La cantidad debe ser un entero mayor que cero."
            );

            return false;
        }


        if (!tipo) {

            mostrarToast(
                "Debes seleccionar el tipo de salida."
            );

            return false;
        }


        const productoId =
            document.getElementById(
                "exitProduct"
            ).value;

        const producto =
            exitProducts.find(
                item =>
                    item.id === productoId
            );


        if (
            producto &&
            cantidad >
                producto.stock_actual
        ) {

            mostrarToast(
                "La cantidad solicitada supera la existencia disponible."
            );

            return false;
        }
    }


    return true;
}

function campoObservacionSalida(
    etiqueta = "Observación",
    requerido = false
) {

    return `
        <div class="form-group dynamic-field-full">

            <label for="exitObservation">
                ${etiqueta}
            </label>

            <textarea
                id="exitObservation"
                rows="3"
                ${requerido ? "required" : ""}
            ></textarea>

        </div>
    `;
}


function renderizarCamposSalida() {

    const contenedor =
        document.getElementById(
            "exitDynamicFields"
        );

    const tipo =
        document.getElementById(
            "exitType"
        ).value;


    contenedor.innerHTML = "";


    /* =========================
       TS-01 · VENTA
    ========================== */

    if (tipo === "TS-01") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                  <label for="exitReference">
                  Número de factura
                  </label>
                  <input
                  type="text"
                  id="exitReference"
                  placeholder="Ej. E310000000057"
                  required
                  >

                </div>

                ${campoObservacionSalida()}

            </div>
        `;

        return;
    }


    /* =========================
       TS-02 · PRODUCTO DAÑADO
    ========================== */

    if (tipo === "TS-02") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                ${campoObservacionSalida(
                    "Descripción del daño",
                    true
                )}

            </div>
        `;

        return;
    }


    /* =========================
       TS-03 · PRODUCTO VENCIDO
    ========================== */

    if (tipo === "TS-03") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                    <label for="exitExpiration">
                        Fecha de vencimiento
                    </label>

                    <input
                        type="date"
                        id="exitExpiration"
                        required
                    >

                </div>

                ${campoObservacionSalida(
                    "Observación",
                    true
                )}

            </div>
        `;

        return;
    }


    /* =========================
       TS-04 · DEVOLUCIÓN A PROVEEDOR
    ========================== */

    if (tipo === "TS-04") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                    <label for="exitSupplier">
                        Proveedor
                    </label>

                    <select
                        id="exitSupplier"
                        required
                    >
                        ${opcionesProveedores()}
                    </select>

                </div>


                <div class="form-group">

                    <label for="exitReason">
                        Motivo de devolución
                    </label>

                    <input
                        type="text"
                        id="exitReason"
                        required
                    >

                </div>


                ${campoObservacionSalida()}

            </div>
        `;

        return;
    }


    /* =========================
       TS-05 · CONSUMO INTERNO
    ========================== */

    if (tipo === "TS-05") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                    <label for="exitReason">
                        Área o motivo de uso
                    </label>

                    <input
                        type="text"
                        id="exitReason"
                        required
                    >

                </div>

                ${campoObservacionSalida()}

            </div>
        `;

        return;
    }


    /* =========================
       TS-06 · PÉRDIDA O EXTRAVÍO
    ========================== */

    if (tipo === "TS-06") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                ${campoObservacionSalida(
                    "Explicación de la pérdida o extravío",
                    true
                )}

            </div>
        `;

        return;
    }


    /* =========================
       TS-07 · ROBO
    ========================== */

    if (tipo === "TS-07") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                ${campoObservacionSalida(
                    "Descripción del incidente",
                    true
                )}

                <div class="form-note dynamic-field-full">
                    Este tipo de salida está restringido
                    al administrador.
                </div>

            </div>
        `;

        return;
    }


    /* =========================
       TS-08 · AJUSTE INVENTARIO
    ========================== */

    if (tipo === "TS-08") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group dynamic-field-full">

                    <label for="exitReason">
                        Motivo del ajuste
                    </label>

                    <input
                        type="text"
                        id="exitReason"
                        required
                    >

                </div>

                ${campoObservacionSalida()}

            </div>
        `;

        return;
    }


    /* =========================
       TS-09 · TRANSFERENCIA
    ========================== */

    if (tipo === "TS-09") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                    <label for="exitDestination">
                        Sucursal de destino
                    </label>

                    <input
                        type="text"
                        id="exitDestination"
                        required
                    >

                </div>

                ${campoObservacionSalida()}

            </div>
        `;

        return;
    }


    /* =========================
       TS-10 · MUESTRA O PROMOCIÓN
    ========================== */

    if (tipo === "TS-10") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                    <label for="exitReason">
                        Campaña o motivo
                    </label>

                    <input
                        type="text"
                        id="exitReason"
                        required
                    >

                </div>

                ${campoObservacionSalida()}

            </div>
        `;

        return;
    }


    /* =========================
       TS-11 · DONACIÓN
    ========================== */

    if (tipo === "TS-11") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                    <label for="exitRecipient">
                        Destinatario
                    </label>

                    <input
                        type="text"
                        id="exitRecipient"
                        required
                    >

                </div>


                <div class="form-group">

                    <label for="exitReason">
                        Motivo de la donación
                    </label>

                    <input
                        type="text"
                        id="exitReason"
                        required
                    >

                </div>


                ${campoObservacionSalida()}

            </div>
        `;

        return;
    }


    /* =========================
       TS-12 · MERMA
    ========================== */

    if (tipo === "TS-12") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                    <label for="exitCause">
                        Causa de la merma
                    </label>

                    <input
                        type="text"
                        id="exitCause"
                        required
                    >

                </div>

                ${campoObservacionSalida()}

            </div>
        `;

        return;
    }


    /* =========================
       TS-13 · USO PARA PRODUCCIÓN
    ========================== */

    if (tipo === "TS-13") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                    <label for="exitReference">
                        Referencia de producción
                    </label>

                    <input
                        type="text"
                        id="exitReference"
                        required
                    >

                </div>

                ${campoObservacionSalida()}

            </div>
        `;

        return;
    }


    /* =========================
       TS-14 · DESPACHO DE PEDIDO
    ========================== */

    if (tipo === "TS-14") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                    <label for="exitReference">
                        Referencia del pedido
                    </label>

                    <input
                        type="text"
                        id="exitReference"
                        placeholder="Ej. PED-2026-014"
                        required
                    >

                </div>


                <div class="form-group">

                    <label for="exitDestination">
                        Destino
                    </label>

                    <input
                        type="text"
                        id="exitDestination"
                    >

                </div>


                <div class="form-group">

                    <label for="exitAuthorization">
                        Autorización
                    </label>

                    <input
                        type="text"
                        id="exitAuthorization"
                    >

                </div>


                ${campoObservacionSalida()}

            </div>
        `;

        return;
    }


    /* =========================
       TS-15 · BAJA DEFINITIVA
    ========================== */

    if (tipo === "TS-15") {

        contenedor.innerHTML = `

            <div class="dynamic-fields-grid">

                <div class="form-group">

                    <label for="exitReason">
                        Motivo de la baja
                    </label>

                    <input
                        type="text"
                        id="exitReason"
                        required
                    >

                </div>


                <div class="form-group">

                    <label for="exitAuthorization">
                        Autorizado por
                    </label>

                    <input
                        type="text"
                        id="exitAuthorization"
                        required
                    >

                </div>


                ${campoObservacionSalida()}


                <div class="form-note dynamic-field-full">
                    Este tipo de salida está restringido
                    al administrador.
                </div>

            </div>
        `;

        return;
    }
}

function obtenerDatosParticularesSalida() {

    const datos = {};

    const valor = id =>
        document.getElementById(id)?.value?.trim() || "";


    if (valor("exitReference")) {
        datos.referencia =
            valor("exitReference");
    }

    if (valor("exitObservation")) {
        datos.observacion =
            valor("exitObservation");
    }

    if (valor("exitExpiration")) {
        datos.fecha_vencimiento =
            valor("exitExpiration");
    }

    if (valor("exitSupplier")) {
        datos.proveedor =
            valor("exitSupplier");
    }

    if (valor("exitReason")) {
        datos.motivo =
            valor("exitReason");
    }

    if (valor("exitDestination")) {
        datos.destino =
            valor("exitDestination");
    }

    if (valor("exitRecipient")) {
        datos.destinatario =
            valor("exitRecipient");
    }

    if (valor("exitCause")) {
        datos.causa =
            valor("exitCause");
    }

    if (valor("exitAuthorization")) {
        datos.autorizacion =
            valor("exitAuthorization");
    }


    return datos;
}


function validarDetallesSalida() {

    const campos =
        document.querySelectorAll(
            "#exitDynamicFields [required]"
        );


    for (const campo of campos) {

        if (!campo.checkValidity()) {

            campo.reportValidity();

            return false;
        }
    }


    return true;
}


function prepararConfirmacionSalida() {

    const productoId =
        document.getElementById(
            "exitProduct"
        ).value;


    const producto =
        exitProducts.find(
            item =>
                item.id === productoId
        );


    const cantidad =
        Number(
            document.getElementById(
                "exitQuantity"
            ).value
        );


    const tipoSelect =
        document.getElementById(
            "exitType"
        );


    const tipoTexto =
        tipoSelect.options[
            tipoSelect.selectedIndex
        ]?.textContent || "";


    const datos =
        obtenerDatosParticularesSalida();


    const stockResultante =
        producto.stock_actual -
        cantidad;


    let detallesExtra = "";


    if (datos.referencia) {

        detallesExtra += `
            <div class="review-item">
                <span>Referencia</span>
                <strong>
                    ${escapeHtml(
                        datos.referencia
                    )}
                </strong>
            </div>
        `;
    }


    if (datos.proveedor) {

        detallesExtra += `
            <div class="review-item">
                <span>Proveedor</span>
                <strong>
                    ${escapeHtml(
                        datos.proveedor
                    )}
                </strong>
            </div>
        `;
    }


    if (datos.motivo) {

        detallesExtra += `
            <div class="review-item">
                <span>Motivo</span>
                <strong>
                    ${escapeHtml(
                        datos.motivo
                    )}
                </strong>
            </div>
        `;
    }


    if (datos.destino) {

        detallesExtra += `
            <div class="review-item">
                <span>Destino</span>
                <strong>
                    ${escapeHtml(
                        datos.destino
                    )}
                </strong>
            </div>
        `;
    }


    if (datos.destinatario) {

        detallesExtra += `
            <div class="review-item">
                <span>Destinatario</span>
                <strong>
                    ${escapeHtml(
                        datos.destinatario
                    )}
                </strong>
            </div>
        `;
    }


    if (datos.causa) {

        detallesExtra += `
            <div class="review-item">
                <span>Causa</span>
                <strong>
                    ${escapeHtml(
                        datos.causa
                    )}
                </strong>
            </div>
        `;
    }


    if (datos.autorizacion) {

        detallesExtra += `
            <div class="review-item">
                <span>Autorización</span>
                <strong>
                    ${escapeHtml(
                        datos.autorizacion
                    )}
                </strong>
            </div>
        `;
    }


    if (datos.fecha_vencimiento) {

        detallesExtra += `
            <div class="review-item">
                <span>Fecha de vencimiento</span>
                <strong>
                    ${escapeHtml(
                        datos.fecha_vencimiento
                    )}
                </strong>
            </div>
        `;
    }


    if (datos.observacion) {

        detallesExtra += `
            <div class="review-item full">
                <span>Observación</span>
                <strong>
                    ${escapeHtml(
                        datos.observacion
                    )}
                </strong>
            </div>
        `;
    }


    document.getElementById(
        "exitReview"
    ).innerHTML = `

        <div class="review-item">
            <span>Producto</span>
            <strong>
                ${escapeHtml(
                    producto.nombre
                )}
            </strong>
        </div>

        <div class="review-item">
            <span>Código</span>
            <strong>
                ${escapeHtml(
                    producto.id
                )}
            </strong>
        </div>

        <div class="review-item">
            <span>Marca</span>
            <strong>
                ${escapeHtml(
                    producto.marca || "—"
                )}
            </strong>
        </div>

        <div class="review-item">
            <span>Cantidad</span>
            <strong>
                ${cantidad}
            </strong>
        </div>

        <div class="review-item full">
            <span>Tipo de salida</span>
            <strong>
                ${escapeHtml(
                    tipoTexto
                )}
            </strong>
        </div>

        <div class="review-item">
            <span>Existencia anterior</span>
            <strong>
                ${producto.stock_actual}
            </strong>
        </div>

        <div class="review-item">
            <span>Existencia resultante</span>
            <strong>
                ${stockResultante}
            </strong>
        </div>

        ${detallesExtra}

        <div class="review-item">
            <span>Responsable</span>
            <strong>
                ADM-001
            </strong>
        </div>
    `;
}


function actualizarVistaStockSalida() {

    const productoId =
        document.getElementById(
            "exitProduct"
        ).value;

    const cantidad =
        Number(
            document.getElementById(
                "exitQuantity"
            ).value
        );

    const producto =
        exitProducts.find(
            item =>
                item.id === productoId
        );

    const vista =
        document.getElementById(
            "exitStockPreview"
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
        producto.stock_actual -
        cantidad;


    vista.textContent =
        `Existencia actual: ${producto.stock_actual} · ` +
        `Salida: -${cantidad} · ` +
        `Existencia resultante: ${nuevoStock}`;
}


document
    .getElementById("exitProduct")
    .addEventListener(
        "change",
        event => {

            const producto =
                exitProducts.find(
                    item =>
                        item.id ===
                        event.target.value
                );

            const resumen =
                document.getElementById(
                    "exitProductInfo"
                );


            if (!producto) {

                resumen.classList.add(
                    "hidden"
                );

                return;
            }


            document.getElementById(
                "exitCurrentStock"
            ).textContent =
                producto.stock_actual;


            document.getElementById(
                "exitMinimumStock"
            ).textContent =
                producto.stock_minimo;


            document.getElementById(
                "exitProductStatus"
            ).textContent =
                producto.estado;


            document.getElementById(
                "exitProductBrand"
            ).textContent =
                producto.marca || "—";


            resumen.classList.remove(
                "hidden"
            );


            actualizarVistaStockSalida();
        }
    );


document
    .getElementById("exitQuantity")
    .addEventListener(
        "input",
        actualizarVistaStockSalida
    );

document
    .getElementById("exitType")
    .addEventListener(
        "change",
        renderizarCamposSalida
    );


document
    .getElementById("exitNext")
    .addEventListener(
        "click",
        () => {

            if (!validarPasoSalida()) {
                return;
            }


          if (exitStep === 3) {

    if (!validarDetallesSalida()) {
        return;
    }
}


if (exitStep < 4) {
    exitStep += 1;
}


if (exitStep === 3) {
    renderizarCamposSalida();
}


if (exitStep === 4) {
    prepararConfirmacionSalida();
}


actualizarPasoSalida();
        
        }
    );


document
    .getElementById("exitPrevious")
    .addEventListener(
        "click",
        () => {

            if (exitStep > 1) {
                exitStep -= 1;
            }


            actualizarPasoSalida();
        }
    );

document
    .getElementById("exitForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!validarDetallesSalida()) {
                return;
            }


            const cuerpo = {

                product_id:
                    document.getElementById(
                        "exitProduct"
                    ).value,

                quantity:
                    Number(
                        document.getElementById(
                            "exitQuantity"
                        ).value
                    ),

                exit_type:
                    document.getElementById(
                        "exitType"
                    ).value,

                operator_id:
                    "ADM-001",

                exit_details:
                    obtenerDatosParticularesSalida()
            };


            const errores =
                document.getElementById(
                    "exitFormErrors"
                );


            errores.innerHTML = "";


            try {

                const respuesta =
                    await fetch(
                        "/api/exit-records",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    cuerpo
                                )
                        }
                    );


                const resultado =
                    await respuesta.json();


                if (!respuesta.ok) {

                    errores.innerHTML =
                        (
                            resultado.errores ||
                            [
                                "No se pudo registrar la salida."
                            ]
                        )
                        .map(
                            error =>
                                `<div>
                                    ${escapeHtml(
                                        error
                                    )}
                                </div>`
                        )
                        .join("");

                    return;
                }


                mostrarToast(
                    `Salida ${resultado.folio} registrada correctamente.`
                );


                await Promise.all([
                    cargarProductos(),
                    cargarMovimientos(),
                    cargarDatosEntradas(),
                    cargarDatosSalidas()
                ]);


                document
                    .getElementById(
                        "exitForm"
                    )
                    .reset();


                document
                    .getElementById(
                        "exitProductInfo"
                    )
                    .classList
                    .add("hidden");


                document.getElementById(
                    "exitDynamicFields"
                ).innerHTML = "";


                document.getElementById(
                    "exitReview"
                ).innerHTML = "";


                exitStep = 1;

                actualizarPasoSalida();

                mostrarSeccion(
                    "panel"
                );

            } catch (error) {

                errores.innerHTML =
                    `<div>
                        ${escapeHtml(
                            error.message
                        )}
                    </div>`;
            }
        }
    );


document
    .getElementById("exitCancel")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "exitForm"
                )
                .reset();


            document
                .getElementById(
                    "exitProductInfo"
                )
                .classList
                .add("hidden");


            document.getElementById(
                "exitStockPreview"
            ).textContent =
                "Selecciona producto y cantidad para calcular la existencia resultante.";


            exitStep = 1;

            actualizarPasoSalida();

            mostrarToast(
                "Registro de salida cancelado."
            );
        }
    );


document
    .getElementById("btnNuevaSalida")
    .addEventListener(
        "click",
        () => {

            exitStep = 1;

            document
                .getElementById(
                    "exitForm"
                )
                .reset();


            document
                .getElementById(
                    "exitProductInfo"
                )
                .classList
                .add("hidden");


            document.getElementById(
                "exitDateTime"
            ).value =
                new Date()
                    .toLocaleString(
                        "es-DO"
                    );


            actualizarPasoSalida();

            mostrarSeccion(
                "salidas"
            );
        }
    );

/* =========================================================
   ASISTENTE DE DESPACHOS
========================================================= */

let dispatchStep = 1;


function actualizarPasoDespacho() {

    document
        .querySelectorAll(
            "[data-dispatch-panel]"
        )
        .forEach(panel => {

            panel.classList.toggle(
                "active",
                Number(
                    panel.dataset.dispatchPanel
                ) === dispatchStep
            );
        });


    document
        .querySelectorAll(
            "[data-dispatch-step]"
        )
        .forEach(indicador => {

            const numero =
                Number(
                    indicador.dataset.dispatchStep
                );

            indicador.classList.toggle(
                "active",
                numero === dispatchStep
            );

            indicador.classList.toggle(
                "completed",
                numero < dispatchStep
            );
        });


    document.getElementById(
        "dispatchPrevious"
    ).disabled =
        dispatchStep === 1;


    document.getElementById(
        "dispatchNext"
    ).classList.toggle(
        "hidden",
        dispatchStep === 4
    );


    document.getElementById(
        "dispatchSubmit"
    ).classList.toggle(
        "hidden",
        dispatchStep !== 4
    );
}


function validarPasoDespacho() {

    if (dispatchStep === 1) {

        const origen =
            document.getElementById(
                "dispatchOrigin"
            ).value;

        const factura =
            document.getElementById(
                "dispatchInvoice"
            ).value.trim();

        const tipoComprobante =
            document.getElementById(
                "dispatchInvoiceType"
            ).value;

        const fechaFactura =
            document.getElementById(
                "dispatchInvoiceDate"
            ).value;

        const cliente =
            document.getElementById(
                "dispatchClient"
            ).value.trim();

        const respaldo =
            document.getElementById(
                "dispatchSupportDocument"
            ).value.trim();


        if (!origen) {

            mostrarToast(
                "Debes seleccionar el origen del despacho."
            );

            return false;
        }


        if (!cliente) {

            mostrarToast(
                "Debes indicar el cliente o razón social."
            );

            return false;
        }


        if (
            origen === "TD-01" ||
            origen === "TD-02"
        ) {

            if (!factura) {

                mostrarToast(
                    "Debes indicar el número de factura e-NCF."
                );

                return false;
            }


            if (!tipoComprobante) {

                mostrarToast(
                    "Debes indicar el tipo de comprobante."
                );

                return false;
            }


            if (!fechaFactura) {

                mostrarToast(
                    "Debes indicar la fecha de la factura."
                );

                return false;
            }
        }


        if (
            origen === "TD-03" &&
            !respaldo
        ) {

            mostrarToast(
                "El despacho manual requiere un documento de respaldo."
            );

            return false;
        }
    }


    return true;
}


function actualizarCamposOrigenDespacho() {

    const origen =
        document.getElementById(
            "dispatchOrigin"
        ).value;

    const factura =
        document.getElementById(
            "dispatchInvoice"
        );

    const tipo =
        document.getElementById(
            "dispatchInvoiceType"
        );

    const fecha =
        document.getElementById(
            "dispatchInvoiceDate"
        );

    const respaldo =
        document.getElementById(
            "dispatchSupportDocument"
        );


    const usaFactura =
        origen === "TD-01" ||
        origen === "TD-02";


    factura.required =
        usaFactura;

    tipo.required =
        usaFactura;

    fecha.required =
        usaFactura;


    respaldo.required =
        origen === "TD-03";


    factura.disabled =
        origen === "TD-03";

    tipo.disabled =
        origen === "TD-03";

    fecha.disabled =
        origen === "TD-03";


    respaldo.disabled =
        usaFactura;


    if (origen === "TD-03") {

        factura.value = "";
        tipo.value = "";
        fecha.value = "";

    } else if (usaFactura) {

        respaldo.value = "";
    }
}


document
    .getElementById("dispatchOrigin")
    .addEventListener(
        "change",
        actualizarCamposOrigenDespacho
    );


document
    .getElementById("dispatchNext")
    .addEventListener(
        "click",
        () => {

            if (!validarPasoDespacho()) {
                return;
            }


            if (dispatchStep < 4) {
                dispatchStep += 1;
            }


            actualizarPasoDespacho();
        }
    );


document
    .getElementById("dispatchPrevious")
    .addEventListener(
        "click",
        () => {

            if (dispatchStep > 1) {
                dispatchStep -= 1;
            }


            actualizarPasoDespacho();
        }
    );


document
    .getElementById("dispatchCancel")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "dispatchForm"
                )
                .reset();


            dispatchStep = 1;

            actualizarCamposOrigenDespacho();
            actualizarPasoDespacho();

            mostrarToast(
                "Registro de despacho cancelado."
            );
        }
    );


document
    .getElementById("btnNuevoDespacho")
    .addEventListener(
        "click",
        () => {

            dispatchStep = 1;

            document
                .getElementById(
                    "dispatchForm"
                )
                .reset();


            document.getElementById(
                "dispatchDateTime"
            ).value =
                new Date()
                    .toLocaleString(
                        "es-DO"
                    );


            actualizarCamposOrigenDespacho();
            actualizarPasoDespacho();

            mostrarSeccion(
                "despachos"
            );
        }
    );


/* =========================================================
   INICIO
========================================================= */

async function iniciarAplicacion() {

  await cargarProveedores();
    
  await Promise.all([
    cargarProductos(),
    cargarMovimientos(),
    cargarDatosEntradas(),
    cargarProveedoresEntradas(),
    cargarDatosSalidas()
]);

    document.getElementById(
        "entryDateTime"
    ).value =
        new Date()
            .toLocaleString("es-DO");

    document.getElementById(
    "exitDateTime"
).value =
    new Date()
        .toLocaleString("es-DO");

    actualizarPasoSalida();

    
    actualizarPasoEntrada();
}

document.getElementById(
    "dispatchDateTime"
).value =
    new Date()
        .toLocaleString("es-DO");

actualizarCamposOrigenDespacho();

actualizarPasoDespacho();

document.addEventListener(
    "DOMContentLoaded",
    iniciarAplicacion
);

