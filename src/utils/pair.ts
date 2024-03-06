import _ from 'lodash'
import { BondingCurve, Pair, PairType } from '../types'
import { MappingError } from './errors'
import type { SanitizedEvent } from './events'
import type { ChildLogger } from './handler'

export const addressesFromEvents = (events: SanitizedEvent[]): Set<string> => {
  const retval = new Set<string>()
  for (const event of events) {
    const address = event.getUniqueKey('contractAddress')
    if (address) {
      retval.add(address)
    }
  }
  return retval
}

export const dbPairsFromEvents = async (
  events: SanitizedEvent[],
): Promise<Record<string, Pair | undefined>> => {
  const fetchPairPromise = async (
    address: string,
  ): Promise<[string, Pair | undefined]> => {
    return [address, await Pair.get(address)]
  }

  const pairAddresses = addressesFromEvents(events)
  const pairPromises = Array.from(pairAddresses).map(fetchPairPromise)

  const pairMap = _.reduce(
    await Promise.all(pairPromises),
    (accum: Record<string, Pair | undefined>, [address, pair]) => {
      accum[address] = pair
      return accum
    },
    {},
  )
  return pairMap
}

export const updatePairWithEvent = (
  pair: Pair,
  event: SanitizedEvent,
  childLogger: ChildLogger,
): Pair => {
  const {
    pairType: eventPairType,
    bondingCurve: eventBondingCurve,
    isActive: eventIsActive,
  } = event.expectUniqueKeys(['pairType', 'bondingCurve', 'isActive'])

  if (eventPairType === 'trade') {
    const {
      swapFeePercent: eventSwapFeePercent,
      reinvestTokens: eventReinvestTokens,
      reinvestNfts: eventReinvestNfts,
    } = event.expectUniqueKeys([
      'swapFeePercent',
      'reinvestTokens',
      'reinvestNfts',
    ])

    pair.pairType = PairType.Trade
    pair.swapFeePercent = parseFloat(eventSwapFeePercent)
    pair.reinvestTokens = eventReinvestTokens === 'true'
    pair.reinvestNfts = eventReinvestNfts === 'true'
  } else {
    if (eventPairType === 'token') {
      pair.pairType = PairType.Token
    } else if (eventPairType === 'nft') {
      pair.pairType = PairType.Nft
    } else {
      throw new MappingError(childLogger, `Invalid pair type ${eventPairType}`)
    }

    pair.swapFeePercent = undefined
    pair.reinvestTokens = undefined
    pair.reinvestNfts = undefined
  }

  if (eventBondingCurve === 'linear') {
    const { spotPrice: rawSpotPrice, delta: rawDelta } = event.expectUniqueKeys(
      ['spotPrice', 'delta'],
    )
    pair.bondingCurve = BondingCurve.Linear
    pair.spotPrice = BigInt(rawSpotPrice)
    pair.linearDelta = BigInt(rawDelta)
  } else if (eventBondingCurve === 'exponential') {
    const { spotPrice: rawSpotPrice, delta: rawDelta } = event.expectUniqueKeys(
      ['spotPrice', 'delta'],
    )
    pair.bondingCurve = BondingCurve.Exponential
    pair.spotPrice = BigInt(rawSpotPrice)
    pair.exponentialDelta = parseFloat(rawDelta)
  } else if (eventBondingCurve === 'constant_product') {
    pair.bondingCurve = BondingCurve.ConstantProduct
    pair.spotPrice = undefined
    pair.linearDelta = undefined
    pair.exponentialDelta = undefined
  } else {
    throw new Error(`Invalid bonding curve ${eventBondingCurve}`)
  }

  pair.isActive = eventIsActive === 'true'

  pair.assetRecipient = event.getUniqueKey('assetRecipient')
  if (pair.assetRecipient === 'None') {
    pair.assetRecipient = undefined
  }

  return pair
}
