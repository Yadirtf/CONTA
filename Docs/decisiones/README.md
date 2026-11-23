# Registro de decisiones de arquitectura (ADR)

Cada decisión de nivel 3 (ver la [guía del coordinador](../forma-de-trabajo/guia-del-coordinador.md#2-cuándo-se-aplica)) queda en un archivo `NNNN-titulo-corto.md` en esta carpeta. Un ADR aceptado no se edita: si cambia la decisión, se crea uno nuevo que lo reemplaza y se marca el anterior como «Reemplazado por ADR-NNNN».

| ADR | Título | Estado |
| --- | --- | --- |
| [0001](0001-monolito-modular-con-arquitectura-limpia.md) | Monolito modular con arquitectura limpia | Aceptado |
| [0002](0002-entorno-de-pruebas-render-cloudflare-neon.md) | Entorno de pruebas: API NestJS en Render, web y app en Cloudflare, Neon | Aceptado |
| [0003](0003-drizzle-para-persistencia-y-migraciones.md) | Drizzle ORM y migraciones SQL versionadas para la API | Aceptado |
| [0004](0004-flutter-para-la-app-del-cliente.md) | Flutter para la app del cliente | Aceptado |
| [0005](0005-dinero-con-decimal-exacto-propio.md) | Dinero con un decimal exacto propio sobre bigint | Aceptado |
| [0006](0006-aislamiento-multiempresa-con-rls.md) | Aislamiento multiempresa: contexto explícito, RLS forzado y llaves con empresa_id | Aceptado |
| [0007](0007-firma-xades-con-xml-crypto.md) | Firma XAdES-EPES: xml-crypto, propiedades XAdES propias y node-forge para el .p12 | Aceptado |
| [0008](0008-envio-dian-con-cola-en-tabla-y-despertador.md) | Envío a la DIAN: agregado EnvioDian, cola en una tabla, despertador en proceso y recuperación por el Worker | Propuesto |

## Notas

Investigaciones y cotizaciones que preparan una decisión posterior. No son ADR.

| Nota | Historia | Qué decide después |
| --- | --- | --- |
| [Proveedor de respaldo](nota-proveedor-de-respaldo.md) | HU-02.04 | Proveedor y adaptador del puerto `ProveedorFacturacion` (HU-06.06) |
| [Prototipo del modo simple](../producto/prototipo-modo-simple.md) | HU-03.01 | Flujo de «factura en 3 toques» (HU-06.01), tras la prueba con el piloto |

## Plantilla

```markdown
# ADR-NNNN. <Título>

- Estado: Propuesto | Aceptado | Reemplazado por ADR-NNNN
- Fecha: AAAA-MM-DD
- Historia: HU-xx.yy
- Decide: Inge

## Contexto
<Problema, restricciones duras y solución obvia conocida.>

## Alternativas consideradas (Verbalized Sampling)
| # | Alternativa | Prob. verbalizada | Ronda | Puntaje ponderado |
| - | ----------- | ----------------- | ----- | ----------------- |

## Criterios y evaluación
<Tabla de criterios con pesos y calificación de las finalistas.>

## Decisión
<Qué se eligió, si es típica o de la cola, y qué se combinó.>

## Descartes relevantes
<Qué alternativa de la cola se descartó y por qué.>

## Consecuencias
<Qué se gana, qué se pierde, qué habría que hacer para revertirla.>
```
