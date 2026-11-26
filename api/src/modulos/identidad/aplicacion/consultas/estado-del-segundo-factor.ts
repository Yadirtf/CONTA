import type { Reloj } from '../../../../compartido/aplicacion/index.js';
import { segundoFactorHasta, tieneSegundoFactorVigente } from '../../dominio/index.js';
import type { SesionConUsuario, UnidadDeTrabajoDeIdentidad } from '../puertos/repositorios-de-identidad.js';

export interface EstadoDelSegundoFactor {
  /** true si la persona ya tiene una app autenticadora confirmada. */
  readonly inscrito: boolean;
  /** Hasta cuándo vale la verificación de esta sesión, o null si no está verificada. */
  readonly verificadaHasta: Date | null;
  readonly codigosDeRecuperacionRestantes: number;
}

/** Le dice a la app si debe configurar la app autenticadora o pedir un código (HU-04.04). */
export class ConsultarSegundoFactor {
  constructor(
    private readonly uow: UnidadDeTrabajoDeIdentidad,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar({ sesion, usuario }: SesionConUsuario): Promise<EstadoDelSegundoFactor> {
    const factor = await this.uow.ejecutar(({ segundosFactores }) => segundosFactores.tomar(usuario.id));
    const vigente = tieneSegundoFactorVigente(sesion, this.reloj.ahora());
    return {
      inscrito: factor.inscrito,
      verificadaHasta: vigente ? segundoFactorHasta(sesion) : null,
      codigosDeRecuperacionRestantes: factor.foto.huellasDeRecuperacion.length,
    };
  }
}
