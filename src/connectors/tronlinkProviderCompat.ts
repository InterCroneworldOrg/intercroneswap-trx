/*
 * Force the published CommonJS entry. Its ESM entry imports named exports from
 * java-tron-provider in a way Webpack 5 cannot statically reconcile.
 */
const tronLinkProviderModule = require('@intercroneswap/tronlink-provider') as any;

export default tronLinkProviderModule.default ?? tronLinkProviderModule;
