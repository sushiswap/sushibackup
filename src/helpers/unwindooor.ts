import { request, gql } from 'graphql-request';
import { CHAIN_IDS } from './network';
import { EXCHANGE_ENDPOINTS } from './exchange';

const pairQuery = `
  pair {
    id
    reserveUSD
    totalSupply
    name
    reserve0
    reserve1
    token0 {
      id
      symbol
      name
      decimals
    }
    token1 {
      id
      name
      symbol
      decimals
    }
  }
`;

const QUERY = gql`
    query positions ($feeTo: ID!) {
      user(id: $feeTo) {
        lp1: liquidityPositions(first: 1000, orderBy: timestamp, orderDirection: desc) {
          ${pairQuery}
          liquidityTokenBalance
        }
        lp2: liquidityPositions(skip: 1000, first: 1000, orderBy: timestamp, orderDirection: desc) {
          ${pairQuery}
          liquidityTokenBalance
        }
      }
    }
  `;

const UNWINDOOOR_ADDR: { [chainId: number]: string } = {
  [CHAIN_IDS.ARBITRUM]: '0xa19b3b22f29E23e4c04678C94CFC3e8f202137d8',
  [CHAIN_IDS.AVALANCHE]: '0x560C759A11cd026405F6f2e19c65Da1181995fA2',
  [CHAIN_IDS.BSC]: '0x4736c58BfB626C96D344Be2fC04e420aE283E9E8',
  [CHAIN_IDS.CELO]: '0xB6E90eBe44De40aEb0b987adC2D7d9dd0EC918d7',
  [CHAIN_IDS.ETHEREUM]: '0x5ad6211CD3fdE39A9cECB5df6f380b8263d1e277',
  [CHAIN_IDS.FANTOM]: '0x4736c58BfB626C96D344Be2fC04e420aE283E9E8',
  [CHAIN_IDS.HARMONY]: '0x560C759A11cd026405F6f2e19c65Da1181995fA2',
  [CHAIN_IDS.MOONRIVER]: '0xa19b3b22f29E23e4c04678C94CFC3e8f202137d8',
  [CHAIN_IDS.POLYGON]: '0xf1c9881Be22EBF108B8927c4d197d126346b5036',
  [CHAIN_IDS.XDAI]: '0x1026cbed7b7E851426b959BC69dcC1bf5876512d',
};

const queryUnwindooorPositions = async (chainId: number): Promise<any> => {
  return await queryPositions(UNWINDOOOR_ADDR[chainId].toLowerCase(), chainId);
};

const queryPositions = async (address: string, chainId: number): Promise<any> => {
  let res = await request(EXCHANGE_ENDPOINTS[chainId], QUERY, {
    feeTo: address.toLowerCase(),
  });
  let totalFees = 0;
  if (res.user === null) {
    return {
      positions: [],
      totalFees: 0,
    };
  }
  const positions: any[] = [...res.user.lp1, ...res.user.lp2].sort((positionA: any, positionB: any) => {
    const pairA = positionA.pair;
    const valueA = (positionA.liquidityTokenBalance / pairA.totalSupply) * pairA.reserveUSD;
    const pairB = positionB.pair;
    const valueB = (positionB.liquidityTokenBalance / pairB.totalSupply) * pairB.reserveUSD;
    if (valueA > valueB) return -1;
    return +1;
  });
  if (positions.length > 250) {
    positions.splice(250);
  }
  positions.forEach((position: any) => {
    const pair = position.pair;
    if (pair.totalSupply > 0) {
      const value = (position.liquidityTokenBalance / pair.totalSupply) * pair.reserveUSD;
      totalFees += value;
    }
  });
  return {
    positions: positions,
    totalFees: totalFees,
  };
};

export { UNWINDOOOR_ADDR, queryUnwindooorPositions, queryPositions };
