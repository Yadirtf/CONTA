import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CLASES_DE_DOCUMENTO, RESPONSABILIDADES_DEL_FACTURADOR } from '../../../dominio/index.js';

// Forma de los cuerpos para el contrato OpenAPI (HU-07.04). La lectura real está en lectura-de-*.ts.

export class DireccionDelFacturador {
  @ApiProperty({ example: '11001', description: 'Código DANE del municipio (5 dígitos).' })
  readonly codigoMunicipio!: string;

  @ApiProperty({ example: 'Bogotá, D.C.' })
  readonly ciudad!: string;

  @ApiProperty({ example: 'Bogotá' })
  readonly departamento!: string;

  @ApiProperty({ example: 'Calle 12 # 3-45' })
  readonly linea!: string;
}

export class DatosFiscalesNuevos {
  @ApiProperty({ example: '900373076', description: 'Sin puntos ni dígito de verificación.' })
  readonly nit!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 9, description: 'Si se escribe, debe coincidir con el calculado.' })
  readonly digitoVerificacion?: number;

  @ApiProperty({ example: 'Tienda Don Pepe S.A.S.' })
  readonly razonSocial!: string;

  @ApiProperty({ enum: ['juridica', 'natural'] })
  readonly tipoDePersona!: 'juridica' | 'natural';

  @ApiProperty({ enum: RESPONSABILIDADES_DEL_FACTURADOR, isArray: true, example: ['R-99-PN'] })
  readonly responsabilidadesFiscales!: string[];

  @ApiProperty()
  readonly responsableDeIva!: boolean;

  @ApiProperty({ type: DireccionDelFacturador })
  readonly direccion!: DireccionDelFacturador;

  @ApiPropertyOptional({ nullable: true, example: 'facturas@donpepe.co' })
  readonly correo?: string | null;
}

export class ResolucionPorAgregar {
  @ApiProperty({ format: 'uuid', description: 'Lo elige la app: repetir la petición no agrega dos.' })
  readonly id!: string;

  @ApiProperty({ enum: CLASES_DE_DOCUMENTO })
  readonly clase!: string;

  @ApiProperty({ example: '18760000001' })
  readonly numero!: string;

  @ApiProperty({ example: 'SETP', description: 'Hasta 4 letras mayúsculas o números; puede ir vacío.' })
  readonly prefijo!: string;

  @ApiProperty({ example: 990000000 })
  readonly desde!: number;

  @ApiProperty({ example: 995000000 })
  readonly hasta!: number;

  @ApiProperty({ example: '2019-01-19' })
  readonly vigenteDesde!: string;

  @ApiProperty({ example: '2030-01-19' })
  readonly vigenteHasta!: string;

  @ApiPropertyOptional({ description: 'Primer número que usará CONTA. Por omisión, `desde`.' })
  readonly primerNumero?: number;

  @ApiPropertyOptional({ description: 'Clave técnica del rango (solo factura). Se guarda cifrada y nunca se devuelve.' })
  readonly claveTecnica?: string;
}

export class FabricanteDelSoftwarePos {
  @ApiProperty({ example: 'Pepe Pérez' })
  readonly nombre!: string;

  @ApiProperty({ example: 'Tienda Don Pepe S.A.S.' })
  readonly razonSocial!: string;
}

export class SoftwareNuevo {
  @ApiProperty({ format: 'uuid', description: 'Identificador del software que dio la DIAN.' })
  readonly idSoftware!: string;

  @ApiPropertyOptional({ description: 'PIN del software. Solo para cambiarlo: sin él, queda el guardado. Nunca se devuelve.' })
  readonly pin?: string;

  @ApiProperty({ format: 'uuid', description: 'TestSetId del set de pruebas de habilitación.' })
  readonly testSetId!: string;

  @ApiPropertyOptional({ type: FabricanteDelSoftwarePos, description: 'Solo el tiquete POS (y ahí es obligatorio).' })
  readonly fabricante?: FabricanteDelSoftwarePos;
}

export class PreferenciasNuevas {
  @ApiProperty({ description: 'true: nunca sale tiquete POS, siempre factura electrónica.' })
  readonly siempreFactura!: boolean;
}
