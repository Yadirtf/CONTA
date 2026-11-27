import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import { CorreoAlAceptar } from '../../../aplicacion/correo/correo-al-aceptar.js';
import type { AvisosDeAceptacion } from '../../../aplicacion/puertos/avisos-de-aceptacion.js';
import { RepositorioDeVentasPostgres } from '../ventas/repositorio-de-ventas-postgres.js';
import { RepositorioDeCorreosPostgres } from './repositorio-de-correos-postgres.js';

/** Los avisos de aceptación atados a la misma transacción del envío: hoy, el correo de la factura (HU-06.08). */
export function avisosDeAceptacionPostgres(ejecutor: Ejecutor): AvisosDeAceptacion {
  return new CorreoAlAceptar(new RepositorioDeVentasPostgres(ejecutor), new RepositorioDeCorreosPostgres(ejecutor));
}
