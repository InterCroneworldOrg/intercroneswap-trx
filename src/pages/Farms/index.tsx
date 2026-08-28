import { TransactionResponse } from '@ethersproject/providers';
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ButtonPrimary, ButtonSecondary } from '../../components/Button';
import { GreyCard, LightCard } from '../../components/Card';
import { AutoColumn } from '../../components/Column';
import { RowBetween } from '../../components/Row';
import { useActiveWeb3React } from '../../hooks';
import { useEndedFarms, EndedFarm } from '../../hooks/useStakingRegistry';
import { useWalletModalToggle } from '../../state/application/hooks';
import { useTransactionAdder } from '../../state/transactions/hooks';
import { TYPE } from '../../theme';
import { DEFAULT_FEE_LIMIT, tronAddressToEvmAddress } from '../../tron-config';
import { getContract } from '../../utils';
import { StyledHeading } from '../App';

const PageWrapper = styled(AutoColumn)`
  max-width: 840px;
  width: 100%;
  padding: 0 16px;
`;

const FarmGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FarmCard = styled(LightCard)`
  padding: 20px;
  background: ({ theme }) => theme.bg3;
`;

const StatusBadge = styled.span<{ open?: boolean }>`
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 12px;
  font-size: 12px;
  color: ({ open, theme }) => (open ? theme.primary3 : theme.text2);
  border: 1px solid ({ open, theme }) => (open ? theme.primary3 : theme.bg4);
`;

const Address = styled.div`
  color: ({ theme }) => theme.text2;
  font-size: 12px;
  overflow-wrap: anywhere;
`;

const STAKING_ABI = ['function exit()'];

function shortAddress(address: string): string {
  return `${address.slice(0, 7)}...${address.slice(-6)}`;
}

export default function Farms() {
  const { account, chainId, library } = useActiveWeb3React();
  const toggleWalletModal = useWalletModalToggle();
  const addTransaction = useTransactionAdder();
  const { farms, positionsByFarm, loading, error, refresh } = useEndedFarms(account);
  const [pendingFarm, setPendingFarm] = useState<string>();
  const [submittedFarms, setSubmittedFarms] = useState<Record<string, string>>({});
  const [transactionError, setTransactionError] = useState<string>();

  const phases = useMemo(
    () => Array.from(new Set(farms.map((farm) => farm.phase))).sort((a, b) => b - a),
    [farms],
  );

  async function exitFarm(farm: EndedFarm): Promise<void> {
    if (!chainId || !library || !account || pendingFarm) return;
    setPendingFarm(farm.farm_address);
    setTransactionError(undefined);

    try {
      const contract = getContract(
        tronAddressToEvmAddress(farm.farm_address),
        STAKING_ABI,
        library,
        account,
      );
      await contract.estimateGas.exit();
      const response: TransactionResponse = await contract.exit({ gasLimit: DEFAULT_FEE_LIMIT });
      addTransaction(response, { summary: `Exit ended farm ${farm.legacy_label}` });
      setSubmittedFarms((current) => ({ ...current, [farm.farm_address]: response.hash }));
    } catch (exitError: any) {
      if (exitError?.code !== 4001) {
        setTransactionError(exitError?.message || 'Exit transaction failed');
      }
    } finally {
      setPendingFarm(undefined);
    }
  }

  return (
    <>
      <StyledHeading>Ended Farms</StyledHeading>
      <PageWrapper gap="lg">
        <GreyCard padding="16px">
          <TYPE.body>
            These farms have ended. Connect your wallet to see positions that still require an exit.
            Farm data is loaded from the registry; only the exit transaction is sent to the blockchain.
          </TYPE.body>
        </GreyCard>

        {!account && (
          <ButtonPrimary width="260px" onClick={toggleWalletModal}>
            Connect Wallet
          </ButtonPrimary>
        )}

        {error && (
          <GreyCard padding="16px">
            <TYPE.body>{error}</TYPE.body>
            <ButtonSecondary style={{ marginTop: '12px' }} onClick={refresh}>
              Retry
            </ButtonSecondary>
          </GreyCard>
        )}

        {transactionError && (
          <GreyCard padding="16px">
            <TYPE.body>{transactionError}</TYPE.body>
          </GreyCard>
        )}

        {loading ? (
          <GreyCard padding="16px">
            <TYPE.body>Loading ended farms…</TYPE.body>
          </GreyCard>
        ) : (
          phases.map((phase) => (
            <AutoColumn key={phase} gap="md" style={{ width: '100%' }}>
              <TYPE.mediumHeader>Phase {phase}</TYPE.mediumHeader>
              <FarmGrid>
                {farms
                  .filter((farm) => farm.phase === phase)
                  .map((farm) => {
                    const position = positionsByFarm[farm.farm_address];
                    const needsExit = Boolean(position?.exit_required);
                    const submitted = submittedFarms[farm.farm_address];
                    const pending = pendingFarm === farm.farm_address;

                    return (
                      <FarmCard key={farm.farm_address}>
                        <AutoColumn gap="md">
                          <RowBetween>
                            <TYPE.mediumHeader>{farm.legacy_label}</TYPE.mediumHeader>
                            <StatusBadge open={needsExit}>{needsExit ? 'Exit required' : 'Ended'}</StatusBadge>
                          </RowBetween>
                          <TYPE.body color="text2">Historical staking phase {farm.phase}</TYPE.body>
                          <Address title={farm.farm_address}>Contract: {shortAddress(farm.farm_address)}</Address>

                          {position?.has_stake && (
                            <TYPE.body color="primary3">Staked LP tokens detected</TYPE.body>
                          )}
                          {position?.has_rewards && (
                            <TYPE.body color="primary3">Unclaimed rewards detected</TYPE.body>
                          )}

                          {needsExit && account && (
                            <ButtonPrimary
                              disabled={Boolean(pending || submitted)}
                              onClick={() => exitFarm(farm)}
                            >
                              {submitted ? 'Exit submitted' : pending ? 'Confirm in wallet…' : 'Exit & claim all'}
                            </ButtonPrimary>
                          )}
                        </AutoColumn>
                      </FarmCard>
                    );
                  })}
              </FarmGrid>
            </AutoColumn>
          ))
        )}
      </PageWrapper>
    </>
  );
}
