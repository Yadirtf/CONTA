import type { Reloj } from '../../../../compartido/aplicacion/index.js';
import { Celular, IdUsuario } from '../../dominio/index.js';
import type { UnidadDeTrabajoDeIdentidad } from '../puertos/repositorios-de-identidad.js';
import type { HuellasDeAcceso } from '../puertos/secretos-de-acceso.js';

/**
 * Da el id de la persona de un celular y la registra si no existía (HU-04.03: el dueño invita a su cajero).
 * Registrar es solo guardar el celular: la persona entra después con su código, como cualquiera. Responde
 * igual exista o no, para que quien invita no sepa quién usa CONTA.
 */
export class RegistrarPersona {
  constructor(
    private readonly uow: UnidadDeTrabajoDeIdentidad,
    private readonly huellas: HuellasDeAcceso,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(textoDelCelular: string): Promise<IdUsuario> {
    const celular = Celular.de(textoDelCelular);
    const usuario = await this.uow.ejecutar(async ({ usuarios }) => {
      const existente = await usuarios.buscarPorCelular(celular);
      return existente ?? usuarios.crearOBuscar({ id: IdUsuario.de(this.huellas.nuevoId()), celular, creadoEn: this.reloj.ahora() });
    });
    return usuario.id;
  }
}
