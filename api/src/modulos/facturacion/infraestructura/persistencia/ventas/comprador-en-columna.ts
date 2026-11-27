import { Identificacion, type TipoDeIdentificacion } from '../../../../../compartido/dominio/index.js';
import { participante, type Participante } from '../../../dominio/index.js';

/** El adquirente como se guarda en conta.ventas.comprador (jsonb): datos planos, sin clases. */
interface CompradorGuardado {
  tipoIdentificacion: string;
  numero: string;
  razonSocial: string;
  tipoDePersona: 'juridica' | 'natural';
  responsabilidadesFiscales: string[];
  responsableDeIva: boolean;
  direccion: Participante['direccion'];
  correo: string | null;
}

export function compradorEnColumna(p: Participante): CompradorGuardado {
  return {
    tipoIdentificacion: p.identificacion.tipo,
    numero: p.identificacion.numero,
    razonSocial: p.razonSocial,
    tipoDePersona: p.tipoDePersona,
    responsabilidadesFiscales: [...p.responsabilidadesFiscales],
    responsableDeIva: p.responsableDeIva,
    direccion: p.direccion,
    correo: p.correo,
  };
}

/** Lo vuelve a validar con el dominio: un comprador guardado con otra forma es un error de datos y se lanza. */
export function compradorDeColumna(valor: unknown): Participante {
  const c = valor as CompradorGuardado;
  return participante({
    identificacion: Identificacion.de(c.tipoIdentificacion as TipoDeIdentificacion, c.numero),
    razonSocial: c.razonSocial,
    tipoDePersona: c.tipoDePersona,
    responsabilidadesFiscales: c.responsabilidadesFiscales,
    responsableDeIva: c.responsableDeIva,
    direccion: c.direccion,
    correo: c.correo,
  });
}
