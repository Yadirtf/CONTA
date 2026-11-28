#!/usr/bin/env bash
# Entorno local y desechable para las pruebas de ataque (Docs/seguridad/pruebas-de-ataque.md).
# Levanta PostgreSQL 16 en /var/tmp, crea los roles conta_app (dueño) y conta_api (sin BYPASSRLS), migra,
# compila la API y la arranca en http://localhost:3999 con celulares de prueba de código fijo.
# Nunca apunta a Render, Neon ni a ningún servicio de terceros: todo queda en esta máquina.
#
# Las variables DIAN_HAB_* del llamador pasan a la API (para facturar con una empresa local); la DIAN queda
# bloqueada por sin-dian.cjs, así que ninguna factura sale de esta máquina.
#
# Uso: herramientas/ataque/levantar-entorno-local.sh            (levanta)
#      herramientas/ataque/levantar-entorno-local.sh --detener  (apaga API y base)
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
DATOS="${CONTA_ATAQUE_DATOS:-/var/tmp/conta-ataque}"
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
PUERTO_PG="${PUERTO_PG:-5433}"
PUERTO_API="${PUERTO_API:-3999}"
# Celulares de prueba (código 135790). Solo existen con CONTA_ENTORNO=pruebas.
CELULARES="${CELULARES_DE_ATAQUE:-3000000001,3000000002,3000000003,3000000004,3000000005,3000000006}"
CODIGO=135790

como_postgres() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }

if [ "${1:-}" = "--detener" ]; then
  [ -f "$DATOS/api.pid" ] && kill "$(cat "$DATOS/api.pid")" 2>/dev/null || true
  como_postgres "$PG_BIN/pg_ctl -D $DATOS/pg -m fast stop" || true
  exit 0
fi

mkdir -p "$DATOS"
[ "$(id -u)" = 0 ] && chown postgres "$DATOS"
if [ ! -d "$DATOS/pg" ]; then
  como_postgres "$PG_BIN/initdb -D $DATOS/pg -A trust >/dev/null"
fi
como_postgres "$PG_BIN/pg_ctl -D $DATOS/pg -l $DATOS/pg.log -o '-k $DATOS -p $PUERTO_PG -c listen_addresses=localhost' start" || true
sleep 2

PSQL="psql -h localhost -p $PUERTO_PG -U postgres -v ON_ERROR_STOP=1 -qtA"
if [ -z "$($PSQL -c "select 1 from pg_roles where rolname = 'conta_api'")" ]; then
  # Claves solo locales y desechables: esta base no guarda nada real. conta_app lleva BYPASSRLS como en Neon:
  # siembra lo que conta_api solo lee (datos fiscales y resoluciones, HU-06.01).
  $PSQL -c "create role conta_app login password 'local-app' createrole bypassrls"
  $PSQL -c "create role conta_api login password 'local-api' nobypassrls"
  $PSQL -c "create database conta owner conta_app"
fi

cd "$RAIZ/api"
[ -d node_modules ] || npm ci --no-audit --no-fund
DATABASE_URL="postgres://conta_app:local-app@localhost:$PUERTO_PG/conta" npm run --silent migrar
npm run --silent build

CELULARES_CON_CODIGO="$(echo "$CELULARES" | sed "s/\([0-9]*\)/\1:$CODIGO/g")"
DATABASE_URL="postgres://conta_api:local-api@localhost:$PUERTO_PG/conta" \
  CONTA_ENTORNO=pruebas \
  CELULARES_DE_PRUEBA="$CELULARES_CON_CODIGO" \
  SECRETO_SEGUNDO_FACTOR="clave-local-desechable-del-segundo-factor-ataque" \
  SECRETO_CONFIGURACION_DIAN="clave-local-desechable-de-la-configuracion-dian-ataque" \
  TOKEN_TRABAJOS_INTERNOS="token-local-desechable-de-trabajos-internos" \
  PORT="$PUERTO_API" \
  nohup node -r "$RAIZ/herramientas/ataque/sin-dian.cjs" dist/main.js > "$DATOS/api.log" 2>&1 &
echo $! > "$DATOS/api.pid"

for _ in $(seq 1 30); do
  curl -sf "http://localhost:$PUERTO_API/salud" >/dev/null && break
  sleep 1
done
echo "API local: http://localhost:$PUERTO_API  (log: $DATOS/api.log)"
echo "Base local: postgres://conta_api:local-api@localhost:$PUERTO_PG/conta (rol de la API, sin BYPASSRLS)"
echo "Celulares de prueba: $CELULARES (código $CODIGO)"
