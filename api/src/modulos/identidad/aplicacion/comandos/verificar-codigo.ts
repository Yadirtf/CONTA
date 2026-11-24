import type { Reloj } from '../../../../compartido/aplicacion/index.js';
import { abrirSesion, Celular, IdUsuario, type Usuario } from '../../dominio/index.js';
import type { UnidadDeTrabajoDeIdentidad } from '../puertos/repositorios-de-identidad.js';
import type { HuellasDeAcceso } from '../puertos/secretos-de-acceso.js';

export interface SesionAbierta {
  /** Token para el encabezado Authorization. Solo viaja en esta respuesta; la base guarda su huella. */
  readonly token: string;
  readonly venceEn: Date;
  readonly usuario: Usuario;
  /** true si este acceso registró a la persona. */
  readonly nuevo: boolean;
}

/**
 * Verifica el código y abre una sesión (HU-04.01). La primera vez registra a la persona. Un fallo se guarda
 * antes de responder: la transacción termina bien y el rechazo se lanza después, si no el contador de
 * intentos se desharía con ella.
 */
export class VerificarCodigo {
  constructor(
    private readonly uow: UnidadDeTrabajoDeIdentidad,
    private readonly huellas: HuellasDeAcceso,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(textoDelCelular: string, codigo: string): Promise<SesionAbierta> {
    const celular = Celular.de(textoDelCelular);
    const ahora = this.reloj.ahora();
    const resultado = await this.uow.ejecutar(async ({ accesos, usuarios, sesiones }) => {
      const acceso = await accesos.tomar(celular);
      const verificacion = acceso.verificar(ahora, (huella) => this.huellas.coincideCodigo(celular, codigo, huella));
      await accesos.guardar(acceso);
      if (!verificacion.acerto) return verificacion;

      const existente = await usuarios.buscarPorCelular(celular);
      const usuario =
        existente ?? (await usuarios.crearOBuscar({ id: IdUsuario.de(this.huellas.nuevoId()), celular, creadoEn: ahora }));
      const token = this.huellas.nuevoToken();
      const sesion = abrirSesion(this.huellas.nuevoId(), usuario.id, ahora);
      await sesiones.abrir(sesion, this.huellas.huellaDeToken(token));
      return { acerto: true as const, sesion: { token, venceEn: sesion.venceEn, usuario, nuevo: existente === null } };
    });
    if (!resultado.acerto) throw resultado.error;
    return resultado.sesion;
  }
}
