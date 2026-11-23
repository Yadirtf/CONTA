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

Pendiente: `Nit`, fecha fiscal, `Resultado<T, E>` y `EventoDominio` llegan con sus historias.
