# ADR-0015. Comprobante PDF a pedido, compartido como archivo, y correo al aceptar

- Estado: Propuesto
- Fecha: 2026-11-27
- Historia: HU-06.08
- Decide: Inge

## Contexto

HU-06.08 pide que el dueño comparta el PDF de la factura con su QR por WhatsApp en un toque, desde «Listo» o «Mis ventas», y que el comprador con correo reciba el XML y el PDF cuando la DIAN acepta. Sin internet, compartir queda en cola con un aviso en modo simple. El criterio original decía además que «el enlace vence».

La API corre en Render gratis (se duerme), la web y el despertador en Cloudflare, y la base en Neon. La representación gráfica (CUFE, QR, campos obligatorios) es regla fiscal y vive en `api/`.

**Restricciones duras:** documentos enviados a la DIAN no se editan ni se borran; RLS por empresa con `conta_api` sin `BYPASSRLS`; llamadas a terceros en cola, idempotentes y con intentos registrados; sin secretos ni datos personales en logs; capas gratuitas.

## Alternativas (Verbalized Sampling, k = 5 + 5, evaluadas por otro agente)

Criterios: cambiar de proveedor (25 %), simplicidad (25 %), probar sin red (20 %), costo (15 %) y tiempo (15 %), con un ajuste de seguridad entre −0,5 y +0,5.

| # | Alternativa | Prob. | Ronda | Puntaje | Resultado |
| - | ----------- | ----- | ----- | ------- | --------- |
| 2 | PDF a pedido con sesión y RLS, compartido como archivo; correo con outbox y Brevo | 0,22 | completa | 4,35 | Base elegida |
| 6 | AttachedDocument inmutable direccionado por hash | 0,08 | cola | 2,70 | Combinada: PDF determinista; el contenedor se difiere |
| 1 | PDF en R2 con URL prefirmada de 72 h; correo por Resend | 0,30 | completa | 2,95 | Descartada: dos secretos, almacén y un enlace al portador en chats ajenos |
| 5 | Token opaco guardado como hash; endpoint público `/c/:token` | 0,10 | completa | 2,45 | Descartada: superficie pública; el comprador espera si Render duerme |
| 8 | PDF cifrado con la llave en el fragmento `#`; visor en Pages | 0,04 | cola | 2,20 | Descartada: la llave queda para siempre en el chat; el «vence» es nominal |
| 9 | Correo por OAuth `gmail.send` del negocio | 0,04 | cola | 1,65 | Descartada: verificación de Google y tokens de todas las empresas |
| 3, 4, 7, 10 | PDF en la app; Amazon SES; API de WhatsApp Cloud; PDF en el Worker | — | — | — | Descartadas por restricción dura (regla fiscal fuera de `api/`, costo, datos a Meta, CPU del Worker) |

## Decisión

La 2, de la ronda completa pero no la obvia (la obvia es la 1), con piezas de la 6. Inge eligió el 2026-11-27 **no tener enlace público**:

1. **PDF a pedido:** `GET /ventas/:id/comprobante` arma el PDF desde la venta y el XML firmado guardados, con sesión, `X-Empresa`, `Permiso.Vender` y RLS. No se guarda: se rearma igual cada vez (fechas del PDF fijas, sin metadatos variables). Responde `no-store`, `nosniff` y `attachment`; 30 por 5 minutos por persona y empresa. Se pide solo con la factura aceptada (`409 comprobante.en-camino` o `comprobante.rechazado`). Puerto `RenderizadorDeComprobante` con pdfkit y un QR vectorial en infraestructura; el dominio `ComprobanteDeVenta` decide qué va en la hoja.
2. **Compartir como archivo:** la app descarga el PDF con la sesión, revisa que sea un PDF de máximo 5 MB y lo entrega al menú de compartir del teléfono (`share_plus`). No hay URL que filtrar. Sin internet, mientras la DIAN no aprueba o con el límite, queda en una cola de la app (máximo 10) que reintenta con esperas crecientes mientras la app está abierta y avisa en modo simple.
3. **Correo al aceptar:** `ProcesarEnvioDian` pide el correo en la misma transacción que guarda «aceptado» (outbox `conta.correos_de_factura`, con RLS), solo si el comprador tiene correo. `EnviarCorreoDeFactura` lo manda fuera de la transacción por un puerto `EnviadorDeCorreo` con adaptador Brevo (capa gratuita, `CORREO_BREVO_LLAVE` y `CORREO_REMITENTE`). Cada intento queda en `conta.intentos_correo_de_factura` con un código, nunca con la dirección ni el mensaje del proveedor. Esperas de 1 a 720 minutos y 8 intentos como máximo; un 400 termina de una vez. Sin configuración, cada intento registra `correo.sin-configurar`.
4. **Respuesta de la DIAN guardada:** el `ApplicationResponse` (XmlBase64Bytes de GetStatusZip) se guarda en `conta.respuestas_de_aceptacion`, solo para envíos aceptados, para armar después el AttachedDocument.

## Excepción: una función SECURITY DEFINER

Las colas de ADR-0008 no tienen RLS para que el despertador vea todas las empresas. Para no sumar una tercera tabla así, `conta_sistema.tomar_correos_vencidos(p_limite)` es del dueño y corre como él, con `search_path = pg_catalog, pg_temp`. Solo devuelve `(empresa_id, venta_id)`, marca la reserva de 2 minutos con la hora de la base, toma 50 como máximo y nada más puede hacer: quien la llame no ve datos ni cambia la hora de otros correos. El resto del trabajo corre con la empresa fijada y RLS. La prueba del catálogo la tiene en una lista explícita y revisa su definición; cualquier otra función `SECURITY DEFINER` sigue prohibida.

## Descartes relevantes

- De la cola se descarta la 8, la más ingeniosa: su vencimiento depende de borrar un archivo, pero la llave vive en el chat y en los servidores de Meta.
- De la 6 se difiere el contenedor **AttachedDocument**: hoy el correo lleva el XML firmado de la factura. Antes de clientes reales, otra historia debe mandar el AttachedDocument con el `ApplicationResponse` ya guardado.
- Si algún día hace falta mandar la factura a alguien sin el archivo (por ejemplo, por SMS), sería con el token de la 5 (128 bits, guardado como hash y revocable), en otra historia.

## Consecuencias

- Se gana: cero superficie pública, un solo secreto nuevo, encaja con Render dormido (el dueño descarga con la app ya activa) y todo se prueba sin red.
- Se pierde: el comprador no puede volver a bajar la factura por su cuenta; Brevo no tiene llave de idempotencia, así que un tiempo agotado puede mandar el correo dos veces (riesgo aceptado). La cola de la app se pierde si se cierra la app.
- Criterio reescrito en el issue #115: «no existe enlace público; el PDF solo se descarga con sesión de la empresa».
- Para revertir: las tablas son nuevas y solo se agregan filas; quitar el endpoint y el aviso de aceptación no toca las facturas ya enviadas.
