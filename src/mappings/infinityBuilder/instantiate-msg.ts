import {
  CosmosHandlerKind,
  type CosmosMessageHandler,
} from '@subql/types-cosmos'
import { msgHandler } from '../../utils/handler'
import { handlerFn } from './instantiate2-msg'

const HANDLER_KEY = 'infinityBuilderInstantiateMsg'

export const handler: CosmosMessageHandler = {
  kind: CosmosHandlerKind.Message,
  handler: HANDLER_KEY,
  filter: {
    type: '/cosmwasm.wasm.v1.MsgInstantiateContract',
    values: {
      label: 'Infinity Builder',
    },
  },
}

export const infinityBuilderInstantiateMsg = msgHandler(HANDLER_KEY, handlerFn)
