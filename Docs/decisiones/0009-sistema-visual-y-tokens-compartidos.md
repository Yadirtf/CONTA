# ADR-0009. Sistema visual «Calma fresca» y tokens de diseño compartidos en `contratos/diseno/`

- Estado: Propuesto
- Fecha: 2026-11-23
- Historia: HU-03.03 **[VS]**
- Decide: Inge
- Guía de uso: [sistema de diseño](../producto/sistema-de-diseno.md)

## Contexto

Las pantallas desplegadas son placeholders y cada aplicación tenía sus propios colores sueltos (`globals.css` de `web/` y un `colorSchemeSeed` verde en `app/`). Antes de programar el modo simple (HU-06.01) hace falta un sistema visual común para la app Flutter, el sitio y la consola.

Inge pidió **3 colores elegidos por psicología del color** para facturación, con la proporción **60/30/10** (60 % dominante, 30 % estructura, 10 % acento), un sistema **fresco y fluido**, que quite fricción y no genere ansiedad con el dinero ni con la DIAN.

**Restricciones duras:**
- Contraste WCAG AA: texto 4,5:1; componentes y texto grande 3:1, incluido el botón de acento contra su fondo.
- El acento se distingue de todos los colores de estado, también con deuteranopía y protanopía.
- Los colores de estado (éxito, error, advertencia, pendiente) van aparte de los 3 de marca.
- Modo claro y oscuro.
- El rojo no es color de marca: en dinero significa pérdida o rechazo de la DIAN.
- `app/` y `web/` no importan código entre sí: los valores se comparten como datos, igual que `contratos/openapi.yaml`.

**Solución obvia conocida:** azul corporativo, blanco y verde dinero como acento.

## Alternativas consideradas (Verbalized Sampling)

Un agente con rol de experto en UI y psicología del color generó dos rondas de 5 (completa y de cola, con probabilidad menor a 0,10). Otro agente, que no las generó, las evaluó: calculó los contrastes WCAG 2.x, simuló daltonismo con las matrices de Machado (2009) y midió la distancia de color ΔE00 en visión normal, deuteranopía y protanopía.

| # | Alternativa (60 · 30 · 10) | Prob. | Ronda | Puntaje | Resultado |
| - | -------------------------- | ----- | ----- | ------- | --------- |
| 3 | **Calma fresca**: blanco frío · petróleo · índigo | 0,15 | Completa | **4,15** | **Elegida**, ajustada y combinada con la 2 |
| 2 | Silencio neutral: gris claro · grafito · azul | 0,20 | Completa | 3,90 | Se combina con la 3 (fondo neutro, tarjetas blancas, bordes) |
| 4 | Dinero en calma: salvia · esmeralda · azul | 0,12 | Completa | 3,85 | Descartada: la estructura verde choca con el éxito (ΔE ≈ 10) |
| 7 | Tienda cafetera: crema · café · azul petróleo | 0,05 | Cola | 3,75 | Descartada: el café no se ve fresco y en LCD barata se ve sucio; acento cerca del pendiente (ΔE ≈ 12) |
| 9 | Serenidad ciruela: lavanda · ciruela · violeta | 0,03 | Cola | 3,45 | Descartada: le falta la asociación con dinero; el acento choca con el pendiente en modo oscuro |
| 6 | Tinta y papel: blanco · piedra · negro | 0,06 | Cola | 3,40 | Descartada: el acento es el mismo color del texto, no hay 10 % de acción |
| 1 | Banco de confianza: blanco · azul · verde (la obvia) | 0,38 | Completa | 3,15 | **Viola una regla dura**: el botón verde se confunde con «aprobada» (ΔE 13 a 17) y con el error en deuteranopía |
| 10 | Noche tranquila: oscuro por defecto · pizarra · pervinca | 0,02 | Cola | 3,15 | Casi duplicado de la 2; el oscuro por defecto se ve mal al sol |
| 8 | Cielo despejado: celeste · océano · cian | 0,04 | Cola | 3,10 | **Viola una regla dura**: el cian sobre fondo claro da 2,35:1 |
| 5 | Optimismo de barrio: blanco · índigo noche · girasol | 0,08 | Completa | 2,35 | **Viola una regla dura**: amarillo sobre blanco 1,56:1 y en oscuro igual a la advertencia |

## Criterios y evaluación

Pesos adaptados de la dimensión de experiencia de usuario de la [guía del coordinador](../forma-de-trabajo/guia-del-coordinador.md#4-criterios-de-evaluación-por-dimensión):

| Criterio | Peso | 3 · Calma fresca | 2 · Silencio neutral | 4 · Dinero en calma |
| --- | --- | --- | --- | --- |
| Confianza y «dinero en orden» sin ansiedad | 25 % | 4 | 4 | 4 |
| Claridad de la acción y separación acento/estados (con daltonismo) | 20 % | 4 | 3 | 3 |
| WCAG AA en claro y oscuro, legible al sol | 20 % | 4 | 5 | 5 |
| Frescura y diferencia frente a bancos y software contable | 15 % | 5 | 2 | 3 |
| Sirve a app, sitio y consola densa | 10 % | 4 | 5 | 4 |
| Simplicidad de mantener | 10 % | 4 | 5 | 4 |
| **Ponderado** | | **4,15** | 3,90 | 3,85 |

## Decisión

Se elige **«Calma fresca»** (alternativa 3, de la ronda completa, no la típica), combinada con la disciplina neutra de la 2:

| Papel | Proporción | Claro | Oscuro | Por qué (psicología) |
| --- | --- | --- | --- | --- |
| **Fondo blanco frío** (fondo, superficie, tarjeta) | 60 % | `#F5F8F9` · `#EAF1F3` · `#FFFFFF` | `#0D171B` · `#13222A` · `#182A33` | Aire y orden: la pantalla «respira», baja la carga cognitiva y deja que el dinero y la acción resalten. |
| **Petróleo** (estructura: barra superior, navegación, cabeceras, totales) | 30 % | `#0C4A5E` | `#1B3E4A` | Entre la calma del azul y el «crecimiento» del verde: confianza institucional sin la frialdad de un banco; se lee fresco, como agua. |
| **Índigo** (acento: «Cobrar $total», «Vender», el botón principal) | 10 % | `#4F46E5` | `#8C93FF` | Vibrante pero frío: invita a actuar sin la urgencia del rojo o el naranja. Queda lejos de todos los estados, así nunca parece «aprobada» ni «rechazada». |

**Ajustes del evaluador sobre la propuesta original:**
- La estructura pasa de `#0F5257` a `#0C4A5E`, para alejarla del verde azulado de «aprobada».
- El fondo deja de ser menta, para no confundirse con el fondo de éxito.
- El error pasa de `#B71C1C` a carmesí `#A3123A`: con deuteranopía el rojo puro y el ámbar de advertencia se veían casi iguales (ΔE 3,1 → 9,5).
- El pendiente pasa a `#54647C` / `#949CB0` para separarlo del éxito con deuteranopía.

**Colores de estado, aparte de la marca** (texto o ícono · fondo suave):

| Estado | Claro | Oscuro | Ícono obligatorio |
| --- | --- | --- | --- |
| Éxito («aprobada», «entró») | `#00695C` · `#E3F4EF` | `#2DD4BF` · `#0F2E2B` | círculo con chulo |
| Error («rechazada») | `#A3123A` · `#FCEBEF` | `#FF7A8A` · `#3A1419` | octágono con equis |
| Advertencia (plazo, rango por agotarse) | `#8A4B00` · `#FFF3DC` | `#FBBF24` · `#33270B` | triángulo con «!» |
| Pendiente («se envía sola cuando vuelva la señal») | `#54647C` · `#EEF1F5` | `#949CB0` · `#20262E` | reloj o nube con flecha |

Los estados se pintan siempre como **etiqueta o franja con ícono y texto**, nunca como botón relleno. Con daltonismo los fondos suaves se confunden entre sí, así que el color nunca va solo.

**Tokens compartidos.** La fuente única es [`contratos/diseno/tokens.json`](../../contratos/diseno/tokens.json). El generador [`herramientas/diseno/tokens.mjs`](../../herramientas/diseno/tokens.mjs), sin dependencias, escribe:
- `app/lib/nucleo/tema/tokens_conta.g.dart` (constantes Dart), que usa `app/lib/nucleo/tema/tema_conta.dart` para armar el `ThemeData`;
- `web/sitio/src/compartido/estilos/tokens.css` y `web/consola/src/compartido/estilos/tokens.css` (variables `--conta-*`, con modo oscuro por sistema y por `data-tema`).

Los archivos generados se versionan, así cada aplicación compila sola sin leer fuera de su carpeta. `tokens.json` declara los pares de contraste que deben cumplirse, y el job `tokens` de [`ci-repositorio.yml`](../../.github/workflows/ci-repositorio.yml) falla si un par no llega a su mínimo AA en claro u oscuro, o si un archivo generado quedó desactualizado.

## Descartes relevantes

- **La obvia (1) se descarta por una regla dura**, no por gusto: un botón «Cobrar» verde se parece a «aprobada», y el dueño puede creer que la venta ya llegó a la DIAN.
- **De la cola**, la mejor fue «Tienda cafetera» (7, 3,75). Se descarta porque el café se ve apagado en pantallas baratas y no es «fresco», pero su idea de fondo cálido tipo papel queda como referencia para fotografías del sitio de venta.
- «Cielo despejado» (8) y «Optimismo de barrio» (5) no cumplen el contraste del botón; arreglarlas las convierte en otras propuestas.

## Consecuencias

- **Se gana:** una sola fuente de colores, espacios, tipografía y movimiento para las tres superficies; contraste AA comprobado en cada PR; estados que no se confunden con la marca ni con daltonismo.
- **Se pierde:** `contratos/` ya no comparte solo `openapi.yaml`; también `diseno/tokens.json`. Son datos, no código, así que la regla «ninguna aplicación importa código de otra» sigue en pie.
- **Queda débil:** acento contra pendiente (ΔE ≈ 15) y éxito contra pendiente con deuteranopía (ΔE ≈ 10). Se cubre con la regla de forma (el acento es botón relleno; los estados son etiquetas con ícono).
- **Para revertir:** se cambian los valores en `tokens.json` y se regenera; nada de la lógica depende del tono. Cambiar de esquema (por ejemplo, otro generador) solo toca `herramientas/diseno/`.
- **Pendiente de validar con pilotos (HU-03.02):** cómo se ve al sol en un Android de gama baja real y si el índigo se entiende como «la acción».
