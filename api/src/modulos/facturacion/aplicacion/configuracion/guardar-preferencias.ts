import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import type { RepositoriosDeConfiguracion } from '../puertos/repositorios-de-configuracion.js';
import { exigirDuenoVerificado } from './exigir-dueno-verificado.js';

/** HU-07.04: «siempre factura»: el negocio nunca emite tiquete POS, aunque lo tenga habilitado (ADR-0016). */
export class GuardarPreferencias {
  constructor(private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeConfiguracion>) {}

  async ejecutar(contexto: ContextoDeMiembro, siempreFactura: boolean): Promise<void> {
    exigirDuenoVerificado(contexto, 'cambiar');
    await this.unidadDeTrabajo.ejecutar(contexto, async ({ preferencias, bitacora }) => {
      // Sin cambio, no se escribe nada: repetir el mismo valor no llena la bitácora (hallazgo B5).
      if ((await preferencias.siempreFactura()) === siempreFactura) return;
      await preferencias.guardar(siempreFactura, contexto.usuarioId.valor);
      await bitacora.anotar('preferencias', contexto.usuarioId.valor);
    });
  }
}
