import 'package:share_plus/share_plus.dart';

import '../dominio/ventas.dart';

/// Abre el menú de compartir del teléfono con el PDF como archivo (WhatsApp lo muestra con su nombre). El archivo
/// sale de la memoria: share_plus solo deja una copia temporal en la caché privada de la app, y no se sube a
/// ningún lado ni queda un enlace.
class CompartidorDelTelefono implements CompartidorDeComprobantes {
  @override
  Future<void> compartir(ComprobanteParaCompartir comprobante) => SharePlus.instance.share(
    ShareParams(
      text: comprobante.texto,
      files: [XFile.fromData(comprobante.pdf, mimeType: 'application/pdf', name: comprobante.nombreDeArchivo)],
      fileNameOverrides: [comprobante.nombreDeArchivo],
    ),
  );
}
