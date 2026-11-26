import { ForbiddenException, NotFoundException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IdEmpresa, IdUsuario, Permiso, type Rol } from '../../../src/compartido/dominio/index.js';
import { GuardaDeEmpresa, Requiere, type ResolucionDeEmpresa } from '../../../src/compartido/presentacion/empresa/index.js';

// GuardaDeEmpresa con permisos (HU-04.03, ADR-0012): pide el permiso del endpoint y niega por defecto.

class Endpoints {
  @Requiere(Permiso.VerInformes)
  informes(): void {}

  @Requiere(Permiso.Vender)
  vender(): void {}

  olvidado(): void {}
}

@Requiere(Permiso.GestionarMiembros)
class DeClase {
  algo(): void {}
}

const contexto = (rol: Rol): ResolucionDeEmpresa => ({
  contexto: { empresaId: IdEmpresa.de('11111111-1111-4111-8111-111111111111'), usuarioId: IdUsuario.de('22222222-2222-4222-8222-222222222222'), rol },
});

function ejecucion(clase: new () => object, metodo: string): ExecutionContext {
  const peticion = { headers: {} };
  return {
    getHandler: () => (clase.prototype as Record<string, unknown>)[metodo],
    getClass: () => clase,
    switchToHttp: () => ({ getRequest: () => peticion }),
  } as unknown as ExecutionContext;
}

function guarda(resolucion: ResolucionDeEmpresa) {
  const consultas: number[] = [];
  const resolutor = { resolver: () => (consultas.push(1), Promise.resolve(resolucion)) };
  return { consultas, guarda: new GuardaDeEmpresa(resolutor, new Reflector()) };
}

describe('GuardaDeEmpresa', () => {
  it('deja pasar al rol que tiene el permiso del endpoint', async () => {
    await expect(guarda(contexto('contador')).guarda.canActivate(ejecucion(Endpoints, 'informes'))).resolves.toBe(true);
    await expect(guarda(contexto('cajero')).guarda.canActivate(ejecucion(Endpoints, 'vender'))).resolves.toBe(true);
  });

  it('al cajero que abre informes le responde 403 «No tienes permiso»', async () => {
    const intento = guarda(contexto('cajero')).guarda.canActivate(ejecucion(Endpoints, 'informes'));
    await expect(intento).rejects.toBeInstanceOf(ForbiddenException);
    await expect(intento).rejects.toMatchObject({ response: { codigo: 'permiso.denegado', mensaje: 'No tienes permiso' } });
  });

  it('el permiso puede declararse en el controlador', async () => {
    await expect(guarda(contexto('cajero')).guarda.canActivate(ejecucion(DeClase, 'algo'))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guarda(contexto('dueno')).guarda.canActivate(ejecucion(DeClase, 'algo'))).resolves.toBe(true);
  });

  it('un endpoint sin @Requiere se niega por defecto, sin consultar la base', async () => {
    const { guarda: g, consultas } = guarda(contexto('dueno'));
    await expect(g.canActivate(ejecucion(Endpoints, 'olvidado'))).rejects.toThrow(/sin @Requiere/);
    expect(consultas).toEqual([]);
  });

  it('el rechazo del resolutor gana: quien no es miembro recibe 404, no 403', async () => {
    const intento = guarda({ rechazo: 'empresa-ajena' }).guarda.canActivate(ejecucion(Endpoints, 'informes'));
    await expect(intento).rejects.toBeInstanceOf(NotFoundException);
  });
});
