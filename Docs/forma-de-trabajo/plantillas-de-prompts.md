# Plantillas de prompts con Verbalized Sampling

Plantillas listas para copiar. Reemplaza lo que está entre `<...>`. Se basan en el formato del paper (Zhang et al., 2025, figura 2), adaptado a decisiones de producto. El proceso completo está en la [guía del coordinador](guia-del-coordinador.md).

Reglas comunes:
- **k = 5** por llamada. Si se necesitan más, se hace otra llamada pidiendo alternativas distintas de las ya dadas.
- Pide que las alternativas **difieran en el enfoque**, no solo en detalles.
- La palabra «probabilidad» funciona mejor que «confianza» en una sola llamada.
- Las probabilidades no están calibradas: úsalas para distinguir lo típico de lo poco común.

## 1. Plantilla base (ronda de distribución completa)

```
Contexto: <historia HU-xx.yy y enlace>, <restricciones duras>, <arquitectura: Docs/arquitectura/arquitectura-limpia.md>.
Problema: <problema en palabras del usuario>.
Solución obvia conocida: <la primera que se le ocurriría a cualquiera>.

Genera 5 alternativas para resolver el problema, cada una dentro de una etiqueta <alternativa>.
Cada alternativa incluye:
  <texto>: el enfoque en 3 a 6 frases,
  <ventajas> y <desventajas>,
  <probabilidad>: qué tan probable es que esta sea la respuesta que darías normalmente (de 0 a 1).
Muestrea al azar de la distribución completa de respuestas posibles.
Las alternativas deben diferir en el enfoque, no solo en detalles.
```

## 2. Ronda de cola

```
<mismo contexto y problema>
Ya se consideraron estas alternativas: <lista resumida de la ronda 1>.

Genera 5 alternativas nuevas, distintas de las anteriores, cada una dentro de una etiqueta <alternativa>
con <texto>, <ventajas>, <desventajas> y <probabilidad>.
Muestrea de las colas de la distribución: cada alternativa debe tener probabilidad menor a 0,10.
Deben ser viables dentro de las restricciones duras; descarta las que no lo sean.
```

Para más diversidad, baja el umbral (0,05). Para menos, súbelo (0,20).

## 3. Variante con razonamiento (VS-CoT) para decisiones de nivel 3

```
<contexto y problema>
Primero, razona paso a paso sobre qué hace difícil este problema en CONTA
(norma DIAN, multiempresa, sin internet, una sola persona manteniendo, costo por cliente).
Después genera 5 alternativas con <texto>, <ventajas>, <desventajas> y <probabilidad>,
muestreadas de la distribución completa.
```

## 4. Variante multi-turno (VS-Multi) cuando se necesitan muchas opciones

```
Turno 1: <plantilla base>
Turno 2: Genera 5 alternativas más, distintas de todas las anteriores, con su probabilidad.
Turno 3: Genera 5 alternativas más, distintas de todas las anteriores, con su probabilidad.
```

## 5. Plantillas por dimensión

### Arquitectura y diseño técnico
```
Problema: <p. ej. cómo reservar consecutivos de factura para vender sin internet>.
Restricciones duras: consecutivos sin huecos ni duplicados ante la DIAN; idempotencia; dominio sin frameworks.
Solución obvia conocida: <p. ej. pedir el consecutivo al backend en cada venta>.
Genera 5 diseños, cada uno con <texto>, <capas y módulos que toca>, <ventajas>, <desventajas>,
<cómo se prueba> y <probabilidad>, muestreados de la distribución completa.
```

### Experiencia de usuario
```
Usuario: <dueño de tienda de barrio, 50 años, celular de gama baja, poca paciencia con apps>.
Tarea: <emitir una factura a consumidor final>.
Meta: <3 toques, sin explicación>.
Solución obvia conocida: <formulario con cliente, productos y botón emitir>.
Genera 5 flujos distintos, cada uno con <pasos pantalla por pantalla>, <toques totales>,
<qué pasa si se equivoca>, <qué pasa sin internet> y <probabilidad>.
Muestrea de las colas: cada flujo con probabilidad menor a 0,10.
```

### Seguridad (rol de contrapunto: atacante)
```
Activo a proteger: <p. ej. certificado de firma de cada cliente>.
Controles actuales: <KMS, 2FA, auditoría>.
Actúa como un atacante con <acceso de cajero / acceso a un backup / empleado de soporte malicioso>.
Genera 5 formas de comprometer el activo, cada una con <pasos>, <impacto>, <control que la detiene o "ninguno">
y <probabilidad>. Muestrea de las colas: cada ataque con probabilidad menor a 0,10.
```

### Escalabilidad
```
Escenario: <500 clientes, picos el último día del mes, DIAN respondiendo lento>.
Componente: <cola de envío a la DIAN>.
Genera 5 estrategias con <texto>, <qué pasa con 10 veces la carga>, <costo mensual estimado>,
<complejidad añadida hoy> y <probabilidad>, muestreadas de la distribución completa.
```

### Calidad de código
```
Código: <enlace o fragmento>.
Genera 5 formas distintas de estructurarlo, cada una con <texto>, <cómo expresa el dominio>,
<cómo se prueba>, <acoplamiento> y <probabilidad>. Incluye al menos una que no use clases.
```

## 6. Prompt del evaluador

```
Rol: evaluador. No generaste estas alternativas.
Criterios y pesos: <tabla de la dimensión en la guía, sección 4>.
Restricciones duras: <lista>.
Alternativas: <lista de las rondas con su probabilidad>.

1. Elimina duplicados y descarta las que violan una restricción dura, con el motivo.
2. Califica cada alternativa de 1 a 5 por criterio y calcula el puntaje ponderado.
3. No uses la probabilidad como criterio.
4. Propón si las dos mejores se pueden combinar y cómo.
5. Recomienda una, di si es la típica o una de la cola, y qué alternativa de la cola descartas y por qué.
Entrega la tabla de la nota de decisión de la guía (sección 8).
```

## 7. Prompt del revisor

```
Rol: revisor del PR <enlace> para la historia <HU-xx.yy>.
1. Aplica la lista de revisión de la guía (sección 9) y la Definición de Hecho (sección 7).
2. Genera 5 formas en que este cambio podría fallar en producción, cada una con probabilidad menor a 0,10,
   y di si el código o las pruebas las cubren.
3. Clasifica cada comentario como bloqueante, importante o sugerencia.
```
