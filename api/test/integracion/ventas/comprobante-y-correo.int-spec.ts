import pg from 'pg';
import { ErrorDominio } from '../../../src/compartido/dominio/index.js';
import { BaseDeDatos } from '../../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { EnviarCorreoDeFactura } from '../../../src/modulos/facturacion/aplicacion/comandos/enviar-correo-de-factura.js';
import { EnviarCorreosPendientes } from '../../../src/modulos/facturacion/aplicacion/comandos/enviar-correos-pendientes.js';
import { ProcesarEnvioDian } from '../../../src/modulos/facturacion/aplicacion/comandos/procesar-envio-dian.js';
import { ListarVentasRecientes } from '../../../src/modulos/facturacion/aplicacion/consultas/listar-ventas-recientes.js';
import { ObtenerComprobante } from '../../../src/modulos/facturacion/aplicacion/consultas/obtener-comprobante.js';
import type { CorreoSaliente } from '../../../src/modulos/facturacion/aplicacion/puertos/enviador-de-correo.js';
import type { ServicioWebDian } from '../../../src/modulos/facturacion/aplicacion/puertos/servicio-web-dian.js';
import { pedidoDeVenta, RespuestaDeLaDian } from '../../../src/modulos/facturacion/dominio/index.js';
import { RenderizadorPdfkit } from '../../../src/modulos/facturacion/infraestructura/comprobante-pdf/renderizador-pdfkit.js';
import { CorreosPendientesPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/correos/correos-pendientes-postgres.js';
import { borrarEmpresaDePrueba, comoEmpresa, conexionDelDueno, enTransaccionDeshecha, errorDe, hayBase, hayDueno, nuevoId } from '../aislamiento/base-de-pruebas.js';
import { crearUsuario } from '../aislamiento/fabricas.js';
import { RelojDePrueba, unidadDeTrabajoDeEnvios } from '../envio-dian/apoyo.js';
import { escenario, type Escenario } from './apoyo.js';

// HU-06.08 contra PostgreSQL real con la firma real: el PDF sale solo de una factura aceptada y siempre igual, la
// aceptación guarda el ApplicationResponse y pide el correo en la misma transacción, y el correo sale una sola vez.
// La DIAN y el proveedor de correo son dobles: nada sale de esta máquina.

const LIMITE_MS = 60_000;
const APPLICATION_RESPONSE = Buffer.from('<ApplicationResponse/>').toString('base64');

const codigoDe = async (promesa: Promise<unknown>): Promise<string> => {
  try {
    await promesa;
    return 'ninguno';
  } catch (e) {
    return e instanceof ErrorDominio ? e.codigo : String(e);
  }
};

/** La DIAN de mentiras: recibe el ZIP y después lo acepta con su ApplicationResponse. */
const dianQueAcepta: ServicioWebDian = {
  enviarSetDePruebas: () => Promise.resolve({ tipo: 'recibido', zipKey: 'zip-de-prueba' }),
  consultarValidacion: () =>
    Promise.resolve(RespuestaDeLaDian.de({ valida: true, codigo: '00', descripcion: 'Procesado Correctamente', mensajes: [], documento: APPLICATION_RESPONSE })),
};

describe.skipIf(!hayBase || !hayDueno)('comprobante y correo de la factura (integración)', { timeout: LIMITE_MS }, () => {
  let baseDeDatos: BaseDeDatos;
  let dueno: pg.Client;
  const creadas: string[] = [];

  beforeAll(async () => {
    baseDeDatos = new BaseDeDatos(process.env, 5);
    dueno = await conexionDelDueno();
  });
  afterAll(async () => {
    await baseDeDatos?.cerrar();
    try {
      for (const id of creadas) await borrarEmpresaDePrueba(dueno, id);
    } finally {
      await dueno.end();
    }
    // Borrar cada empresa toca 15 tablas: contra Neon pasa de los 10 s por defecto de los ganchos.
  }, LIMITE_MS);

  async function nuevo(): Promise<Escenario> {
    const e = await escenario(baseDeDatos);
    creadas.push(e.empresaId);
    return e;
  }

  /** Un comprador del catálogo con correo, sembrado por el dueño. */
  async function compradorConCorreo(e: Escenario): Promise<string> {
    const id = nuevoId();
    await dueno.query(
      `INSERT INTO conta.clientes (empresa_id, id, tipo_identificacion, numero, nombre, tipo_de_persona,
         responsabilidades_fiscales, responsable_de_iva, correo, creado_por)
       VALUES ($1, $2, '13', '1020304050', 'Ana Pérez', 'natural', '{R-99-PN}', false, 'ana@ejemplo.test', $3)`,
      [e.empresaId, id, await crearUsuario(dueno)],
    );
    return id;
  }

  async function vender(e: Escenario, compradorId: string | null = null): Promise<string> {
    const pedido = pedidoDeVenta({
      id: nuevoId(),
      lineas: [{ productoId: e.productos[0] as string, cantidad: '2' }],
      compradorId,
      medioDePago: 'efectivo',
    });
    return (await e.registrar.ejecutar(e.miembro, pedido)).ventaId;
  }

  /** Pasa el envío de la venta por la DIAN de mentiras hasta «aceptado», como lo haría el procesador. */
  async function aceptar(e: Escenario, ventaId: string): Promise<string> {
    const envio = await e.uow.ejecutar(e.miembro, ({ ventas }) => ventas.envioDe(ventaId));
    const envioId = envio?.envioId as string;
    const despertador = { programar: vi.fn() };
    const procesar = () =>
      new ProcesarEnvioDian(unidadDeTrabajoDeEnvios(baseDeDatos), dianQueAcepta, e.acceso, new RelojDePrueba(new Date()), despertador).ejecutar({
        empresaId: e.miembro.empresaId,
        envioId,
      });
    await procesar();
    await dueno.query(`UPDATE conta.envios_dian SET proximo_intento_en = now() - interval '1 second' WHERE id = $1`, [envioId]);
    await procesar();
    return envioId;
  }

  function correos(e: Escenario, enviados: CorreoSaliente[]) {
    const enviador = { enviar: (c: CorreoSaliente) => Promise.resolve(void enviados.push(c)) };
    const enviar = new EnviarCorreoDeFactura(e.uow, new RenderizadorPdfkit(), enviador, new RelojDePrueba(new Date()));
    return new EnviarCorreosPendientes(new CorreosPendientesPostgres(baseDeDatos), enviar);
  }

  it('el PDF sale solo de una factura aceptada, siempre igual, y la aceptación guarda el ApplicationResponse', async () => {
    const e = await nuevo();
    const ventaId = await vender(e);
    const obtener = new ObtenerComprobante(e.uow, new RenderizadorPdfkit());
    expect(await codigoDe(obtener.ejecutar(e.miembro, ventaId))).toBe('comprobante.en-camino');

    const envioId = await aceptar(e, ventaId);
    const [a, b] = [await obtener.ejecutar(e.miembro, ventaId), await obtener.ejecutar(e.miembro, ventaId)];
    expect(a.nombre).toBe('factura-SETP990000000.pdf');
    expect(Buffer.from(a.pdf).subarray(0, 5).toString()).toBe('%PDF-');
    expect(Buffer.from(a.pdf).equals(Buffer.from(b.pdf))).toBe(true);

    const { rows } = await dueno.query('SELECT xml_base64 FROM conta.respuestas_de_aceptacion WHERE envio_id = $1', [envioId]);
    expect(rows).toEqual([{ xml_base64: APPLICATION_RESPONSE }]);
    // Consumidor final: no hay a quién escribirle.
    expect((await dueno.query('SELECT 1 FROM conta.correos_de_factura WHERE venta_id = $1', [ventaId])).rowCount).toBe(0);

    const recientes = await new ListarVentasRecientes(e.uow).ejecutar(e.miembro);
    expect(recientes[0]).toMatchObject({ id: ventaId, numero: 'SETP990000000', estado: 'aceptada', comprador: 'Consumidor final' });
  });

  it('otra empresa no ve el comprobante ni la venta en sus recientes', async () => {
    const [e, otra] = [await nuevo(), await nuevo()];
    const ventaId = await vender(e);
    await aceptar(e, ventaId);
    const obtener = new ObtenerComprobante(otra.uow, new RenderizadorPdfkit());
    expect(await codigoDe(obtener.ejecutar(otra.miembro, ventaId))).toBe('venta.no-encontrada');
    expect((await new ListarVentasRecientes(otra.uow).ejecutar(otra.miembro)).map((v) => v.id)).not.toContain(ventaId);
  });

  it('con comprador con correo, la aceptación pide el correo y sale una sola vez con el PDF y el XML', async () => {
    const e = await nuevo();
    const ventaId = await vender(e, await compradorConCorreo(e));
    await aceptar(e, ventaId);
    const { rows: pedido } = await dueno.query('SELECT estado, intentos FROM conta.correos_de_factura WHERE venta_id = $1', [ventaId]);
    expect(pedido).toEqual([{ estado: 'pendiente', intentos: 0 }]);

    const enviados: CorreoSaliente[] = [];
    // El lote toma correos de todas las empresas de la base de pruebas: se mira solo el de esta venta.
    await correos(e, enviados).ejecutar(50);
    const deEstaVenta = enviados.filter((c) => c.idempotencia.endsWith(ventaId));
    expect(deEstaVenta).toHaveLength(1);
    expect(deEstaVenta[0]?.para).toBe('ana@ejemplo.test');
    expect(deEstaVenta[0]?.adjuntos.map((x) => x.tipo)).toEqual(['application/pdf', 'application/xml']);

    await correos(e, enviados).ejecutar(50);
    expect(enviados.filter((c) => c.idempotencia.endsWith(ventaId))).toHaveLength(1);
    const { rows: final } = await dueno.query('SELECT estado, intentos FROM conta.correos_de_factura WHERE venta_id = $1', [ventaId]);
    expect(final).toEqual([{ estado: 'enviado', intentos: 1 }]);
    const { rows: intentos } = await dueno.query('SELECT numero, resultado, detalle FROM conta.intentos_correo_de_factura WHERE venta_id = $1', [ventaId]);
    expect(intentos).toEqual([{ numero: 1, resultado: 'enviado', detalle: 'ok' }]);
  });

  it('un intento forjado con el mismo número no traba el correo ni el lote (N1)', async () => {
    const e = await nuevo();
    const ventaId = await vender(e, await compradorConCorreo(e));
    await aceptar(e, ventaId);
    await dueno.query(
      `INSERT INTO conta.intentos_correo_de_factura (empresa_id, venta_id, numero, resultado, detalle, duracion_ms, ocurrido_en)
       VALUES ($1, $2, 1, 'enviado', 'ok', 0, now())`,
      [e.empresaId, ventaId],
    );
    const enviados: CorreoSaliente[] = [];
    const lote = await correos(e, enviados).ejecutar(50);
    expect(lote.conError).toBe(0);
    expect(enviados.filter((c) => c.idempotencia.endsWith(ventaId))).toHaveLength(1);
    const { rows } = await dueno.query('SELECT estado, intentos FROM conta.correos_de_factura WHERE venta_id = $1', [ventaId]);
    expect(rows).toEqual([{ estado: 'enviado', intentos: 1 }]);
  });

  it('conta_api no reabre, edita ni borra correos e intentos, ni pide correos o aceptaciones que no corresponden', async () => {
    const e = await nuevo();
    const comprador = await compradorConCorreo(e);
    const ventaId = await vender(e, comprador);
    const pendienteId = await vender(e);
    const envioId = await aceptar(e, ventaId);
    await correos(e, []).ejecutar(50);
    const otraId = await vender(e, comprador);
    await aceptar(e, otraId);

    await enTransaccionDeshecha(async (cliente) => {
      await comoEmpresa(cliente, e.empresaId);
      const intentar = async (sql: string, valores: unknown[]) => (await errorDe(cliente, sql, valores))?.message ?? 'sin error';
      expect(await intentar(`UPDATE conta.correos_de_factura SET estado = 'pendiente', intentos = 2, proximo_intento_en = now() WHERE venta_id = $1`, [ventaId])).toMatch(/terminado no cambia/);
      // Hallazgo H6: un correo pendiente solo toma un intento a la vez y no se aplaza para siempre ni se adelanta sin fin.
      expect(await intentar('UPDATE conta.correos_de_factura SET intentos = intentos + 2 WHERE venta_id = $1', [otraId])).toMatch(/solo toma un intento/);
      expect(await intentar(`UPDATE conta.correos_de_factura SET proximo_intento_en = 'infinity' WHERE venta_id = $1`, [otraId])).toMatch(/solo toma un intento/);
      expect(
        await intentar(
          `UPDATE conta.correos_de_factura SET intentos = intentos + 1, ultima_falla = 'correo.en-curso', proximo_intento_en = '-infinity' WHERE venta_id = $1`,
          [otraId],
        ),
      ).toMatch(/entre ahora y 13 horas/);
      expect(
        await intentar(
          `UPDATE conta.correos_de_factura SET intentos = intentos + 1, ultima_falla = 'correo.en-curso', proximo_intento_en = now() + interval '30 days' WHERE venta_id = $1`,
          [otraId],
        ),
      ).toMatch(/entre ahora y 13 horas/);
      expect(await intentar('DELETE FROM conta.correos_de_factura WHERE venta_id = $1', [ventaId])).toMatch(/permission denied/);
      expect(await intentar('UPDATE conta.intentos_correo_de_factura SET detalle = $2 WHERE venta_id = $1', [ventaId, 'ok'])).toMatch(/permission denied/);
      expect(await intentar('DELETE FROM conta.respuestas_de_aceptacion WHERE envio_id = $1', [envioId])).toMatch(/permission denied/);
      expect(await intentar('UPDATE conta.correos_de_factura SET creado_en = now() WHERE venta_id = $1', [ventaId])).toMatch(/permission denied/);
      expect(
        await intentar(
          `INSERT INTO conta.correos_de_factura (empresa_id, venta_id, estado, intentos, proximo_intento_en) VALUES ($1, $2, 'pendiente', 0, now())`,
          [e.empresaId, pendienteId],
        ),
      ).toMatch(/Solo una venta aceptada/);
      expect(
        await intentar(
          `INSERT INTO conta.correos_de_factura (empresa_id, venta_id, estado, intentos, proximo_intento_en) VALUES ($1, $2, 'pendiente', 0, 'infinity')`,
          [e.empresaId, pendienteId],
        ),
      ).toMatch(/check constraint|nace pendiente/);
      expect(
        await intentar(`INSERT INTO conta.correos_de_factura (empresa_id, venta_id, estado, intentos) VALUES ($1, $2, 'enviado', 1)`, [
          e.empresaId,
          pendienteId,
        ]),
      ).toMatch(/nace pendiente/);
      const envioPendiente = await e.uow.ejecutar(e.miembro, ({ ventas }) => ventas.envioDe(pendienteId));
      expect(
        await intentar(`INSERT INTO conta.respuestas_de_aceptacion (empresa_id, envio_id, xml_base64) VALUES ($1, $2, 'PEE+')`, [
          e.empresaId,
          envioPendiente?.envioId,
        ]),
      ).toMatch(/Solo un envío aceptado/);
    });
  });

  it('los correos vencidos solo entregan ids, como conta_api y sin empresa, y leerlos no aplaza nada (H3)', async () => {
    const e = await nuevo();
    const ventaId = await vender(e, await compradorConCorreo(e));
    await aceptar(e, ventaId);
    await enTransaccionDeshecha(async (cliente) => {
      await comoEmpresa(cliente, null);
      const primera = await cliente.query('SELECT * FROM conta_sistema.correos_vencidos(1000)');
      expect(primera.fields.map((f) => f.name)).toEqual(['empresa_id', 'venta_id']);
      expect(primera.rowCount).toBeLessThanOrEqual(50);
      expect(primera.rows).toContainEqual({ empresa_id: e.empresaId, venta_id: ventaId });
      // Leerlos no reserva ni aplaza: el procesador de verdad los sigue viendo.
      const segunda = await cliente.query('SELECT * FROM conta_sistema.correos_vencidos(50)');
      expect(segunda.rows).toContainEqual({ empresa_id: e.empresaId, venta_id: ventaId });
    });
  });
});
