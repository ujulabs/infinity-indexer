# `@uju-labs/infinity-indexer`

# Deploying with Kubernetes

1. Build the docker image using the command `bun run docker:build-stargaze -- <TAG>`, with a TAG like `ghcr.io/ujulabs/infinity-indexer:v0.4.0`
2. Inspect the `helm/values.yaml` file and make necessary changes. Some key values to note:
   - `storageClass`
   - `image`
   - `imagePullSecret`
   - `endpoint`
   - `createServicePod`
3. Install helm chart using the command `helm install [NAME] ./helm`
