import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hayBase } from '../integracion/aislamiento/base-de-pruebas.js';
import { celularAlAzar, crearAppConCelulares, entrar, pasarSegundoFactor } from './apoyo/app-con-sesiones.js';

// HU-05.02 de punta a punta: el dueño crea productos con su precio e IVA (incluido, excluido o exento), el
// contador también, el cajero solo los lista para vender, y otra empresa no ve nada.

interface Producto {
  id: string;
  nombre: string;
  codigo: string | null;
  unidad: string;
  iva: { tipo: string; tarifa: string | null };
  precio: { total: string; base: string; iva: string };
}

/** Código al azar para no chocar con corridas anteriores en la misma base. */
const codigoAlAzar = (): string => `77${String(Math.floor(Math.random() * 1e10)).padStart(10, '0')}`;

describe.skipIf(!hayBase)('productos (e2e)', () => {
  const celulares = { dueno: celularAlAzar(), cajero: celularAlAzar(), contador: celularAlAzar(), ajeno: celularAlAzar() };
  type Quien = keyof typeof celulares;
  let app: INestApplication;
  const sesion: Record<Quien, string> = { dueno: '', cajero: '', contador: '', ajeno: '' };
  const empresa = { propia: '', ajena: '' };
  const codigo = codigoAlAzar();

  const api = () => request(app.getHttpServer());
  const como = (quien: Quien, enEmpresa = empresa.propia) => ({
    get: (ruta: string) => api().get(ruta).set('Authorization', sesion[quien]).set('X-Empresa', enEmpresa),
    post: (ruta: string, cuerpo: object) => api().post(ruta).set('Authorization', sesion[quien]).set('X-Empresa', enEmpresa).send(cuerpo),
  });
  const gaseosa = (cambios: object = {}) => ({
    id: randomUUID(),
    nombre: 'Gaseosa 400 ml',
    codigo,
    precio: '10000',
    tipoDeIva: 'gravado',
    tarifaIva: '19',
    ...cambios,
  });
  const listar = async (quien: Quien, buscar?: string, enEmpresa = empresa.propia) => {
    const ruta = buscar === undefined ? '/productos' : `/productos?buscar=${encodeURIComponent(buscar)}`;
    return ((await como(quien, enEmpresa).get(ruta).expect(200)).body as { productos: Producto[] }).productos;
  };

  beforeAll(async () => {
    app = await crearAppConCelulares(Object.values(celulares));
    for (const quien of Object.keys(sesion) as Quien[]) sesion[quien] = await entrar(app, celulares[quien]);
    const crearEmpresa = async (quien: Quien, razonSocial: string) =>
      ((await api().post('/empresas').set('Authorization', sesion[quien]).send({ razonSocial }).expect(201)).body as { id: string }).id;
    empresa.propia = await crearEmpresa('dueno', 'Tienda Doña Rosa');
    empresa.ajena = await crearEmpresa('ajeno', 'La competencia');
    for (const rol of ['cajero', 'contador'] as const) {
      await como('dueno').post('/miembros', { celular: celulares[rol], rol }).expect(201);
      await api().post(`/empresas/${empresa.propia}/invitacion/aceptar`).set('Authorization', sesion[rol]).expect(204);
    }
    await pasarSegundoFactor(app, sesion.contador);
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('el dueño crea un producto con IVA 19 % incluido y la API separa base e IVA exactos', async () => {
    const { body, headers } = await como('dueno').post('/productos', gaseosa()).expect(201);
    expect(headers['cache-control']).toBe('no-store');
    expect(body).toMatchObject({
      nombre: 'Gaseosa 400 ml',
      codigo,
      unidad: '94',
      iva: { tipo: 'gravado', tarifa: '19' },
      precio: { total: '10000.00', base: '8403.36', iva: '1596.64' },
    });
  });

  it('marca productos excluidos o exentos; un precio sin IVA se guarda con el IVA ya sumado', async () => {
    const excluido = await como('dueno').post('/productos', gaseosa({ codigo: null, nombre: 'Arroz x 5 kg', precio: '18000', tipoDeIva: 'excluido', tarifaIva: null })).expect(201);
    expect(excluido.body).toMatchObject({ iva: { tipo: 'excluido', tarifa: null }, precio: { total: '18000.00', base: '18000.00', iva: '0.00' } });
    const exento = await como('contador').post('/productos', gaseosa({ codigo: null, nombre: 'Huevos AA x 30', precio: '18000', tipoDeIva: 'exento', tarifaIva: null })).expect(201);
    expect(exento.body).toMatchObject({ iva: { tipo: 'exento', tarifa: '0' }, precio: { iva: '0.00' } });
    const sinIva = await como('dueno').post('/productos', gaseosa({ codigo: null, nombre: 'Tornillo', precio: '1000', precioIncluyeIva: false })).expect(201);
    expect(sinIva.body).toMatchObject({ precio: { total: '1190.00', base: '1000.00', iva: '190.00' } });
  }, 30_000);

  it('el cajero lista y busca productos para vender, pero no los crea', async () => {
    const denegado = await como('cajero').post('/productos', gaseosa({ codigo: null })).expect(403);
    expect(denegado.body).toMatchObject({ codigo: 'permiso.denegado' });
    const todos = await listar('cajero');
    expect(todos.map((p) => p.nombre)).toEqual(['Arroz x 5 kg', 'Gaseosa 400 ml', 'Huevos AA x 30', 'Tornillo']);
    expect((await listar('cajero', 'GASEÓSA')).map((p) => p.nombre)).toEqual(['Gaseosa 400 ml']);
    expect((await listar('cajero', codigo.slice(0, 6))).map((p) => p.codigo)).toEqual([codigo]);
  });

  it('repetir la petición devuelve el guardado (200); un código repetido con otro id es 409', async () => {
    const datos = gaseosa({ codigo: codigoAlAzar(), nombre: 'Agua' });
    await como('dueno').post('/productos', datos).expect(201);
    const otraVez = await como('dueno').post('/productos', { ...datos, precio: '1' }).expect(200);
    expect((otraVez.body as Producto).precio.total).toBe('10000.00');
    const choque = await como('dueno').post('/productos', gaseosa({ codigo: datos.codigo })).expect(409);
    expect(choque.body).toMatchObject({ codigo: 'producto.codigo-en-uso' });
  });

  it('la misma petición en paralelo crea un solo producto', async () => {
    const datos = gaseosa({ codigo: codigoAlAzar(), nombre: 'Paralelo' });
    const estados = (await Promise.all([1, 2, 3].map(() => como('dueno').post('/productos', datos)))).map((r) => r.status).sort();
    expect(estados).toEqual([200, 200, 201]);
    expect((await listar('dueno', 'paralelo')).length).toBe(1);
  }, 30_000);

  it('otra empresa no ve los productos; el mismo código allá es otro producto', async () => {
    expect(await listar('ajeno', undefined, empresa.ajena)).toEqual([]);
    await como('ajeno', empresa.propia).get('/productos').expect(404);
    await como('ajeno', empresa.ajena).post('/productos', gaseosa()).expect(201);
  });

  it('sin sesión o sin empresa no hay productos; datos inválidos responden 400 con su código', async () => {
    await api().get('/productos').expect(401);
    await api().get('/productos').set('Authorization', sesion.dueno).expect(400);
    const casos: [object, string][] = [
      [gaseosa({ precio: '10.001' }), 'producto.precio-invalido'],
      [gaseosa({ precio: '0' }), 'producto.precio-invalido'],
      [gaseosa({ tarifaIva: '16' }), 'iva.tarifa-invalida'],
      [gaseosa({ tipoDeIva: 'excluido' }), 'iva.tarifa-invalida'],
      [gaseosa({ unidad: 'XX' }), 'producto.unidad-invalida'],
      [gaseosa({ precio: 10000 }), 'peticion.campo-invalido'],
    ];
    for (const [cuerpo, esperado] of casos) {
      expect((await como('dueno').post('/productos', cuerpo).expect(400)).body, esperado).toMatchObject({ codigo: esperado });
    }
    await api().get('/productos?buscar=a&buscar=b').set('Authorization', sesion.dueno).set('X-Empresa', empresa.propia).expect(400);
  });
});
