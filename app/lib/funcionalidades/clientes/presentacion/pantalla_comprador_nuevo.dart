import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/boton_principal.dart';
import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/clientes.dart';
import 'controlador_de_comprador_nuevo.dart';
import 'datos_del_rut.dart';

/// Crear un comprador con lo mínimo que pide la DIAN (HU-05.01): documento, nombre y si es persona o empresa.
/// Lo del RUT queda plegado: casi nadie lo necesita en el mostrador. Al guardar, devuelve el comprador.
class PantallaCompradorNuevo extends StatefulWidget {
  const PantallaCompradorNuevo({super.key, required this.repositorio, required this.empresaId, this.numeroInicial = ''});

  final RepositorioDeClientes repositorio;
  final String empresaId;
  final String numeroInicial;

  @override
  State<PantallaCompradorNuevo> createState() => _PantallaCompradorNuevoState();
}

class _PantallaCompradorNuevoState extends State<PantallaCompradorNuevo> {
  late final _controlador = ControladorDeCompradorNuevo(widget.repositorio, widget.empresaId);
  late final _numero = TextEditingController(text: widget.numeroInicial);
  final _nombre = TextEditingController();
  final _correo = TextEditingController();
  final _responsabilidades = TextEditingController();
  TipoDeDocumento _tipo = TipoDeDocumento.cedula;
  TipoDePersona _persona = TipoDePersona.natural;
  bool _responsableDeIva = false;

  @override
  void dispose() {
    for (final campo in [_numero, _nombre, _correo, _responsabilidades]) {
      campo.dispose();
    }
    _controlador.dispose();
    super.dispose();
  }

  void _cambiarTipo(TipoDeDocumento? tipo) {
    if (tipo == null) return;
    // Con NIT casi siempre es una empresa; con cédula, una persona. Se puede cambiar.
    setState(() {
      _tipo = tipo;
      _persona = tipo == TipoDeDocumento.nit ? TipoDePersona.juridica : TipoDePersona.natural;
    });
  }

  Future<void> _guardar() async {
    final comprador = await _controlador.guardar(
      tipo: _tipo,
      numero: _numero.text,
      nombre: _nombre.text,
      tipoDePersona: _persona,
      responsableDeIva: _responsableDeIva,
      responsabilidades: _responsabilidades.text,
      correo: _correo.text,
    );
    if (comprador != null && mounted) Navigator.of(context).pop(comprador);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Comprador nuevo')),
    body: SafeArea(
      child: ListenableBuilder(
        listenable: _controlador,
        builder: (context, _) => ListView(
          padding: const EdgeInsets.all(EspacioConta.s4),
          children: [
            DropdownButtonFormField<TipoDeDocumento>(
              initialValue: _tipo,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Documento'),
              items: [for (final t in TipoDeDocumento.values) DropdownMenuItem(value: t, child: Text(t.nombre))],
              onChanged: _cambiarTipo,
            ),
            const SizedBox(height: EspacioConta.s3),
            TextField(
              controller: _numero,
              decoration: InputDecoration(
                labelText: 'Número',
                helperText: _tipo == TipoDeDocumento.nit ? 'Sin el dígito: lo calculamos nosotros.' : null,
              ),
            ),
            const SizedBox(height: EspacioConta.s3),
            TextField(
              controller: _nombre,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(labelText: _persona == TipoDePersona.juridica ? 'Razón social' : 'Nombre completo'),
            ),
            const SizedBox(height: EspacioConta.s3),
            SegmentedButton<TipoDePersona>(
              // Una empresa se identifica con NIT: con otro documento solo se puede elegir «Persona».
              segments: [
                for (final p in TipoDePersona.values)
                  ButtonSegment(value: p, label: Text(p.nombre), enabled: p == TipoDePersona.natural || _tipo.esDeEmpresa),
              ],
              selected: {_persona},
              onSelectionChanged: (elegido) => setState(() => _persona = elegido.single),
            ),
            const SizedBox(height: EspacioConta.s3),
            TextField(
              controller: _correo,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Correo (opcional)', helperText: 'Para mandarle la factura.'),
            ),
            const SizedBox(height: EspacioConta.s3),
            DatosDelRut(
              esNit: _tipo == TipoDeDocumento.nit,
              responsabilidades: _responsabilidades,
              responsableDeIva: _responsableDeIva,
              alCambiarIva: (valor) => setState(() => _responsableDeIva = valor),
            ),
            if (_controlador.aviso != null) ...[const SizedBox(height: EspacioConta.s4), FranjaDeAviso(_controlador.aviso!)],
            const SizedBox(height: EspacioConta.s6),
            BotonPrincipal(texto: 'Guardar comprador', ocupado: _controlador.ocupado, alTocar: _guardar),
          ],
        ),
      ),
    ),
  );
}
