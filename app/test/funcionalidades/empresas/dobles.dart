import 'package:conta_app/funcionalidades/empresas/dominio/empresas.dart';

/// API de empresas falsa: la persona pertenece a las empresas de [empresas] y solo a esas.
class RepositorioDeEmpresasFalso implements RepositorioDeEmpresas {
  RepositorioDeEmpresasFalso([List<Empresa>? empresas]) : empresas = [...?empresas];

  final List<Empresa> empresas;

  /// Empresas pedidas con datosDe, en orden: cada una es lo que viajó en X-Empresa.
  final pedidasDentro = <String>[];
  Respuesta<List<Empresa>>? respuestaAlListar;

  @override
  Future<Respuesta<List<Empresa>>> misEmpresas() async => respuestaAlListar ?? Exito([...empresas]);

  @override
  Future<Respuesta<Empresa>> crear(String razonSocial) async {
    final nueva = Empresa(id: 'e${empresas.length + 1}', razonSocial: razonSocial);
    empresas.add(nueva);
    return Exito(nueva);
  }

  @override
  Future<Respuesta<Empresa>> datosDe(String empresaId) async {
    pedidasDentro.add(empresaId);
    final suya = empresas.where((e) => e.id == empresaId);
    return suya.isEmpty ? const Rechazo('empresa.no-encontrada', 'No encontramos esa empresa') : Exito(suya.single);
  }
}

const panaderia = Empresa(id: 'e-pan', razonSocial: 'Panadería La Espiga');
const ferreteria = Empresa(id: 'e-fer', razonSocial: 'Ferretería El Tornillo');
const drogueria = Empresa(id: 'e-dro', razonSocial: 'Droguería Salud');
