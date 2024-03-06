import type {
  CosmosEvent,
  CosmosMessage,
  CosmosTransaction,
} from '@subql/types-cosmos'
import { type Log } from '@cosmjs/stargate/build/logs'

export type ModifiedCosmosEvent = Omit<CosmosEvent, 'tx' | 'msg' | 'log'> & {
  tx?: CosmosTransaction
  msg?: CosmosMessage
  log?: Log
}
