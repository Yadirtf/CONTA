import { IdEmpresa, IdUsuario } from '../../../../src/compartido/dominio/index.js';
import type { ContextoDeMiembro } from '../../../../src/compartido/aplicacion/index.js';
import { RegistrarVenta } from '../../../../src/modulos/facturacion/aplicacion/comandos/registrar-venta.js';
import { pedidoDeVenta } from '../../../../src/modulos/facturacion/dominio/index.js';
import { configuracionDePrueba as configuracionDian } from '../datos-de-prueba.js';
import { codigoDeAsync, PRODUCTO_EXCLUIDO, PRODUCTO_GRAVADO } from './apoyo.js';
import { CatalogoEnMemoria, VentasEnMemoria } from './ventas-en-memoria.js';

// HU-06.01: reglas de RegistrarVenta. Lo que depende de PostgreSQL (carreras, permisos) está en la integración.

const cajero: ContextoDeMiembro = {
  empresaId: IdEmpresa.de('aaaaaaaa-0000-4000-8000-000000000001'),
  usuarioId: IdUsuario.de('bbbbbbbb-0000-4000-8000-000000000001'),
  rol: 'cajero',
  modo: 'simple',
};

let contador = 0;
const pedido = (cambios: { compradorId?: string | null; productoId?: string } = {}) =>
  pedidoDeVenta({
    id: `cccccccc-0000-4000-8000-${String(++contador).padStart(12, '0')}`,
    lineas: [
      { productoId: cambios.productoId ?? PRODUCTO_GRAVADO, cantidad: '2' },
      { productoId: PRODUCTO_EXCLUIDO, cantidad: '1' },
    ],
    compradorId: cambios.compradorId ?? null,
    medioDePago: 'efectivo',
  });

function montar(opciones: { nit?: string; configurada?: boolean; emitirFalla?: boolean } = {}) {
  const ventas = new VentasEnMemoria();
  const catalogo = new CatalogoEnMemoria();
  const configuracion = {
    para: () =>
      opciones.configurada === false
        ? Promise.reject(new Error('sin configurar'))
        : Promise.resolve({ configuracion: configuracionDian(), nitDelFacturador: opciones.nit ?? '900373076' }),
  };
  const emitir = { ejecutar: vi.fn(() => (opciones.emitirFalla ? Promise.reject(new Error('firma')) : Promise.resolve())) };
  const despertador = { programar: vi.fn() };
  const reloj = { ahora: () => new Date('2026-11-27T15:00:00Z') };
  const registrar = new RegistrarVenta(ventas, catalogo, configuracion, emitir, reloj, despertador);
  return { ventas, catalogo, emitir, despertador, registrar };
}

describe('RegistrarVenta (HU-06.01)', () => {
  it('guarda la venta con el siguiente número, la encola y la emite', async () => {
    const { ventas, emitir, registrar } = montar();
    const p = pedido();
    expect(await registrar.ejecutar(cajero, p)).toEqual({ ventaId: p.id, nueva: true });
    const venta = ventas.guardadas.get(p.id);
    expect(venta?.datos.numero.aTexto()).toBe('SETP990000000');
    expect(venta?.total.aTexto()).toBe('8200.00');
    expect(ventas.encoladas).toEqual([p.id]);
    expect(emitir.ejecutar).toHaveBeenCalledWith(cajero, p.id);
  });

  it('si la emisión falla la venta sigue guardada y se programa el reparador', async () => {
    const { ventas, despertador, registrar } = montar({ emitirFalla: true });
    const p = pedido();
    expect((await registrar.ejecutar(cajero, p)).nueva).toBe(true);
    expect(ventas.guardadas.has(p.id)).toBe(true);
    expect(despertador.programar).toHaveBeenCalledWith(new Date('2026-11-27T15:01:00Z'));
  });

  it('sin configuración DIAN, sin datos fiscales o con otro NIT no gasta un número', async () => {
    for (const montaje of [montar({ configurada: false }), montar({ nit: '800199436' })]) {
      expect(await codigoDeAsync(montaje.registrar.ejecutar(cajero, pedido()))).toBe('facturacion.no-habilitada');
      expect(montaje.ventas.siguiente).toBe(990000000);
    }
    const sinEmisor = montar();
    sinEmisor.ventas.emisor = null;
    expect(await codigoDeAsync(sinEmisor.registrar.ejecutar(cajero, pedido()))).toBe('facturacion.no-habilitada');
  });

  it('sin resolución vigente o con el rango agotado no guarda la venta', async () => {
    const { ventas, registrar } = montar();
    ventas.resolucion = null;
    expect(await codigoDeAsync(registrar.ejecutar(cajero, pedido()))).toBe('facturacion.sin-numeracion');
    const agotada = montar();
    agotada.ventas.siguiente = 990000003;
    expect(await codigoDeAsync(agotada.registrar.ejecutar(cajero, pedido()))).toBe('facturacion.sin-numeracion');
    expect(agotada.ventas.guardadas.size).toBe(0);
  });

  it('respeta el tope diario de la empresa y el de cada persona, y devuelve el número', async () => {
    const empresa = montar();
    empresa.ventas.ventasDelDia = 3000;
    expect(await codigoDeAsync(empresa.registrar.ejecutar(cajero, pedido()))).toBe('venta.limite-diario');
    expect(empresa.ventas.siguiente).toBe(990000000);
    const persona = montar();
    persona.ventas.cupoDePersonaAgotado = true;
    expect(await codigoDeAsync(persona.registrar.ejecutar(cajero, pedido()))).toBe('venta.limite-por-persona');
    expect(persona.ventas.siguiente).toBe(990000000);
  });

  it('no vende un producto ni a un comprador que no están en el catálogo de la empresa', async () => {
    const { catalogo, registrar } = montar();
    expect(await codigoDeAsync(registrar.ejecutar(cajero, pedido({ productoId: 'dddddddd-0000-4000-8000-000000000001' })))).toBe(
      'venta.producto-no-encontrado',
    );
    catalogo.compradorExiste = false;
    expect(await codigoDeAsync(registrar.ejecutar(cajero, pedido({ compradorId: 'eeeeeeee-0000-4000-8000-000000000001' })))).toBe(
      'venta.comprador-no-encontrado',
    );
  });

  it('un reintento del mismo pedido no crea otra venta; otro pedido con el mismo id se rechaza', async () => {
    const { ventas, emitir, registrar } = montar();
    const p = pedido();
    await registrar.ejecutar(cajero, p);
    expect(await registrar.ejecutar(cajero, p)).toEqual({ ventaId: p.id, nueva: false });
    expect(ventas.siguiente).toBe(990000001);
    expect(emitir.ejecutar).toHaveBeenCalledTimes(1);
    const otro = pedidoDeVenta({ ...p, medioDePago: 'transferencia' });
    expect(await codigoDeAsync(registrar.ejecutar(cajero, otro))).toBe('venta.id-en-uso');
  });
});
