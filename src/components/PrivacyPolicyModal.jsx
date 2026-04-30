import React from 'react';
import Modal from 'react-bootstrap/Modal';

const PrivacyPolicyModal = ({ show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Privacy Policy</Modal.Title>
      </Modal.Header>
      <Modal.Body className="privacy-policy-modal">
        <p>
          This privacy policy explains how MediCase by Auxtechna handles personal information within the
          teaching platform. It is intended for demonstration and pilot deployment use and should be reviewed
          before production use in any live educational or healthcare environment.
        </p>

        <h5>Who we are</h5>
        <p>
          MediCase is a clinical case study, prescribing simulation, and teaching platform operated by Auxtechna
          Ltd. The platform is designed to support student learning, facilitator authoring, live teaching, and
          review of submitted work.
        </p>

        <h5>What information we collect</h5>
        <p>Depending on how the platform is used, we may collect and store:</p>
        <ul>
          <li>User account details such as name, email address, role, and login credentials.</li>
          <li>Case study content created by facilitators, including authored patient scenarios and learning content.</li>
          <li>Student responses, scores, feedback, and session history.</li>
          <li>Audit information such as timestamps, access activity, and administration actions within the platform.</li>
          <li>Configuration data for prescribing libraries, routes, frequencies, indications, units, and forms.</li>
        </ul>

        <h5>How we use information</h5>
        <p>We use information within the platform to:</p>
        <ul>
          <li>Provide access to student, facilitator, and admin features.</li>
          <li>Support teaching, assessment, case authoring, and feedback workflows.</li>
          <li>Maintain prescribing dictionaries and educational content libraries.</li>
          <li>Track learner progress, review attempts, and support live classroom delivery.</li>
          <li>Investigate errors, monitor usage, and improve the platform.</li>
        </ul>

        <h5>Educational and simulated data</h5>
        <p>
          The platform is intended to use simulated or educational patient data. It should not be relied on as a
          repository for real patient-identifiable information unless appropriate governance, contracts, technical
          controls, and legal approvals are in place.
        </p>

        <h5>Sharing and access</h5>
        <p>
          Access to content is controlled by authenticated accounts and role-based permissions. Facilitators can
          make case studies available to students, and authorised users may be able to review activity and
          submissions related to those case studies.
        </p>

        <h5>Storage and retention</h5>
        <p>
          Data entered into the platform is stored in the application database for as long as needed to support the
          educational service, internal review, troubleshooting, and any configured retention arrangements. Local
          browser storage may also be used for session continuity and interface state.
        </p>

        <h5>Security</h5>
        <p>
          We aim to protect information through account authentication, role controls, and standard technical
          safeguards. Even so, no web platform can guarantee absolute security, and organisations using the system
          should complete their own governance, security, and data protection review before wider rollout.
        </p>

        <h5>Your responsibilities</h5>
        <p>Users and deploying organisations should ensure that:</p>
        <ul>
          <li>Only appropriate educational or authorised data is entered into the platform.</li>
          <li>Accounts are used only by the named user and passwords are kept secure.</li>
          <li>Any use involving real patient data is subject to local policy, lawful basis, and governance approval.</li>
        </ul>

        <h5>Contact</h5>
        <p>
          For questions about privacy, governance, or deployment of the platform, contact Auxtechna Ltd through
          your implementation or project lead.
        </p>

        <p className="mb-0 text-muted small">
          Last updated: 18 April 2026
        </p>
      </Modal.Body>
    </Modal>
  );
};

export default PrivacyPolicyModal;
