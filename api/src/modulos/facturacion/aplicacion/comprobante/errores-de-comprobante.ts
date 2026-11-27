import { ErrorDominio } from '../../../../compartido/dominio/index.js';

// Por qué todavía no hay comprobante para compartir. Códigos estables: la app decide con ellos si espera o avisa.

/** La DIAN aún no la aprueba (o falta firmarla): el comprobante sale apenas la apruebe. */
export const comprobanteEnCamino = () =>
  new ErrorDominio('comprobante.en-camino', 'La factura todavía va para la DIAN. La puedes compartir apenas la apruebe');

/** La DIAN la rechazó: esa factura no vale y no se comparte. */
export const comprobanteRechazado = () =>
  new ErrorDominio('comprobante.rechazado', 'La DIAN no aceptó esta factura, así que no se puede compartir');
