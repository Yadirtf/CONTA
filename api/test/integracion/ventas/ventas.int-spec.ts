import { ErrorDominio } from '../../../src/compartido/dominio/index.js';
import { BaseDeDatos } from '../../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { pedidoDeVenta } from '../../../src/modulos/facturacion/dominio/index.js';
import pg from 'pg';
import { borrarEmpresaDePrueba, comoEmpresa, conexionDelDueno, enTransaccionDeshecha, errorDe, hayBase, hayDueno, nuevoId, url } from '../aislamiento/base-de-pruebas.js';
import { crearResolucion } from '../aislamiento/fabricas.js';
import { escenario, type Escenario, pedido } from './apoyo.js';

// HU-06.01 de punta a punta contra PostgreSQL real: número sin huecos ni repetidos, todo o nada, reintentos que no
// duplican y un reparador que termina la emisión si la firma falla. La DIAN no se llama: el envío queda en su cola.

const COMPRADOR = JSON.stringify({ tipoIdentificacion: '13', numero: '1', razonSocial: 'X', tipoDePersona: 'natural' });

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
    // Y cada una quedó en la cola de la DIAN en su misma petición: los envíos no chocan en su número de archivo (H1).
    const envios = await Promise.all(hechas.map((h) => e.uow.ejecutar(e.miembro, ({ ventas }) => ventas.envioDe(h.ventaId))));
    expect(envios.every((envio) => envio?.estado === 'pendiente')).toBe(true);
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

  it('si la firma falla la venta queda guardada, la falla se registra y el reparador la termina después', async () => {
    const e = await nuevo();
    e.acceso.falla = true;
    const { ventaId } = await vender(e);
    expect(await e.uow.ejecutar(e.miembro, ({ ventas }) => ventas.envioDe(ventaId))).toBeNull();
    expect(await e.uow.ejecutar(e.miembro, ({ emisiones }) => emisiones.fallasDe(ventaId))).toEqual({ intentos: 1, ultimaFalla: 'Error' });
    // Tras varias fallas seguidas la venta se ve «con demora» (H2), y se sigue intentando con esperas crecientes.
    for (const espera of [61_000, 61_000]) {
      e.reloj.adelantar(espera);
      expect((await e.reparador.ejecutar()).conError).toBe(1);
    }
    expect((await e.consultar.ejecutar(e.miembro, ventaId)).demorada).toBe(true);
    e.reloj.adelantar(61_000);
    expect((await e.reparador.ejecutar()).tomados).toBe(0);
    e.acceso.falla = false;
    e.reloj.adelantar(60 * 60_000);
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
      // Tampoco saltar números ni agotar el rango de un golpe (H4).
      expect(await errorDe(cliente, 'UPDATE conta.resoluciones_de_numeracion SET siguiente = siguiente + 1000', [])).not.toBeNull();
      expect(await errorDe(cliente, 'UPDATE conta.resoluciones_de_numeracion SET siguiente = hasta + 1', [])).not.toBeNull();
    });
  });

  it('conta_api no puede guardar una venta con un número no reservado, sin líneas o con un comprador raro (H5)', async () => {
    const e = await nuevo();
    const { ventaId } = await vender(e);
    const { venta, resolucionId } = (await e.uow.ejecutar(e.miembro, ({ ventas }) => ventas.conId(ventaId)))!;
    const insertar = (cliente: Parameters<typeof errorDe>[0], consecutivo: number, comprador: string) =>
      errorDe(
        cliente,
        `INSERT INTO conta.ventas (empresa_id, id, huella, resolucion_id, prefijo, consecutivo, emitida_en, medio_de_pago,
           comprador, base, iva, total, creada_por)
         VALUES ($1, $2, $3, $4, 'SETP', $5, now(), 'efectivo', $6, 1, 0, 1, $7)`,
        [e.empresaId, nuevoId(), 'c'.repeat(64), resolucionId, consecutivo, comprador, venta.datos.creadaPor],
      );
    const comprador = JSON.stringify({ tipoIdentificacion: '13', numero: '1', razonSocial: 'X', tipoDePersona: 'natural' });
    await enTransaccionDeshecha(async (cliente) => {
      await comoEmpresa(cliente, e.empresaId);
      expect(await insertar(cliente, 1, comprador)).not.toBeNull();
      expect(await insertar(cliente, 990000005, comprador)).not.toBeNull();
      expect(await insertar(cliente, 990000000, JSON.stringify({ x: 1 }))).not.toBeNull();
    });
    // Con un número recién reservado pero sin líneas, no se confirma.
    const cliente = new pg.Client({ connectionString: url });
    await cliente.connect();
    try {
      await cliente.query('BEGIN');
      await comoEmpresa(cliente, e.empresaId);
      const { rows } = await cliente.query<{ n: string }>(
        'UPDATE conta.resoluciones_de_numeracion SET siguiente = siguiente + 1 RETURNING siguiente - 1 AS n',
      );
      expect(await insertar(cliente, Number(rows[0]?.n), comprador)).toBeNull();
      await expect(cliente.query('COMMIT')).rejects.toThrow(/no cuadra|sin venta/);
    } finally {
      await cliente.end();
    }
  });

  it('conta_api no puede dejar números sin venta, agregar líneas a una venta ni atrasar su fecha (N2, N3)', async () => {
    const e = await nuevo();
    const { ventaId } = await vender(e);
    const confirmar = async (trabajo: (c: pg.Client) => Promise<unknown>) => {
      const cliente = new pg.Client({ connectionString: url });
      await cliente.connect();
      try {
        await cliente.query('BEGIN');
        await comoEmpresa(cliente, e.empresaId);
        await trabajo(cliente);
        await cliente.query('COMMIT');
        return null;
      } catch (error) {
        return error as Error;
      } finally {
        await cliente.end();
      }
    };
    expect(await confirmar((c) => c.query('UPDATE conta.resoluciones_de_numeracion SET siguiente = siguiente + 1'))).toMatchObject({
      message: expect.stringMatching(/sin venta/),
    });
    const linea = `INSERT INTO conta.lineas_de_venta (empresa_id, venta_id, orden, producto_id, descripcion, unidad, cantidad, precio,
       tipo_de_iva, tarifa_iva, base, iva, total) VALUES ($1, $2, 50, $3, 'Extra', '94', 1, 1000, 'excluido', null, 1000, 0, 1000)`;
    expect(await confirmar((c) => c.query(linea, [e.empresaId, ventaId, nuevoId()]))).toMatchObject({
      message: expect.stringMatching(/no cuadra/),
    });
    const { venta, resolucionId } = (await e.uow.ejecutar(e.miembro, ({ ventas }) => ventas.conId(ventaId)))!;
    const atrasada = await confirmar(async (c) => {
      const { rows } = await c.query<{ n: string }>('UPDATE conta.resoluciones_de_numeracion SET siguiente = siguiente + 1 RETURNING siguiente - 1 AS n');
      await c.query(
        `INSERT INTO conta.ventas (empresa_id, id, huella, resolucion_id, prefijo, consecutivo, emitida_en, medio_de_pago,
           comprador, base, iva, total, creada_por)
         VALUES ($1, $2, $3, $4, 'SETP', $5, now() - interval '400 days', 'efectivo', $6, 1000, 0, 1000, $7)`,
        [e.empresaId, nuevoId(), 'd'.repeat(64), resolucionId, rows[0]?.n, COMPRADOR, venta.datos.creadaPor],
      );
    });
    expect(atrasada?.message).toMatch(/hora actual/);
  });

  it('el prefijo va en mayúsculas: «setp» no puede duplicar los números de «SETP» (N1)', async () => {
    const e = await nuevo();
    const dueno = await conexionDelDueno();
    try {
      await expect(
        dueno.query(
          `INSERT INTO conta.resoluciones_de_numeracion (empresa_id, id, numero, prefijo, desde, hasta, vigente_desde, vigente_hasta, siguiente)
           VALUES ($1, $2, '18760000002', 'setp', 990000000, 995000000, '2019-01-19', '2030-01-19', 990000000)`,
          [e.empresaId, nuevoId()],
        ),
      ).rejects.toThrow(/check/);
    } finally {
      await dueno.end();
    }
  });

  it('una resolución que se cruza con otra del mismo prefijo no se puede cargar (H3)', async () => {
    const e = await nuevo();
    const dueno = await conexionDelDueno();
    try {
      await expect(crearResolucion(dueno, e.empresaId, 994000000, 999000000)).rejects.toThrow(/se cruza/);
    } finally {
      await dueno.end();
    }
  });
});
