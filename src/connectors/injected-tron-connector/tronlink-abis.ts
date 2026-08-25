// all abis...
import { V_FACTORY_ABI, V_EXCHANGE_ABI } from '../../constants/v';
import ENS_ABI from '../../constants/abis/ens-registrar.json';
import IntercroneswapV1Router02Artifact from '@intercroneswap/v2-periphery/build/IIswapV1Router02.json';

import ENS_PUBLIC_RESOLVER_ABI from '../../constants/abis/ens-public-resolver.json';
// import UNISOCKS_ABI from '../../constants/abis/unisocks.json'
import WETH_ABI from '../../constants/abis/weth.json';
import ERC20_ABI from '../../constants/abis/erc20.json';
import { MULTICALL_ABI } from '../../constants/multicall';
import ISwapV1PairArtifact from '@intercroneswap/v2-periphery/build/IIswapV1Pair.json';
import ISwapV2StakingRewardsArtifact from '@intercroneswap/v2-staking/build/IStakingRewards.json';
import ISwapEarningArtifact from '../../hooks/Earnings.json';

const IntercroneswapV1Router02ABI = IntercroneswapV1Router02Artifact.abi;
const ISwapV1PairABI = ISwapV1PairArtifact.abi;
const ISwapV2StakingRewards = ISwapV2StakingRewardsArtifact.abi;
const ISwapEarningAbi = ISwapEarningArtifact.abi;

export const abis = [
  ...ERC20_ABI,
  ...V_FACTORY_ABI,
  ...V_EXCHANGE_ABI,
  ...IntercroneswapV1Router02ABI,
  // ...IUniswapV2PairABI,
  ...ENS_ABI,
  ...ENS_PUBLIC_RESOLVER_ABI,
  // ...UNISOCKS_ABI,
  ...WETH_ABI,
  ...MULTICALL_ABI,
  ...ISwapV1PairABI,
  ...ISwapV2StakingRewards,
  ...ISwapEarningAbi,
  {
    constant: true,
    inputs: [
      {
        internalType: 'address',
        name: 'tokenA',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'tokenB',
        type: 'address',
      },
    ],
    name: 'getPair',
    outputs: [
      {
        internalType: 'address',
        name: 'pair',
        type: 'address',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];
