# Backlog de CONTA

El backlog traduce el [plan del proyecto](../Plan%20del%20proyecto%20plataforma%20de%20facturación%20electrónica%20y%20contabilidad.md) en épicas e historias de usuario con criterios de aceptación. Se ordena por fases: **no se empieza una fase sin cumplir la meta de la anterior**.

## 1. Cómo se usa este backlog

- **Jerarquía:** Épica (`EP-xx`) → Historia de usuario (`HU-xx.yy`) → Tareas técnicas (se crean en el momento de trabajar la historia, en el issue o PR).
- **Formato de historia:** «Como *rol*, quiero *acción*, para *beneficio*», con criterios de aceptación en formato *Dado / Cuando / Entonces*.
- **Prioridad (MoSCoW):** **M** debe estar para cumplir la meta de la fase; **S** debería, si cabe; **C** podría, si sobra tiempo; **W** no ahora.
- **Tamaño:** S (≤ 1 día), M (2–3 días), L (≤ 1 semana). Una historia L que no se puede partir se revisa antes de empezar.
- **Estado:** Por refinar → Lista → En curso → En revisión → Hecha. «Lista» exige cumplir la Definición de Listo (abajo).
- **Dónde vive:** este archivo es la fuente de verdad del alcance. Cada épica e historia tiene su issue en GitHub con el mismo id en el título (`HU-03.02 …`), etiquetas de fase, prioridad, tamaño y `vs`. El PR enlaza su issue con `Closes #<n>`. Si una historia cambia aquí, se actualiza también su issue. Épicas: issues #3 a #21; historias: #22 a #84, enlazadas a su épica como sub-issues ([ver issues](https://github.com/Yadirtf/CONTA/issues)).
- **Marca VS:** las historias con **[VS]** tienen una decisión de diseño, UX, seguridad o escalabilidad que se resuelve con el proceso de Verbalized Sampling de la [guía de trabajo](../forma-de-trabajo/guia-del-coordinador.md) antes de programar.

### Roles

| Rol | Quién es |
| --- | --- |
| Dueño | Dueño del micronegocio, usa el modo simple |
| Cajero | Empleado que vende, modo simple con permisos limitados |
| Contador | Profesional que lleva una o varias empresas, modo contador |
| Administrador | Inge y el equipo de soporte, en la consola |
| Visitante | Cliente potencial en el sitio público |

### Definición de Listo (para pasar una historia a «Lista»)

- Tiene criterios de aceptación verificables, incluidos los casos de error.
- Las decisiones marcadas **[VS]** ya tienen ADR o nota de decisión aceptada.
- Se sabe qué módulo y capa toca (ver [arquitectura](../arquitectura/arquitectura-limpia.md)).
- No depende de otra historia sin terminar, o la dependencia está anotada.
- Cabe en tamaño L o menos.

La Definición de Hecho está en la [guía de trabajo](../forma-de-trabajo/guia-del-coordinador.md#7-definición-de-hecho).

## 2. Mapa de épicas por fase

| Fase | Meta para pasar | Épicas |
| --- | --- | --- |
| 0. Validación y cimientos (mes 1) | 5 pilotos con compromiso de pago; factura de prueba firmada en habilitación | EP-01, EP-02, EP-03 |
| 1. MVP de facturación (meses 2–4) | 20 clientes pagando; habilitación < 1 hora | EP-04, EP-05, EP-06, EP-07, EP-08, EP-09 |
| 2. Negocio diario (meses 5–6) | 50 clientes activos; cancelación < 5% | EP-10, EP-11, EP-12 |
| 3. Contabilidad y modo contador (meses 7–10) | Módulo contable lanzado; 3 contadores aliados | EP-13, EP-14, EP-15, EP-16 |
| 4. Nómina y RADIAN (meses 11–12) | Por definir con datos de la fase 3 | EP-17 |
| Transversal | Siempre | EP-18 (seguridad y cumplimiento), EP-19 (operación y observabilidad) |

## 3. Épicas e historias

### Fase 0. Validación y cimientos

#### EP-01. Cimientos del repositorio y CI — Prioridad M

Objetivo: que cualquier agente pueda trabajar sobre una estructura que ya impone la arquitectura limpia.

**HU-01.01 Estructura del monorepo** (M, M) **[VS]** — Hecha
Como administrador, quiero las carpetas `app/`, `api/`, `web/` y `contratos/` con su configuración base, para empezar a construir sin rehacer la estructura.
- Dado el repositorio, cuando se clona, entonces existen las tres aplicaciones con un «hola mundo» que compila y sus pruebas pasan.
- Dado `api/`, entonces sigue la estructura de módulos y capas de la arquitectura.
- Decisión [VS]: ORM o constructor de consultas (ADR-0003, Drizzle, aceptado); gestor de versiones de herramientas (nota en el PR: `.node-version` + `engines` + versión de Flutter en `pubspec.yaml`); framework de la app (ADR-0004, Flutter, aceptado).

**HU-01.02 Reglas de dependencia en CI** (M, S) — Hecha
Como administrador, quiero que el pipeline falle si una capa importa lo que no debe, para que la arquitectura no se degrade.
- Dado un import de `@nestjs/*` en `dominio/`, cuando corre CI, entonces el pipeline falla con un mensaje que nombra la regla.
- Dado un import entre `datos/` de dos funcionalidades Flutter, entonces el análisis de Dart falla.

**HU-01.03 Pipelines por carpeta** (M, S) — Hecha
Como administrador, quiero un workflow por carpeta, para que un cambio en `web/` no corra las pruebas de `app/`.
- Dado un PR que solo toca `web/`, cuando se abre, entonces solo corre `ci-web.yml`.
- Cada workflow corre lint, tipos, pruebas y reglas de dependencia.
- Todo `upload-artifact` usa `retention-days: 2` (lo revisa `ci-repositorio.yml`).

**HU-01.04 Objeto de valor Dinero** (M, S) — Hecha
Como contador, quiero que los montos se calculen sin errores de redondeo, para que los totales cuadren con la DIAN.
- Dado `0,1 + 0,2`, cuando se suma con `Dinero`, entonces el resultado es exactamente `0,3`.
- Las reglas de redondeo del anexo técnico 1.9 están cubiertas con pruebas de propiedad.
- Decisión: [ADR-0005](../decisiones/0005-dinero-con-decimal-exacto-propio.md), decimal exacto propio sobre `bigint` con mitad al par.

**HU-01.05 Aislamiento multiempresa con RLS** (M, M) **[VS]** — Hecha
Como dueño, quiero que ninguna otra empresa pueda ver mis datos, para confiar mis ventas a la plataforma.
- Dadas dos empresas A y B, cuando un usuario de A consulta cualquier endpoint con el id de un recurso de B, entonces recibe 404 y no hay fuga de datos.
- Dada una consulta SQL sin `app.empresa_id` fijado, entonces PostgreSQL no devuelve filas.
- Una prueba de aislamiento corre en CI para cada tabla nueva.
- Decisión: [ADR-0006](../decisiones/0006-aislamiento-multiempresa-con-rls.md), contexto explícito con `UnidadDeTrabajo`, RLS forzado y llaves con `empresa_id`; guía en [Multiempresa](../arquitectura/multiempresa.md).

**HU-01.06 Entorno de pruebas en Render, Cloudflare y Neon** (M, M) **[VS]** — Hecha
Como administrador, quiero que cada PR se pruebe con su propia base de datos en Neon, la API en Render y la web y la app en Cloudflare, usando solo capas gratuitas, para probar cada implementación sin tocar datos de otros.
- Dado un PR hacia `develop` que cambia `api/`, cuando se abre, entonces las pruebas de integración y e2e de NestJS corren en Actions contra la rama de Neon del PR; con la etiqueta `render-preview`, además existe su vista previa en Render.
- Dado un PR que cambia `web/` o `app/`, entonces se despliega su vista previa en Cloudflare y el PR muestra las URLs.
- Dado un push a `develop`, entonces se migran la rama `develop` de Neon y se despliega la API en Render con el deploy hook.
- El despertador de 14 minutos queda documentado y se puede prender o apagar sin tocar la API.
- Dado un PR, entonces existe la rama `preview/pr-<n>` en Neon con las migraciones aplicadas; al cerrar el PR se borra.
- La API se conecta con un rol sin `BYPASSRLS`; la prueba de aislamiento corre contra la rama de Neon.
- Decisión [VS]: dónde corre la API en pruebas (ADR-0002, aceptado: NestJS en Render).

**HU-01.07 Retención de artefactos de 2 días** (M, S) — Hecha
Como administrador, quiero que los artefactos de Actions duren 2 días y solo se conserven las versiones, para no acumular almacenamiento.
- Dado un artefacto con más de 2 días que no es de una etiqueta `v*` ni se llama `version-*`, cuando corre la limpieza diaria, entonces se borra.
- Las Releases y etiquetas nunca se borran.

#### EP-02. Prueba técnica con la DIAN — Prioridad M

Objetivo: reducir el mayor riesgo técnico (XML, firma, CUFE) desde el mes 1.

**HU-02.01 Generar XML UBL 2.1 de una factura** (M, L) — Hecha
Como administrador, quiero generar el XML de una factura según el anexo técnico 1.9, para enviarlo a la DIAN.
- Dada una factura con dos líneas, IVA 19% y 0%, cuando se genera el XML, entonces valida contra los esquemas XSD oficiales.
- El CUFE calculado coincide con el ejemplo del anexo técnico.
- Implementación: [`api/src/modulos/facturacion`](../../api/src/modulos/facturacion/README.md); los XSD de prueba y su origen en [`api/test/recursos/dian`](../../api/test/recursos/dian/README.md).

**HU-02.02 Firmar con XAdES** (M, L) **[VS]** — Hecha
Como administrador, quiero firmar el XML con el certificado del facturador, para que la DIAN lo acepte.
- Dado un certificado .p12 de prueba, cuando se firma, entonces la firma valida con un verificador XAdES externo.
- El certificado se descifra solo en memoria y nunca se escribe en disco ni en logs.
- Decisión [VS]: librería existente frente a implementación propia.
- Implementación: [`api/src/modulos/facturacion`](../../api/src/modulos/facturacion/README.md); decisión en [ADR-0007](../decisiones/0007-firma-xades-con-xml-crypto.md).

**HU-02.03 Enviar al ambiente de habilitación** (M, M) — Implementada; falta validar en habilitación
Como administrador, quiero enviar la factura firmada al ambiente de habilitación y leer la respuesta, para probar de punta a punta.
- Dada una factura válida, cuando se envía, entonces se guarda la respuesta de la DIAN y el estado queda en «aceptada».
- Dada una factura con error, entonces se guardan los códigos de rechazo legibles.
- Implementación: [`api/src/modulos/facturacion`](../../api/src/modulos/facturacion/README.md#envío-a-la-dian-hu-0203); decisión en [ADR-0008](../decisiones/0008-envio-dian-con-cola-en-tabla-y-despertador.md). Pasa a «Hecha» cuando el workflow «Habilitación DIAN» responda «aceptada».

**HU-02.04 Cotizar proveedor de respaldo** (S, S) — Hecha
Como administrador, quiero tener cotizado un proveedor externo, para activarlo si la conexión directa se retrasa.
- Existe una nota en `Docs/decisiones/` con al menos dos proveedores, precio y cómo encaja en el puerto `ProveedorFacturacion`.
- Nota: [proveedor de respaldo](../decisiones/nota-proveedor-de-respaldo.md). Recomienda MATIAS API, con Muisca como segunda opción.

#### EP-03. Validación con clientes — Prioridad M

**HU-03.01 Prototipo en papel del modo simple** (M, M) **[VS]** — Prototipo listo; falta la prueba con el piloto
Como dueño, quiero probar las 5 pantallas del modo simple antes de que se programen, para que la app se entienda sin explicación.
- Se diseñan al menos 3 alternativas de flujo para «factura en 3 toques» y se prueban con un piloto.
- Queda registrada la alternativa elegida y lo que dijo el piloto.
- Prototipo y guion de prueba: [prototipo del modo simple](../producto/prototipo-modo-simple.md). Pasa a «Hecha» cuando se anote el resultado del piloto.

**HU-03.03 Sistema visual y tokens de diseño** (M, S) **[VS]** — Hecha
Como dueño, quiero que la app, el sitio y la consola se vean claros, frescos y tranquilos, para usarlos sin dudar y sin ansiedad por el dinero.
- Existe una paleta de 3 colores de marca con proporción 60/30/10, elegida con Verbalized Sampling y evaluada por otro agente, y colores de estado aparte.
- Dado cualquier par de texto o componente declarado, entonces cumple WCAG AA en modo claro y oscuro (lo comprueba CI).
- Caso de error: dado un cambio en `contratos/diseno/tokens.json` sin regenerar, entonces el job `tokens` de CI falla.
- Decisión en [ADR-0009](../decisiones/0009-sistema-visual-y-tokens-compartidos.md); guía en [sistema de diseño](../producto/sistema-de-diseno.md). Paleta «Calma fresca» aprobada por Inge el 2026-11-23.
- Módulo y capas: `contratos/diseno/`, `herramientas/diseno/`, `app/lib/nucleo/tema/`, `web/*/src/compartido/estilos/`.

**HU-03.02 Guía de entrevista y registro de pilotos** (M, S) — Guía y registro listos; faltan las 10 entrevistas
Como administrador, quiero una guía de entrevista y un registro de pilotos, para decidir con datos.
- Existe la guía en `Docs/` y el registro de 10 entrevistas con hallazgos.
- [Guía de entrevista](../producto/guia-de-entrevista.md) y [registro de pilotos](../producto/registro-de-pilotos.md). Pasa a «Hecha» cuando el registro tenga las 10 entrevistas y sus hallazgos.

### Fase 1. MVP de facturación

#### EP-04. Identidad, empresas y roles — Prioridad M

**HU-04.01 Registro e inicio de sesión** (M, M) **[VS]** — Hecha
Como dueño, quiero entrar con mi celular y un código, para no recordar contraseñas.
- Dado un número válido, cuando pido el código, entonces llega en menos de 1 minuto y vence en 10.
- Tras 5 intentos fallidos, la cuenta se bloquea 15 minutos.
- Decisión [VS]: método de autenticación (OTP por SMS, por WhatsApp, enlace mágico, contraseña + 2FA).
- Decisión en [ADR-0010](../decisiones/0010-acceso-con-celular-y-codigo-por-whatsapp.md): WhatsApp primero detrás de un puerto, con SMS de respaldo para después y celulares de prueba en el entorno de pruebas. Probado el 2026-11-25 en el entorno de pruebas: el código real llegó por WhatsApp con la plantilla aprobada y un token permanente ([guía de WhatsApp](../despliegue/whatsapp-codigos-de-acceso.md)).
- Módulos: `api/src/modulos/identidad/` y `app/lib/funcionalidades/acceso/`.

**HU-04.02 Pertenecer a varias empresas** (M, M) — Hecha
Como contador, quiero cambiar entre las empresas que llevo, para no tener varias cuentas.
- Dado un usuario con membresía en 3 empresas, cuando cambia de empresa, entonces todos los datos mostrados son de la empresa elegida.
- Decisión en [ADR-0011](../decisiones/0011-pertenecer-a-varias-empresas.md): tabla `conta.membresias` con RLS y encabezado `X-Empresa` en cada petición, con la membresía comprobada en cada una. Una transacción del usuario, de solo lectura, lista «mis empresas». La app descarta todo lo de la empresa anterior al cambiar. Además: `POST /empresas` crea una empresa con quien la crea como miembro.
- Módulos: `api/src/modulos/empresas/` y `app/lib/funcionalidades/empresas/`.

**HU-04.03 Roles y modos** (M, M) — Hecha
Como dueño, quiero invitar a mi cajero con permisos limitados, para que venda sin ver los informes.
- Dado un cajero, cuando intenta abrir informes o anular documentos, entonces recibe «no tienes permiso».
- El modo (simple o contador) viene de la API con la membresía.
- Decisión en [ADR-0012](../decisiones/0012-roles-y-modos.md): roles dueño, contador y cajero con una matriz de permisos en el dominio. Cada endpoint declara `@Requiere(permiso)`, la guarda responde 403 «No tienes permiso» y niega por defecto, y los casos de uso vuelven a exigir el permiso. El modo va en la membresía y no da permisos. Invitar es por celular: la membresía queda invitada hasta que la persona la acepta. El retiro no borra la fila y nunca deja la empresa sin dueño. Los endpoints de informes (EP-16) y anulación (EP-06) llevarán `@Requiere(Permiso.VerInformes)` y `@Requiere(Permiso.AnularDocumentos)`.
- Módulos: `api/src/compartido/dominio/permisos/`, `api/src/modulos/empresas/`, `app/lib/funcionalidades/empresas/` y `app/lib/funcionalidades/miembros/`.

**HU-04.04 Verificación en dos pasos para contador y consola** (M, S) — Hecha
- Dado un usuario con rol contador o administrador, cuando inicia sesión, entonces se exige el segundo factor.
- Decisión en [ADR-0013](../decisiones/0013-verificacion-en-dos-pasos.md): app autenticadora (TOTP) con 10 códigos de recuperación. Se exige por membresía, en cada petición de empresa, a quien tiene rol contador o está en modo contador, y vale una jornada (12 horas) por sesión. Cambiar de app exige haber verificado hace poco: el WhatsApp solo nunca basta. El secreto va cifrado con una clave del entorno (`SECRETO_SEGUNDO_FACTOR`) y cada paso queda en un registro de solo inserción.
- La consola todavía no tiene inicio de sesión ni administradores en la API: la historia que los cree usará este mismo segundo factor, obligatorio y con una ventana más corta. La recuperación asistida (sin app ni códigos) queda para EP-18.
- Módulos: `api/src/modulos/identidad/` (dominio `segundo-factor/`), `api/src/compartido/dominio/permisos/exige-segundo-factor.ts` y `app/lib/funcionalidades/verificacion/`.

#### EP-05. Catálogo: clientes y productos — Prioridad M

**HU-05.01 Buscar cliente por cédula o NIT** (M, M) — Hecha
Como cajero, quiero buscar al comprador por su documento, para facturar rápido.
- Dado un NIT, cuando lo escribo, entonces se calcula y valida el dígito de verificación.
- Dado un comprador nuevo, puedo crearlo con los campos mínimos que exige la DIAN.
- Existe la opción «consumidor final».
- Decisión (nota en el PR, nivel 2): tabla `conta.clientes` por empresa con RLS, única por documento; búsqueda por el comienzo del documento con 3 caracteres como mínimo y 10 resultados como máximo, en el cuerpo de un `POST` para que el documento no quede en URLs; el dígito de verificación lo calcula la API (también al buscar) y rechaza uno escrito que no coincida; crear es idempotente con un id que elige la app y un documento repetido devuelve el comprador guardado; el consumidor final (222222222222) es una constante del dominio, no una fila, y su número queda reservado; tope de 300 compradores nuevos por empresa al día. Editar y borrar compradores (Ley 1581) quedan para una historia propia.
- Módulos: `api/src/modulos/catalogo/`, `api/src/compartido/dominio/identificacion/` y `app/lib/funcionalidades/clientes/`.

**HU-05.02 Productos con IVA ya marcado** (M, M) — Hecha
Como dueño, quiero crear productos con su precio e IVA, para no calcular impuestos al vender.
- Dado un producto con IVA 19% incluido, cuando lo vendo, entonces la base y el impuesto se separan exactamente.
- Puedo marcar productos excluidos o exentos.
- Decisión (nota en el PR, nivel 2, con Verbalized Sampling y evaluador aparte): tabla `conta.productos` por empresa con RLS; se guarda un solo precio, el final con IVA incluido (Ley 1480), y el tratamiento como tipo (gravado, exento, excluido) más tarifa (19 o 5; exento 0 %); un precio escrito sin IVA se convierte una vez al crear. Al vender se separa el total de la línea (precio × cantidad): la base se redondea una vez, mitad al par, y el IVA es lo que falta, así que base + IVA = total exacto. Crear pide el permiso nuevo `gestionar-productos` (dueño y contador); listar, `vender` (también el cajero). Crear es idempotente por id; código único por empresa; lista cerrada de unidades UN/ECE; tope de 500 productos nuevos por empresa al día y de 1.000 por persona sumando sus empresas, contado en `conta_sistema.cupos_diarios` (hallazgos de la prueba de ataque). Cambiar precio o retirar productos quedan para otra historia. Para HU-06.01: la línea de la factura se arma desde el total con IVA sin recalcular, y la factura distingue exento de excluido.
- Módulos: `api/src/compartido/dominio/impuestos/`, `api/src/modulos/catalogo/` (dominio `productos/`) y `app/lib/funcionalidades/productos/`.

#### EP-06. Emisión de documentos electrónicos — Prioridad M

**HU-06.01 Factura en 3 toques** (M, L) **[VS]** — Hecha
Como dueño, quiero emitir una factura en 3 toques, para atender al cliente sin demoras.
- Dado un producto frecuente y consumidor final, cuando toco producto → cobrar → confirmar, entonces la factura queda emitida.
- La app muestra el estado (pendiente, aceptada, rechazada) con palabras del modo simple.
- El PDF con QR y su envío por WhatsApp y correo pasaron a HU-06.08 (Inge decidió partir la historia).
- Decisión ([ADR-0014](../decisiones/0014-venta-con-numero-reservado-y-emision-aparte.md), nivel 3, con Verbalized Sampling y evaluador aparte): la venta reserva su consecutivo con un `UPDATE … RETURNING` sobre la resolución y guarda venta, líneas y emisión pendiente en una transacción corta (todo o nada: sin huecos ni repetidos); después, fuera del bloqueo, arma la factura determinista (misma fecha, mismo CUFE), la firma y la deja en la cola de envío de HU-02.03. Si la firma falla, `conta_sistema.cola_emision_ventas` la termina con el despertador o el endpoint interno. Idempotente por id de la app más la huella SHA-256 del pedido (otro pedido con el mismo id es 409). La app solo manda ids, cantidades en texto y medio de pago; precio e IVA salen del catálogo y cualquier campo extra es 400. Datos fiscales y resoluciones: tablas que la API solo lee, llenadas con `npm run facturacion:configurar`; la configuración del software sale del entorno (`DIAN_HAB_*`) para una sola empresa hasta EP-07. Topes: 3.000 ventas por empresa en 24 h y 3.000 por persona al día; total máximo $1.000.000.000; hasta 100 líneas. Medios de pago: efectivo, tarjetas y transferencia (Nequi y Daviplata); el fiado llega con EP-12.
- Módulos: `api/src/modulos/facturacion/` (dominio `ventas/`), `api/src/modulos/catalogo/` (`ObtenerParaVender`) y `app/lib/funcionalidades/ventas/`.

**HU-06.08 PDF con QR por WhatsApp y correo** (M, M) — En revisión
Como dueño, quiero compartir la factura en PDF con su QR, para que el comprador la tenga en su celular o su correo.
- Dada una venta emitida, cuando toco «Compartir», entonces sale el PDF con el QR de la DIAN para WhatsApp.
- Si el comprador tiene correo, le llega la factura (PDF y XML) al ser aceptada.
- No existe enlace público: el PDF solo se descarga con sesión de la empresa (criterio reescrito por Inge el 2026-11-27).
- Sin internet, compartir queda en cola con un aviso en modo simple.
- Decisión ([ADR-0015](../decisiones/0015-comprobante-a-pedido-y-correo-al-aceptar.md), nivel 3, con Verbalized Sampling y evaluador aparte): `GET /ventas/:id/comprobante` arma el PDF a pedido (pdfkit, QR vectorial, siempre igual) desde la venta y el XML firmado, con sesión, `X-Empresa`, `Permiso.Vender` y RLS, solo para facturas aceptadas, con `no-store` y 30 por 5 minutos. La app lo comparte como archivo (`share_plus`) desde «Listo» y «Mis ventas» (`GET /ventas`, últimas 50); sin internet o mientras la DIAN no aprueba, una cola de hasta 10 reintenta mientras la app está abierta. El correo se pide en la misma transacción que guarda «aceptado» y sale por Brevo (`CORREO_BREVO_LLAVE`, `CORREO_REMITENTE`) con intentos registrados; cada intento se toma antes de llamar al proveedor; los vencidos se leen con la única función `SECURITY DEFINER`, de solo lectura, que solo devuelve ids. El comprobante muestra al emisor como quedó en el XML firmado. El `ApplicationResponse` se guarda para el AttachedDocument, que queda para otra historia.
- Módulos: `api/src/modulos/facturacion/` (`comprobante/`, `correo/`) y `app/lib/funcionalidades/ventas/`.

**HU-06.02 POS electrónico** (M, M)
Como cajero, quiero emitir el documento POS electrónico, para ventas rápidas de mostrador.
- Cumple el anexo del documento equivalente POS y genera CUDE.

**HU-06.03 Notas crédito y débito** (M, M)
Como contador, quiero corregir una factura con una nota, porque las facturas no se editan.
- Dada una factura aceptada, cuando emito una nota crédito total, entonces la factura queda referenciada y no se modifica.
- No existe en la API ninguna operación que edite o borre un documento enviado.

**HU-06.04 Cola de envío y reintentos** (M, M)
Como dueño, quiero que mis facturas se envíen aunque la DIAN esté caída, para no perder ventas.
- Dada una caída de la DIAN, cuando se emite, entonces el documento queda en cola y se reintenta con espera exponencial.
- Cada intento queda registrado con fecha, hora y respuesta.
- Si se acerca el plazo legal de contingencia, se genera una alerta en la consola.

**HU-06.05 Vender sin internet** (M, L) **[VS]**
Como cajero, quiero vender sin señal, para no perder clientes.
- Dado el modo avión, cuando emito 10 facturas, entonces quedan guardadas con consecutivos válidos y se envían al volver la conexión.
- Un documento nunca se envía dos veces (idempotencia por id).
- Decisión [VS]: estrategia de reserva de consecutivos y de resolución de conflictos.

**HU-06.06 Adaptador del proveedor de respaldo** (S, M)
Como administrador, quiero poder cambiar al proveedor externo por configuración, para tener salida si la conexión directa falla.
- Las mismas pruebas de contrato pasan con los dos adaptadores.

**HU-06.07 Numeración y alertas de rango** (M, S)
- Dado un rango con menos del 10% disponible, entonces el dueño y la consola reciben una alerta.

#### EP-07. Asistente de habilitación DIAN en la consola — Prioridad M

**HU-07.01 Lista de pasos por cliente** (M, M) **[VS]**
Como administrador, quiero ver los 7 pasos de habilitación de cada cliente con su estado, para habilitarlo en menos de 1 hora.
- Cada paso muestra estado, responsable y fecha.
- Un paso no se marca como hecho sin su evidencia (archivo, TestSetId, número de resolución).

**HU-07.02 Carga segura del certificado** (M, M)
- Dado un .p12 y su clave, cuando lo cargo, entonces se cifra con KMS, se guarda su vencimiento y la clave no queda guardada en texto plano.

**HU-07.03 Set de pruebas automático** (M, L)
- Dado un TestSetId, cuando corro el set, entonces se envían 8 facturas, 1 nota débito y 1 nota crédito y se muestra el resultado de cada una.

#### EP-08. Suscripciones y pagos con Wompi — Prioridad M

**HU-08.01 Cobrar activación y suscripción** (M, M)
Como visitante, quiero pagar la activación y el plan en el sitio, para empezar a facturar.
- Dado un pago aprobado en Wompi, cuando llega el webhook, entonces se verifica la firma y la empresa queda activa.
- Webhooks repetidos no activan dos veces (idempotencia).

**HU-08.02 Suspensión por falta de pago** (M, S)
- Dados 3 cobros fallidos, entonces la empresa queda suspendida para emitir, pero puede consultar y descargar sus documentos.

**HU-08.03 Sin cobros dentro de la app Android** (M, S)
- La app no muestra precios, botones de pago ni enlaces a Wompi; se verifica en la revisión de cada pantalla.

#### EP-09. Publicación en tiendas — Prioridad M

**HU-09.01 Prueba cerrada con 12 testers durante 14 días** (M, S)
**HU-09.02 Eliminación de cuenta desde la app y desde la web** (M, S)
- Dada una solicitud de eliminación, entonces se borran los datos personales y se conservan los documentos que la ley obliga a guardar, explicándolo al usuario.
**HU-09.03 Revisión de reglas de la App Store** (S, S)

### Fase 2. Negocio diario

#### EP-10. Caja del día — Prioridad M
**HU-10.01 Cuánto vendí hoy por medio de pago** (M, M) **[VS]**
- Dado un día con ventas en efectivo, Nequi y tarjeta, entonces veo el total por medio y coincide con los documentos emitidos.
**HU-10.02 Arqueo de caja** (S, M)
- Dado un conteo de efectivo, entonces se registra la diferencia y quién hizo el arqueo.

#### EP-11. Inventario — Prioridad S
**HU-11.01 Existencias y alerta de agotado** (M, M)
**HU-11.02 Costo promedio y kardex** (S, L)

#### EP-12. Cartera y fiado — Prioridad M
**HU-12.01 Quién me debe** (M, M)
**HU-12.02 Cobro por WhatsApp con link de pago** (M, M) **[VS]**
- Dado un saldo pendiente, cuando envío el cobro, entonces el mensaje lleva un link de pago de Wompi y al pagarse el saldo se actualiza solo.
**HU-12.03 Edades de cartera** (S, M)

### Fase 3. Contabilidad y modo contador

#### EP-13. Contabilidad automática — Prioridad M
**HU-13.01 PUC precargado por tipo de negocio** (M, M)
**HU-13.02 Asiento automático por cada documento** (M, L)
- Dada una factura aceptada, entonces se genera su asiento y la suma de débitos es igual a la de créditos.
- Dada una nota crédito, entonces se genera el asiento de reversión; el original no se modifica.
**HU-13.03 Libros mayor y auxiliar** (M, M)
**HU-13.04 Cierre de periodo** (M, M)
- Dado un periodo cerrado, no se pueden registrar asientos con fecha en ese periodo.

#### EP-14. Gastos y compras — Prioridad S
**HU-14.01 Foto del recibo y categoría** (M, M) **[VS]**
**HU-14.02 Documento soporte electrónico** (M, L)
**HU-14.03 Causación y retenciones** (S, L)

#### EP-15. Impuestos — Prioridad M
**HU-15.01 Aviso de IVA por apartar** (M, S)
**HU-15.02 Retención en la fuente, ReteICA y ReteIVA** (M, L)
**HU-15.03 Borradores de declaraciones** (S, L)

#### EP-16. Informes y modo contador multiempresa — Prioridad M
**HU-16.01 Ganancias del mes en una gráfica** (M, M) **[VS]**
**HU-16.02 Balance general y estado de resultados** (M, L)
**HU-16.03 Panel del contador con todas sus empresas** (M, M) **[VS]**

### Fase 4. Nómina y RADIAN

#### EP-17. Nómina electrónica y eventos RADIAN — Prioridad C (se refina al terminar la fase 3)

### Transversales

#### EP-18. Seguridad y cumplimiento — Prioridad M en todas las fases
**HU-18.01 Registro de auditoría** (M, M)
- Dado un administrador que entra como cliente, entonces queda registrado quién, cuándo, qué empresa y qué hizo.
**HU-18.02 Política de datos y autorización (Ley 1581)** (M, S)
**HU-18.03 Conservación de XML y PDF por 5 años** (M, S)
**HU-18.04 Copias diarias y prueba de restauración mensual** (M, S)
**HU-18.05 Modelado de amenazas por épica** (M, S) **[VS]**
- Cada épica de las fases 1 a 4 tiene su modelo de amenazas (STRIDE) antes de empezar.

#### EP-19. Operación y observabilidad — Prioridad M
**HU-19.01 Sentry y logs estructurados** (M, S)
**HU-19.02 Alertas de la consola** (M, M)
- Certificados que vencen en 30 días, bolsa por debajo del 20%, documentos rechazados, cola atascada.
**HU-19.03 Métricas de negocio** (S, M)
- Ingreso recurrente, pagos fallidos, cancelaciones y costo por cliente.

## 4. Orden recomendado de las primeras historias

1. HU-01.01 → HU-01.02 → HU-01.03 → HU-01.06 → HU-01.04
2. HU-02.01 → HU-02.02 → HU-02.03 (riesgo técnico mayor, en paralelo con HU-03.01 y HU-03.02)
3. HU-01.05 antes de la primera tabla de negocio
4. EP-04 → EP-05 → EP-06 → EP-07 → EP-08 → EP-09

## 5. Plantilla para historias nuevas

```markdown
**HU-xx.yy Título corto** (Prioridad M/S/C/W, tamaño S/M/L) [VS si aplica]
Como <rol>, quiero <acción>, para <beneficio>.
- Dado <contexto>, cuando <acción>, entonces <resultado verificable>.
- Caso de error: dado <contexto>, cuando <acción>, entonces <resultado>.
- Módulo y capas: <modulo> / <capas>.
- Dependencias: <HU-...>.
```
