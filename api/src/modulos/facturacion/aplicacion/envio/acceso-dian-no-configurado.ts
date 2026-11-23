/** La empresa no tiene certificado o set de pruebas configurados. El mensaje no lleva datos reservados. */
export class AccesoDianNoConfigurado extends Error {
  constructor() {
    super('La empresa no tiene configurado el acceso a la DIAN (certificado y set de pruebas)');
    this.name = 'AccesoDianNoConfigurado';
  }
}
