import type { ContextoDeMiembro } from '../../../src/compartido/aplicacion/index.js';
import { BaseDeDatos } from '../../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../../src/compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { AgregarResolucion } from '../../../src/modulos/facturacion/aplicacion/configuracion/agregar-resolucion.js';
import { GuardarDatosFiscales } from '../../../src/modulos/facturacion/aplicacion/configuracion/guardar-datos-fiscales.js';
import { GuardarPreferencias } from '../../../src/modulos/facturacion/aplicacion/configuracion/guardar-preferencias.js';
import { GuardarSoftware } from '../../../src/modulos/facturacion/aplicacion/configuracion/guardar-software.js';
import { ObtenerConfiguracionDian } from '../../../src/modulos/facturacion/aplicacion/configuracion/obtener-configuracion-dian.js';
import type { RepositoriosDeConfiguracion } from '../../../src/modulos/facturacion/aplicacion/puertos/repositorios-de-configuracion.js';
import { datosFiscalesDelFacturador, pedidoDeVenta } from '../../../src/modulos/facturacion/dominio/index.js';
import { ConfiguracionDianGuardada } from '../../../src/modulos/facturacion/infraestructura/acceso-dian/configuracion-dian-guardada.js';
import { BitacoraPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/configuracion/bitacora-postgres.js';
import { DatosFiscalesPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/configuracion/datos-fiscales-postgres.js';
import { PreferenciasPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/configuracion/preferencias-postgres.js';
import { ResolucionesPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/configuracion/resoluciones-postgres.js';
import { SoftwaresPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/configuracion/softwares-postgres.js';
import { borrarEmpresaDePrueba, comoEmpresa, conexionDelDueno, enTransaccionDeshecha, errorDe, hayBase, hayDueno } from '../aislamiento/base-de-pruebas.js';
import { crearResolucion } from '../aislamiento/fabricas.js';
import { datosEscritos, resolucionEscrita, softwareEscrito } from '../../unitarias/facturacion/configuracion/datos-de-configuracion.js';
import { CUSTODIA_DE_PRUEBA, escenario, type Escenario, pedido } from '../ventas/apoyo.js';

// HU-07.04 contra PostgreSQL real, conectado como conta_api: lo que la pantalla del dueño guarda, lo que la base no
// deja cambiar aunque la API fallara (resoluciones, NIT con ventas, bitácora) y que la facturación usa lo guardado.

const LIMITE_MS = 60_000;

describe.skipIf(!hayBase || !hayDueno)('configuración DIAN (integración)', { timeout: LIMITE_MS }, () => {
  let baseDeDatos: BaseDeDatos;
  let uow: UnidadDeTrabajoPostgres<RepositoriosDeConfiguracion>;
  const creadas: string[] = [];

  beforeAll(() => {
    baseDeDatos = new BaseDeDatos(process.env, 5);
    uow = new UnidadDeTrabajoPostgres<RepositoriosDeConfiguracion>(baseDeDatos, (e) => ({
      datosFiscales: new DatosFiscalesPostgres(e),
      resoluciones: new ResolucionesPostgres(e),
      software: new SoftwaresPostgres(e),
      preferencias: new PreferenciasPostgres(e),
      bitacora: new BitacoraPostgres(e),
    }));
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

  async function nuevo(): Promise<Escenario & { dueno: ContextoDeMiembro }> {
    const e = await escenario(baseDeDatos);
    creadas.push(e.empresaId);
    return { ...e, dueno: { ...e.miembro, rol: 'dueno', segundoFactor: 'reciente' } };
  }

  it('agrega resoluciones sin cambiar ninguna: reintento, repetida y rango cruzado', async () => {
    const e = await nuevo();
    const agregar = new AgregarResolucion(uow, CUSTODIA_DE_PRUEBA);
    const id = crypto.randomUUID();
    const fe = resolucionEscrita({ prefijo: 'FE', numero: '18764000001', desde: 1, hasta: 1000, claveTecnica: 'clave-del-rango-fe' });
    expect(await agregar.ejecutar(e.dueno, id, fe)).toBe(true);
    expect(await agregar.ejecutar(e.dueno, id, fe)).toBe(false);
    // El mismo número de resolución con otro rango: repetida. El mismo rango con otro número: se cruza.
    const otroRango = { ...fe, desde: 2000, hasta: 3000 };
    expect(await agregar.ejecutar(e.dueno, crypto.randomUUID(), otroRango).catch((x: { codigo: string }) => x.codigo)).toBe('resolucion.repetida');
    const cruzada = { ...fe, numero: '18764000002', desde: 900, hasta: 2000 };
    expect(await agregar.ejecutar(e.dueno, crypto.randomUUID(), cruzada).catch((x: { codigo: string }) => x.codigo)).toBe('resolucion.rango-cruzado');
    expect(await agregar.ejecutar(e.dueno, id, { ...fe, hasta: 5000 }).catch((x: { codigo: string }) => x.codigo)).toBe('resolucion.id-en-uso');
    // Hallazgo M1: otra clave técnica u otro primer número con el mismo id no es un reintento.
    for (const otra of [{ ...fe, claveTecnica: 'otra-clave-del-rango' }, { ...fe, claveTecnica: null }, { ...fe, primerNumero: 50 }]) {
      expect(await agregar.ejecutar(e.dueno, id, otra).catch((x: { codigo: string }) => x.codigo)).toBe('resolucion.id-en-uso');
    }

    const leida = await new ObtenerConfiguracionDian(uow, e.reloj).ejecutar(e.dueno);
    expect(leida.resoluciones.find((r) => r.id === id)).toMatchObject({ conClaveTecnica: true, siguiente: 1, disponible: true });
    // La clave del rango se abre solo para el CUFE, con su empresa y su resolución.
    expect(await e.uow.ejecutar(e.miembro, ({ numeracion }) => numeracion.claveTecnica(id))).toBe('clave-del-rango-fe');

    // conta_api no puede editar ni borrar una resolución, ni guardar una clave en claro.
    await enTransaccionDeshecha(async (c) => {
      await comoEmpresa(c, e.empresaId);
      expect((await errorDe(c, `UPDATE conta.resoluciones_de_numeracion SET hasta = 9 WHERE id = $1`, [id]))?.message).toMatch(/permission denied/);
      expect((await errorDe(c, `DELETE FROM conta.resoluciones_de_numeracion WHERE id = $1`, [id]))?.message).toMatch(/permission denied/);
      const enClaro = `INSERT INTO conta.resoluciones_de_numeracion (empresa_id, id, numero, prefijo, desde, hasta, vigente_desde, vigente_hasta, siguiente, clase, clave_tecnica_cifrada)
        VALUES ($1, $2, '1', 'ZZ', 1, 10, '2026-01-01', '2026-12-31', 1, 'factura', 'clave-en-claro')`;
      expect((await errorDe(c, enClaro, [e.empresaId, crypto.randomUUID()]))?.message).toMatch(/check constraint/);
      const agotada = `INSERT INTO conta.resoluciones_de_numeracion (empresa_id, id, numero, prefijo, desde, hasta, vigente_desde, vigente_hasta, siguiente, clase)
        VALUES ($1, $2, '2', 'ZY', 1, 10, '2026-01-01', '2026-12-31', 11, 'factura')`;
      expect((await errorDe(c, agotada, [e.empresaId, crypto.randomUUID()]))?.message).toMatch(/dentro de su rango/);
    });
  });

  it('el NIT no cambia con ventas, ni por la API ni con SQL directo; los demás datos sí', async () => {
    const e = await nuevo();
    await e.registrar.ejecutar(e.miembro, pedidoDeVenta(pedido(e.productos)));
    const guardar = new GuardarDatosFiscales(uow);
    expect(
      await guardar.ejecutar(e.dueno, datosEscritos({ nit: '800197268', digitoVerificacion: null })).catch((x: { codigo: string }) => x.codigo),
    ).toBe('configuracion.nit-con-ventas');
    await guardar.ejecutar(e.dueno, datosEscritos({ razonSocial: 'Otra razón S.A.S.' }));
    await enTransaccionDeshecha(async (c) => {
      await comoEmpresa(c, e.empresaId);
      expect((await errorDe(c, `UPDATE conta.datos_fiscales SET nit = '800197268'`, []))?.message).toMatch(/NIT no cambia/);
      expect((await errorDe(c, `UPDATE conta.datos_fiscales SET empresa_id = gen_random_uuid()`, []))?.message).toMatch(/permission denied/);
    });
  });

  it('guarda el software cifrado y la facturación usa lo guardado; la bitácora solo crece', async () => {
    const e = await nuevo();
    await new GuardarSoftware(uow, CUSTODIA_DE_PRUEBA).ejecutar(e.dueno, softwareEscrito({ pin: 'pin77' }));
    const respaldo = { para: () => Promise.reject(new Error('no debía leer el entorno')) };
    const { configuracion } = await new ConfiguracionDianGuardada(uow, CUSTODIA_DE_PRUEBA, respaldo).para(e.miembro, 'factura');
    expect(configuracion.pinSoftware).toBe('pin77');

    await enTransaccionDeshecha(async (c) => {
      await comoEmpresa(c, e.empresaId);
      const { rows } = await c.query<{ pin: string }>(`SELECT pin_cifrado AS pin FROM conta.software_dian`);
      expect(rows[0]?.pin).toMatch(/^v1\./);
      expect(rows[0]?.pin).not.toContain('pin77');
      expect((await errorDe(c, `UPDATE conta.cambios_de_configuracion_dian SET seccion = 'preferencias'`, []))?.message).toMatch(/permission denied/);
      expect((await errorDe(c, `DELETE FROM conta.cambios_de_configuracion_dian`, []))?.message).toMatch(/permission denied/);
    });
  });

  it('guardar el software sin PIN no toca el PIN, aunque otro lo cambie al mismo tiempo (hallazgo M3)', async () => {
    const e = await nuevo();
    const guardar = new GuardarSoftware(uow, CUSTODIA_DE_PRUEBA);
    await guardar.ejecutar(e.dueno, softwareEscrito({ pin: 'VIEJO000' }));
    await Promise.all(
      Array.from({ length: 6 }, (_, i) => guardar.ejecutar(e.dueno, softwareEscrito(i % 2 === 0 ? { pin: null } : { pin: 'NUEVO7Z' }))),
    );
    const respaldo = { para: () => Promise.reject(new Error('no debía leer el entorno')) };
    const { configuracion } = await new ConfiguracionDianGuardada(uow, CUSTODIA_DE_PRUEBA, respaldo).para(e.miembro, 'factura');
    expect(configuracion.pinSoftware).toBe('NUEVO7Z');
  });

  it('el NIT no cambia mientras una venta tiene leído el emisor sin confirmar (hallazgo B3)', async () => {
    const e = await nuevo();
    const guardar = new GuardarDatosFiscales(uow);
    let soltar = (): void => undefined;
    const enCurso = e.uow.ejecutar(e.miembro, async ({ numeracion }) => {
      await numeracion.emisor();
      await new Promise<void>((listo) => (soltar = listo));
    });
    await new Promise((r) => setTimeout(r, 200));
    let resultado = 'esperando';
    const cambio = guardar
      .ejecutar(e.dueno, datosEscritos({ nit: '800197268', digitoVerificacion: null }))
      .then(() => 'cambiado', (x: { codigo: string }) => x.codigo)
      .then((r) => (resultado = r));
    await new Promise((r) => setTimeout(r, 300));
    // El cambio espera a que la venta termine: el emisor quedó leído con FOR SHARE.
    expect(resultado).toBe('esperando');
    soltar();
    await enCurso;
    await cambio;
    expect(resultado).toBe('cambiado');
  });

  it('si la venta en curso se confirmó primero, el trigger frena el NIT y responde con palabras, no 500 (hallazgo B3)', async () => {
    const e = await nuevo();
    await e.registrar.ejecutar(e.miembro, pedidoDeVenta(pedido(e.productos)));
    // Sin la revisión del caso de uso (como cuando la venta se confirmó mientras el cambio esperaba el bloqueo).
    const otro = datosFiscalesDelFacturador(datosEscritos({ nit: '800197268', digitoVerificacion: null }));
    expect(await uow.ejecutar(e.dueno, ({ datosFiscales }) => datosFiscales.guardar(otro))).toBe('nit-con-ventas');
  });

  it('con «siempre factura» la venta a consumidor final no sale con tiquete POS', async () => {
    const e = await nuevo();
    e.configuracion.posHabilitado = true;
    const dueno = await conexionDelDueno();
    try {
      await crearResolucion(dueno, e.empresaId, 1, 5000, { prefijo: 'EPOS', clase: 'pos' });
    } finally {
      await dueno.end();
    }
    await new GuardarPreferencias(uow).ejecutar(e.dueno, true);
    const p = pedidoDeVenta({ ...pedido(e.productos), documento: 'automatico' });
    await e.registrar.ejecutar(e.miembro, p);
    const venta = await e.consultar.ejecutar(e.miembro, p.id);
    expect(venta.venta.clase).toBe('factura');
  });
});
