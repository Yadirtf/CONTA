// Puerto de aplicación: la hora entra por aquí para que los casos de uso se prueben sin depender del reloj real.
export interface Reloj {
  ahora(): Date;
}

export const RELOJ = Symbol('Reloj');
