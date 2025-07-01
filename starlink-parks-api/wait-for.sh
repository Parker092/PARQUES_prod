#!/bin/sh

# script para esperar un puerto (como el de Postgres)

host="$1"
shift
cmd="$@"

until nc -z ${host}; do
  >&2 echo "Esperando a $host..."
  sleep 1
done

>&2 echo "$host está disponible - ejecutando comando"
exec $cmd
