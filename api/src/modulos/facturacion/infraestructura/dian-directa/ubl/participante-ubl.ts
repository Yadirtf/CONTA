import type { Participante } from '../../../dominio/index.js';
import { el, grupo, type NodoXml } from '../xml/escritor-xml.js';
import { AGENCIA_DIAN } from './constantes-dian.js';

type Direccion = NonNullable<Participante['direccion']>;

/** AccountingSupplierParty o AccountingCustomerParty. El prefijo de la resolución solo aplica al emisor. */
export function participanteUbl(
  rol: 'cac:AccountingSupplierParty' | 'cac:AccountingCustomerParty',
  p: Participante,
  prefijo: string | null = null,
): NodoXml {
  return grupo(rol, [el('cbc:AdditionalAccountID', p.tipoDePersona === 'juridica' ? '1' : '2'), parte(p, prefijo)]);
}

function parte(p: Participante, prefijo: string | null): NodoXml {
  const atributosId = atributosDeIdentificacion(p);
  const direccion = p.direccion && direccionUbl(p.direccion);
  return grupo('cac:Party', [
    p.tipoDePersona === 'natural' &&
      grupo('cac:PartyIdentification', [el('cbc:ID', p.identificacion.numero, atributosId)]),
    grupo('cac:PartyName', [el('cbc:Name', p.razonSocial)]),
    direccion && grupo('cac:PhysicalLocation', [grupo('cac:Address', direccion)]),
    grupo('cac:PartyTaxScheme', [
      el('cbc:RegistrationName', p.razonSocial),
      el('cbc:CompanyID', p.identificacion.numero, atributosId),
      el('cbc:TaxLevelCode', p.responsabilidadesFiscales.join(';')),
      direccion && grupo('cac:RegistrationAddress', direccion),
      esquemaTributario(p.responsableDeIva),
    ]),
    grupo('cac:PartyLegalEntity', [
      el('cbc:RegistrationName', p.razonSocial),
      el('cbc:CompanyID', p.identificacion.numero, atributosId),
      prefijo !== null && prefijo !== '' && grupo('cac:CorporateRegistrationScheme', [el('cbc:ID', prefijo)]),
    ]),
    p.correo !== null && grupo('cac:Contact', [el('cbc:ElectronicMail', p.correo)]),
  ]);
}

function atributosDeIdentificacion({ identificacion }: Participante): Record<string, string> {
  const atributos: Record<string, string> = {
    ...AGENCIA_DIAN,
    schemeName: identificacion.tipo,
  };
  if (identificacion.digitoVerificacion !== null) atributos['schemeID'] = String(identificacion.digitoVerificacion);
  return atributos;
}

function esquemaTributario(responsableDeIva: boolean): NodoXml {
  return responsableDeIva
    ? grupo('cac:TaxScheme', [el('cbc:ID', '01'), el('cbc:Name', 'IVA')])
    : grupo('cac:TaxScheme', [el('cbc:ID', 'ZZ'), el('cbc:Name', 'No aplica')]);
}

function direccionUbl(d: Direccion): NodoXml[] {
  return [
    el('cbc:ID', d.codigoMunicipio),
    el('cbc:CityName', d.ciudad),
    el('cbc:CountrySubentity', d.departamento),
    el('cbc:CountrySubentityCode', d.codigoMunicipio.slice(0, 2)),
    grupo('cac:AddressLine', [el('cbc:Line', d.linea)]),
    grupo('cac:Country', [el('cbc:IdentificationCode', 'CO'), el('cbc:Name', 'Colombia', { languageID: 'es' })]),
  ];
}
