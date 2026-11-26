# Pruebas de ataque por historia

Cada historia que toca la API pasa por una **prueba de ataque** antes de abrir su PR. Un agente distinto del
que programó, con el rol de atacante, intenta romper lo nuevo y lo que ya existía. Lo que encuentra se
corrige en el mismo PR, con una prueba que demuestre que el hueco quedó cerrado.

Es la ronda de contrapunto de la [guía del coordinador](../forma-de-trabajo/guia-del-coordinador.md) (sección 3,
paso 2, y sección 4 «Seguridad»), llevada a la práctica: no solo imaginar ataques, sino ejecutarlos.

## 1. Reglas

- **Solo contra el entorno local.** La API y PostgreSQL corren en la misma máquina del agente, con claves
  desechables. Nunca se ataca Render, Neon, Cloudflare ni servicios de terceros (WhatsApp, DIAN, Wompi).
- El atacante **no corrige**: reporta. Quien implementa la historia corrige y agrega la prueba.
- Nada de denegación de servicio: los límites se prueban con el tope y un par de peticiones más.
- El informe no lleva secretos ni datos reales.

## 2. Cómo se corre

1. Levantar el entorno local:
   ```bash
   herramientas/ataque/levantar-entorno-local.sh
   ```
   Deja la API en `http://localhost:3999` con `CONTA_ENTORNO=pruebas`, celulares de prueba con código fijo
   y una base PostgreSQL en el puerto 5433 donde la API usa `conta_api` (sin `BYPASSRLS`).
2. Lanzar el agente [`atacante-de-seguridad`](../../.claude/agents/atacante-de-seguridad.md) con la historia,
   los endpoints nuevos y la ruta del informe. En Claude Code es un subagente del repositorio: se invoca por
   su nombre.
3. Corregir cada hallazgo con una prueba (unitaria, de aislamiento o e2e) que falle antes y pase después.
4. Resumir en el PR: ataques ejecutados, hallazgos y cómo se cerraron.
5. Apagar el entorno: `herramientas/ataque/levantar-entorno-local.sh --detener`.

## 3. Qué revisa siempre

Autorización por rol y modo, aislamiento entre empresas (`X-Empresa`, ids ajenos, RLS), segundo factor,
inyección (SQL, JSON con tipos inesperados, caracteres de control), abuso de límites, idempotencia y carreras,
fugas de datos personales (URLs, errores, caché, registros) y reglas fiscales. La tabla completa está en la
definición del agente.

## 4. Registro

| Historia | PR | Ataques | Hallazgos | Estado |
| --- | --- | --- | --- | --- |
| HU-05.01 Buscar cliente por cédula o NIT | por abrir | ver PR | ver PR | — |
