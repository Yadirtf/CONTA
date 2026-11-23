import { Dinero, Nit } from '../../../src/compartido/dominio/index.js';
import type { ConfiguracionDian } from '../../../src/modulos/facturacion/aplicacion/puertos/generador-de-documento-electronico.js';
import {
  Factura,
  Identificacion,
  LineaDeFactura,
  MomentoDeEmision,
  NumeroDeFactura,
  participante,
  ResolucionDeNumeracion,
  type Participante,
} from '../../../src/modulos/facturacion/dominio/index.js';

// Datos ficticios. Los del ejemplo del anexo técnico son públicos (sección 11.2.1).

export const emisorDePrueba = (nit = '900373076'): Participante =>
  participante({
    identificacion: Identificacion.nit(Nit.de(nit)),
    razonSocial: 'Ferretería & Cía. de Prueba S.A.S.',
    tipoDePersona: 'juridica',
    responsabilidadesFiscales: ['O-13', 'O-15'],
    responsableDeIva: true,
    direccion: { codigoMunicipio: '11001', ciudad: 'Bogotá, D.C.', departamento: 'Bogotá', linea: 'Calle 1 # 2-3' },
    correo: 'facturas@ejemplo.test',
  });

export const adquirenteDePrueba = (nit = '800199436'): Participante =>
  participante({
    identificacion: Identificacion.nit(Nit.de(nit)),
    razonSocial: 'Cliente de Prueba S.A.S.',
    tipoDePersona: 'juridica',
    responsabilidadesFiscales: ['R-99-PN'],
    responsableDeIva: false,
    direccion: null,
    correo: null,
  });

export const configuracionDePrueba = (ambiente: ConfiguracionDian['ambiente'] = 'habilitacion'): ConfiguracionDian => ({
  ambiente,
  claveTecnica: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c',
  idSoftware: '56f2ae4e-9812-4fad-9255-08fcfcd5ccb0',
  pinSoftware: '12345',
  nitProveedorSoftware: '900373076',
});

/** Factura del criterio de HU-02.01: dos líneas, una con IVA del 19 % y otra con IVA del 0 %. */
export function facturaConDosLineas(): Factura {
  return Factura.emitir({
    numero: NumeroDeFactura.de('SETP', 990000001),
    emision: MomentoDeEmision.desde(new Date('2026-11-23T14:30:00Z')),
    resolucion: ResolucionDeNumeracion.crear({
      numero: '18760000001',
      prefijo: 'SETP',
      desde: 990000000,
      hasta: 995000000,
      vigenteDesde: '2019-01-19',
      vigenteHasta: '2030-01-19',
    }),
    emisor: emisorDePrueba(),
    adquirente: adquirenteDePrueba(),
    lineas: [
      LineaDeFactura.crear({ descripcion: 'Martillo <de> acero', cantidad: '3', precioUnitario: Dinero.de('12345.67'), tarifaIva: '19', codigo: 'MAR-01' }),
      LineaDeFactura.crear({ descripcion: 'Arroz 1 kg (canasta básica)', cantidad: '2.5', precioUnitario: Dinero.de('4200'), tarifaIva: '0', unidad: 'KGM' }),
    ],
    formaDePago: { metodo: 'credito', medio: '42', vence: '2026-12-23' },
  });
}
