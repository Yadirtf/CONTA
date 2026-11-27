import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CertificadoDeFirma } from '../../src/modulos/facturacion/aplicacion/firma/certificado-de-firma.js';
import { DESPERTADOR } from '../../src/modulos/facturacion/aplicacion/puertos/cola-de-trabajos.js';
import { PROVEEDOR_DE_ACCESO_DIAN } from '../../src/modulos/facturacion/aplicacion/puertos/proveedor-de-acceso-dian.js';
import { PROVEEDOR_DE_CONFIGURACION_DIAN } from '../../src/modulos/facturacion/aplicacion/puertos/proveedor-de-configuracion-dian.js';
import { conexionDelDueno, hayBase, hayDueno } from '../integracion/aislamiento/base-de-pruebas.js';
import { crearDatosFiscales, crearResolucion } from '../integracion/aislamiento/fabricas.js';
import { configuracionDePrueba } from '../integracion/ventas/apoyo.js';
import { CONTRASENA_DE_PRUEBA, juegoDeCertificados } from '../recursos/firma/certificados-de-prueba.js';
import { celularAlAzar, crearAppConCelulares, entrar } from './apoyo/app-con-sesiones.js';

// HU-06.01 de punta a punta: el cajero vende en un toque y ve el estado; la API nunca toma precios de la app, un
// reintento no duplica y otra empresa no ve ni vende nada ajeno. La DIAN no se llama (el despertador está quieto).

interface Venta {
  id: string;
  numero: string;
  total: string;
  iva: string;
  estado: string;
  mensaje: string;
  comprador: string;
}

const juego = juegoDeCertificados();
const accesoDePrueba = { para: () => Promise.resolve({ certificado: CertificadoDeFirma.de(juego.p12, CONTRASENA_DE_PRUEBA), testSetId: 'set' }) };

describe.skipIf(!hayBase || !hayDueno)('ventas (e2e)', () => {
  const celulares = { dueno: celularAlAzar(), cajero: celularAlAzar(), ajeno: celularAlAzar() };
  type Quien = keyof typeof celulares;
  let app: INestApplication;
  const sesion: Record<Quien, string> = { dueno: '', cajero: '', ajeno: '' };
  const empresa = { propia: '', ajena: '' };
  const producto = { propio: '', ajeno: '' };

  const api = () => request(app.getHttpServer());
  const como = (quien: Quien, enEmpresa = empresa.propia) => ({
    get: (ruta: string) => api().get(ruta).set('Authorization', sesion[quien]).set('X-Empresa', enEmpresa),
    post: (ruta: string, cuerpo: object) => api().post(ruta).set('Authorization', sesion[quien]).set('X-Empresa', enEmpresa).send(cuerpo),
  });
  const venta = (productoId = producto.propio, cambios: object = {}) => ({
    id: randomUUID(),
    lineas: [{ productoId, cantidad: '2' }],
    compradorId: null,
    medioDePago: 'efectivo',
    ...cambios,
  });

  beforeAll(async () => {
    app = await crearAppConCelulares(Object.values(celulares), [], (m) =>
      m
        .overrideProvider(PROVEEDOR_DE_CONFIGURACION_DIAN)
        .useValue(configuracionDePrueba)
        .overrideProvider(PROVEEDOR_DE_ACCESO_DIAN)
        .useValue(accesoDePrueba)
        .overrideProvider(DESPERTADOR)
        .useValue({ programar: () => undefined }),
    );
    for (const quien of Object.keys(sesion) as Quien[]) sesion[quien] = await entrar(app, celulares[quien]);
    const crearEmpresa = async (quien: Quien, razonSocial: string) =>
      ((await api().post('/empresas').set('Authorization', sesion[quien]).send({ razonSocial }).expect(201)).body as { id: string }).id;
    empresa.propia = await crearEmpresa('dueno', 'Tienda Doña Rosa');
    empresa.ajena = await crearEmpresa('ajeno', 'La competencia');
    await como('dueno').post('/miembros', { celular: celulares.cajero, rol: 'cajero' }).expect(201);
    await api().post(`/empresas/${empresa.propia}/invitacion/aceptar`).set('Authorization', sesion.cajero).expect(204);
    const crearProducto = async (quien: Quien, enEmpresa: string) =>
      (
        (await como(quien, enEmpresa).post('/productos', { id: randomUUID(), nombre: 'Gaseosa 400 ml', precio: '2500', tipoDeIva: 'gravado', tarifaIva: '19' }).expect(201))
          .body as { id: string }
      ).id;
    producto.propio = await crearProducto('dueno', empresa.propia);
    producto.ajeno = await crearProducto('ajeno', empresa.ajena);
    // Solo la empresa propia queda lista para facturar: la ajena no tiene datos fiscales ni resolución.
    const dueno = await conexionDelDueno();
    try {
      await crearDatosFiscales(dueno, empresa.propia);
      await crearResolucion(dueno, empresa.propia);
    } finally {
      await dueno.end();
    }
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('el cajero vende y recibe el número, el total con IVA y el estado pendiente', async () => {
    const { body, headers } = await como('cajero').post('/ventas', venta()).expect(201);
    expect(headers['cache-control']).toBe('no-store');
    expect(body).toMatchObject({ numero: 'SETP990000000', total: '5000.00', iva: '798.32', estado: 'pendiente' });
    expect((body as Venta).comprador).toMatch(/consumidor final/i);
    const leida = await como('cajero').get(`/ventas/${(body as Venta).id}`).expect(200);
    expect((leida.body as Venta).numero).toBe('SETP990000000');
  });

  it('repetir la misma venta devuelve 200 con la guardada; otro pedido con el mismo id es 409', async () => {
    const pedido = venta();
    const primera = await como('cajero').post('/ventas', pedido).expect(201);
    const repetida = await como('cajero').post('/ventas', pedido).expect(200);
    expect((repetida.body as Venta).numero).toBe((primera.body as Venta).numero);
    const { body } = await como('cajero').post('/ventas', { ...pedido, medioDePago: 'transferencia' }).expect(409);
    expect(body).toMatchObject({ codigo: 'venta.id-en-uso' });
  });

  it('rechaza un precio, un total o cualquier campo que la venta no espera', async () => {
    for (const extra of [{ total: '1' }, { precio: '1' }, { empresaId: empresa.ajena }]) {
      const { body } = await como('cajero').post('/ventas', venta(producto.propio, extra)).expect(400);
      expect(body).toMatchObject({ codigo: 'peticion.campo-invalido' });
    }
    const conPrecio = { ...venta(), lineas: [{ productoId: producto.propio, cantidad: '1', precio: '1' }] };
    await como('cajero').post('/ventas', conPrecio).expect(400);
    await como('cajero').post('/ventas', { ...venta(), lineas: [{ productoId: producto.propio, cantidad: 2 }] }).expect(400);
    await como('cajero').post('/ventas', venta(producto.propio, { medioDePago: 'fiado' })).expect(400);
  });

  it('no vende el producto de otra empresa ni deja ver sus ventas', async () => {
    const { body } = await como('cajero').post('/ventas', venta(producto.ajeno)).expect(422);
    expect(body).toMatchObject({ codigo: 'venta.producto-no-encontrado' });
    const propia = (await como('cajero').post('/ventas', venta()).expect(201)).body as Venta;
    await como('ajeno', empresa.ajena).get(`/ventas/${propia.id}`).expect(404);
    // Con su sesión pero la empresa de otro, la guarda responde como si esa empresa no existiera.
    await como('ajeno', empresa.propia).get(`/ventas/${propia.id}`).expect(404);
    await como('ajeno', empresa.propia).post('/ventas', venta()).expect(404);
  });

  it('una empresa sin datos fiscales ni resolución no puede facturar todavía', async () => {
    const { body } = await como('ajeno', empresa.ajena).post('/ventas', venta(producto.ajeno)).expect(409);
    expect(body).toMatchObject({ codigo: 'facturacion.no-habilitada' });
  });

  it('una venta que no existe o un id raro son 404', async () => {
    await como('cajero').get(`/ventas/${randomUUID()}`).expect(404);
    const { body } = await como('cajero').get("/ventas/1' OR '1'='1").expect(404);
    expect(body).toMatchObject({ codigo: 'venta.no-encontrada' });
  });

  it('sin sesión no se vende', async () => {
    await api().post('/ventas').set('X-Empresa', empresa.propia).send(venta()).expect(401);
  });
});
