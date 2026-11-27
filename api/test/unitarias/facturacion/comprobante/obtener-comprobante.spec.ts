import type { ContextoDeMiembro } from '../../../../src/compartido/aplicacion/index.js';
import { IdEmpresa, IdUsuario } from '../../../../src/compartido/dominio/index.js';
import { ListarVentasRecientes } from '../../../../src/modulos/facturacion/aplicacion/consultas/listar-ventas-recientes.js';
import { ObtenerComprobante } from '../../../../src/modulos/facturacion/aplicacion/consultas/obtener-comprobante.js';
import type { ComprobanteDeVenta } from '../../../../src/modulos/facturacion/dominio/index.js';
import { codigoDeAsync } from '../ventas/apoyo.js';
import { VentasEnMemoria } from '../ventas/ventas-en-memoria.js';
import { facturaAceptada, VENTA_ID, ventaDePrueba } from './apoyo.js';

const cajero: ContextoDeMiembro = {
  empresaId: IdEmpresa.de('00000000-0000-4000-8000-000000000001'),
  usuarioId: IdUsuario.de('00000000-0000-4000-8000-000000000002'),
  rol: 'cajero',
  modo: 'simple',
};

function preparar() {
  const memoria = new VentasEnMemoria();
  memoria.guardadas.set(VENTA_ID, ventaDePrueba());
  const dibujados: ComprobanteDeVenta[] = [];
  const renderizador = {
    pdf: (c: ComprobanteDeVenta) => {
      dibujados.push(c);
      return Promise.resolve(new Uint8Array([37, 80, 68, 70]));
    },
  };
  return { memoria, dibujados, obtener: new ObtenerComprobante(memoria, renderizador) };
}

describe('ObtenerComprobante (HU-06.08)', () => {
  it('entrega el PDF de una venta aceptada con su nombre de archivo', async () => {
    const { memoria, dibujados, obtener } = preparar();
    memoria.facturas.set(VENTA_ID, facturaAceptada());
    const archivo = await obtener.ejecutar(cajero, VENTA_ID);
    expect(archivo.nombre).toBe('factura-SETP990000001.pdf');
    expect(archivo.pdf.length).toBe(4);
    expect(dibujados[0]?.numero).toBe('SETP990000001');
  });

  it('dice «en camino» mientras la DIAN no la acepta, aunque ya esté firmada', async () => {
    const { memoria, obtener } = preparar();
    expect(await codigoDeAsync(obtener.ejecutar(cajero, VENTA_ID))).toBe('comprobante.en-camino');
    memoria.facturas.set(VENTA_ID, facturaAceptada('en-validacion'));
    expect(await codigoDeAsync(obtener.ejecutar(cajero, VENTA_ID))).toBe('comprobante.en-camino');
  });

  it('no comparte una factura rechazada', async () => {
    const { memoria, obtener } = preparar();
    memoria.facturas.set(VENTA_ID, facturaAceptada('rechazado'));
    expect(await codigoDeAsync(obtener.ejecutar(cajero, VENTA_ID))).toBe('comprobante.rechazado');
  });

  it('una venta que no es del negocio no existe', async () => {
    const { obtener } = preparar();
    expect(await codigoDeAsync(obtener.ejecutar(cajero, '99999999-9999-4999-8999-999999999999'))).toBe('venta.no-encontrada');
  });

  it('sin datos fiscales no inventa el emisor', async () => {
    const { memoria, obtener } = preparar();
    memoria.facturas.set(VENTA_ID, facturaAceptada());
    memoria.emisor = null;
    expect(await codigoDeAsync(obtener.ejecutar(cajero, VENTA_ID))).toBe('facturacion.no-habilitada');
  });
});

describe('ListarVentasRecientes (HU-06.08)', () => {
  it('lista de la más nueva a la más vieja con el estado en palabras del modo simple', async () => {
    const memoria = new VentasEnMemoria();
    memoria.guardadas.set('a', ventaDePrueba('a'));
    memoria.guardadas.set('b', ventaDePrueba('b'));
    memoria.facturas.set('a', facturaAceptada());
    const lista = await new ListarVentasRecientes(memoria).ejecutar(cajero);
    expect(lista.map((v) => [v.id, v.estado])).toEqual([
      ['b', 'pendiente'],
      ['a', 'aceptada'],
    ]);
    expect(lista[0]).toMatchObject({ numero: 'SETP990000001', total: '30300.00', comprador: 'Cliente de Prueba S.A.S.' });
  });
});
