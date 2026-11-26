import { IdEmpresa, IdUsuario } from '../../../src/compartido/dominio/index.js';
import { Membresia } from '../../../src/modulos/empresas/dominio/membresia.js';
import { exigirQueNoSeaElMismo, exigirQueNoTengaMembresia, exigirQueQuedeUnDueno } from '../../../src/modulos/empresas/dominio/reglas-de-gestion.js';
import { comprobarQuePuedeInvitar, MAXIMO_DE_INVITACIONES_POR_DIA, MAXIMO_DE_MIEMBROS_POR_EMPRESA } from '../../../src/modulos/empresas/dominio/limites-de-miembros.js';

const AHORA = new Date('2026-11-26T12:00:00Z');
const LUEGO = new Date('2026-11-26T13:00:00Z');
const empresa = IdEmpresa.de('11111111-1111-4111-8111-111111111111');
const dueno = IdUsuario.de('22222222-2222-4222-8222-222222222222');
const persona = IdUsuario.de('33333333-3333-4333-8333-333333333333');

const invitar = (rol: 'cajero' | 'contador' | 'dueno', modo?: 'simple' | 'contador') =>
  Membresia.invitar({ id: 'm1', empresaId: empresa, usuarioId: persona, rol, modo, invitadaPor: dueno, ahora: AHORA });

describe('Membresia', () => {
  it('quien crea la empresa es dueño, activo y en modo simple', () => {
    const m = Membresia.fundadora('m0', empresa, dueno, AHORA);
    expect({ rol: m.rol, modo: m.modo, estado: m.estado, aceptadaEn: m.aceptadaEn, invitadaPor: m.invitadaPor }).toEqual({
      rol: 'dueno',
      modo: 'simple',
      estado: 'activa',
      aceptadaEn: AHORA,
      invitadaPor: null,
    });
  });

  it('una invitación queda invitada, con el modo por defecto del rol', () => {
    expect(invitar('cajero')).toMatchObject({ estado: 'invitada', modo: 'simple', invitadaPor: dueno });
    expect(invitar('contador').modo).toBe('contador');
    expect(invitar('dueno', 'contador').modo).toBe('contador');
  });

  it('un cajero no se invita en modo contador', () => {
    expect(() => invitar('cajero', 'contador')).toThrow(expect.objectContaining({ codigo: 'miembro.modo-no-permitido' }));
  });

  it('aceptar la activa una sola vez; rechazar la retira por la misma persona', () => {
    const aceptada = invitar('cajero');
    aceptada.aceptar(LUEGO);
    expect(aceptada).toMatchObject({ estado: 'activa', aceptadaEn: LUEGO });
    expect(() => aceptada.aceptar(LUEGO)).toThrow(expect.objectContaining({ codigo: 'invitacion.no-encontrada' }));
    expect(() => aceptada.rechazar(LUEGO)).toThrow(expect.objectContaining({ codigo: 'invitacion.no-encontrada' }));

    const rechazada = invitar('cajero');
    rechazada.rechazar(LUEGO);
    expect(rechazada.estado).toBe('retirada');
    expect(rechazada.retiro).toEqual({ en: LUEGO, por: persona });
  });

  it('una membresía retirada no cambia más', () => {
    const m = invitar('contador');
    m.aceptar(AHORA);
    m.retirar(dueno, LUEGO);
    expect(m.retiro).toEqual({ en: LUEGO, por: dueno });
    for (const cambio of [() => m.retirar(dueno, LUEGO), () => m.cambiarRol('dueno'), () => m.cambiarModo('simple')]) {
      expect(cambio).toThrow(expect.objectContaining({ codigo: 'miembro.retirado' }));
    }
  });

  it('al pasar a cajero, un modo contador vuelve a simple; el modo se valida contra el rol', () => {
    const m = invitar('contador');
    m.cambiarRol('cajero');
    expect({ rol: m.rol, modo: m.modo }).toEqual({ rol: 'cajero', modo: 'simple' });
    expect(() => m.cambiarModo('contador')).toThrow(expect.objectContaining({ codigo: 'miembro.modo-no-permitido' }));
    m.cambiarRol('dueno');
    m.cambiarModo('contador');
    expect(m.modo).toBe('contador');
    m.cambiarRol('contador');
    expect(m.modo).toBe('contador');
  });
});

describe('reglas de gestión', () => {
  const activa = (rol: 'dueno' | 'cajero') => {
    const m = invitar(rol);
    m.aceptar(AHORA);
    return m;
  };

  it('nadie cambia su propio rol', () => {
    expect(() => exigirQueNoSeaElMismo(persona, activa('dueno'))).toThrow(expect.objectContaining({ codigo: 'miembro.sobre-si-mismo' }));
    expect(() => exigirQueNoSeaElMismo(dueno, activa('dueno'))).not.toThrow();
  });

  it('el último dueño activo no se degrada ni se retira; con otro dueño, sí', () => {
    const ultimo = expect.objectContaining({ codigo: 'miembro.ultimo-dueno' });
    expect(() => exigirQueQuedeUnDueno(activa('dueno'), 'cajero', 1)).toThrow(ultimo);
    expect(() => exigirQueQuedeUnDueno(activa('dueno'), null, 1)).toThrow(ultimo);
    expect(() => exigirQueQuedeUnDueno(activa('dueno'), 'dueno', 1)).not.toThrow();
    expect(() => exigirQueQuedeUnDueno(activa('dueno'), null, 2)).not.toThrow();
    expect(() => exigirQueQuedeUnDueno(activa('cajero'), null, 1)).not.toThrow();
    // Un dueño invitado que aún no acepta no cuenta como dueño activo: retirarlo no deja a nadie sin dueño.
    expect(() => exigirQueQuedeUnDueno(invitar('dueno'), null, 1)).not.toThrow();
  });

  it('una persona tiene a lo sumo una membresía vigente', () => {
    expect(() => exigirQueNoTengaMembresia(activa('cajero'))).toThrow(expect.objectContaining({ codigo: 'miembro.ya-esta' }));
    expect(() => exigirQueNoTengaMembresia(null)).not.toThrow();
  });

  it('topes de personas por empresa y de invitaciones por día', () => {
    expect(() => comprobarQuePuedeInvitar(MAXIMO_DE_MIEMBROS_POR_EMPRESA - 1, MAXIMO_DE_INVITACIONES_POR_DIA - 1)).not.toThrow();
    expect(() => comprobarQuePuedeInvitar(MAXIMO_DE_MIEMBROS_POR_EMPRESA, 0)).toThrow(expect.objectContaining({ codigo: 'miembro.limite' }));
    expect(() => comprobarQuePuedeInvitar(1, MAXIMO_DE_INVITACIONES_POR_DIA)).toThrow(expect.objectContaining({ codigo: 'miembro.limite-diario' }));
  });
});
