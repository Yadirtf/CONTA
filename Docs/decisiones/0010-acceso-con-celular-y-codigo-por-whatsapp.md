# ADR-0010. Acceso con celular y código: WhatsApp primero detrás de un puerto, SMS de respaldo y celulares de prueba

- Estado: Propuesto
- Fecha: 2026-11-23
- Historia: HU-04.01 **[VS]**
- Decide: Inge

## Contexto

HU-04.01: «Como dueño, quiero entrar con mi celular y un código, para no recordar contraseñas».

- **Criterios:** el código llega en menos de 1 minuto y vence en 10; tras 5 intentos fallidos, la cuenta se bloquea 15 minutos.
- **Usuarios:** tenderos, barberías e independientes, con Android de gama baja. Casi todos usan WhatsApp a diario y pocos usan correo.
- **Restricciones duras:** el dominio no importa SDKs; ningún secreto en código, registros ni commits (el código OTP es un secreto); Ley 1581; toda regla vive en `api/`.
- **Costo:** Inge prefiere capas gratuitas. Render gratis se duerme a los 15 minutos.
- **Solución obvia conocida:** OTP de 6 dígitos por SMS con Twilio.

## Alternativas consideradas (Verbalized Sampling)

Las calificó un agente evaluador que no generó las alternativas. Los criterios fueron:

| Criterio | Peso |
| --- | --- |
| Seguridad | 25 % |
| Fricción para el tendero | 25 % |
| Costo por cliente | 20 % |
| Cambiar de proveedor y probar sin red | 15 % |
| Simplicidad | 15 % |

El evaluador **no pudo verificar los precios**, así que calificó el costo por orden relativo: WhatsApp autenticación < SMS. Antes de activar el canal hay que confirmar la tarifa vigente de Meta para Colombia.

| # | Alternativa | Prob. | Ronda | Puntaje | Resultado |
| - | ----------- | ----- | ----- | ------- | --------- |
| 1 | OTP por SMS | 0,35 | Completa | 3,35 | Respaldo dentro de la 6 |
| 2 | OTP por WhatsApp (plantilla de autenticación) | 0,25 | Completa | 3,95 | Contenida en la 6 |
| 3 | Firebase Phone Auth | 0,20 | Completa | — | Descartada: el bloqueo y el vencimiento quedan fuera de `api/` y acopla la app a un SDK |
| 4 | Enlace mágico por correo | 0,10 | Completa | — | Descartada: no es «celular y código», y el tendero casi no usa correo |
| 5 | Contraseña + TOTP | 0,10 | Completa | — | Descartada: contradice la historia |
| 6 | **Puerto de canal: WhatsApp primero, SMS de respaldo y celulares de prueba** | 0,08 | Cola | **4,10** | **Elegida** |
| 7 | Llamada perdida (flash call) | 0,04 | Cola | — | Descartada: Google Play restringe el permiso del registro de llamadas |
| 8 | Verificación inversa por WhatsApp (el usuario envía el código) | 0,05 | Cola | 3,35 | Rechazada: con Render dormido no cumple «menos de 1 minuto» y el usuario sale de la app |
| 9 | OTP solo para registrar el dispositivo y luego una llave del dispositivo | 0,06 | Cola | 3,90 | Para después: reduce mensajes y resiste un SIM swap posterior |
| 10 | Activación asistida por Inge | 0,03 | Cola | — | Descartada: no escala y deja fuera al cajero |

## Decisión

Se eligió la alternativa **6, de la cola**. Su núcleo, la 2, es casi la típica.

- **Dominio:** el agregado `AccesoPorCelular` lleva una fila por celular y decide todo:
  - el código vence a los 10 minutos y sirve una sola vez;
  - 5 fallos seguidos bloquean el celular 15 minutos, y pedir un código nuevo no borra los fallos;
  - hay 1 minuto de espera entre códigos y un máximo de 5 por hora.

  El agregado no sabe de criptografía: recibe una función que compara el código.
- **Puerto `EnviadorDeCodigos`:** el adaptador de hoy es `EnviadorWhatsAppCloud`, con la plantilla de autenticación de Meta (código, botón «Copiar código» y aviso de no compartirlo). El SMS entra después detrás del mismo puerto, cuando haya contrato con un proveedor. Sin credenciales, `EnviadorSinCanal` falla cerrado y la API responde 503.
- **Secretos:**
  - El código se guarda como HMAC-SHA256 con `SECRETO_CODIGOS_ACCESO` y el celular, y se compara en tiempo constante.
  - El token de sesión son 32 bytes al azar, y en la base se guarda solo su SHA-256.
  - La base rechaza con un CHECK cualquier valor que no sea una huella.
- **Sesión:** dura 30 días y se cierra revocándola. Nunca se borra.
- **Identidad sin empresa:** el esquema `conta_identidad` no lleva `empresa_id` ni RLS, porque una persona existe antes de pertenecer a una empresa y puede pertenecer a varias (HU-04.02). Lo protegen los permisos:
  - `conta_api` no puede hacer DELETE ni TRUNCATE;
  - no puede cambiar el celular de un usuario ni el token de una sesión;
  - una prueba de integración lo vigila.

  Las tablas de negocio siguen invisibles en estas transacciones, porque no se fija ninguna empresa.

### Controles contra el atacante (ronda de cola A1 a A7, más lo que pidió el evaluador)

| Ataque | Control |
| --- | --- |
| Bombeo de mensajes | Hay 1 minuto de espera y 5 códigos por hora por celular, y solo se aceptan móviles colombianos. Además, cada IP tiene 20 peticiones cada 10 minutos y CONTA un tope global por hora (`ACCESO_ENVIOS_POR_HORA`, por defecto 200), que avisa en el registro. |
| Fuerza bruta del código | El bloqueo es por celular, no por IP. La fila se toma con `SELECT … FOR UPDATE`, así que dos intentos no se cruzan. El código se consume al acertar y la comparación toma tiempo constante. |
| Bloqueo malicioso de una cuenta | Se acepta como riesgo documentado: el bloqueo no cierra las sesiones abiertas. |
| Fuga de la base | En la base solo hay huellas, nunca códigos ni tokens en claro. |
| Enumeración de usuarios | Pedir un código responde igual para un número nuevo y uno registrado. El usuario se crea solo al verificar. |
| Código en los registros | No se registra ningún cuerpo de petición. El error del proveedor lleva solo el estado HTTP, y el tope avisa sin el celular. |
| Celulares de prueba como puerta trasera | `CELULARES_DE_PRUEBA` solo se acepta con `CONTA_ENTORNO=pruebas`. Si aparece en otro entorno, la API no arranca. |
| Ingeniería social («pásame el código») | La plantilla de Meta incluye el aviso de no compartirlo. |

## Consecuencias

- **Para activar el canal real**, Inge debe hacer tres cosas: crear la app de Meta con WhatsApp Cloud API y un número; aprobar la plantilla de autenticación `codigo_de_acceso` en español; y poner `WHATSAPP_TOKEN` y `WHATSAPP_ID_NUMERO` en Render. Mientras tanto, el entorno de pruebas funciona con celulares de prueba. Los pasos están en [entorno de pruebas](../despliegue/entorno-de-pruebas.md).
- **Pendiente para HU-04.04 o después:**
  - avisar por el canal anterior cuando entra un dispositivo nuevo;
  - impedir que el OTP solo permita cambiar de número;
  - la llave del dispositivo (alternativa 9).
- **Límites en memoria:** el límite por IP y el tope global funcionan con una sola instancia. Con varias, pasan a la base.
- **El resolutor de empresa sigue sin cambios:** responde 401 hasta HU-04.02, que lo arma con la sesión y la membresía.
