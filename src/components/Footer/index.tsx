import { Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Style from '../../styles/footer.module.css';
import icr500dark from '../../assets/images/icr500dark.png';
import styled from 'styled-components';
import Twitter from '../../assets/svg/Twitter_white.svg';
import Telegram from '../../assets/svg/Telegram_white.svg';
import Facebook from '../../assets/svg/Facebook_white.svg';
import Instagram from '../../assets/svg/Instagram_white.svg';
import Youtube from '../../assets/svg/Youtube_white.svg';
import { Divider, ExternalLink } from '../../theme';
import PriceCard from '../PriceCard';
import { FooterBlockchains } from '../Blockchains';

const FooterWithChess = styled.div`
  background: url(${icr500dark});
  background-repeat: no-repeat;
  background-position: 100% center;
  background-size: contain;
  @media (max-width: 768px) {
    .row div:nth-child(3),
    .row div:nth-child(4) {
      margin-top: 20px;
    }
  }
`;
const FootContent = styled.div`
  display: flex;
  padding: 35px;
  justify-content: space-between;
  width: 85%;

  @media (max-width: 768px) {
    flex-direction: column;
    justify-content: start;
    width: 100%;
  }
`;
export const SocialIconWrapper = styled.div`
  display: flex;
  justify-content: center;
  a {
    padding: 15px;
  }
`;
export const MenuItem = styled(ExternalLink)`
  flex: 1;
  color: black;

  > svg {
    background: white;
    margin: 0 10px;
    width: 35px;
    height: 35px;
    padding: 7px;
    border-radius: 50%;
  }
`;
const Footer = () => {
  return (
    <Container
    // justify="center"
    // gap="1rem"
    // padding={isMobile ? '2rem 2rem' : '5rem 2rem 0rem 10rem'}
    // style={{ width: '100%' }}
    >
      <FooterWithChess>
        <Row>
          <Col md={3}>
            <p className={Style.iswap}>ISwap</p>
            <ul className={Style.ul}>
              <li>
                <Link to="/swap" className={`${Style.link} nav-link`}>
                  Exchange
                </Link>
              </li>
              <li>
                <Link to="/pool" className={`${Style.link} nav-link`}>
                  Liquidity
                </Link>
              </li>
              <li>
                <Link to="/stake" className={`${Style.link} nav-link`}>
                  Staking
                </Link>
              </li>
              {/* <li>
              <Link to="/dashboard" className={`${Style.link} nav-link`}>
                Dashboard
              </Link>
            </li> */}
              <li>
                <Link to="/nft" className={`${Style.link} nav-link`}>
                  NFT
                </Link>
              </li>
              <li>
                <Link to="/markets" className={`${Style.link} nav-link`}>
                  Market
                </Link>
              </li>
            </ul>
          </Col>
          <Col md={3}>
            <p className={Style.footerheader}>About</p>
            <ul className={Style.ul}>
              <li>
                <ExternalLink
                  href="https://docs.intercroneswap.finance/security/audits"
                  className={`${Style.link} nav-link`}
                >
                  Audit
                </ExternalLink>
              </li>
              {/* <li>
              <Link to="/white-paper" className={`${Style.link} nav-link`}>
                White Paper
              </Link>
            </li> */}
              <li>
                <ExternalLink href="https://docs.intercroneswap.finance" className={`${Style.link} nav-link`}>
                  FAQ
                </ExternalLink>
              </li>

              <li>
                <ExternalLink
                  href="https://docs.intercroneswap.finance/road-map/roadmap"
                  className={`${Style.link} nav-link`}
                >
                  Roadmap
                </ExternalLink>
              </li>
              <li>
                <ExternalLink
                  href="https://docs.intercroneswap.finance/faq/how-to-swap-trade-token"
                  className={`${Style.link} nav-link`}
                >
                  Trading Guide
                </ExternalLink>
              </li>
            </ul>
          </Col>
          <Col md={3}>
            <p className={Style.footerheader}>Blockchains</p>
            <FooterBlockchains />
          </Col>
          <Col md={3} className="lastcol">
            <p className={Style.footerheader}>Developers</p>
            <ul className={Style.ul}>
              <li>
                <ExternalLink href="https://docs.intercroneswap.finance" className={`${Style.link} nav-link`}>
                  Documentation
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href="https://github.com/InterCroneworldOrg" className={`${Style.link} nav-link`}>
                  Github
                </ExternalLink>
              </li>
            </ul>
          </Col>
        </Row>
      </FooterWithChess>

      <Divider />
      <FootContent>
        <PriceCard />
        <SocialIconWrapper>
          <MenuItem id="twLink" href="https://twitter.com/IntercroneWorld" title="Twitter">
            <img src={Twitter} alt="Twitter Logo" />
          </MenuItem>
          <MenuItem id="iglink" href="https://www.instagram.com/intercrone" title="Instagram">
            <img src={Instagram} alt="Instagram Logo" />
          </MenuItem>
          <MenuItem id="fblink" href="https://www.facebook.com/InterCrone" title="Facebook">
            <img src={Facebook} alt="Facebook Logo" />
          </MenuItem>
          <MenuItem id="tglink" href="https://t.me/intercroneworld" title="Telegram">
            <img src={Telegram} alt="Telegram Logo" />
          </MenuItem>
          <MenuItem id="ytlink" href="https://www.youtube.com/c/InterCroneWorld" title="YouTube">
            <img src={Youtube} alt="YouTube Logo" />
          </MenuItem>
        </SocialIconWrapper>
      </FootContent>
    </Container>
  );
};

export default Footer;
