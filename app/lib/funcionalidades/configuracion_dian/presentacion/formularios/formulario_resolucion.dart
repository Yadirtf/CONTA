import 'package:material_ui/material_ui.dart';

import '../../../../nucleo/componentes/boton_principal.dart';
import '../../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../../nucleo/componentes/marco_de_formulario.dart';
import '../../../../nucleo/id_nuevo.dart';
import '../../../../nucleo/tema/tema_conta.dart';
import '../../dominio/configuracion_dian.dart';
import '../../dominio/lo_que_se_escribe.dart';
import '../controlador_de_configuracion_dian.dart';
import 'campo.dart';
import 'campo_de_fecha.dart';

/// Las resoluciones de una clase y el formulario para agregar otra. Una resolución guardada no se edita ni se
/// borra (la DIAN ya la autorizó y las facturas la citan): para otro rango, se agrega una nueva.
class FormularioResolucion extends StatefulWidget {
  const FormularioResolucion({
    super.key,
    required this.controlador,
    required this.clase,
    required this.guardadas,
    required this.modoContador,
  });

  final ControladorDeConfiguracionDian controlador;
  final ClaseDeDocumento clase;
  final List<Resolucion> guardadas;
  final bool modoContador;

  @override
  State<FormularioResolucion> createState() => _FormularioResolucionState();
}

class _FormularioResolucionState extends State<FormularioResolucion> {
  /// Uno por formulario abierto: si el envío se repite, la API no agrega dos.
  final _id = idNuevo();
  final _numero = TextEditingController();
  final _prefijo = TextEditingController();
  final _desde = TextEditingController();
  final _hasta = TextEditingController();
  final _claveTecnica = TextEditingController();
  String? _vigenteDesde;
  String? _vigenteHasta;
  String? _aviso;

  bool get _esFactura => widget.clase == ClaseDeDocumento.factura;

  @override
  void dispose() {
    for (final c in [_numero, _prefijo, _desde, _hasta, _claveTecnica]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _agregar() async {
    final desde = int.tryParse(_desde.text.trim());
    final hasta = int.tryParse(_hasta.text.trim());
    final (vigenteDesde, vigenteHasta) = (_vigenteDesde, _vigenteHasta);
    if (escrito(_numero) == null || desde == null || hasta == null || vigenteDesde == null || vigenteHasta == null) {
      return setState(() => _aviso = 'Escribe el número de la resolución, el rango y las fechas.');
    }
    setState(() => _aviso = null);
    final nueva = ResolucionNueva(
      id: _id,
      clase: widget.clase,
      numero: _numero.text.trim(),
      prefijo: _prefijo.text.trim().toUpperCase(),
      desde: desde,
      hasta: hasta,
      vigenteDesde: vigenteDesde,
      vigenteHasta: vigenteHasta,
      claveTecnica: _esFactura ? escrito(_claveTecnica) : null,
    );
    if (await widget.controlador.agregarResolucion(nueva) && mounted) {
      _claveTecnica.clear();
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.controlador,
    builder: (context, _) {
      final aviso = _aviso ?? widget.controlador.aviso;
      return MarcoDeFormulario(
        titulo: _esFactura ? 'Resolución de factura' : 'Resolución del POS',
        explicacion: 'Copia los datos de la resolución que te dio la DIAN. Una vez guardada no se cambia.',
        contenido: [
          for (final r in widget.guardadas) _Guardada(r),
          if (widget.guardadas.isNotEmpty) ...[
            const SizedBox(height: EspacioConta.s4),
            Text('Agregar otra', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: EspacioConta.s3),
          ],
          Campo(controlador: _numero, etiqueta: 'Número de la resolución', teclado: TextInputType.number),
          Campo(controlador: _prefijo, etiqueta: 'Prefijo', ayuda: 'Hasta 4 letras o números. Puede ir vacío.', mayusculas: true),
          Campo(controlador: _desde, etiqueta: 'Desde el número', teclado: TextInputType.number),
          Campo(controlador: _hasta, etiqueta: 'Hasta el número', teclado: TextInputType.number),
          CampoDeFecha(etiqueta: 'Vigente desde', valor: _vigenteDesde, alElegir: (f) => setState(() => _vigenteDesde = f)),
          CampoDeFecha(etiqueta: 'Vigente hasta', valor: _vigenteHasta, alElegir: (f) => setState(() => _vigenteHasta = f)),
          if (_esFactura)
            DatosDeLaDian(
              abierto: widget.modoContador,
              campos: [
                Campo(
                  controlador: _claveTecnica,
                  etiqueta: 'Clave técnica del rango',
                  ayuda: 'Se guarda protegida y no se vuelve a mostrar.',
                  secreto: true,
                ),
              ],
            ),
          if (aviso != null) FranjaDeAviso(aviso),
        ],
        accionPrincipal: BotonPrincipal(texto: 'Agregar resolución', ocupado: widget.controlador.ocupado, alTocar: _agregar),
      );
    },
  );
}

/// Una resolución guardada, solo para leer: no tiene «Editar».
class _Guardada extends StatelessWidget {
  const _Guardada(this.r);
  final Resolucion r;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: EspacioConta.s2),
    child: ListTile(
      leading: Icon(
        r.disponible ? Icons.check_circle_outline : Icons.history,
        color: r.disponible ? context.paleta.exito : context.paleta.textoSuave,
      ),
      title: Text('Resolución ${r.numero}'),
      subtitle: Text(
        '${r.prefijo}${r.desde} a ${r.prefijo}${r.hasta} · ${r.vigenteDesde} a ${r.vigenteHasta}\n'
        '${r.disponible ? 'En uso: va en el ${r.prefijo}${r.siguiente}' : 'Ya no se usa'}',
      ),
      isThreeLine: true,
    ),
  );
}
