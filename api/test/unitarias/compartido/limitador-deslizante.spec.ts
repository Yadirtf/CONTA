import { LimitadorDeslizante } from '../../../src/compartido/presentacion/limites/limitador-deslizante.js';

describe('LimitadorDeslizante (H7 de HU-06.08)', () => {
  it('no deja pasar el doble en el borde de la ventana', () => {
    let ahora = 0;
    const limitador = new LimitadorDeslizante(3, 1000, () => ahora);
    ahora = 990;
    expect([1, 2, 3].map(() => limitador.esperaPara('a'))).toEqual([null, null, null]);
    ahora = 1010; // Con ventana fija aquí volvían a entrar 3.
    expect(limitador.esperaPara('a')).toBe(980);
    ahora = 1990;
    expect(limitador.esperaPara('a')).toBeNull();
  });

  it('cuenta cada llave por separado y olvida las viejas', () => {
    let ahora = 0;
    const limitador = new LimitadorDeslizante(1, 1000, () => ahora);
    expect(limitador.esperaPara('a')).toBeNull();
    expect(limitador.esperaPara('b')).toBeNull();
    expect(limitador.esperaPara('a')).toBe(1000);
    ahora = 5000;
    expect(limitador.esperaPara('a')).toBeNull();
    expect((limitador as unknown as { marcas: Map<string, number[]> }).marcas.has('b')).toBe(false);
  });
});

describe('LimiteDeComprobantes', () => {
  it('responde 429 con Retry-After al pasar de 30', async () => {
    const { LimiteDeComprobantes, MAXIMO_DE_COMPROBANTES } = await import(
      '../../../src/modulos/facturacion/presentacion/http/ventas/limite-de-comprobantes.js'
    );
    const { IdEmpresa, IdUsuario } = await import('../../../src/compartido/dominio/index.js');
    const limite = new LimiteDeComprobantes();
    const miembro = {
      empresaId: IdEmpresa.de('00000000-0000-4000-8000-000000000001'),
      usuarioId: IdUsuario.de('00000000-0000-4000-8000-000000000002'),
      rol: 'cajero' as const,
      modo: 'simple' as const,
    };
    const cabeceras: Record<string, string> = {};
    const respuesta = { setHeader: (n: string, v: string) => (cabeceras[n] = v) };
    for (let i = 0; i < MAXIMO_DE_COMPROBANTES; i++) limite.exigir(miembro, respuesta);
    expect(() => limite.exigir(miembro, respuesta)).toThrow(expect.objectContaining({ status: 429 }));
    expect(Number(cabeceras['Retry-After'])).toBeGreaterThan(0);
  });
});
