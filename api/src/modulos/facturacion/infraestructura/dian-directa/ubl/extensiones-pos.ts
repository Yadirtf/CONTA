import type { FabricanteDelSoftware } from '../../../aplicacion/puertos/generador-de-documento-electronico.js';
import type { Factura } from '../../../dominio/index.js';
import { el, grupo, type NodoXml } from '../xml/escritor-xml.js';
import { monto } from './montos.js';

/**
 * Las tres extensiones del tiquete POS (anexo del documento equivalente v1.0: 8.1 FabricanteSoftware, 8.2.1.1
 * BeneficiosComprador y 8.2.1.2 PuntoVenta), cada una en su ext:UBLExtension y como pares Name/Value, sin espacio de
 * nombres, como en los ejemplos de la DIAN. Van después de sts:DianExtensions y antes de la firma. Los nombres llevan
 * las tildes del anexo («UbicaciónCaja», «CódigoVenta»).
 */
export function extensionesDelPos(factura: Factura, fabricante: FabricanteDelSoftware): NodoXml[] {
  const caja = factura.puntoDeVenta;
  if (!caja) throw new Error('El tiquete POS necesita los datos de la caja');
  return [
    extension('FabricanteSoftware', 'InformacionDelFabricanteDelSoftware', [
      ['NombreApellido', fabricante.nombre],
      ['RazonSocial', fabricante.razonSocial],
      ['NombreSoftware', fabricante.nombreDelSoftware],
    ]),
    extension('BeneficiosComprador', 'InformacionBeneficiosComprador', [
      ['Codigo', factura.adquirente.identificacion.numero],
      ['NombresApellidos', factura.adquirente.razonSocial],
      // CONTA no maneja puntos de fidelidad.
      ['Puntos', '0'],
    ]),
    extension('PuntoVenta', 'InformacionCajaVenta', [
      ['PlacaCaja', caja.placa],
      ['UbicaciónCaja', caja.ubicacion],
      ['Cajero', caja.cajero],
      ['TipoCaja', caja.tipo],
      ['CódigoVenta', caja.codigoDeVenta],
      ['SubTotal', monto(factura.totalBruto)],
    ]),
  ];
}

function extension(grupoDeDatos: string, informacion: string, pares: readonly (readonly [string, string])[]): NodoXml {
  return grupo('ext:UBLExtension', [
    grupo('ext:ExtensionContent', [
      grupo(grupoDeDatos, [grupo(informacion, pares.flatMap(([nombre, valor]) => [el('Name', nombre), el('Value', valor)]))]),
    ]),
  ]);
}

/** Los grupos de las extensiones del POS, en su orden: el firmador solo admite estos después de la de la DIAN. */
export const GRUPOS_DE_EXTENSIONES_POS = ['FabricanteSoftware', 'BeneficiosComprador', 'PuntoVenta'] as const;
