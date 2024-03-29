import { useActiveWeb3React } from '../../hooks';
import useUSDTPrice from '../../hooks/useUSDTPrice';
import { AmountWrapper } from './styleds';
import icr100 from '../../assets/images/icr100.png';
import { ICR } from '../../constants/tokens';

const PriceCard = () => {
  const { account } = useActiveWeb3React();

  const usdtPrice = useUSDTPrice(ICR);

  return account && usdtPrice ? (
    <AmountWrapper>
      <span>
        <img width={20} src={icr100} alt="" style={{ marginRight: '6px' }} />
      </span>
      $ {usdtPrice?.adjusted.toFixed(4)} USD
    </AmountWrapper>
  ) : null;
};

export default PriceCard;
