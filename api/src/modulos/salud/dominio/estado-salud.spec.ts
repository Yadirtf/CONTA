import { crearEstadoSalud } from './estado-salud.js';

describe('EstadoSalud', () => {
  it('reporta ok con la versión y la hora en ISO 8601', () => {
    const estado = crearEstadoSalud('0.1.0', new Date('2026-11-23T12:00:00Z'));
    expect(estado).toEqual({
      estado: 'ok',
      servicio: 'conta-api',
      version: '0.1.0',
      hora: '2026-11-23T12:00:00.000Z',
    });
  });

  it('rechaza una versión vacía', () => {
    expect(() => crearEstadoSalud('  ', new Date())).toThrow('La versión de la API no puede estar vacía');
  });
});
