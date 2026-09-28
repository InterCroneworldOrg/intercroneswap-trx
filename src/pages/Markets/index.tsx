import { Fragment, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ButtonSecondary } from '../../components/Button';
import { GreyCard, LightCard } from '../../components/Card';
import { AutoColumn } from '../../components/Column';
import { TYPE } from '../../theme';
import { MarketOverview, useMarketOverview } from '../../hooks/useMarketOverview';
import { StyledHeading } from '../App';
import { getActiveSwapVersion } from '../../swapVersion';
import { getTokenLogoURL } from '../../utils/tokenLogo';
import { tronAddressToEvmAddress } from '../../tron-config';
import { useAllLists } from '../../state/lists/hooks';
import { useV1MarketHolders, V1LpHolder } from '../../hooks/useV1MarketHolders';

const PAGE_SIZE = 25;

const PageWrapper = styled(AutoColumn)`
  max-width: 1120px;
  width: 100%;
  padding: 0 16px;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 12px;
  background: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text1};
  outline: none;

  :focus {
    border-color: ${({ theme }) => theme.primary1};
  }
`;

const TableCard = styled(LightCard)`
  width: 100%;
  padding: 0;
  overflow: hidden;
`;

const ScrollArea = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
  color: ${({ theme }) => theme.text1};

  th,
  td {
    padding: 15px 16px;
    text-align: right;
    border-bottom: 1px solid ${({ theme }) => theme.bg3};
    white-space: nowrap;
  }

  th:first-child,
  td:first-child {
    text-align: left;
  }

  th {
    color: ${({ theme }) => theme.text2};
    font-size: 12px;
    font-weight: 500;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }
`;

const PairName = styled.div`
  color: ${({ theme }) => theme.text1};
  font-weight: 600;
`;

const PairIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TokenLogos = styled.div`
  display: flex;
  min-width: 42px;

  :empty {
    display: none;
  }

  img + img {
    margin-left: -8px;
  }
`;

const TokenLogo = styled.img`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  background: ${({ theme }) => theme.bg3};
`;

const Address = styled.div`
  color: ${({ theme }) => theme.text2};
  font-size: 11px;
  margin-top: 4px;
`;

const AddressLink = styled.a`
  color: inherit;
  text-decoration: none;

  :hover,
  :focus {
    color: ${({ theme }) => theme.primary3};
    text-decoration: underline;
  }
`;

const DesktopMarkets = styled.div`
  @media (max-width: 640px) {
    display: none;
  }
`;

const MobileMarkets = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: grid;
    gap: 12px;
    width: 100%;
  }
`;

const MobileMarketCard = styled(LightCard)`
  width: 100%;
  padding: 14px;
`;

const MobileValueRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.bg3};

  span:first-child {
    color: ${({ theme }) => theme.text2};
    font-size: 12px;
  }

  span:last-child {
    text-align: right;
    overflow-wrap: anywhere;
  }
`;

const Estimate = styled.span`
  color: ${({ theme }) => theme.text2};
  font-size: 12px;
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
`;

const HolderPanel = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
  background: ${({ theme }) => theme.bg2};
  border-radius: 12px;
`;

const HolderSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  color: ${({ theme }) => theme.text2};
  font-size: 12px;
`;

const HolderRow = styled.div`
  display: grid;
  grid-template-columns: minmax(150px, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.bg3};
  font-size: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr auto;

    span:first-child {
      grid-column: 1 / -1;
      overflow-wrap: anywhere;
    }
  }
`;

const CompactButton = styled(ButtonSecondary)`
  width: auto;
  min-width: 92px;
  padding: 8px 12px;
`;

const StakerList = styled.div`
  grid-column: 1 / -1;
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: ${({ theme }) => theme.bg1};
`;

function numberValue(value?: string | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatToken(value?: string | null, symbol?: string): string {
  const parsed = numberValue(value);
  if (parsed === undefined) return '—';

  if (Math.abs(parsed) >= 1_000_000) {
    return `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(parsed / 1_000_000)} M`;
  }

  const isStable = ['USDT', 'USDC'].includes((symbol || '').toUpperCase());
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isStable ? 2 : 0,
    maximumFractionDigits: isStable ? 4 : parsed !== 0 && Math.abs(parsed) < 1 ? 8 : 4,
  }).format(parsed);
}

function formatUsd(value?: string | null): string {
  const parsed = numberValue(value);
  if (parsed === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: parsed !== 0 && Math.abs(parsed) < 0.01 ? 0 : 2,
    maximumFractionDigits: parsed !== 0 && Math.abs(parsed) < 0.01 ? 6 : 2,
  }).format(parsed);
}

function shortAddress(address: string): string {
  return `${address.slice(0, 7)}...${address.slice(-6)}`;
}

function updatedLabel(value?: string): string {
  if (!value) return 'not completed yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function pairLabel(market: MarketOverview): string {
  return `${market.token0_symbol || 'Token 0'} / ${market.token1_symbol || 'Token 1'}`;
}

function tronscanBalancesUrl(pairAddress: string): string {
  return `https://tronscan.org/balanceView/${pairAddress}/token-balances`;
}

function MarketTokenLogo({ address, symbol }: { address: string; symbol?: string }) {
  const allTokens = useAllLists();
  const src = useMemo(() => {
    try {
      return getTokenLogoURL(tronAddressToEvmAddress(address), allTokens)[0];
    } catch {
      return undefined;
    }
  }, [address, allTokens]);

  if (!src) return null;
  return (
    <TokenLogo
      src={src}
      alt={`${symbol || 'Token'} logo`}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = 'none';
      }}
    />
  );
}

function MarketIdentity({ market }: { market: MarketOverview }) {
  return (
    <PairIdentity>
      <TokenLogos>
        <MarketTokenLogo address={market.token0_address} symbol={market.token0_symbol} />
        <MarketTokenLogo address={market.token1_address} symbol={market.token1_symbol} />
      </TokenLogos>
      <div>
        <PairName>{pairLabel(market)}</PairName>
        <Address title={market.pair_address}>
          <AddressLink href={tronscanBalancesUrl(market.pair_address)} target="_blank" rel="noopener noreferrer">
            {shortAddress(market.pair_address)}
          </AddressLink>
        </Address>
      </div>
    </PairIdentity>
  );
}

function holderLabel(holder: V1LpHolder): string {
  if (holder.contract_role === 'staking') return 'Staking contract';
  return holder.holder_type === 'smart_contract' ? 'Smart contract' : 'Wallet';
}

function FarmStakers({ farmAddress }: { farmAddress: string }) {
  const [stakers, setStakers] = useState<Array<{ wallet_address: string; staked_raw?: string; earned_raw?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const apiBase = (process.env.REACT_APP_MARKETS_API_URL || '/markets-api').replace(/\/$/, '');
    fetch(`${apiBase}/api/v1/staking/${encodeURIComponent(farmAddress)}/stakers`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || `Staker request failed (${response.status})`);
        return body;
      })
      .then((body) => setStakers(Array.isArray(body.stakers) ? body.stakers : []))
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [farmAddress]);

  return (
    <StakerList>
      {loading && <TYPE.small>Loading verified stakers…</TYPE.small>}
      {error && <TYPE.small color="error">{error}</TYPE.small>}
      {!loading && !error && stakers.map((staker) => (
        <HolderRow key={staker.wallet_address}>
          <AddressLink href={`https://tronscan.org/address/${staker.wallet_address}`} target="_blank" rel="noopener noreferrer">
            {staker.wallet_address}
          </AddressLink>
          <span>Staked LP: {formatToken(String(Number(staker.staked_raw || '0') / 1e18))}</span>
          <span>Reward raw: {staker.earned_raw || '0'}</span>
        </HolderRow>
      ))}
      {!loading && !error && !stakers.length && <TYPE.small>No current stake or reward balance found.</TYPE.small>}
    </StakerList>
  );
}

function MarketHolders({ pairAddress }: { pairAddress: string }) {
  const { holders, total, loading, error, refresh } = useV1MarketHolders(pairAddress);
  const wallets = holders.filter((holder) => holder.holder_type === 'wallet').length;
  const contracts = holders.filter((holder) => holder.holder_type === 'smart_contract').length;
  const [openFarm, setOpenFarm] = useState<string>();
  return (
    <HolderPanel>
      <HolderSummary>
        <span>{total} holders</span>
        <span>{wallets} wallets shown</span>
        <span>{contracts} contracts shown</span>
        <span>Balances are reconstructed from confirmed LP transfers.</span>
      </HolderSummary>
      {loading && <TYPE.small>Loading LP holders…</TYPE.small>}
      {error && (
        <TYPE.small color="error">
          {error} <button onClick={refresh}>Retry</button>
        </TYPE.small>
      )}
      {!loading && !error && holders.map((holder) => (
        <HolderRow key={holder.holder_address}>
          <span>
            <AddressLink
              href={`https://tronscan.org/${holder.holder_type === 'smart_contract' ? 'contract' : 'address'}/${holder.holder_address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {holder.holder_address}
            </AddressLink>
          </span>
          <span>
            {holderLabel(holder)}{holder.staker_count !== undefined ? ` · ${holder.staker_count} stakers` : ''}
            {holder.contract_role === 'staking' && (
              <button onClick={() => setOpenFarm((value) => value === holder.holder_address ? undefined : holder.holder_address)}>
                {openFarm === holder.holder_address ? 'Hide' : 'Show'}
              </button>
            )}
          </span>
          <span>{(holder.percentage || 0).toFixed(4)}%</span>
          {openFarm === holder.holder_address && <FarmStakers farmAddress={holder.holder_address} />}
        </HolderRow>
      ))}
      {!loading && !error && !holders.length && <TYPE.small>Holder indexing has not completed for this market yet.</TYPE.small>}
    </HolderPanel>
  );
}

export default function Markets() {
  const swapVersion = getActiveSwapVersion();
  const { markets, state, loading, error, refresh } = useMarketOverview();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [openHolders, setOpenHolders] = useState<string>();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return markets;
    return markets.filter((market) =>
      [pairLabel(market), market.pair_address, market.token0_address, market.token1_address].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [markets, query]);

  useEffect(() => setPage(0), [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleMarkets = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <StyledHeading>Markets {swapVersion.toUpperCase()}</StyledHeading>
      <PageWrapper gap="lg">
        <GreyCard padding="16px">
          <TYPE.body>Overview of current market reserves and estimated USD values.</TYPE.body>
          <TYPE.small color="text2" style={{ marginTop: '8px' }}>
            Last update: {updatedLabel(state?.last_success_at)} · {markets.length} markets
          </TYPE.small>
        </GreyCard>

        <Toolbar>
          <SearchInput
            aria-label="Search markets"
            placeholder="Search pair, token or contract address"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ButtonSecondary width="130px" onClick={refresh}>
            Refresh
          </ButtonSecondary>
        </Toolbar>

        {error && (
          <GreyCard padding="16px">
            <TYPE.body>{error}</TYPE.body>
          </GreyCard>
        )}

        {loading ? (
          <GreyCard padding="16px">
            <TYPE.body>Loading markets…</TYPE.body>
          </GreyCard>
        ) : (
          <>
            <DesktopMarkets>
              <TableCard>
                <ScrollArea>
                  <Table>
                    <thead>
                      <tr>
                        <th>Market</th>
                        <th>Reserve 1</th>
                        <th>Reserve 2</th>
                        <th>Price 1</th>
                        <th>Price 2</th>
                        <th>TVL (estimated)</th>
                        {swapVersion === 'v1' && <th>LP holders</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMarkets.map((market) => (
                        <Fragment key={market.pair_address}>
                        <tr key={market.pair_address}>
                          <td>
                            <MarketIdentity market={market} />
                          </td>
                          <td>
                            {formatToken(market.reserve0, market.token0_symbol)} {market.token0_symbol}
                          </td>
                          <td>
                            {formatToken(market.reserve1, market.token1_symbol)} {market.token1_symbol}
                          </td>
                          <td>{formatUsd(market.token0_price_usd)}</td>
                          <td>{formatUsd(market.token1_price_usd)}</td>
                          <td>
                            {formatUsd(market.tvl_usd)}
                            {market.tvl_usd && <Estimate> est.</Estimate>}
                          </td>
                          {swapVersion === 'v1' && (
                            <td>
                              <CompactButton onClick={() => setOpenHolders((value) => value === market.pair_address ? undefined : market.pair_address)}>
                                {openHolders === market.pair_address ? 'Close' : 'Analyze'}
                              </CompactButton>
                            </td>
                          )}
                        </tr>
                        {swapVersion === 'v1' && openHolders === market.pair_address && (
                          <tr key={`${market.pair_address}-holders`}>
                            <td colSpan={7}><MarketHolders pairAddress={market.pair_address} /></td>
                          </tr>
                        )}
                        </Fragment>
                      ))}
                      {!visibleMarkets.length && (
                        <tr>
                          <td colSpan={swapVersion === 'v1' ? 7 : 6}>No markets found.</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </ScrollArea>
              </TableCard>
            </DesktopMarkets>
            <MobileMarkets>
              {visibleMarkets.map((market) => (
                <MobileMarketCard key={market.pair_address}>
                  <MarketIdentity market={market} />
                  <MobileValueRow>
                    <span>Reserve 1</span>
                    <span>
                      {formatToken(market.reserve0, market.token0_symbol)} {market.token0_symbol}
                    </span>
                  </MobileValueRow>
                  <MobileValueRow>
                    <span>Reserve 2</span>
                    <span>
                      {formatToken(market.reserve1, market.token1_symbol)} {market.token1_symbol}
                    </span>
                  </MobileValueRow>
                  <MobileValueRow>
                    <span>Price 1</span>
                    <span>{formatUsd(market.token0_price_usd)}</span>
                  </MobileValueRow>
                  <MobileValueRow>
                    <span>Price 2</span>
                    <span>{formatUsd(market.token1_price_usd)}</span>
                  </MobileValueRow>
                  <MobileValueRow>
                    <span>TVL</span>
                    <span>
                      {formatUsd(market.tvl_usd)}
                      {market.tvl_usd && <Estimate> est.</Estimate>}
                    </span>
                  </MobileValueRow>
                  {swapVersion === 'v1' && (
                    <>
                      <CompactButton onClick={() => setOpenHolders((value) => value === market.pair_address ? undefined : market.pair_address)}>
                        {openHolders === market.pair_address ? 'Close LP holders' : 'Analyze LP holders'}
                      </CompactButton>
                      {openHolders === market.pair_address && <MarketHolders pairAddress={market.pair_address} />}
                    </>
                  )}
                </MobileMarketCard>
              ))}
              {!visibleMarkets.length && (
                <MobileMarketCard>
                  <TYPE.body>No markets found.</TYPE.body>
                </MobileMarketCard>
              )}
            </MobileMarkets>
          </>
        )}

        {!loading && filtered.length > PAGE_SIZE && (
          <Pagination>
            <ButtonSecondary width="110px" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
              Previous
            </ButtonSecondary>
            <TYPE.body>
              Page {page + 1} of {pageCount}
            </TYPE.body>
            <ButtonSecondary
              width="110px"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </ButtonSecondary>
          </Pagination>
        )}
      </PageWrapper>
    </>
  );
}
