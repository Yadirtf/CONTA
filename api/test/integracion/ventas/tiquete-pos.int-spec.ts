import { BaseDeDatos } from '../../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { Dinero } from '../../../src/compartido/dominio/index.js';
import { pedidoDeVenta, topeDelPos } from '../../../src/modulos/facturacion/dominio/index.js';
import type pg from 'pg';
import { borrarEmpresaDePrueba, comoEmpresa, conexionDelDueno, enTransaccionDeshecha, errorDe, hayBase, hayDueno, nuevoId } from '../aislamiento/base-de-pruebas.js';
import { crearResolucion, xmlDeTipo } from '../aislamiento/fabricas.js';
import { escenario, type Escenario, pedido } from './apoyo.js';

// HU-06.02 contra PostgreSQL real: la venta a consumidor final sale con tiquete POS de su propia resolución, y la base
// impide por su cuenta un POS por encima de 5 UVT, un POS con número de factura y un envío cuya clase no es la de su XML.

const LIMITE_MS = 60_000;
const COMPRADOR = JSON.stringify({ tipoIdentificacion: '13', numero: '222222222222', razonSocial: 'Consumidor final', tipoDePersona: 'natural' });

describe.skipIf(!hayBase || !hayDueno)('tiquete POS electrónico (integración)', { timeout: LIMITE_MS }, () => {
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
  }, LIMITE_MS);

  /** Empresa con resolución de factura (SETP) y, si se pide, otra de tiquete POS (EPOS) con su software. */
  async function nuevo({ conPos = true } = {}): Promise<Escenario & { resolucionPos: string | null }> {
    const e = await escenario(baseDeDatos);
    creadas.push(e.empresaId);
    if (!conPos) return { ...e, resolucionPos: null };
    e.configuracion.posHabilitado = true;
    const dueno = await conexionDelDueno();
    try {
      const resolucionPos = await crearResolucion(dueno, e.empresaId, 1, 5000, { prefijo: 'EPOS', clase: 'pos' });
      return { ...e, resolucionPos };
    } finally {
      await dueno.end();
    }
  }

  const vender = (e: Escenario, cambios?: Parameters<typeof pedido>[1] & { documento?: string }) =>
    e.registrar.ejecutar(e.miembro, pedidoDeVenta({ ...pedido(e.productos, cambios), documento: cambios?.documento }));

  const claseDelEnvio = async (empresaId: string, ventaId: string) => {
    const dueno = await conexionDelDueno();
    try {
      const { rows } = await dueno.query<{ venta: string; emision: string; envio: string }>(
        `SELECT v.clase AS venta, m.clase AS emision, d.clase AS envio
           FROM conta.ventas v
           JOIN conta.emisiones_de_venta m ON m.empresa_id = v.empresa_id AND m.venta_id = v.id
           JOIN conta.envios_dian d ON d.empresa_id = m.empresa_id AND d.id = m.envio_id
          WHERE v.empresa_id = $1 AND v.id = $2`,
        [empresaId, ventaId],
      );
      return rows[0] ?? null;
    } finally {
      await dueno.end();
    }
  };

  it('a consumidor final sale con tiquete POS de la resolución POS, y su envío es de la misma clase', async () => {
    const e = await nuevo();
    const { ventaId } = await vender(e);
    const { venta } = await e.consultar.ejecutar(e.miembro, ventaId);
    expect(venta.clase).toBe('pos');
    expect(venta.datos.numero.aTexto()).toBe('EPOS1');
    expect(await claseDelEnvio(e.empresaId, ventaId)).toEqual({ venta: 'pos', emision: 'pos', envio: 'pos' });
  });

  it('si el cliente pide factura, o la base pasa de 5 UVT, sale con factura y no gasta números del POS', async () => {
    const e = await nuevo();
    const pedida = await vender(e, { documento: 'factura' });
    // 125 gaseosas de $2.100,84 sin IVA pasan de $261.870 (5 UVT de 2026).
    const grande = await vender(e, { cantidad: '125' });
    for (const { ventaId } of [pedida, grande]) {
      const { venta } = await e.consultar.ejecutar(e.miembro, ventaId);
      expect(venta.clase).toBe('factura');
      expect(await claseDelEnvio(e.empresaId, ventaId)).toEqual({ venta: 'factura', emision: 'factura', envio: 'factura' });
    }
    const siguiente = await vender(e);
    expect((await e.consultar.ejecutar(e.miembro, siguiente.ventaId)).venta.datos.numero.aTexto()).toBe('EPOS1');
  });

  it('sin resolución POS, o con el POS de otra empresa, todo sale con factura', async () => {
    const conPos = await nuevo();
    const sinPos = await nuevo({ conPos: false });
    sinPos.configuracion.posHabilitado = true;
    const { ventaId } = await vender(sinPos);
    const { venta } = await sinPos.consultar.ejecutar(sinPos.miembro, ventaId);
    expect(venta.clase).toBe('factura');
    expect(venta.datos.numero.aTexto()).toBe('SETP990000000');
    // La resolución POS de la otra empresa sigue sin usar.
    const deLaOtra = await vender(conPos);
    expect((await conPos.consultar.ejecutar(conPos.miembro, deLaOtra.ventaId)).venta.datos.numero.aTexto()).toBe('EPOS1');
  });

  it('conta_api no puede guardar un POS por encima de 5 UVT ni con un número de factura, ni cambiar la clase', async () => {
    const e = await nuevo();
    const { ventaId } = await vender(e);
    const { venta, resolucionId } = (await e.uow.ejecutar(e.miembro, ({ ventas }) => ventas.conId(ventaId)))!;
    const resolucionFactura = await idDeResolucion(e.empresaId, 'factura');
    await enTransaccionDeshecha(async (cliente) => {
      await comoEmpresa(cliente, e.empresaId);
      const reservar = async (id: string) =>
        (await cliente.query<{ n: number }>(
          'UPDATE conta.resoluciones_de_numeracion SET siguiente = siguiente + 1 WHERE id = $1 RETURNING siguiente - 1 AS n',
          [id],
        )).rows[0]!.n;
      const insertar = (resolucion: string, prefijo: string, consecutivo: number, base: string) =>
        errorDe(
          cliente,
          `INSERT INTO conta.ventas (empresa_id, id, huella, resolucion_id, prefijo, consecutivo, emitida_en, medio_de_pago,
             comprador, base, iva, total, creada_por, clase)
           VALUES ($1, $2, $3, $4, $5, $6, now(), 'efectivo', $7, $8, 0, $8, $9, 'pos')`,
          [e.empresaId, nuevoId(), 'c'.repeat(64), resolucion, prefijo, consecutivo, COMPRADOR, base, venta.datos.creadaPor],
        );
      expect((await insertar(resolucionId, 'EPOS', await reservar(resolucionId), '261870.01'))?.message).toMatch(/5 UVT/);
      expect((await insertar(resolucionFactura, 'SETP', await reservar(resolucionFactura), '1000'))?.message).toMatch(/ventas_resolucion_de_su_clase/);
      expect(await errorDe(cliente, "UPDATE conta.ventas SET clase = 'factura' WHERE id = $1", [ventaId])).not.toBeNull();
      expect(await errorDe(cliente, "UPDATE conta.envios_dian SET clase = 'factura'", [])).not.toBeNull();
      expect(await errorDe(cliente, "UPDATE conta.resoluciones_de_numeracion SET clase = 'pos'", [])).not.toBeNull();
    });
  });

  it('conta_api no puede guardar un envío cuya clase no es la de su XML, ni con trucos de texto (H1)', async () => {
    const e = await nuevo();
    const cbc = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
    const codigo = (c: string) => `<cbc:InvoiceTypeCode>${c}</cbc:InvoiceTypeCode>`;
    // [clase declarada, XML, ¿entra?]. Una factura (01) solo entra como factura y un tiquete (20) solo como pos.
    const casos: [string, string, boolean][] = [
      ['factura', xmlDeTipo('01'), true],
      ['pos', xmlDeTipo('20'), true],
      ['pos', xmlDeTipo('01'), false],
      ['factura', xmlDeTipo('20'), false],
      // Factura con un 20 escondido: comentario, otra etiqueta, instrucción de proceso, texto escapado o un segundo código.
      ['pos', xmlDeTipo('01', `<!--${codigo('20')}-->`), false],
      ['pos', xmlDeTipo('01', `<x:Otra xmlns:x="urn:x">${codigo('20')}</x:Otra>`), false],
      ['pos', xmlDeTipo('01', `<?pi ${codigo('20')}?>`), false],
      ['pos', xmlDeTipo('01', `<cbc:Note>&lt;cbc:InvoiceTypeCode&gt;20&lt;/cbc:InvoiceTypeCode&gt;</cbc:Note>`), false],
      ['pos', xmlDeTipo('01', codigo('20')), false],
      // Tiquete escrito de otra forma: para un lector de XML sigue siendo 20, así que no puede pasar por factura.
      ['factura', xmlDeTipo('<![CDATA[20]]>'), false],
      ['factura', xmlDeTipo('&#50;0'), false],
      ['factura', xmlDeTipo('20').replace(`${codigo('20')}`, `<InvoiceTypeCode xmlns="${cbc}">20</InvoiceTypeCode>`), false],
      // Códigos con espacios o saltos no son ni factura ni tiquete.
      ['factura', xmlDeTipo(' 20 '), false],
      ['pos', xmlDeTipo('\n20'), false],
      // Sin código, o algo que no es XML.
      ['factura', '<Invoice/>', false],
      ['factura', 'no es xml', false],
    ];
    await enTransaccionDeshecha(async (cliente) => {
      await comoEmpresa(cliente, e.empresaId);
      for (const [i, [clase, xml, entra]] of casos.entries()) {
        const error = await errorDe(
          cliente,
          `INSERT INTO conta.envios_dian (empresa_id, id, cufe, numero, nit_emisor, anio, consecutivo, xml_firmado, estado, clase)
           VALUES ($1, $2, $3, 'X1', '900373076', 2026, $4, $5, 'pendiente', $6)`,
          [e.empresaId, nuevoId(), String(i % 10).repeat(96), i + 1, xml, clase],
        );
        expect({ caso: i, entra: error === null }).toEqual({ caso: i, entra });
      }
    });
  });
});

async function idDeResolucion(empresaId: string, clase: 'factura' | 'pos'): Promise<string> {
  const dueno: pg.Client = await conexionDelDueno();
  try {
    const { rows } = await dueno.query<{ id: string }>('SELECT id FROM conta.resoluciones_de_numeracion WHERE empresa_id = $1 AND clase = $2', [empresaId, clase]);
    return rows[0]!.id;
  } finally {
    await dueno.end();
  }
}

describe.skipIf(!hayBase || !hayDueno)('la UVT del dominio y la de la base (O4)', () => {
  it('dan el mismo tope del POS en cada año, también antes de cargar el año siguiente', async () => {
    const dueno = await conexionDelDueno();
    try {
      for (const fecha of ['2025-12-31', '2026-01-01', '2026-12-31', '2027-01-01', '2030-06-15']) {
        const { rows } = await dueno.query<{ tope: string | null }>('SELECT conta_sistema.tope_del_pos($1::date)::text AS tope', [fecha]);
        const enLaBase = rows[0]?.tope ?? null;
        expect({ fecha, tope: enLaBase === null ? null : Dinero.de(enLaBase).aTexto() }).toEqual({ fecha, tope: topeDelPos(fecha)?.aTexto() ?? null });
      }
    } finally {
      await dueno.end();
    }
  });
});
