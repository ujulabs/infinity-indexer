import { subqlTest } from '@subql/testing'
import { BondingCurve, Contract, Pair, PairEvent, PairType } from '../types'

// subqlTest(
//   'swap-tokens-for-nft-event',
//   10545862,
//   [
//     Contract.create({
//       id: 'stars13tl33r3d8kql4lylsqk0ca06c450sgvnq5gv25k09rus79ynkn8q9jmuus-110',
//       blockHeight: 10542419,
//       txIdx: 0,
//       msgIdx: 0,
//       created: new Date('2023-10-20T02:28:19Z'),
//       address:
//         'stars13tl33r3d8kql4lylsqk0ca06c450sgvnq5gv25k09rus79ynkn8q9jmuus',
//       codeId: 110,
//       name: 'infinity-pair',
//       version: '0.1.2',
//     }),
//     Pair.create({
//       id: 'stars13tl33r3d8kql4lylsqk0ca06c450sgvnq5gv25k09rus79ynkn8q9jmuus',
//       txHash:
//         '9845131DE923F8515F2572DECBDD3FBFFE0B6532D1A4572332126E664191B164',
//       created: new Date('2023-10-20T02:28:19Z'),
//       collection:
//         'stars1ey8k6as6ufpg4ldhvcvhstjmd3nwe0h4acrp8hn5ux5ufarrgdwq2v9295',
//       owner: 'stars1jjcaremugyxeenx7kl8e42c8sgg2rxsr84ssxs',
//       denom: 'ustars',
//       pairType: PairType.Trade,
//       bondingCurve: BondingCurve.Exponential,
//       isActive: true,
//       totalNfts: 0,
//       totalTokens: BigInt(0),
//     }),
//   ],
//   [],
//   'infinityPairSwapTokensForNftEvent',
// )

// subqlTest(
//   'contract-migrate-event',
//   12409300,
//   [],
//   [],
//   'infinityContractMigrateEvent',
// )

// subqlTest(
//   'swap-tokens-for-nft-event',
//   12358568,
//   [],
//   [],
//   'infinityPairSwapNftForTokensEvent',
// )

subqlTest(
  'contract-migrate-event',
  12409300,
  [],
  [],
  'infinityContractMigrateEvent',
)
