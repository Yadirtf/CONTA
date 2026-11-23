// Nombres del XML y del ZIP que se envían a la DIAN (anexo técnico 1.9, sección 9.2):
// prefijo + NIT del emisor en 10 dígitos + código del proveedor tecnológico (000 si el software es propio)
// + año en 2 dígitos + consecutivo de envíos del año en 8 dígitos hexadecimales.

const SOFTWARE_PROPIO = '000';
const CONSECUTIVO_MAXIMO = 0xffffffff;

export interface DatosDelNombre {
  readonly nitEmisor: string;
  readonly anio: number;
  /** Consecutivo de archivos enviados por el emisor en el año, desde 1. */
  readonly consecutivo: number;
}

export interface NombresDelPaquete {
  readonly xml: string;
  readonly zip: string;
}

export function nombresDelPaquete({ nitEmisor, anio, consecutivo }: DatosDelNombre): NombresDelPaquete {
  if (!/^\d{1,10}$/.test(nitEmisor)) throw new Error('NIT del emisor inválido para el nombre del archivo');
  if (!Number.isInteger(consecutivo) || consecutivo < 1 || consecutivo > CONSECUTIVO_MAXIMO) {
    throw new Error('Consecutivo de archivo fuera de rango');
  }
  const base = `${nitEmisor.padStart(10, '0')}${SOFTWARE_PROPIO}${String(anio % 100).padStart(2, '0')}${consecutivo
    .toString(16)
    .toUpperCase()
    .padStart(8, '0')}`;
  return { xml: `fv${base}.xml`, zip: `z${base}.zip` };
}
