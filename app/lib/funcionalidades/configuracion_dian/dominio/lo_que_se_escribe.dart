// Dominio de la funcionalidad: Dart puro. Lo que el dueño escribe en cada sección; la API lo valida de verdad.

import 'configuracion_dian.dart';

final class DatosFiscalesNuevos {
  const DatosFiscalesNuevos({
    required this.nit,
    required this.razonSocial,
    required this.personaJuridica,
    required this.responsabilidades,
    required this.responsableDeIva,
    required this.direccion,
    required this.correo,
  });

  final String nit;
  final String razonSocial;
  final bool personaJuridica;
  final List<String> responsabilidades;
  final bool responsableDeIva;
  final Direccion direccion;
  final String? correo;
}

/// Resolución por agregar. El id lo elige la app: si se repite la petición, no se agregan dos.
final class ResolucionNueva {
  const ResolucionNueva({
    required this.id,
    required this.clase,
    required this.numero,
    required this.prefijo,
    required this.desde,
    required this.hasta,
    required this.vigenteDesde,
    required this.vigenteHasta,
    this.claveTecnica,
  });

  final String id;
  final ClaseDeDocumento clase;
  final String numero;
  final String prefijo;
  final int desde;
  final int hasta;
  final String vigenteDesde;
  final String vigenteHasta;

  /// Solo factura. Se escribe una vez y no vuelve a la app.
  final String? claveTecnica;
}

/// Software por guardar. Sin [pin], la API deja el que ya tenía.
final class SoftwareNuevo {
  const SoftwareNuevo({required this.idSoftware, required this.testSetId, this.pin, this.fabricante});
  final String idSoftware;
  final String testSetId;
  final String? pin;

  /// Obligatorio en el tiquete POS; no va en la factura.
  final Fabricante? fabricante;
}

/// Contrato con la API de configuración DIAN (HU-07.04). Todo se pide dentro del negocio (X-Empresa).
abstract interface class RepositorioDeConfiguracionDian {
  Future<Respuesta<ConfiguracionDian>> obtener(String empresaId);
  Future<Respuesta<void>> guardarDatosFiscales(String empresaId, DatosFiscalesNuevos datos);
  Future<Respuesta<void>> agregarResolucion(String empresaId, ResolucionNueva resolucion);
  Future<Respuesta<void>> guardarSoftware(String empresaId, ClaseDeDocumento clase, SoftwareNuevo software);
  Future<Respuesta<void>> guardarSiempreFactura(String empresaId, bool siempreFactura);
}
