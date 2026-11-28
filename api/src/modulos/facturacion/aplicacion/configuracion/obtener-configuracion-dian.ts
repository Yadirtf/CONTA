import type { ContextoDeMiembro, Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import {
  type ClaseDeDocumento,
  type FabricanteEscrito,
  loQueFalta,
  type LoQueFalta,
  MomentoDeEmision,
  type Participante,
} from '../../dominio/index.js';
import type {
  CambioDeConfiguracion,
  RepositoriosDeConfiguracion,
  ResolucionGuardada,
  SoftwareGuardado,
} from '../puertos/repositorios-de-configuracion.js';
import { exigirDuenoVerificado } from './exigir-dueno-verificado.js';

/** Cuántos cambios de la bitácora se muestran. */
const CAMBIOS_A_MOSTRAR = 10;

/** El software como se puede mostrar: del PIN, solo su último carácter. */
export interface SoftwareVisible {
  readonly idSoftware: string;
  readonly testSetId: string;
  readonly finalDelPin: string;
  readonly fabricante: FabricanteEscrito | null;
  readonly actualizadoEn: Date;
}

export interface ResolucionVisible extends ResolucionGuardada {
  /** Vigente hoy y con números por usar. */
  readonly disponible: boolean;
}

export interface ConfiguracionVisible {
  readonly datosFiscales: Participante | null;
  readonly resoluciones: readonly ResolucionVisible[];
  readonly software: Readonly<Record<ClaseDeDocumento, SoftwareVisible | null>>;
  readonly siempreFactura: boolean;
  readonly cambios: readonly CambioDeConfiguracion[];
  readonly loQueFalta: LoQueFalta;
}

/**
 * HU-07.04: todo lo guardado de la configuración DIAN, sin un solo secreto: ni el PIN ni la clave técnica salen de
 * la base en claro por aquí. Dice además qué falta para facturar.
 */
export class ObtenerConfiguracionDian {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeConfiguracion>,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(contexto: ContextoDeMiembro): Promise<ConfiguracionVisible> {
    exigirDuenoVerificado(contexto, 'leer');
    const hoy = MomentoDeEmision.desde(this.reloj.ahora()).fecha;
    const leido = await this.unidadDeTrabajo.ejecutar(contexto, async (r) => ({
      datosFiscales: await r.datosFiscales.leer(),
      resoluciones: await r.resoluciones.listar(),
      factura: await r.software.de('factura'),
      pos: await r.software.de('pos'),
      siempreFactura: await r.preferencias.siempreFactura(),
      cambios: await r.bitacora.recientes(CAMBIOS_A_MOSTRAR),
    }));
    const resoluciones = leido.resoluciones.map((g) => ({ ...g, disponible: disponibleEl(g, hoy) }));
    const hayDisponible = (clase: ClaseDeDocumento) => resoluciones.some((r) => r.disponible && r.resolucion.clase === clase);
    return {
      datosFiscales: leido.datosFiscales,
      resoluciones,
      software: { factura: visible(leido.factura), pos: visible(leido.pos) },
      siempreFactura: leido.siempreFactura,
      cambios: leido.cambios,
      loQueFalta: loQueFalta({
        datosFiscales: leido.datosFiscales !== null,
        resolucionDeFacturaVigente: hayDisponible('factura'),
        softwareDeFactura: leido.factura !== null,
        resolucionPosVigente: hayDisponible('pos'),
        softwareDePos: leido.pos !== null,
        siempreFactura: leido.siempreFactura,
      }),
    };
  }
}

function disponibleEl({ resolucion, siguiente }: ResolucionGuardada, hoy: string): boolean {
  return resolucion.vigenteDesde <= hoy && hoy <= resolucion.vigenteHasta && siguiente <= resolucion.hasta;
}

function visible(s: SoftwareGuardado | null): SoftwareVisible | null {
  if (!s) return null;
  return { idSoftware: s.idSoftware, testSetId: s.testSetId, finalDelPin: s.finalDelPin, fabricante: s.fabricante, actualizadoEn: s.actualizadoEn };
}
