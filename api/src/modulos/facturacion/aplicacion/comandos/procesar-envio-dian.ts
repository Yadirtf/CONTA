import type { Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { esEstadoFinal } from '../../dominio/index.js';
import { llamarALaDian } from '../envio/llamada-a-la-dian.js';
import type { Despertador, TrabajoDeEnvio } from '../puertos/cola-de-trabajos.js';
import type { ProveedorDeAccesoDian } from '../puertos/proveedor-de-acceso-dian.js';
import type { RepositoriosDeEnvio } from '../puertos/repositorios-de-envio.js';
import type { ServicioWebDian } from '../puertos/servicio-web-dian.js';

/**
 * HU-02.03: da un paso con un envío: lo lee, llama una vez a la DIAN fuera de toda transacción y guarda el
 * resultado, el intento y el siguiente trabajo juntos. Si otro procesador ya lo cambió, no escribe nada.
 * Al aceptarse, avisa en la misma transacción (HU-06.08: correo al comprador) y despierta al procesador.
 */
export class ProcesarEnvioDian {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeEnvio>,
    private readonly servicio: ServicioWebDian,
    private readonly acceso: ProveedorDeAccesoDian,
    private readonly reloj: Reloj,
    private readonly despertador: Despertador,
  ) {}

  async ejecutar(trabajo: TrabajoDeEnvio): Promise<void> {
    const contexto = { empresaId: trabajo.empresaId };
    const lectura = await this.unidadDeTrabajo.ejecutar(contexto, async ({ envios, cola }) => {
      const envio = await envios.buscar(trabajo.envioId);
      if (!envio || esEstadoFinal(envio.estado)) {
        await cola.completar(trabajo);
        return null;
      }
      if (!envio.tocaIntentar(this.reloj.ahora())) {
        await cola.encolar(trabajo, envio.proximoIntentoEn ?? this.reloj.ahora());
        return null;
      }
      const documento = envio.siguientePaso === 'enviar' ? await envios.documentoDe(envio.id) : null;
      return { envio, documento, intentosLeidos: envio.intentos };
    });
    if (!lectura) return;

    const { envio, documento, intentosLeidos } = lectura;
    const intento = await llamarALaDian(envio, documento, () => this.acceso.para(contexto, envio.clase), this.servicio, () =>
      this.reloj.ahora(),
    );

    const siguiente = await this.unidadDeTrabajo.ejecutar(contexto, async ({ envios, intentos, cola, avisos }) => {
      if (!(await envios.actualizar(envio, intentosLeidos))) return null;
      await intentos.agregar(intento);
      // HU-06.08: lo que cuelga de la aceptación (el correo al comprador) se pide en esta misma transacción.
      const ahora = this.reloj.ahora();
      const hayMasTrabajo = envio.estado === 'aceptado' && (await avisos.documentoAceptado(envio.id, ahora));
      if (esEstadoFinal(envio.estado) || !envio.proximoIntentoEn) {
        await cola.completar(trabajo);
        return hayMasTrabajo ? ahora : null;
      }
      await cola.encolar(trabajo, envio.proximoIntentoEn);
      return envio.proximoIntentoEn;
    });
    if (siguiente) this.despertador.programar(siguiente);
  }
}
