# modulos/empresas

Empresas clientes de CONTA y quién pertenece a cada una (HU-01.05, HU-04.02, [ADR-0011](../../../../Docs/decisiones/0011-pertenecer-a-varias-empresas.md)). Además, el módulo decide en qué empresa corre cada petición.

## Qué hay

| Capa | Contenido |
| --- | --- |
| `dominio/` | `Empresa` (razón social de 1 a 450 caracteres), `Membresia` y el tope de 50 empresas por persona (`limite-de-empresas.ts`). |
| `aplicacion/` | Comando `CrearEmpresa` (empresa más membresía de quien la crea, en una sola transacción). Consultas `ObtenerEmpresa`, `ListarMisEmpresas` (transacción del usuario) y `ComprobarMembresia` (transacción de la empresa elegida). |
| `infraestructura/persistencia/` | Repositorios sobre `conta.empresas` y `conta.membresias` (migración `0004_membresias.sql`). Ninguno filtra a mano por empresa ni por usuario: lo hace RLS. |
| `presentacion/http/` | `MisEmpresasController` (`GET` y `POST /empresas`, solo con sesión), `EmpresasController` (`GET /empresas/:id`, dentro de una empresa) y `ResolutorPorMembresia`, que implementa `RESOLUTOR_DE_EMPRESA`. |

## Endpoints

| Método y ruta | Encabezados | Qué hace | Respuestas |
| --- | --- | --- | --- |
| `GET /empresas` | `Authorization` | Empresas de la persona, por razón social | 200, 401 |
| `POST /empresas` `{razonSocial}` | `Authorization` | Crea una empresa y hace miembro a quien la crea | 201, 400, 401, 409 al llegar a 50 |
| `GET /empresas/:id` | `Authorization`, `X-Empresa` | Datos de la empresa elegida | 200, 400 sin `X-Empresa`, 401, 404 ajena o inexistente |

## Para otros módulos

Un endpoint con datos de una empresa usa `@UseGuards(GuardaDeEmpresa)` y `@EmpresaDeLaPeticion()` (de `compartido/presentacion/empresa`), y su módulo importa `EmpresasModule`, que exporta la guarda y el resolutor. El cliente manda `X-Empresa` en cada petición. No se guarda una «empresa activa» en el servidor.
