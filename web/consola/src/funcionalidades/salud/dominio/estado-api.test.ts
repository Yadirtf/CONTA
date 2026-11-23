import { describe, expect, it } from 'vitest';
import { mensajeDeEstado } from './estado-api';

describe('mensajeDeEstado', () => {
  it('muestra la versión cuando la API responde', () => {
    expect(mensajeDeEstado({ tipo: 'viva', version: '0.1.0' })).toEqual({
      nivel: 'ok',
      texto: 'La API responde (versión 0.1.0).',
    });
  });

  it('explica que Render puede estar despertando', () => {
    expect(mensajeDeEstado({ tipo: 'sin-respuesta' }).texto).toContain('1 minuto');
  });

  it('avisa si falta la URL de la API', () => {
    expect(mensajeDeEstado({ tipo: 'sin-configurar' }).nivel).toBe('alerta');
  });
});
