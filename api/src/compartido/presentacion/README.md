# compartido/presentacion

Filtros de error, guardas de rol y modo, interceptores de auditoría.

- `empresa/`: `GuardaDeEmpresa`, los decoradores `@EmpresaDeLaPeticion()` y `@Requiere(permiso)`, el puerto `RESOLUTOR_DE_EMPRESA` y la traducción de sus rechazos a HTTP. La implementación real, `ResolutorPorMembresia`, vive en el módulo de empresas, que exporta la guarda y el resolutor ([Multiempresa](../../../../Docs/arquitectura/multiempresa.md), [ADR-0011](../../../../Docs/decisiones/0011-pertenecer-a-varias-empresas.md)).
- La guarda niega por defecto: todo endpoint con `GuardaDeEmpresa` declara el permiso que pide con `@Requiere(Permiso.X)`. Un cajero que pide un permiso de su rol recibe 403 `permiso.denegado` («No tienes permiso»). Los permisos de cada rol están en `compartido/dominio/permisos` ([ADR-0012](../../../../Docs/decisiones/0012-roles-y-modos.md)).
