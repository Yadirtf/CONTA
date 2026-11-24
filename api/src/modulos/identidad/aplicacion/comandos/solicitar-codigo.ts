import type { Reloj } from '../../../../compartido/aplicacion/index.js';
import { Celular, ErrorDeAcceso, POLITICA_DE_ACCESO } from '../../dominio/index.js';
import { FallaDeEnvio, type EnviadorDeCodigos } from '../puertos/enviador-de-codigos.js';
import type { UnidadDeTrabajoDeIdentidad } from '../puertos/repositorios-de-identidad.js';
import type { GeneradorDeCodigos, HuellasDeAcceso } from '../puertos/secretos-de-acceso.js';

export interface CodigoSolicitado {
  readonly venceEn: Date;
  readonly otroCodigoDesde: Date;
}

/**
 * Pide un código para entrar con el celular (HU-04.01). La respuesta es la misma para un número nuevo y
 * uno registrado: no revela quién usa CONTA. El código cuenta para los límites aunque el envío falle,
 * para que un error del canal no se convierta en envíos ilimitados.
 */
export class SolicitarCodigo {
  constructor(
    private readonly uow: UnidadDeTrabajoDeIdentidad,
    private readonly generador: GeneradorDeCodigos,
    private readonly huellas: HuellasDeAcceso,
    private readonly enviador: EnviadorDeCodigos,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(textoDelCelular: string): Promise<CodigoSolicitado> {
    const celular = Celular.de(textoDelCelular);
    const ahora = this.reloj.ahora();
    const codigo = this.generador.nuevo(celular);
    const emitido = await this.uow.ejecutar(async ({ accesos }) => {
      const acceso = await accesos.tomar(celular);
      const resultado = acceso.emitirCodigo(this.huellas.huellaDeCodigo(celular, codigo), ahora);
      await accesos.guardar(acceso);
      return resultado;
    });
    // Se envía después de guardar: si el envío tarda, la fila del celular no queda bloqueada.
    try {
      await this.enviador.enviar(celular, codigo);
    } catch (error) {
      if (error instanceof FallaDeEnvio) throw new ErrorDeAcceso('acceso.envio-fallido');
      throw error;
    }
    return { venceEn: emitido.venceEn, otroCodigoDesde: new Date(ahora.getTime() + POLITICA_DE_ACCESO.esperaEntreCodigosMs) };
  }
}
