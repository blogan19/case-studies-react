import React from 'react';
import Container from 'react-bootstrap/Container';
import auxtechnaLogo from '../lib/auxtechna-logo.png';

const AppFooter = () => {
  return (
    <footer className="app-footer">
      <Container>
        <div className="app-footer__row">
          <div className="app-footer__brand">
            <img src={auxtechnaLogo} alt="Auxtechna" className="app-footer__logo" />
            <span>2026 Demo NHS Trust</span>
            <span>
              {' - '}
              <a href="mailto:patientportal@homecareconnects.co.uk">patientportal@homecareconnects.co.uk</a>
            </span>
          </div>
          <div className="app-footer__meta">
            <a href="/Legal/PrivacyPolicy">Privacy Policy</a>
            <span>Powered by HomeCare Connects</span>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default AppFooter;
