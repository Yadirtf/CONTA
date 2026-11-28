import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { contenidoDeLaResolucion, resolucionNueva, type ResolucionEscrita, seccionDeResolucion } from '../../dominio/index.js';
import { asociadoALaResolucion, type CustodiaDeSecretos } from '../puertos/custodia-de-secretos.js';
import type { RepositoriosDeConfiguracion } from '../puertos/repositorios-de-configuracion.js';
import {
  demasiadasResoluciones,
  MAXIMO_DE_RESOLUCIONES_POR_CLASE,
  rangoCruzado,
  resolucionIdEnUso,
  resolucionRepetida,
} from './errores-de-configuracion.js';
import { exigirDuenoVerificado } from './exigir-dueno-verificado.js';

/**
 * HU-07.04: agrega una resolución de numeración (de factura o de tiquete POS). Nunca edita una guardada: sus números
 * pueden estar ya en ventas. El id lo elige la app: repetir la petición no agrega dos. La clave técnica se guarda
 * cifrada y atada a esa resolución.
 * Devuelve true si la agregó, false si ya existía (reintento).
 */
export class AgregarResolucion {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeConfiguracion>,
    private readonly custodia: CustodiaDeSecretos,
  ) {}

  async ejecutar(contexto: ContextoDeMiembro, id: string, escrita: ResolucionEscrita): Promise<boolean> {
    exigirDuenoVerificado(contexto, 'cambiar');
    const nueva = resolucionNueva(escrita);
    const asociado = asociadoALaResolucion(contexto.empresaId.valor, id);
    const claveCifrada = nueva.claveTecnica === null ? null : this.custodia.cifrar(nueva.claveTecnica, asociado);
    const huella = this.custodia.huella(contenidoDeLaResolucion(nueva), asociado);
    return this.unidadDeTrabajo.ejecutar(contexto, async ({ resoluciones, bitacora }) => {
      const guardadas = await resoluciones.listar();
      const deLaClase = guardadas.filter((g) => g.resolucion.clase === nueva.resolucion.clase);
      if (deLaClase.length >= MAXIMO_DE_RESOLUCIONES_POR_CLASE && !guardadas.some((g) => g.id === id)) throw demasiadasResoluciones();
      const resultado = await resoluciones.agregar(id, nueva, claveCifrada, huella);
      if (resultado === 'id-en-uso') throw resolucionIdEnUso();
      if (resultado === 'repetida') throw resolucionRepetida();
      if (resultado === 'rango-cruzado') throw rangoCruzado();
      if (resultado === 'ya-existia') return false;
      await bitacora.anotar(seccionDeResolucion(nueva.resolucion.clase), contexto.usuarioId.valor);
      return true;
    });
  }
}
