// Dobles en memoria de los puertos de empresas: simulan lo que PostgreSQL impone con RLS (ADR-0011).
import type { ContextoEmpresa, ContextoUsuario, UnidadDeTrabajo, UnidadDeTrabajoDelUsuario } from '../../../src/compartido/aplicacion/index.js';
import type { RepositoriosDelUsuario } from '../../../src/modulos/empresas/aplicacion/puertos/repositorio-de-mis-empresas.js';
import type { RepositoriosDeEmpresas } from '../../../src/modulos/empresas/aplicacion/puertos/repositorio-empresas.js';
import type { Empresa } from '../../../src/modulos/empresas/dominio/empresa.js';
import type { Membresia } from '../../../src/modulos/empresas/dominio/membresia.js';

/** Base en memoria. Cada transacción ve solo la empresa de su contexto o, si es del usuario, sus empresas. */
export class EmpresasEnMemoria
  implements UnidadDeTrabajo<RepositoriosDeEmpresas>, UnidadDeTrabajoDelUsuario<RepositoriosDelUsuario>
{
  readonly empresas = new Map<string, Empresa>();
  readonly membresias: Membresia[] = [];
  /** Contextos de empresa con que se abrió cada transacción, en orden. */
  readonly transacciones: string[] = [];

  ejecutar<T>(contexto: ContextoEmpresa, trabajo: (r: RepositoriosDeEmpresas) => Promise<T>): Promise<T>;
  ejecutar<T>(contexto: ContextoUsuario, trabajo: (r: RepositoriosDelUsuario) => Promise<T>): Promise<T>;
  ejecutar<T>(contexto: ContextoEmpresa | ContextoUsuario, trabajo: (r: never) => Promise<T>): Promise<T> {
    if ('empresaId' in contexto) {
      this.transacciones.push(`empresa:${contexto.empresaId.valor}`);
      return trabajo(this.deEmpresa(contexto) as never);
    }
    this.transacciones.push(`usuario:${contexto.usuarioId.valor}`);
    return trabajo(this.delUsuario(contexto) as never);
  }

  private deEmpresa({ empresaId }: ContextoEmpresa): RepositoriosDeEmpresas {
    const propia = (id: string) => id === empresaId.valor;
    return {
      empresas: {
        buscar: (id) => Promise.resolve(propia(id.valor) ? (this.empresas.get(id.valor) ?? null) : null),
        agregar: (e) => this.poner(e, propia(e.id.valor) && !this.empresas.has(e.id.valor)),
        guardar: (e) => this.poner(e, propia(e.id.valor)),
      },
      membresias: {
        esMiembro: (u) =>
          Promise.resolve(this.membresias.some((m) => propia(m.empresaId.valor) && m.usuarioId.valor === u.valor)),
        agregar: (m) => {
          if (!propia(m.empresaId.valor)) return Promise.reject(new Error('RLS: membresía de otra empresa'));
          this.membresias.push(m);
          return Promise.resolve();
        },
      },
    };
  }

  private delUsuario({ usuarioId }: ContextoUsuario): RepositoriosDelUsuario {
    const suyas = () => this.membresias.filter((m) => m.usuarioId.valor === usuarioId.valor);
    return {
      misEmpresas: {
        listar: () =>
          Promise.resolve(
            suyas()
              .map((m) => this.empresas.get(m.empresaId.valor)!)
              .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)),
          ),
        contar: () => Promise.resolve(suyas().length),
      },
    };
  }

  private poner(empresa: Empresa, permitido: boolean): Promise<void> {
    if (!permitido) return Promise.reject(new Error('RLS o llave duplicada'));
    this.empresas.set(empresa.id.valor, empresa);
    return Promise.resolve();
  }
}
