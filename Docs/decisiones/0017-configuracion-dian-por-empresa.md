# ADR-0017. Configuración DIAN por empresa en facturación, con secretos de solo escritura y resoluciones que solo se agregan

- Estado: Propuesto
- Fecha: 2026-11-28
- Historia: HU-07.04
- Decide: Inge

## Contexto

Hasta HU-06.02, el software, el PIN, el TestSetId y el fabricante del POS salían de las variables `DIAN_HAB_*`, para **una sola** empresa. Los datos fiscales y las resoluciones se cargaban con `npm run facturacion:configurar`. HU-07.04 pide que el dueño cargue todo eso en la app, por empresa.

**Restricciones duras:**
- Dominio sin frameworks.
- Una resolución guardada no se edita ni se borra.
- El PIN y la clave técnica van cifrados y nunca salen completos en respuestas ni en registros.
- Solo el dueño, con verificación en dos pasos reciente.
- Tablas con `empresa_id`, RLS forzado y prueba de aislamiento; `conta_api` sin `BYPASSRLS`.
- Capas gratuitas (Render y Neon).
- Con configuración guardada, la API deja de leer `DIAN_HAB_*` para esa empresa. El certificado .p12 sigue en el entorno hasta HU-07.02.

**Solución obvia conocida:** un formulario largo, un `PUT /configuracion-dian` que guarda un JSON y el PIN cifrado con una clave de entorno.

## Alternativas (Verbalized Sampling, k = 5 + 5, evaluadas por otro agente)

### Decisión 1: diseño técnico

| # | Alternativa | Prob. | Ronda | Puntaje | Resultado |
| - | ----------- | ----- | ----- | ------- | --------- |
| 7 | Secretos de solo escritura: nunca se devuelven, solo su último carácter; cambiarlos exige verificación de hace ≤ 10 min | 0,06 | cola | 4,03 | Elegida (se combina) |
| 8 | Bitácora de cambios, solo inserción, sin valores | 0,05 | cola | 3,83 | Elegida (se combina) |
| 9 | Bloqueos de coherencia en la base (NIT fijo con ventas, primer número dentro del rango) | 0,04 | cola | 3,80 | Elegida en parte |
| 1 | Subdominio «configuración» dentro de facturación; endpoints por sección; AES-256-GCM en la API; el entorno como respaldo | 0,35 | completa | 3,65 | Base elegida |
| 6 | Cifrado de sobre (llave por empresa) | 0,07 | cola | 3,65 | Pospuesta a HU-07.02 |
| 2 | Módulo nuevo `habilitacion-dian` | 0,25 | completa | — | Descartada: ciclo de imports con facturación |
| 3 | Documento JSON único versionado | 0,20 | completa | — | Descartada: reescribe resoluciones inmutables |
| 4 | Cifrado en la base con pgcrypto | 0,12 | completa | — | Descartada: la clave viaja en cada sentencia y puede quedar en registros |
| 5 | Secretos en un almacén externo | 0,08 | completa | — | Descartada: no cabe en capas gratuitas |
| 10 | Probar la conexión con la DIAN al guardar | 0,03 | cola | — | Descartada: llamada síncrona, contra la regla de cola (queda para HU-07.03) |

### Decisión 2: experiencia de la pantalla (dueño, modo simple, celular de gama baja)

| # | Alternativa | Prob. | Ronda | Puntaje | Resultado |
| - | ----------- | ----- | ----- | ------- | --------- |
| D+H | Tarjetas «Lo que falta para facturar» con formularios cortos; en modo simple lo técnico va bajo «Datos que te dio la DIAN» | — | combinada | 4,25 | Elegida |
| D | Tarjetas con estado, cada una guarda su parte | 0,12 | completa | 4,00 | Base elegida |
| B | Asistente de pasos | 0,25 | completa | 3,25 | Se toma su orden |
| C | Pestañas por sección | 0,15 | completa | 2,80 | Descartada |
| F | Precargar desde el catálogo de compradores | 0,07 | cola | 2,80 | Descartada: no hay fuente oficial del RUT |
| E | Importar un archivo | 0,08 | completa | 2,55 | Descartada |
| A | Un formulario largo | 0,40 | completa | 1,90 | Descartada |
| G, I, J | Interruptor en la venta, QR de la resolución, carga por WhatsApp | ≤ 0,06 | cola | — | Descartadas: rompen «solo el dueño» o no existen |

## Decisión

**Diseño técnico.** La opción 1 combinada con 7, 8 y parte de 9:

- **Dónde vive.** Un subdominio `configuracion/` dentro de facturación, que ya es dueña de `datos_fiscales` y `resoluciones_de_numeracion`. Lo compone `composicion-configuracion-dian.ts`.
- **Endpoints**, todos con `@Requiere(Permiso.ConfigurarFacturacion)` (solo el dueño) y `Cache-Control: no-store`:
  - `GET /configuracion-dian`: exige la verificación de la jornada (12 h).
  - `PUT datos-fiscales`, `POST resoluciones`, `PUT software/:clase` y `PUT preferencias`: exigen una verificación reciente (10 min) y responden `acceso.segundo-factor-reciente-requerido` si es más vieja.
- **Secretos.** El PIN se cifra con AES-256-GCM y dato asociado `empresa/clase`. La clave técnica se cifra con dato asociado `empresa/resolución`. La clave sale de `SECRETO_CONFIGURACION_DIAN` (HKDF). Sin esa variable, la configuración responde 503 y no guarda nada. La respuesta solo trae `•••X`.
- **La clave técnica va con su resolución de factura**, no con el software, porque la DIAN da una por rango. Sin ella se usa la pública de habilitación.
- **Resoluciones solo se agregan.**
  - `conta_api` solo tiene INSERT y el UPDATE de `siguiente`.
  - El id lo elige la app. Repetir la misma petición responde 200 sin agregar otra; el mismo id con otro contenido es 409. La comparación usa una huella HMAC del pedido completo, incluidas la clave técnica y el primer número.
  - Hay un máximo de 20 resoluciones por clase y de 30 cambios por empresa en 10 minutos. Así, una sesión robada no puede llenar la empresa de resoluciones imborrables ni tapar la bitácora.
  - Un trigger exige que el primer número quede dentro del rango y fija `creada_en` con la hora de la base.
- **El NIT no cambia si la empresa ya vendió.** Lo revisa el caso de uso y también un trigger en la base.
- **Bitácora.** `cambios_de_configuracion_dian` guarda quién cambió qué sección y cuándo, nunca valores. `conta_api` solo inserta y lee.
- **Lectura en la facturación.**
  - Si la empresa tiene una fila en `software_dian`, el id, el PIN, el TestSetId y el fabricante salen de la base. Si no, se usa el respaldo `DIAN_HAB_*`.
  - El certificado sigue en el entorno hasta HU-07.02.
  - «Siempre factura» apaga el tiquete POS en la elección del documento.

**Pantalla.** D+H con el orden de B: RUT, resolución de factura, software de factura, POS (opcional) y siempre factura.
- La resolución muestra las guardadas solo para leer, con «Agregar otra» y nunca «Editar».
- Si la API pide verificar de nuevo, la app pide el código una vez y repite lo que se estaba guardando.
- El PIN y la clave técnica se escriben tapados, sin sugerencias del teclado, y no se guardan en el teléfono.

## Descartes relevantes

- **Cifrado de sobre (6):** empató con la base, pero hoy agrega una tabla y un paso sin beneficio inmediato. Entra con HU-07.02, cuando también se custodie el .p12, detrás del mismo puerto `CustodiaDeSecretos`.
- **Prueba con la DIAN al guardar (10):** queda para HU-07.03 (diagnóstico), en cola.

## Consecuencias

- **Lo que se gana:** cada empresa factura con su propio software. El dueño no necesita variables ni comandos. Un volcado de la base no trae el PIN en claro, y una sesión robada no puede leerlo.
- **Lo que se pierde:** el dueño no puede ver su PIN completo; si lo olvida, lo consulta en el portal de la DIAN. Hay una variable más que custodiar. Si `SECRETO_CONFIGURACION_DIAN` se pierde, cada dueño debe volver a escribir su PIN y sus claves técnicas.
- **Para revertir:** borrar las filas de `software_dian` hace que la empresa vuelva al respaldo del entorno. Las tablas y los permisos nuevos se quitan con una migración; las resoluciones agregadas se quedan, porque son inmutables.
