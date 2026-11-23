# test/recursos/firma

Apoyo para las pruebas de la firma XAdES (HU-02.02). Aquí no se guarda ningún certificado.

- `certificados-de-prueba.ts` crea en memoria, en cada corrida, una CA ficticia y un certificado de firma emitido por ella. Los empaqueta en un .p12 cifrado con 3DES o AES-256. Las opciones permiten probar certificados vencidos, sin no repudio o con llave corta.
- `verificador-xmlsec.ts` verifica una factura firmada con `xmlsec1` (libxmlsec), que confía en la CA de prueba. Con el mismo verificador se comprobó una factura real que la DIAN aceptó. Solo escribe en una carpeta temporal datos públicos: el XML firmado y el certificado de la CA. La carpeta se borra al terminar.

`xmlsec1` es obligatorio en CI (`CI=true`), donde lo instala `ci-api.yml`. En un equipo sin él, las pruebas que lo usan se omiten. Para instalarlo en Debian o Ubuntu: `sudo apt-get install xmlsec1`.
