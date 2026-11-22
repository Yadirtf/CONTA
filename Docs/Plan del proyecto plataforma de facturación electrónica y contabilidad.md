# Plan del proyecto: plataforma de facturación electrónica y contabilidad

Nov 18, 2026 · @Inge

## Resumen

El proyecto es una plataforma multiempresa de facturación electrónica y contabilidad para micronegocios e independientes en Colombia, con una sola base de código para Android, iPhone y web.

- **Producto:** facturar ante la DIAN en 3 toques desde el celular, con la caja del día incluida. Quien necesite más activa la contabilidad completa con un modo para el contador.
- **Diferencial:** precio bajo, interfaz sencilla y acompañamiento personal. Tú habilitas a cada cliente ante la DIAN y le das soporte directo.
- **Canal:** venta directa en tu ciudad y en redes sociales, con referidos y alianzas con contadores.
- **Modelo:** activación única más suscripción mensual o anual, cobrada con Wompi.
- **Integración DIAN:** conexión directa con los servicios web de la DIAN, para no pagar proveedor por documento. Queda construido un adaptador para conectar un proveedor externo como respaldo si algún día hace falta.
- **Componentes:** app del cliente (Android, iPhone y web), consola de administración web para ti y un backend único. No hay instaladores para Windows ni Mac: en el computador todo se usa desde el navegador.

## Problema y oportunidad

La DIAN está extendiendo la facturación electrónica a los negocios pequeños, y quien no cumple arriesga sanciones. Las herramientas actuales son pesadas o caras para alguien que trabaja desde el celular.

- **Mercado:** más de 5,2 millones de micronegocios; 1,6 millones operan desde una vivienda ([Vanguardia, DANE](https://www.vanguardia.com/economia/nacional/2026/09/29/micronegocios-en-colombia-tres-de-cada-10-funcionan-desde-una-vivienda/)).
- **Presión regulatoria:** la DIAN inmovilizó 4.000 cuentas bancarias por no facturar electrónicamente ([La Nota Económica](https://lanotaeconomica.com.co/?p=44773)) y busca incluir a más independientes y pequeños comerciantes ([Asuntos Legales](https://www.asuntoslegales.com.co/consumidor/evite-sanciones-y-conozca-los-cuatro-cambios-a-la-hora-de-emitir-factura-electronica-4079868)).
- **Precio percibido:** lo que la gente siente caro son los planes con contabilidad: Siigo Emprendedor $191.327/mes y Alegra Pyme $163.900/mes ([Alegra](https://blog.alegra.com/colombia/alegra-vs-siigo-colombia/)). Solo facturación en Siigo cuesta $22.493/mes por 120 documentos ([Siigo](https://www.siigo.com/promociones)).
- **Competencia gratuita:** la DIAN regala software y certificado ([DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/facturacion-gratuita-dian/)), pero no tiene caja, inventario ni acompañamiento. Tu app tiene que ser claramente más fácil.

La oportunidad está en el hueco entre lo gratuito pero difícil y lo completo pero caro: un producto sencillo, barato y con alguien que te contesta el WhatsApp.

## Objetivos

**Objetivo general:** lanzar en 12 meses una plataforma que permita a un micronegocio facturar electrónicamente y llevar su contabilidad por menos de la mitad de lo que cobran Siigo o Alegra, con una base de código para Android, iPhone y web.

**Objetivos específicos** (las metas numéricas son propuestas para ajustar con los pilotos):

1. Validar con 5 clientes piloto que pagan antes de terminar el mes 1.
2. Lanzar el MVP de facturación (factura, POS electrónico, notas) en el mes 4, conectado directo a la DIAN, con 20 clientes pagando.
3. Bajar el tiempo de habilitación de cada cliente ante la DIAN a menos de 1 hora, con un asistente en la consola.
4. Llegar a 50 clientes activos en el mes 6, con menos del 5% de cancelaciones mensuales.
5. Lanzar el módulo contable con modo contador en el mes 10 y aliarse con al menos 3 contadores.
6. Mantener el costo operativo por cliente por debajo del 25% de lo que paga.

## Alcance y módulos: modo simple y modo contador

Un solo sistema contable por dentro, con dos caras: el dueño del negocio ve solo ventas y caja, y el contador ve cuentas, asientos e impuestos. La clave es que **cada venta genera su asiento contable automáticamente**, sin que el dueño sepa contabilidad.

| Módulo | Modo simple (dueño, cajero) | Modo contador | Fase |
| --- | --- | --- | --- |
| Facturación DIAN | Factura, POS electrónico y notas en 3 toques | Configuración de numeración, impuestos por producto, anulaciones | 1 |
| Clientes y productos | Buscar por cédula o NIT, precios, IVA ya marcado | Responsabilidades fiscales, cuentas contables por producto | 1 |
| Caja del día | Cuánto vendí, cuánto entró por Nequi, efectivo o tarjeta | Arqueo de caja y conciliación con bancos | 2 |
| Inventario | Existencias y alertas de producto agotado | Costo promedio, kardex, ajustes | 2 |
| Cartera y fiado | Quién me debe y cobro por WhatsApp con link de pago | Edades de cartera, provisiones | 2 |
| Gastos y compras | Foto del recibo y categoría | Documento soporte, causación, retenciones | 3 |
| Contabilidad | Oculta: sucede sola | Plan Único de Cuentas (PUC), comprobantes, libros mayor y auxiliar, cierre de periodo | 3 |
| Impuestos | Aviso de cuánto IVA debe apartar | IVA, retención en la fuente, ReteICA, ReteIVA, borradores de declaraciones | 3 |
| Informes | Ganancias del mes en una gráfica | Balance general, estado de resultados, flujo de caja | 3 |
| Nómina electrónica | No aparece | Empleados, liquidación, envío a la DIAN | 4 |

**Cómo funcionan los dos modos:**

- El modo es un permiso del usuario, no otra app. Un mismo negocio puede tener al dueño en modo simple y a su contador en modo contador.
- El contador puede manejar varias empresas desde una sola cuenta. Eso lo vuelve tu mejor canal de venta.
- El modo simple usa palabras de la calle («me deben», «entró») y el modo contador usa términos técnicos.
- El PUC viene precargado con una plantilla por tipo de negocio (tienda, barbería, servicios), y el contador la puede ajustar.

## Plataformas: app, web y consola

Son tres aplicaciones de cara al usuario sobre un solo backend. La app de Flutter cubre Android, iPhone y la versión web del cliente; la consola y el sitio público van en Next.js. No hay instaladores para Windows ni Mac: en el computador todo se usa desde el navegador.

| Aplicación | Quién la usa | Dónde corre | Qué hace |
| --- | --- | --- | --- |
| App del cliente | Dueño, cajero, contador | Android, iPhone y navegador web (mismo código) | Todas las funciones del negocio; en el navegador del computador se ve con más columnas y atajos de teclado |
| Consola de administración | Tú y tu equipo de soporte | Navegador web | Empresas y planes, asistente de habilitación DIAN, certificados y vencimientos, bolsa de documentos, pagos, soporte, métricas |
| Sitio público | Clientes potenciales | Navegador web | Página de venta, precios, registro y pago de la suscripción con Wompi |

**La consola es el centro de tu operación:**

- **Clientes:** alta de empresas, cambio de plan, suspensión por falta de pago y entrar como el cliente para dar soporte (con registro de auditoría).
- **Habilitación DIAN:** lista de pasos por cliente (RUT, certificado, numeración, set de pruebas, prefijos) con su estado.
- **Alertas:** certificados que vencen en 30 días, bolsa de documentos por debajo del 20%, facturas rechazadas por la DIAN.
- **Finanzas:** ingresos recurrentes del mes, pagos fallidos, cancelaciones y costo por cliente.

La app del cliente debe funcionar sin internet para vender. Las facturas se guardan en el celular y se envían a la DIAN cuando vuelve la conexión, dentro de los plazos que fija la norma para fallas tecnológicas.

## Tecnologías recomendadas

Recomiendo **Flutter** para el frente y **NestJS con PostgreSQL** para el backend. Flutter compila un solo código para Android, iPhone y web, así que no reescribes la app por sistema.

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| App del cliente (carpeta app) | Flutter (Dart) | Un código para Android, iPhone y web; buen rendimiento en celulares de gama baja |
| Estado y navegación | Riverpod, go\_router | Estándar de la comunidad, fácil de probar |
| Base local sin internet | Drift (SQLite) | Vender sin señal y sincronizar después |
| Backend | NestJS (TypeScript) | Estructura modular que encaja con arquitectura limpia; mucho material en español |
| Base de datos | PostgreSQL | Transacciones seguras para contabilidad; aislamiento por empresa con Row Level Security |
| Colas y tareas | Redis + BullMQ | Envío a la DIAN, reintentos, correos y alertas sin bloquear la app |
| Archivos | Almacenamiento tipo S3 | XML, PDF y adjuntos guardados al menos 5 años |
| Secretos | Servicio de llaves (KMS) | Cifrar los certificados de firma de cada cliente |
| Consola y sitio público (carpeta web) | Next.js (TypeScript) | Mismo lenguaje que el backend; buenas tablas para la consola y buen posicionamiento en Google |
| Pagos | Wompi (links, suscripciones y webhooks) | Ya lo conoces; acepta Nequi, PSE y tarjetas |
| Infraestructura | Docker, CI/CD con GitHub Actions, nube administrada | Despliegues repetibles y copias de seguridad automáticas |
| Monitoreo | Sentry y métricas básicas | Saber de un error antes de que el cliente llame |
| Conexión con la DIAN | XML UBL 2.1 y firma XAdES con una librería de Node | Lo exige el anexo técnico; se prueba gratis en el ambiente de habilitación de la DIAN |

Una alternativa válida es React Native con Expo para el frente. También cubre Android, iPhone y web; elige la que te resulte más cómoda de aprender.

## Arquitectura limpia y estructura del código

El backend es un monolito modular con arquitectura limpia: las reglas del negocio viven en el dominio y no saben nada de bases de datos, de la DIAN ni de Wompi. Eso te permite cambiar de proveedor o de base de datos sin tocar las reglas, y probar la contabilidad sin internet.

&#91;embedded content: arquitectura · 3 aplicaciones, 4 capas, 5 servicios externos\]

El dominio define puertos (interfaces como `ProveedorFacturacion` o `PasarelaPagos`) y la infraestructura los implementa. Empieza con un monolito y no con microservicios: para una persona es más fácil de desplegar y mantener.

**Módulos del backend:** identidad, empresas, catálogo, facturación, caja, inventario, cartera, contabilidad, impuestos, habilitación DIAN, suscripciones, notificaciones y auditoría. Cada uno tiene sus propias carpetas de dominio, aplicación, infraestructura y presentación.

**Estructura del repositorio**: un solo repositorio en GitHub con tres carpetas independientes, una por parte del sistema:

```
plataforma/                 # un solo repositorio en GitHub
  app/                      # Flutter: Android, iPhone y versión web del cliente
    lib/funcionalidades/facturacion/
      datos/                # llamadas a la API, base local
      dominio/              # entidades y casos de uso
      presentacion/         # pantallas y estado
  backend/                  # NestJS
    src/modulos/facturacion/
      dominio/              # Factura, reglas, puertos
      aplicacion/           # casos de uso
      infraestructura/      # conexión DIAN directa, adaptador de respaldo, repositorios
      presentacion/         # controladores REST
  web/                      # Next.js: consola de administración y sitio público
    consola/
    sitio/
  .github/workflows/        # pruebas y despliegue por carpeta
```

**En Flutter** usa la misma idea por funcionalidad: cada pantalla tiene sus carpetas de datos, dominio y presentación. La versión web que usan tus clientes en el computador sale de la carpeta app/, porque Flutter la compila para navegador; así no se escribe dos veces. La carpeta web/ queda para tu consola y la página de venta. Cada carpeta se prueba y se despliega por separado, y los modelos de la API se generan desde la especificación OpenAPI del backend para que app y web usen los mismos.

## Modelo multiempresa y datos

Usa una sola base de datos compartida en la que **cada tabla lleva el id de la empresa**. PostgreSQL bloquea que una empresa vea los datos de otra con Row Level Security, aunque el código tenga un error.

| Entidad | Qué guarda | Notas |
| --- | --- | --- |
| Empresa | NIT, razón social, régimen, plan, estado | La unidad que paga y factura |
| Usuario y membresía | Persona, rol (dueño, cajero, contador, soporte) y modo | Un usuario puede pertenecer a varias empresas |
| Habilitación DIAN | Paso actual, TestSetId del set de pruebas, fecha de inicio | Lo maneja el asistente de la consola |
| Certificado | Archivo cifrado, vencimiento, empresa | La clave nunca se guarda en texto plano |
| Numeración | Prefijo, rango, vigencia, consecutivo actual | Alerta cuando quede menos del 10% del rango |
| Documento electrónico | Tipo, número, CUFE, estado DIAN, XML, PDF | No se borra; se corrige con notas |
| Asiento contable | Fecha, comprobante, líneas débito y crédito | La suma de débitos siempre igual a la de créditos |
| Cuenta del PUC | Código, nombre, naturaleza | Plantilla por tipo de negocio |
| Suscripción y pago | Plan, ciclo, próximo cobro, referencia Wompi | Suspende el servicio si el pago falla 3 veces |
| Registro de auditoría | Quién hizo qué y cuándo | Obligatorio cuando entras como un cliente |

Reglas que no se negocian:

- Los documentos enviados a la DIAN y los asientos contables nunca se editan ni se borran. Se corrigen con notas o asientos de reversión.
- El dinero se guarda como número exacto (tipo numeric, o centavos en enteros), nunca con decimales flotantes, para evitar errores de redondeo.
- Cada cambio de estado de un documento queda registrado con fecha y hora.

## Integración con la DIAN y habilitación de clientes

La plataforma se conecta **directo con los servicios web de la DIAN**, sin proveedor intermedio, para no pagar por documento. Tu software se registra en la DIAN y cada cliente se habilita con él, a su nombre.

**Qué construye el módulo DIAN** según el anexo técnico de factura electrónica, versión 1.9, adoptado en la [Resolución 165 de 2023](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0165_2023.htm):

- El XML de cada documento en formato UBL 2.1.
- El código único de cada documento: CUFE para facturas y CUDE para notas y documentos equivalentes.
- La firma XAdES con el certificado digital de cada cliente.
- El envío a los servicios web de la DIAN, la lectura de la respuesta y los reintentos en cola.
- El PDF con código QR y su envío al comprador por correo.

Antes del primer cliente, construye y prueba todo en el ambiente de habilitación de la DIAN con tu propio NIT. Ese ambiente no cuesta nada.

**Proveedor externo como respaldo:** el backend habla con un puerto llamado `ProveedorFacturacion`. El adaptador principal es la conexión directa, y queda construido un segundo adaptador para un proveedor externo, por ejemplo MATIAS API, que cobra desde $220.000 por 5.000 documentos al año ([propuesta comercial](https://matias-api.com/propuesta-comercial/)). Lo activas si la DIAN cambia algo y necesitas una salida rápida, o si la conexión directa se retrasa.

**Costos de la conexión directa:** no pagas por documento. Cada cliente sí necesita su certificado de firma digital de una entidad autorizada por la ONAC ([DIAN](https://www.dian.gov.co/impuestos/factura-electronica/como-hacerlo/Paginas/ser-facturador-electronico.aspx)), que cuesta entre $104.000 ([MATIAS](https://matias-api.com/propuesta-comercial/)) y $200.000 más IVA al año ([ContaPyme](https://www.contapyme.com/brochure-facturacion-electronica.pdf)) según la entidad. Lo cubre la activación.

**Asistente de habilitación, paso a paso** (en la consola, con el cliente presente):

1. Verificar el RUT del cliente: correo del representante legal al día, porque el TOKEN de acceso a la DIAN llega a ese correo ([DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/requerimientos-para-ser-facturador-electronico/)).
2. Tramitar y cargar el certificado de firma digital (archivo .pfx o .p12).
3. Registrar al cliente como facturador electrónico con modo de operación software propio, asociado a tu software.
4. Solicitar la numeración en MUISCA (formato 1876) y asociar los prefijos ([DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/proceso-de-registro-y-habilitacion-como-facturador-electronico/)).
5. Correr el set de pruebas automático con el TestSetId que entrega la DIAN: 8 facturas, 1 nota débito y 1 nota crédito validadas sin errores.
6. Elegir la fecha de inicio y confirmar que el RUT quede con la responsabilidad 52.
7. Emitir una primera factura real con el cliente y explicarle la app en 10 minutos.

**Documentos que se soportan, por fase:** factura de venta, POS electrónico y notas crédito y débito (fase 1); documento soporte (fase 3); nómina electrónica y eventos RADIAN (fase 4).

## Seguridad y cumplimiento legal

Vas a guardar llaves de firma y datos fiscales de otras empresas, así que la seguridad es parte del producto, no un extra.

**Seguridad técnica:**

- Certificados cifrados con un servicio de llaves (KMS). Solo el módulo de firma puede descifrarlos, en memoria, al momento de firmar.
- Nunca guardes las claves del portal DIAN ni los TOKEN de los clientes.
- Verificación en dos pasos obligatoria en la consola y para el rol contador.
- Todo el tráfico cifrado (HTTPS) y la base de datos cifrada en disco.
- Copias de seguridad diarias con prueba de restauración cada mes.
- Registro de auditoría de cada acceso de soporte a la cuenta de un cliente.

**Cumplimiento legal** (valida cada punto con un abogado y un contador):

- Política de tratamiento de datos y autorización de cada cliente, según la Ley 1581 de 2012.
- Contrato de servicio que diga qué cubres, los tiempos de soporte, el límite de responsabilidad y qué pasa con los datos si el cliente se va.
- Conservación de XML y PDF de los documentos por al menos 5 años.
- Términos y condiciones y política de privacidad publicados en la app, como exigen Google Play y App Store.
- Tu propia formalización: RUT con la actividad de software, facturación electrónica de tus propios servicios y, cuando crezcas, constituir una SAS.

## Publicación en Google Play

La app sí puede publicarse en Google Play, con una condición: **dentro de la app Android no se vende nada**. La suscripción y la activación se cobran por la web o en persona con Wompi, y la app solo sirve para entrar y usar el servicio.

- **Por qué:** Google exige su sistema de cobro cuando se compra software en la nube o de productividad dentro de la app, y no permite enlaces ni botones hacia otro medio de pago. Pero acepta apps de solo consumo, en las que el usuario entra con una cuenta que pagó en otro lado ([política de pagos](https://support.google.com/googleplay/android-developer/answer/10281818)).
- **Dentro de la app:** sin precios, sin botón de pagar y sin enlace a Wompi. Se permite un texto informativo sin enlace, como «para cambiar de plan, escríbele a tu asesor».
- **En la versión web y fuera de la app** (WhatsApp, correo, visitas): cobras libremente con Wompi.
- **Alternativa:** cobrar dentro de la app con el sistema de Google, que se queda con el 15% de las suscripciones ([tarifas](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)). No la recomiendo para este modelo.
- **Eliminar cuenta:** si la app permite crear cuentas, debe dejar pedir la eliminación desde la app y desde una página web ([Google Play](https://support.google.com/googleplay/android-developer/answer/13327111)). Explica en la política de privacidad qué facturas debes conservar por ley.
- **Cuenta de desarrollador:** una cuenta personal creada después del 13 de noviembre de 2023 debe hacer una prueba cerrada con 12 testers durante 14 días seguidos antes de publicar ([Google Play](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)). Una cuenta de organización no la necesita. Tus clientes piloto pueden ser esos testers.
- **Instalar por fuera de Play:** no conviene. Google exigirá desarrolladores verificados también para apps instaladas por fuera, en todo el mundo desde 2027 ([Android Authority](https://www.androidauthority.com/android-sideloading-changes-timeline-3679204/)).
- **iPhone:** la App Store tiene reglas de cobro parecidas; revísalas antes de la fase 1.

## Modelo de negocio, precios y costos

El ingreso viene de una **activación única de $180.000**, que cubre el certificado y tu tiempo de habilitación, más una suscripción por plan. Los precios son una propuesta para probar con los pilotos.

| Plan | Precio mensual (COP) | Incluye | Compara con |
| --- | --- | --- | --- |
| Facturación | $18.000 ($180.000 al año) | Hasta 100 documentos al mes, 1 usuario, caja básica | Siigo, 120 documentos: $22.493 |
| Negocio | $35.000 | Hasta 300 documentos, 3 usuarios, inventario, fiado y cobros por WhatsApp | — |
| Contable | $79.000 | Hasta 500 documentos, contabilidad completa y modo contador | Alegra Pyme $163.900; Siigo Emprendedor $191.327 |
| Contador | $45.000 por empresa, desde 5 empresas | Todas las empresas de sus clientes en una cuenta | — |

**Prueba gratis sin perder plata:** 15 días con caja, inventario y facturas de demostración en el ambiente de pruebas. La facturación real se activa cuando el cliente paga la activación, porque el certificado se paga por adelantado. En los planes mensuales, la renovación anual del certificado se cobra aparte; en los planes anuales va incluida.

**Escenarios estimados** (mezcla supuesta: 70% Facturación, 20% Negocio, 10% Contable, lo que da unos $27.500 por cliente al mes; 60 documentos por cliente al mes; comisión de pagos estimada en 3%; certificados cubiertos por la activación):

| Clientes | Ingreso mensual | Infraestructura y servicios | Comisiones | Ganancia antes de impuestos |
| --- | --- | --- | --- | --- |
| 50 | $1.375.000 | $300.000 | $41.000 | \~$1.030.000 |
| 200 | $5.500.000 | $600.000 | $165.000 | \~$4.700.000 |
| 500 | $13.750.000 | $1.200.000 + 1 persona de soporte ($2.500.000) | $412.000 | \~$9.600.000 |

Con la conexión directa no hay costo por documento. Si algún día usas el proveedor de respaldo, suma su bolsa anual (por ejemplo, $850.000 por 50.000 documentos con MATIAS). La infraestructura y el soporte son estimaciones mías; reemplázalas con cotizaciones reales.

**Canales de venta:** visitas en tu ciudad, redes sociales con videos cortos («factura en 3 toques»), un mes gratis por cada referido que pague y alianzas con contadores que traen a sus clientes.

## Hoja de ruta por fases

Son 12 meses en cinco fases, y no se pasa a la siguiente sin cumplir la meta anterior. Los plazos son estimados para una persona trabajando sola.

&#91;embedded content: hoja de ruta · 5 fases, 4 metas de paso\]

Si una meta no se cumple a tiempo, no se avanza: se corrige el producto o el precio con lo que digan los clientes.

## Riesgos y mitigación

El riesgo mayor no es técnico: es abarcar demasiado. Construye la contabilidad solo después de tener clientes pagando por la facturación.

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Querer construir todo a la vez | Alto: años sin lanzar | Fases con metas que hay que cumplir para pasar a la siguiente; la contabilidad empieza en la fase 3 |
| La conexión directa con la DIAN (XML, firma, CUFE) toma más tiempo del previsto | Alto: retrasa el MVP | Firmar una factura de prueba desde el mes 1; si en la fase 1 no queda lista, lanzar con el proveedor de respaldo y migrar después |
| Un error contable o fiscal que genere sanciones a un cliente | Alto | Pruebas automáticas de cada regla de impuestos, revisión de un contador antes de lanzar, contrato con límite de responsabilidad |
| Fuga o robo de certificados | Alto | Cifrado con KMS, verificación en dos pasos, auditoría, sin claves de la DIAN guardadas |
| Caída de los servicios de la DIAN | Medio | Cola con reintentos, modo de contingencia y el adaptador del proveedor externo listo como respaldo |
| Cambios de norma de la DIAN | Medio | Seguir cada nuevo anexo técnico y probar los cambios en el ambiente de habilitación antes de publicarlos |
| El soporte te consume todo el tiempo | Medio | Guías en video, preguntas frecuentes en la app, horario de atención y plan con soporte prioritario |
| La competencia baja precios | Medio | Competir por servicio cercano y facilidad, no solo por precio |
| Clientes que no pagan | Bajo | Cobro automático con Wompi y suspensión tras 3 intentos fallidos |

## Próximos pasos

Las próximas 4 semanas son de validación, no de programar todo.

- [ ] Entrevistar a 10 dueños de negocio: cómo facturan hoy, cuánto pagan y qué les duele
- [ ] Conseguir 5 clientes piloto con precio de fundador y su compromiso de pago
- [ ] Estudiar el anexo técnico 1.9 y registrar tu software en el ambiente de habilitación de la DIAN con tu propio NIT
- [ ] Hablar con 2 contadores: qué necesitan del modo contador y si traerían clientes
- [ ] Revisar con un contador tus obligaciones tributarias y el contrato de servicio
- [ ] Crear el repositorio en GitHub con las carpetas app, backend y web, la arquitectura limpia y CI
- [ ] Construir la firma XAdES y emitir una factura de prueba de punta a punta en el ambiente de habilitación; dejar cotizado un proveedor de respaldo
- [ ] Diseñar en papel las 5 pantallas del modo simple y probarlas con un piloto
- [ ] Abrir la cuenta de desarrollador de Google Play y armar la prueba cerrada con 12 testers

## Fuentes

- [Plan de MATIAS API para casas de software](https://matias-api.com/propuesta-comercial/)
- [Instructivo de registro y habilitación de la DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/instructivo-de-registro-y-habilitacion-en-factura-electronica-dian/)
- [Proveedores tecnológicos autorizados de la DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/proveedores-tecnologicos/)
- [Precios de Siigo](https://www.siigo.com/promociones)
- [Alegra frente a Siigo, precios 2026](https://blog.alegra.com/colombia/alegra-vs-siigo-colombia/)
- [Resolución DIAN 165 de 2023 (anexo técnico 1.9)](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0165_2023.htm)
- [Requisitos para ser facturador electrónico, DIAN](https://www.dian.gov.co/impuestos/factura-electronica/como-hacerlo/Paginas/ser-facturador-electronico.aspx)
