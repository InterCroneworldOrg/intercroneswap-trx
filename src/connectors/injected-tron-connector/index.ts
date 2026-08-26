import createTronLinkProvider from '../tronlinkProviderCompat';
import { AbstractConnectorArguments, ConnectorUpdate } from '@web3-react/types';
import { AbstractConnector } from '@web3-react/abstract-connector';
import { abis, createFunctionSignatures } from './tronlink-abis';
import { configureTronGridApiKey, optimizeTronProvider } from '../rateLimitedProvider';
import { ethAddress } from '../javaTronProviderCompat';
// import warning from 'tiny-warning'

export class UserRejectedRequestError extends Error {
  public constructor() {
    super();
    this.name = this.constructor.name;
    this.message = 'The user rejected the request.';
  }
}

export class InjectedTronConnector extends AbstractConnector {
  public provider: any;

  constructor(kwargs: AbstractConnectorArguments) {
    super(kwargs);
    // TODO(tron): should auto-use same network as one selected in tronlink!
    configureTronGridApiKey();
    this.provider = optimizeTronProvider(
      createTronLinkProvider({
        network: process.env.REACT_APP_TRON_NETWORK,
        tronApiUrl: process.env.REACT_APP_NETWORK_URL,
        functionSignatures: abis,
        signs: createFunctionSignatures(),
      }),
    );
    /*
    this.handleNetworkChanged = this.handleNetworkChanged.bind(this)
    this.handleChainChanged = this.handleChainChanged.bind(this)
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this)
    this.handleClose = this.handleClose.bind(this)
    */
  }

  async requestProvider(args: any) {
    const res = await this.provider.request(args);
    return res;
  }

  public async activate(): Promise<ConnectorUpdate> {
    const tronProvider = window.tron ?? window.tronLink;
    if (!tronProvider?.request) throw new Error('TronLink is not installed.');

    let accounts: string[];
    try {
      accounts = await tronProvider.request({ method: 'eth_requestAccounts' });
    } catch (error: any) {
      if (error?.code === 4001) throw new UserRejectedRequestError();
      throw error;
    }

    const tronWeb = tronProvider.tronWeb || window.tronWeb;
    if (!tronWeb) throw new Error('TronLink did not provide TronWeb after authorization.');
    // The legacy transaction bridge consumes window.tronWeb. Modern TronLink
    // exposes the same instance under window.tron.tronWeb.
    window.tronWeb = tronWeb;

    const tronHex = tronWeb.defaultAddress?.hex || (accounts?.[0] && tronWeb.address?.toHex(accounts[0]));
    if (!tronHex) throw new Error('Unlock TronLink and select an account.');
    const account = ethAddress.fromTronHex(tronHex);
    return { provider: this.provider, account };
  }

  public async getProvider(): Promise<any> {
    return this.provider;
  }

  public async getChainId(): Promise<number | string> {
    const chainId = await this.requestProvider({ method: 'eth_chainId' });
    return chainId;
  }

  public async getAccount(): Promise<null | string> {
    const tronWeb = window.tron?.tronWeb || window.tronLink?.tronWeb || window.tronWeb;
    const tronHex = tronWeb && tronWeb.defaultAddress?.hex;
    return tronHex ? ethAddress.fromTronHex(tronHex) : null;
  }

  public deactivate() {
    return true;
  }

  public async isAuthorized(): Promise<boolean> {
    const tronWeb = window.tron?.tronWeb || window.tronLink?.tronWeb || window.tronWeb;
    return Boolean(tronWeb && tronWeb.ready && tronWeb.defaultAddress?.hex);
  }
}
