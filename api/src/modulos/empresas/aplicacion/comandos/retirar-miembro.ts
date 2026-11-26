import type { ContextoDeMiembro, Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { ErrorDominio, type IdUsuario, Permiso } from '../../../../compartido/dominio/index.js';
import { exigirQueQuedeUnDueno } from '../../dominio/reglas-de-gestion.js';
import type { RepositoriosDeEmpresas } from '../puertos/repositorio-empresas.js';
import { autorizarGestion } from './autorizar-gestion.js';

/**
 * Retira a una persona de la empresa sin borrar su membresía (HU-04.03). El dueño retira a cualquiera; cada
 * persona puede salirse por su cuenta. Nadie retira al último dueño. Surte efecto en la siguiente petición.
 */
export class RetirarMiembro {
  constructor(
    private readonly empresas: UnidadDeTrabajo<RepositoriosDeEmpresas>,
    private readonly reloj: Reloj,
  ) {}

  ejecutar(contexto: ContextoDeMiembro, objetivo: IdUsuario): Promise<void> {
    const saliendose = objetivo.valor === contexto.usuarioId.valor;
    return this.empresas.ejecutar(contexto, async ({ membresias }) => {
      const permiso = saliendose ? Permiso.VerEmpresa : Permiso.GestionarMiembros;
      const { duenosActivos } = await autorizarGestion(membresias, contexto.usuarioId, permiso);
      const membresia = await membresias.tomarVigente(objetivo);
      if (!membresia) throw new ErrorDominio('miembro.no-encontrado', 'Esa persona no está en la empresa');
      exigirQueQuedeUnDueno(membresia, null, duenosActivos);
      membresia.retirar(contexto.usuarioId, this.reloj.ahora());
      await membresias.guardar(membresia);
    });
  }
}
