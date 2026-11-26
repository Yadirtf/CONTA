import type { ContextoDeMiembro, Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { exigirPermiso, type Modo, Permiso, type Rol } from '../../../../compartido/dominio/index.js';
import { comprobarQuePuedeInvitar, UN_DIA_EN_MS } from '../../dominio/limites-de-miembros.js';
import { Membresia } from '../../dominio/membresia.js';
import { exigirQueNoTengaMembresia } from '../../dominio/reglas-de-gestion.js';
import type { DirectorioDePersonas } from '../puertos/directorio-de-personas.js';
import type { RepositoriosDeEmpresas } from '../puertos/repositorio-empresas.js';
import { autorizarGestion } from './autorizar-gestion.js';

export interface Invitacion {
  readonly celular: string;
  readonly rol: Rol;
  readonly modo?: Modo;
}

/** Membresía con el celular enmascarado de su persona, tal como la ve quien gestiona la empresa. */
export interface MiembroConCelular {
  readonly membresia: Membresia;
  readonly celular: string;
}

/**
 * El dueño invita a una persona por su celular, con un rol (HU-04.03). La persona queda registrada si no lo
 * estaba, y la invitación espera a que la acepte al entrar. La respuesta es la misma exista o no el celular.
 */
export class InvitarMiembro {
  constructor(
    private readonly empresas: UnidadDeTrabajo<RepositoriosDeEmpresas>,
    private readonly directorio: DirectorioDePersonas,
    private readonly reloj: Reloj,
    private readonly nuevoId: () => string = () => crypto.randomUUID(),
  ) {}

  async ejecutar(contexto: ContextoDeMiembro, invitacion: Invitacion): Promise<MiembroConCelular> {
    // Antes de registrar a nadie: quien no puede invitar no crea personas en identidad.
    exigirPermiso(contexto.rol, Permiso.GestionarMiembros);
    const usuarioId = await this.directorio.registrar(invitacion.celular);
    const ahora = this.reloj.ahora();
    const haceUnDia = new Date(ahora.getTime() - UN_DIA_EN_MS);

    const membresia = await this.empresas.ejecutar(contexto, async ({ membresias }) => {
      await autorizarGestion(membresias, contexto.usuarioId, Permiso.GestionarMiembros);
      exigirQueNoTengaMembresia(await membresias.vigenteDe(usuarioId));
      comprobarQuePuedeInvitar(await membresias.contarVigentes(), await membresias.contarInvitacionesDesde(haceUnDia));
      const nueva = Membresia.invitar({
        id: this.nuevoId(),
        empresaId: contexto.empresaId,
        usuarioId,
        rol: invitacion.rol,
        modo: invitacion.modo,
        invitadaPor: contexto.usuarioId,
        ahora,
      });
      await membresias.agregar(nueva);
      return nueva;
    });

    const celulares = await this.directorio.celularesDe([usuarioId]);
    return { membresia, celular: celulares.get(usuarioId.valor) ?? '' };
  }
}
