import { esTipoDeIdentificacion, Identificacion } from '../../../../compartido/dominio/index.js';
import { Cliente, esTipoDePersona } from '../../dominio/clientes/index.js';
import type { FilaDeCliente, FilaNuevaDeCliente } from './tablas-catalogo.js';

/** Fila → cliente. Las restricciones de la tabla ya garantizan la forma; si no, es un error de datos y se lanza. */
export function clienteDeFila(fila: FilaDeCliente): Cliente {
  if (!esTipoDeIdentificacion(fila.tipoIdentificacion) || !esTipoDePersona(fila.tipoDePersona)) {
    throw new Error(`Cliente ${fila.id} con datos que la tabla no debería admitir`);
  }
  const { codigoMunicipio, ciudad, departamento, direccion } = fila;
  return Cliente.guardado({
    id: fila.id,
    identificacion: Identificacion.de(fila.tipoIdentificacion, fila.numero),
    nombre: fila.nombre,
    tipoDePersona: fila.tipoDePersona,
    responsabilidadesFiscales: fila.responsabilidadesFiscales,
    responsableDeIva: fila.responsableDeIva,
    correo: fila.correo,
    direccion:
      codigoMunicipio && ciudad && departamento && direccion ? { codigoMunicipio, ciudad, departamento, linea: direccion } : null,
    creadoEn: fila.creadoEn,
    creadoPor: fila.creadoPor,
  });
}

/** Cliente → fila nueva, sin empresa: el repositorio pone la de la transacción y RLS la comprueba. */
export function filaNuevaDe(cliente: Cliente): Omit<FilaNuevaDeCliente, 'empresaId'> {
  const { datos } = cliente;
  return {
    id: datos.id,
    tipoIdentificacion: datos.identificacion.tipo,
    numero: datos.identificacion.numero,
    digitoVerificacion: datos.identificacion.digitoVerificacion,
    nombre: datos.nombre,
    tipoDePersona: datos.tipoDePersona,
    responsabilidadesFiscales: [...datos.responsabilidadesFiscales],
    responsableDeIva: datos.responsableDeIva,
    correo: datos.correo,
    codigoMunicipio: datos.direccion?.codigoMunicipio ?? null,
    ciudad: datos.direccion?.ciudad ?? null,
    departamento: datos.direccion?.departamento ?? null,
    direccion: datos.direccion?.linea ?? null,
    creadoEn: datos.creadoEn,
    creadoPor: datos.creadoPor,
  };
}
