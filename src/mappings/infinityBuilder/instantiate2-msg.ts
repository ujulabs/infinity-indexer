import type { CosmosMessage, CosmosMessageHandler } from '@subql/types-cosmos'
import { CosmosHandlerKind } from '@subql/types-cosmos'
import { instantiateMsgSchema } from '@uju-labs/infinity-swap-client/dist/zod/InfinityBuilderSchemas'
import _ from 'lodash'
import { GLOBAL_CONFIG_ID } from '../../constants'
import { GlobalConfig, MinPrice } from '../../types'
import {
  createdContractsFromEvents,
  latestContractByName,
} from '../../utils/contracts'
import { msgHandler, type ChildLogger } from '../../utils/handler'
import { parseB64Json } from '../../utils/parse'
import { sanitizeEvents } from '../../utils/events'
import { blockTimeToDate } from '../../utils/date'

const HANDLER_KEY = 'infinityBuilderInstantiate2Msg'

export const handler: CosmosMessageHandler = {
  kind: CosmosHandlerKind.Message,
  handler: HANDLER_KEY,
  filter: {
    type: '/cosmwasm.wasm.v1.MsgInstantiateContract2',
  },
}

export const infinityBuilderInstantiate2Msg = msgHandler(HANDLER_KEY, handlerFn)

export async function handlerFn(
  cosmosMessage: CosmosMessage,
  childLogger: ChildLogger,
): Promise<void> {
  const contract = await latestContractByName('infinity-builder')
  if (contract) {
    childLogger.warn(
      `Contract ${contract.name} v${contract.version} already exists`,
    )
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unpackedMsg: any
  try {
    unpackedMsg = parseB64Json(cosmosMessage.msg.decodedMsg.msg)
  } catch (e) {
    unpackedMsg = cosmosMessage.msg.decodedMsg.msg
  }

  const {
    pair_creation_fee: pairCreationFee,
    fair_burn: fairBurn,
    fair_burn_fee_percent: fairBurnFeePercent,
    default_royalty_fee_percent: defaultRoyaltyFeePercent,
    max_royalty_fee_percent: maxRoyaltyFeePercent,
    max_swap_fee_percent: maxSwapFeePercent,
    code_ids: codeIds,
    min_prices: minPrices,
    royalty_registry: royaltyRegistry,
    marketplace,
  } = instantiateMsgSchema.parse(unpackedMsg)

  const dbMinPrices = _.map(minPrices, (minPrice) =>
    MinPrice.create({
      id: minPrice.denom,
      amount: BigInt(minPrice.amount),
      globalConfigId: '1',
    }),
  )
  await store.bulkCreate('MinPrice', dbMinPrices)

  const created = blockTimeToDate(cosmosMessage.block.block.header.time)
  const sanitizedEvents = sanitizeEvents(cosmosMessage.tx.tx.events)
  const dbContracts = createdContractsFromEvents(
    cosmosMessage.block.header.height,
    created,
    sanitizedEvents,
  )
  await store.bulkCreate('Contract', dbContracts)

  const contractNameMap = _.keyBy(dbContracts, 'name')

  await GlobalConfig.create({
    id: GLOBAL_CONFIG_ID,
    pairCreationFeeAmount: BigInt(pairCreationFee.amount),
    pairCreationFeeDenom: pairCreationFee.denom,
    fairBurnFeePercent: parseFloat(fairBurnFeePercent),
    defaultRoyaltyFeePercent: parseFloat(defaultRoyaltyFeePercent),
    maxRoyaltyFeePercent: parseFloat(maxRoyaltyFeePercent),
    maxSwapFeePercent: parseFloat(maxSwapFeePercent),
    infinityPairCodeId: codeIds.infinity_pair,
    fairBurnAddress: fairBurn,
    royaltyRegistryAddress: royaltyRegistry,
    marketplaceAddress: marketplace,
    infinityGlobalAddress: contractNameMap['infinity-global'].address,
    infinityFactoryAddress: contractNameMap['infinity-factory'].address,
    infinityIndexAddress: contractNameMap['infinity-index'].address,
    infinityRouterAddress: contractNameMap['infinity-router'].address,
  }).save()
}
