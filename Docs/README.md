# Documentación de CONTA

Plataforma multiempresa de facturación electrónica DIAN y contabilidad para micronegocios en Colombia.

| Documento | Para qué sirve |
| --- | --- |
| [Plan del proyecto](Plan%20del%20proyecto%20plataforma%20de%20facturación%20electrónica%20y%20contabilidad.md) | Qué es el producto, para quién, modelo de negocio, fases y riesgos |
| [Arquitectura limpia](arquitectura/arquitectura-limpia.md) | Capas, reglas de dependencia, estructura de carpetas, patrones y pruebas |
| [Backlog](backlog/backlog.md) | Épicas, historias de usuario con criterios de aceptación y prioridades por fase |
| [Protocolo de encargos](forma-de-trabajo/protocolo-de-encargos.md) | Cómo el coordinador convierte cada pedido de Inge en un encargo de calidad para un agente |
| [Guía del coordinador](forma-de-trabajo/guia-del-coordinador.md) | Cómo se trabaja: Verbalized Sampling, roles de agentes, Definición de Hecho y revisiones |
| [Plantillas de prompts](forma-de-trabajo/plantillas-de-prompts.md) | Prompts listos para pedir y evaluar alternativas |
| [Flujo de ramas](forma-de-trabajo/flujo-de-ramas.md) | `main`, `develop`, ramas de trabajo, versiones y retención de artefactos |
| [Entorno de pruebas](despliegue/entorno-de-pruebas.md) | Carpetas `api/`, `web/` y `app/`, pruebas por PR con la API en Render, web y app en Cloudflare y Neon |
| [Decisiones (ADR)](decisiones/README.md) | Registro de decisiones de arquitectura con sus alternativas |
| [Prototipo del modo simple](producto/prototipo-modo-simple.md) | Las 5 pantallas del modo simple, los 3 flujos de venta y el guion de prueba con pilotos |

## Orden de lectura para alguien nuevo (persona o agente)

1. Plan del proyecto (resumen y alcance).
2. Arquitectura limpia.
3. Guía del coordinador, secciones 2, 3 y 7, y el protocolo de encargos.
4. Flujo de ramas.
5. La historia del backlog (y su issue) en la que va a trabajar.
