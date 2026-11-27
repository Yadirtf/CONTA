# modulos/facturacion

Factura electrónica de venta según el **anexo técnico 1.9** de la DIAN (Resolución 000165 de 2023).

## Qué hay (HU-02.01 y HU-02.02)

| Capa | Contenido |
| --- | --- |
| `dominio/` | `Factura`, `LineaDeFactura`, `ResolucionDeNumeracion` y los objetos de valor `NumeroDeFactura`, `Identificacion`, `MomentoDeEmision`, `TarifaIva`, `Participante`. Los totales salen siempre de las líneas, redondeados a 2 decimales con mitad al par ([ADR-0005](../../../../Docs/decisiones/0005-dinero-con-decimal-exacto-propio.md)). |
| `aplicacion/` | Comandos `GenerarXmlFactura` y `FirmarDocumentoElectronico`; puertos `GeneradorDeDocumentoElectronico` (con su `ConfiguracionDian`) y `FirmadorDeDocumentos`; `firma/` con `CertificadoDeFirma` y los errores de firma. |
| `infraestructura/dian-directa/xml/` | Escritor de XML propio, determinista. |
| `infraestructura/dian-directa/ubl/` | `GeneradorUblDian`, que solo ordena las secciones. Cada sección vive en su archivo: extensiones de la DIAN, participantes, impuestos, totales y líneas. `cufe.ts` calcula el CUFE y el `SoftwareSecurityCode` con SHA-384. |
| `infraestructura/dian-directa/firma/` | `FirmadorXadesDian` (XAdES-EPES), que solo coordina los pasos de abajo ([ADR-0007](../../../../Docs/decisiones/0007-firma-xades-con-xml-crypto.md)). |

### Pasos de la firma (`infraestructura/dian-directa/firma/`)

| Archivo | Responsabilidad |
| --- | --- |
| `lector-pkcs12.ts` | Abre el .p12 en memoria con node-forge (el único archivo que lo usa) y entrega la llave como `KeyObject`. |
| `requisitos-del-certificado.ts` | Exige RSA de 2048 bits o más, vigencia en la hora de la firma y Key Usage con firma digital y no repudio. |
| `documento-por-firmar.ts` | Rechaza DTD, una firma previa y extensiones de más; agrega la segunda `ext:UBLExtension`. |
| `propiedades-xades.ts` y `nombre-distinguido.ts` | `xades:QualifyingProperties`: hora, certificado firmante (`IssuerSerial` en RFC 4514), política, rol y formato. |
| `firma-xmldsig.ts` | Calcula la `ds:Signature` con xml-crypto: C14N inclusivo, RSA-SHA256 y las tres referencias del anexo. |
| `autoverificacion.ts` | Vuelve a leer la salida: una sola firma, las referencias esperadas y que valide. |
| `politica-de-firma.ts`, `identificadores-de-firma.ts`, `material-de-firma.ts` | Constantes de la política v2, Ids únicos por firma y el tipo del material abierto. |

## Envío a la DIAN (HU-02.03)

Decisión en [ADR-0008](../../../../Docs/decisiones/0008-envio-dian-con-cola-en-tabla-y-despertador.md). El flujo:

1. `SolicitarEnvioDian` crea el `EnvioDian` y su trabajo en la cola, en la misma transacción. Es idempotente por CUFE.
2. El despertador en proceso, o el Worker de Cloudflare con `POST /interno/trabajos/procesar`, toma los trabajos vencidos (`ProcesarTrabajosVencidos`).
3. `ProcesarEnvioDian` lee el envío, llama a la DIAN **fuera de toda transacción** y guarda el resultado, el intento y el siguiente trabajo. Si otro procesador ya avanzó el envío, no guarda nada.

| Capa | Archivo | Responsabilidad |
| --- | --- | --- |
| `dominio/envio-dian/` | `envio-dian.ts` | Agregado con la máquina de estados: `pendiente → en-validacion → aceptado \| rechazado`, o `fallido` tras 12 fallas. |
| | `respuesta-de-la-dian.ts` | Respuesta legible (código, descripción y mensajes de rechazo), recortada a tamaños seguros. |
| | `politica-de-reintentos.ts` | Esperas exponenciales puras tras una falla y entre consultas. |
| `aplicacion/comandos/` | `solicitar-envio-dian.ts`, `procesar-envio-dian.ts`, `procesar-trabajos-vencidos.ts` | Los tres casos de uso de arriba. |
| `aplicacion/envio/` | `llamada-a-la-dian.ts` | Una llamada y su efecto sobre el envío. Convierte cualquier error en falla de comunicación con un detalle sin secretos. |
| `aplicacion/puertos/` | `servicio-web-dian.ts`, `cola-de-trabajos.ts`, `repositorio-de-envios.ts`, `registro-de-intentos.ts`, `proveedor-de-acceso-dian.ts` | Puertos. La cola solo transporta `{empresaId, envioId}`. |
| `infraestructura/dian-directa/servicio-web/` | `servicio-web-dian-directo.ts` | Coordina: nombres del anexo, ZIP, sobre, firma, POST y lectura. |
| | `nombres-de-archivo.ts`, `paquete-zip.ts` | `fv`/`z` + NIT + año + consecutivo hexadecimal; ZIP de una entrada con `node:zlib`. |
| | `sobre-soap.ts`, `firma-ws-security.ts`, `espacios-soap.ts`, `operaciones-dian.ts` | Sobre SOAP 1.2 con WS-Addressing y WS-Security. Firma solo `wsa:To` con exc-c14n y RSA-SHA256, y la apunta al `BinarySecurityToken`. |
| | `cliente-http-soap.ts`, `lector-de-respuestas.ts` | POST con tiempo límite y tope de tamaño; lectura de `ZipKey` y `DianResponse` sin DTD. |
| `infraestructura/persistencia/` | tablas, repositorio, registro de intentos y cola en Postgres | `conta.envios_dian` y `conta.intentos_envio_dian` con RLS; `conta_sistema.cola_envios_dian` solo con ids. |
| `infraestructura/cola/` | `despertador-en-proceso.ts` | Un temporizador para la hora más próxima; no consulta la base mientras no hay trabajo. |
| `infraestructura/acceso-dian/` | `acceso-dian-desde-entorno.ts` | Certificado y TestSetId de habilitación para una sola empresa, hasta HU-07.02. |
| `presentacion/http/` | `trabajos-internos.controller.ts`, `guarda-de-trabajos-internos.ts` | Endpoint interno, fuera del contrato OpenAPI, con token Bearer comparado en tiempo constante. |

**Lo que nunca cambia:** `conta_api` no puede borrar envíos ni intentos. Sobre `envios_dian` solo puede actualizar las columnas de estado, así que el XML firmado, el CUFE y el número quedan fijos. Los intentos solo se insertan.

## Ventas con factura (HU-06.01)

La venta de mostrador en 3 toques. La app manda solo ids, cantidades en texto y el medio de pago; el precio y el IVA salen del catálogo (`ObtenerParaVender`, la API pública de `catalogo`).

1. `RegistrarVenta` revisa el permiso, calcula la huella del pedido y, si el id ya existe, devuelve esa venta (mismo pedido) o rechaza (otro pedido, `venta.id-en-uso`).
2. Antes de gastar un número exige la configuración DIAN y lee el catálogo.
3. En **una transacción corta** reserva el consecutivo (`UPDATE … RETURNING`, que además pone en fila las ventas de la empresa), revisa los topes y guarda venta, líneas y emisión pendiente. Si algo falla, se deshace todo, número incluido: no quedan huecos ni repetidos.
4. Fuera de la transacción, `EmitirVenta` arma la factura (siempre la misma para la misma venta, así que el CUFE no cambia), la firma y la entrega a `SolicitarEnvioDian`. Si falla, `CompletarEmisionesPendientes` la retoma desde `conta_sistema.cola_emision_ventas` con el despertador o el endpoint interno.

| Capa | Archivo | Responsabilidad |
| --- | --- | --- |
| `dominio/ventas/` | `pedido-de-venta.ts` | Forma del pedido: UUID en minúsculas, 1 a 100 productos sin repetir, medio de pago conocido; texto canónico para la huella. |
| | `linea-de-venta.ts` | Cantidad en texto con hasta 6 decimales; total = precio con IVA × cantidad, separado en base e IVA exactos. |
| | `venta.ts` | La venta inmutable y su `aFactura`, con `LineaDeFactura.desdeDesglose` (sin recalcular el IVA) y forma de pago de contado. |
| | `medio-de-pago.ts`, `estado-de-la-venta.ts`, `limites-de-ventas.ts`, `articulo-del-catalogo.ts` | Códigos DIAN de pago (10, 47, 48, 49), estado con palabras de la app, topes y lo que la venta toma del catálogo. |
| `aplicacion/comandos/` | `registrar-venta.ts`, `emitir-venta.ts`, `completar-emisiones-pendientes.ts` | Los pasos de arriba. |
| `aplicacion/consultas/` | `consultar-venta.ts` | La venta con su estado y, si la DIAN la rechazó, los motivos. |
| `aplicacion/ventas/` | `errores-de-venta.ts`, `huella-del-pedido.ts`, `lineas-del-pedido.ts` | Códigos estables, SHA-256 del pedido y unión del pedido con el catálogo. |
| `aplicacion/puertos/` | `repositorio-de-ventas.ts`, `numeracion-de-la-empresa.ts`, `cola-de-emisiones.ts`, `catalogo-de-venta.ts`, `proveedor-de-configuracion-dian.ts` | Puertos. |
| `infraestructura/persistencia/ventas/` | tablas, repositorio, numeración y colas | `conta.ventas`, `lineas_de_venta` y `emisiones_de_venta` solo se insertan; `datos_fiscales` y `resoluciones_de_numeracion` solo se leen, salvo `siguiente`, que un trigger impide bajar. |
| `infraestructura/catalogo/` | `catalogo-de-venta-con-catalogo.ts` | Traduce productos y compradores del catálogo; sin comprador, consumidor final. |
| `infraestructura/acceso-dian/` | `configuracion-dian-desde-entorno.ts` | Software, PIN y NIT de una sola empresa desde `DIAN_HAB_*`, hasta EP-07. |
| `presentacion/http/ventas/` | `ventas.controller.ts`, `lectura-de-venta.ts`, `respuesta-venta.ts`, `traductor-de-errores-de-ventas.ts` | `POST /ventas` (201 nueva, 200 repetida) y `GET /ventas/:id`. Un campo que no se espera es 400. |

Para dejar una empresa lista: `npm run facturacion:configurar` ([entorno de pruebas, 4.6](../../../../Docs/despliegue/entorno-de-pruebas.md)).

## Comprobante y correo (HU-06.08)

El PDF de la factura con su QR y el correo al comprador ([ADR-0015](../../../../Docs/decisiones/0015-comprobante-a-pedido-y-correo-al-aceptar.md)). No hay enlace público: el PDF se arma a pedido con la sesión del negocio y la app lo comparte como archivo.

1. `GET /ventas/:id/comprobante`: `ObtenerComprobante` exige `Permiso.Vender`; `armarComprobante` lee la venta, la factura enviada, el emisor y la resolución, y solo sigue si la DIAN la aceptó. El QR y el emisor salen del XML firmado (`codigo-qr-del-xml.ts`, `emisor-del-xml.ts`). `RenderizadorPdfkit` dibuja la hoja carta con el QR vectorial; el PDF sale igual cada vez. 30 en cualquier lapso de 5 minutos por persona y empresa (`LimitadorDeslizante`), con `Retry-After`.
2. `GET /ventas`: las últimas 50 ventas con su estado, para «Mis ventas».
3. Al guardar «aceptado», `ProcesarEnvioDian` llama a `AvisosDeAceptacion` en la misma transacción: `CorreoAlAceptar` pide el correo si el comprador tiene dirección. El despertador corre `EnviarCorreosPendientes`, que lee los vencidos con `conta_sistema.correos_vencidos` (única función `SECURITY DEFINER`, de solo lectura, solo devuelve ids) y da un paso con cada uno con `EnviarCorreoDeFactura`: toma el intento en la transacción de la empresa, manda fuera de ella por `EnviadorDeCorreo` (Brevo) y lo cierra con su resultado. Cada intento queda registrado con un código. Sin proveedor configurado no toma nada.

| Capa | Archivo | Responsabilidad |
| --- | --- | --- |
| `dominio/comprobante/` | `comprobante-de-venta.ts`, `formato-colombiano.ts` | Qué va en la hoja (emisor, comprador, líneas, totales por tarifa, CUFE y QR) y cómo se escriben pesos, cantidades y documentos. |
| `dominio/correo/` | `correo-de-factura.ts` | Estado del correo (pendiente, enviado, fallido), intento en curso, esperas de 1 a 720 minutos y 8 intentos como máximo. |
| `aplicacion/comprobante/`, `aplicacion/consultas/` | `armar-comprobante.ts`, `obtener-comprobante.ts`, `listar-ventas-recientes.ts` | Arma el comprobante desde lo guardado; errores `comprobante.en-camino` y `comprobante.rechazado`. |
| `aplicacion/correo/`, `aplicacion/comandos/` | `correo-al-aceptar.ts`, `mensaje-de-factura.ts`, `falla-de-correo.ts`, `enviar-correo-de-factura.ts`, `enviar-correos-pendientes.ts` | Pedir el correo, armar el mensaje con el PDF y el XML, y mandarlo tomando el intento antes (bloqueo optimista por `intentos` y la última falla). |
| `infraestructura/comprobante-pdf/` | `renderizador-pdfkit.ts`, `encabezado.ts`, `tabla-de-lineas.ts`, `pie-fiscal.ts`, `qr-vectorial.ts`, `hoja.ts` | El PDF con pdfkit y Helvetica (solo WinAnsi: lo demás se cambia por «?»). |
| `infraestructura/correo/` | `enviador-brevo.ts`, `enviador-sin-configurar.ts`, `configuracion-de-correo.ts` | Brevo con tiempo máximo de 15 s y sin redirecciones; un 400 es falla permanente. |
| `infraestructura/persistencia/correos/` | tablas, repositorio, pendientes y avisos | `correos_de_factura` (nace pendiente; solo toma un intento o cierra el que está en curso), `intentos_correo_de_factura` y `respuestas_de_aceptacion`, todas con RLS. |
| `presentacion/http/ventas/` | `comprobante.controller.ts`, `limite-de-comprobantes.ts`, `respuesta-venta-reciente.ts` | El PDF con `no-store`, `nosniff` y `attachment`; un id que no es UUID es 404. |

## Tiquete POS electrónico (HU-06.02)

El documento equivalente electrónico tiquete POS (anexo DEE v1.0) sale por la misma tubería de la factura ([ADR-0016](../../../../Docs/decisiones/0016-tiquete-pos-en-la-misma-tuberia.md)). La clase (`factura` o `pos`) la fija la resolución de numeración.

1. `RegistrarVenta` pide la configuración POS solo si el pedido es `documento: automatico` y va a consumidor final; exige el mismo NIT que la factura. Dentro de la transacción corta busca la resolución POS vigente y decide con `claseParaLaVenta`: POS si cabe en 5 UVT sin impuestos; si no, factura. Después reserva el número de la resolución elegida.
2. `EmitirVenta` usa la configuración y el acceso de la clase de la venta. El generador toma el perfil (`InvoiceTypeCode` 20, `ProfileID` del POS, CUDE-SHA384 con el PIN) y agrega `FabricanteSoftware`, `BeneficiosComprador` y `PuntoVenta`. El firmador rechaza extensiones que no correspondan al tipo de documento.
3. `ProcesarEnvioDian` manda con el `TestSetId` de la clase del envío. El PDF y el correo usan el nombre del documento y la etiqueta CUDE.

| Capa | Archivo | Responsabilidad |
| --- | --- | --- |
| `dominio/documentos/` | `clase-de-documento.ts`, `valor-de-la-uvt.ts`, `tope-del-pos.ts`, `eleccion-del-documento.ts`, `punto-de-venta.ts` | Las clases y sus nombres, la UVT por año, el tope de 5 UVT, qué documento sale y los datos de la caja. |
| `infraestructura/acceso-dian/` | `variables-por-clase.ts` | Qué variables `DIAN_HAB_*` usa cada clase; el POS además necesita `DIAN_HAB_POS_*` y el fabricante. |
| `infraestructura/dian-directa/ubl/` | `perfil-ubl.ts`, `codigo-unico.ts`, `extensiones-pos.ts` | Perfil UBL por clase, CUFE o CUDE, y las extensiones del POS. |
| `migraciones/0011_tiquete_pos.sql` | | `clase` en resoluciones, ventas, envíos y emisiones; llaves foráneas de clase; tope repetido en un trigger; la clase del envío amarrada a su XML. |

## Reglas del anexo que se aplican

- **CUFE** (11.2): `SHA-384(NumFac + FecFac + HorFac + ValFac + 01 + ValImp1 + 04 + ValImp2 + 03 + ValImp3 + ValTot + NitFE + NumAdq + ClTec + TipoAmbiente)`, con los mismos textos que quedan en el XML. La prueba reproduce el ejemplo oficial de la sección 11.2.1.
- **Código de seguridad del software** (11.8): `SHA-384(IdSoftware + PIN + NumFac)`.
- **QR** (11.7.1): URL de consulta de la DIAN con el CUFE, de habilitación o de producción según el ambiente.
- **Numeración** (FAB07 a FAB12): mismo prefijo que la resolución, número dentro del rango y fecha de emisión vigente.
- **Fecha y hora** (5.4): hora legal de Colombia, `hh:mm:ss-05:00`.
- **Valores** (5.2.1 y tabla 5): punto decimal, sin separador de miles, 2 decimales en los montos y hasta 6 en cantidades y precios.

La clave técnica y el PIN del software son valores reservados: entran solo al cálculo de los códigos, nunca al XML ni a los mensajes de error.

## Reglas de la firma (anexo 10)

- **XAdES-EPES** con la política v2 de la DIAN y su hash SHA-256, en la segunda `ext:UBLExtension`.
- **C14N 1.0 inclusivo**, **RSA-SHA256** y resúmenes **SHA-256**.
- **Tres referencias, en este orden:** el documento entero (`URI=""`, *enveloped*), el `KeyInfo` y las `SignedProperties`.
- **`SigningTime`** en hora de Colombia (`-05:00`), dentro de la vigencia del certificado.
- **`SignerRole`:** `supplier` por omisión, o `third party` cuando firma otro por el facturador.

El certificado llega como `CertificadoDeFirma`, que nunca se muestra en JSON, `inspect` ni `String`. Se abre en cada firma y no se guarda entre llamadas ni entre empresas. Si falla, el error es `CertificadoNoUtilizable` o `DocumentoNoFirmable`, con un mensaje fijo y sin el error original de la librería.

## Por qué un escritor de XML propio

El XML se escribe sin indentación ni espacios y con el orden del esquema, siempre igual para los mismos datos. Así lo que se firma es exactamente lo que se generó, y no hay una dependencia más. El escritor escapa `&`, `<`, `>` y `"` y rechaza caracteres que XML no admite, para que un dato del usuario no pueda inyectar marcado.

## Pruebas

- `test/unitarias/facturacion/`: dominio, CUFE con el ejemplo del anexo y una factura de dos líneas (IVA 19 % y 0 %) validada contra los XSD oficiales ([`test/recursos/dian/`](../../../test/recursos/dian/README.md)).
- `test/unitarias/facturacion/firma/`: firma verificada con `xmlsec1`, que confía en una CA de prueba creada en memoria y rechaza una factura alterada. También cubre la validación contra los XSD de XMLDSig y XAdES, los certificados vencidos, sin no repudio, con contraseña errónea o con llave corta, los documentos que no se firman, y que el certificado no se filtre. En CI `xmlsec1` es obligatorio; en un equipo sin él, esas dos pruebas se omiten.
- `infraestructura/dian-directa/*/*.spec.ts`: escritor de XML y CUFE.
- `test/unitarias/facturacion/envio/`, `servicio-web/`, `cola/` y `presentacion/`: máquina de estados, casos de uso con dobles en memoria, sobre firmado verificado con `xmlsec1`, ZIP, nombres, lectura de respuestas grabadas, cliente HTTP con transporte falso, despertador y guarda.
- `test/integracion/envio-dian/`: contra PostgreSQL con `conta_api`. Cubre aceptado y rechazado, idempotencia, dos procesadores a la vez (una sola llamada a la DIAN), reservas, intentos, que no se puede editar ni borrar, y que no se puede encolar un trabajo de otra empresa.
- `test/unitarias/facturacion/ventas/` y `linea-desde-desglose.spec.ts`: pedido, líneas, medios de pago, estado y las reglas de `RegistrarVenta` con dobles en memoria (topes, sin configuración, otro NIT, rango agotado, reintentos).
- `test/integracion/ventas/`: contra PostgreSQL con la firma real. Cubre el primer número de la resolución, reintentos sin gastar números, 12 ventas a la vez con números seguidos, el mismo id 5 veces a la vez (una sola venta), la reparación tras una firma fallida, el rango agotado, el producto de otra empresa y que `conta_api` no edita ni borra ventas ni baja el consecutivo.
- `test/e2e/ventas.e2e-spec.ts`: la API completa con el cajero, campos de más, otra empresa y una empresa sin habilitar.
- `test/unitarias/facturacion/comprobante/`: comprobante, correo, renderizador (PDF determinista), Brevo con transporte falso y los casos de uso. `test/integracion/ventas/comprobante-y-correo.int-spec.ts`: el correo se pide al aceptar, dos procesadores no lo mandan dos veces, la función de vencidos (solo lectura) y lo que `conta_api` no puede cambiar.
- `test/habilitacion/`: envío **real** al set de pruebas. Solo corre en el workflow manual «Habilitación DIAN» con el entorno `SECRETOS`.

## Qué falta, y en qué historia

- Custodia del certificado cifrada con KMS, NIT del certificado frente al del emisor, y auditoría de cada uso: HU-07.02.
- AttachedDocument con el `ApplicationResponse` guardado, como adjunto del correo, antes de clientes reales: historia aparte (ADR-0015).
- Adaptador durable de colas definitivo (reemplaza la tabla y el despertador): HU-06.04.
- Envío en producción (`SendBillAsync`): HU-06.04 con la habilitación (EP-07). Hoy el envío va al set de pruebas.
- Alertas de rango por agotarse: HU-06.07.
- Preferencia del negocio «siempre factura» y software POS por empresa desde la pantalla de configuración DIAN: EP-07.
- Configuración DIAN y datos fiscales por empresa desde la consola, en lugar del entorno y el comando: EP-07.
- INC, ICA, descuentos, cargos, retenciones, otras monedas y notas crédito y débito: EP-06.
