import type { ReadonlyDateWithNanoseconds } from '@cosmjs/tendermint-rpc/build/dates'

export const blockTimeToDate = (blockTime: ReadonlyDateWithNanoseconds): Date => {
  return new Date(blockTime.getTime())
}
