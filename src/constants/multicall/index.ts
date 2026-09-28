import { ChainId } from '@intercroneswap/v2-sdk';
import MULTICALL_ABI from './abi.json';
import { getTronContracts, tronAddressToEvmAddress } from '../../tron-config';

const MULTICALL_NETWORKS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: tronAddressToEvmAddress(getTronContracts(ChainId.MAINNET).multicall),
  [ChainId.NILE]: tronAddressToEvmAddress(getTronContracts(ChainId.NILE).multicall),
  [ChainId.SHASTA]: tronAddressToEvmAddress(getTronContracts(ChainId.SHASTA).multicall),
};

export { MULTICALL_ABI, MULTICALL_NETWORKS };
