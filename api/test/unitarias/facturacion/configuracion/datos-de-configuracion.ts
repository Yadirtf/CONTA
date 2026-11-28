import type {
  DatosFiscalesEscritos,
  ResolucionEscrita,
  SoftwareEscrito,
} from '../../../../src/modulos/facturacion/dominio/index.js';

// Datos de prueba de la configuración DIAN (HU-07.04).

export const datosEscritos = (cambios: Partial<DatosFiscalesEscritos> = {}): DatosFiscalesEscritos => ({
  nit: '900373076',
  digitoVerificacion: 4,
  razonSocial: 'Tienda Don Pepe S.A.S.',
  tipoDePersona: 'juridica',
  responsabilidadesFiscales: ['O-13'],
  responsableDeIva: true,
  direccion: { codigoMunicipio: '11001', ciudad: 'Bogotá, D.C.', departamento: 'Bogotá', linea: 'Calle 1 # 2-3' },
  correo: 'facturas@donpepe.co',
  ...cambios,
});

export const resolucionEscrita = (cambios: Partial<ResolucionEscrita> = {}): ResolucionEscrita => ({
  clase: 'factura',
  numero: '18760000001',
  prefijo: 'SETP',
  desde: 990000000,
  hasta: 995000000,
  vigenteDesde: '2019-01-19',
  vigenteHasta: '2030-01-19',
  primerNumero: null,
  claveTecnica: null,
  ...cambios,
});

export const softwareEscrito = (cambios: Partial<SoftwareEscrito> = {}): SoftwareEscrito => ({
  clase: 'factura',
  idSoftware: '56f2ae4e-9812-4fad-9255-08fcfcd5ccb0',
  pin: '12345',
  testSetId: '3f2a8a2e-1b8c-4a7e-9b6f-2d9b1c0a7e11',
  fabricante: null,
  ...cambios,
});
