import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ConfiguracionVisible, SoftwareVisible } from '../../../aplicacion/configuracion/obtener-configuracion-dian.js';
import { CLASES_DE_DOCUMENTO, type Participante, SECCIONES_DE_CONFIGURACION } from '../../../dominio/index.js';
import { DireccionDelFacturador, FabricanteDelSoftwarePos } from './cuerpos-de-configuracion.js';

// Lo que ve el dueño de su configuración DIAN (HU-07.04). Nunca lleva el PIN ni la clave técnica.

export class DatosFiscalesGuardadosRespuesta {
  @ApiProperty({ example: '900373076' })
  readonly nit!: string;

  @ApiProperty({ example: 4 })
  readonly digitoVerificacion!: number;

  @ApiProperty()
  readonly razonSocial!: string;

  @ApiProperty({ enum: ['juridica', 'natural'] })
  readonly tipoDePersona!: string;

  @ApiProperty({ type: [String] })
  readonly responsabilidadesFiscales!: string[];

  @ApiProperty()
  readonly responsableDeIva!: boolean;

  @ApiProperty({ type: DireccionDelFacturador })
  readonly direccion!: DireccionDelFacturador;

  @ApiProperty({ nullable: true, type: String })
  readonly correo!: string | null;
}

export class ResolucionGuardadaRespuesta {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ enum: CLASES_DE_DOCUMENTO })
  readonly clase!: string;

  @ApiProperty()
  readonly numero!: string;

  @ApiProperty()
  readonly prefijo!: string;

  @ApiProperty()
  readonly desde!: number;

  @ApiProperty()
  readonly hasta!: number;

  @ApiProperty()
  readonly vigenteDesde!: string;

  @ApiProperty()
  readonly vigenteHasta!: string;

  @ApiProperty({ description: 'El próximo número que se usará.' })
  readonly siguiente!: number;

  @ApiProperty({ description: 'Vigente hoy y con números por usar.' })
  readonly disponible!: boolean;

  @ApiProperty({ description: 'true si se guardó con su clave técnica (que nunca se devuelve).' })
  readonly conClaveTecnica!: boolean;
}

export class SoftwareGuardadoRespuesta {
  @ApiProperty({ format: 'uuid' })
  readonly idSoftware!: string;

  @ApiProperty({ format: 'uuid' })
  readonly testSetId!: string;

  @ApiProperty({ example: '•••7', description: 'El PIN guardado, tapado salvo su último carácter.' })
  readonly pin!: string;

  @ApiPropertyOptional({ type: FabricanteDelSoftwarePos, nullable: true })
  readonly fabricante!: FabricanteDelSoftwarePos | null;

  @ApiProperty()
  readonly actualizadoEn!: string;
}

export class SoftwarePorClaseRespuesta {
  @ApiProperty({ type: SoftwareGuardadoRespuesta, nullable: true })
  readonly factura!: SoftwareGuardadoRespuesta | null;

  @ApiProperty({ type: SoftwareGuardadoRespuesta, nullable: true })
  readonly pos!: SoftwareGuardadoRespuesta | null;
}

export class CambioRespuesta {
  @ApiProperty({ enum: SECCIONES_DE_CONFIGURACION })
  readonly seccion!: string;

  @ApiProperty()
  readonly hechoEn!: string;

  @ApiProperty({ description: 'true si lo hizo quien pregunta.' })
  readonly hechoPorMi!: boolean;
}

export class LoQueFaltaRespuesta {
  @ApiProperty({ description: 'Con lo guardado ya sale la factura electrónica (el certificado llega con HU-07.02).' })
  readonly puedeFacturar!: boolean;

  @ApiProperty({ description: 'El tiquete POS está completo y el negocio no pidió «siempre factura».' })
  readonly posActivo!: boolean;

  @ApiProperty({ enum: ['datos-fiscales', 'resolucion-factura', 'software-factura'], isArray: true })
  readonly pendientes!: string[];
}

export class ConfiguracionDianRespuesta {
  @ApiProperty({ type: DatosFiscalesGuardadosRespuesta, nullable: true })
  readonly datosFiscales!: DatosFiscalesGuardadosRespuesta | null;

  @ApiProperty({ type: [ResolucionGuardadaRespuesta] })
  readonly resoluciones!: ResolucionGuardadaRespuesta[];

  @ApiProperty({ type: SoftwarePorClaseRespuesta })
  readonly software!: SoftwarePorClaseRespuesta;

  @ApiProperty()
  readonly siempreFactura!: boolean;

  @ApiProperty({ type: [CambioRespuesta], description: 'Los últimos cambios, sin valores.' })
  readonly cambios!: CambioRespuesta[];

  @ApiProperty({ type: LoQueFaltaRespuesta })
  readonly loQueFalta!: LoQueFaltaRespuesta;
}

export function respuestaDeConfiguracion(c: ConfiguracionVisible, usuarioId: string): ConfiguracionDianRespuesta {
  return {
    datosFiscales: c.datosFiscales && datosFiscales(c.datosFiscales),
    resoluciones: c.resoluciones.map(({ id, resolucion: r, siguiente, disponible, conClaveTecnica }) => ({
      id,
      clase: r.clase,
      numero: r.numero,
      prefijo: r.prefijo,
      desde: r.desde,
      hasta: r.hasta,
      vigenteDesde: r.vigenteDesde,
      vigenteHasta: r.vigenteHasta,
      siguiente,
      disponible,
      conClaveTecnica,
    })),
    software: { factura: software(c.software.factura), pos: software(c.software.pos) },
    siempreFactura: c.siempreFactura,
    cambios: c.cambios.map((x) => ({ seccion: x.seccion, hechoEn: x.hechoEn.toISOString(), hechoPorMi: x.hechoPor === usuarioId })),
    loQueFalta: { ...c.loQueFalta, pendientes: [...c.loQueFalta.pendientes] },
  };
}

function datosFiscales(p: Participante): DatosFiscalesGuardadosRespuesta {
  return {
    nit: p.identificacion.numero,
    digitoVerificacion: p.identificacion.digitoVerificacion ?? 0,
    razonSocial: p.razonSocial,
    tipoDePersona: p.tipoDePersona,
    responsabilidadesFiscales: [...p.responsabilidadesFiscales],
    responsableDeIva: p.responsableDeIva,
    direccion: p.direccion ?? { codigoMunicipio: '', ciudad: '', departamento: '', linea: '' },
    correo: p.correo,
  };
}

function software(s: SoftwareVisible | null): SoftwareGuardadoRespuesta | null {
  if (!s) return null;
  return {
    idSoftware: s.idSoftware,
    testSetId: s.testSetId,
    pin: `•••${s.finalDelPin}`,
    fabricante: s.fabricante,
    actualizadoEn: s.actualizadoEn.toISOString(),
  };
}
