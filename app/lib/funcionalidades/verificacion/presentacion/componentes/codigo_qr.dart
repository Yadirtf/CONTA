import 'package:material_ui/material_ui.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../../nucleo/tema/tema_conta.dart';

/// Código QR con el enlace de la app de verificación. Siempre oscuro sobre claro (paleta clara), también en
/// modo oscuro: así lo leen todas las cámaras.
class CodigoQr extends StatelessWidget {
  const CodigoQr(this.enlace, {super.key});

  final String enlace;

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Código QR para tu app de verificación',
    child: Center(
      child: Container(
        padding: const EdgeInsets.all(EspacioConta.s3),
        decoration: BoxDecoration(color: PaletaConta.claro.tarjeta, borderRadius: BorderRadius.circular(RadioConta.tarjeta)),
        child: QrImageView(
          data: enlace,
          size: 200,
          backgroundColor: PaletaConta.claro.tarjeta,
          eyeStyle: QrEyeStyle(eyeShape: QrEyeShape.square, color: PaletaConta.claro.texto),
          dataModuleStyle: QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: PaletaConta.claro.texto),
        ),
      ),
    ),
  );
}
