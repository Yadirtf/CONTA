# compartido/presentacion

Filtros de error, guardas de rol y modo, interceptores de auditoría.

- `empresa/`: `GuardaDeEmpresa`, el decorador `@EmpresaDeLaPeticion()`, el puerto `RESOLUTOR_DE_EMPRESA` y la traducción de sus rechazos a HTTP. La implementación real, `ResolutorPorMembresia`, vive en el módulo de empresas, que exporta la guarda y el resolutor ([Multiempresa](../../../../Docs/arquitectura/multiempresa.md), [ADR-0011](../../../../Docs/decisiones/0011-pertenecer-a-varias-empresas.md)).
