# Esquemas XSD de la DIAN (solo pruebas)

Copias de los esquemas con los que se valida el XML de la factura electrónica (HU-02.01). Viven en `test/`: no se compilan ni se despliegan.

| Archivo | Origen | Verificación |
| --- | --- | --- |
| `xsd/common/*.xsd`, `xsd/maindoc/UBL-Invoice-2.1.xsd` | UBL 2.1 de OASIS (os-UBL-2.1), los que la DIAN publica en su caja de herramientas | Iguales, salvo espacios, a la copia de OASIS que usa el proyecto OCA/edi |
| `xsd/maindoc/DIAN_UBL_Structures.xsd` | Extensiones de la DIAN (`sts:`), caja de herramientas de la factura electrónica | Idéntico en dos repositorios públicos independientes |

El sitio de la DIAN no es accesible desde el entorno de CI, por eso las copias están aquí. Si la DIAN publica una versión nueva, se reemplazan los archivos y se corren las pruebas.

## Cómo se valida

[`validador-xsd.ts`](validador-xsd.ts) usa `xmllint-wasm` (libxml2 compilado a WebAssembly, sin red ni binarios del sistema):

1. El documento completo contra `UBL-Invoice-2.1.xsd`. UBL procesa `ext:ExtensionContent` en modo *lax*, así que aquí no se revisan las extensiones de la DIAN.
2. `sts:DianExtensions`, extraído del documento, contra `DIAN_UBL_Structures.xsd`.

## Contradicción conocida del esquema de la DIAN

`DIAN_UBL_Structures.xsd` enumera en el atributo `schemeID` de `sts:ProviderID` y `sts:AuthorizationProviderID` los códigos de tipo de documento (11, 13, 31...). El anexo técnico 1.9 pide ahí el **dígito de verificación** del NIT (regla FAB22) y el tipo de documento en `schemeName` («31»), y así vienen las facturas que la DIAN acepta. La prueba sigue el anexo y tolera solo ese error, en esos dos elementos; cualquier otro error la hace fallar.
