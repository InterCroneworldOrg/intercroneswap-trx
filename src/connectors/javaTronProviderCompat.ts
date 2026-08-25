/*
 * java-tron-provider@0.0.12 is CommonJS and does not expose its helper
 * functions as statically analyzable ESM named exports. Keep the workaround in
 * one place so application code can use normal TypeScript imports.
 */
const providerModule = require('@intercroneswap/java-tron-provider') as any;

const createJavaTronProvider = providerModule.default ?? providerModule;

export const ethAddress = providerModule.ethAddress ?? providerModule.default?.ethAddress;
export const remove0xPrefix = providerModule.remove0xPrefix ?? providerModule.default?.remove0xPrefix;

export default createJavaTronProvider;
