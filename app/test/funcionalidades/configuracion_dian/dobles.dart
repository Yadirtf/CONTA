import 'package:conta_app/funcionalidades/configuracion_dian/dominio/configuracion_dian.dart';
import 'package:conta_app/funcionalidades/configuracion_dian/dominio/lo_que_se_escribe.dart';

/// API de configuración DIAN falsa: guarda lo que se pidió y responde como la API real.
class RepositorioDeConfiguracionDianFalso implements RepositorioDeConfiguracionDian {
  RepositorioDeConfiguracionDianFalso([this.configuracion = sinNada]);

  ConfiguracionDian configuracion;
  final pedidos = <Object>[];

  /// Rechazos que responden los próximos guardados, en orden.
  final rechazos = <Rechazo<void>>[];

  @override
  Future<Respuesta<ConfiguracionDian>> obtener(String empresaId) async => Exito(configuracion);

  @override
  Future<Respuesta<void>> guardarDatosFiscales(String empresaId, DatosFiscalesNuevos datos) => _guardar(datos);

  @override
  Future<Respuesta<void>> agregarResolucion(String empresaId, ResolucionNueva resolucion) => _guardar(resolucion);

  @override
  Future<Respuesta<void>> guardarSoftware(String empresaId, ClaseDeDocumento clase, SoftwareNuevo software) =>
      _guardar(software);

  @override
  Future<Respuesta<void>> guardarSiempreFactura(String empresaId, bool siempreFactura) => _guardar(siempreFactura);

  Future<Respuesta<void>> _guardar(Object pedido) async {
    pedidos.add(pedido);
    if (rechazos.isNotEmpty) return rechazos.removeAt(0);
    return const Exito(null);
  }
}

const sinNada = ConfiguracionDian(
  datosFiscales: null,
  resoluciones: [],
  softwareFactura: null,
  softwarePos: null,
  siempreFactura: false,
  loQueFalta: LoQueFalta(
    puedeFacturar: false,
    posActivo: false,
    pendientes: {Pendiente.datosFiscales, Pendiente.resolucionFactura, Pendiente.softwareFactura},
  ),
);

const pideVerificacion = Rechazo<void>(verificacionRecienteRequerida, 'Confirma tu código.');
