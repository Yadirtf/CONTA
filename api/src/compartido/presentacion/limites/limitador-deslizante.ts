/**
 * Límite de peticiones por llave con ventana deslizante, en memoria: cuenta las de los últimos `ventanaMs` de cada
 * llave, así que no hay un borde en el que el cupo se reinicia para todos a la vez (con ventana fija entraban el doble
 * en pocos segundos). Es una capa más: los límites que importan viven en la base. Con una sola instancia basta.
 */
export class LimitadorDeslizante {
  private readonly marcas = new Map<string, number[]>();
  private ultimaLimpieza = 0;

  constructor(
    private readonly maximo: number,
    private readonly ventanaMs: number,
    private readonly ahora: () => number = Date.now,
  ) {}

  /** null si la petición entra; si no, cuántos milisegundos faltan para que vuelva a haber cupo. */
  esperaPara(llave: string): number | null {
    const ahora = this.ahora();
    this.limpiar(ahora);
    const recientes = (this.marcas.get(llave) ?? []).filter((t) => ahora - t < this.ventanaMs);
    if (recientes.length >= this.maximo) {
      this.marcas.set(llave, recientes);
      return Math.max(1, (recientes[0] ?? ahora) + this.ventanaMs - ahora);
    }
    recientes.push(ahora);
    this.marcas.set(llave, recientes);
    return null;
  }

  /** Olvida las llaves sin peticiones en la ventana, una vez por ventana: la memoria no crece sin fin. */
  private limpiar(ahora: number): void {
    if (ahora - this.ultimaLimpieza < this.ventanaMs) return;
    this.ultimaLimpieza = ahora;
    for (const [llave, tiempos] of this.marcas) {
      if (tiempos.every((t) => ahora - t >= this.ventanaMs)) this.marcas.delete(llave);
    }
  }
}
