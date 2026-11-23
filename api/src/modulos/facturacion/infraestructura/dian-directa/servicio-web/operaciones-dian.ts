import { el, grupo, type NodoXml } from '../xml/escritor-xml.js';

// Cuerpos de las operaciones del servicio web que usa CONTA. Los parámetros van en el espacio wcf.

export function cuerpoSendTestSetAsync(nombreZip: string, zip: Buffer, testSetId: string): NodoXml {
  return grupo('wcf:SendTestSetAsync', [
    el('wcf:fileName', nombreZip),
    el('wcf:contentFile', zip.toString('base64')),
    el('wcf:testSetId', testSetId),
  ]);
}

export function cuerpoGetStatusZip(zipKey: string): NodoXml {
  return grupo('wcf:GetStatusZip', [el('wcf:trackId', zipKey)]);
}
