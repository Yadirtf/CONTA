// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

export '../../../nucleo/respuesta.dart';

/// Código de la API cuando un cambio pide haber verificado hace poco (HU-07.04: 10 minutos).
const verificacionRecienteRequerida = 'acceso.segundo-factor-reciente-requerido';

/// Documento al que sirve una resolución o un software: la factura electrónica o el tiquete POS.
enum ClaseDeDocumento {
  factura('factura'),
  pos('pos');

  const ClaseDeDocumento(this.codigo);
  final String codigo;

  static ClaseDeDocumento? de(Object? codigo) => values.where((c) => c.codigo == codigo).firstOrNull;
}

final class Direccion {
  const Direccion({required this.codigoMunicipio, required this.ciudad, required this.departamento, required this.linea});

  /// Código DANE de 5 dígitos.
  final String codigoMunicipio;
  final String ciudad;
  final String departamento;
  final String linea;
}

/// Los datos del RUT del negocio, como salen en sus facturas.
final class DatosFiscales {
  const DatosFiscales({
    required this.nit,
    required this.digitoVerificacion,
    required this.razonSocial,
    required this.personaJuridica,
    required this.responsabilidades,
    required this.responsableDeIva,
    required this.direccion,
    required this.correo,
  });

  final String nit;
  final int digitoVerificacion;
  final String razonSocial;
  final bool personaJuridica;
  final List<String> responsabilidades;
  final bool responsableDeIva;
  final Direccion direccion;
  final String? correo;
}

/// Una resolución de numeración guardada. Nunca se edita: para otro rango se agrega otra.
final class Resolucion {
  const Resolucion({
    required this.id,
    required this.clase,
    required this.numero,
    required this.prefijo,
    required this.desde,
    required this.hasta,
    required this.vigenteDesde,
    required this.vigenteHasta,
    required this.siguiente,
    required this.disponible,
    required this.conClaveTecnica,
  });

  final String id;
  final ClaseDeDocumento clase;
  final String numero;
  final String prefijo;
  final int desde;
  final int hasta;
  final String vigenteDesde;
  final String vigenteHasta;
  final int siguiente;

  /// Vigente hoy y con números por usar.
  final bool disponible;
  final bool conClaveTecnica;
}

final class Fabricante {
  const Fabricante({required this.nombre, required this.razonSocial});
  final String nombre;
  final String razonSocial;
}

/// El software que la DIAN registró para una clase de documento. El PIN llega tapado («•••7»).
final class SoftwareGuardado {
  const SoftwareGuardado({
    required this.idSoftware,
    required this.testSetId,
    required this.pinTapado,
    required this.fabricante,
  });

  final String idSoftware;
  final String testSetId;
  final String pinTapado;
  final Fabricante? fabricante;
}

/// Parte de la configuración que falta para facturar.
enum Pendiente {
  datosFiscales('datos-fiscales'),
  resolucionFactura('resolucion-factura'),
  softwareFactura('software-factura');

  const Pendiente(this.codigo);
  final String codigo;

  static Pendiente? de(Object? codigo) => values.where((p) => p.codigo == codigo).firstOrNull;
}

/// Lo que dice la API del estado del negocio: si ya factura, si el POS está activo y qué falta.
final class LoQueFalta {
  const LoQueFalta({required this.puedeFacturar, required this.posActivo, required this.pendientes});
  final bool puedeFacturar;
  final bool posActivo;
  final Set<Pendiente> pendientes;
}

/// Toda la configuración DIAN visible del negocio. No trae el PIN ni la clave técnica.
final class ConfiguracionDian {
  const ConfiguracionDian({
    required this.datosFiscales,
    required this.resoluciones,
    required this.softwareFactura,
    required this.softwarePos,
    required this.siempreFactura,
    required this.loQueFalta,
  });

  final DatosFiscales? datosFiscales;
  final List<Resolucion> resoluciones;
  final SoftwareGuardado? softwareFactura;
  final SoftwareGuardado? softwarePos;
  final bool siempreFactura;
  final LoQueFalta loQueFalta;

  List<Resolucion> resolucionesDe(ClaseDeDocumento clase) => resoluciones.where((r) => r.clase == clase).toList();

  SoftwareGuardado? softwareDe(ClaseDeDocumento clase) => switch (clase) {
    ClaseDeDocumento.factura => softwareFactura,
    ClaseDeDocumento.pos => softwarePos,
  };
}
