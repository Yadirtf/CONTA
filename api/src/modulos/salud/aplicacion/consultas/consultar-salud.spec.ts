import type { Reloj } from '../../../../compartido/aplicacion/index.js';
import { ConsultarSalud } from './consultar-salud.js';

describe('ConsultarSalud', () => {
  it('usa la hora del reloj inyectado, sin red ni base de datos', () => {
    const relojFijo: Reloj = { ahora: () => new Date('2026-01-01T05:00:00Z') };
    const resultado = new ConsultarSalud(relojFijo, '9.9.9').ejecutar();
    expect(resultado.hora).toBe('2026-01-01T05:00:00.000Z');
    expect(resultado.version).toBe('9.9.9');
  });
});
