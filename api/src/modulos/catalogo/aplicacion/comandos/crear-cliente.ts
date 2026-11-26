import type { ContextoDeMiembro, Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { ErrorDominio, exigirPermiso, Permiso } from '../../../../compartido/dominio/index.js';
import { Cliente, comprobarQuePuedeCrear, type DatosDeClienteNuevo, UN_DIA_EN_MS } from '../../dominio/clientes/index.js';
import type { RepositoriosDeCatalogo } from '../puertos/repositorio-clientes.js';

export interface ClienteCreado {
  readonly cliente: Cliente;
  /** false si ya existía un comprador con ese documento: se devuelve ese y no se cambia nada. */
  readonly creado: boolean;
  /**
   * true si es la misma petición repetida (mismo id): quien la repite ya tenía esos datos. Si es otro id con un
   * documento que ya existe, la presentación no devuelve los datos de contacto (hallazgo N1, prueba de ataque).
   */
  readonly esReintento: boolean;
}

/**
 * Crea un comprador con los campos mínimos de la DIAN (HU-05.01). Es idempotente: la app elige el id, así que
 * repetir la petición (reintento, señal que va y viene) no crea dos; y un documento que ya existe devuelve
 * el comprador guardado en vez de duplicarlo o sobrescribirlo.
 */
export class CrearCliente {
  constructor(
    private readonly catalogo: UnidadDeTrabajo<RepositoriosDeCatalogo>,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(contexto: ContextoDeMiembro, datos: DatosDeClienteNuevo): Promise<ClienteCreado> {
    exigirPermiso(contexto.rol, Permiso.Vender);
    const ahora = this.reloj.ahora();
    const nuevo = Cliente.crear(datos, contexto.usuarioId.valor, ahora);
    return this.catalogo.ejecutar(contexto, async ({ clientes }) => {
      await clientes.bloquearAltas();
      const existente = await clientes.conIdentificacion(nuevo.identificacion);
      if (existente) return yaExistia(existente, datos.id);
      comprobarQuePuedeCrear(await clientes.contarCreadosDesde(new Date(ahora.getTime() - UN_DIA_EN_MS)));
      if (await clientes.agregarSiNoExiste(nuevo)) return { cliente: nuevo, creado: true, esReintento: false };
      // Chocó: otra petición guardó el mismo documento entre la lectura y la escritura, o el id ya es de otro.
      const ganador = await clientes.conIdentificacion(nuevo.identificacion);
      if (ganador) return yaExistia(ganador, datos.id);
      throw new ErrorDominio('cliente.id-en-uso', 'Ese id ya es de otro comprador');
    });
  }
}

const yaExistia = (cliente: Cliente, idPedido: string): ClienteCreado => ({ cliente, creado: false, esReintento: cliente.id === idPedido });
