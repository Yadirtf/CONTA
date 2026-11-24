import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../dominio/acceso.dart';

/// Sesión en el almacén cifrado del sistema (Keystore en Android). Si algo falla al leer, no hay sesión.
class AlmacenDeSesionSeguro implements AlmacenDeSesion {
  AlmacenDeSesionSeguro([FlutterSecureStorage? almacen]) : _almacen = almacen ?? const FlutterSecureStorage();

  final FlutterSecureStorage _almacen;
  static const _clave = 'conta.sesion';

  @override
  Future<SesionGuardada?> leer() async {
    try {
      final texto = await _almacen.read(key: _clave);
      if (texto == null) return null;
      final datos = jsonDecode(texto) as Map<String, dynamic>;
      return SesionGuardada(
        token: datos['token'] as String,
        venceEn: DateTime.parse(datos['venceEn'] as String),
        celular: datos['celular'] as String,
      );
    } on Object {
      return null;
    }
  }

  @override
  Future<void> guardar(SesionGuardada sesion) => _almacen.write(
        key: _clave,
        value: jsonEncode({'token': sesion.token, 'venceEn': sesion.venceEn.toIso8601String(), 'celular': sesion.celular}),
      );

  @override
  Future<void> borrar() => _almacen.delete(key: _clave);
}
