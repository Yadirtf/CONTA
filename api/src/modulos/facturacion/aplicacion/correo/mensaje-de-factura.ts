import type { ComprobanteArmado } from '../comprobante/armar-comprobante.js';
import type { CorreoSaliente } from '../puertos/enviador-de-correo.js';

/**
 * El correo de la factura aceptada (HU-06.08): texto corto con el número, el total y el CUFE, y como adjuntos el
 * PDF y el XML firmado. El AttachedDocument (contenedor del anexo) llega en una historia aparte.
 */
export function mensajeDeFactura(
  { comprobante, xmlFirmado, correoDelEmisor }: ComprobanteArmado,
  para: string,
  pdf: Uint8Array,
  idempotencia: string,
): CorreoSaliente {
  const total = comprobante.totales.at(-1)?.[1] ?? '';
  const emisor = comprobante.emisor.nombre;
  return {
    para,
    responderA: correoDelEmisor,
    nombreDelRemitente: emisor,
    asunto: `Factura electrónica ${comprobante.numero} de ${emisor}`,
    texto: [
      `Hola, ${comprobante.adquirente.nombre}:`,
      '',
      `Te enviamos la factura electrónica ${comprobante.numero} por ${total}, aprobada por la DIAN.`,
      'Van adjuntos el PDF y el archivo XML.',
      '',
      `CUFE: ${comprobante.cufe}`,
      `Consúltala en la DIAN: ${comprobante.codigoQr}`,
      '',
      emisor,
    ].join('\n'),
    adjuntos: [
      { nombre: comprobante.nombreDeArchivo, tipo: 'application/pdf', contenido: pdf },
      {
        nombre: comprobante.nombreDeArchivo.replace(/\.pdf$/, '.xml'),
        tipo: 'application/xml',
        contenido: new TextEncoder().encode(xmlFirmado),
      },
    ],
    idempotencia,
  };
}
