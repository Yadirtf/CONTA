import 'package:conta_app/funcionalidades/clientes/dominio/clientes.dart';

/// API de compradores falsa: guarda lo que se pidió y responde como la API real (búsqueda por prefijo,
/// crear idempotente por id y por documento).
class RepositorioDeClientesFalso implements RepositorioDeClientes {
  RepositorioDeClientesFalso([List<Comprador>? compradores]) : compradores = [...?compradores];

  final List<Comprador> compradores;
  final busquedas = <String>[];
  final creados = <CompradorNuevo>[];

  /// Si no es null, la próxima creación responde este rechazo.
  Rechazo<Comprador>? rechazoAlCrear;

  @override
  Future<Respuesta<ResultadoDeBusqueda>> buscar(String empresaId, String documento) async {
    busquedas.add(documento);
    final nit = RegExp(r'^[1-9]\d{2,14}$').hasMatch(documento) ? NitCalculado(documento, 7) : null;
    return Exito(ResultadoDeBusqueda(nit: nit, compradores: compradores.where((c) => c.numero.startsWith(documento)).toList()));
  }

  @override
  Future<Respuesta<Comprador>> consumidorFinal(String empresaId) async => const Exito(consumidorFinalDePrueba);

  @override
  Future<Respuesta<Comprador>> crear(String empresaId, CompradorNuevo nuevo) async {
    creados.add(nuevo);
    if (rechazoAlCrear case final rechazo?) {
      rechazoAlCrear = null;
      return rechazo;
    }
    final existente = compradores.where((c) => c.id == nuevo.id || c.numero == nuevo.numero).firstOrNull;
    if (existente != null) return Exito(existente);
    final comprador = Comprador(
      id: nuevo.id,
      tipoDeDocumento: nuevo.tipoDeDocumento,
      numero: nuevo.numero,
      digitoVerificacion: nuevo.tipoDeDocumento == TipoDeDocumento.nit ? 7 : null,
      nombre: nuevo.nombre,
      tipoDePersona: nuevo.tipoDePersona,
      esConsumidorFinal: false,
      correo: nuevo.correo,
    );
    compradores.add(comprador);
    return Exito(comprador);
  }
}

const consumidorFinalDePrueba = Comprador(
  id: null,
  tipoDeDocumento: TipoDeDocumento.cedula,
  numero: '222222222222',
  digitoVerificacion: null,
  nombre: 'Consumidor final',
  tipoDePersona: TipoDePersona.natural,
  esConsumidorFinal: true,
);

const ferreteria = Comprador(
  id: 'c-ferreteria',
  tipoDeDocumento: TipoDeDocumento.nit,
  numero: '800197268',
  digitoVerificacion: 4,
  nombre: 'Ferretería El Tornillo',
  tipoDePersona: TipoDePersona.juridica,
  esConsumidorFinal: false,
);
