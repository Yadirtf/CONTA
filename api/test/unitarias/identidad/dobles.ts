// Dobles en memoria de los puertos de identidad, para probar los casos de uso sin base ni red.
import type { EnviadorDeCodigos } from '../../../src/modulos/identidad/aplicacion/puertos/enviador-de-codigos.js';
import type {
  RepositoriosDeIdentidad,
  SesionConUsuario,
  UnidadDeTrabajoDeIdentidad,
} from '../../../src/modulos/identidad/aplicacion/puertos/repositorios-de-identidad.js';
import type { EventoDeSegundoFactor } from '../../../src/modulos/identidad/aplicacion/puertos/registro-de-segundo-factor.js';
import { AccesoPorCelular, type Celular, SegundoFactor, type Sesion, type Usuario } from '../../../src/modulos/identidad/dominio/index.js';
import { HuellasNode } from '../../../src/modulos/identidad/infraestructura/cripto/huellas-node.js';

interface Copia {
  accesos: Map<string, AccesoPorCelular>;
  usuarios: Map<string, Usuario>;
  sesiones: IdentidadEnMemoria['sesiones'];
  segundosFactores: Map<string, SegundoFactor>;
}

export class IdentidadEnMemoria implements UnidadDeTrabajoDeIdentidad {
  readonly accesos = new Map<string, AccesoPorCelular>();
  readonly usuarios = new Map<string, Usuario>();
  readonly sesiones = new Map<string, { sesion: Sesion; huella: string; revocadaEn: Date | null }>();
  readonly segundosFactores = new Map<string, SegundoFactor>();
  readonly eventos: EventoDeSegundoFactor[] = [];

  /** Como una transacción: lo que hace `trabajo` se aplica solo si no lanza. */
  async ejecutar<T>(trabajo: (r: RepositoriosDeIdentidad) => Promise<T>): Promise<T> {
    const copia: Copia = {
      accesos: new Map(this.accesos),
      usuarios: new Map(this.usuarios),
      // Las filas de sesión se copian: un cambio dentro de una transacción que falla no debe quedar.
      sesiones: new Map([...this.sesiones].map(([k, v]) => [k, { ...v }])),
      segundosFactores: new Map(this.segundosFactores),
    };
    const eventos: EventoDeSegundoFactor[] = [];
    const resultado = await trabajo(this.repositorios(copia, eventos));
    this.reemplazar(copia);
    this.eventos.push(...eventos);
    return resultado;
  }

  private reemplazar(copia: Copia) {
    for (const [nombre, mapa] of Object.entries(copia) as [keyof Copia, Map<string, unknown>][]) {
      const destino = this[nombre] as Map<string, unknown>;
      destino.clear();
      mapa.forEach((v, k) => destino.set(k, v));
    }
  }

  private repositorios(c: Copia, eventos: EventoDeSegundoFactor[]): RepositoriosDeIdentidad {
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
        buscarPorIds: (ids) =>
          Promise.resolve([...c.usuarios.values()].filter((u) => ids.some((id) => id.valor === u.id.valor))),
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
        buscarVigente: (huella, ahora): Promise<SesionConUsuario | null> => {
          const fila = [...c.sesiones.values()].find((s) => s.huella === huella && !s.revocadaEn && s.sesion.venceEn > ahora);
          const usuario = fila && [...c.usuarios.values()].find((u) => u.id.valor === fila.sesion.usuarioId.valor);
          return Promise.resolve(fila && usuario ? { sesion: fila.sesion, usuario } : null);
        },
        revocar: (id, ahora) => {
          const fila = c.sesiones.get(id);
          if (fila && !fila.revocadaEn) fila.revocadaEn = ahora;
          return Promise.resolve();
        },
        marcarVerificada: (id, ahora) => {
          const fila = c.sesiones.get(id);
          if (fila && !fila.revocadaEn) fila.sesion = { ...fila.sesion, verificadaEn: ahora };
          return Promise.resolve();
        },
        revocarLasDemas: (usuarioId, excepto, ahora) => {
          for (const fila of c.sesiones.values()) {
            if (fila.sesion.usuarioId.valor === usuarioId.valor && fila.sesion.id !== excepto && !fila.revocadaEn) fila.revocadaEn = ahora;
          }
          return Promise.resolve();
        },
      },
      segundosFactores: {
        tomar: (usuarioId) => {
          const guardado = c.segundosFactores.get(usuarioId.valor);
          return Promise.resolve(guardado ? SegundoFactor.desde(guardado.foto) : SegundoFactor.nuevo(usuarioId));
        },
        guardar: (factor) => {
          c.segundosFactores.set(factor.foto.usuarioId.valor, SegundoFactor.desde(factor.foto));
          return Promise.resolve();
        },
      },
      registroDeSegundoFactor: {
        anotar: (evento) => {
          eventos.push(evento);
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
