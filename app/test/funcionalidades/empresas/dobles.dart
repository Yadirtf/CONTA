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

  /// Respuestas a invitaciones, en orden: «id:aceptar» o «id:rechazar».
  final respuestas = <String>[];

  @override
  Future<Respuesta<void>> responderInvitacion(String empresaId, {required bool aceptar}) async {
    respuestas.add('$empresaId:${aceptar ? 'aceptar' : 'rechazar'}');
    final i = empresas.indexWhere((e) => e.id == empresaId && e.invitada);
    if (i < 0) return const Rechazo('invitacion.no-encontrada', 'No tienes una invitación pendiente en esta empresa');
    final invitada = empresas[i];
    if (aceptar) {
      empresas[i] = Empresa(id: invitada.id, razonSocial: invitada.razonSocial, membresia: membresiaDe(invitada.membresia!.rol));
    } else {
      empresas.removeAt(i);
    }
    return const Exito(null);
  }

  @override
  Future<Respuesta<Empresa>> crear(String razonSocial) async {
    final nueva = Empresa(id: 'e${empresas.length + 1}', razonSocial: razonSocial, membresia: membresiaDe(Rol.dueno));
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

/// Membresía como la manda la API para cada rol (mismos permisos que la matriz de la API).
Membresia membresiaDe(Rol rol, {bool invitada = false}) => Membresia(
  rol: rol,
  modo: rol == Rol.contador ? Modo.contador : Modo.simple,
  invitada: invitada,
  exigeSegundoPaso: rol == Rol.contador,
  permisos: switch (rol) {
    Rol.dueno => {'ver-empresa', 'vender', Permiso.verInformes, Permiso.anularDocumentos, Permiso.gestionarMiembros, 'usar-modo-contador'},
    Rol.contador => {'ver-empresa', 'vender', Permiso.verInformes, Permiso.anularDocumentos, 'usar-modo-contador'},
    Rol.cajero => {'ver-empresa', 'vender'},
  },
);

const panaderia = Empresa(id: 'e-pan', razonSocial: 'Panadería La Espiga');
const ferreteria = Empresa(id: 'e-fer', razonSocial: 'Ferretería El Tornillo');
const drogueria = Empresa(id: 'e-dro', razonSocial: 'Droguería Salud');
