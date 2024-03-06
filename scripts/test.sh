# !/bin/bash

PROJECT=$1

bun run set-project -- $PROJECT
bun run codegen

mkdir -p ./src/tests
cp ./tests/$PROJECT/** ./src/tests/

bun run build
# bun run test:subquery

export SUB_COMMAND=test
docker-compose down
docker-compose up
