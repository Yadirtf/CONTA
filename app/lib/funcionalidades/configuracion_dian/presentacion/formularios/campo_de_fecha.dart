import 'package:material_ui/material_ui.dart';

import '../../../../nucleo/tema/tema_conta.dart';

/// Fecha elegida en el calendario, guardada como AAAA-MM-DD (como la escribe la resolución de la DIAN).
class CampoDeFecha extends StatelessWidget {
  const CampoDeFecha({super.key, required this.etiqueta, required this.valor, required this.alElegir});

  final String etiqueta;
  final String? valor;
  final ValueChanged<String> alElegir;

  Future<void> _elegir(BuildContext context) async {
    final hoy = DateTime.now();
    final elegida = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(valor ?? '') ?? hoy,
      firstDate: DateTime(2019),
      lastDate: DateTime(hoy.year + 10),
    );
    if (elegida != null) alElegir(aTexto(elegida));
  }

  static String aTexto(DateTime f) =>
      '${f.year.toString().padLeft(4, '0')}-${f.month.toString().padLeft(2, '0')}-${f.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: EspacioConta.s3),
    child: InkWell(
      onTap: () => _elegir(context),
      child: InputDecorator(
        decoration: InputDecoration(labelText: etiqueta, suffixIcon: const Icon(Icons.calendar_today_outlined)),
        child: Text(valor ?? 'Elegir'),
      ),
    ),
  );
}
