// Lee el texto del QR (sts:QRCode, anexo 11.7.1) del XML que escribió GeneradorUblDian. Ese escritor es
// determinista y escapa solo & < > ", así que basta una búsqueda exacta y deshacer esos cuatro escapes.
const QR = /<sts:QRCode>([^<]{1,1000})<\/sts:QRCode>/;
const ESCAPES: Readonly<Record<string, string>> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' };

export function codigoQrDelXml(xml: string): string {
  const encontrado = QR.exec(xml)?.[1];
  if (encontrado === undefined) throw new Error('El XML firmado no trae sts:QRCode');
  return encontrado.replace(/&(amp|lt|gt|quot);/g, (e) => ESCAPES[e] ?? e);
}
