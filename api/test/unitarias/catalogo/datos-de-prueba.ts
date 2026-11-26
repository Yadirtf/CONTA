import type { DatosDeClienteNuevo } from '../../../src/modulos/catalogo/dominio/clientes/index.js';

export const AHORA = new Date('2026-11-26T15:00:00Z');
export const CAJERO = '0b7d1a52-5f8c-4c39-9f43-2a8e7f1c0d11';

let siguiente = 0;
/** Un uuid distinto en cada llamada, para no depender de crypto en las pruebas de dominio. */
export const idNuevo = (): string => `00000000-0000-4000-8000-${String(++siguiente).padStart(12, '0')}`;

export const ferreteria = (cambios: Partial<DatosDeClienteNuevo> = {}): DatosDeClienteNuevo => ({
  id: idNuevo(),
  tipoDeIdentificacion: '31',
  numero: '800197268',
  digitoEscrito: null,
  nombre: 'Ferretería El Tornillo S.A.S.',
  tipoDePersona: 'juridica',
  responsabilidadesFiscales: ['O-13'],
  responsableDeIva: true,
  correo: 'Compras@ElTornillo.co',
  direccion: { codigoMunicipio: '11001', ciudad: 'Bogotá D.C.', departamento: 'Bogotá', linea: 'Calle 12 # 3-45' },
  ...cambios,
});

export const vecina = (cambios: Partial<DatosDeClienteNuevo> = {}): DatosDeClienteNuevo => ({
  id: idNuevo(),
  tipoDeIdentificacion: '13',
  numero: '1020304050',
  digitoEscrito: null,
  nombre: 'Rosa Pérez',
  tipoDePersona: 'natural',
  responsabilidadesFiscales: [],
  responsableDeIva: false,
  correo: null,
  direccion: null,
  ...cambios,
});
