# modulos/empresas

Empresas clientes de CONTA, quién pertenece a cada una y con qué rol y modo (HU-01.05, HU-04.02, HU-04.03; [ADR-0011](../../../../Docs/decisiones/0011-pertenecer-a-varias-empresas.md) y [ADR-0012](../../../../Docs/decisiones/0012-roles-y-modos.md)). Además, el módulo decide en qué empresa y con qué rol corre cada petición.

## Qué hay

| Capa | Contenido |
| --- | --- |
| `dominio/` | `Empresa` (razón social de 1 a 450 caracteres) y el tope de 50 empresas por persona (`limite-de-empresas.ts`). `Membresia`: rol, modo y ciclo de vida (invitada → activa → retirada). `reglas-de-gestion.ts`: nadie cambia su propio rol, siempre queda un dueño, una membresía vigente por persona. `limites-de-miembros.ts`: 30 personas por empresa y 10 invitaciones al día. Los roles, los permisos y los modos están en `compartido/dominio/permisos/`. |
| `aplicacion/` | Comandos `CrearEmpresa` (empresa más su dueño), `InvitarMiembro`, `CambiarMembresia`, `RetirarMiembro` y `ResponderInvitacion`. `autorizar-gestion.ts` bloquea los dueños, vuelve a leer a quien actúa y exige el permiso dentro de la transacción. Consultas `ObtenerEmpresa`, `ListarMisEmpresas` (transacción del usuario), `ListarMiembros` y `ComprobarMembresia` (da el `ContextoDeMiembro` con el rol). Puerto `DirectorioDePersonas`. |
| `infraestructura/persistencia/` | Repositorios sobre `conta.empresas` y `conta.membresias` (migraciones `0004_membresias.sql` y `0005_roles_y_modos.sql`). Ninguno filtra a mano por empresa ni por usuario: lo hace RLS. |
| `infraestructura/identidad/` | `DirectorioConIdentidad`: registra personas y lee sus celulares enmascarados con la API pública del módulo de identidad. |
| `presentacion/http/` | `MisEmpresasController` (`GET` y `POST /empresas`), `InvitacionesController` (aceptar o rechazar), `EmpresasController` (`GET /empresas/:id`), `MiembrosController` (`/miembros`) y `ResolutorPorMembresia`, que implementa `RESOLUTOR_DE_EMPRESA`. |

## Endpoints

| Método y ruta | Encabezados | Permiso | Qué hace | Respuestas |
| --- | --- | --- | --- | --- |
| `GET /empresas` | `Authorization` | — | Empresas de la persona con `rol`, `modo`, `estado` y `permisos` | 200, 401 |
| `POST /empresas` `{razonSocial}` | `Authorization` | — | Crea una empresa; quien la crea queda como dueño | 201, 400, 401, 409 al llegar a 50 |
| `POST /empresas/:id/invitacion/aceptar` y `/rechazar` | `Authorization` | — | Responde una invitación pendiente | 204, 401, 404 |
| `GET /empresas/:id` | `Authorization`, `X-Empresa` | `ver-empresa` | Datos de la empresa elegida | 200, 400 sin `X-Empresa`, 401, 404 ajena o inexistente |
| `GET /miembros` | `Authorization`, `X-Empresa` | `gestionar-miembros` | Personas invitadas y activas, con el celular enmascarado | 200, 403 |
| `POST /miembros` `{celular, rol, modo?}` | `Authorization`, `X-Empresa` | `gestionar-miembros` | Invita por celular | 201, 400, 403, 409 repetida o tope, 429 tope del día |
| `PATCH /miembros/:usuarioId` `{rol?, modo?}` | `Authorization`, `X-Empresa` | `gestionar-miembros` | Cambia el rol o el modo | 200, 400, 403, 404, 409 propio rol o último dueño |
| `DELETE /miembros/:usuarioId` | `Authorization`, `X-Empresa` | `ver-empresa` si es uno mismo; si no, `gestionar-miembros` | Retira sin borrar | 204, 403, 404, 409 último dueño |

Sin el permiso, la respuesta es 403 `{codigo: 'permiso.denegado', mensaje: 'No tienes permiso'}`.

## Para otros módulos

Un endpoint con datos de una empresa usa `@UseGuards(GuardaDeEmpresa)`, declara su permiso con `@Requiere(Permiso.X)` y recibe `@EmpresaDeLaPeticion()` (todo de `compartido/presentacion/empresa`). Su módulo importa `EmpresasModule`, que exporta la guarda y el resolutor. Sin `@Requiere`, la guarda niega la petición. Un caso de uso que cambia algo sensible vuelve a exigir el permiso con `exigirPermiso` de `compartido/dominio`. El cliente manda `X-Empresa` en cada petición. No se guarda una «empresa activa» en el servidor.
