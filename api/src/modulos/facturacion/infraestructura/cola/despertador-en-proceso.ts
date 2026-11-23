import type { Despertador } from '../../aplicacion/puertos/cola-de-trabajos.js';

/**
 * Despertador dentro del proceso: un solo temporizador, siempre para la hora más próxima que se pidió.
 * Al sonar procesa un lote; si el lote vino lleno, vuelve a sonar enseguida. No es durable: si el proceso
 * se reinicia, los trabajos siguen en la cola y los recupera el endpoint interno (ADR-0008).
 */
export class DespertadorEnProceso implements Despertador {
  private temporizador: ReturnType<typeof setTimeout> | undefined;
  private horaProgramada: number | undefined;
  private procesando = false;

  constructor(
    /** Procesa un lote de trabajos vencidos y dice si quedó lleno (puede haber más). */
    private readonly alSonar: () => Promise<{ lleno: boolean }>,
    private readonly ahora: () => number = Date.now,
  ) {}

  programar(cuando: Date): void {
    const hora = cuando.getTime();
    if (this.horaProgramada !== undefined && this.horaProgramada <= hora) return;
    if (this.temporizador) clearTimeout(this.temporizador);
    this.horaProgramada = hora;
    this.temporizador = setTimeout(() => void this.sonar(), Math.max(0, hora - this.ahora()));
    this.temporizador.unref();
  }

  detener(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = undefined;
    this.horaProgramada = undefined;
  }

  private async sonar(): Promise<void> {
    this.temporizador = undefined;
    this.horaProgramada = undefined;
    if (this.procesando) return;
    this.procesando = true;
    let lleno = false;
    try {
      ({ lleno } = await this.alSonar());
    } catch {
      // El endpoint interno y las reservas vencidas recuperan lo que no se procesó.
    } finally {
      this.procesando = false;
    }
    if (lleno) this.programar(new Date(this.ahora()));
  }
}
