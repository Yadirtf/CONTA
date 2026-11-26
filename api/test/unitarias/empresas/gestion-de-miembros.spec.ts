import type { ContextoDeMiembro } from '../../../src/compartido/aplicacion/index.js';
import { IdUsuario, type Rol } from '../../../src/compartido/dominio/index.js';
import { CambiarMembresia } from '../../../src/modulos/empresas/aplicacion/comandos/cambiar-membresia.js';
import { CrearEmpresa } from '../../../src/modulos/empresas/aplicacion/comandos/crear-empresa.js';
import { InvitarMiembro } from '../../../src/modulos/empresas/aplicacion/comandos/invitar-miembro.js';
import { ResponderInvitacion } from '../../../src/modulos/empresas/aplicacion/comandos/responder-invitacion.js';
import { RetirarMiembro } from '../../../src/modulos/empresas/aplicacion/comandos/retirar-miembro.js';
import { ComprobarMembresia } from '../../../src/modulos/empresas/aplicacion/consultas/comprobar-membresia.js';
import { ListarMiembros } from '../../../src/modulos/empresas/aplicacion/consultas/listar-miembros.js';
import { MAXIMO_DE_INVITACIONES_POR_DIA } from '../../../src/modulos/empresas/index.js';
import { DirectorioEnMemoria, EmpresasEnMemoria } from './dobles.js';

const AHORA = new Date('2026-11-26T12:00:00Z');
const dueno = IdUsuario.de('11111111-1111-4111-8111-111111111111');
const CAJERO = '3001112222';
const CONTADOR = '3003334444';
const idPorCelular = (celular: string) => IdUsuario.de(`00000000-0000-4000-8000-00${celular}`);
const cajero = idPorCelular(CAJERO);
const contador = idPorCelular(CONTADOR);

async function preparar() {
  const base = new EmpresasEnMemoria();
  const directorio = new DirectorioEnMemoria(idPorCelular);
  let n = 0;
  const nuevoId = () => `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`;
  const reloj = { ahora: () => AHORA };
  const { empresa } = await new CrearEmpresa(base, base, reloj, nuevoId).ejecutar(dueno, 'Tienda Doña Rosa');
  const comprobar = new ComprobarMembresia(base);
  const responder = new ResponderInvitacion(base, reloj);
  /** Contexto tal como lo arma el resolutor; null si la persona no tiene membresía activa. */
  const como = async (u: IdUsuario): Promise<ContextoDeMiembro> => {
    const contexto = await comprobar.ejecutar(u, empresa.id);
    if (!contexto) throw new Error('sin membresía activa');
    return contexto;
  };
  const invitar = new InvitarMiembro(base, directorio, reloj, nuevoId);
  /** Invita y acepta: la persona queda activa con ese rol. */
  const sumar = async (celular: string, rol: Rol) => {
    await invitar.ejecutar(await como(dueno), { celular, rol });
    await responder.ejecutar(idPorCelular(celular), empresa.id, 'aceptar');
  };
  return {
    base,
    directorio,
    empresa,
    comprobar,
    como,
    sumar,
    invitar,
    responder,
    cambiar: new CambiarMembresia(base),
    retirar: new RetirarMiembro(base, reloj),
    listar: new ListarMiembros(base, directorio),
  };
}

describe('InvitarMiembro', () => {
  it('el dueño invita por celular; la persona entra solo al aceptar', async () => {
    const { invitar, como, comprobar, responder, empresa } = await preparar();
    const { membresia, celular } = await invitar.ejecutar(await como(dueno), { celular: CAJERO, rol: 'cajero' });
    expect({ rol: membresia.rol, modo: membresia.modo, estado: membresia.estado, celular }).toEqual({
      rol: 'cajero',
      modo: 'simple',
      estado: 'invitada',
      celular: '+57 300 *** 2222',
    });
    expect(await comprobar.ejecutar(cajero, empresa.id)).toBeNull();
    await responder.ejecutar(cajero, empresa.id, 'aceptar');
    expect(await comprobar.ejecutar(cajero, empresa.id)).toEqual({ empresaId: empresa.id, usuarioId: cajero, rol: 'cajero', modo: 'simple' });
  });

  it('un cajero no invita, y su intento no registra a nadie', async () => {
    const { invitar, como, sumar, directorio } = await preparar();
    await sumar(CAJERO, 'cajero');
    const registros = directorio.registros;
    await expect(invitar.ejecutar(await como(cajero), { celular: CONTADOR, rol: 'dueno' })).rejects.toMatchObject({ codigo: 'permiso.denegado' });
    expect(directorio.registros).toBe(registros);
  });

  it('el permiso se vuelve a mirar dentro de la transacción: un contexto viejo de dueño no alcanza', async () => {
    const { invitar, como, sumar, cambiar } = await preparar();
    await sumar(CONTADOR, 'dueno');
    const viejo = await como(contador);
    await cambiar.ejecutar(await como(dueno), contador, { rol: 'cajero' });
    await expect(invitar.ejecutar(viejo, { celular: CAJERO, rol: 'cajero' })).rejects.toMatchObject({ codigo: 'permiso.denegado' });
  });

  it('no invita dos veces a la misma persona ni pasa del tope diario', async () => {
    const { invitar, como } = await preparar();
    await invitar.ejecutar(await como(dueno), { celular: CAJERO, rol: 'cajero' });
    await expect(invitar.ejecutar(await como(dueno), { celular: CAJERO, rol: 'contador' })).rejects.toMatchObject({ codigo: 'miembro.ya-esta' });
    for (let i = 1; i < MAXIMO_DE_INVITACIONES_POR_DIA; i++) {
      await invitar.ejecutar(await como(dueno), { celular: `31000000${String(i).padStart(2, '0')}`, rol: 'cajero' });
    }
    await expect(invitar.ejecutar(await como(dueno), { celular: '3120000000', rol: 'cajero' })).rejects.toMatchObject({
      codigo: 'miembro.limite-diario',
    });
  });

  it('un celular inválido no llega a la empresa', async () => {
    const { invitar, como, base } = await preparar();
    await expect(invitar.ejecutar(await como(dueno), { celular: '123', rol: 'cajero' })).rejects.toMatchObject({ codigo: 'acceso.celular-invalido' });
    expect(base.membresias).toHaveLength(1);
  });
});

describe('ResponderInvitacion', () => {
  it('rechazar retira la invitación; sin invitación pendiente responde invitacion.no-encontrada', async () => {
    const { invitar, como, responder, empresa, base } = await preparar();
    await invitar.ejecutar(await como(dueno), { celular: CAJERO, rol: 'cajero' });
    await responder.ejecutar(cajero, empresa.id, 'rechazar');
    expect(base.de(empresa.id.valor, cajero)?.estado).toBe('retirada');
    await expect(responder.ejecutar(cajero, empresa.id, 'aceptar')).rejects.toMatchObject({ codigo: 'invitacion.no-encontrada' });
    await expect(responder.ejecutar(dueno, empresa.id, 'aceptar')).rejects.toMatchObject({ codigo: 'invitacion.no-encontrada' });
  });
});

describe('CambiarMembresia', () => {
  it('el dueño cambia rol y modo; el modo se valida contra el rol nuevo', async () => {
    const { cambiar, como, sumar } = await preparar();
    await sumar(CAJERO, 'cajero');
    await expect(cambiar.ejecutar(await como(dueno), cajero, { modo: 'contador' })).rejects.toMatchObject({ codigo: 'miembro.modo-no-permitido' });
    const ascendido = await cambiar.ejecutar(await como(dueno), cajero, { rol: 'contador', modo: 'contador' });
    expect({ rol: ascendido.rol, modo: ascendido.modo }).toEqual({ rol: 'contador', modo: 'contador' });
    expect((await como(cajero)).rol).toBe('contador');
  });

  it('nadie cambia su propio rol, ni el contador gestiona a nadie', async () => {
    const { cambiar, como, sumar } = await preparar();
    await sumar(CONTADOR, 'contador');
    await expect(cambiar.ejecutar(await como(dueno), dueno, { rol: 'cajero' })).rejects.toMatchObject({ codigo: 'miembro.sobre-si-mismo' });
    await expect(cambiar.ejecutar(await como(contador), contador, { rol: 'dueno' })).rejects.toMatchObject({ codigo: 'permiso.denegado' });
  });

  it('con dos dueños, uno degrada al otro; el que queda ya no puede quedar sin dueño', async () => {
    const { cambiar, retirar, como, sumar } = await preparar();
    await sumar(CONTADOR, 'dueno');
    await cambiar.ejecutar(await como(dueno), contador, { rol: 'contador' });
    await expect(retirar.ejecutar(await como(dueno), dueno)).rejects.toMatchObject({ codigo: 'miembro.ultimo-dueno' });
  });

  it('a una persona que no está responde miembro.no-encontrado', async () => {
    const { cambiar, como } = await preparar();
    await expect(cambiar.ejecutar(await como(dueno), cajero, { rol: 'contador' })).rejects.toMatchObject({ codigo: 'miembro.no-encontrado' });
  });
});

describe('RetirarMiembro', () => {
  it('el dueño retira; desde ya la persona no tiene contexto, y puede volver con otra invitación', async () => {
    const { retirar, como, sumar, comprobar, empresa, base } = await preparar();
    await sumar(CAJERO, 'cajero');
    await retirar.ejecutar(await como(dueno), cajero);
    expect(await comprobar.ejecutar(cajero, empresa.id)).toBeNull();
    await expect(retirar.ejecutar(await como(dueno), cajero)).rejects.toMatchObject({ codigo: 'miembro.no-encontrado' });
    await sumar(CAJERO, 'cajero');
    expect(base.membresias.filter((m) => m.esDe(cajero)).map((m) => m.estado)).toEqual(['retirada', 'activa']);
  });

  it('cada quien puede salirse; un cajero no retira a otros', async () => {
    const { retirar, como, sumar, comprobar, empresa } = await preparar();
    await sumar(CAJERO, 'cajero');
    await sumar(CONTADOR, 'contador');
    await expect(retirar.ejecutar(await como(cajero), contador)).rejects.toMatchObject({ codigo: 'permiso.denegado' });
    await retirar.ejecutar(await como(cajero), cajero);
    expect(await comprobar.ejecutar(cajero, empresa.id)).toBeNull();
  });
});

describe('ListarMiembros', () => {
  it('el dueño ve invitadas y activas con el celular enmascarado; el cajero recibe «no tienes permiso»', async () => {
    const { listar, invitar, como, sumar } = await preparar();
    await sumar(CAJERO, 'cajero');
    await invitar.ejecutar(await como(dueno), { celular: CONTADOR, rol: 'contador' });
    const miembros = await listar.ejecutar(await como(dueno));
    expect(miembros.map((m) => [m.membresia.rol, m.membresia.estado, m.celular])).toEqual([
      ['dueno', 'activa', ''],
      ['cajero', 'activa', '+57 300 *** 2222'],
      ['contador', 'invitada', '+57 300 *** 4444'],
    ]);
    await expect(listar.ejecutar(await como(cajero))).rejects.toMatchObject({ codigo: 'permiso.denegado', message: 'No tienes permiso' });
  });
});
