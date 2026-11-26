import type { Reloj, UnidadDeTrabajo, UnidadDeTrabajoDelUsuario } from '../../../../compartido/aplicacion/index.js';
import { IdEmpresa, type IdUsuario } from '../../../../compartido/dominio/index.js';
import { Empresa } from '../../dominio/empresa.js';
import { comprobarQuePuedeCrearOtra } from '../../dominio/limite-de-empresas.js';
import { nuevaMembresia } from '../../dominio/membresia.js';
import type { RepositoriosDelUsuario } from '../puertos/repositorio-de-mis-empresas.js';
import type { RepositoriosDeEmpresas } from '../puertos/repositorio-empresas.js';

/**
 * Crea una empresa y hace miembro a quien la crea, en una sola transacción de la empresa nueva (HU-04.02).
 * El id lo genera el servidor: uno elegido por el cliente podría apuntar a una empresa ajena.
 */
export class CrearEmpresa {
  constructor(
    private readonly empresas: UnidadDeTrabajo<RepositoriosDeEmpresas>,
    private readonly delUsuario: UnidadDeTrabajoDelUsuario<RepositoriosDelUsuario>,
    private readonly reloj: Reloj,
    private readonly nuevoId: () => string = () => crypto.randomUUID(),
  ) {}

  async ejecutar(usuarioId: IdUsuario, razonSocial: string): Promise<Empresa> {
    const empresa = Empresa.crear(IdEmpresa.de(this.nuevoId()), razonSocial);
    const queLleva = await this.delUsuario.ejecutar({ usuarioId }, ({ misEmpresas }) => misEmpresas.contar());
    comprobarQuePuedeCrearOtra(queLleva);
    await this.empresas.ejecutar({ empresaId: empresa.id }, async ({ empresas, membresias }) => {
      await empresas.agregar(empresa);
      await membresias.agregar(nuevaMembresia(empresa.id, usuarioId, this.reloj.ahora()));
    });
    return empresa;
  }
}
