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
- `test/habilitacion/`: envío **real** al set de pruebas. Solo corre en el workflow manual «Habilitación DIAN» con el entorno `SECRETOS`.

## Qué falta, y en qué historia

- Custodia del certificado cifrada con KMS, NIT del certificado frente al del emisor, y auditoría de cada uso: HU-07.02.
- Adaptador durable de colas definitivo (reemplaza la tabla y el despertador): HU-06.04.
- Envío en producción (`SendBillAsync`) y numeración real: HU-06.01 y HU-06.07.
- Persistencia, endpoint y numeración automática: HU-06.01 y HU-06.07.
- INC, ICA, descuentos, cargos, retenciones, otras monedas y notas crédito y débito: EP-06.
