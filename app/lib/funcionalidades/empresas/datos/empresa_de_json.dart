import '../dominio/empresas.dart';

/// Empresa como la manda la API, con su membresía si viene.
Empresa empresaDeJson(Map<dynamic, dynamic> d) =>
    Empresa(id: d['id'] as String, razonSocial: d['razonSocial'] as String, membresia: _membresia(d));

/// Si falta o trae un rol o modo desconocido, null: la app no inventa permisos.
Membresia? _membresia(Map<dynamic, dynamic> d) {
  final rol = Rol.de(d['rol']);
  final modo = Modo.de(d['modo']);
  final permisos = d['permisos'];
  if (rol == null || modo == null || permisos is! List) return null;
  return Membresia(
    rol: rol,
    modo: modo,
    invitada: d['estado'] == 'invitada',
    permisos: permisos.whereType<String>().toSet(),
    exigeSegundoPaso: d['exigeSegundoFactor'] == true,
  );
}
