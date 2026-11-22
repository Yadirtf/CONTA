# Registro de decisiones de arquitectura (ADR)

Cada decisión de nivel 3 (ver la [guía del coordinador](../forma-de-trabajo/guia-del-coordinador.md#2-cuándo-se-aplica)) queda en un archivo `NNNN-titulo-corto.md` en esta carpeta. Un ADR aceptado no se edita: si cambia la decisión, se crea uno nuevo que lo reemplaza y se marca el anterior como «Reemplazado por ADR-NNNN».

| ADR | Título | Estado |
| --- | --- | --- |
| [0001](0001-monolito-modular-con-arquitectura-limpia.md) | Monolito modular con arquitectura limpia | Aceptado |

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
