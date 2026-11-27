import { documentoPorFirmar } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/firma/documento-por-firmar.js';
import { calcularCufe, codigoDeSeguridadDelSoftware } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/ubl/cufe.js';
import { GeneradorUblDian } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/ubl/generador-ubl-dian.js';
import { erroresContraUblInvoice, erroresDeExtensionesDian, erroresDeLaFirma } from '../../../recursos/dian/validador-xsd.js';
import { exigirXmlsec, hayXmlsec, verificarConXmlsec } from '../../../recursos/firma/verificador-xmlsec.js';
import { configuracionDePrueba, configuracionPosDePrueba, emisorDePrueba } from '../datos-de-prueba.js';
import { certificadoDe, firmador, juegoDeCertificados } from '../firma/apoyo.js';
import { resolucionPos, ventaPos } from './datos-pos.js';

// HU-06.02: el XML del tiquete POS electrónico (anexo del documento equivalente v1.0, Resolución 000165 de 2023).

const generador = new GeneradorUblDian();
const tiquete = () => ventaPos().aFactura(emisorDePrueba(), resolucionPos());
const { xml, cufe: cude } = generador.generar(tiquete(), configuracionPosDePrueba());

function texto(nombre: string, desde = 0): string {
  const m = new RegExp(`<${nombre}(?: [^>]*)?>([^<]*)</${nombre}>`).exec(xml.slice(desde));
  if (!m?.[1]) throw new Error(`No está ${nombre}`);
  return m[1];
}

describe('XML del tiquete POS electrónico', () => {
  it('es un Invoice con InvoiceTypeCode 20, el perfil del documento equivalente POS y CUDE-SHA384', () => {
    expect(texto('cbc:InvoiceTypeCode')).toBe('20');
    expect(texto('cbc:CustomizationID')).toBe('10');
    expect(texto('cbc:ProfileID')).toBe('DIAN 2.1: Documento Equivalente POS');
    expect(xml).toContain(`<cbc:UUID schemeID="2" schemeName="CUDE-SHA384">${cude}</cbc:UUID>`);
    expect(xml).toContain('<sts:InvoiceAuthorization>18760000002</sts:InvoiceAuthorization>');
    expect(xml).toContain('<sts:Prefix>EPOS</sts:Prefix>');
  });

  it('valida contra UBL-Invoice-2.1.xsd y sus extensiones de la DIAN contra DIAN_UBL_Structures.xsd', async () => {
    expect(await erroresContraUblInvoice(xml)).toEqual([]);
    const conocido = /Element '\{dian:gov:co:facturaelectronica:Structures-2-1\}(ProviderID|AuthorizationProviderID)', attribute 'schemeID'/;
    expect((await erroresDeExtensionesDian(xml)).filter((e) => !conocido.test(e))).toEqual([]);
  });

  it('el CUDE es la cadena del CUFE con el PIN del software en lugar de la clave técnica (anexo DEE 14.1.2)', () => {
    const total = xml.indexOf('<cac:LegalMonetaryTotal>');
    const campos = {
      numero: 'EPOS7',
      fecha: texto('cbc:IssueDate'),
      hora: texto('cbc:IssueTime'),
      valorBruto: texto('cbc:LineExtensionAmount', total),
      iva: texto('cbc:TaxAmount', xml.indexOf('<cac:TaxTotal>')),
      inc: '0.00',
      ica: '0.00',
      total: texto('cbc:PayableAmount'),
      nitEmisor: '900373076',
      identificacionAdquirente: '222222222222',
      ambiente: '2' as const,
    };
    expect(cude).toBe(calcularCufe({ ...campos, claveTecnica: configuracionPosDePrueba().pinSoftware }));
    expect(cude).not.toBe(calcularCufe({ ...campos, claveTecnica: configuracionDePrueba().claveTecnica }));
    expect(texto('sts:SoftwareSecurityCode')).toBe(codigoDeSeguridadDelSoftware('0b5f1c7e-3d4a-4e8b-9c1f-2a6d7e8f9a0b', '67890', 'EPOS7'));
    expect(texto('sts:QRCode')).toBe(`https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${cude}`);
  });

  it('lleva las tres extensiones del POS, en orden, con los nombres del anexo y sin el PIN', () => {
    const fabricante = xml.indexOf('<FabricanteSoftware>');
    const beneficios = xml.indexOf('<BeneficiosComprador>');
    const caja = xml.indexOf('<PuntoVenta>');
    expect(fabricante).toBeGreaterThan(xml.indexOf('</sts:DianExtensions>'));
    expect(beneficios).toBeGreaterThan(fabricante);
    expect(caja).toBeGreaterThan(beneficios);
    expect(xml).toContain(
      '<InformacionDelFabricanteDelSoftware><Name>NombreApellido</Name><Value>Equipo CONTA</Value><Name>RazonSocial</Name>' +
        '<Value>CONTA S.A.S.</Value><Name>NombreSoftware</Name><Value>CONTA</Value></InformacionDelFabricanteDelSoftware>',
    );
    expect(xml).toContain('<Name>Codigo</Name><Value>222222222222</Value><Name>NombresApellidos</Name><Value>Consumidor final</Value>');
    expect(xml).toContain('<Name>UbicaciónCaja</Name><Value>Calle 1 # 2-3, Bogotá, D.C.</Value>');
    expect(xml).toContain('<Name>CódigoVenta</Name><Value>EPOS7</Value><Name>SubTotal</Name><Value>6302.52</Value>');
    expect(xml).not.toContain('67890');
  });

  it('sale igual cada vez: el CUDE no cambia si se vuelve a armar', () => {
    expect(generador.generar(tiquete(), configuracionPosDePrueba())).toEqual({ xml, cufe: cude });
  });

  it('sin fabricante del software no se genera', () => {
    expect(() => generador.generar(tiquete(), { ...configuracionPosDePrueba(), fabricante: null })).toThrow(/fabricante/);
  });

  describe('firma', () => {
    const juego = juegoDeCertificados();
    const firmado = firmador().firmar(xml, certificadoDe(juego));

    it('la firma va en la última UBLExtension, después de las del POS, y valida con los esquemas', async () => {
      expect(firmado.indexOf('<ds:Signature')).toBeGreaterThan(firmado.indexOf('</PuntoVenta>'));
      expect(await erroresDeLaFirma(firmado)).toEqual([]);
      expect(await erroresContraUblInvoice(firmado)).toEqual([]);
    });

    it.runIf(hayXmlsec || exigirXmlsec)('valida con xmlsec1', () => {
      expect(verificarConXmlsec(firmado, juego.caPem).valida).toBe(true);
    });

    it('el firmador rechaza un tiquete con extensiones cambiadas, de más o en otro orden', () => {
      const otroOrden = xml.replace('<FabricanteSoftware>', '<Otra>').replace('</FabricanteSoftware>', '</Otra>');
      expect(() => documentoPorFirmar(otroOrden)).toThrow(/extensiones/);
      const comoFactura = xml.replace('<cbc:InvoiceTypeCode>20<', '<cbc:InvoiceTypeCode>01<');
      expect(() => documentoPorFirmar(comoFactura)).toThrow(/extensiones/);
    });
  });
});
