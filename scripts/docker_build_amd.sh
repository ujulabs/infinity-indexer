# !/bin/bash

TAG=$1

docker buildx build --platform linux/amd64 --tag $TAG --push .