import createJavaTronProvider from './javaTronProviderCompat';

import { InjectedTronConnector } from './injected-tron-connector';
import { configureTronGridApiKey, optimizeTronProvider } from './rateLimitedProvider';

export class NetworkConnector extends InjectedTronConnector {
  constructor(kwargs: any) {
    super(kwargs);
    configureTronGridApiKey();
    this.provider = optimizeTronProvider(createJavaTronProvider({
      network: process.env.REACT_APP_TRON_NETWORK,
      tronApiUrl: process.env.REACT_APP_NETWORK_URL,
    }));
  }

  async requestProvider(...args: any[]) {
    const res = await this.provider.request(...args);
    // TODO: wrap error with throw new NoEthereumProviderError()?
    return res;
  }

  public async activate(): Promise<any> {
    return { provider: this.provider };
  }

  public async getProvider(): Promise<any> {
    return this.provider;
  }

  public async getAccount(): Promise<null | string> {
    return null;
  }
}
