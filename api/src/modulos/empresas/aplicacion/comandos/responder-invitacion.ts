import type { Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { ErrorDominio, type IdEmpresa, type IdUsuario } from '../../../../compartido/dominio/index.js';
import type { RepositoriosDeEmpresas } from '../puertos/repositorio-empresas.js';

export type RespuestaAInvitacion = 'aceptar' | 'rechazar';

/**
 * La persona invitada acepta o rechaza entrar a la empresa (HU-04.03). Corre en la transacción de esa empresa,
 * así que RLS filtra: sin invitación propia, la respuesta es la misma que para una empresa ajena.
 */
export class ResponderInvitacion {
  constructor(
    private readonly empresas: UnidadDeTrabajo<RepositoriosDeEmpresas>,
    private readonly reloj: Reloj,
  ) {}

  ejecutar(usuarioId: IdUsuario, empresaId: IdEmpresa, respuesta: RespuestaAInvitacion): Promise<void> {
    return this.empresas.ejecutar({ empresaId }, async ({ membresias }) => {
      const membresia = await membresias.tomarVigente(usuarioId);
      if (membresia?.estado !== 'invitada') {
        throw new ErrorDominio('invitacion.no-encontrada', 'No tienes una invitación pendiente en esta empresa');
      }
      if (respuesta === 'aceptar') membresia.aceptar(this.reloj.ahora());
      else membresia.rechazar(this.reloj.ahora());
      await membresias.guardar(membresia);
    });
  }
}
