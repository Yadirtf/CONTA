# modulos/catalogo

Catálogo de cada empresa (EP-05): sus compradores (HU-05.01): buscarlos por cédula o NIT, crearlos con los
campos mínimos que la DIAN pide del adquirente y elegir «consumidor final»; y sus productos (HU-05.02), con el precio
de venta y cómo los trata el IVA, para que al vender la base y el impuesto se separen solos y exactos.

## Qué hay

| Capa | Contenido |
| --- | --- |
| `dominio/clientes/` | `Cliente` (crear valida y limpia; `guardado` reconstruye). `datos-tributarios.ts`: persona natural o jurídica, responsabilidades del RUT (R-99-PN si no tiene) e IVA. `contacto.ts`: correo y dirección con código DANE. `consumidor-final.ts`: el comprador genérico 222222222222, que no se guarda y cuyo número queda reservado. `termino-de-busqueda.ts`: de 3 a 20 letras o dígitos, sin comodines, con el dígito del NIT si lo es. `numero-de-documento.ts`: quita puntos, espacios y el dígito después del guion. `limites-de-clientes.ts`: 300 compradores nuevos por empresa en 24 horas. La identificación y el dígito de verificación están en `compartido/dominio/identificacion/` (los usa también facturación). |
| `dominio/productos/` | `Producto` (crear valida y limpia; `venta(cantidad)` separa base e IVA del total de la línea). `precio-de-venta.ts`: el precio que se guarda es el final, con IVA incluido y hasta 2 decimales; uno escrito sin IVA se convierte una vez. `nombre-de-producto.ts`: nombre limpio y `nombreParaBuscar` (sin tildes ni mayúsculas, solo a-z, dígitos y espacios). `codigo-de-producto.ts`, `unidad-de-medida.ts` (lista cerrada UN/ECE), `busqueda-de-productos.ts` y `limites-de-productos.ts` (500 nuevos por empresa en 24 horas). El IVA (tarifas, tratamiento gravado/exento/excluido y el desglose) está en `compartido/dominio/impuestos/`, porque lo usa también la factura. |
| `aplicacion/` | `CrearCliente` (idempotente por id y por documento; devuelve el existente sin cambiarlo) y `BuscarClientes` (hasta 10). Ambos exigen `Permiso.Vender`. `CrearProducto` (exige `Permiso.GestionarProductos`; idempotente por id; un código repetido es `producto.codigo-en-uso`) y `BuscarProductos` (`Permiso.Vender`, hasta 50). Puertos `RepositorioClientes`, `RepositorioProductos` y `RepositoriosDeCatalogo`. |
| `infraestructura/persistencia/` | `RepositorioClientesPostgres` sobre `conta.clientes` (migración `0007_clientes.sql`) y `RepositorioProductosPostgres` sobre `conta.productos` (migración `0008_productos.sql`). No filtra a mano por empresa: lo hace RLS; al insertar, la empresa sale de `conta_sistema.empresa_actual()`. |
| `presentacion/http/` | `ClientesController` y `ProductosController`, lectura del cuerpo (`lectura-de-cliente.ts`, `cuerpo-de-busqueda.ts`, `lectura-de-producto.ts`, `busqueda-de-productos.ts`), respuestas y traductor de errores. |

## Endpoints

Todos con `Authorization` y `X-Empresa`, permiso `vender` (dueño, contador y cajero) y `Cache-Control: no-store`.

| Método y ruta | Qué hace | Respuestas |
| --- | --- | --- |
| `POST /clientes/busqueda` `{documento}` | Busca por el comienzo del documento y devuelve `{nit, clientes}`; `nit` trae el dígito de verificación si lo escrito es un NIT posible | 200, 400 `cliente.busqueda-invalida` (menos de 3 o con otros caracteres), 401, 403, 404 empresa ajena |
| `GET /clientes/consumidor-final` | El consumidor final de la DIAN (`id: null`, `esConsumidorFinal: true`) | 200 |
| `POST /clientes` `{id, tipoDocumento, numero, digitoVerificacion?, nombre, tipoDePersona, responsabilidadesFiscales?, responsableDeIva?, correo?, direccion?}` | Crea el comprador | 201 creado, 200 ya existía ese documento (o el mismo id), 400 datos (`nit.digito-invalido`, `cliente.consumidor-final`…), 409 `cliente.id-en-uso`, 429 `cliente.limite-diario` |

### Productos (HU-05.02)

Con `Authorization` y `X-Empresa`, y `Cache-Control: no-store`.

| Método y ruta | Permiso | Qué hace | Respuestas |
| --- | --- | --- | --- |
| `GET /productos?buscar=` | `vender` (dueño, contador, cajero) | Hasta 50 por nombre: los que contienen el texto (sin tildes ni mayúsculas) o cuyo código empieza así. Sin texto, los primeros por nombre | 200 `{productos}`, 400 `peticion.campo-invalido` (más de 60 caracteres, arreglos u objetos), 401, 403, 404 |
| `POST /productos` `{id, nombre, codigo?, unidad?, precio, precioIncluyeIva?, tipoDeIva, tarifaIva?}` | `gestionar-productos` (dueño y contador) | Crea el producto. `precio` es texto en pesos con hasta 2 decimales; `precioIncluyeIva` es `true` por defecto | 201 creado, 200 ya existía ese id (sin cambios), 400 (`producto.precio-invalido`, `iva.tarifa-invalida`, `producto.unidad-invalida`…), 403, 409 `producto.codigo-en-uso`, 429 `producto.limite-diario` |

Cada producto responde `{id, nombre, codigo, unidad, iva: {tipo, tarifa}, precio: {total, base, iva}}`: el precio de una
unidad ya separado por la API. La app no calcula impuestos.

### Clientes: por qué la búsqueda es un POST

La búsqueda es un `POST` para que el documento de una persona no quede en la URL: los registros de acceso de
Render y Cloudflare y el historial del navegador guardan direcciones (Ley 1581).

## Reglas

- Un documento (tipo y número), un comprador por empresa. El mismo documento en otra empresa es otro comprador y
  ninguna ve el de la otra (RLS; llave `(empresa_id, id)`, así un id repetido tampoco delata a otra empresa).
- `conta_api` solo tiene `SELECT` e `INSERT`: editar y borrar (rectificación y supresión, Ley 1581) llegan con
  su historia. Las facturas copiarán los datos del comprador al emitirse (HU-06.01).
- La búsqueda no lista: pide 3 caracteres como mínimo y devuelve 10 como máximo.
- Un producto guarda un solo precio, el final con IVA incluido (Ley 1480, art. 26), y su tratamiento: gravado al 19 %
  o 5 %, exento (0 %) o excluido (sin IVA). El tipo y la tarifa van separados (una reforma de tarifa no deja nombres
  engañosos). Al vender se separa el total de la línea (precio × cantidad, en centavos): la base se redondea una vez,
  mitad al par, y el IVA es lo que falta, así que base + IVA es exactamente lo cobrado. El IVA difiere de base × tarifa
  en menos de un centavo (≤ 0,006), dentro de la tolerancia de la DIAN.
- `conta_api` solo tiene `SELECT` e `INSERT` en `conta.productos`: cambiar el precio o retirar un producto llegan con
  su historia. El código (de barras o interno) es único por empresa.

## Para otros módulos

`index.ts` exporta `CatalogoModule`, `Cliente`, `CONSUMIDOR_FINAL` y `Producto`. Para HU-06.01 (factura): la línea
debe construirse desde el total con IVA (`Producto.venta`) y guardar esa base y ese IVA sin recalcularlos (hoy
`LineaDeFactura.crear` los recalcula desde el precio unitario), y la factura debe distinguir exento de excluido (el
excluido no va en el TaxTotal de IVA ni en la base gravable).
