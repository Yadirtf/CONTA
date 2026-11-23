# ADR-0005. Dinero con un decimal exacto propio sobre bigint

- Estado: Aceptado
- Fecha: 2026-11-23
- Historia: HU-01.04
- Decide: Inge

## Contexto

CONTA calcula facturas, impuestos y asientos que deben cuadrar con la DIAN al centavo. El anexo técnico 1.9 de la factura electrónica (Resolución 000165 de 2023) fija:

- **Redondeo mitad al par** (sección 5.2.1, nota 2): «la fórmula de redondeo utilizada en estos momentos es la round-half-to-even», según la NTC 3711.
- **Tolerancia de ±2.00** en los valores monetarios (sección 5.2.1.1) y de **±$5** para el IVA aproximado al múltiplo de $10 (sección 5.2.1.2).
- Hasta **6 decimales** en el formato numérico (sección 5.5, tablas 4 y 5).
- `PayableRoundingAmount` informa la diferencia de redondeo; es el único monto que puede ser negativo (sección 5.2.3.1).

Restricciones duras: el dominio no importa paquetes npm ni módulos de Node (lo revisa dependency-cruiser en CI); nunca `float` ni `double` para dinero; ningún resultado intermedio pierde precisión en silencio.

Solución obvia conocida: guardar centavos en enteros con escala fija de 2 decimales.

## Alternativas consideradas (Verbalized Sampling)

Generó: el agente implementador. Evaluó: otro agente, sin haber generado las alternativas, con los criterios de diseño y arquitectura de la guía (sección 4).

| # | Alternativa | Prob. verbalizada | Ronda | Puntaje ponderado | Resultado |
| - | ----------- | ----------------- | ----- | ----------------- | --------- |
| 1 | `bigint` en centavos, escala fija 2; multiplicar redondea a 2 | 0,40 | completa | — | Descartada: pierde los 6 decimales de precio y cantidad y redondea cada producto intermedio |
| 2 | Decimal exacto propio (`bigint` + escala variable) + moneda | 0,25 | completa | 4,30 | **Elegida**, combinada con la 7 |
| 3 | `decimal.js` o `big.js` dentro del dominio | 0,20 | completa | — | Descartada: paquete npm en el dominio |
| 4 | `number` en centavos con `Math.round` | 0,10 | completa | — | Descartada: es `double` y `Math.round` no redondea al par |
| 5 | Aritmética en PostgreSQL `numeric` | 0,05 | completa | — | Descartada: el dominio no se puede probar sin base de datos |
| 6 | Racional exacto (numerador/denominador `bigint`) | 0,06 | cola | 3,40 | Viable, inferior: no corresponde a `numeric` y sus denominadores crecen |
| 7 | Escala fija alta: micro-unidades (6 decimales) en `bigint` | 0,08 | cola | 4,10 | Se combina con la 2: tope de 6 decimales en las entradas |
| 8 | Aritmética decimal sobre texto | 0,03 | cola | — | Descartada: igual que la 2, pero más lenta y frágil |
| 9 | Dinero perezoso (árbol de operaciones) | 0,02 | cola | 2,15 | Descartada: difícil de depurar y memoria sin límite |
| 10 | Tipo marcado sobre `bigint` de centavos | 0,07 | cola | — | Descartada: igual que la 1 |

## Criterios y evaluación

| Criterio | Peso | #2 | #7 | #6 | #9 |
| --- | --- | --- | --- | --- | --- |
| Facilidad de cambiar la tecnología después | 25 % | 5 | 4 | 3 | 2 |
| Simplicidad para una persona | 25 % | 4 | 3 | 3 | 1 |
| Probar sin red ni base de datos | 20 % | 5 | 5 | 5 | 4 |
| Costo operativo por cliente | 15 % | 4 | 5 | 3 | 2 |
| Tiempo para tenerla funcionando | 15 % | 3 | 4 | 3 | 2 |

## Decisión

`DecimalExacto` (coeficiente `bigint` × 10^-escala) y `Dinero` (DecimalExacto + moneda) en `api/src/compartido/dominio/dinero/`, en TypeScript puro:

- Suma, resta, multiplicación y porcentaje son exactos y **no redondean**.
- La división y el redondeo piden escala y modo explícitos; el modo por defecto es `mitad-al-par` (`REDONDEO_DIAN`).
- `Dinero.de` acepta texto o `bigint`, nunca `number`, y como máximo 6 decimales (de la alternativa 7).
- Nunca se mezclan monedas: operar COP con USD lanza `ErrorDominio('dinero.monedas-distintas')`.
- `repartir` divide un monto sin perder ni crear centavos (mayor residuo); `redondearAMultiplo` aproxima el IVA a $10; `diferenciaDentroDe` aplica las tolerancias de la DIAN.
- La escala variable corresponde a `numeric(p, s)` de PostgreSQL. Los montos se guardan en `numeric` y viajan como texto en JSON.

Es la alternativa típica de la ronda completa, combinada con una de la cola.

## Descartes relevantes

De la cola se descarta el Dinero perezoso (9): retrasa el error hasta el final, cuesta memoria por cliente y es demasiada complejidad para una persona. El racional exacto (6) es correcto, pero no corresponde a `numeric` y obliga a calcular MCD.

## Consecuencias

- Se gana exactitud demostrada con pruebas de propiedad y ninguna dependencia nueva en el dominio.
- Se asume mantener unas 300 líneas de aritmética propia, cubiertas por pruebas de ejemplo, de propiedad y de rendimiento (10 000 líneas con IVA en menos de 1 segundo).
- Riesgo de doble redondeo: cada módulo decide en qué momento redondear (por línea o por total). La prueba de propiedad demuestra que redondear por línea queda dentro de ±2.00 hasta 400 líneas; las facturas más largas deben redondear al total o informar `PayableRoundingAmount`.
- Una regla de ESLint prohíbe en el dominio los decimales en `number`, `parseFloat`, `toFixed` y `Math.round/floor/ceil/trunc`.
- Para revertir: `Dinero` es la única puerta; se puede cambiar el interior por una librería con un ADR que permita la dependencia, sin tocar a quien lo usa.
