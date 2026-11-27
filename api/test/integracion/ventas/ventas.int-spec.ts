import { ErrorDominio } from '../../../src/compartido/dominio/index.js';
import { BaseDeDatos } from '../../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { pedidoDeVenta } from '../../../src/modulos/facturacion/dominio/index.js';
import { borrarEmpresaDePrueba, comoEmpresa, conexionDelDueno, enTransaccionDeshecha, errorDe, hayBase, hayDueno, nuevoId } from '../aislamiento/base-de-pruebas.js';
import { escenario, type Escenario, pedido } from './apoyo.js';

// HU-06.01 de punta a punta contra PostgreSQL real: número sin huecos ni repetidos, todo o nada, reintentos que no
// duplican y un reparador que termina la emisión si la firma falla. La DIAN no se llama: el envío queda en su cola.

const codigoDe = async (promesa: Promise<unknown>): Promise<string> => {
  try {
    await promesa;
    return 'ninguno';
  } catch (e) {
    return e instanceof ErrorDominio ? e.codigo : String(e);
  }
};

describe.skipIf(!hayBase || !hayDueno)('ventas con factura (integración)', () => {
  let baseDeDatos: BaseDeDatos;
  const creadas: string[] = [];

  beforeAll(() => {
    baseDeDatos = new BaseDeDatos(process.env, 5);
  });
  afterAll(async () => {
    await baseDeDatos?.cerrar();
    const dueno = await conexionDelDueno();
    try {
      for (const id of creadas) await borrarEmpresaDePrueba(dueno, id);
    } finally {
      await dueno.end();
    }
  });

  async function nuevo(rango?: { desde: number; hasta: number }): Promise<Escenario> {
    const e = await escenario(baseDeDatos, rango);
    creadas.push(e.empresaId);
    return e;
  }

  const vender = (e: Escenario, cambios?: Parameters<typeof pedido>[1]) => e.registrar.ejecutar(e.miembro, pedidoDeVenta(pedido(e.productos, cambios)));

  it('registra la venta con el primer número de la resolución y deja su factura en la cola de la DIAN', async () => {
    const e = await nuevo();
    const { ventaId, nueva } = await vender(e);
    expect(nueva).toBe(true);
    const { venta, estado } = await e.consultar.ejecutar(e.miembro, ventaId);
    expect(venta.datos.numero.aTexto()).toBe('SETP990000000');
    // 3 gaseosas de 2500 (con IVA) y un arroz excluido de 3200.
    expect(venta.total.aTexto()).toBe('10700.00');
    expect(venta.iva.aTexto()).toBe('1197.48');
    expect(estado).toBe('pendiente');
    const envio = await e.uow.ejecutar(e.miembro, ({ ventas }) => ventas.envioDe(ventaId));
    expect(envio?.estado).toBe('pendiente');
  });

  it('el mismo pedido otra vez devuelve la misma venta sin gastar otro número', async () => {
    const e = await nuevo();
    const id = nuevoId();
    await vender(e, { id });
    const repetida = await vender(e, { id });
    expect(repetida).toEqual({ ventaId: id, nueva: false });
    const segunda = await vender(e);
    const { venta } = await e.consultar.ejecutar(e.miembro, segunda.ventaId);
    expect(venta.datos.numero.consecutivo).toBe(990000001);
  });

  it('el mismo id con otro pedido se rechaza', async () => {
    const e = await nuevo();
    const id = nuevoId();
    await vender(e, { id });
    expect(await codigoDe(vender(e, { id, cantidad: '4' }))).toBe('venta.id-en-uso');
  });

  it('ventas al mismo tiempo reciben números seguidos, sin huecos ni repetidos', async () => {
    const e = await nuevo();
    const hechas = await Promise.all(Array.from({ length: 12 }, () => vender(e)));
    const numeros = await Promise.all(hechas.map(async (h) => (await e.consultar.ejecutar(e.miembro, h.ventaId)).venta.datos.numero.consecutivo));
    expect([...numeros].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => 990000000 + i));
  });

  it('el mismo id enviado varias veces a la vez crea una sola venta y un solo número', async () => {
    const e = await nuevo();
    const id = nuevoId();
    const resultados = await Promise.all(Array.from({ length: 5 }, () => vender(e, { id })));
    expect(resultados.filter((r) => r.nueva)).toHaveLength(1);
    const siguiente = await vender(e);
    const { venta } = await e.consultar.ejecutar(e.miembro, siguiente.ventaId);
    expect(venta.datos.numero.consecutivo).toBe(990000001);
  });

  it('si la firma falla la venta queda guardada y el reparador la termina después', async () => {
    const e = await nuevo();
    e.acceso.falla = true;
    const { ventaId } = await vender(e);
    expect(await e.uow.ejecutar(e.miembro, ({ ventas }) => ventas.envioDe(ventaId))).toBeNull();
    e.acceso.falla = false;
    e.reloj.adelantar(61_000);
    await e.reparador.ejecutar();
    const envio = await e.uow.ejecutar(e.miembro, ({ ventas }) => ventas.envioDe(ventaId));
    expect(envio?.estado).toBe('pendiente');
  });

  it('sin números disponibles no guarda la venta', async () => {
    const e = await nuevo({ desde: 990000000, hasta: 990000000 });
    await vender(e);
    expect(await codigoDe(vender(e))).toBe('facturacion.sin-numeracion');
  });

  it('un producto de otra empresa no se puede vender', async () => {
    const a = await nuevo();
    const b = await nuevo();
    const ajeno = pedidoDeVenta({ ...pedido(b.productos) });
    expect(await codigoDe(a.registrar.ejecutar(a.miembro, ajeno))).toBe('venta.producto-no-encontrado');
  });

  it('conta_api no puede cambiar ni borrar una venta ni bajar el consecutivo', async () => {
    const e = await nuevo();
    const { ventaId } = await vender(e);
    await enTransaccionDeshecha(async (cliente) => {
      await comoEmpresa(cliente, e.empresaId);
      expect(await errorDe(cliente, 'UPDATE conta.ventas SET total = 1 WHERE id = $1', [ventaId])).not.toBeNull();
      expect(await errorDe(cliente, 'DELETE FROM conta.ventas WHERE id = $1', [ventaId])).not.toBeNull();
      expect(await errorDe(cliente, 'DELETE FROM conta.lineas_de_venta WHERE venta_id = $1', [ventaId])).not.toBeNull();
      expect(await errorDe(cliente, 'UPDATE conta.resoluciones_de_numeracion SET siguiente = siguiente - 1', [])).not.toBeNull();
    });
  });
});
