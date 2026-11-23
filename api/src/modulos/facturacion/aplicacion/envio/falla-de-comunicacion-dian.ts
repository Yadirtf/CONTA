/** No hubo una respuesta utilizable de la DIAN. Se reintenta; el mensaje nunca lleva datos reservados. */
export class FallaDeComunicacionDian extends Error {
  constructor(readonly motivo: string) {
    super(`Sin respuesta utilizable de la DIAN: ${motivo}`);
    this.name = 'FallaDeComunicacionDian';
  }
}
