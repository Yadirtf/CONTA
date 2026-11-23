import { Dinero } from '../../src/compartido/dominio/index.js';
import type { ConfiguracionDian } from '../../src/modulos/facturacion/aplicacion/puertos/generador-de-documento-electronico.js';
import {
  Factura,
  LineaDeFactura,
  MomentoDeEmision,
  NumeroDeFactura,
  ResolucionDeNumeracion,
} from '../../src/modulos/facturacion/dominio/index.js';
import { adquirenteDePrueba, emisorDePrueba } from '../unitarias/facturacion/datos-de-prueba.js';

// Datos del set de pruebas de habilitación. La resolución, el prefijo, el rango y la clave técnica son los
// públicos del ambiente de habilitación; el NIT, el software y el certificado vienen del entorno SECRETOS.

const NOMBRES = ['DIAN_HAB_NIT', 'DIAN_HAB_ID_SOFTWARE', 'DIAN_HAB_PIN', 'DIAN_HAB_P12_BASE64', 'DIAN_HAB_P12_CONTRASENA', 'DIAN_HAB_TEST_SET_ID'] as const;
const CLAVE_TECNICA_DE_HABILITACION = 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c';
const RANGO = { desde: 990000000, hasta: 995000000 };

export type DatosDeHabilitacion = Record<(typeof NOMBRES)[number], string> & { DIAN_HAB_CLAVE_TECNICA: string };

/** Los datos del entorno, o null si falta alguno (la prueba se omite). */
export function datosDeHabilitacion(env = process.env): DatosDeHabilitacion | null {
  if (NOMBRES.some((n) => !env[n])) return null;
  const datos = Object.fromEntries(NOMBRES.map((n) => [n, env[n] as string])) as DatosDeHabilitacion;
  return { ...datos, DIAN_HAB_CLAVE_TECNICA: env['DIAN_HAB_CLAVE_TECNICA'] || CLAVE_TECNICA_DE_HABILITACION };
}

export function configuracionDeHabilitacion(datos: DatosDeHabilitacion): ConfiguracionDian {
  return {
    ambiente: 'habilitacion',
    claveTecnica: datos.DIAN_HAB_CLAVE_TECNICA,
    idSoftware: datos.DIAN_HAB_ID_SOFTWARE,
    pinSoftware: datos.DIAN_HAB_PIN,
    nitProveedorSoftware: datos.DIAN_HAB_NIT,
  };
}

/** Una factura nueva del set: número al azar dentro del rango, para no repetir uno ya enviado. */
export function facturaDeHabilitacion(nitEmisor: string, ahora: Date): Factura {
  const consecutivo = RANGO.desde + 1 + Math.floor(Math.random() * (RANGO.hasta - RANGO.desde - 1));
  const vence = new Date(ahora.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  return Factura.emitir({
    numero: NumeroDeFactura.de('SETP', consecutivo),
    emision: MomentoDeEmision.desde(ahora),
    resolucion: ResolucionDeNumeracion.crear({
      numero: '18760000001',
      prefijo: 'SETP',
      ...RANGO,
      vigenteDesde: '2019-01-19',
      vigenteHasta: '2030-01-19',
    }),
    emisor: emisorDePrueba(nitEmisor),
    adquirente: adquirenteDePrueba(),
    lineas: [
      LineaDeFactura.crear({ descripcion: 'Servicio de prueba de habilitación', cantidad: '1', precioUnitario: Dinero.de('100000'), tarifaIva: '19', codigo: 'HAB-01' }),
    ],
    formaDePago: { metodo: 'credito', medio: '42', vence },
  });
}
