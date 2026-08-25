// all abis...
import { V_FACTORY_ABI, V_EXCHANGE_ABI } from '../../constants/v';
import ENS_ABI from '../../constants/abis/ens-registrar.json';

import ENS_PUBLIC_RESOLVER_ABI from '../../constants/abis/ens-public-resolver.json';
// import UNISOCKS_ABI from '../../constants/abis/unisocks.json'
import WETH_ABI from '../../constants/abis/weth.json';
import ERC20_ABI from '../../constants/abis/erc20.json';
import { MULTICALL_ABI } from '../../constants/multicall';
import IntercroneswapV1Router02ABI from '../../constants/abis/iswap-router.json';
import ISwapV1PairABI from '../../constants/abis/iswap-pair.json';

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
