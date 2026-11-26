import { Injectable } from '@nestjs/common';
import {
  ENCABEZADO_DE_EMPRESA,
  type PeticionHttp,
  type ResolucionDeEmpresa,
  type ResolutorDeEmpresa,
} from '../../../../compartido/presentacion/empresa/index.js';
import { SesionDelToken, tokenDeLaPeticion } from '../../../identidad/index.js';
import { ComprobarMembresia } from '../../aplicacion/consultas/comprobar-membresia.js';
import { empresaElegida } from './empresa-elegida.js';

/**
 * Resolutor real de la empresa de la petición (HU-04.02, ADR-0011): la sesión dice quién es, X-Empresa dice
 * en qué empresa trabaja y la membresía, consultada en cada petición, dice si puede. Sin estado en el servidor:
 * cada pestaña o pantalla declara su empresa y ninguna pisa a otra.
 */
@Injectable()
export class ResolutorPorMembresia implements ResolutorDeEmpresa {
  constructor(
    private readonly sesionDelToken: SesionDelToken,
    private readonly comprobarMembresia: ComprobarMembresia,
  ) {}

  async resolver(peticion: PeticionHttp): Promise<ResolucionDeEmpresa> {
    const token = tokenDeLaPeticion(peticion.headers);
    const sesion = token ? await this.sesionDelToken.ejecutar(token) : null;
    if (!sesion) return { rechazo: 'sin-sesion' };

    const empresaId = empresaElegida(peticion.headers[ENCABEZADO_DE_EMPRESA]);
    if (empresaId === 'ausente') return { rechazo: 'sin-empresa-elegida' };
    if (empresaId === null) return { rechazo: 'empresa-ajena' };

    const contexto = await this.comprobarMembresia.ejecutar(sesion.usuario.id, empresaId);
    return contexto ? { contexto } : { rechazo: 'empresa-ajena' };
  }
}
