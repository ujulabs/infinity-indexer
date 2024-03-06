import { subqlTest } from '@subql/testing'
import { BondingCurve, Contract, Pair, PairEvent, PairType } from '../types'

subqlTest(
  'swap-tokens-for-nft-event', // test name
  7165516, // block height to process
  [
    Contract.create({
      id: 'stars13tl33r3d8kql4lylsqk0ca06c450sgvnq5gv25k09rus79ynkn8q9jmuus-110',
      blockHeight: 7165424,
      created: new Date('2023-10-12T20:46:31.425'),
      address:
        'stars1zzu3sufstccna2lzh7u9qc94870qp6g3s545ltp049h6w7c7jles290rfx',
      codeId: 3082,
      name: 'infinity-pair',
      version: '0.1.1',
    }),
    Pair.create({
      id: 'stars1zzu3sufstccna2lzh7u9qc94870qp6g3s545ltp049h6w7c7jles290rfx',
      blockHeight: 7165424,
      created: new Date('2023-10-12T20:46:31.425'),
      collection:
        'stars1hrh8rvf8qjf6wmkmp9655jyc2y2sjcxexjlwak0gyca3ac08spzsc7gk20',
      owner: 'stars19mmkdpvem2xvrddt8nukf5kfpjwfslrsu7ugt5',
      denom: 'ustars',
      pairType: PairType.Trade,
      bondingCurve: BondingCurve.ConstantProduct,
      isActive: true,
      totalNfts: 20,
      totalTokens: BigInt(0),
    }),
  ],
  [], // expected entities
  'infinityPairSwapNftForTokensEvent', //handler name
)

// id: ID! # address
// blockHeight: Int!
// created: Date! @index

// # Immutable
// collection: String! @index
// owner: String! @index
// denom: String!

// # Config
// pairType: PairType!
// swapFeePercent: Float
// reinvestTokens: Boolean
// reinvestNfts: Boolean
// bondingCurve: BondingCurve!
// spotPrice: BigInt
// linearDelta: BigInt
// exponentialDelta: Float
// isActive: Boolean!
// assetRecipient: String

// # Internal
// totalNfts: Int!
// totalTokens: BigInt!
// sellToPairQuote: BigInt @index
// buyFromPairQuote: BigInt @index

// # Relations
// nftDeposits: [NftDeposit!]! @derivedFrom(field: "pair")
// pairEvents: [PairEvent!]! @derivedFrom(field: "pair")

//        TS2345: Argument of type '{ id: string; created: Date; collection: string; owner: string; denom: string; pairType: PairType.Trade; bondingCurve: BondingCurve.ConstantProduct; isActive: true;
//  totalNfts: number; totalTokens: bigint; }' is not assignable to parameter of type 'PairProps'.
//    Property 'blockHeight' is missing in type '{ id: string; created: Date; collection: string; owner: string; denom: string; pairType: PairType.Trade; bondingCurve: BondingCurve.ConstantProduct; isActive:
//  true; totalNfts: number; totalTokens: bigint; }' but required in type 'PairProps'.
