/**
 * Límite de peticiones por llave (una IP, una persona en una empresa…), en memoria y por ventana fija. Es una
 * capa más: los límites que importan viven en la base. Con una sola instancia basta (Render gratis).
 */
export class LimitadorPorVentana {
  private readonly cuentas = new Map<string, number>();
  private ventanaDesde = 0;

  constructor(
    private readonly maximo: number,
    private readonly ventanaMs: number,
    private readonly ahora: () => number = Date.now,
  ) {}

  /** true si la petición entra; false si la llave ya gastó su cupo en esta ventana. */
  admitir(llave: string): boolean {
    const ahora = this.ahora();
    if (ahora - this.ventanaDesde >= this.ventanaMs) {
      this.cuentas.clear();
      this.ventanaDesde = ahora;
    }
    const cuenta = (this.cuentas.get(llave) ?? 0) + 1;
    this.cuentas.set(llave, cuenta);
    return cuenta <= this.maximo;
  }
}
