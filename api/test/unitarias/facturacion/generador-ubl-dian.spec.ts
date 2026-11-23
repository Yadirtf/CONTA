import { Dinero, Nit } from '../../../src/compartido/dominio/index.js';
import {
  Factura,
  LineaDeFactura,
  MomentoDeEmision,
  NumeroDeFactura,
  ResolucionDeNumeracion,
} from '../../../src/modulos/facturacion/dominio/index.js';
import { calcularCufe, sha384 } from '../../../src/modulos/facturacion/infraestructura/dian-directa/cufe.js';
import { GeneradorUblDian } from '../../../src/modulos/facturacion/infraestructura/dian-directa/generador-ubl-dian.js';
import { erroresContraUblInvoice, erroresDeExtensionesDian } from '../../recursos/dian/validador-xsd.js';
import { adquirenteDePrueba, configuracionDePrueba, emisorDePrueba, facturaConDosLineas } from './datos-de-prueba.js';

const generador = new GeneradorUblDian();

/** Texto del primer elemento con ese nombre (los nombres de la prueba son únicos o se busca el primero). */
function texto(xml: string, nombre: string, desde = 0): string {
  const m = new RegExp(`<${nombre}(?: [^>]*)?>([^<]*)</${nombre}>`).exec(xml.slice(desde));
  if (!m?.[1]) throw new Error(`No está ${nombre}`);
  return m[1];
}

describe('XML UBL 2.1 de la factura (HU-02.01)', () => {
  const { xml, cufe } = generador.generar(facturaConDosLineas(), configuracionDePrueba());

  it('valida contra el esquema oficial UBL-Invoice-2.1.xsd', async () => {
    expect(await erroresContraUblInvoice(xml)).toEqual([]);
  });

  it('sus extensiones de la DIAN validan contra DIAN_UBL_Structures.xsd, salvo una contradicción conocida del esquema', async () => {
    // El esquema de la DIAN enumera en @schemeID los tipos de documento (11, 13, 31...), pero el anexo técnico
    // (FAB22 y la tabla de AuthorizationProvider) pide ahí el dígito de verificación, como hacen las facturas
    // que la DIAN acepta. Se tolera solo ese error, en esos dos elementos; cualquier otro hace fallar la prueba.
    const errores = await erroresDeExtensionesDian(xml);
    const conocido = /Element '\{dian:gov:co:facturaelectronica:Structures-2-1\}(ProviderID|AuthorizationProviderID)', attribute 'schemeID': \[facet 'enumeration'\]/;
    expect(errores.filter((e) => !conocido.test(e))).toEqual([]);
    expect(errores.length).toBeLessThanOrEqual(2);
  });

  it('calcula las líneas y los totales con 2 decimales y mitad al par', () => {
    // 3 × 12 345.67 = 37 037.01; IVA 19 % = 7 037.0319 → 7 037.03. 2.5 × 4 200 = 10 500.00, IVA 0.
    expect(texto(xml, 'cbc:LineExtensionAmount', xml.indexOf('<cac:LegalMonetaryTotal>'))).toBe('47537.01');
    expect(texto(xml, 'cbc:TaxAmount')).toBe('7037.03');
    expect(texto(xml, 'cbc:PayableAmount')).toBe('54574.04');
    expect(xml).toContain('<cbc:Percent>19.00</cbc:Percent>');
    expect(xml).toContain('<cbc:Percent>0.00</cbc:Percent>');
    expect(xml).toContain('<cbc:InvoicedQuantity unitCode="KGM">2.5</cbc:InvoicedQuantity>');
    expect(texto(xml, 'cbc:LineCountNumeric')).toBe('2');
  });

  it('el CUFE del cbc:UUID sale de los mismos valores que quedaron en el XML (anexo 11.2.2)', () => {
    const total = xml.indexOf('<cac:LegalMonetaryTotal>');
    const esperado = calcularCufe({
      numero: texto(xml, 'cbc:ID', xml.indexOf('<cbc:ProfileExecutionID>')),
      fecha: texto(xml, 'cbc:IssueDate'),
      hora: texto(xml, 'cbc:IssueTime'),
      valorBruto: texto(xml, 'cbc:LineExtensionAmount', total),
      iva: texto(xml, 'cbc:TaxAmount', xml.indexOf('<cac:TaxTotal>')),
      inc: '0.00',
      ica: '0.00',
      total: texto(xml, 'cbc:PayableAmount', total),
      nitEmisor: texto(xml, 'cbc:CompanyID', xml.indexOf('<cac:AccountingSupplierParty>')),
      identificacionAdquirente: texto(xml, 'cbc:CompanyID', xml.indexOf('<cac:AccountingCustomerParty>')),
      claveTecnica: configuracionDePrueba().claveTecnica,
      ambiente: texto(xml, 'cbc:ProfileExecutionID') as '1' | '2',
    });
    expect(cufe).toBe(esperado);
    expect(xml).toContain(`<cbc:UUID schemeID="2" schemeName="CUFE-SHA384">${cufe}</cbc:UUID>`);
    expect(texto(xml, 'sts:QRCode')).toBe(`https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${cufe}`);
  });

  it('lleva el código de seguridad del software y la resolución, y nunca la clave técnica ni el PIN', () => {
    const { idSoftware, pinSoftware, claveTecnica } = configuracionDePrueba();
    expect(texto(xml, 'sts:SoftwareSecurityCode')).toBe(sha384(`${idSoftware}${pinSoftware}SETP990000001`));
    expect(texto(xml, 'sts:InvoiceAuthorization')).toBe('18760000001');
    const dv = Nit.de('900373076').digitoVerificacion;
    expect(xml).toMatch(new RegExp(`<cbc:CompanyID [^>]*schemeName="31" schemeID="${dv}">900373076</cbc:CompanyID>`));
    expect(xml).not.toContain(claveTecnica);
    expect(xml).not.toContain(`>${pinSoftware}<`);
  });

  it('escapa los textos del usuario', () => {
    expect(xml).toContain('Ferretería &amp; Cía. de Prueba S.A.S.');
    expect(xml).toContain('Martillo &lt;de&gt; acero');
  });
});

describe('CUFE de punta a punta con el ejemplo del anexo técnico 1.9 (11.2.1)', () => {
  it('una factura con los datos del ejemplo da el CUFE publicado por la DIAN', () => {
    const factura = Factura.emitir({
      numero: NumeroDeFactura.de('', 323200000129),
      emision: MomentoDeEmision.desde(new Date('2019-01-16T15:53:10Z')),
      resolucion: ResolucionDeNumeracion.crear({
        numero: '18760000001',
        prefijo: '',
        desde: 323200000000,
        hasta: 323299999999,
        vigenteDesde: '2019-01-01',
        vigenteHasta: '2019-12-31',
      }),
      emisor: emisorDePrueba('700085371'),
      adquirente: adquirenteDePrueba('800199436'),
      lineas: [LineaDeFactura.crear({ descripcion: 'Servicio', cantidad: '1', precioUnitario: Dinero.de('1500000'), tarifaIva: '19' })],
      formaDePago: { metodo: 'contado', medio: '10', vence: null },
    });
    const { cufe } = generador.generar(factura, {
      ...configuracionDePrueba('produccion'),
      claveTecnica: '693ff6f2a553c3646a063436fd4dd9ded0311471',
    });
    expect(cufe).toBe('8bb918b19ba22a694f1da11c643b5e9de39adf60311cf179179e9b33381030bcd4c3c3f156c506ed5908f9276f5bd9b4');
  });
});

describe('configuración DIAN', () => {
  it('rechaza una configuración incompleta sin mostrar los valores reservados', () => {
    const malas = [
      { ...configuracionDePrueba(), claveTecnica: '' },
      { ...configuracionDePrueba(), idSoftware: '' },
      { ...configuracionDePrueba(), pinSoftware: ' ' },
      { ...configuracionDePrueba(), claveTecnica: 'clave secreta<' },
    ];
    for (const configuracion of malas) {
      expect(() => generador.generar(facturaConDosLineas(), configuracion)).toThrow(/^Configuración DIAN: /);
      try {
        generador.generar(facturaConDosLineas(), configuracion);
      } catch (e) {
        expect(String(e)).not.toContain('secreta');
        expect(String(e)).not.toContain(configuracion.pinSoftware.trim() || '12345');
      }
    }
  });
});
