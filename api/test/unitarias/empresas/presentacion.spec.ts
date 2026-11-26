import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ContextoDeMiembro } from '../../../src/compartido/aplicacion/index.js';
import { IdEmpresa, IdUsuario } from '../../../src/compartido/dominio/index.js';
import { excepcionDe } from '../../../src/compartido/presentacion/empresa/rechazos-de-empresa.js';
import type { ComprobarMembresia } from '../../../src/modulos/empresas/aplicacion/consultas/comprobar-membresia.js';
import { empresaElegida } from '../../../src/modulos/empresas/presentacion/http/empresa-elegida.js';
import { ResolutorPorMembresia } from '../../../src/modulos/empresas/presentacion/http/resolutor-por-membresia.js';
import type { SesionDelToken, SesionVigente } from '../../../src/modulos/identidad/index.js';

const TOKEN = 'a'.repeat(43);
const SUYA = '11111111-1111-4111-8111-111111111111';
const AJENA = '22222222-2222-4222-8222-222222222222';
const persona = IdUsuario.de('33333333-3333-4333-8333-333333333333');
const sesion = { usuario: { id: persona } } as SesionVigente;

/** Resolutor con dobles: una sesión vigente para TOKEN y membresía solo en SUYA. */
function resolutor() {
  const preguntas: string[] = [];
  const sesionDelToken = { ejecutar: (t: string) => Promise.resolve(t === TOKEN ? sesion : null) } as SesionDelToken;
  const comprobar = {
    ejecutar: (u: IdUsuario, e: IdEmpresa): Promise<ContextoDeMiembro | null> => {
      preguntas.push(`${u.valor}@${e.valor}`);
      return Promise.resolve(e.valor === SUYA ? { empresaId: e, usuarioId: u, rol: 'cajero' } : null);
    },
  } as ComprobarMembresia;
  return { preguntas, resolutor: new ResolutorPorMembresia(sesionDelToken, comprobar) };
}

const peticion = (encabezados: Record<string, string | string[] | undefined>) => ({ headers: encabezados });

describe('ResolutorPorMembresia', () => {
  it('con sesión y membresía, la petición corre en la empresa elegida, con el rol del miembro', async () => {
    const { resolutor: r, preguntas } = resolutor();
    const resolucion = await r.resolver(peticion({ authorization: `Bearer ${TOKEN}`, 'x-empresa': SUYA.toUpperCase() }));
    expect(resolucion).toEqual({ contexto: { empresaId: IdEmpresa.de(SUYA), usuarioId: persona, rol: 'cajero' } });
    expect(preguntas).toEqual([`${persona.valor}@${SUYA}`]);
  });

  it('sin token o con uno que no es de una sesión vigente: sin-sesion, sin mirar la empresa', async () => {
    const { resolutor: r, preguntas } = resolutor();
    expect(await r.resolver(peticion({ 'x-empresa': SUYA }))).toEqual({ rechazo: 'sin-sesion' });
    expect(await r.resolver(peticion({ authorization: TOKEN, 'x-empresa': SUYA }))).toEqual({ rechazo: 'sin-sesion' });
    expect(await r.resolver(peticion({ authorization: `Bearer ${'b'.repeat(43)}`, 'x-empresa': SUYA }))).toEqual({ rechazo: 'sin-sesion' });
    expect(preguntas).toEqual([]);
  });

  it('con sesión pero sin X-Empresa: sin-empresa-elegida', async () => {
    const { resolutor: r } = resolutor();
    expect(await r.resolver(peticion({ authorization: `Bearer ${TOKEN}` }))).toEqual({ rechazo: 'sin-empresa-elegida' });
    expect(await r.resolver(peticion({ authorization: `Bearer ${TOKEN}`, 'x-empresa': '' }))).toEqual({ rechazo: 'sin-empresa-elegida' });
  });

  it('empresa ajena, mal escrita o repetida: empresa-ajena, sin distinguir', async () => {
    const { resolutor: r } = resolutor();
    for (const elegida of [AJENA, 'no-es-uuid', [SUYA, AJENA]]) {
      expect(await r.resolver(peticion({ authorization: `Bearer ${TOKEN}`, 'x-empresa': elegida }))).toEqual({ rechazo: 'empresa-ajena' });
    }
  });
});

describe('empresaElegida', () => {
  it('normaliza el uuid y distingue ausente de mal escrita', () => {
    expect(empresaElegida(undefined)).toBe('ausente');
    expect(empresaElegida(` ${SUYA.toUpperCase()} `)?.toString()).toBe(SUYA);
    expect(empresaElegida('123')).toBeNull();
  });
});

describe('excepcionDe', () => {
  it('cada rechazo tiene su estado HTTP y un código estable', () => {
    expect(excepcionDe('sin-sesion')).toBeInstanceOf(UnauthorizedException);
    expect(excepcionDe('sin-empresa-elegida')).toBeInstanceOf(BadRequestException);
    const ajena = excepcionDe('empresa-ajena');
    expect(ajena).toBeInstanceOf(NotFoundException);
    expect(ajena.getResponse()).toEqual({ codigo: 'empresa.no-encontrada', mensaje: 'No encontramos esa empresa' });
    const sinPermiso = excepcionDe('sin-permiso');
    expect(sinPermiso).toBeInstanceOf(ForbiddenException);
    expect(sinPermiso.getResponse()).toEqual({ codigo: 'permiso.denegado', mensaje: 'No tienes permiso' });
  });
});
