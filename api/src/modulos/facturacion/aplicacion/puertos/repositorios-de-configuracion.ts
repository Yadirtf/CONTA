import type {
  ClaseDeDocumento,
  FabricanteEscrito,
  Participante,
  ResolucionDeNumeracion,
  ResolucionNueva,
  SeccionDeConfiguracion,
} from '../../dominio/index.js';
import type { PreferenciasDeFacturacion } from './preferencias-de-facturacion.js';

/** Datos fiscales del facturador de la empresa de la transacción (RLS). */
export interface DatosFiscalesGuardados {
  leer(): Promise<Participante | null>;
  /** 'nit-con-ventas' si la base lo impidió: una venta que estaba en curso se confirmó antes (hallazgo B3). */
  guardar(datos: Participante): Promise<'guardados' | 'nit-con-ventas'>;
  /** true si la empresa ya vendió: su NIT ya está en ventas y envíos, y no cambia. */
  hayVentas(): Promise<boolean>;
}

export interface ResolucionGuardada {
  readonly id: string;
  readonly resolucion: ResolucionDeNumeracion;
  /** El próximo número que se usará; pasa de `hasta` cuando el rango se agotó. */
  readonly siguiente: number;
  readonly conClaveTecnica: boolean;
}

/** Cómo terminó agregar una resolución. Nunca se cambia una guardada. */
export type ResultadoDeAgregar = 'agregada' | 'ya-existia' | 'id-en-uso' | 'repetida' | 'rango-cruzado';

export interface ResolucionesGuardadas {
  listar(): Promise<ResolucionGuardada[]>;
  /**
   * Inserta la resolución con ese id. Si el id ya existe, dice si es la misma (un reintento: misma huella del pedido,
   * que incluye la clave técnica y el primer número) u otra.
   */
  agregar(id: string, nueva: ResolucionNueva, claveTecnicaCifrada: string | null, huellaDelPedido: string): Promise<ResultadoDeAgregar>;
}

/** El software de una clase tal como está guardado: el PIN solo cifrado. */
export interface SoftwareGuardado {
  readonly clase: ClaseDeDocumento;
  readonly idSoftware: string;
  readonly pinCifrado: string;
  readonly finalDelPin: string;
  readonly testSetId: string;
  readonly fabricante: FabricanteEscrito | null;
  readonly actualizadoEn: Date;
}

/** El software por guardar. Con `pin` null queda el PIN guardado: no se reescribe con uno leído antes (hallazgo M3). */
export interface SoftwarePorGuardar extends Omit<SoftwareGuardado, 'actualizadoEn' | 'pinCifrado' | 'finalDelPin'> {
  readonly pin: { readonly pinCifrado: string; readonly finalDelPin: string } | null;
}

export interface SoftwaresGuardados {
  de(clase: ClaseDeDocumento): Promise<SoftwareGuardado | null>;
  guardar(software: SoftwarePorGuardar, usuarioId: string): Promise<void>;
}

export interface CambioDeConfiguracion {
  readonly seccion: SeccionDeConfiguracion;
  readonly hechoPor: string;
  readonly hechoEn: Date;
}

/** Quién cambió qué parte y cuándo, sin valores. Solo crece. */
export interface BitacoraDeConfiguracion {
  anotar(seccion: SeccionDeConfiguracion, usuarioId: string): Promise<void>;
  recientes(cuantos: number): Promise<CambioDeConfiguracion[]>;
}

/** Lo que una transacción de la configuración DIAN puede tocar. */
export interface RepositoriosDeConfiguracion {
  readonly datosFiscales: DatosFiscalesGuardados;
  readonly resoluciones: ResolucionesGuardadas;
  readonly software: SoftwaresGuardados;
  readonly preferencias: PreferenciasDeFacturacion;
  readonly bitacora: BitacoraDeConfiguracion;
}
