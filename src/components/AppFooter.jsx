import React from 'react';
import Container from 'react-bootstrap/Container';
import auxtechnaLogo from '../lib/auxtechna-logo.png';

const AppFooter = ({ onOpenPrivacyPolicy }) => {
  return (
    <footer className="app-footer">
      <Container>
        <div className="app-footer__row">
          <div className="app-footer__brand">
            <img src={auxtechnaLogo} alt="Auxtechna" className="app-footer__logo" />
            <span>2026 Auxtechna Ltd</span>
          </div>
          <div className="app-footer__meta">
            <button type="button" className="app-footer__link-button" onClick={onOpenPrivacyPolicy}>
              Privacy Policy
            </button>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default AppFooter;
