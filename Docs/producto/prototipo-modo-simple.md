# Prototipo en papel del modo simple (HU-03.01)

- Fecha: 2026-11-23.
- Historia: HU-03.01 **[VS]**. Lo usa HU-06.01 (factura en 3 toques).
- Prototipo: [lienzo con las 12 pantallas](https://claude.ai/artifact/2sptHUrqnC29sReS1nZDhD). Es privado mientras Inge no lo comparta.
- Estado: **listo para probar con el piloto**. El resultado de la prueba se anota en la sección 7, y con eso se cierra la historia.

## 1. Para quién y para qué

**Usuario.** El dueño o el cajero de una tienda de barrio, de unos 50 años. Usa un Android de gama baja (pantalla de 5,5" y 2 GB de RAM), con una mano, entre cliente y cliente. Tiene poca paciencia con las apps y el internet se le cae a ratos.

**Tarea principal.** Registrar una venta ante la DIAN tan rápido como cobrar en efectivo. La meta de HU-06.01 es **producto → cobrar → confirmar**.

**Reglas del producto que el diseño no puede romper:**

| Regla | Qué significa en pantalla |
| --- | --- |
| Palabras de la calle | Se dice «vender», «cobrar», «entró», «me deben», «devolver» y «comprobante». Nunca «CUFE», «POS», «IVA», «nota crédito» ni «documento soporte». |
| Un documento enviado no se edita ni se borra | No existe «editar venta». El error se corrige con **Devolver**, que por dentro es una nota crédito. |
| Envío en cola y sin internet | La venta siempre se guarda primero en el celular. Al dueño se le dice «se envía sola cuando vuelva la señal», nunca «error». |
| El precio ya trae el impuesto | El dueño ve un solo precio y un total. El impuesto lo separa la API (HU-05.02). |
| La API decide el tipo de documento | El dueño no elige entre factura electrónica y documento POS. Ve «venta» y «comprobante», y la regla fiscal vive en `api/`. |
| Accesibilidad | Toques de 48 dp o más. Texto de 15 px o más, salvo etiquetas de 13 px con contraste 4,5:1. Botones e inputs reales, para que funcione el lector de pantalla. |

## 2. Las 5 pantallas

| # | Pantalla | Qué resuelve |
| --- | --- | --- |
| 1 | **Hoy** | Cuánto vendió y por qué medio, cuánto le deben, cuántas ventas esperan señal, el botón **Vender** y «Repetir lo de siempre». |
| 2 | **Vender** | Elegir qué se vende: productos frecuentes grandes, un buscador y la tarjeta «Otro valor». |
| 3 | **Cobrar** | Cómo pagó (efectivo, Nequi o Daviplata, tarjeta, fiado), las vueltas, y a nombre de quién: sin nombre por omisión, o con cédula. |
| 4 | **Listo** | El estado en tres pasos (guardada, enviando a la DIAN, aprobada), WhatsApp y «Nueva venta». |
| 5 | **Mis ventas** | La lista con su estado, «Devolver», y las ventas que la DIAN rechazó, explicadas en palabras simples. |

Además hay una pantalla común a los tres flujos: **¿A nombre de quién?**, la factura con cédula o NIT. Si el comprador ya compró antes, sus datos aparecen solos.

## 3. Alternativas de flujo (Verbalized Sampling)

Se generaron dos rondas de 5 flujos cada una: la ronda completa y la ronda de cola, con probabilidad menor a 0,10. Las evaluó un agente que no las había generado, con los pesos de UX de la [guía del coordinador](../forma-de-trabajo/guia-del-coordinador.md):
- toques: 25 %;
- se entiende sin explicación: 25 %;
- gama baja, una mano y sin internet: 20 %;
- errores: 20 %;
- accesibilidad: 10 %.

| # | Alternativa | Prob. | Ronda | Puntaje | Resultado |
| - | ----------- | ----- | ----- | ------- | --------- |
| 1 | Carrito con cuadrícula y barra «Cobrar» | 0,35 | Completa | 4,25 | **Flujo A** (es el típico y el favorito) |
| 2 | Caja registradora (teclado de valor) | 0,25 | Completa | 2,85 | Queda solo como la tarjeta «Otro valor» |
| 3 | Formulario único (la solución obvia) | 0,15 | Completa | 2,50 | Descartada |
| 4 | Venta directa con hoja de pago | 0,15 | Completa | 3,85 | **Flujo B**, junto con la 10 |
| 5 | Asistente de preguntas | 0,10 | Completa | 3,65 | **Flujo C**, como contraste guiado, junto con la 10 |
| 6 | Venta por voz | 0,08 | Cola | 2,65 | Descartada: sin internet y en gama baja no es fiable |
| 7 | Deslizar para cobrar | 0,07 | Cola | 3,80 | Variante del último paso de A. El lector de pantalla la maneja mal |
| 8 | Cuentas abiertas (mesas o pedidos) | 0,06 | Cola | 2,75 | Fuera de alcance; idea para el backlog |
| 9 | «Lo de siempre» | 0,05 | Cola | 4,00 | Complemento: atajo en Hoy |
| 10 | Confirmar con deshacer (8 s) | 0,04 | Cola | 4,15 | Mecanismo de B y C |

**Por qué se descartaron 2, 3 y 6:**
- **La 2 (caja registradora)** obliga a elegir «19 %», que es un término contable. Además, un cero de más pasa sin que nadie lo note.
- **La 3 (formulario único)** tiene muchos campos y el teclado tapa media pantalla de 5,5".
- **La 6 (venta por voz)** no sirve como flujo principal, porque tiene que funcionar sin señal.

## 4. Los tres flujos a probar

Los toques se cuentan desde Vender, como en HU-06.01. Si se arranca desde Hoy, se suma 1.

| Caso | A · Carrito | B · Hoja directa | C · Asistente |
| --- | --- | --- | --- |
| (a) 1 gaseosa, efectivo, sin nombre | **3**: producto, Cobrar, Confirmar | **2**: producto, Efectivo | 5 |
| (b) 3 productos, uno ×2, pagado por Nequi | 7 | 7 | 11 |
| (c) El comprador pide factura con cédula | 5, más escribir los datos | 4, más los datos | 6, más los datos |
| Error típico | Un toque de más suma una unidad. Se quita con el «−», que está a la vista | Un toque equivocado vende. Para eso está el deshacer de 8 s | Cansa en ventas largas |
| Confirmación | Botón «Confirmar venta · $total» | La venta se guarda sola, con 8 s para deshacer | Igual que B |

- **A · Carrito** (pantallas `A-Vender` y `A-Cobrar`): es el flujo típico y el que se espera que gane. Cada toque suma 1 y la barra fija muestra el total y «Cobrar». En Cobrar está marcado Efectivo, y debajo van las vueltas y «Pide factura con cédula».
- **B · Hoja directa** (`B-Vender`, `B-Hoja` y `B-Deshacer`): al tocar un producto sube una hoja con la cantidad, «Agregar otro» y los medios de pago como botones grandes. Tocar el medio de pago termina la venta.
- **C · Asistente** (`C-Que`, `C-Cuantos` y `C-Pago`): una pregunta por pantalla con respuestas grandes. Pregunta «¿Qué vendiste?», luego «¿Cuántos?» y «¿Algo más?», y al final «¿Cómo te pagó?».

### La regla de no editar y el deshacer

El deshacer de B y C es compatible con la regla de no editar documentos **solo si**, mientras corren los 8 segundos, todavía **no existe documento**: no tiene consecutivo, no está firmado y no entró a la cola. El documento se crea cuando vence la ventana. Si la app se cierra durante esos 8 segundos, la venta se pierde y el dueño la ve como «no guardada». Eso se confirma en HU-06.01 y HU-06.05.

### Decisiones de diseño comunes

- **Estado en tres pasos** en Listo: guardada, enviando a la DIAN, aprobada. Sin señal nunca dice «aprobada».
- **Fiado** pide siempre «¿quién te debe?», porque una venta a crédito necesita un comprador identificado (EP-12).
- **Una venta rechazada** aparece en rojo en Mis ventas, con el motivo de la DIAN en palabras simples y la salida «Corregir y hacerla de nuevo». El documento rechazado no se toca: se emite uno nuevo. HU-06.01 define si se reutiliza el número.
- **Otro valor** sirve mientras el negocio no ha cargado su catálogo.
- **Vueltas** opcionales con billetes de $10.000, $20.000 y $50.000, para validar con el piloto si de verdad las usa.

## 5. Preguntas abiertas para la API y la DIAN

1. Con consumidor final, ¿el comprobante es un documento POS electrónico, y pasa a factura electrónica cuando el comprador da su cédula? Se confirma en HU-06.01 y HU-06.02. El diseño ya lo resuelve sin que el dueño elija.
2. Si la DIAN rechaza una factura, ¿se puede emitir otra con el mismo número? Se define en HU-06.01 y HU-06.07.
3. ¿Qué datos mínimos exige la DIAN al comprador con cédula? Se define en HU-05.01. El prototipo pide solo el nombre y el número, y el correo es opcional.

## 6. Guion de la prueba con el piloto

**Materiales:**
- Las pantallas impresas a tamaño real, unos 7 × 12 cm. Se exportan del lienzo en PDF.
- O, en su lugar, el lienzo abierto en un celular, en modo Play.
- Lápiz, cronómetro y esta hoja.

**Cómo se hace:**
1. Una persona hace de «computadora»: cambia la hoja cuando el piloto toca algo. El piloto sostiene las pantallas con una mano.
2. Se presentan los tres flujos **en orden rotado**. Con el piloto 1 van A, B y C; con el 2, B, C y A; y así sucesivamente.
3. Se le pide que piense en voz alta. No se le ayuda; si se traba, se anota y se pasa a la siguiente tarea.

**Tareas, en cada flujo:**
1. Vende una gaseosa a alguien que paga en efectivo.
2. Vende 2 panes, una leche y un queso, pagados por Nequi.
3. El cliente pide factura con la cédula 1.023.456.789, a nombre de Ana Ruiz.
4. Cobraste 3 panes y eran 2. Corrígelo justo después, y también una hora más tarde desde Mis ventas.
5. Doña Rosa lleva fiado un arroz y no hay señal. Véndele y dime en qué estado quedó la venta.

**Qué se mide en cada tarea:**
- Tiempo hasta Listo.
- Toques reales contra toques ideales.
- Errores y veces que pidió ayuda.
- Palabras que usa solo.
- Si entendió el estado de la venta (sí o no).
- Facilidad, de 1 a 7.

**Preguntas al final:**
- «Si se equivoca después de un minuto, ¿qué cree que puede hacer?»
- «¿Qué le entrega hoy al cliente? ¿Qué le piden más: tiquete o factura?»
- «Cuando fía, ¿le daría el comprobante ya o cuando le pague?»
- «¿Esta venta ya llegó a la DIAN?» Se pregunta en la tarea 5.
- «¿Calcula las vueltas a mano?»
- «Ordene los tres flujos del que más le gustó al que menos.»

Un solo piloto da poca evidencia. Si se puede, conviene sumar 2 a 4 tenderos más. HU-03.02 trae la guía de entrevista y el registro de pilotos.

## 7. Resultado de la prueba (lo llena Inge)

| Piloto | Fecha | Negocio | Orden de flujos | Preferido | Tarea con más problemas | Lo que dijo |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | |

**Alternativa elegida:** _(pendiente de la prueba)_. Con ella se actualiza HU-06.01 y se marca HU-03.01 como «Hecha».
