import 'package:conta_app/funcionalidades/acceso/dominio/acceso.dart';

/// API de acceso falsa: acepta el código 123456 y responde lo que se le pida.
class RepositorioDeAccesoFalso implements RepositorioDeAcceso {
  final pedidos = <String>[];
  final salidas = <String>[];
  Respuesta<CodigoEnviado>? respuestaAlPedir;
  Respuesta<SesionGuardada>? respuestaAlEntrar;

  @override
  Future<Respuesta<CodigoEnviado>> pedirCodigo(String celular) async {
    pedidos.add(celular);
    return respuestaAlPedir ??
        Exito(CodigoEnviado(venceEn: DateTime.utc(2026, 11, 23, 15, 10), otroCodigoDesde: DateTime.utc(2026, 11, 23, 15, 1)));
  }

  @override
  Future<Respuesta<SesionGuardada>> entrar(String celular, String codigo) async {
    if (respuestaAlEntrar != null) return respuestaAlEntrar!;
    return codigo == '123456'
        ? Exito(SesionGuardada(token: 't' * 43, venceEn: DateTime.utc(2026, 12, 23), celular: '+57$celular'))
        : const Rechazo('acceso.codigo-incorrecto', 'El código no coincide.', intentosRestantes: 4);
  }

  @override
  Future<void> salir(String token) async => salidas.add(token);
}

class AlmacenEnMemoria implements AlmacenDeSesion {
  SesionGuardada? sesion;

  @override
  Future<SesionGuardada?> leer() async => sesion;

  @override
  Future<void> guardar(SesionGuardada nueva) async => sesion = nueva;

  @override
  Future<void> borrar() async => sesion = null;
}
