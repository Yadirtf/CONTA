# modulos/catalogo

Catálogo de cada empresa (EP-05). Hoy, sus compradores (HU-05.01): buscarlos por cédula o NIT, crearlos con los
campos mínimos que la DIAN pide del adquirente y elegir «consumidor final». Los productos llegan con HU-05.02.

## Qué hay

| Capa | Contenido |
| --- | --- |
| `dominio/clientes/` | `Cliente` (crear valida y limpia; `guardado` reconstruye). `datos-tributarios.ts`: persona natural o jurídica, responsabilidades del RUT (R-99-PN si no tiene) e IVA. `contacto.ts`: correo y dirección con código DANE. `consumidor-final.ts`: el comprador genérico 222222222222, que no se guarda y cuyo número queda reservado. `termino-de-busqueda.ts`: de 3 a 20 letras o dígitos, sin comodines, con el dígito del NIT si lo es. `numero-de-documento.ts`: quita puntos, espacios y el dígito después del guion. `limites-de-clientes.ts`: 300 compradores nuevos por empresa en 24 horas. La identificación y el dígito de verificación están en `compartido/dominio/identificacion/` (los usa también facturación). |
| `aplicacion/` | `CrearCliente` (idempotente por id y por documento; devuelve el existente sin cambiarlo) y `BuscarClientes` (hasta 10). Ambos exigen `Permiso.Vender`. Puerto `RepositorioClientes`. |
| `infraestructura/persistencia/` | `RepositorioClientesPostgres` sobre `conta.clientes` (migración `0007_clientes.sql`). No filtra a mano por empresa: lo hace RLS; al insertar, la empresa sale de `conta_sistema.empresa_actual()`. |
| `presentacion/http/` | `ClientesController`, lectura del cuerpo (`lectura-de-cliente.ts`, `cuerpo-de-busqueda.ts`), respuestas y traductor de errores. |

## Endpoints

Todos con `Authorization` y `X-Empresa`, permiso `vender` (dueño, contador y cajero) y `Cache-Control: no-store`.

| Método y ruta | Qué hace | Respuestas |
| --- | --- | --- |
| `POST /clientes/busqueda` `{documento}` | Busca por el comienzo del documento y devuelve `{nit, clientes}`; `nit` trae el dígito de verificación si lo escrito es un NIT posible | 200, 400 `cliente.busqueda-invalida` (menos de 3 o con otros caracteres), 401, 403, 404 empresa ajena |
| `GET /clientes/consumidor-final` | El consumidor final de la DIAN (`id: null`, `esConsumidorFinal: true`) | 200 |
| `POST /clientes` `{id, tipoDocumento, numero, digitoVerificacion?, nombre, tipoDePersona, responsabilidadesFiscales?, responsableDeIva?, correo?, direccion?}` | Crea el comprador | 201 creado, 200 ya existía ese documento (o el mismo id), 400 datos (`nit.digito-invalido`, `cliente.consumidor-final`…), 409 `cliente.id-en-uso`, 429 `cliente.limite-diario` |

La búsqueda es un `POST` para que el documento de una persona no quede en la URL: los registros de acceso de
Render y Cloudflare y el historial del navegador guardan direcciones (Ley 1581).

## Reglas

- Un documento (tipo y número), un comprador por empresa. El mismo documento en otra empresa es otro comprador y
  ninguna ve el de la otra (RLS; llave `(empresa_id, id)`, así un id repetido tampoco delata a otra empresa).
- `conta_api` solo tiene `SELECT` e `INSERT`: editar y borrar (rectificación y supresión, Ley 1581) llegan con
  su historia. Las facturas copiarán los datos del comprador al emitirse (HU-06.01).
- La búsqueda no lista: pide 3 caracteres como mínimo y devuelve 10 como máximo.

## Para otros módulos

`index.ts` exporta `CatalogoModule`, `Cliente` y `CONSUMIDOR_FINAL`.
