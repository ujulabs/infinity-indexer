# !/bin/bash

# Build arm64 image and don't push it
docker buildx build --platform linux/arm64 --tag ghcr.io/ujulabs/stardex-indexer:local .
