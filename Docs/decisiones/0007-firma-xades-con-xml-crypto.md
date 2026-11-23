# ADR-0007. Firma XAdES-EPES: xml-crypto para XMLDSig, propiedades XAdES propias y node-forge para el .p12

- Estado: Aceptado
- Fecha: 2026-11-23
- Historia: HU-02.02
- Decide: Inge

## Contexto

La DIAN solo acepta facturas firmadas según su política de firma v2 (anexo técnico 1.9, sección 10):

- XMLDSig *enveloped* con XAdES-EPES (ETSI 1.3.2), dentro de una segunda `ext:UBLExtension`;
- C14N 1.0 inclusivo, RSA-SHA256 y resúmenes SHA-256;
- tres referencias, al documento (`URI=""`), al `KeyInfo` y a las `SignedProperties`;
- la hora de la firma, el certificado firmante, la política con su hash y el rol del firmante.

Restricciones duras:

- El dominio no importa frameworks ni Node.
- El certificado y su contraseña se descifran solo en memoria y nunca llegan a disco ni a logs.
- Capas gratuitas: Render con runtime de Node nativo, sin Docker.
- Versiones exactas publicadas hace al menos dos semanas.
- Una persona mantiene todo.

Node no lee PKCS#12. Además, los .p12 de las entidades certificadoras colombianas suelen venir cifrados con 3DES o RC2, que WebCrypto no soporta.

Pregunta: ¿librería existente o implementación propia?

## Alternativas consideradas (Verbalized Sampling)

Ronda completa y ronda de cola (k = 5). Las evaluó otro agente, y un tercero hizo de atacante (contrapunto abajo).

| # | Alternativa | Prob. verbalizada | Ronda | Puntaje ponderado | Resultado |
| - | ----------- | ----------------- | ----- | ----------------- | --------- |
| 1 | xml-crypto (C14N, referencias y firma) + propiedades XAdES con el escritor propio + node-forge para el .p12 | 0,35 | Completa | **4,35** | **Elegida** |
| 2 | xadesjs 3.x (XAdES-EPES nativo sobre WebCrypto) | 0,25 | Completa | 4,10 | Segunda |
| 3 | Implementación propia completa: C14N genérico sobre un árbol + `node:crypto` | 0,15 | Completa | 3,10 | Rechazada (la 6 es su versión acotada) |
| 4 | Invocar el CLI `xmlsec1` desde la API | 0,15 | Completa | — | Descartada: la llave pasa por archivo y Render nativo no garantiza el binario |
| 5 | Servicio externo de firma | 0,10 | Completa | — | Descartada: el certificado sale de la API |
| 6 | Canónico por construcción: el escritor emite C14N directamente y `node:crypto` firma | 0,07 | Cola | 3,50 | Se toma solo su verificación externa en CI |
| 7 | libxmlsec en WebAssembly o un sidecar en Rust/Go | 0,05 | Cola | — | Descartada: otro runtime que mantener |
| 8 | Microservicio Java con EU DSS | 0,04 | Cola | — | Descartada: otro servicio fuera de la capa gratuita |
| 9 | Llave en un KMS o HSM en la nube | 0,06 | Cola | — | Aplazada: no compite con las demás y entra detrás del mismo puerto |
| 10 | Firmar en la app del cliente | 0,03 | Cola | — | Descartada: saca una regla fiscal de `api/` |

## Criterios y evaluación

Pesos: facilidad de cambiar de tecnología 25 %, simplicidad 25 %, pruebas sin red 20 %, costo por cliente 15 %, tiempo 15 %. El riesgo de rechazo por la DIAN (errores de canonicalización) se usó para desempatar.

| Alternativa | Cambio | Simplicidad | Pruebas | Costo | Tiempo | Puntaje |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 4 | 4 | 5 | 5 | 4 | **4,35** |
| 2 | 4 | 3 | 5 | 5 | 4 | 4,10 |
| 3 | 3 | 2 | 4 | 5 | 2 | 3,10 |
| 6 | 3 | 3 | 4 | 5 | 3 | 3,50 |

- **1 frente a 6.** xml-crypto aplica C14N inclusivo real sobre el árbol, con los espacios de nombres heredados de `Invoice`. La 6 lo imitaría a mano, y un error ahí es un rechazo de la DIAN difícil de diagnosticar.
- **1 frente a 2.** En xadesjs, la 3.0 es una versión mayor de hace un mes y la 3.1.0 tiene apenas 14 días. Su API asíncrona sobre WebCrypto pide más código, y WebCrypto no abre los .p12 con 3DES o RC2.

### Contrapunto del atacante

Un agente buscó formas de comprometer el certificado o de abusar de la firma.

| Ataque | Daño | Mitigación en HU-02.02 |
| --- | --- | --- |
| Envoltura XML (*wrapping*): firmar o verificar una parte distinta de la que se lee | Una empresa | Se firma el documento entero (`URI=""`). Antes de firmar, el firmador rechaza DTD, entidades, más de una `Invoice`, una firma previa y extensiones de más o de menos. Después de firmar, vuelve a leer la salida y exige una sola firma, las tres referencias esperadas y que valide. Cada caso tiene su prueba. |
| Llave o contraseña en logs, errores o volcados | Todas | `CertificadoDeFirma` guarda los bytes y la contraseña en campos `#` privados, y JSON, `inspect` y `String` muestran `[CertificadoDeFirma]`. Los errores son `CertificadoNoUtilizable` o `DocumentoNoFirmable`, con mensaje fijo y sin `cause`. La llave queda como `KeyObject`, nunca como PEM, y los búferes intermedios se borran con ceros. Hay pruebas de que nada de eso se filtra y de que el código de firma no importa `fs` ni un logger. |
| Dependencia npm comprometida que copia la llave | Todas | Versiones exactas con *lockfile*, una sola librería criptográfica por tarea, y node-forge aislado en `lector-pkcs12.ts`. **Pendiente:** `npm ci --ignore-scripts` y `npm audit` en CI, en una historia de CI aparte. |
| Firma cruzada entre empresas por una caché de llaves en memoria | Una empresa | El firmador abre el .p12 en cada llamada y no guarda nada entre llamadas. **Pendiente para HU-07.02:** que la empresa salga solo del contexto autenticado y que el NIT del certificado coincida con el del emisor. |
| Backup o rama de Neon con el .p12 y la contraseña juntos | Todas | **HU-07.02:** cifrado con KMS, .p12 y contraseña guardados por separado, y auditoría de cada descifrado. Mientras tanto, solo certificados de habilitación. |

## Decisión

Se elige la **alternativa 1 (típica)**, con la verificación externa de la **6 de la cola**:

- **xml-crypto 6.4.0** con **@xmldom/xmldom 0.8.15**, la versión que pide xml-crypto. Calcula la `ds:Signature` y la inserta en la segunda `UBLExtension`. Las referencias al `KeyInfo` y a las `SignedProperties` se resuelven ya dentro de la firma.
- **Propiedades XAdES propias.** `xades:QualifyingProperties` se arma con el escritor de XML de HU-02.01, en `propiedades-xades.ts`:
  - `SigningTime` en hora de Colombia;
  - `SigningCertificate` con el SHA-256 del certificado e `IssuerSerial` (RFC 4514);
  - la política v2 con su hash;
  - `SignerRole`;
  - `DataObjectFormat`.
- **node-forge 1.4.3** solo para abrir el .p12. Se fijó en 1.4.3 porque la 1.4.4 tiene menos de dos semanas.
- **Puerto `FirmadorDeDocumentos`** en `aplicacion/`, adaptador `FirmadorXadesDian` en `infraestructura/dian-directa/firma/`. Cada paso vive en su propio archivo.
- **Verificador externo.** `xmlsec1` (libxmlsec) verifica en CI cada firma de prueba, confiando en la CA de prueba, y rechaza una factura alterada. La firma también se valida contra los XSD de XMLDSig y XAdES 1.3.2.

## Consecuencias

- Se gana una canonicalización probada por terceros, sin binarios del sistema en producción ni servicios pagos. Cambiar de librería toca solo `firma-xmldsig.ts` (xml-crypto) o `lector-pkcs12.ts` (node-forge).
- Se pierde el control fino de cada byte de la firma. Lo compensan las pruebas con xmlsec1 y con los XSD.
- node-forge trabaja con cadenas binarias de JavaScript que no se pueden borrar. La llave descifrada puede quedar en memoria hasta que el recolector de basura la libere. Solo un KMS o HSM con firma remota (alternativa 9) lo cierra del todo.
- Revertir: otro adaptador del puerto `FirmadorDeDocumentos`, sin tocar el dominio ni la aplicación.
