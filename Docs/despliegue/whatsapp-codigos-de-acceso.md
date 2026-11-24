# Guía: enviar los códigos de acceso por WhatsApp

- **Para qué sirve:** que el código de 6 números de HU-04.01 llegue de verdad al WhatsApp del dueño. La decisión está en [ADR-0010](../decisiones/0010-acceso-con-celular-y-codigo-por-whatsapp.md).
- **Quién la sigue:** Inge, una sola vez. Toma unos 30 minutos más la espera de Meta (la verificación del negocio puede tardar días).
- **Qué ya está hecho en el código:** la API envía la plantilla con el código en el cuerpo y en el botón «Copiar código». Solo faltan la cuenta, la plantilla y dos variables en Render.
- **Regla de oro:** el token de Meta es un secreto. Va solo en Render; nunca en un chat, en el repositorio ni en una captura.

Revisado contra la documentación de Meta en noviembre de 2026. Meta cambia sus pantallas con frecuencia: si un nombre de menú no coincide, busca la opción equivalente.

## Resumen en 8 pasos

| # | Paso | Dónde | Tiempo |
| - | ---- | ----- | ------ |
| 1 | Tener un portafolio de negocio (Business Manager) | business.facebook.com | 5 min |
| 2 | Crear la app con el caso de uso de WhatsApp | developers.facebook.com | 5 min |
| 3 | Probar con el número de prueba de Meta | Panel de la app → WhatsApp | 5 min |
| 4 | Crear la plantilla de autenticación `codigo_de_acceso` | WhatsApp Manager | 5 min + revisión |
| 5 | Crear el token permanente (usuario del sistema) | Configuración del negocio | 5 min |
| 6 | Poner las variables en Render y probar | Render | 5 min |
| 7 | Agregar un método de pago | WhatsApp Manager | 5 min |
| 8 | Para clientes reales: verificar el negocio y registrar un número propio | Centro de seguridad y WhatsApp Manager | Días |

Con los pasos 1 a 6 ya se puede probar HU-04.01 en el entorno de pruebas, enviando a tu propio celular. El 7 y el 8 hacen falta antes del piloto con clientes.

## 1. Portafolio de negocio

1. Entra a [business.facebook.com](https://business.facebook.com) con tu cuenta personal de Facebook.
2. Si no tienes un portafolio, créalo con el nombre del negocio (por ejemplo «CONTA») y tu correo.
3. Activa la verificación en dos pasos en tu cuenta de Facebook. Es quien controla todo lo demás.

## 2. Crear la app

1. Entra a [developers.facebook.com](https://developers.facebook.com/) → **Mis apps** → **Crear app**.
2. En el caso de uso, elige **«Conectar con los clientes a través de WhatsApp»** (*Connect with customers through WhatsApp*).
3. Asóciala al portafolio del paso 1 y ponle un nombre, por ejemplo `CONTA acceso`.
4. Al terminar, Meta crea una **cuenta de WhatsApp Business** de prueba y un **número de prueba**.

## 3. Probar con el número de prueba

En el panel de la app (developers.facebook.com → **Mis apps** → tu app):

1. En el menú de la izquierda, entra a **Casos de uso**.
2. En «Conectarte con los clientes a través de WhatsApp», toca **Personalizar** (o **Editar**). Si Meta pide elegir o crear una cuenta de WhatsApp Business o un portafolio, acéptalo: ahí crea el número de prueba.
3. En el menú propio de WhatsApp, entra a **Configuración de la API** (también puede llamarse **Inicio rápido** o *API Setup*).

No hace falta **Publicar** la app: para probar, puede quedar «Sin publicar».

En esa pantalla:

1. En **«Para»** (*To*), agrega tu celular y confírmalo con el código que te llega. El número de prueba solo envía a los celulares que registres ahí, y Meta permite pocos destinatarios (alrededor de 5; confírmalo en la pantalla).
2. Pulsa **«Generar token de acceso»**. Ese token es temporal y vence en horas: sirve solo para esta prueba.
3. Envía el mensaje de ejemplo `hello_world` con el botón de la página. Si te llega, la cuenta funciona.
4. Anota el **identificador del número de teléfono** (*Phone number ID*). Es un número largo, distinto del celular, y es lo que va en `WHATSAPP_ID_NUMERO`.

## 4. Crear la plantilla de autenticación

En [WhatsApp Manager](https://business.facebook.com/wa/manage/message-templates/) → **Plantillas de mensajes** → **Crear plantilla**:

| Campo | Valor |
| --- | --- |
| Categoría | **Autenticación** |
| Nombre | `codigo_de_acceso` (exacto: es el que usa la API) |
| Idioma | **Español** (código `es`). Si eliges «Spanish (COL)», el código es `es_CO` y debes ponerlo en `WHATSAPP_IDIOMA` (paso 6) |
| Método de entrega del código | **Copiar código** |
| Texto del botón | `Copiar código` |
| Aviso de seguridad | **Activado** («Por tu seguridad, no compartas este código») |
| Vencimiento del código | **Activado, 10 minutos** (el mismo vencimiento de la API) |

Cómo son estas plantillas:
- **El texto lo pone Meta y no se edita.** En español dice algo como «*123456* es tu código de verificación». Tú solo eliges si incluye el aviso y el vencimiento.
- No admite enlaces, imágenes ni emojis.
- Al crearla queda **«En revisión»** y luego **«Activa – Aprobada»**. Las de autenticación suelen aprobarse rápido, pero Meta no publica un plazo.

Si Meta propone otra opción además de «Copiar código» (por ejemplo *autocompletar con un toque*), elige **Copiar código**. La opción de un toque exige cambios en la app Android que todavía no están.

## 5. Token permanente

El token temporal del paso 3 vence. Para Render se necesita uno permanente:

1. En [Configuración del negocio](https://business.facebook.com/settings/) → **Usuarios** → **Usuarios del sistema** → **Agregar**. Nombre: `conta-api`, rol **Administrador**.
2. Con el usuario creado, **Asignar activos**:
   - **Apps** → la app del paso 2, con control total;
   - **Cuentas de WhatsApp** → la cuenta de WhatsApp Business, con control total.
3. Pulsa **Generar token**:
   - elige la app;
   - caducidad: **Nunca**;
   - permisos: `business_management`, `whatsapp_business_messaging` y `whatsapp_business_management`.
4. **Copia el token una sola vez** y pégalo directo en Render (paso 6). Meta no lo vuelve a mostrar. Si se pierde o se filtra, se revoca y se genera otro desde la misma pantalla.

## 6. Variables en Render y prueba

En Render → `conta-api-develop` → **Environment**:

| Variable | Valor |
| --- | --- |
| `WHATSAPP_TOKEN` | El token permanente del paso 5 |
| `WHATSAPP_ID_NUMERO` | El *Phone number ID* del paso 3 (solo números) |
| `SECRETO_CODIGOS_ACCESO` | 32 caracteres o más al azar (`openssl rand -hex 32`), si aún no está |
| `WHATSAPP_PLANTILLA_CODIGO` | No hace falta si la plantilla se llama `codigo_de_acceso` |
| `WHATSAPP_IDIOMA` | No hace falta si el idioma es `es`. Si la plantilla quedó en «Spanish (COL)», pon `es_CO` |

Guarda los cambios; Render redespliega solo.

**Prueba (criterio de HU-04.01):**
1. Abre la app de pruebas: `https://conta-app-uka.pages.dev`.
2. Escribe **tu** celular (el que registraste en el paso 3) y toca **«Enviarme el código»**. Mira la hora.
3. El WhatsApp debe llegar **en menos de 1 minuto**, con el código, el botón «Copiar código», el aviso y «vence en 10 minutos».
4. Escribe el código: debes quedar adentro.
5. Prueba también un código equivocado 5 veces: el celular queda bloqueado 15 minutos.

Si funciona, avísame el tiempo que tardó: con eso se marca HU-04.01 como «Hecha» y se cierra la issue #35.

**Si algo falla:**

| Lo que ves | Qué revisar |
| --- | --- |
| La app dice «No pudimos enviar el código» | Faltan `WHATSAPP_TOKEN` o `WHATSAPP_ID_NUMERO`, el token venció, o el celular no está entre los destinatarios del número de prueba |
| No llega nada, sin error | La plantilla sigue «En revisión» (Meta no la entrega hasta que diga «Activa»), o el nombre o el idioma no coinciden: «Spanish (COL)» es `es_CO`, no `es` |
| Llega a un celular y a otro no | El número de prueba solo envía a los destinatarios registrados en «Para»; agrega el otro y confírmalo |
| Llega, pero tarda más de 1 minuto | La API estaba dormida (Render gratis tarda hasta 1 minuto en despertar). Repite la prueba con la API despierta y anota los dos tiempos |
| «Pediste muchos códigos» | Es el límite de 5 por hora por celular: espera o usa otro número |

En los registros de Render solo aparece el estado HTTP de Meta (por ejemplo «WhatsApp respondió 401»), nunca el código.

## 7. Método de pago

En WhatsApp Manager → **Configuración de la cuenta** → **Método de pago**, agrega una tarjeta. Sin método de pago, Meta solo deja enviar de forma limitada.

**Costo:** desde julio de 2025 Meta cobra por cada mensaje de plantilla entregado. Para Colombia, la tarifa de autenticación es de unos **USD 0,0008 por código** (unos 3 pesos), según dos tablas de precios de terceros actualizadas en octubre y noviembre de 2026 ([Manifest](https://blog.getmanifest.ai/whatsapp-business-api-pricing-2026/), [WhaTools](https://wha.tools/whatsapp-api-pricing)). Con 1.000 accesos al mes serían menos de USD 1. Antes de presupuestar, confírmalo en la [tabla oficial de Meta](https://developers.facebook.com/docs/whatsapp/pricing).

## 8. Para clientes reales

El número de prueba solo envía a los celulares registrados. Para el piloto:

1. **Verificar el negocio** en Configuración del negocio → **Centro de seguridad** → **Verificación del negocio**. Meta pide la razón social y documentos que la prueben: certificado de Cámara de Comercio o RUT, y un servicio público o un extracto a nombre del negocio. Puede tardar varios días.
2. **Agregar un número propio** en WhatsApp Manager → **Teléfonos** → **Agregar número**:
   - un número que **no** esté en la app de WhatsApp ni en WhatsApp Business (si lo está, primero se borra esa cuenta);
   - que reciba SMS o llamadas para el código de verificación;
   - nombre visible «CONTA», que Meta revisa.
3. Cambiar `WHATSAPP_ID_NUMERO` en Render por el *Phone number ID* del número nuevo. El token permanente sirve igual si el usuario del sistema tiene asignada la cuenta.
4. Mientras el negocio no esté verificado, Meta limita cuántas personas distintas reciben mensajes por día. Revisa el límite vigente en WhatsApp Manager → **Información de la cuenta** → **Límite de mensajes**.

## Fuentes

- [Meta: primeros pasos con WhatsApp Cloud API](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started)
- [Meta: plantillas de autenticación](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/authentication-templates/authentication-templates/)
- [Meta: plantillas con botón «Copiar código»](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/authentication-templates/copy-code-button-authentication-templates/)
- Tarifas: [Manifest](https://blog.getmanifest.ai/whatsapp-business-api-pricing-2026/) y [WhaTools](https://wha.tools/whatsapp-api-pricing)
