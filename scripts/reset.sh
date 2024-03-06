# !/bin/bash

trap 'echo "Script interrupted"; exit' INT

SOURCE=$1

source ".env.${SOURCE}"

echo "Reseting infinity-indexer for ${SOURCE}..."

ansible-playbook ./ansible/playbooks/reset_infinity_indexer.yml \
  -e inventory=$INVENTORY \
  -e proxy_cmd="$PROXY_CMD" \
  -v

echo "Done resetting infinity-indexer for ${SOURCE}"
