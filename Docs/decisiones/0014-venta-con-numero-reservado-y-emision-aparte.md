# ADR-0014. Venta con número reservado en una transacción corta y emisión de la factura aparte

- Estado: Propuesto
- Fecha: 2026-11-27
- Historia: HU-06.01
- Decide: Inge

## Contexto

HU-06.01 pide emitir la factura en 3 toques (producto → cobrar → confirmar) y mostrar su estado. La DIAN no admite números repetidos y una resolución no debe tener huecos sin explicación. El cajero puede tener mala señal y tocar dos veces. La firma XAdES usa CPU (node-forge) en la capa gratuita de Render, y el envío ya va por la cola durable de [ADR-0008](0008-envio-dian-con-cola-en-tabla-y-despertador.md). Todavía no existe el asistente de habilitación (EP-07): no hay pantalla para los datos fiscales ni para la resolución.

Es nivel 3: la numeración y los documentos enviados a la DIAN son caros de revertir.

**Restricciones duras:** dinero exacto; documentos y ventas no se editan ni se borran; RLS por empresa con `conta_api` sin `BYPASSRLS`; llamadas a la DIAN en cola, idempotentes y con intentos registrados; sin secretos en código ni en logs.

## Alternativas (Verbalized Sampling, k = 5 + 5, evaluadas por otro agente)

| # | Alternativa | Prob. | Ronda | Puntaje | Resultado |
| - | ----------- | ----- | ----- | ------- | --------- |
| 1 | Síncrona transaccional: reservar el número y guardar la venta en una transacción; datos fiscales sembrados por un comando | 0,32 | completa | 4,15 | Base elegida |
| 2 | Guardar y numerar en segundo plano | 0,24 | completa | 3,35 | Se toma solo el reparador por cola |
| 3 | El documento es la venta, con endpoint interno de configuración | 0,18 | completa | 3,50 | Descartada: mezcla venta y documento fiscal |
| 4 | Cotizar y confirmar, configuración en git | 0,14 | completa | 2,95 | Descartada: dos llamadas con mala señal; datos de clientes en git |
| 5 | Módulo de ventas con outbox y talonario | 0,12 | completa | 2,90 | Descartada: demasiadas piezas hoy |
| 6 | Numeración por cortes | 0,08 | cola | 2,95 | Descartada: la factura no existe hasta el corte |
| 7 | Optimista, sin candado mientras se firma | 0,07 | cola | 3,60 | Se toma el principio: no firmar con el candado tomado |
| 8 | Resolución traída de la DIAN (`GetNumberingRange`) | 0,06 | cola | 2,75 | Pospuesta a EP-07 |
| 9 | Prefijo por caja | 0,05 | cola | 2,80 | Descartada: trámite extra ante la DIAN |
| 10 | Operación larga por pasos | 0,04 | cola | 2,50 | Descartada: trabajos por venta en capas gratuitas |

## Decisión

La 1, típica de la ronda completa, combinada con el principio de la 7 y el reparador de la 2:

1. **Transacción corta (T1):** `UPDATE resoluciones_de_numeracion SET siguiente = siguiente + 1 … RETURNING` reserva el número y pone en fila las ventas de la empresa; en la misma transacción se revisan los topes y se guardan venta, líneas y emisión pendiente. Todo o nada: si algo falla, el número vuelve.
2. **Emisión aparte (T2):** fuera del candado se arma la factura desde la venta guardada (misma fecha, mismo CUFE), se firma y se entrega a `SolicitarEnvioDian`. Si falla, `conta_sistema.cola_emision_ventas` la retoma con espera creciente y guarda el código de cada falla.
3. **Idempotencia:** el id lo elige la app y la huella SHA-256 del pedido distingue un reintento (200, la misma venta) de otro pedido con el mismo id (409).
4. **Precios solo del catálogo:** la app manda ids, cantidades en texto y el medio de pago; cualquier otro campo es 400.
5. **Hasta EP-07:** datos fiscales y resoluciones en tablas que `conta_api` solo lee (salvo `siguiente`), llenadas con `npm run facturacion:configurar`; la configuración del software sale de `DIAN_HAB_*` para una sola empresa.
6. **Defensa en la base:** el consecutivo solo sube de a uno y cada número reservado tiene su venta al confirmar; los prefijos van en mayúsculas y las resoluciones del mismo prefijo no se cruzan; una venta solo usa un número ya reservado, con la hora actual, y cuadra con sus líneas al confirmar (hallazgos de la prueba de ataque).

## Descartes relevantes

- De la 7 se descarta el bucle optimista: cambiaría la hora y el CUFE en cada reintento.
- La 8 queda como candidata para EP-07, cuando la resolución real se pueda leer de la DIAN.
- La 10 y la 6 se descartan por los trabajos por venta y el sondeo en Render gratuito.

## Consecuencias

- Se gana: número conocido al confirmar, sin huecos ni repetidos (probado con ventas a la vez), firma que no bloquea a otros cajeros y una venta que nunca se pierde aunque la firma falle.
- Se pierde: hasta EP-07, una sola empresa puede facturar por entorno y los datos fiscales se cargan con un comando.
- La cola de emisión, como la de envíos, no tiene RLS (ADR-0008): la API la filtra siempre por la empresa de la transacción. HU-06.04 reemplaza las dos colas juntas.
- Para HU-06.05 (vender sin internet) la misma reserva admite bloques (`siguiente + n`) cambiando los disparadores del consecutivo. `envios_dian` numera sus archivos por empresa y año sin prefijo: revisarlo antes de una segunda resolución activa.
- Para revertir: las tablas son nuevas y no cambian las de HU-02.03; quitar `POST /ventas` deja intactas las facturas ya enviadas.
