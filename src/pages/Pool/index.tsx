import { useContext, useMemo } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { Pair, Token } from '@intercroneswap/v2-sdk';
import { Link } from 'react-router-dom';
import { SwapPoolTabs } from '../../components/NavigationTabs';
import FullPositionCard from '../../components/PositionCard';
import { StyledInternalLink, ExternalLink, TYPE, HideSmall, Divider, Button } from '../../theme';
import Card, { GreyCard, LightCard } from '../../components/Card';
import { AutoRow, RowBetween } from '../../components/Row';
import { ButtonPrimary, ButtonSecondary } from '../../components/Button';
import { AutoColumn } from '../../components/Column';
import { useActiveWeb3React } from '../../hooks';
import { PairState, usePairsByAddresses } from '../../data/Reserves';
import { Dots } from '../../components/swap/styleds';
import { CardSection, DataCard, CardNoise } from '../../components/vote/styled';
import { useWalletModalToggle } from '../../state/application/hooks';
import { StyledHeading } from '../App';
import { useWalletLiquidityRegistry } from '../../hooks/useMarketRegistry';
import { tronAddressToEvmAddress } from '../../tron-config';
import { useAllTokens } from '../../hooks/Tokens';

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
  const allTokens = useAllTokens();
  const {
    positions: registryPositions,
    loading: registryLoading,
    error: registryError,
    refresh: refreshRegistry,
  } = useWalletLiquidityRegistry(account);

  const registryPairs = useMemo(() => {
    if (!chainId) return [];
    return registryPositions.flatMap((position) => {
      try {
        const token0Address = tronAddressToEvmAddress(position.token0_address);
        const token1Address = tronAddressToEvmAddress(position.token1_address);
        const token0 =
          allTokens[token0Address] ||
          new Token(
            chainId,
            token0Address,
            Number(position.token0_decimals),
            position.token0_symbol,
            position.token0_name,
          );
        const token1 =
          allTokens[token1Address] ||
          new Token(
            chainId,
            token1Address,
            Number(position.token1_decimals),
            position.token1_symbol,
            position.token1_name,
          );
        return [
          {
            pairAddress: tronAddressToEvmAddress(position.pair_address),
            tokens: [token0, token1] as [Token, Token],
          },
        ];
      } catch (error) {
        console.warn('Ignoring invalid market registry position', position.pair_address, error);
        return [];
      }
    });
  }, [allTokens, chainId, registryPositions]);

  const v1Pairs = usePairsByAddresses(registryPairs);
  const v1IsLoading = registryLoading || v1Pairs.some(([state]) => state === PairState.LOADING);
  const allV1PairsWithLiquidity = v1Pairs
    .filter(([state]) => state === PairState.EXISTS)
    .map(([, pair]) => pair)
    .filter((pair): pair is Pair => Boolean(pair));

  const toggleWalletModal = useWalletModalToggle();

  return (
    <>
      <StyledHeading className="lptext">Liquidity Pool</StyledHeading>

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
              ) : registryError ? (
                <GreyCard padding="12px">
                  <TYPE.body color={theme.text1} textAlign="left">
                    Market registry unavailable. {registryError}
                  </TYPE.body>
                  <Button style={{ marginTop: '12px' }} onClick={refreshRegistry}>
                    Retry
                  </Button>
                </GreyCard>
              ) : v1IsLoading ? (
                <GreyCard padding="12px">
                  <TYPE.body color={theme.text1} textAlign="left">
                    <Dots>Loading positions</Dots>
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
