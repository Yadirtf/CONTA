import type { Reloj } from '../../../../../compartido/aplicacion/index.js';
import type {
  AccesoDian,
  AcuseDeRecibo,
  DocumentoParaEnviar,
  ServicioWebDian,
} from '../../../aplicacion/puertos/servicio-web-dian.js';
import type { RespuestaDeLaDian } from '../../../dominio/index.js';
import type { NodoXml } from '../xml/escritor-xml.js';
import { leerPkcs12 } from '../firma/lector-pkcs12.js';
import { publicarSobre, type Transporte } from './cliente-http-soap.js';
import { ENDPOINT } from './espacios-soap.js';
import { firmarSobre } from './firma-ws-security.js';
import { leerAcuseDeRecibo, leerRespuestaDeValidacion } from './lector-de-respuestas.js';
import { nombresDelPaquete } from './nombres-de-archivo.js';
import { cuerpoGetStatusZip, cuerpoSendTestSetAsync } from './operaciones-dian.js';
import { zipConUnArchivo } from './paquete-zip.js';
import { sobreSinFirmar } from './sobre-soap.js';

/**
 * Adaptador del servicio web de la DIAN (habilitación, HU-02.03). Solo coordina: empaquetar, armar el sobre,
 * firmarlo, enviarlo y leer la respuesta; cada paso vive en su archivo. El certificado se abre en cada llamada.
 */
export class ServicioWebDianDirecto implements ServicioWebDian {
  constructor(
    private readonly reloj: Reloj,
    private readonly destino: string = ENDPOINT.habilitacion,
    private readonly transporte: Transporte = fetch,
  ) {}

  async enviarSetDePruebas(documento: DocumentoParaEnviar, acceso: AccesoDian): Promise<AcuseDeRecibo> {
    const nombres = nombresDelPaquete(documento);
    const zip = zipConUnArchivo(nombres.xml, Buffer.from(documento.xmlFirmado, 'utf8'));
    const respuesta = await this.llamar('SendTestSetAsync', cuerpoSendTestSetAsync(nombres.zip, zip, acceso.testSetId), acceso);
    return leerAcuseDeRecibo(respuesta);
  }

  async consultarValidacion(zipKey: string, acceso: AccesoDian): Promise<RespuestaDeLaDian> {
    return leerRespuestaDeValidacion(await this.llamar('GetStatusZip', cuerpoGetStatusZip(zipKey), acceso));
  }

  private async llamar(operacion: string, cuerpo: NodoXml, acceso: AccesoDian): Promise<string> {
    const { llave, certificado } = acceso.certificado.usar(leerPkcs12);
    const sobre = sobreSinFirmar({
      operacion,
      destino: this.destino,
      cuerpo,
      certificadoDer: certificado.raw,
      ahora: this.reloj.ahora(),
      idDelMensaje: crypto.randomUUID(),
    });
    return publicarSobre(this.destino, operacion, firmarSobre(sobre, llave), this.transporte);
  }
}
