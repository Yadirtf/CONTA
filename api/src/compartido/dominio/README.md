# compartido/dominio

Núcleo transversal sin frameworks. Se importa desde `compartido/dominio/index.ts`: `Dinero` y `DecimalExacto` (HU-01.04), `IdEmpresa` (HU-01.05) y `Nit` con su dígito de verificación (HU-02.01).
Este directorio no importa `@nestjs/*`, `drizzle-orm`, `pg` ni ningún SDK (la regla se verifica en CI desde HU-01.02).

## Dinero (HU-01.04, [ADR-0005](../../../../Docs/decisiones/0005-dinero-con-decimal-exacto-propio.md))

```ts
const precio = Dinero.de('1105.137');           // COP por defecto; texto o bigint, nunca number
const linea = precio.multiplicarPor('3.5');      // exacto: 3867.9795
const iva = linea.porcentaje('19');              // exacto, sin redondear
const total = linea.redondear().sumar(iva.redondear()); // redondeo explícito, mitad al par (DIAN)
```

- Las entradas admiten hasta 6 decimales; los resultados intermedios son exactos.
- `redondear()` va a los decimales de la moneda (2 en COP) con mitad al par, salvo que se pida otro modo.
- Nunca se mezclan monedas. `repartir` no pierde ni crea centavos. `diferenciaDentroDe` aplica las tolerancias de la DIAN.
- Una regla de ESLint prohíbe en `dominio/` los decimales en `number`, `parseFloat`, `toFixed` y `Math.round`.

## Impuestos (HU-05.02)

`impuestos/`: las tarifas de IVA vigentes (`TARIFAS_IVA`: 0, 5 y 19), el tratamiento de un producto
(`tratamientoDeIva('gravado', '19')`, `'exento'` o `'excluido'`) y el desglose:

```ts
desglosarDesdeTotal(Dinero.de('10000'), tratamientoDeIva('gravado', '19')); // base 8403.36 + IVA 1596.64 = 10000.00
desglosarDesdeBase(Dinero.de('1000'), tratamientoDeIva('gravado', '19'));   // base 1000.00 + IVA 190.00 = 1190.00
```

Desde el total, la base se redondea una vez (mitad al par) y el IVA es lo que falta: base + IVA = total siempre.

Pendiente: `Nit`, fecha fiscal, `Resultado<T, E>` y `EventoDominio` llegan con sus historias.
