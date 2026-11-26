import { IdEmpresa, IdUsuario } from '../../../src/compartido/dominio/index.js';
import { CrearEmpresa } from '../../../src/modulos/empresas/aplicacion/comandos/crear-empresa.js';
import { ComprobarMembresia } from '../../../src/modulos/empresas/aplicacion/consultas/comprobar-membresia.js';
import { ListarMisEmpresas } from '../../../src/modulos/empresas/aplicacion/consultas/listar-mis-empresas.js';
import { MAXIMO_DE_EMPRESAS_POR_PERSONA } from '../../../src/modulos/empresas/index.js';
import { EmpresasEnMemoria } from './dobles.js';

const AHORA = new Date('2026-11-26T12:00:00Z');
const reloj = { ahora: () => AHORA };
const persona = IdUsuario.de('11111111-1111-4111-8111-111111111111');
const otraPersona = IdUsuario.de('22222222-2222-4222-8222-222222222222');

function preparar() {
  const base = new EmpresasEnMemoria();
  let n = 0;
  const nuevoId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
  return {
    base,
    crear: new CrearEmpresa(base, base, reloj, nuevoId),
    listar: new ListarMisEmpresas(base),
    comprobar: new ComprobarMembresia(base),
  };
}

describe('CrearEmpresa', () => {
  it('crea la empresa y hace miembro a quien la crea, en la transacción de la empresa nueva', async () => {
    const { base, crear } = preparar();
    const { empresa, rol, modo, estado } = await crear.ejecutar(persona, '  Panadería La Espiga ');
    expect(empresa.razonSocial).toBe('Panadería La Espiga');
    expect({ rol, modo, estado }).toEqual({ rol: 'dueno', modo: 'simple', estado: 'activa' });
    const [fundadora] = base.membresias;
    expect(fundadora).toMatchObject({ empresaId: empresa.id, usuarioId: persona, rol: 'dueno', creadaEn: AHORA, aceptadaEn: AHORA });
    expect(base.transacciones).toEqual([`usuario:${persona.valor}`, `empresa:${empresa.id.valor}`]);
  });

  it('una razón social vacía no abre ninguna transacción', async () => {
    const { base, crear } = preparar();
    await expect(crear.ejecutar(persona, '   ')).rejects.toMatchObject({ codigo: 'empresa.razon-social-invalida' });
    expect(base.transacciones).toEqual([]);
  });

  it(`al llegar a ${MAXIMO_DE_EMPRESAS_POR_PERSONA} empresas no crea otra`, async () => {
    const { base, crear } = preparar();
    for (let i = 0; i < MAXIMO_DE_EMPRESAS_POR_PERSONA; i++) await crear.ejecutar(persona, `Empresa ${i}`);
    await expect(crear.ejecutar(persona, 'Una más')).rejects.toMatchObject({ codigo: 'empresa.limite' });
    expect(base.empresas.size).toBe(MAXIMO_DE_EMPRESAS_POR_PERSONA);
    await expect(crear.ejecutar(otraPersona, 'De otra persona')).resolves.toBeDefined();
  });
});

describe('ListarMisEmpresas', () => {
  it('da solo las empresas de la persona, por razón social', async () => {
    const { crear, listar } = preparar();
    await crear.ejecutar(persona, 'Tienda B');
    await crear.ejecutar(otraPersona, 'Ajena');
    await crear.ejecutar(persona, 'Almacén A');
    expect((await listar.ejecutar(persona)).map((e) => e.empresa.razonSocial)).toEqual(['Almacén A', 'Tienda B']);
    expect(await listar.ejecutar(IdUsuario.de('33333333-3333-4333-8333-333333333333'))).toEqual([]);
  });
});

describe('ComprobarMembresia', () => {
  it('da el contexto de la empresa, con el rol, solo a quien pertenece a ella', async () => {
    const { crear, comprobar } = preparar();
    const { empresa: suya } = await crear.ejecutar(persona, 'Suya');
    const { empresa: ajena } = await crear.ejecutar(otraPersona, 'Ajena');
    expect(await comprobar.ejecutar(persona, suya.id)).toEqual({ empresaId: suya.id, usuarioId: persona, rol: 'dueno', modo: 'simple' });
    expect(await comprobar.ejecutar(persona, ajena.id)).toBeNull();
    expect(await comprobar.ejecutar(persona, IdEmpresa.de('99999999-9999-4999-8999-999999999999'))).toBeNull();
  });
});
