# ADR-0004. Flutter para la app del cliente (Android, iPhone y web)

- Estado: Aceptado
- Fecha: 2026-11-23
- Historia: HU-01.01
- Decide: Inge (sin empate: la recomendación queda aceptada según la guía, sección 3, paso 4)

## Contexto
La arquitectura (sección 10) pide confirmar con un ADR, antes de escribir `app/`, Flutter frente a React Native con Expo. El plan recomienda Flutter y el ADR-0002 ya asume Flutter web en Cloudflare Pages.

Restricciones duras:
- Vender sin internet con base local y cola de sincronización.
- Android de gama baja (2-3 GB de RAM) como prioridad.
- Sin pagos ni enlaces a Wompi en Android.
- La app nunca decide el estado DIAN.
- Cliente de API generado desde `contratos/openapi.yaml`.
- Una sola persona construye todo, y ya usa TypeScript en `api/` y `web/`.
- Versión web gratis en Cloudflare Pages.

Solución obvia conocida: Flutter con Riverpod y Drift.

## Alternativas consideradas (Verbalized Sampling)
Las generó el hilo de HU-01.01 y las evaluó otro agente. Las probabilidades son la estimación del modelo, no una medida.

| # | Alternativa | Prob. verbalizada | Ronda | Puntaje ponderado | Resultado |
| - | ----------- | ----------------- | ----- | ----------------- | --------- |
| 1 | **Flutter + Riverpod + Drift + cliente OpenAPI dart-dio** | 0,38 | completa | **4,10** | **Elegida** |
| 2 | React Native con Expo + expo-sqlite/WatermelonDB + react-native-web | 0,30 | completa | 3,85 | Finalista |
| 3 | PWA con IndexedDB | 0,14 | completa | — | Descartada (dura): Safari en iOS puede borrar los datos de una web no instalada, y con ellos las ventas sin sincronizar |
| 4 | Kotlin Multiplatform + Compose Multiplatform | 0,10 | completa | 2,85 | Descartada: web en beta y otro lenguaje |
| 5 | Capacitor/Ionic + SQLite nativo | 0,08 | completa | 3,85 | Finalista; la WebView rinde peor en gama baja |
| 6 | Android nativo primero y después PWA | 0,05 | cola | 2,95 | Descartada: dos bases de código |
| 7 | Flutter para móvil + web del cliente en Next.js | 0,05 | cola | 3,25 | Se conserva como salida de emergencia |
| 8 | Tauri v2 móvil | 0,03 | cola | 2,60 | Descartada: añade Rust y su soporte móvil es joven |
| 9 | Lynx / Valdi | 0,02 | cola | — | Descartada: inmadura |
| 10 | .NET MAUI | 0,02 | cola | — | Descartada (dura): no tiene versión web |

## Criterios y evaluación
C1 cambiar la tecnología después (25 %), C2 simplicidad para una persona (25 %), C3 probar sin red ni base (20 %), C4 costo operativo y rendimiento en gama baja (15 %), C5 tiempo para tenerla funcionando (15 %).

| Alternativa | C1 | C2 | C3 | C4 | C5 | Total |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Flutter | 3 | 4 | 5 | 5 | 4 | 4,10 |
| 2 Expo | 4 | 4 | 4 | 4 | 3 | 3,85 |
| 5 Capacitor | 4 | 4 | 4 | 3 | 4 | 3,85 |
| 7 Flutter + web en Next.js | 3 | 2 | 4 | 5 | 3 | 3,25 |

No hay empate (0,25 de diferencia). El resultado depende de cuánto pese aprender Dart. Si Inge prefiere no aprender otro lenguaje, Expo sube a 5 en C2, empata con Flutter y conviene revisar este ADR antes de la primera pantalla real (EP-06).

## Decisión
Flutter es la opción típica. Ya está en `app/`: Flutter 3.50.1, con `lib/funcionalidades/<funcionalidad>/{dominio,datos,presentacion}`. Riverpod, Drift y el cliente dart-dio se añaden en las historias que los necesitan.

Se combina con un elemento de la cola (alternativa 7):
- La app depende solo de `contratos/openapi.yaml`, y la lógica fiscal sigue en `api/`. Si Flutter web resulta muy pesado para la web del cliente, esa parte se puede rehacer en `web/` sin tocar la app móvil.
- Desde la primera historia de la app se mide el tamaño de la descarga inicial de la versión web en Cloudflare Pages.

## Descartes relevantes
De la cola se descarta la 7 como arquitectura inicial, porque obliga a construir dos interfaces y dos bases locales para el mismo usuario. Se conserva solo como salida de emergencia.

## Consecuencias
- Rinde bien en gama baja porque compila a código nativo. Drift permite pruebas en memoria sin dispositivo ni red.
- Costo: hay que aprender Dart y su ecosistema, además de TypeScript.
- Revertir: hoy solo existe la pantalla de salud, así que cambiar a Expo cuesta poco. El costo crece con cada pantalla.
