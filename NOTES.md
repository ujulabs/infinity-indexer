# Subql Cosmos Indexing Notes

## Cosmos SDK v0.45

### CosmosMessage

- `cosmosMessage.tx.tx.events` (recommended)
  - events merged: false
  - b64 encoded: true
- `cosmosMessage.tx.tx.log`
  - events merged: true
  - b64 encoded: false

### CosmosEvent

- `cosmosEvent.log.events` (recommended)
  - events merged: true
  - b64 encoded: false
- `cosmosEvent.event`
  - events merged: true
  - b64 encoded: ?

## Cosmos SDK v0.47

### CosmosMessage

- `cosmosMessage.tx.tx.events` (recommended)
  - events merged: ?
  - b64 encoded: ?
- `cosmosMessage.tx.tx.log`
  - events merged: ?
  - b64 encoded: ?

### CosmosEvent

- `cosmosEvent.log.events` (recommended)
  - events merged: ?
  - b64 encoded: ?
- `cosmosEvent.event`
  - events merged: ?
  - b64 encoded: ?
