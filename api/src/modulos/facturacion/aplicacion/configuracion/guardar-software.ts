import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { finalDelPin, seccionDeSoftware, softwareDian, type SoftwareEscrito } from '../../dominio/index.js';
import { asociadoAlSoftware, type CustodiaDeSecretos } from '../puertos/custodia-de-secretos.js';
import type { RepositoriosDeConfiguracion } from '../puertos/repositorios-de-configuracion.js';
import { exigirDuenoVerificado } from './exigir-dueno-verificado.js';

/**
 * HU-07.04: guarda el software que la DIAN registró para una clase de documento. El PIN llega completo solo cuando
 * cambia; se cifra atado a la empresa y la clase, y de él solo se guarda a la vista su último carácter. Sin PIN nuevo,
 * queda el que estaba.
 */
export class GuardarSoftware {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeConfiguracion>,
    private readonly custodia: CustodiaDeSecretos,
  ) {}

  async ejecutar(contexto: ContextoDeMiembro, escrito: SoftwareEscrito): Promise<void> {
    exigirDuenoVerificado(contexto, 'cambiar');
    await this.unidadDeTrabajo.ejecutar(contexto, async ({ software, bitacora }) => {
      const guardado = await software.de(escrito.clase);
      const nuevo = softwareDian(escrito, guardado !== null);
      const pin =
        nuevo.pin === null
          ? null
          : {
              pinCifrado: this.custodia.cifrar(nuevo.pin, asociadoAlSoftware(contexto.empresaId.valor, nuevo.clase)),
              finalDelPin: finalDelPin(nuevo.pin),
            };
      await software.guardar(
        { clase: nuevo.clase, idSoftware: nuevo.idSoftware, testSetId: nuevo.testSetId, fabricante: nuevo.fabricante, pin },
        contexto.usuarioId.valor,
      );
      await bitacora.anotar(seccionDeSoftware(nuevo.clase), contexto.usuarioId.valor);
    });
  }
}
