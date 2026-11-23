# ADR-0008. Envío a la DIAN: agregado EnvioDian, cola en una tabla, despertador en proceso y recuperación por el Worker

- Estado: Propuesto
- Fecha: 2026-11-23
- Historia: HU-02.03
- Decide: Inge

## Contexto

HU-02.03 envía la factura firmada (HU-02.02) al ambiente de habilitación de la DIAN y guarda su respuesta.

- **Protocolo:** SOAP 1.2 con WS-Security. `SendTestSetAsync` recibe un ZIP en base64 y devuelve un `ZipKey`. La validación es asíncrona: `GetStatusZip(ZipKey)` responde «en proceso», aceptado (`00`) o rechazado (`99`) con los mensajes.
- **Regla dura (CLAUDE.md):** «Llamadas a la DIAN y a Wompi en cola, idempotentes y con registro de intentos». Los documentos enviados no se editan ni se borran.
- **El adaptador durable de colas** (pg-boss sobre Neon o Redis) es de HU-06.04, con su propia decisión. Esta historia no debe adelantarla mal.
- **Costo:** Neon gratis suspende el cómputo sin consultas y tiene tope de horas. Render gratis se duerme a los 15 minutos. Un Worker de Cloudflare ya la despierta cada 14 minutos (lunes a sábado, 7 a 23 en Colombia).
- **Solución obvia conocida:** una cola con sondeo (pg-boss o outbox con `SKIP LOCKED` cada N segundos).

## Alternativas consideradas (Verbalized Sampling)

Calificaciones de un agente evaluador que no generó las alternativas. Criterios: cambiar proveedor 25 %, simplicidad 25 %, probar sin red ni base 20 %, costo operativo 15 %, tiempo 15 %.

| # | Alternativa | Prob. verbalizada | Ronda | Puntaje ponderado |
| - | ----------- | ----------------- | ----- | ----------------- |
| 1 | Puerto de cola + adaptador en proceso + tablas durables | 0,35 | Completa | 4,20 |
| 2 | pg-boss ahora | 0,25 | Completa | 2,60 |
| 3 | Outbox con sondeo cada N segundos | 0,15 | Completa | 2,85 |
| 4 | Envío síncrono dentro de la petición | 0,15 | Completa | Viola «en cola» |
| 5 | Cola HTTP externa (QStash o Cloudflare Queues) | 0,10 | Completa | 2,75 |
| 6 | 1 + recuperación disparada por el Worker de Cloudflare | 0,08 | Cola | **4,35** |
| 7 | Máquina de estados del envío en el dominio | 0,06 | Cola | 4,20 (complemento) |
| 8 | GitHub Actions programado como procesador | 0,05 | Cola | 3,35 |
| 9 | LISTEN/NOTIFY de PostgreSQL | 0,04 | Cola | No durable; Neon nunca se suspende |
| 10 | Procesar en la app del cliente | 0,03 | Cola | Viola «toda regla fiscal en `api/`» |

## Decisión

Combinación **de la cola**: 6 + 7.

- **Dominio (7):** el agregado `EnvioDian` con sus estados `pendiente → en-validacion → aceptado | rechazado`, o `fallido` tras 12 fallas de comunicación. Los reintentos son puros: 30 s × 2ⁿ⁻¹ hasta 1 hora tras una falla, y 5 s × 2ⁿ⁻¹ hasta 5 minutos entre consultas.
- **Cola (6):** el puerto `ColaDeTrabajos` lleva solo `{empresaId, envioId}`. Su adaptador actual es la tabla `conta_sistema.cola_envios_dian`, escrita en la **misma transacción** que el envío (outbox), así que ningún envío queda sin trabajo.
- **Despertador:** un temporizador en proceso, uno solo y para la hora más próxima. No consulta la base mientras no hay nada que hacer, así que Neon se suspende.
- **Recuperación:** si Render se reinicia, el Worker de Cloudflare llama `POST /interno/trabajos/procesar` con un token. Ese endpoint toma un lote de vencidos con `FOR UPDATE SKIP LOCKED` y una reserva de 5 minutos.
- **HU-06.04** solo cambia el adaptador de la cola y el despertador. El dominio y los casos de uso no cambian.

### Cómo se cumple la regla dura

- **En cola:** la petición solo crea el envío y su trabajo. La llamada a la DIAN la hace el procesador, fuera de toda transacción.
- **Idempotente:** un envío por (empresa, CUFE). Repetir la solicitud devuelve el mismo envío. Al guardar, un `UPDATE … WHERE intentos = <leídos>` hace que de dos procesadores concurrentes solo cuente uno, y la prueba de integración lo comprueba.
- **Registro de intentos:** `conta.intentos_envio_dian`, solo inserción, con operación, resultado, detalle sin secretos y duración.
- **No se edita ni se borra:** `conta_api` no tiene DELETE en `envios_dian`, y su UPDATE se limita a las columnas de estado. El XML firmado, el CUFE y el número no se pueden cambiar.

### Cambio frente a la recomendación del evaluador

El evaluador propuso un rol `conta_recuperador` con una política RLS solo de lectura para listar vencidos de todas las empresas. Se eligió algo más simple: la cola vive en `conta_sistema` y **solo guarda ids y horas**, sin datos de negocio, así que no necesita RLS. Al encolar, la fila queda atada a la empresa de la transacción: si el trabajo es de otra empresa, la inserción falla, y hay una prueba para eso. Cada envío se procesa después con `conta_api` dentro del `ContextoEmpresa` del trabajo.

## Descartes relevantes

- **pg-boss (2) y outbox con sondeo (3):** consultan la base cada pocos segundos aunque no haya trabajo, así que Neon no se suspende y se agotan las horas gratis. Además, pg-boss decide hoy lo que corresponde a HU-06.04.
- **QStash o Cloudflare Queues (5):** otro proveedor y otro secreto, para un volumen que una tabla resuelve.
- **LISTEN/NOTIFY (9):** no es durable y mantiene una conexión abierta.

## Consecuencias

- **Domingos y de 23 a 7:** el Worker no corre. Un envío cuyo temporizador se perdió en un reinicio espera a la próxima llamada del Worker. El temporizador sí corre mientras la API está despierta.
- **Secreto nuevo:** `TOKEN_TRABAJOS_INTERNOS`, de al menos 32 caracteres. Va en Render y en el entorno `SECRETOS`, y el despliegue lo copia al Worker. Sin token, el endpoint queda cerrado.
- **Acceso a la DIAN:** mientras llega la custodia por empresa (HU-07.02), una sola empresa, `DIAN_HAB_EMPRESA_ID`, tiene acceso de habilitación desde el entorno. Las demás reciben `AccesoDianNoConfigurado`.
- **Cliente SOAP y ZIP propios:** el cliente SOAP usa xml-crypto, que ya es dependencia, y el ZIP usa `node:zlib`. El paquete `soap` complica firmar solo `wsa:To` con exc-c14n. La firma del sobre se verifica con `xmlsec1` en CI.
- **Validación real:** el workflow manual «Habilitación DIAN» envía una factura SETP real y espera «aceptada». Lo que solo esa prueba confirma: la caja de los hexadecimales del nombre del archivo, que la DIAN acepte `InclusiveNamespaces` con espacio de nombres por omisión, y el formato de la respuesta «en proceso».
