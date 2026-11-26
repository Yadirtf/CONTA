import { esModo, esRol, IdEmpresa, IdUsuario } from '../../../../compartido/dominio/index.js';
import type { membresias } from '../../../../compartido/infraestructura/persistencia/esquema.js';
import { Membresia } from '../../dominio/membresia.js';

type Fila = typeof membresias.$inferSelect;
type FilaNueva = typeof membresias.$inferInsert;

/** Convierte una fila de conta.membresias en la entidad. Un rol o modo desconocido es un error de datos. */
export function membresiaDeFila(fila: Fila): Membresia {
  if (!esRol(fila.rol) || !esModo(fila.modo)) throw new Error(`Membresía ${fila.id} con rol o modo desconocido`);
  return Membresia.reconstruir({
    id: fila.id,
    empresaId: IdEmpresa.de(fila.empresaId),
    usuarioId: IdUsuario.de(fila.usuarioId),
    rol: fila.rol,
    modo: fila.modo,
    creadaEn: fila.creadaEn,
    invitadaPor: fila.invitadaPor ? IdUsuario.de(fila.invitadaPor) : null,
    aceptadaEn: fila.aceptadaEn,
    retiro: fila.retiradaEn && fila.retiradaPor ? { en: fila.retiradaEn, por: IdUsuario.de(fila.retiradaPor) } : null,
  });
}

/** Columnas que conta_api puede cambiar (GRANT UPDATE por columnas de la migración 0005). */
export function cambiosDe(membresia: Membresia): Pick<FilaNueva, 'rol' | 'modo' | 'aceptadaEn' | 'retiradaEn' | 'retiradaPor'> {
  return {
    rol: membresia.rol,
    modo: membresia.modo,
    aceptadaEn: membresia.aceptadaEn,
    retiradaEn: membresia.retiro?.en ?? null,
    retiradaPor: membresia.retiro?.por.valor ?? null,
  };
}

export function filaNuevaDe(membresia: Membresia): FilaNueva {
  return {
    id: membresia.id,
    empresaId: membresia.empresaId.valor,
    usuarioId: membresia.usuarioId.valor,
    creadaEn: membresia.creadaEn,
    invitadaPor: membresia.invitadaPor?.valor ?? null,
    ...cambiosDe(membresia),
  };
}
