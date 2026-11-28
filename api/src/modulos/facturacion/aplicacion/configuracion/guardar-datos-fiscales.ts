import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { datosFiscalesDelFacturador, type DatosFiscalesEscritos, type Participante } from '../../dominio/index.js';
import type { RepositoriosDeConfiguracion } from '../puertos/repositorios-de-configuracion.js';
import { nitConVentas } from './errores-de-configuracion.js';
import { exigirDuenoVerificado } from './exigir-dueno-verificado.js';

/**
 * HU-07.04: guarda los datos del facturador como van en la factura. Se pueden corregir (una dirección, el correo),
 * pero el NIT no cambia cuando la empresa ya vendió: sus facturas y envíos llevan ese NIT (la base también lo impide).
 */
export class GuardarDatosFiscales {
  constructor(private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeConfiguracion>) {}

  async ejecutar(contexto: ContextoDeMiembro, escritos: DatosFiscalesEscritos): Promise<Participante> {
    exigirDuenoVerificado(contexto, 'cambiar');
    const datos = datosFiscalesDelFacturador(escritos);
    await this.unidadDeTrabajo.ejecutar(contexto, async ({ datosFiscales, bitacora }) => {
      const actuales = await datosFiscales.leer();
      const cambiaElNit = actuales !== null && actuales.identificacion.numero !== datos.identificacion.numero;
      if (cambiaElNit && (await datosFiscales.hayVentas())) throw nitConVentas();
      if ((await datosFiscales.guardar(datos)) === 'nit-con-ventas') throw nitConVentas();
      await bitacora.anotar('datos-fiscales', contexto.usuarioId.valor);
    });
    return datos;
  }
}
