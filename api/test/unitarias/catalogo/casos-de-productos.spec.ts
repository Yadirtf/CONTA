import type { ContextoDeMiembro } from '../../../src/compartido/aplicacion/index.js';
import { ErrorDominio, IdEmpresa, IdUsuario, type Rol } from '../../../src/compartido/dominio/index.js';
import { CrearProducto } from '../../../src/modulos/catalogo/aplicacion/comandos/crear-producto.js';
import { BuscarProductos } from '../../../src/modulos/catalogo/aplicacion/consultas/buscar-productos.js';
import {
  MAXIMO_DE_PRODUCTOS_NUEVOS_POR_DIA,
  MAXIMO_DE_PRODUCTOS_POR_PERSONA_AL_DIA,
  Producto,
} from '../../../src/modulos/catalogo/dominio/productos/index.js';
import { AHORA, CAJERO, idNuevo } from './datos-de-prueba.js';
import { gaseosa, arroz } from './datos-de-productos.js';
import { CatalogoEnMemoria } from './dobles.js';

const EMPRESA_A = '5a0c8f1e-6b2d-4e8f-9a1b-3c4d5e6f7a8b';
const EMPRESA_B = '7b1d9e2f-8c3e-4f9a-8b2c-4d5e6f7a8b9c';

const miembro = (rol: Rol, empresa = EMPRESA_A): ContextoDeMiembro => ({
  empresaId: IdEmpresa.de(empresa),
  usuarioId: IdUsuario.de(CAJERO),
  rol,
  modo: 'simple',
});

const codigoDe = async (promesa: Promise<unknown>): Promise<string | undefined> => {
  try {
    await promesa;
  } catch (error) {
    if (error instanceof ErrorDominio) return error.codigo;
    throw error;
  }
  return undefined;
};

describe('casos de uso de productos (HU-05.02)', () => {
  let catalogo: CatalogoEnMemoria;
  let crear: CrearProducto;
  let buscar: BuscarProductos;

  beforeEach(() => {
    catalogo = new CatalogoEnMemoria();
    crear = new CrearProducto(catalogo, { ahora: () => AHORA });
    buscar = new BuscarProductos(catalogo);
  });

  describe('CrearProducto', () => {
    it.each(['dueno', 'contador'] as const)('el %s crea un producto', async (rol) => {
      const { producto, creado } = await crear.ejecutar(miembro(rol), gaseosa());
      expect(creado).toBe(true);
      expect(catalogo.productos.guardados).toEqual([{ empresaId: EMPRESA_A, producto }]);
      expect(catalogo.productos.bloqueos).toBe(1);
    });

    it('el cajero no crea productos: no fija precios ni decide el IVA', async () => {
      expect(await codigoDe(crear.ejecutar(miembro('cajero'), gaseosa()))).toBe('permiso.denegado');
      expect(catalogo.productos.guardados).toEqual([]);
    });

    it('repetir la petición con el mismo id devuelve el guardado sin cambiarlo', async () => {
      const datos = gaseosa();
      await crear.ejecutar(miembro('dueno'), datos);
      const otraVez = await crear.ejecutar(miembro('dueno'), { ...datos, precio: '1' });
      expect(otraVez.creado).toBe(false);
      expect(otraVez.producto.datos.precio.aTexto()).toBe('2500.00');
      expect(catalogo.productos.guardados).toHaveLength(1);
    });

    it('un código que ya es de otro producto responde producto.codigo-en-uso', async () => {
      await crear.ejecutar(miembro('dueno'), gaseosa());
      expect(await codigoDe(crear.ejecutar(miembro('dueno'), gaseosa({ nombre: 'Otra' })))).toBe('producto.codigo-en-uso');
    });

    it('el mismo código y el mismo id en otra empresa son otro producto', async () => {
      const datos = gaseosa();
      await crear.ejecutar(miembro('dueno', EMPRESA_A), datos);
      expect((await crear.ejecutar(miembro('dueno', EMPRESA_B), datos)).creado).toBe(true);
    });

    it('si otra petición gana la carrera con el mismo id, devuelve la del ganador', async () => {
      const datos = gaseosa();
      const ganador = Producto.crear(datos, CAJERO, AHORA);
      catalogo.productos.antesDeInsertar = () => {
        catalogo.productos.antesDeInsertar = null;
        catalogo.productos.guardar(EMPRESA_A, ganador);
      };
      const { producto, creado } = await crear.ejecutar(miembro('dueno'), datos);
      expect(creado).toBe(false);
      expect(producto).toBe(ganador);
    });

    it(`frena al llegar a ${MAXIMO_DE_PRODUCTOS_NUEVOS_POR_DIA} productos nuevos en 24 horas`, async () => {
      for (let i = 0; i < MAXIMO_DE_PRODUCTOS_NUEVOS_POR_DIA; i++) {
        catalogo.productos.guardar(EMPRESA_A, Producto.crear(arroz({ nombre: `P${i}` }), CAJERO, AHORA));
      }
      expect(await codigoDe(crear.ejecutar(miembro('dueno'), gaseosa()))).toBe('producto.limite-diario');
      expect((await crear.ejecutar(miembro('dueno', EMPRESA_B), gaseosa())).creado).toBe(true);
    });

    it(`la persona tiene ${MAXIMO_DE_PRODUCTOS_POR_PERSONA_AL_DIA} altas al día entre todas sus empresas`, async () => {
      catalogo.productos.cupos.set(CAJERO, MAXIMO_DE_PRODUCTOS_POR_PERSONA_AL_DIA - 1);
      expect((await crear.ejecutar(miembro('dueno'), gaseosa())).creado).toBe(true);
      // Otra empresa suya no le da cupo nuevo (hallazgo N1).
      expect(await codigoDe(crear.ejecutar(miembro('dueno', EMPRESA_B), gaseosa({ id: idNuevo() })))).toBe(
        'producto.limite-por-persona',
      );
      expect(catalogo.productos.guardados).toHaveLength(1);
    });

    it('un reintento del mismo producto no gasta cupo', async () => {
      const datos = gaseosa();
      await crear.ejecutar(miembro('dueno'), datos);
      await crear.ejecutar(miembro('dueno'), datos);
      expect(catalogo.productos.cupos.get(CAJERO)).toBe(1);
    });

    it('los datos inválidos no abren transacción', async () => {
      expect(await codigoDe(crear.ejecutar(miembro('dueno'), gaseosa({ tarifaIva: '16' })))).toBe('iva.tarifa-invalida');
      expect(catalogo.productos.bloqueos).toBe(0);
    });
  });

  describe('BuscarProductos', () => {
    beforeEach(async () => {
      await crear.ejecutar(miembro('dueno'), gaseosa());
      await crear.ejecutar(miembro('dueno'), arroz());
      await crear.ejecutar(miembro('dueno'), arroz({ id: idNuevo(), nombre: 'Café molido', tipoDeIva: 'gravado', tarifaIva: '5' }));
      await crear.ejecutar(miembro('dueno', EMPRESA_B), arroz({ nombre: 'Gaseosa de la competencia' }));
    });

    it('el cajero lista los productos de su empresa ordenados por nombre', async () => {
      const productos = await buscar.ejecutar(miembro('cajero'), '');
      expect(productos.map((p) => p.datos.nombre)).toEqual(['Arroz x 5 kg', 'Café molido', 'Gaseosa 400 ml']);
    });

    it('encuentra por parte del nombre sin tildes ni mayúsculas, o por el comienzo del código', async () => {
      expect((await buscar.ejecutar(miembro('cajero'), 'CAFE')).map((p) => p.datos.nombre)).toEqual(['Café molido']);
      expect((await buscar.ejecutar(miembro('cajero'), '7702')).map((p) => p.datos.nombre)).toEqual(['Gaseosa 400 ml']);
    });

    it('no muestra productos de otra empresa', async () => {
      expect((await buscar.ejecutar(miembro('cajero'), 'gaseosa')).map((p) => p.datos.nombre)).toEqual(['Gaseosa 400 ml']);
    });
  });
});
