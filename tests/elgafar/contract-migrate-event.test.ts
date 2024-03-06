import { subqlTest } from '@subql/testing'
import { BondingCurve, Contract, Pair, PairEvent, PairType } from '../types'

subqlTest(
  'contract-migrate-event', // test name
  9070660, // block height to process
  [], // dependent entities
  [], // expected entities
  'infinityContractMigrateEvent', //handler name
)
