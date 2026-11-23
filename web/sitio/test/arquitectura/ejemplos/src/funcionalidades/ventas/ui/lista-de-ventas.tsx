// Ejemplo que rompe las reglas a propósito: la ui de ventas usa los datos/ de clientes.
import { pedirClientes } from '../../clientes/datos/pedir-clientes';

export function ListaDeVentas() {
  return <ul>{String(pedirClientes())}</ul>;
}
