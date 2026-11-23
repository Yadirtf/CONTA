import type { ContextoEmpresa, Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { EnvioDian, MomentoDeEmision, type EstadoDelEnvio } from '../../dominio/index.js';
import type { Despertador } from '../puertos/cola-de-trabajos.js';
import type { DocumentoElectronico } from '../puertos/generador-de-documento-electronico.js';
import type { RepositoriosDeEnvio } from '../puertos/repositorios-de-envio.js';

export interface SolicitudDeEnvio {
  /** XML ya firmado (FirmarDocumentoElectronico) y su CUFE. */
  readonly documento: DocumentoElectronico;
  readonly numero: string;
  readonly nitEmisor: string;
}

export interface EnvioSolicitado {
  readonly envioId: string;
  readonly estado: EstadoDelEnvio;
  /** false si el documento ya se había solicitado: la solicitud es idempotente por CUFE. */
  readonly nuevo: boolean;
}

/**
 * HU-02.03: deja el documento firmado en cola para enviarlo a la DIAN. No llama a la DIAN: guarda el envío,
 * su documento y el trabajo en la misma transacción, y despierta al procesador.
 */
export class SolicitarEnvioDian {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeEnvio>,
    private readonly reloj: Reloj,
    private readonly despertador: Despertador,
    private readonly nuevoId: () => string = () => crypto.randomUUID(),
  ) {}

  async ejecutar(contexto: ContextoEmpresa, solicitud: SolicitudDeEnvio): Promise<EnvioSolicitado> {
    const ahora = this.reloj.ahora();
    const resultado = await this.unidadDeTrabajo.ejecutar(contexto, async ({ envios, cola }) => {
      const existente = await envios.buscarPorCufe(solicitud.documento.cufe);
      if (existente) return { envioId: existente.id, estado: existente.estado, nuevo: false };

      const anio = Number(MomentoDeEmision.desde(ahora).fecha.slice(0, 4));
      const envio = EnvioDian.solicitar(this.nuevoId(), solicitud.documento.cufe, solicitud.numero, ahora);
      await envios.crear(envio, {
        xmlFirmado: solicitud.documento.xml,
        nitEmisor: solicitud.nitEmisor,
        anio,
        consecutivo: await envios.siguienteConsecutivo(anio),
      });
      await cola.encolar({ empresaId: contexto.empresaId, envioId: envio.id }, ahora);
      return { envioId: envio.id, estado: envio.estado, nuevo: true };
    });
    if (resultado.nuevo) this.despertador.programar(ahora);
    return resultado;
  }
}
