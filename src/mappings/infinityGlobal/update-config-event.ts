import { CosmosHandlerKind } from '@subql/types-cosmos'
import type { CosmosEventHandler } from '@subql/types-cosmos'
import { GlobalConfig } from '../../types'
import { parseCosmosCoin } from '../../utils/coin'
import { MappingError } from '../../utils/errors'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'

const HANDLER_KEY = 'infinityGlobalUpdateConfigEvent'
const EVENT_KEY = 'wasm-sudo-update-config'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityGlobalUpdateConfigEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  updateGlobalConfigEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const globalConfig = await GlobalConfig.get('1')
  if (!globalConfig) {
    throw new MappingError(childLogger, 'GlobalConfig not found')
  }

  for (const updateGlobalConfigEvent of updateGlobalConfigEvents) {
    const contractAddress =
      updateGlobalConfigEvent.getUniqueKey('contractAddress')

    if (contractAddress !== globalConfig.infinityGlobalAddress) {
      childLogger.warn('Not the correct infinity-global contract')
      continue
    }

    const fairBurnAddress = updateGlobalConfigEvent.getUniqueKey('fairBurn')
    if (fairBurnAddress) {
      globalConfig.fairBurnAddress = fairBurnAddress
    }

    const royaltyRegistryAddress =
      updateGlobalConfigEvent.getUniqueKey('royaltyRegistry')
    if (royaltyRegistryAddress) {
      globalConfig.royaltyRegistryAddress = royaltyRegistryAddress
    }

    const marketplaceAddress =
      updateGlobalConfigEvent.getUniqueKey('marketplace')
    if (marketplaceAddress) {
      globalConfig.marketplaceAddress = marketplaceAddress
    }

    const infinityFactoryAddress =
      updateGlobalConfigEvent.getUniqueKey('infinityFactory')
    if (infinityFactoryAddress) {
      globalConfig.infinityFactoryAddress = infinityFactoryAddress
    }

    const infinityIndexAddress =
      updateGlobalConfigEvent.getUniqueKey('infinityIndex')
    if (infinityIndexAddress) {
      globalConfig.infinityIndexAddress = infinityIndexAddress
    }

    const infinityRouterAddress =
      updateGlobalConfigEvent.getUniqueKey('infinityRouter')
    if (infinityRouterAddress) {
      globalConfig.infinityRouterAddress = infinityRouterAddress
    }

    const infinityPairCodeId =
      updateGlobalConfigEvent.getUniqueKey('infinityPairCodeId')
    if (infinityPairCodeId) {
      globalConfig.infinityPairCodeId = parseInt(infinityPairCodeId, 10)
    }

    const pairCreationFee =
      updateGlobalConfigEvent.getUniqueKey('pairCreationFee')
    if (pairCreationFee) {
      const coin = parseCosmosCoin(pairCreationFee)
      globalConfig.pairCreationFeeAmount = BigInt(coin.amount)
      globalConfig.pairCreationFeeDenom = coin.denom
    }

    const fairBurnFeePercent =
      updateGlobalConfigEvent.getUniqueKey('fairBurnFeePercent')
    if (fairBurnFeePercent) {
      globalConfig.fairBurnFeePercent = parseFloat(fairBurnFeePercent)
    }

    const defaultRoyaltyFeePercent = updateGlobalConfigEvent.getUniqueKey(
      'defaultRoyaltyFeePercent',
    )
    if (defaultRoyaltyFeePercent) {
      globalConfig.defaultRoyaltyFeePercent = parseFloat(
        defaultRoyaltyFeePercent,
      )
    }

    const maxRoyaltyFeePercent = updateGlobalConfigEvent.getUniqueKey(
      'maxRoyaltyFeePercent',
    )
    if (maxRoyaltyFeePercent) {
      globalConfig.maxRoyaltyFeePercent = parseFloat(maxRoyaltyFeePercent)
    }

    const maxSwapFeePercent =
      updateGlobalConfigEvent.getUniqueKey('maxSwapFeePercent')
    if (maxSwapFeePercent) {
      globalConfig.maxSwapFeePercent = parseFloat(maxSwapFeePercent)
    }
  }

  await globalConfig.save()
}
