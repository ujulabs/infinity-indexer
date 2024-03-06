import type { SwapType } from '../types'

export const buildSwapId = (
  txHash: string,
  collection: string,
  type: SwapType,
): string => {
  return [txHash, collection, type].join('-')
}
