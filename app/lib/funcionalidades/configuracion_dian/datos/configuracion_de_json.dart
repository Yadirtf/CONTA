import '../dominio/configuracion_dian.dart';

/// Lee la respuesta de GET /configuracion-dian. Una resolución de una clase desconocida no se muestra.
ConfiguracionDian configuracionDeJson(Map<dynamic, dynamic> d) {
  final software = d['software'] as Map;
  final falta = d['loQueFalta'] as Map;
  return ConfiguracionDian(
    datosFiscales: switch (d['datosFiscales']) {
      final Map datos => _datosFiscales(datos),
      _ => null,
    },
    resoluciones: (d['resoluciones'] as List).map((r) => _resolucion(r as Map)).whereType<Resolucion>().toList(),
    softwareFactura: _software(software['factura']),
    softwarePos: _software(software['pos']),
    siempreFactura: d['siempreFactura'] == true,
    loQueFalta: LoQueFalta(
      puedeFacturar: falta['puedeFacturar'] == true,
      posActivo: falta['posActivo'] == true,
      pendientes: (falta['pendientes'] as List).map(Pendiente.de).whereType<Pendiente>().toSet(),
    ),
  );
}

DatosFiscales _datosFiscales(Map<dynamic, dynamic> d) {
  final direccion = d['direccion'] as Map;
  return DatosFiscales(
    nit: d['nit'] as String,
    digitoVerificacion: (d['digitoVerificacion'] as num).toInt(),
    razonSocial: d['razonSocial'] as String,
    personaJuridica: d['tipoDePersona'] == 'juridica',
    responsabilidades: (d['responsabilidadesFiscales'] as List).whereType<String>().toList(),
    responsableDeIva: d['responsableDeIva'] == true,
    direccion: Direccion(
      codigoMunicipio: direccion['codigoMunicipio'] as String,
      ciudad: direccion['ciudad'] as String,
      departamento: direccion['departamento'] as String,
      linea: direccion['linea'] as String,
    ),
    correo: d['correo'] as String?,
  );
}

Resolucion? _resolucion(Map<dynamic, dynamic> d) {
  final clase = ClaseDeDocumento.de(d['clase']);
  if (clase == null) return null;
  return Resolucion(
    id: d['id'] as String,
    clase: clase,
    numero: d['numero'] as String,
    prefijo: d['prefijo'] as String,
    desde: (d['desde'] as num).toInt(),
    hasta: (d['hasta'] as num).toInt(),
    vigenteDesde: d['vigenteDesde'] as String,
    vigenteHasta: d['vigenteHasta'] as String,
    siguiente: (d['siguiente'] as num).toInt(),
    disponible: d['disponible'] == true,
    conClaveTecnica: d['conClaveTecnica'] == true,
  );
}

SoftwareGuardado? _software(Object? d) {
  if (d is! Map) return null;
  final fabricante = d['fabricante'];
  return SoftwareGuardado(
    idSoftware: d['idSoftware'] as String,
    testSetId: d['testSetId'] as String,
    pinTapado: d['pin'] as String,
    fabricante: fabricante is Map
        ? Fabricante(nombre: fabricante['nombre'] as String, razonSocial: fabricante['razonSocial'] as String)
        : null,
  );
}
