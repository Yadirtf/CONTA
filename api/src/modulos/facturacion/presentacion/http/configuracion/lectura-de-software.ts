import type { ClaseDeDocumento, SoftwareEscrito } from '../../../dominio/index.js';
import { camposDe, texto, textoONulo } from './lectura-comun.js';

/** Lee el cuerpo de PUT /configuracion-dian/software/:clase. Sin `pin`, queda el guardado. */
export function softwareDe(clase: ClaseDeDocumento, cuerpo: unknown): SoftwareEscrito {
  const c = camposDe(cuerpo);
  const fabricante = c['fabricante'] === undefined || c['fabricante'] === null ? null : camposDe(c['fabricante']);
  return {
    clase,
    idSoftware: texto(c['idSoftware'], 'idSoftware', 60),
    pin: textoONulo(c['pin'], 'pin', 60),
    testSetId: texto(c['testSetId'], 'testSetId', 60),
    fabricante: fabricante && {
      nombre: texto(fabricante['nombre'], 'fabricante.nombre', 300),
      razonSocial: texto(fabricante['razonSocial'], 'fabricante.razonSocial', 300),
    },
  };
}
