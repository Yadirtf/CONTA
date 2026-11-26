// API pública del módulo de catálogo para otros módulos (facturación leerá aquí compradores y productos, HU-06.01).
export { CatalogoModule } from './catalogo.module.js';
export { Cliente, CONSUMIDOR_FINAL, type DatosDeCliente } from './dominio/clientes/index.js';
export { type DatosDeProducto, Producto } from './dominio/productos/index.js';
