import { useContext, useEffect, useMemo, useState } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { ChainId, Pair } from '@intercroneswap/v2-sdk';
import { Link } from 'react-router-dom';
import { SwapPoolTabs } from '../../components/NavigationTabs';
import FullPositionCard from '../../components/PositionCard';
import { useTokenBalancesWithLoadingIndicator } from '../../state/wallet/hooks';
import { StyledInternalLink, ExternalLink, TYPE, HideSmall, Divider, Button, isMobile } from '../../theme';
import Card, { GreyCard, LightCard } from '../../components/Card';
import { AutoRow, RowBetween } from '../../components/Row';
import { ButtonPrimary, ButtonSecondary } from '../../components/Button';
import { AutoColumn } from '../../components/Column';
import { useActiveWeb3React } from '../../hooks';
import { usePairs } from '../../data/Reserves';
import { useAsyncV1LiquidityTokens, useTrackedTokenPairs } from '../../state/user/hooks';
import { Dots } from '../../components/swap/styleds';
import { CardSection, DataCard, CardNoise } from '../../components/vote/styled';
import { useWalletModalToggle } from '../../state/application/hooks';
import { StyledHeading } from '../App';
import { BACKEND_URL } from '../../constants';
import { currencyFormatter } from '../../utils';
import useInterval from '../../hooks/useInterval';

const PageWrapper = styled(AutoColumn)`
  max-width: 840px;
  width: 100%;
`;

const VoteCard = styled(DataCard)`
  background: ${({ theme }) => theme.voteCardColor};
  overflow: hidden;
`;

const TitleRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-wrap: wrap;
    gap: 12px;
    width: 100%;
    flex-direction: column-reverse;
  `};
`;

const ButtonRow = styled.div`
  box-sizing: border-box;
  margin: 0;
  min-width: 0;
  display: -webkit-box;
  display: -webkit-flex;
  display: -ms-flexbox;
  display: flex;
  padding: 0;
  -webkit-align-items: center;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  -webkit-box-pack: justify;
  -webkit-justify-content: space-between;
  -ms-flex-pack: justify;
  justify-content: space-between;
  gap: 8px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
     width: 100%;
     flex-direction: row-reverse;
     justify-content: space-between;
   `};
`;

const ResponsiveButtonPrimary = styled(ButtonPrimary)`
  width: fit-content;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 48%;
  `};
`;

const ResponsiveButtonSecondary = styled(ButtonSecondary)`
  width: fit-content;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 48%;
  `};
`;

export default function Pool() {
  const theme = useContext(ThemeContext);
  const { account, chainId } = useActiveWeb3React();

  const trackedTokenPairs = useTrackedTokenPairs();
  const tokenPairsWithLiquidityTokens = useAsyncV1LiquidityTokens(trackedTokenPairs);
  const [totalValueLocked, setTotalValueLocked] = useState('');

  const fetchData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/markets/totalLocked?chainId=${chainId && ChainId.MAINNET}`);
      const responseData = await response.json();
      setTotalValueLocked(responseData.data.usdAmount);
    } catch (error) {
      console.error('Error fetching totalLocked:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [chainId]);

  useInterval(() => {
    fetchData();
  }, 1000 * 30);

  const liquidityTokens = useMemo(
    () => tokenPairsWithLiquidityTokens.map((tpwlt) => tpwlt.liquidityToken),
    [tokenPairsWithLiquidityTokens],
  );
  const [v1PairsBalances, fetchingV1PairBalances] = useTokenBalancesWithLoadingIndicator(
    account ?? undefined,
    liquidityTokens,
  );

  const liquidityTokensWithBalances = useMemo(
    () =>
      tokenPairsWithLiquidityTokens.filter(({ liquidityToken }) =>
        v1PairsBalances[liquidityToken.address]?.greaterThan('0'),
      ),
    [tokenPairsWithLiquidityTokens, v1PairsBalances],
  );

  const v1Pairs = usePairs(liquidityTokensWithBalances.map(({ tokens }) => tokens));
  const v1IsLoading =
    fetchingV1PairBalances ||
    v1Pairs?.length < liquidityTokensWithBalances.length ||
    v1Pairs?.some((V1Pair) => !V1Pair);

  const allV1PairsWithLiquidity = v1Pairs.map(([, pair]) => pair).filter((v1Pair): v1Pair is Pair => Boolean(v1Pair));

  const toggleWalletModal = useWalletModalToggle();

  return (
    <>
      <StyledHeading className="lptext">Liquidity Pool</StyledHeading>
      <AutoRow justify="center" gap="1rem" style={{ marginBottom: isMobile ? '.5rem' : '2rem' }}>
        <TYPE.white fontSize="1.3rem">Total value locked</TYPE.white>
        <TYPE.yellow fontSize="1.3rem">{currencyFormatter.format(Number(totalValueLocked))}</TYPE.yellow>
      </AutoRow>

      <PageWrapper>
        <VoteCard>
          <CardNoise />
          <CardSection className="hideinmobile">
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.white fontWeight={600}>Liquidity provider rewards</TYPE.white>
              </RowBetween>
              <RowBetween>
                <TYPE.white fontSize={14}>
                  {`Liquidity providers earn a 0.2% fee on all trades proportional to their share of the pool. Fees are added to the pool, accrue in real time and can be claimed by withdrawing your liquidity.`}
                </TYPE.white>
              </RowBetween>
              <ExternalLink
                style={{ color: 'white', textDecoration: 'underline' }}
                target="_blank"
                href="https://docs.intercroneswap.finance/faq/advantage-of-adding-liquidity"
              >
                <TYPE.white fontSize={14}>Read more about providing liquidity</TYPE.white>
              </ExternalLink>
            </AutoColumn>
          </CardSection>
          <CardNoise />
        </VoteCard>
        <LightCard style={{ marginTop: '20px' }} id="lightcard">
          <Card style={{ width: '100%', padding: '0', margin: '0 auto', maxWidth: '560px' }} className="hideinmobile">
            <SwapPoolTabs active={'pool'} />
          </Card>
          {!account ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button style={{ maxWidth: '260px' }} onClick={toggleWalletModal}>
                Connect Wallet
              </Button>
            </div>
          ) : (
            <AutoColumn>
              <AutoRow gap={'20px'} style={{ margin: 0 }} justify="space-between" id="liqimp">
                <StyledInternalLink to="/add/TRX" style={{ flexGrow: 1, width: 'auto' }}>
                  <Button>Add Liquidity</Button>
                </StyledInternalLink>
                <StyledInternalLink style={{ flexGrow: 1, width: 'auto' }} to="/find">
                  <Button>Import</Button>
                </StyledInternalLink>
              </AutoRow>
            </AutoColumn>
          )}
          <AutoColumn gap="lg" justify="center">
            <AutoColumn gap="lg" style={{ width: '100%' }}>
              <div className="hideinmobile">
                <TitleRow style={{ marginTop: '1rem' }} padding={'0'}>
                  <HideSmall>
                    <TYPE.mediumHeader style={{ marginTop: '0.5rem', justifySelf: 'flex-start' }}>
                      Your liquidity
                    </TYPE.mediumHeader>
                  </HideSmall>
                  <ButtonRow style={{ display: 'none' }}>
                    <ResponsiveButtonSecondary as={Link} padding="6px 8px" to="/create/TRX">
                      Create a pair
                    </ResponsiveButtonSecondary>
                    <ResponsiveButtonPrimary id="join-pool-button" as={Link} padding="6px 8px" to="/add/TRX">
                      <TYPE.white fontWeight={500} fontSize={16}>
                        Add Liquidity
                      </TYPE.white>
                    </ResponsiveButtonPrimary>
                  </ButtonRow>
                </TitleRow>
                <Divider />
              </div>

              {!account ? (
                <GreyCard padding="12px">
                  <TYPE.body color={theme.text1} textAlign="left">
                    Connect to a wallet to view your liquidity.
                  </TYPE.body>
                </GreyCard>
              ) : v1IsLoading ? (
                <GreyCard padding="12px">
                  <TYPE.body color={theme.text1} textAlign="left">
                    <Dots>Loading</Dots>
                  </TYPE.body>
                </GreyCard>
              ) : allV1PairsWithLiquidity?.length > 0 ? (
                <>
                  {allV1PairsWithLiquidity.map((v1Pair) => (
                    <FullPositionCard key={v1Pair.liquidityToken.address} pair={v1Pair} />
                  ))}
                </>
              ) : (
                <GreyCard style={{ padding: '12px' }}>
                  <TYPE.body color={theme.text1} textAlign="left">
                    No liquidity found.
                  </TYPE.body>
                </GreyCard>
              )}
            </AutoColumn>
          </AutoColumn>
        </LightCard>
      </PageWrapper>
    </>
  );
}
