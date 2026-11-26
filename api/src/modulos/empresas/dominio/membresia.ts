import {
  ErrorDominio,
  type IdEmpresa,
  type IdUsuario,
  type Modo,
  modoPermitido,
  modoPorDefecto,
  type Rol,
} from '../../../compartido/dominio/index.js';

/** invitada: aún no la acepta · activa: trabaja en la empresa · retirada: ya no pertenece (la fila no se borra). */
export type EstadoDeMembresia = 'invitada' | 'activa' | 'retirada';

export interface Retiro {
  readonly en: Date;
  readonly por: IdUsuario;
}

export interface DatosDeMembresia {
  readonly id: string;
  readonly empresaId: IdEmpresa;
  readonly usuarioId: IdUsuario;
  readonly rol: Rol;
  readonly modo: Modo;
  readonly creadaEn: Date;
  readonly invitadaPor: IdUsuario | null;
  readonly aceptadaEn: Date | null;
  readonly retiro: Retiro | null;
}

/**
 * Pertenencia de una persona a una empresa, con su rol y su modo (HU-04.02 y HU-04.03, ADR-0012). Sin una
 * membresía activa, la empresa no existe para esa persona. Una membresía retirada no vuelve: si la persona
 * regresa, se crea otra y la historia queda.
 */
export class Membresia {
  private constructor(private datos: DatosDeMembresia) {}

  /** Quien crea la empresa: dueño, activo desde ya y en modo simple. */
  static fundadora(id: string, empresaId: IdEmpresa, usuarioId: IdUsuario, ahora: Date): Membresia {
    return new Membresia({ id, empresaId, usuarioId, rol: 'dueno', modo: 'simple', creadaEn: ahora, invitadaPor: null, aceptadaEn: ahora, retiro: null });
  }

  /** Invitación de un miembro: queda invitada hasta que la persona la acepte al entrar. */
  static invitar(datos: {
    id: string;
    empresaId: IdEmpresa;
    usuarioId: IdUsuario;
    rol: Rol;
    modo?: Modo;
    invitadaPor: IdUsuario;
    ahora: Date;
  }): Membresia {
    const modo = datos.modo ?? modoPorDefecto(datos.rol);
    exigirModoPermitido(datos.rol, modo);
    const { ahora, ...resto } = datos;
    return new Membresia({ ...resto, modo, creadaEn: ahora, aceptadaEn: null, retiro: null });
  }

  /** Para los repositorios: vuelve a armar una membresía guardada, sin validar de nuevo. */
  static reconstruir(datos: DatosDeMembresia): Membresia {
    return new Membresia(datos);
  }

  get id(): string {
    return this.datos.id;
  }
  get empresaId(): IdEmpresa {
    return this.datos.empresaId;
  }
  get usuarioId(): IdUsuario {
    return this.datos.usuarioId;
  }
  get rol(): Rol {
    return this.datos.rol;
  }
  get modo(): Modo {
    return this.datos.modo;
  }
  get creadaEn(): Date {
    return this.datos.creadaEn;
  }
  get invitadaPor(): IdUsuario | null {
    return this.datos.invitadaPor;
  }
  get aceptadaEn(): Date | null {
    return this.datos.aceptadaEn;
  }
  get retiro(): Retiro | null {
    return this.datos.retiro;
  }

  get estado(): EstadoDeMembresia {
    if (this.datos.retiro) return 'retirada';
    return this.datos.aceptadaEn ? 'activa' : 'invitada';
  }

  esDe(usuarioId: IdUsuario): boolean {
    return this.datos.usuarioId.valor === usuarioId.valor;
  }

  aceptar(ahora: Date): void {
    this.exigirEstado('invitada');
    this.datos = { ...this.datos, aceptadaEn: ahora };
  }

  /** Quien recibe la invitación dice que no: la membresía queda retirada por esa misma persona. */
  rechazar(ahora: Date): void {
    this.exigirEstado('invitada');
    this.datos = { ...this.datos, retiro: { en: ahora, por: this.datos.usuarioId } };
  }

  retirar(por: IdUsuario, ahora: Date): void {
    this.exigirVigente();
    this.datos = { ...this.datos, retiro: { en: ahora, por } };
  }

  /** Cambia el rol. Si el modo actual no se permite con el rol nuevo, vuelve al modo simple. */
  cambiarRol(rol: Rol): void {
    this.exigirVigente();
    const modo = modoPermitido(rol, this.datos.modo) ? this.datos.modo : 'simple';
    this.datos = { ...this.datos, rol, modo };
  }

  cambiarModo(modo: Modo): void {
    this.exigirVigente();
    exigirModoPermitido(this.datos.rol, modo);
    this.datos = { ...this.datos, modo };
  }

  private exigirVigente(): void {
    if (this.estado === 'retirada') throw new ErrorDominio('miembro.retirado', 'Esta persona ya no pertenece a la empresa');
  }

  private exigirEstado(estado: EstadoDeMembresia): void {
    if (this.estado !== estado) throw new ErrorDominio('invitacion.no-encontrada', 'No tienes una invitación pendiente en esta empresa');
  }
}

function exigirModoPermitido(rol: Rol, modo: Modo): void {
  if (!modoPermitido(rol, modo)) throw new ErrorDominio('miembro.modo-no-permitido', 'Ese rol no puede trabajar en modo contador');
}
