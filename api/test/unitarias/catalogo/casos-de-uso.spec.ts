import type { ContextoDeMiembro } from '../../../src/compartido/aplicacion/index.js';
import { ErrorDominio, IdEmpresa, IdUsuario, type Rol } from '../../../src/compartido/dominio/index.js';
import { CrearCliente } from '../../../src/modulos/catalogo/aplicacion/comandos/crear-cliente.js';
import { BuscarClientes } from '../../../src/modulos/catalogo/aplicacion/consultas/buscar-clientes.js';
import { Cliente, MAXIMO_DE_CLIENTES_NUEVOS_POR_DIA } from '../../../src/modulos/catalogo/dominio/clientes/index.js';
import { AHORA, CAJERO, ferreteria, idNuevo, vecina } from './datos-de-prueba.js';
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

describe('casos de uso de clientes', () => {
  let catalogo: CatalogoEnMemoria;
  let crear: CrearCliente;
  let buscar: BuscarClientes;

  beforeEach(() => {
    catalogo = new CatalogoEnMemoria();
    crear = new CrearCliente(catalogo, { ahora: () => AHORA });
    buscar = new BuscarClientes(catalogo);
  });

  describe('CrearCliente', () => {
    it('el cajero crea un comprador', async () => {
      const { cliente, creado } = await crear.ejecutar(miembro('cajero'), ferreteria());
      expect(creado).toBe(true);
      expect(catalogo.guardados).toEqual([{ empresaId: EMPRESA_A, cliente }]);
      // El candado va antes de contar: dos altas a la vez no pasan el tope diario (prueba de ataque H6).
      expect(catalogo.bloqueos).toBe(1);
    });

    it('repetir la petición con el mismo id no crea dos', async () => {
      const datos = ferreteria();
      await crear.ejecutar(miembro('cajero'), datos);
      const otraVez = await crear.ejecutar(miembro('cajero'), datos);
      expect(otraVez).toMatchObject({ creado: false, esReintento: true });
      expect(catalogo.guardados).toHaveLength(1);
    });

    it('un documento que ya existe devuelve el guardado sin cambiarlo', async () => {
      await crear.ejecutar(miembro('dueno'), ferreteria({ nombre: 'Nombre original' }));
      const { cliente, creado, esReintento } = await crear.ejecutar(miembro('cajero'), ferreteria({ nombre: 'Otro nombre' }));
      expect(creado).toBe(false);
      // Otro id: no es un reintento, así que la presentación no devuelve los datos de contacto.
      expect(esReintento).toBe(false);
      expect(cliente.datos.nombre).toBe('Nombre original');
    });

    it('el mismo documento en otra empresa es otro comprador', async () => {
      await crear.ejecutar(miembro('cajero', EMPRESA_A), ferreteria());
      const enB = await crear.ejecutar(miembro('cajero', EMPRESA_B), ferreteria());
      expect(enB.creado).toBe(true);
      expect(catalogo.guardados.map((g) => g.empresaId)).toEqual([EMPRESA_A, EMPRESA_B]);
    });

    it('un id que ya es de otro comprador de la empresa responde cliente.id-en-uso', async () => {
      const id = idNuevo();
      await crear.ejecutar(miembro('cajero'), ferreteria({ id }));
      expect(await codigoDe(crear.ejecutar(miembro('cajero'), vecina({ id })))).toBe('cliente.id-en-uso');
    });

    it('si otra petición gana la carrera con el mismo documento, devuelve la del ganador', async () => {
      const ganador = Cliente.crear(ferreteria(), CAJERO, AHORA);
      catalogo.antesDeInsertar = () => {
        catalogo.antesDeInsertar = null;
        catalogo.guardar(EMPRESA_A, ganador);
      };
      const { cliente, creado } = await crear.ejecutar(miembro('cajero'), ferreteria());
      expect(creado).toBe(false);
      expect(cliente).toBe(ganador);
    });

    it(`frena al llegar a ${MAXIMO_DE_CLIENTES_NUEVOS_POR_DIA} compradores nuevos en 24 horas`, async () => {
      for (let i = 0; i < MAXIMO_DE_CLIENTES_NUEVOS_POR_DIA; i++) {
        catalogo.guardar(EMPRESA_A, Cliente.crear(vecina({ numero: String(5000 + i) }), CAJERO, AHORA));
      }
      expect(await codigoDe(crear.ejecutar(miembro('cajero'), ferreteria()))).toBe('cliente.limite-diario');
      // Otra empresa no se ve afectada.
      expect((await crear.ejecutar(miembro('cajero', EMPRESA_B), ferreteria())).creado).toBe(true);
    });

    it('los datos inválidos no abren transacción ni guardan nada', async () => {
      expect(await codigoDe(crear.ejecutar(miembro('cajero'), ferreteria({ digitoEscrito: 1 })))).toBe('nit.digito-invalido');
      expect(catalogo.guardados).toEqual([]);
    });
  });

  describe('BuscarClientes', () => {
    beforeEach(async () => {
      await crear.ejecutar(miembro('dueno'), ferreteria());
      await crear.ejecutar(miembro('dueno'), vecina());
      await crear.ejecutar(miembro('dueno', EMPRESA_B), vecina({ numero: '8001999' }));
    });

    it('encuentra por el comienzo del documento y calcula el dígito si es un NIT', async () => {
      const { nit, clientes } = await buscar.ejecutar(miembro('cajero'), '800.197.268');
      expect(nit?.digitoVerificacion).toBe(4);
      expect(clientes.map((c) => c.datos.nombre)).toEqual(['Ferretería El Tornillo S.A.S.']);
    });

    it('no muestra compradores de otra empresa', async () => {
      const { clientes } = await buscar.ejecutar(miembro('cajero'), '800');
      expect(clientes.map((c) => c.identificacion.numero)).toEqual(['800197268']);
    });

    it('devuelve como máximo 10', async () => {
      for (let i = 0; i < 15; i++) await crear.ejecutar(miembro('dueno'), vecina({ numero: `777${i}` }));
      expect((await buscar.ejecutar(miembro('cajero'), '777')).clientes).toHaveLength(10);
    });

    it('rechaza términos de menos de 3 caracteres', async () => {
      expect(await codigoDe(buscar.ejecutar(miembro('cajero'), '80'))).toBe('cliente.busqueda-invalida');
    });
  });
});
