# Nota: proveedor de facturación electrónica de respaldo (HU-02.04)

- Fecha de la cotización: 2026-11-23, con los precios publicados por cada proveedor. No son cotizaciones firmadas: hay que confirmarlos antes de contratar.
- Historia: HU-02.04. El adaptador se construye en HU-06.06.
- Decide: Inge.

## Para qué sirve el respaldo

La emisión principal es la conexión directa con la DIAN (HU-02.01 a HU-02.03), sin costo por documento. El respaldo es un proveedor externo que se activa por configuración en tres casos:

- la conexión directa se retrasa;
- la DIAN cambia algo y hace falta una salida rápida;
- la conexión directa falla por un tiempo largo.

Mientras no se active, **no se paga nada**, porque todos los paquetes se compran por anticipado.

## Requisitos de CONTA

1. **API REST con JSON y un sandbox gratuito**, para correr las pruebas de contrato de HU-06.06 sin pagar.
2. **Multiempresa.** CONTA es una casa de software con muchos NIT, y cada empresa necesita su propia credencial.
3. **Documentos del MVP:** factura, POS electrónico, notas crédito y débito. Después, documento soporte y nómina.
4. **Estado asíncrono** (webhook o consulta), para encajar con la cola de HU-02.03 y HU-06.04.
5. **Precio por documento bajo**, y que sin volumen no se cobre nada.

## Proveedores comparados

| | MATIAS API | Muisca (Aliaddo S.A.S.) | Facturalatam |
| --- | --- | --- | --- |
| Modalidad ante la DIAN | Software propio: cada cliente se habilita con el software de MATIAS | **Proveedor tecnológico autorizado** | Software propio, y cada empresa registra su certificado y su resolución |
| Precio (COP, sin IVA) | Paquete anual de casa de software: 5.000 docs $220.000 · 10.000 $400.000 · 30.000 $630.000 · **50.000 $850.000** · 150.000 $2.250.000 | Paquete anual: 5.000 docs $399.900 · 15.000 $674.900 · **40.000 $1.599.900** · 120.000 $3.590.000 | Nube de reventa, mensual: 10 empresas y 5.000 docs al mes **$99.900/mes** · 50 empresas y 30.000 docs al mes $349.900/mes. Licencia propia: USD 200 una vez |
| Costo por documento | $17 (50.000) a $44 (5.000) | $30 a $80 | Unos $20 por documento con el cupo lleno |
| Certificado de firma | Aparte: $104.000 por NIT al año, incluido IVA. MATIAS lo emite y lo custodia | «Firma incluida», sin más detalle (por confirmar) | Lo pone cada empresa (promoción de $59.000 hasta el 30 de noviembre) |
| Sandbox | Sí, gratis y sin consumir documentos | La página no lo menciona (por confirmar) | 15 días de prueba, y una edición Community de código abierto |
| Documentos | Factura (estándar, AIU, exportación, contingencia), notas, POS, documento soporte, nómina\*, RADIAN | Factura, notas, documento soporte, POS. Nómina «próximamente» | Factura, notas, documento soporte, POS, nómina y RADIAN (según el plan) |
| Multiempresa | Sí: es su modelo de casa de software, y exige al menos 3 clientes habilitados al año | Sí, con un token por empresa (desde Business Plus, según su FAQ) | Sí, panel multiempresa con una llave por empresa |
| Estado asíncrono | Webhooks y consulta | Webhooks solo desde Executive | Webhooks |
| SLA | 99,9 % mensual, sujeto a la DIAN. Soporte entre desarrolladores en horario hábil | No publicado | No publicado |

\* MATIAS dice en una página que la nómina está incluida y en otra que llega «próximamente». Hay que confirmarlo.

También se revisaron otros dos:

- **Factus:** la documentación pública que se encontró es de un intermediario hecho por terceros y no publica precios.
- **Nextpyme:** la página solo carga con JavaScript, sin precios visibles.

Ninguno de los dos cumple todavía el criterio de precio publicado.

### Cuánto costaría con la meta de la fase 1

Supuesto: 20 clientes a unos 200 documentos al mes cada uno, es decir, 48.000 documentos al año.

- **MATIAS:** el paquete de 50.000 cuesta $850.000 al año. Si además se usan sus certificados, son $2.080.000 por los 20 NIT, unos **$2,9 millones al año**. Con el certificado propio de cada cliente, si MATIAS lo acepta (por confirmar), quedan $850.000.
- **Muisca:** se pasa del paquete de 40.000 al de 120.000, $3.590.000 al año. Con dos paquetes de 40.000 serían $3,2 millones.
- **Facturalatam:** el plan Distribuidor (50 empresas) cuesta $349.900 al mes, **$4,2 millones al año**. El plan de 10 empresas no alcanza para 20.

## Recomendación

**MATIAS API como respaldo principal, y Muisca como segunda opción.**

- **MATIAS** es el más barato por documento, tiene un sandbox gratis para las pruebas de contrato y está pensado para casas de software multiempresa. Además, no hay que pagar nada hasta activarlo. Ya era el ejemplo del plan del proyecto.
- **Muisca** es la mejor opción si se prefiere un **proveedor tecnológico** autorizado que acompañe la habilitación. Cuesta más o menos el doble por documento.
- **Facturalatam** queda descartado como respaldo. Su edición propia exige operar otro servidor, y eso va contra las capas gratis y la regla de una sola persona manteniendo todo. Su nube cobra mensualidad aunque no se use.

### Lo que hay que saber antes de depender del respaldo

1. **El cambio no es instantáneo.** Con MATIAS, que es software propio, cada cliente tiene que estar habilitado ante la DIAN **también con el software de MATIAS** (otro id de software y otro set de pruebas). Con Muisca, el cliente tiene que registrar a Muisca como su proveedor tecnológico en el portal de la DIAN. Por eso el asistente de habilitación (EP-07) debería ofrecer dejar ese segundo registro hecho desde el principio.
2. **La numeración se comparte.** Los dos adaptadores emiten con la misma resolución y los mismos consecutivos, así que la numeración debe seguir en CONTA (HU-06.07) y no en el proveedor.
3. **El cupo se agota sin aviso.** MATIAS deja de emitir cuando se acaba el paquete, sin cobrar de más. La consola debe alertar antes (HU-19.02).
4. **Custodia del certificado.** Si se usa el de MATIAS, la llave privada queda en sus servidores. Hay que decidirlo en HU-07.02, junto con la custodia propia.

## Cómo encaja en el puerto `ProveedorFacturacion`

Hoy el puerto de envío es `ServicioWebDian` (HU-02.03), que recibe el **XML ya firmado**. Un proveedor externo recibe en cambio un **JSON con la factura**, y él mismo arma el XML, lo firma y lo envía. Por eso el punto común tiene que estar un nivel más arriba. En HU-06.06 se agrega este puerto en `aplicacion/puertos/`:

```ts
/** Emite un documento electrónico ante la DIAN, por la vía que esté configurada. */
export interface ProveedorFacturacion {
  /** Entrega el documento. Es idempotente por CUFE o por el id del envío. */
  emitir(factura: Factura, contexto: ContextoEmpresa): Promise<AcuseDeRecibo>;
  /** Consulta el resultado de la validación. */
  consultar(referencia: string, contexto: ContextoEmpresa): Promise<RespuestaDeLaDian>;
}
```

- **Adaptador directo:** junta lo que ya existe. Primero `GeneradorUblDian`, luego `FirmadorXadesDian` y luego `ServicioWebDianDirecto`. La referencia es el `ZipKey`.
- **Adaptador de respaldo** (`infraestructura/proveedor-respaldo/matias/`): traduce `Factura` al JSON del proveedor, lo envía y convierte la respuesta en `AcuseDeRecibo` y `RespuestaDeLaDian`, que son los mismos objetos del dominio. La referencia es el id del documento del proveedor. Si el proveedor ofrece webhook, el webhook solo adelanta la consulta y el estado se sigue leyendo con `consultar`.
- **Lo que no cambia:**
  - el agregado `EnvioDian`, su máquina de estados y sus reintentos;
  - la cola y el registro de intentos;
  - la regla de que un documento enviado no se edita.

  El registro de intentos solo gana un campo con la vía usada (`directa` o `respaldo`).
- **Selección:** se configura por empresa, con la vía directa por omisión. Un envío que ya empezó termina por la misma vía con la que salió, para no enviar dos veces el mismo documento.
- **Pruebas de contrato:** el mismo conjunto corre contra los dos adaptadores, como pide la arquitectura. El directo usa respuestas grabadas de la DIAN y el de respaldo usa el sandbox gratis de MATIAS, en un workflow manual como el de habilitación.

## Fuentes

- MATIAS API: [propuesta comercial](https://matias-api.com/propuesta-comercial/), [casas de software](https://matias-api.com/casas-de-software/), [inicio](https://matias-api.com/).
- Muisca: [inicio](https://muisca.io/), [precios](https://muisca.io/precios/).
- Facturalatam: [API y precios](https://facturalatam.com/api/).
- Revisados y sin precio publicado: [Factus API (documentación de terceros)](https://www.mintlify.com/soporte-ainovapro/factus-api/introduction) y [Nextpyme](https://nextpyme.plus/).
