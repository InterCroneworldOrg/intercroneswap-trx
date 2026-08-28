import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ButtonSecondary } from '../../components/Button';
import { GreyCard, LightCard } from '../../components/Card';
import { AutoColumn } from '../../components/Column';
import { TYPE } from '../../theme';
import { MarketOverview, useMarketOverview } from '../../hooks/useMarketOverview';
import { StyledHeading } from '../App';

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

const Address = styled.div`
  color: ${({ theme }) => theme.text2};
  font-size: 11px;
  margin-top: 4px;
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

function numberValue(value?: string | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatToken(value?: string | null): string {
  const parsed = numberValue(value);
  if (parsed === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: parsed >= 1000 ? 2 : parsed >= 1 ? 4 : 8,
  }).format(parsed);
}

function formatUsd(value?: string | null): string {
  const parsed = numberValue(value);
  if (parsed === undefined) return '—';
  if (parsed > 0 && parsed < 0.01) return `$${parsed.toPrecision(3)}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
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

export default function Markets() {
  const { markets, state, loading, error, refresh } = useMarketOverview();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return markets;
    return markets.filter((market) =>
      [
        pairLabel(market),
        market.pair_address,
        market.token0_address,
        market.token1_address,
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [markets, query]);

  useEffect(() => setPage(0), [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleMarkets = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <StyledHeading>Markets</StyledHeading>
      <PageWrapper gap="lg">
        <GreyCard padding="16px">
          <TYPE.body>
            Cached on-chain reserves and estimated USD values. The overview is loaded from the market registry
            without additional blockchain requests from your browser.
          </TYPE.body>
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
                  </tr>
                </thead>
                <tbody>
                  {visibleMarkets.map((market) => (
                    <tr key={market.pair_address}>
                      <td>
                        <PairName>{pairLabel(market)}</PairName>
                        <Address title={market.pair_address}>{shortAddress(market.pair_address)}</Address>
                      </td>
                      <td>{formatToken(market.reserve0)} {market.token0_symbol}</td>
                      <td>{formatToken(market.reserve1)} {market.token1_symbol}</td>
                      <td>{formatUsd(market.token0_price_usd)}</td>
                      <td>{formatUsd(market.token1_price_usd)}</td>
                      <td>
                        {formatUsd(market.tvl_usd)}
                        {market.tvl_usd && <Estimate> est.</Estimate>}
                      </td>
                    </tr>
                  ))}
                  {!visibleMarkets.length && (
                    <tr>
                      <td colSpan={6}>No markets found.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </ScrollArea>
          </TableCard>
        )}

        {!loading && filtered.length > PAGE_SIZE && (
          <Pagination>
            <ButtonSecondary width="110px" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
              Previous
            </ButtonSecondary>
            <TYPE.body>Page {page + 1} of {pageCount}</TYPE.body>
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
