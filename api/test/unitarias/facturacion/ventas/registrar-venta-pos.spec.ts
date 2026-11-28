import type { ContextoDeMiembro } from '../../../../src/compartido/aplicacion/index.js';
import { IdEmpresa, IdUsuario } from '../../../../src/compartido/dominio/index.js';
import { RegistrarVenta } from '../../../../src/modulos/facturacion/aplicacion/comandos/registrar-venta.js';
import { huellaDelPedido } from '../../../../src/modulos/facturacion/aplicacion/ventas/huella-del-pedido.js';
import { type ClaseDeDocumento, pedidoDeVenta, textoCanonicoDe } from '../../../../src/modulos/facturacion/dominio/index.js';
import { configuracionDePrueba, configuracionPosDePrueba } from '../datos-de-prueba.js';
import { resolucionPos } from '../documentos/datos-pos.js';
import { codigoDe, PRODUCTO_GRAVADO } from './apoyo.js';
import { CatalogoEnMemoria, VentasEnMemoria } from './ventas-en-memoria.js';

// HU-06.02: RegistrarVenta elige el documento. Tiquete POS solo en automático, a consumidor final, con el POS
// habilitado (software y resolución) y dentro de 5 UVT; si no, factura. Nunca gasta un número de la otra clase.

const cajero: ContextoDeMiembro = {
  empresaId: IdEmpresa.de('aaaaaaaa-0000-4000-8000-000000000001'),
  usuarioId: IdUsuario.de('bbbbbbbb-0000-4000-8000-000000000001'),
  rol: 'cajero',
  modo: 'simple',
};

let contador = 0;
const pedido = (cambios: { compradorId?: string | null; cantidad?: string; documento?: string } = {}) =>
  pedidoDeVenta({
    id: `eeeeeeee-0000-4000-8000-${String(++contador).padStart(12, '0')}`,
    lineas: [{ productoId: PRODUCTO_GRAVADO, cantidad: cambios.cantidad ?? '2' }],
    compradorId: cambios.compradorId ?? null,
    medioDePago: 'efectivo',
    documento: cambios.documento,
  });

function montar(opciones: { posConfigurado?: boolean; nitPos?: string; conResolucionPos?: boolean } = {}) {
  const ventas = new VentasEnMemoria();
  if (opciones.conResolucionPos !== false) ventas.resolucionPos = resolucionPos();
  const pidio: ClaseDeDocumento[] = [];
  const configuracion = {
    para: (_c: unknown, clase: ClaseDeDocumento) => {
      pidio.push(clase);
      if (clase === 'factura') return Promise.resolve({ configuracion: configuracionDePrueba(), nitDelFacturador: '900373076' });
      if (opciones.posConfigurado === false) return Promise.reject(new Error('sin software POS'));
      return Promise.resolve({ configuracion: configuracionPosDePrueba(), nitDelFacturador: opciones.nitPos ?? '900373076' });
    },
  };
  const registrar = new RegistrarVenta(
    ventas,
    new CatalogoEnMemoria(),
    configuracion,
    { ejecutar: vi.fn(() => Promise.resolve()) },
    { ahora: () => new Date('2026-11-27T15:00:00Z') },
    { programar: vi.fn() },
  );
  return { ventas, registrar, pidio };
}

async function claseDe(montaje: ReturnType<typeof montar>, p = pedido()) {
  await montaje.registrar.ejecutar(cajero, p);
  return montaje.ventas.guardadas.get(p.id);
}

describe('RegistrarVenta con tiquete POS (HU-06.02)', () => {
  it('a consumidor final, en automático y dentro del tope, sale tiquete POS con un número de la resolución POS', async () => {
    const montaje = montar();
    const venta = await claseDe(montaje);
    expect(venta?.clase).toBe('pos');
    expect(venta?.datos.numero.aTexto()).toBe('EPOS990000000');
    expect(montaje.ventas.siguiente).toBe(990000001);
  });

  it('con comprador, con «factura» pedida o por encima de 5 UVT sale factura', async () => {
    expect((await claseDe(montar(), pedido({ compradorId: 'ffffffff-0000-4000-8000-000000000001' })))?.clase).toBe('factura');
    expect((await claseDe(montar(), pedido({ documento: 'factura' })))?.clase).toBe('factura');
    // 125 gaseosas de $2.500: base $262.605,04 > $261.870.
    expect((await claseDe(montar(), pedido({ cantidad: '125' })))?.clase).toBe('factura');
    expect((await claseDe(montar(), pedido({ cantidad: '124' })))?.clase).toBe('pos');
  });

  it('HU-07.04: con «siempre factura» del dueño sale factura aunque el POS esté listo', async () => {
    const montaje = montar();
    montaje.ventas.siempreFactura = true;
    expect((await claseDe(montaje))?.clase).toBe('factura');
  });

  it('sin software POS, con otro NIT o sin resolución POS sale factura, sin error', async () => {
    expect((await claseDe(montar({ posConfigurado: false })))?.clase).toBe('factura');
    expect((await claseDe(montar({ nitPos: '800199436' })))?.clase).toBe('factura');
    expect((await claseDe(montar({ conResolucionPos: false })))?.clase).toBe('factura');
  });

  it('si se pide factura ni se consulta el software POS', async () => {
    const montaje = montar();
    await montaje.registrar.ejecutar(cajero, pedido({ documento: 'factura' }));
    expect(montaje.pidio).toEqual(['factura']);
  });

  it('no se puede pedir POS a la fuerza', () => {
    expect(codigoDe(() => pedido({ documento: 'pos' }))).toBe('venta.documento-invalido');
  });

  it('«factura» cambia la huella del pedido; automático conserva la de antes del POS', async () => {
    const base = { id: 'eeeeeeee-0000-4000-8000-000000009999', lineas: [{ productoId: PRODUCTO_GRAVADO, cantidad: '1' }], compradorId: null, medioDePago: 'efectivo' };
    const automatico = pedidoDeVenta(base);
    expect(textoCanonicoDe(automatico)).toBe(JSON.stringify([base.id, null, 'efectivo', [[PRODUCTO_GRAVADO, '1']]]));
    expect(await huellaDelPedido(pedidoDeVenta({ ...base, documento: 'factura' }))).not.toBe(await huellaDelPedido(automatico));
    expect(await huellaDelPedido(pedidoDeVenta({ ...base, documento: 'automatico' }))).toBe(await huellaDelPedido(automatico));
  });
});
