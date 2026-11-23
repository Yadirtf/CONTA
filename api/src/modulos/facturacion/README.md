# modulos/facturacion

Factura electrónica de venta según el **anexo técnico 1.9** de la DIAN (Resolución 000165 de 2023).

## Qué hay (HU-02.01)

| Capa | Contenido |
| --- | --- |
| `dominio/` | `Factura`, `LineaDeFactura`, `ResolucionDeNumeracion` y los objetos de valor `NumeroDeFactura`, `Identificacion`, `MomentoDeEmision`, `TarifaIva`, `Participante`. Los totales salen siempre de las líneas, redondeados a 2 decimales con mitad al par ([ADR-0005](../../../../Docs/decisiones/0005-dinero-con-decimal-exacto-propio.md)). |
| `aplicacion/` | Comando `GenerarXmlFactura` y puerto `GeneradorDeDocumentoElectronico` con su `ConfiguracionDian` (ambiente, clave técnica, software y PIN). |
| `infraestructura/dian-directa/` | `GeneradorUblDian` (XML UBL 2.1 sin firmar), `cufe.ts` (CUFE y `SoftwareSecurityCode` con SHA-384) y un escritor de XML propio. |

## Reglas del anexo que se aplican

- **CUFE** (11.2): `SHA-384(NumFac + FecFac + HorFac + ValFac + 01 + ValImp1 + 04 + ValImp2 + 03 + ValImp3 + ValTot + NitFE + NumAdq + ClTec + TipoAmbiente)`, con los mismos textos que quedan en el XML. La prueba reproduce el ejemplo oficial de la sección 11.2.1.
- **Código de seguridad del software** (11.8): `SHA-384(IdSoftware + PIN + NumFac)`.
- **QR** (11.7.1): URL de consulta de la DIAN con el CUFE, de habilitación o de producción según el ambiente.
- **Numeración** (FAB07 a FAB12): mismo prefijo que la resolución, número dentro del rango y fecha de emisión vigente.
- **Fecha y hora** (5.4): hora legal de Colombia, `hh:mm:ss-05:00`.
- **Valores** (5.2.1 y tabla 5): punto decimal, sin separador de miles, 2 decimales en los montos y hasta 6 en cantidades y precios.

La clave técnica y el PIN del software son valores reservados: entran solo al cálculo de los códigos, nunca al XML ni a los mensajes de error.

## Por qué un escritor de XML propio

El XML se escribe sin indentación ni espacios y con el orden del esquema, siempre igual para los mismos datos. Así lo que se firma en HU-02.02 es exactamente lo que se generó, y no hay una dependencia más. El escritor escapa `&`, `<`, `>` y `"` y rechaza caracteres que XML no admite, para que un dato del usuario no pueda inyectar marcado.

## Pruebas

- `test/unitarias/facturacion/`: dominio, CUFE con el ejemplo del anexo y una factura de dos líneas (IVA 19 % y 0 %) validada contra los XSD oficiales ([`test/recursos/dian/`](../../../test/recursos/dian/README.md)).
- `infraestructura/dian-directa/*.spec.ts`: escritor de XML y CUFE.

## Qué falta, y en qué historia

- Firma XAdES: HU-02.02.
- Envío al ambiente de habilitación y respuesta de la DIAN: HU-02.03.
- Persistencia, endpoint y numeración automática: HU-06.01 y HU-06.07.
- INC, ICA, descuentos, cargos, retenciones, otras monedas y notas crédito y débito: EP-06.
