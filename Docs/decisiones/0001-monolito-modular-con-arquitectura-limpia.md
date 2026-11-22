# ADR-0001. Monolito modular con arquitectura limpia

- Estado: Aceptado
- Fecha: 2026-11-22
- Historia: HU-01.01
- Decide: Inge (tomado del plan del proyecto del 18 de noviembre de 2026)

## Contexto
Una persona construye y opera la plataforma. El backend debe aislar las reglas fiscales y contables de la DIAN, Wompi y la base de datos, poder cambiar de proveedor de facturación y probarse sin internet. Solución obvia conocida: un backend en capas clásico (controlador, servicio, repositorio) sin fronteras entre módulos.

## Alternativas consideradas (Verbalized Sampling)
Registro retroactivo: el plan ya traía la decisión. Las probabilidades y puntajes son ilustrativos, para que el formato sirva de ejemplo; los ADR nuevos deben usar los valores reales del proceso.

| # | Alternativa | Prob. verbalizada | Ronda | Puntaje ponderado |
| - | ----------- | ----------------- | ----- | ----------------- |
| 1 | Backend en capas clásico sin módulos | 0,40 | completa | 2,9 |
| 2 | Monolito modular con arquitectura limpia (puertos y adaptadores por módulo) | 0,30 | completa | 4,3 |
| 3 | Microservicios por dominio desde el inicio | 0,15 | completa | 2,2 |
| 4 | Monolito modular + núcleo fiscal como librería pura reutilizable por app y backend | 0,08 | cola | 3,8 |
| 5 | Backend sin servidor (funciones) con colas administradas | 0,07 | cola | 2,6 |

## Criterios y evaluación
Criterios de «Diseño y arquitectura» de la guía. La 2 gana por simplicidad de despliegue y facilidad de prueba; la 3 pierde por complejidad para una persona; la 4 aporta una idea útil.

## Decisión
Alternativa 2. De la 4 se toma la idea de mantener el dominio de facturación sin dependencias, para poder extraerlo como paquete si la app lo necesita para calcular totales sin internet.

## Descartes relevantes
La 5 (sin servidor) se descarta porque la firma XAdES y las colas de reintento con la DIAN requieren procesos de vida larga y control fino de tiempos.

## Consecuencias
Un solo despliegue y una sola base de datos. Las fronteras entre módulos se protegen con reglas de dependencia en CI (HU-01.02). Separar un módulo en servicio requiere un ADR nuevo con datos de carga.
