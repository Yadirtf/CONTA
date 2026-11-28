import '../dominio/lo_que_se_escribe.dart';

// Cuerpos JSON de cada sección, con los nombres del contrato (contratos/openapi.yaml).

Map<String, Object?> cuerpoDeDatosFiscales(DatosFiscalesNuevos d) => {
  'nit': d.nit,
  'razonSocial': d.razonSocial,
  'tipoDePersona': d.personaJuridica ? 'juridica' : 'natural',
  'responsabilidadesFiscales': d.responsabilidades,
  'responsableDeIva': d.responsableDeIva,
  'direccion': {
    'codigoMunicipio': d.direccion.codigoMunicipio,
    'ciudad': d.direccion.ciudad,
    'departamento': d.direccion.departamento,
    'linea': d.direccion.linea,
  },
  'correo': d.correo,
};

Map<String, Object?> cuerpoDeResolucion(ResolucionNueva r) => {
  'id': r.id,
  'clase': r.clase.codigo,
  'numero': r.numero,
  'prefijo': r.prefijo,
  'desde': r.desde,
  'hasta': r.hasta,
  'vigenteDesde': r.vigenteDesde,
  'vigenteHasta': r.vigenteHasta,
  if (r.claveTecnica != null) 'claveTecnica': r.claveTecnica,
};

Map<String, Object?> cuerpoDeSoftware(SoftwareNuevo s) => {
  'idSoftware': s.idSoftware,
  'testSetId': s.testSetId,
  if (s.pin != null) 'pin': s.pin,
  if (s.fabricante case final f?) 'fabricante': {'nombre': f.nombre, 'razonSocial': f.razonSocial},
};
