# ADR-0016. Tiquete POS electrónico en la misma tubería de la factura, con la clase fijada por la resolución

- Estado: Propuesto
- Fecha: 2026-11-27
- Historia: HU-06.02
- Decide: Inge

## Contexto

HU-06.02 pide emitir el documento equivalente electrónico tiquete POS (anexo técnico DEE v1.0, Resolución DIAN 000165 de 2023) para ventas rápidas de mostrador, con su CUDE.

El tiquete POS es un `Invoice` UBL 2.1 casi igual a la factura de HU-06.01. Cambian estas cosas:
- `InvoiceTypeCode` 20, `CustomizationID` 10 y `ProfileID` «DIAN 2.1: Documento Equivalente POS».
- El `UUID` va con `schemeName` CUDE-SHA384. El CUDE usa la fórmula del CUFE con el PIN del software en vez de la clave técnica.
- Lleva tres `UBLExtension` propias: `FabricanteSoftware` (con la razón social), `BeneficiosComprador` y `PuntoVenta` (placa, ubicación, cajero, tipo de caja y código de venta).

La DIAN lo autoriza con su propia resolución de numeración y prefijo. En habilitación tiene su propio software (id y PIN) y su propio `TestSetId`.

Solo se puede emitir si la base sin impuestos no pasa de 5 UVT (ET art. 616-1, parágrafo 2). En 2026 la UVT es $52.374 (Resolución DIAN 000238 de 2025), así que el tope es $261.870.

**Restricciones duras:**
- Dominio sin frameworks y dinero exacto.
- Los documentos enviados no se editan.
- RLS por empresa, y `conta_api` sin `BYPASSRLS`.
- Envío en cola, idempotente y con intentos registrados.
- Tres toques en el mostrador.
- Capas gratuitas.

**Solución obvia conocida:** un `tipoDeDocumento` en la venta y un `if` en el generador.

## Alternativas (Verbalized Sampling, k = 5 + 5, evaluadas por otro agente)

### Decisión 1: cómo se modela el documento

Los criterios, en este orden, son cambio de proveedor, simplicidad, pruebas, costo y tiempo.

| # | Alternativa | Prob. | Ronda | Puntaje | Resultado |
| - | ----------- | ----- | ----- | ------- | --------- |
| 7 | `ClaseDeDocumento` en el dominio (tope, comprador, tipo de código único) y el generador consulta un perfil | 0,07 | cola | 4,60 | Elegida (reglas) |
| 1 | Una sola tubería; la factura con tipo y una tabla de perfiles UBL | 0,40 | completa | 4,30 | Base elegida (tubería) |
| 6 | La clase se hereda de la resolución que reservó el número | 0,08 | cola | 4,15 | Combinada |
| 3 | Interfaz `DocumentoDeVenta` con un generador por tipo | 0,20 | completa | 3,75 | Descartada: repite el 90 % del XML |
| 2 | Entidad y tabla `ventas_pos` aparte | 0,20 | completa | 2,90 | Descartada: duplica numeración, idempotencia y comprobante |
| 5 | Delegar al proveedor de respaldo | 0,10 | completa | 2,65 | Descartada: costo por documento y dependencia externa |
| 10 | Plantilla XML en la base | 0,05 | cola | 2,60 | Descartada: pierde el escritor determinista; riesgo de inyección |
| 4, 8, 9 | Decorador que reescribe el XML; resolución mixta por rangos; generar los dos y enviar uno | — | — | — | Violan dependencias, la norma o la numeración sin huecos |

### Decisión 2: quién elige entre tiquete POS y factura

Los criterios, en este orden, son toques, si se entiende, gama baja y sin internet, prevención de errores y accesibilidad.

| # | Alternativa | Prob. | Ronda | Puntaje | Resultado |
| - | ----------- | ----- | ----- | ------- | --------- |
| F | Regla automática más la preferencia del pedido `automatico` o `factura`; nunca se fuerza el POS | 0,08 | cola | 4,45 | Elegida |
| B | La API decide sola y la app muestra qué salió | 0,25 | completa | 4,25 | Absorbida en F |
| A | Interruptor en «Cobrar» con POS por omisión | 0,35 | completa | 3,60 | Se toma el control visible |
| E | Diálogo «¿quiere factura?» después de confirmar | 0,05 | completa | 3,55 | Descartada: +1 toque en cada venta |
| G/I | POS y después factura con nota de ajuste | 0,05 / 0,06 | cola | 3,55 | Pospuesta a HU-06.03 |
| D | Dos botones de confirmar | 0,15 | completa | 3,25 | Descartada: ambiguo en pantalla pequeña |
| H | Lector de cédula | 0,04 | cola | 2,85 | Descartada: hardware y otra historia |
| C, J | Tipo fijo por negocio; según el medio de pago | — | — | — | C viola el tope; J ignora al comprador que pide factura |

## Decisión

Para el modelo se combinan la 1, la 7 y la 6. Para la elección, la F, que es de la cola.

1. **Una sola tubería.** Venta, `Factura`, generador UBL, firma, `SolicitarEnvioDian`, PDF y correo sirven para los dos documentos. `Factura` pasa a significar «documento de venta» y expone `clase`.
2. **La clase en el dominio.** `ClaseDeDocumento` ('factura' | 'pos') vive en `dominio/documentos/` junto con estas reglas:
   - `tope-del-pos.ts`: 5 UVT con la tabla de UVT por año. Un año sin valor usa el último conocido. Compara con `≤` sobre la base sin impuestos.
   - `eleccion-del-documento.ts`: la elección.
   - `punto-de-venta.ts`: la caja.
   - `codigoUnicoDe`: CUFE o CUDE.
3. **La resolución fija la clase.** `ResolucionDeNumeracion.clase` decide de qué rango sale el número. La venta copia la clase, y en la base una llave foránea compuesta `(empresa_id, resolucion_id, clase)` impide un POS con número de factura o al revés.
4. **La elección es automática.** Sale tiquete POS solo si se cumplen las cuatro condiciones:
   - el pedido no pidió factura;
   - la venta va a consumidor final;
   - la empresa tiene software POS configurado y una resolución POS vigente;
   - la base cabe en el tope.

   En cualquier otro caso sale factura. La API lo decide dentro de la transacción corta de ADR-0014, antes de reservar el número. La app manda `documento: 'automatico' | 'factura'`. Con comprador, la app manda siempre `factura`; sin comprador, muestra el interruptor «El cliente pide factura electrónica». No hay forma de pedir POS. La preferencia `factura` entra en la huella del pedido; la `automatico` no, para que la huella de los pedidos viejos no cambie.
5. **Lo propio del XML queda en infraestructura.** `dian-directa/ubl/perfil-ubl.ts` guarda el perfil, el código de tipo y el esquema del código único. `codigo-unico.ts` calcula el CUDE con el PIN y el CUFE con la clave técnica. `extensiones-pos.ts` arma las tres extensiones. El firmador solo acepta las extensiones que corresponden al `InvoiceTypeCode`, en su orden.
6. **La configuración va por clase.** `ProveedorDeConfiguracionDian.para(contexto, clase)` y `ProveedorDeAccesoDian.para(contexto, clase)`.
   - Mientras llega EP-07, el POS sale de `DIAN_HAB_POS_ID_SOFTWARE`, `DIAN_HAB_POS_PIN`, `DIAN_HAB_POS_TEST_SET_ID`, `DIAN_HAB_POS_FABRICANTE_NOMBRE` y `DIAN_HAB_POS_FABRICANTE_RAZON_SOCIAL`.
   - El certificado y el NIT son los mismos de la factura.
   - Si falta una variable, el POS no está disponible y todo sale con factura.
7. **Defensa en profundidad en la base** (migración 0011):
   - `clase` con CHECK en resoluciones, ventas, envíos y emisiones.
   - El trigger `tiquete_pos_dentro_del_tope` repite la tabla de UVT.
   - El CHECK `envios_dian_clase_del_documento` amarra la clase del envío al `InvoiceTypeCode` del XML firmado.
   - Dos llaves foráneas obligan a que la emisión enlace venta y envío de la misma clase.
   - `conta_api` no puede actualizar ninguna columna `clase`.

## Descartes relevantes

- De la cola se descarta la 10: guardar plantillas con marcadores en la base rompe el orden del esquema y abre una vía de inyección en un documento fiscal.
- G/I (emitir POS y convertirlo luego en factura) queda como vía de recuperación cuando existan las notas (HU-06.03).
- El evaluador propuso además una preferencia del negocio «siempre factura» (tomada de C). Queda para la pantalla de configuración DIAN de EP-07: hoy basta con no configurar el software POS.

## Consecuencias

**Se gana:**
- Un solo lugar para corregir cada hallazgo.
- Las reglas se prueban sin XML ni base.
- El error legal (POS por encima del tope o con comprador que pidió factura) es imposible por construcción, en el dominio y otra vez en la base.
- Agregar el documento soporte o las notas es agregar una clase y un perfil.

**Se pierde:**
- `Factura` es un nombre más amplio de lo que dice.
- La tabla de UVT está dos veces, en el dominio y en la base. Hay que actualizar las dos cada año, y la prueba de integración lo vigila.

**Por verificar en habilitación:**
- El prefijo del nombre del XML dentro del ZIP. Hoy se usa `fv`, el mismo de la factura.
- Que la DIAN acepte los valores de `PuntoVenta` que arma la API: placa `CONTA-APP`, el cajero por un id corto y la ubicación con la dirección del emisor.

**Para revertir:** las columnas nuevas tienen valor por omisión 'factura'. Basta con no configurar el software POS para que todo vuelva a salir con factura, sin tocar los documentos ya emitidos.
