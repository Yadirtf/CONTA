import { Identificacion, Nit } from '../../../../../compartido/dominio/index.js';
import { participante, type Participante } from '../../../dominio/index.js';
import type { datosFiscales } from '../ventas/tablas-ventas.js';

type FilaDeDatosFiscales = typeof datosFiscales.$inferSelect;

/** Fila de conta.datos_fiscales → el facturador como va en la factura. Lo usan la venta y la configuración DIAN. */
export function participanteDeFila(f: FilaDeDatosFiscales): Participante {
  return participante({
    identificacion: Identificacion.nit(Nit.de(f.nit)),
    razonSocial: f.razonSocial,
    tipoDePersona: f.tipoDePersona === 'natural' ? 'natural' : 'juridica',
    responsabilidadesFiscales: f.responsabilidadesFiscales,
    responsableDeIva: f.responsableDeIva,
    direccion: { codigoMunicipio: f.codigoMunicipio, ciudad: f.ciudad, departamento: f.departamento, linea: f.direccion },
    correo: f.correo,
  });
}
