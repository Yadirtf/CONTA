// Dobles en memoria de los puertos de identidad, para probar los casos de uso sin base ni red.
import type { EnviadorDeCodigos } from '../../../src/modulos/identidad/aplicacion/puertos/enviador-de-codigos.js';
import type {
  RepositoriosDeIdentidad,
  SesionVigente,
  UnidadDeTrabajoDeIdentidad,
} from '../../../src/modulos/identidad/aplicacion/puertos/repositorios-de-identidad.js';
import { AccesoPorCelular, type Celular, type Sesion, type Usuario } from '../../../src/modulos/identidad/dominio/index.js';
import { HuellasNode } from '../../../src/modulos/identidad/infraestructura/cripto/huellas-node.js';

export class IdentidadEnMemoria implements UnidadDeTrabajoDeIdentidad {
  readonly accesos = new Map<string, AccesoPorCelular>();
  readonly usuarios = new Map<string, Usuario>();
  readonly sesiones = new Map<string, { sesion: Sesion; huella: string; revocadaEn: Date | null }>();

  /** Como una transacción: lo que hace `trabajo` se aplica solo si no lanza. */
  async ejecutar<T>(trabajo: (r: RepositoriosDeIdentidad) => Promise<T>): Promise<T> {
    const copia = { accesos: new Map(this.accesos), usuarios: new Map(this.usuarios), sesiones: new Map(this.sesiones) };
    const resultado = await trabajo(this.repositorios(copia));
    this.reemplazar(copia);
    return resultado;
  }

  private reemplazar(copia: { accesos: Map<string, AccesoPorCelular>; usuarios: Map<string, Usuario>; sesiones: IdentidadEnMemoria['sesiones'] }) {
    for (const [nombre, mapa] of Object.entries(copia)) {
      const destino = this[nombre as keyof typeof copia] as Map<string, unknown>;
      destino.clear();
      mapa.forEach((v, k) => destino.set(k, v));
    }
  }

  private repositorios(c: { accesos: Map<string, AccesoPorCelular>; usuarios: Map<string, Usuario>; sesiones: IdentidadEnMemoria['sesiones'] }): RepositoriosDeIdentidad {
    return {
      accesos: {
        tomar: (celular: Celular) => {
          const guardado = c.accesos.get(celular.e164);
          return Promise.resolve(guardado ? AccesoPorCelular.desde(guardado.foto) : AccesoPorCelular.nuevo(celular));
        },
        guardar: (acceso) => {
          c.accesos.set(acceso.foto.celular.e164, AccesoPorCelular.desde(acceso.foto));
          return Promise.resolve();
        },
      },
      usuarios: {
        buscarPorCelular: (celular) => Promise.resolve(c.usuarios.get(celular.e164) ?? null),
        crearOBuscar: (usuario) => {
          if (!c.usuarios.has(usuario.celular.e164)) c.usuarios.set(usuario.celular.e164, usuario);
          return Promise.resolve(c.usuarios.get(usuario.celular.e164)!);
        },
      },
      sesiones: {
        abrir: (sesion, huella) => {
          c.sesiones.set(sesion.id, { sesion, huella, revocadaEn: null });
          return Promise.resolve();
        },
        buscarVigente: (huella, ahora): Promise<SesionVigente | null> => {
          const fila = [...c.sesiones.values()].find((s) => s.huella === huella && !s.revocadaEn && s.sesion.venceEn > ahora);
          const usuario = fila && [...c.usuarios.values()].find((u) => u.id.valor === fila.sesion.usuarioId.valor);
          return Promise.resolve(fila && usuario ? { sesion: fila.sesion, usuario } : null);
        },
        revocar: (id, ahora) => {
          const fila = c.sesiones.get(id);
          if (fila && !fila.revocadaEn) fila.revocadaEn = ahora;
          return Promise.resolve();
        },
      },
    };
  }
}

export class EnviadorEspia implements EnviadorDeCodigos {
  readonly enviados: { celular: string; codigo: string }[] = [];
  falla: Error | null = null;

  enviar(celular: Celular, codigo: string): Promise<void> {
    if (this.falla) return Promise.reject(this.falla);
    this.enviados.push({ celular: celular.e164, codigo });
    return Promise.resolve();
  }
}

export class RelojFijo {
  constructor(public instante: Date) {}
  ahora(): Date {
    return this.instante;
  }
  avanzar(ms: number): void {
    this.instante = new Date(this.instante.getTime() + ms);
  }
}

export const huellas = () => new HuellasNode('s'.repeat(32));
