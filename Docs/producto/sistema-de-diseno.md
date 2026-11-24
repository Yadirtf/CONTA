# Sistema de diseño de CONTA

- Historia: HU-03.03 **[VS]**. Decisión y alternativas en [ADR-0009](../decisiones/0009-sistema-visual-y-tokens-compartidos.md).
- Fuente de los valores: [`contratos/diseno/tokens.json`](../../contratos/diseno/tokens.json). Esta guía explica **cómo** se usan; los números viven solo allí.
- Vista de la paleta aplicada a Hoy, Vender y Listo: [Paleta Calma fresca](https://claude.ai/artifact/2MRvWCcsHGia5mwK1faSQe) (privada mientras Inge no la comparta).

## 1. La idea en una frase

**Calma fresca:** pantallas claras que respiran (60 %), una estructura petróleo que da confianza (30 %) y un solo índigo para lo que toca hacer ahora (10 %). El dinero se ve grande y ordenado; los estados se dicen con ícono, palabra y color, nunca con color solo.

## 2. Color

### 2.1 Los 3 colores de marca y su proporción

| Papel | Token | Proporción | Dónde va | Dónde **no** va |
| --- | --- | --- | --- | --- |
| Fondo blanco frío | `fondo`, `superficie`, `tarjeta`, `borde` | 60 % | Fondo de pantalla, tarjetas, filas de tabla, hojas inferiores | — |
| Petróleo | `estructura`, `sobreEstructura` | 30 % | Barra superior, navegación, cabeceras de tabla, el total del día en Hoy, títulos de sección | Nunca un botón de acento encima: en la barra petróleo va un botón blanco con texto petróleo |
| Índigo | `acento`, `sobreAcento`, `foco` | 10 % | El botón principal de la pantalla («Cobrar $total», «Vender», «Empieza gratis»), el elemento seleccionado, el anillo de foco | Textos largos, íconos decorativos, estados, gráficos |

**Regla del 10 %:** una sola acción en índigo por pantalla (ley de Hick). Las demás acciones van como botón de contorno (`bordeControl`) o como enlace.

### 2.2 Texto

- `texto` para todo lo que se lee; `textoSuave` para ayudas y fechas. Ambos superan 5,8:1 en las tres superficies, también al sol.
- No hay gris más claro que `textoSuave`. Un texto que no se lee no se pone.

### 2.3 Estados (aparte de la marca)

| Estado | Token | Palabras de la calle | Ícono |
| --- | --- | --- | --- |
| Éxito | `exito` + `exitoFondo` | «Aprobada», «Entró», «Guardada» | círculo con chulo |
| Error | `error` + `errorFondo` | «Rechazada: falta la cédula del cliente» | octágono con equis |
| Advertencia | `advertencia` + `advertenciaFondo` | «Te quedan 20 números de factura» | triángulo con «!» |
| Pendiente | `pendiente` + `pendienteFondo` | «Se envía sola cuando vuelva la señal» | reloj o nube con flecha |

Reglas:
1. Un estado es **etiqueta o franja** (fondo suave, texto e ícono del estado). Nunca un botón relleno, para que no compita con el índigo.
2. **Ícono + palabra + color**, siempre los tres. Con daltonismo los fondos suaves se confunden entre sí.
3. El rojo aparece solo cuando el usuario tiene algo que resolver, y siempre con el botón que lo resuelve al lado («Corregir y hacerla de nuevo»). Sin señal **no es error**: es pendiente.
4. El envío a la DIAN se muestra como línea de 3 pasos: Guardada ✓ → Enviando… → Aprobada ✓. Sin señal nunca dice «aprobada».

### 2.4 Modo claro y oscuro

- Claro por defecto (se ve mejor al sol). El oscuro sigue al sistema y se puede fijar con `data-tema="oscuro"` en web o `ThemeMode` en Flutter.
- Los nombres de los tokens dicen el papel (`acento`), no el tono (`indigo`), así un componente funciona igual en los dos modos.

## 3. Tipografía

| Superficie | Familia | Por qué |
| --- | --- | --- |
| App | Roboto (la del sistema Android) | Cero descarga en gama baja |
| Sitio y consola | Inter, con respaldo Roboto/sistema | Altura x grande, legible en pantallas pequeñas, cifras tabulares |

- **Montos siempre con cifras tabulares** (`font-variant-numeric: tabular-nums` en web; `FontFeature.tabularFigures()` en Flutter) y alineados a la derecha en tablas.
- Escala (`tamano*` en CSS, `TextoConta` en Dart): etiqueta 13, pequeño 15, cuerpo 17, subtítulo 20, título 24, monto 28, total 36. En el modo simple, nada por debajo de 15 salvo etiquetas de 13 con contraste ≥ 4,5:1.
- Pesos: 400 para leer, 600 para botones y montos, 700 solo para el total.
- La carga de Inter en web (subconjunto latino, `display: swap`) se hace con la primera pantalla real del sitio; mientras tanto se usa el respaldo del sistema.

## 4. Espacio, forma y movimiento

- **Espaciado** en múltiplos de 4: 4, 8, 12, 16, 24, 32, 48, 64. App: margen lateral 16, entre tarjetas 12, entre secciones 24 a 32.
- **Alturas:** toque mínimo 48, botón principal 56 (a lo ancho, abajo), mosaico de producto 72, fila de tabla 40 en la consola. Al menos 8 entre objetivos táctiles.
- **Radios:** consola 6 (densa y seria), campos 8, botones 12, tarjetas 16, hojas inferiores 20, etiquetas de estado en píldora.
- **Movimiento:** 120 ms para respuesta a un toque, 200 ms para cambios de estado, 320 ms para hojas que suben. Curva `cubic-bezier(0.2, 0, 0, 1)`: arranca rápido y se posa suave, que es lo «fluido». Si el sistema pide menos movimiento, se quita.
- **Foco:** anillo de 2 px en `foco`, separado 2 px del componente (sobre el propio acento el foco no se vería).

## 5. Principios anti-fricción por superficie

### App (modo simple)
1. **Una acción índigo por pantalla, abajo y a lo ancho** (Hick y Fitts, uso con una mano). Nada crítico en las esquinas de arriba.
2. **El total siempre visible y grande** en la barra de cobro. Saber cuánto es quita la ansiedad por el dinero.
3. **Respuesta en menos de 100 ms a cada toque:** vibración corta, el contador del producto cambia, el total se mueve. Un toque sin respuesta provoca dobles toques y ventas duplicadas.
4. **«Guardada» de inmediato,** sin esperar a la DIAN. Lo primero que el dueño necesita saber es que la venta no se perdió.
5. **Deshacer en lugar de preguntar** en lo que se puede deshacer; resumen corto solo antes de lo definitivo.
6. **Medios de pago como botones grandes** con ícono y nombre de la calle; en efectivo, las vueltas en grande.
7. **Contraste pensado para el sol:** texto ≥ 7:1 donde se pueda, nunca información solo por color.
8. **Palabras de la calle** en todo texto ([prototipo](prototipo-modo-simple.md#1-para-quién-y-para-qué)).

### Sitio web
1. Un solo llamado índigo por pantalla («Empieza gratis»); lo demás, contorno o enlace.
2. Precio en pesos claros, «todo incluido», máximo 3 planes con uno recomendado.
3. Quitar el miedo a la DIAN de frente: «¿Y si me rechazan? Te decimos qué arreglar, en palabras simples».
4. Capturas de la app real y tenderos reales (con permiso), no ilustraciones abstractas.
5. Liviano para datos móviles: menos de 1 MB al primer pintado, fuentes en subconjunto.
6. Registro de 3 campos como máximo; el resto, después.

### Consola (administración)
1. El color en tablas se reserva para el estado; todo lo demás, neutro. Si todo tiene color, nada resalta.
2. Estados como etiqueta con ícono en una columna fija, filtrables, con conteo arriba («12 rechazadas»).
3. Alertas por prioridad, no por llegada: habilitación DIAN y certificados primero, rechazos después, informativo al final.
4. Montos en cifras tabulares, alineados a la derecha; identificadores (CUFE, NIT) en monoespaciada.
5. Acciones en lote con resumen previo («Reintentar 8 envíos») y el registro de intentos visible por documento.
6. Documentos DIAN y asientos en solo lectura, con candado y «se corrige con nota crédito».
7. Búsqueda global por NIT, número o negocio, y atajos de teclado para lo repetitivo.

## 6. Cómo se usa en el código

| Dónde | Qué se usa |
| --- | --- |
| `app/` | Se importa solo `lib/nucleo/tema/tema_conta.dart`. Da `TemaConta.claro` / `TemaConta.oscuro`, el color del modo activo con `context.paleta.<papel>` (por ejemplo `context.paleta.errorFondo`) y las medidas `EspacioConta`, `RadioConta`, `AlturaConta` y `TextoConta`. Los componentes compartidos viven en `lib/nucleo/componentes/` |
| `web/sitio` y `web/consola` | Variables `--conta-color-*`, `--conta-espacio-*`, `--conta-radio-*`, `--conta-altura-*`, `--conta-tamano-*`, `--conta-duracion-*`, `--conta-curva`, `--conta-fuente` de `src/compartido/estilos/tokens.css`, importado en `globals.css` |

**Para cambiar un valor:**
1. Edita `contratos/diseno/tokens.json` (y, si es un color nuevo, agrega sus pares en `contrastes`).
2. Corre `node herramientas/diseno/tokens.mjs` desde la raíz.
3. Sube los archivos generados en el mismo PR. El job `tokens` de CI falla si un contraste no llega a AA o si algo quedó sin generar.

Nunca se escribe un hex suelto en un componente: si falta un papel, se agrega como token.

**Lo vigila CI.** `node herramientas/diseno/revisar-estilos.mjs` falla si, fuera del módulo de tema, aparece a mano:
- un color (`Color(0x…)`, `Colors.*`, `#hex`, `rgb()`, `hsl()` o un nombre como `white`);
- un espacio (`EdgeInsets` o `SizedBox` con número; `padding` o `margin` en px o rem);
- un radio o un tamaño de letra.

El módulo de tema es `app/lib/nucleo/tema/` y `web/*/src/compartido/estilos/`. Se corre en el job `tokens` de *CI repositorio*. Una excepción de verdad (el logo de un banco, por ejemplo) se marca en la misma línea con `// estilo-permitido: <motivo>`.
