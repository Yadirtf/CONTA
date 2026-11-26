import { BadRequestException, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { descripcionSegura, FiltroDeFallas } from '../../../src/compartido/presentacion/fallas/filtro-de-fallas.js';

/** Respuesta HTTP falsa que guarda el estado y el cuerpo. */
function respuestaFalsa() {
  const guardado: { estado?: number; cuerpo?: unknown } = {};
  const respuesta = {
    status(codigo: number) {
      guardado.estado = codigo;
      return respuesta;
    },
    json(cuerpo: unknown) {
      guardado.cuerpo = cuerpo;
    },
  };
  const host = { switchToHttp: () => ({ getResponse: () => respuesta }) } as unknown as ArgumentsHost;
  return { host, guardado };
}

/** Error como el que lanza Drizzle: el mensaje lleva la consulta y sus parámetros; la causa, el SQLSTATE. */
function errorDeConsulta(): Error {
  const causa = Object.assign(new Error('new row violates check constraint'), { code: '23514', constraint: 'clientes_nombre_check' });
  return new Error('Failed query: insert into "conta"."clientes" params: 1020304050,Rosa Pérez,rosa@correo.co', { cause: causa });
}

describe('FiltroDeFallas (prueba de ataque H1)', () => {
  it('una falla inesperada responde 500 con referencia y el registro no lleva datos de la consulta', () => {
    const registrado: string[] = [];
    vi.spyOn(Logger.prototype, 'error').mockImplementation((mensaje: unknown) => {
      registrado.push(String(mensaje));
    });
    const { host, guardado } = respuestaFalsa();
    new FiltroDeFallas().catch(errorDeConsulta(), host);
    expect(guardado.estado).toBe(500);
    expect(guardado.cuerpo).toMatchObject({ codigo: 'servidor.falla', referencia: expect.any(String) as string });
    expect(registrado).toHaveLength(1);
    expect(registrado[0]).toContain('SQLSTATE 23514');
    expect(registrado[0]).toContain('clientes_nombre_check');
    for (const dato of ['1020304050', 'Rosa', 'rosa@correo.co', 'Failed query']) expect(registrado[0]).not.toContain(dato);
    vi.restoreAllMocks();
  });

  it('las HttpException responden igual que antes', () => {
    const { host, guardado } = respuestaFalsa();
    new FiltroDeFallas().catch(new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: 'Revisa' }), host);
    expect(guardado).toEqual({ estado: 400, cuerpo: { codigo: 'peticion.campo-invalido', mensaje: 'Revisa' } });
  });

  it('describe cosas que no son Error sin mostrarlas', () => {
    expect(descripcionSegura('cédula 1020304050')).toBe('string');
  });
});
