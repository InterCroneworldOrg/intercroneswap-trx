import { Web3Provider } from '@ethersproject/providers';
export default function getLibrary(provider: any): Web3Provider {
  const library = new Web3Provider(provider);
  const configuredInterval = Number(process.env.REACT_APP_RPC_POLLING_INTERVAL_MS);
  library.pollingInterval =
    Number.isFinite(configuredInterval) && configuredInterval >= 10_000 ? configuredInterval : 30_000;
  return library;
}
