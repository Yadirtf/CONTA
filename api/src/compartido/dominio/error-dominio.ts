// Error de una regla de negocio. Lleva un código estable para que la presentación lo traduzca
// (modo simple o modo contador) sin depender del texto del mensaje.
export class ErrorDominio extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorDominio';
  }
}
