import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Nit, TIPOS_DE_IDENTIFICACION, type TipoDeIdentificacion } from '../../../../compartido/dominio/index.js';
import { type Cliente, CONSUMIDOR_FINAL, TIPOS_DE_PERSONA, type TipoDePersona } from '../../dominio/clientes/index.js';
import type { ResultadoDeBusqueda } from '../../aplicacion/consultas/buscar-clientes.js';
import { DireccionDeCliente } from './cuerpo-de-cliente.js';

/** Un comprador como lo usa la app para facturarle. Lleva datos personales: las respuestas van sin caché. */
export class RespuestaCliente {
  @ApiProperty({ format: 'uuid', nullable: true, description: 'null en el consumidor final, que no se guarda.' })
  readonly id!: string | null;

  @ApiProperty({ description: 'true solo en el consumidor final (222222222222).' })
  readonly esConsumidorFinal!: boolean;

  @ApiProperty({ enum: Object.keys(TIPOS_DE_IDENTIFICACION) })
  readonly tipoDocumento!: TipoDeIdentificacion;

  @ApiProperty({ example: '900373076' })
  readonly numero!: string;

  @ApiProperty({ nullable: true, example: 4, description: 'Solo con NIT; siempre calculado.' })
  readonly digitoVerificacion!: number | null;

  @ApiProperty()
  readonly nombre!: string;

  @ApiProperty({ enum: TIPOS_DE_PERSONA })
  readonly tipoDePersona!: TipoDePersona;

  @ApiProperty({ type: [String], example: ['R-99-PN'] })
  readonly responsabilidadesFiscales!: string[];

  @ApiProperty()
  readonly responsableDeIva!: boolean;

  @ApiProperty({ nullable: true })
  readonly correo!: string | null;

  @ApiPropertyOptional({ type: DireccionDeCliente, nullable: true })
  readonly direccion!: DireccionDeCliente | null;
}

/**
 * Un comprador en la lista de la búsqueda: solo lo que hace falta para reconocerlo y elegirlo. Sin correo ni
 * dirección, para que buscar no sirva para sacar los datos de contacto de todos (hallazgo H5 de la prueba de
 * ataque). La factura leerá el resto en la API a partir del id.
 */
export class CompradorEncontrado {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ enum: Object.keys(TIPOS_DE_IDENTIFICACION) })
  readonly tipoDocumento!: TipoDeIdentificacion;

  @ApiProperty({ example: '900373076' })
  readonly numero!: string;

  @ApiProperty({ nullable: true, example: 4 })
  readonly digitoVerificacion!: number | null;

  @ApiProperty()
  readonly nombre!: string;

  @ApiProperty({ enum: TIPOS_DE_PERSONA })
  readonly tipoDePersona!: TipoDePersona;
}

export class NitCalculado {
  @ApiProperty({ example: '900373076' })
  readonly numero!: string;

  @ApiProperty({ example: 4 })
  readonly digitoVerificacion!: number;
}

export class RespuestaBusqueda {
  @ApiProperty({ type: NitCalculado, nullable: true, description: 'Si lo escrito es un NIT posible: su dígito de verificación.' })
  readonly nit!: NitCalculado | null;

  @ApiProperty({ type: [CompradorEncontrado], description: 'Hasta 10, ordenados por número.' })
  readonly clientes!: CompradorEncontrado[];
}

export const respuestaDeCliente = ({ datos }: Cliente): RespuestaCliente => ({
  id: datos.id,
  esConsumidorFinal: false,
  ...identificacionYDatos(datos),
});

export const respuestaDeConsumidorFinal = (): RespuestaCliente => ({
  id: null,
  esConsumidorFinal: true,
  ...identificacionYDatos(CONSUMIDOR_FINAL),
});

export const respuestaDeBusqueda = ({ nit, clientes }: ResultadoDeBusqueda): RespuestaBusqueda => ({
  nit: nit ? nitCalculado(nit) : null,
  clientes: clientes.map(compradorEncontrado),
});

const compradorEncontrado = ({ datos }: Cliente): CompradorEncontrado => ({
  id: datos.id,
  tipoDocumento: datos.identificacion.tipo,
  numero: datos.identificacion.numero,
  digitoVerificacion: datos.identificacion.digitoVerificacion,
  nombre: datos.nombre,
  tipoDePersona: datos.tipoDePersona,
});

const nitCalculado = (nit: Nit): NitCalculado => ({ numero: nit.numero, digitoVerificacion: nit.digitoVerificacion });

type Comprador = Pick<
  Cliente['datos'],
  'identificacion' | 'nombre' | 'tipoDePersona' | 'responsabilidadesFiscales' | 'responsableDeIva' | 'correo' | 'direccion'
>;

function identificacionYDatos(comprador: Comprador): Omit<RespuestaCliente, 'id' | 'esConsumidorFinal'> {
  const { identificacion, direccion } = comprador;
  return {
    tipoDocumento: identificacion.tipo,
    numero: identificacion.numero,
    digitoVerificacion: identificacion.digitoVerificacion,
    nombre: comprador.nombre,
    tipoDePersona: comprador.tipoDePersona,
    responsabilidadesFiscales: [...comprador.responsabilidadesFiscales],
    responsableDeIva: comprador.responsableDeIva,
    correo: comprador.correo,
    direccion: direccion ? { ...direccion } : null,
  };
}
