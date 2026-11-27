import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/empresas.dart';

/// Inicio dentro de un negocio. El nombre de arriba lo confirma la API pidiéndolo dentro de esa empresa:
/// si la persona ya no pertenece, se ve el aviso y no los datos. Debajo, su rol y su modo, que llegan de la API
/// (HU-04.03).
class PantallaDeEmpresa extends StatefulWidget {
  const PantallaDeEmpresa({
    super.key,
    required this.empresa,
    required this.repositorio,
    required this.alCambiar,
    required this.contenido,
    this.alSalir,
    this.alVerPersonas,
    this.alVerCompradores,
    this.alVerProductos,
    this.alVender,
  });

  final Empresa empresa;
  final RepositorioDeEmpresas repositorio;
  final VoidCallback alCambiar;
  final Widget contenido;

  /// Cerrar sesión. Llega desde la composición (app.dart): empresas no conoce el acceso.
  final VoidCallback? alSalir;

  /// Abrir las personas del negocio. Solo llega si la membresía tiene el permiso de gestionarlas.
  final VoidCallback? alVerPersonas;

  /// Buscar o crear compradores (HU-05.01). Solo llega si la membresía puede vender.
  final VoidCallback? alVerCompradores;

  /// Ver los productos y, si puede, crearlos (HU-05.02). Solo llega si la membresía puede vender.
  final VoidCallback? alVerProductos;

  /// Vender y facturar en 3 toques (HU-06.01). Solo llega si la membresía puede vender.
  final VoidCallback? alVender;

  @override
  State<PantallaDeEmpresa> createState() => _PantallaDeEmpresaState();
}

class _PantallaDeEmpresaState extends State<PantallaDeEmpresa> {
  late final _datos = widget.repositorio.datosDe(widget.empresa.id);

  @override
  Widget build(BuildContext context) => FutureBuilder<Respuesta<Empresa>>(
    future: _datos,
    builder: (context, foto) {
      final respuesta = foto.data;
      return Scaffold(
        appBar: AppBar(
          title: Text(respuesta is Exito<Empresa> ? respuesta.valor.razonSocial : widget.empresa.razonSocial),
          actions: [
            if (widget.alVerProductos != null)
              IconButton(
                onPressed: widget.alVerProductos,
                tooltip: 'Productos',
                icon: const Icon(Icons.inventory_2_outlined),
              ),
            if (widget.alVerCompradores != null)
              IconButton(
                onPressed: widget.alVerCompradores,
                tooltip: 'Compradores',
                icon: const Icon(Icons.badge_outlined),
              ),
            if (widget.alVerPersonas != null)
              IconButton(
                onPressed: widget.alVerPersonas,
                tooltip: 'Personas del negocio',
                icon: const Icon(Icons.group_outlined),
              ),
            IconButton(onPressed: widget.alCambiar, tooltip: 'Cambiar de negocio', icon: const Icon(Icons.swap_horiz)),
            if (widget.alSalir != null)
              IconButton(onPressed: widget.alSalir, tooltip: 'Salir', icon: const Icon(Icons.logout)),
          ],
        ),
        body: Padding(
          padding: const EdgeInsets.all(EspacioConta.s4),
          child: switch (respuesta) {
            null => const Center(child: CircularProgressIndicator()),
            Exito() => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (widget.empresa.membresia case final membresia?)
                  Text(membresia.descripcion, style: TextStyle(color: context.paleta.textoSuave)),
                const SizedBox(height: EspacioConta.s4),
                if (widget.alVender != null) ...[
                  SizedBox(
                    width: double.infinity,
                    height: AlturaConta.botonPrincipal,
                    child: FilledButton.icon(
                      onPressed: widget.alVender,
                      icon: const Icon(Icons.point_of_sale),
                      label: const Text('Vender'),
                    ),
                  ),
                  const SizedBox(height: EspacioConta.s4),
                ],
                Expanded(child: widget.contenido),
              ],
            ),
            Rechazo(:final mensaje) => FranjaDeAviso(mensaje),
          },
        ),
      );
    },
  );
}
