# Guía de entrevista a dueños de negocio (HU-03.02)

- Historia: HU-03.02. Acompaña a la prueba del prototipo de HU-03.01.
- Para quién: Inge, o quien entreviste, en una visita de unos 45 minutos.
- Dónde se anota: [registro de pilotos](registro-de-pilotos.md).

## 1. Para qué sirve

La fase 0 solo se cierra con **5 pilotos que se comprometan a pagar** (plan del proyecto, objetivo 1). Antes de programar la fase 1 hay que saber con datos:

| # | Hipótesis | Se confirma si… | Se cae si… |
| - | --------- | --------------- | ---------- |
| H1 | Facturar electrónicamente le duele hoy al micronegocio | Cuenta un problema concreto y reciente: una sanción, el tiempo, el software de la DIAN, un cliente que le pidió factura | «Eso no me aplica» o «no me ha pasado nada» |
| H2 | Vende y cobra desde el celular | Muestra cómo cobra hoy: Nequi, datáfono, cuaderno | Todo pasa por un computador o por el contador |
| H3 | Lo que existe es caro o difícil | Nombra lo que usa o probó, cuánto paga y qué dejó | Está contento con lo que tiene y lo paga sin quejarse |
| H4 | Valora tener a alguien que le conteste el WhatsApp | Recuerda una vez que se quedó trabado sin ayuda | Nunca ha pedido ayuda |
| H5 | Pagaría $180.000 de activación más $18.000 al mes | Acepta un compromiso: precio de fundador, apartado o pago | «Suena bien, avíseme» (eso no es compromiso) |
| H6 | El contador influye en la decisión | «Eso lo decide mi contador» o «se lo paso a él» | Decide solo y el contador no opina |

## 2. Reglas para entrevistar sin sesgo

Las respuestas educadas engañan. Estas reglas siguen la idea de *The Mom Test* (Rob Fitzpatrick): preguntar por lo que la persona **hizo**, no por lo que **haría**.

1. **Pregunta por el pasado concreto.** Sirve «¿Cómo hizo la última factura?». No sirve «¿Usaría una app para facturar?».
2. **No muestres la idea hasta el final.** Si se la presentas al principio, la persona te va a dar la razón.
3. **No preguntes si le gusta.** El «me encanta» no vale nada. Vale lo que hizo, lo que paga y lo que se compromete a hacer.
4. **Pide números.** Cuánto paga, cuántas ventas hace al día, cuánto tiempo le toma.
5. **Escucha más de lo que hablas.** Deja el silencio, porque después del silencio viene lo importante.
6. **Anota sus palabras exactas.** «Me deben», «el cuaderno», «la DIAN me tiene loco». Esas palabras son el texto de la app (ver el [sistema de diseño](sistema-de-diseno.md)).
7. **Un compromiso es dar algo:** tiempo (otra cita), reputación (presentar a un colega) o dinero (apartar el precio de fundador). Sin eso, no hay piloto.

**Frases que no se dicen:** «¿no le parece que…?», «sería muy fácil», «¿cuánto pagaría por…?», «¿le gustaría que…?».

## 3. A quién entrevistar

**Diez dueños de negocio distintos.** No sirven diez tiendas iguales:

| Cupo | Perfil | Por qué |
| ---- | ------ | ------- |
| 4 | Tienda de barrio, minimercado o panadería | Es el usuario principal del modo simple |
| 2 | Barbería, salón de belleza o taller | Venden servicios: no tienen catálogo de productos |
| 2 | Independiente o profesional que factura servicios | Pocas facturas y de valor alto, con cédula del comprador |
| 2 | Negocio que ya factura electrónicamente (con la DIAN gratis, Siigo, Alegra u otro) | Saben qué duele de verdad y cuánto pagan |

**Aparte, dos contadores**, con la sección 6. Pueden traer clientes y definen el modo contador.

Se evita entrevistar solo a familiares y amigos: es el mayor sesgo posible. Si no queda otra, se anota en el registro.

## 4. Antes de la visita

- [ ] **Autorización de datos (Ley 1581 de 2012).** Lee en voz alta el texto de la sección 7 y anota que la persona aceptó. Si no acepta, la entrevista se hace igual, pero sin guardar nombre ni teléfono.
- [ ] **Grabar solo con permiso**, y nunca se sube una grabación al repositorio.
- [ ] Lleva el prototipo impreso, o abierto en el celular ([prototipo del modo simple](prototipo-modo-simple.md)).
- [ ] Lleva una hoja impresa del registro, o tenlo abierto.
- [ ] Asigna el código de la entrevista (P01, P02…). El nombre y el teléfono van **fuera del repositorio**, en tu libreta o en tu celular, junto a ese código.

## 5. El guion (45 minutos)

### 5.1 Arranque (3 min)

> «Estoy estudiando cómo los negocios como el suyo manejan las ventas y la factura electrónica. No le vengo a vender nada todavía; quiero entender cómo lo hace usted. No hay respuestas buenas ni malas.»

### 5.2 Su negocio hoy (7 min) · H2

1. ¿Qué vende y desde hace cuánto?
2. Un día normal, ¿cuántas ventas hace, más o menos?
3. ¿Cómo le pagan? ¿Qué parte es en efectivo, Nequi o Daviplata, tarjeta o fiado?
4. ¿Dónde anota las ventas hoy? ¿Me muestra?
5. ¿Quién más vende o cobra en el negocio?

### 5.3 La factura electrónica (10 min) · H1, H3

6. ¿Ya está obligado a facturar electrónicamente? ¿Cómo se enteró?
7. Cuénteme la última vez que un cliente le pidió factura. ¿Qué hizo?
8. *(Si ya factura)* ¿Con qué factura? ¿Cuánto paga? ¿Qué es lo que más le molesta?
9. *(Si ya factura)* ¿Cuánto tiempo le toma hacer una factura? ¿Desde dónde la hace?
10. *(Si no factura)* ¿Qué ha averiguado? ¿Qué lo ha frenado?
11. ¿Ha tenido un problema con la DIAN, o conoce a alguien que lo tuvo?

### 5.4 Ayuda y decisión (5 min) · H4, H6

12. La última vez que se trabó con algo de esto, ¿a quién llamó?
13. ¿Tiene contador? ¿Qué hace él por usted y cuánto le paga?
14. Si cambiara la forma de facturar, ¿quién más tendría que estar de acuerdo?

### 5.5 Prueba del prototipo (15 min)

Sigue el **guion de la sección 6** del [prototipo del modo simple](prototipo-modo-simple.md): las 5 tareas, los tres flujos en orden rotado y lo que se mide. Los resultados se anotan allí y aquí solo se pone «ver prototipo».

### 5.6 Cierre con compromiso (5 min) · H5

Solo aquí se cuenta la idea y el precio:

> «Estamos armando una app para vender y facturar ante la DIAN en 3 toques desde el celular, con alguien que le contesta el WhatsApp. La activación cuesta $180.000, e incluye el certificado de firma y que yo lo deje habilitado ante la DIAN, y después $18.000 al mes. Para los primeros 5 negocios hay un precio de fundador.»

15. ¿Qué le preocupa de esto?
16. **El compromiso**, de mayor a menor. Pide el más alto que la persona acepte:
    - **Dinero:** «¿Le aparto el precio de fundador con un anticipo?»
    - **Tiempo:** «¿Me deja volver en dos semanas a instalarla con usted?»
    - **Reputación:** «¿Conoce a otro negocio que tenga el mismo problema? ¿Me lo presenta?»
17. ¿Le puedo escribir por WhatsApp cuando esté lista?

**No negocies el precio en la entrevista.** Si la persona dice que es caro, anota cuánto le parecería justo y cuánto paga hoy.

## 6. Guía corta para contadores (30 min)

1. ¿Cuántos clientes micronegocio lleva? ¿Cómo le pasan la información hoy?
2. ¿Qué es lo que más tiempo le quita con esos clientes?
3. ¿Qué software usa? ¿Cuánto paga, y lo paga usted o el cliente?
4. Cuénteme el último error de un cliente que tuvo que corregir: una factura mal hecha, un gasto sin soporte.
5. ¿Qué necesita ver de cada cliente cada mes?
6. Cierre: el plan Contador cuesta $45.000 por empresa, desde 5 empresas. ¿Me presentaría a 2 clientes para el piloto?

## 7. Texto de autorización de datos (para leer en voz alta)

> «Voy a anotar sus respuestas para mejorar el producto. Su nombre y su teléfono los guardo solo yo, para volverle a escribir, y no los comparto con nadie. En los documentos de trabajo usted aparece con un código, no con su nombre. Puede pedirme en cualquier momento que borre sus datos. ¿Está de acuerdo?»

Este texto es provisional. La política de datos definitiva llega con HU-18.02, y un abogado o un contador debe revisarla antes del lanzamiento.

## 8. Después de cada entrevista (10 min, el mismo día)

1. Pasa las respuestas al [registro de pilotos](registro-de-pilotos.md) con el código de la entrevista. Nunca escribas el nombre.
2. Marca cada hipótesis como **sí**, **no** o **no sé**, con la frase que lo prueba.
3. Anota el compromiso que diste o recibiste, y la fecha del siguiente paso.
4. Si apareció algo que no esperabas, anótalo como **sorpresa**: suele ser lo más valioso.
