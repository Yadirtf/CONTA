// Dobles en memoria de los puertos de empresas: simulan lo que PostgreSQL impone con RLS (ADR-0011) y la
// unicidad de la membresía vigente (ADR-0012). No simulan bloqueos: la concurrencia se prueba en integración.
import type { ContextoEmpresa, ContextoUsuario, UnidadDeTrabajo, UnidadDeTrabajoDelUsuario } from '../../../src/compartido/aplicacion/index.js';
import { ErrorDominio, type IdUsuario } from '../../../src/compartido/dominio/index.js';
import type { DirectorioDePersonas } from '../../../src/modulos/empresas/aplicacion/puertos/directorio-de-personas.js';
import type { RepositoriosDelUsuario } from '../../../src/modulos/empresas/aplicacion/puertos/repositorio-de-mis-empresas.js';
import type { RepositoriosDeEmpresas } from '../../../src/modulos/empresas/aplicacion/puertos/repositorio-empresas.js';
import type { RepositorioMembresias } from '../../../src/modulos/empresas/aplicacion/puertos/repositorio-membresias.js';
import type { Empresa } from '../../../src/modulos/empresas/dominio/empresa.js';
import { Membresia } from '../../../src/modulos/empresas/dominio/membresia.js';

/** Copia de una membresía, como la devolvería una consulta: cambiarla no toca la «base» hasta guardar. */
const copia = (m: Membresia) =>
  Membresia.reconstruir({
    id: m.id,
    empresaId: m.empresaId,
    usuarioId: m.usuarioId,
    rol: m.rol,
    modo: m.modo,
    creadaEn: m.creadaEn,
    invitadaPor: m.invitadaPor,
    aceptadaEn: m.aceptadaEn,
    retiro: m.retiro,
  });

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

  /** Membresía guardada de la persona en la empresa, la vigente o la última. */
  de(empresaId: string, usuarioId: IdUsuario): Membresia | undefined {
    return this.membresias.filter((m) => m.empresaId.valor === empresaId && m.esDe(usuarioId)).at(-1);
  }

  private deEmpresa({ empresaId }: ContextoEmpresa): RepositoriosDeEmpresas {
    const propia = (id: string) => id === empresaId.valor;
    return {
      empresas: {
        buscar: (id) => Promise.resolve(propia(id.valor) ? (this.empresas.get(id.valor) ?? null) : null),
        agregar: (e) => this.poner(e, propia(e.id.valor) && !this.empresas.has(e.id.valor)),
        guardar: (e) => this.poner(e, propia(e.id.valor)),
      },
      membresias: this.membresiasDe(propia),
    };
  }

  private membresiasDe(propia: (empresaId: string) => boolean): RepositorioMembresias {
    const vigentes = () => this.membresias.filter((m) => propia(m.empresaId.valor) && m.estado !== 'retirada');
    const vigenteDe = (u: IdUsuario) => {
      const m = vigentes().find((v) => v.esDe(u));
      return Promise.resolve(m ? copia(m) : null);
    };
    return {
      vigenteDe,
      tomarVigente: vigenteDe,
      listarVigentes: () => Promise.resolve(vigentes().map(copia)),
      contarVigentes: () => Promise.resolve(vigentes().length),
      contarInvitacionesDesde: (fecha) =>
        Promise.resolve(this.membresias.filter((m) => propia(m.empresaId.valor) && m.invitadaPor && m.creadaEn >= fecha).length),
      contarDuenosActivosBloqueando: () => Promise.resolve(vigentes().filter((m) => m.rol === 'dueno' && m.estado === 'activa').length),
      agregar: (m) => {
        if (!propia(m.empresaId.valor)) return Promise.reject(new Error('RLS: membresía de otra empresa'));
        if (vigentes().some((v) => v.esDe(m.usuarioId))) return Promise.reject(new ErrorDominio('miembro.ya-esta', 'duplicada'));
        this.membresias.push(copia(m));
        return Promise.resolve();
      },
      guardar: (m) => {
        const i = this.membresias.findIndex((g) => g.id === m.id && propia(g.empresaId.valor));
        if (i < 0 || this.membresias[i]!.estado === 'retirada') return Promise.reject(new Error('RLS o membresía retirada'));
        this.membresias[i] = copia(m);
        return Promise.resolve();
      },
    };
  }

  private delUsuario({ usuarioId }: ContextoUsuario): RepositoriosDelUsuario {
    const suyas = () => this.membresias.filter((m) => m.esDe(usuarioId) && m.estado !== 'retirada');
    return {
      misEmpresas: {
        listar: () =>
          Promise.resolve(
            suyas()
              .map((m) => ({
                empresa: this.empresas.get(m.empresaId.valor)!,
                rol: m.rol,
                modo: m.modo,
                estado: m.estado === 'invitada' ? ('invitada' as const) : ('activa' as const),
              }))
              .sort((a, b) => a.empresa.razonSocial.localeCompare(b.empresa.razonSocial)),
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

/** Directorio en memoria: un id fijo por celular, como identidad. Cuenta cuántas personas registró. */
export class DirectorioEnMemoria implements DirectorioDePersonas {
  readonly porCelular = new Map<string, IdUsuario>();
  registros = 0;

  constructor(private readonly idPara: (celular: string) => IdUsuario) {}

  registrar(celular: string): Promise<IdUsuario> {
    this.registros++;
    if (!/^3\d{9}$/.test(celular)) return Promise.reject(new ErrorDominio('acceso.celular-invalido', 'celular'));
    if (!this.porCelular.has(celular)) this.porCelular.set(celular, this.idPara(celular));
    return Promise.resolve(this.porCelular.get(celular)!);
  }

  celularesDe(ids: readonly IdUsuario[]): Promise<ReadonlyMap<string, string>> {
    const celulares = new Map<string, string>();
    for (const [celular, id] of this.porCelular) {
      if (ids.some((i) => i.valor === id.valor)) celulares.set(id.valor, `+57 ${celular.slice(0, 3)} *** ${celular.slice(-4)}`);
    }
    return Promise.resolve(celulares);
  }
}
