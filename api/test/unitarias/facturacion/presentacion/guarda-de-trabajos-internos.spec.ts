import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { GuardaDeTrabajosInternos } from '../../../../src/modulos/facturacion/presentacion/http/guarda-de-trabajos-internos.js';

const TOKEN = 'a'.repeat(40);
const peticion = (authorization?: string) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }) }) as unknown as ExecutionContext;

describe('GuardaDeTrabajosInternos (HU-02.03)', () => {
  const guarda = new GuardaDeTrabajosInternos();
  afterEach(() => vi.unstubAllEnvs());

  it('deja pasar solo el token correcto', () => {
    vi.stubEnv('TOKEN_TRABAJOS_INTERNOS', TOKEN);
    expect(guarda.canActivate(peticion(`Bearer ${TOKEN}`))).toBe(true);
    expect(() => guarda.canActivate(peticion(`Bearer ${'b'.repeat(40)}`))).toThrow(UnauthorizedException);
    expect(() => guarda.canActivate(peticion(TOKEN))).toThrow(UnauthorizedException);
    expect(() => guarda.canActivate(peticion())).toThrow(UnauthorizedException);
  });

  it('sin token configurado, o con uno corto, el endpoint queda cerrado', () => {
    vi.stubEnv('TOKEN_TRABAJOS_INTERNOS', '');
    expect(() => guarda.canActivate(peticion('Bearer '))).toThrow(UnauthorizedException);
    vi.stubEnv('TOKEN_TRABAJOS_INTERNOS', 'corto');
    expect(() => guarda.canActivate(peticion('Bearer corto'))).toThrow(UnauthorizedException);
  });
});
