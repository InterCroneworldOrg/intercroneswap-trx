import { TransactionResponse } from '@ethersproject/providers';
import { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink } from 'react-feather';
import styled from 'styled-components';
import { ButtonPrimary, ButtonSecondary } from '../../components/Button';
import { GreyCard, LightCard } from '../../components/Card';
import { AutoColumn } from '../../components/Column';
import { useActiveWeb3React } from '../../hooks';
import { EndedFarm, FarmWalletPosition, useEndedFarms } from '../../hooks/useStakingRegistry';
import { useAllLists } from '../../state/lists/hooks';
import { useWalletModalToggle } from '../../state/application/hooks';
import { useTransactionAdder } from '../../state/transactions/hooks';
import { TYPE } from '../../theme';
import { DEFAULT_FEE_LIMIT, tronAddressToEvmAddress } from '../../tron-config';
import { getContract } from '../../utils';
import { getTokenLogoURL } from '../../utils/tokenLogo';
import { StyledHeading } from '../App';

const PageWrapper = styled(AutoColumn)`
  max-width: 1180px;
  width: 100%;
  padding: 0 16px 40px;
`;
const FarmList = styled.div`display: grid; gap: 14px; width: 100%;`;
const FarmCard = styled(LightCard)`
  width: 100%; padding: 0; overflow: hidden;
  background: ${({ theme }) => theme.bg3};
`;
const FarmSummary = styled.div`
  display: grid;
  grid-template-columns: minmax(210px, 1.45fr) repeat(3, minmax(120px, 1fr)) minmax(145px, .95fr) minmax(145px, .95fr) 34px;
  gap: 18px; align-items: center; padding: 17px 18px;
  @media (max-width: 960px) {
    grid-template-columns: minmax(190px, 1.4fr) repeat(2, minmax(115px, 1fr)) minmax(135px, .9fr) 30px;
    > :nth-child(4), > :nth-child(6) { display: none; }
  }
  @media (max-width: 680px) {
    grid-template-columns: 1fr 1fr 28px; gap: 14px 10px; padding: 16px;
    > :first-child { grid-column: 1 / 3; }
    > :nth-child(2), > :nth-child(3), > :nth-child(4), > :nth-child(6) { display: block; }
    > :nth-child(5), > :nth-child(6) { min-width: 0; }
    > :last-child { grid-column: 3; grid-row: 1; }
  }
`;
const PairBlock = styled.div`min-width: 0;`;
const PairLine = styled.div`
  display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 16px; font-weight: 600;
`;
const TokenLogos = styled.div`
  display: flex; flex: 0 0 auto;
  img + img { margin-left: -7px; }
`;
const TokenLogo = styled.img`
  width: 25px; height: 25px; border-radius: 50%; object-fit: cover;
  background: ${({ theme }) => theme.bg4}; border: 1px solid ${({ theme }) => theme.bg3};
`;
const EarnLine = styled.div`
  margin-top: 6px; color: ${({ theme }) => theme.primary3}; font-size: 14px;
`;
const Metric = styled.div`min-width: 0;`;
const MetricLabel = styled.div`
  margin-bottom: 5px; color: ${({ theme }) => theme.text1}; font-size: 14px;
`;
const MetricValue = styled.div<{ muted?: boolean }>`
  color: ${({ muted, theme }) => (muted ? theme.text2 : theme.primary3)};
  font-size: 15px; overflow-wrap: anywhere;
`;
const ActionButton = styled(ButtonPrimary)`
  min-height: 46px; padding: 10px 12px; border-radius: 10px; line-height: 1.2;
`;
const ExpandButton = styled.button<{ open: boolean }>`
  display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
  padding: 0; border: 0; border-radius: 50%; background: transparent;
  color: ${({ theme }) => theme.text1}; cursor: pointer;
  svg { transform: rotate(${({ open }) => (open ? '180deg' : '0deg')}); transition: transform .2s ease; }
  :hover, :focus { background: ${({ theme }) => theme.bg4}; outline: none; }
`;
const FarmDetails = styled.div`
  display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)) auto auto;
  gap: 20px; align-items: center; margin: 0 18px; padding: 17px 0 18px;
  border-top: 1px solid ${({ theme }) => theme.bg4};
  @media (max-width: 820px) { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
  @media (max-width: 480px) { grid-template-columns: 1fr 1fr; gap: 16px 10px; }
`;
const DetailLink = styled.a`
  display: inline-flex; align-items: center; gap: 5px; color: ${({ theme }) => theme.text1};
  font-size: 14px; text-decoration: underline; white-space: nowrap;
  :hover, :focus { color: ${({ theme }) => theme.primary3}; }
`;
const EmptyState = styled(GreyCard)`width: 100%; padding: 20px;`;
const STAKING_ABI = ['function exit()'];

function splitFarmLabel(farm: EndedFarm): { pair: string; reward: string } {
  const clean = (farm.legacy_label || 'Ended farm').replace(/\s+/g, ' ').trim();
  const match = clean.match(/^(.*?)\s+(?:-|–|—)?\s*Earn\s+(.+)$/i);
  const pair = (match?.[1] || clean).replace(/\s*(?:-|–|—)\s*$/, '').trim();
  const symbols = pair.split('/').map((value) => value.trim()).filter(Boolean);
  return {
    pair: symbols.join(' / ') || pair,
    reward: farm.rewards_token_symbol || match?.[2]?.trim() || symbols[symbols.length - 1] || 'rewards',
  };
}
function rawAmount(raw?: string, decimals = 6): string {
  if (!raw || !/^\d+$/.test(raw)) return '0.00';
  const padded = raw.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals) || '0';
  const fraction = decimals ? padded.slice(-decimals).replace(/0+$/, '').slice(0, 6) : '';
  return `${Number(whole).toLocaleString()}${fraction ? `.${fraction}` : '.00'}`;
}
function endedDate(farm: EndedFarm): string {
  const value = farm.period_finish_at || (farm.period_finish ? farm.period_finish * 1000 : undefined);
  if (!value) return 'Ended';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Ended' : date.toLocaleDateString('de-DE');
}
function FarmTokenLogo({ address, symbol }: { address?: string; symbol: string }) {
  const allTokens = useAllLists();
  const src = useMemo(() => {
    if (!address) return undefined;
    try { return getTokenLogoURL(tronAddressToEvmAddress(address), allTokens)[0]; }
    catch { return undefined; }
  }, [address, allTokens]);
  if (!src) return null;
  return <TokenLogo src={src} alt={`${symbol} logo`} loading="lazy"
    onError={(event) => { event.currentTarget.style.display = 'none'; }} />;
}
function PositionValue({ position, farm }: { position?: FarmWalletPosition; farm: EndedFarm }) {
  const staked = rawAmount(position?.staked_raw, farm.staking_token_decimals);
  const earned = rawAmount(position?.earned_raw, farm.rewards_token_decimals);
  if (!position?.exit_required) return <>0</>;
  if (position.has_stake && position.has_rewards) return <>{staked} LP + {earned}</>;
  return <>{position.has_stake ? `${staked} LP` : earned}</>;
}

export default function Farms() {
  const { account, chainId, library } = useActiveWeb3React();
  const toggleWalletModal = useWalletModalToggle();
  const addTransaction = useTransactionAdder();
  const { farms, positionsByFarm, loading, error, refresh } = useEndedFarms(account);
  const [openFarms, setOpenFarms] = useState<Record<string, boolean>>({});
  const [pendingFarm, setPendingFarm] = useState<string>();
  const [submittedFarms, setSubmittedFarms] = useState<Record<string, string>>({});
  const [transactionError, setTransactionError] = useState<string>();

  async function exitFarm(farm: EndedFarm): Promise<void> {
    if (!chainId || !library || !account || pendingFarm) return;
    setPendingFarm(farm.farm_address);
    setTransactionError(undefined);
    try {
      const contract = getContract(tronAddressToEvmAddress(farm.farm_address), STAKING_ABI, library, account);
      await contract.estimateGas.exit();
      const response: TransactionResponse = await contract.exit({ gasLimit: DEFAULT_FEE_LIMIT });
      addTransaction(response, { summary: `Exit ended farm ${farm.legacy_label}` });
      setSubmittedFarms((current) => ({ ...current, [farm.farm_address]: response.hash }));
    } catch (exitError: any) {
      if (exitError?.code !== 4001) setTransactionError(exitError?.message || 'Exit transaction failed');
    } finally { setPendingFarm(undefined); }
  }

  return <>
    <StyledHeading>Ended Farms</StyledHeading>
    <PageWrapper gap="lg">
      {!account && <GreyCard padding="16px">
        <TYPE.body>Connect your wallet to see whether an ended farm still contains LP tokens or rewards.</TYPE.body>
        <ButtonPrimary width="240px" style={{ marginTop: '14px' }} onClick={toggleWalletModal}>Connect Wallet</ButtonPrimary>
      </GreyCard>}
      {error && <GreyCard padding="16px"><TYPE.body>{error}</TYPE.body>
        <ButtonSecondary width="140px" style={{ marginTop: '12px' }} onClick={refresh}>Retry</ButtonSecondary>
      </GreyCard>}
      {transactionError && <GreyCard padding="16px"><TYPE.body>{transactionError}</TYPE.body></GreyCard>}
      {loading ? <EmptyState><TYPE.body>Loading ended farms…</TYPE.body></EmptyState>
      : farms.length === 0 ? <EmptyState><TYPE.body>No ended farms found.</TYPE.body></EmptyState>
      : <FarmList>{farms.map((farm) => {
        const position = positionsByFarm[farm.farm_address];
        const needsExit = Boolean(position?.exit_required);
        const submitted = submittedFarms[farm.farm_address];
        const pending = pendingFarm === farm.farm_address;
        const open = Boolean(openFarms[farm.farm_address]);
        const label = splitFarmLabel(farm);
        const pairSymbols = label.pair.split('/').map((value) => value.trim());
        return <FarmCard key={farm.farm_address}>
          <FarmSummary>
            <PairBlock><PairLine><TokenLogos>
              <FarmTokenLogo address={farm.staking_token_address} symbol={pairSymbols[0] || 'LP'} />
              <FarmTokenLogo address={farm.rewards_token_address} symbol={label.reward} />
            </TokenLogos><span>{label.pair}</span></PairLine><EarnLine>Earn {label.reward}</EarnLine></PairBlock>
            <Metric><MetricLabel>Ended on</MetricLabel><MetricValue>{endedDate(farm)}</MetricValue></Metric>
            <Metric><MetricLabel>Earned / APY</MetricLabel><MetricValue>{rawAmount(position?.earned_raw, farm.rewards_token_decimals)} / –</MetricValue></Metric>
            <Metric><MetricLabel>Balance</MetricLabel><MetricValue>{position?.has_stake ? rawAmount(position.staked_raw, farm.staking_token_decimals) : '0'}</MetricValue></Metric>
            <ActionButton disabled={!account || !needsExit || Boolean(pending || submitted)} onClick={() => exitFarm(farm)}>
              {submitted ? 'Exit submitted' : pending ? 'Confirm…' : <>Exit<br /><PositionValue position={position} farm={farm} /></>}
            </ActionButton>
            <ActionButton as="a" href="#/pool">Get LP</ActionButton>
            <ExpandButton open={open} aria-label={open ? `Hide ${label.pair} details` : `Show ${label.pair} details`}
              aria-expanded={open} onClick={() => setOpenFarms((current) => ({ ...current, [farm.farm_address]: !open }))}>
              <ChevronDown size={19} />
            </ExpandButton>
          </FarmSummary>
          {open && <FarmDetails>
            <Metric><MetricLabel>Fee</MetricLabel><MetricValue>{farm.fee_percent === undefined ? '–' : `${farm.fee_percent} %`}</MetricValue></Metric>
            <Metric><MetricLabel>Status</MetricLabel><MetricValue>Rewards have ended</MetricValue></Metric>
            <Metric><MetricLabel>Staked</MetricLabel><MetricValue>{position?.has_stake ? rawAmount(position.staked_raw, farm.staking_token_decimals) : '0.00'} LP</MetricValue></Metric>
            <Metric><MetricLabel>Total Staked</MetricLabel><MetricValue muted>{farm.total_staked_raw ? `${rawAmount(farm.total_staked_raw, farm.staking_token_decimals)} LP` : '–'}</MetricValue></Metric>
            <DetailLink href={`https://tronscan.org/#/address/${farm.farm_address}`} target="_blank" rel="noopener noreferrer">View Smart Contract <ExternalLink size={13} /></DetailLink>
            {farm.rewards_token_address && <DetailLink href={`https://tronscan.org/#/token20/${farm.rewards_token_address}`} target="_blank" rel="noopener noreferrer">View Token Info <ExternalLink size={13} /></DetailLink>}
          </FarmDetails>}
        </FarmCard>;
      })}</FarmList>}
    </PageWrapper>
  </>;
}
