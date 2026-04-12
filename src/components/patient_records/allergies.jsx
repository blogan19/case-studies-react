import React from 'react';
import Table from 'react-bootstrap/Table';

const Allergies = ({ allergyList, allergyHistory = [], admittedAt, onOpenManagement }) => {
  const allergies = Array.isArray(allergyList) ? allergyList : [];
  const history = Array.isArray(allergyHistory) ? allergyHistory : [];
  const latestReview = history
    .filter((entry) => String(entry?.action || '').trim().toLowerCase() === 'reviewed')
    .sort((left, right) => new Date(right?.timestamp || 0).getTime() - new Date(left?.timestamp || 0).getTime())[0] || null;
  const admissionTime = admittedAt ? new Date(admittedAt).getTime() : NaN;
  const reviewTime = latestReview?.timestamp ? new Date(latestReview.timestamp).getTime() : NaN;
  const reviewedThisAdmission = Number.isFinite(admissionTime) && Number.isFinite(reviewTime) ? reviewTime >= admissionTime : Boolean(latestReview);
  const reviewLabel = latestReview
    ? `Last Review: ${new Date(latestReview.timestamp).toLocaleString('en-GB')}`
    : 'Allergies not reviewed this admission';
  const reviewClassName = reviewedThisAdmission ? 'text-muted' : 'text-danger';

  return (
    <div className="mt-3">
      <Table
        bordered
        className={`container-shadow epma-summary-table mb-0 ${onOpenManagement ? 'epma-summary-table--interactive' : ''}`}
        role={onOpenManagement ? 'button' : undefined}
        tabIndex={onOpenManagement ? 0 : undefined}
        onClick={onOpenManagement}
        onKeyDown={onOpenManagement ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenManagement();
          }
        } : undefined}
      >
        <tbody>
          {allergies.length ? allergies.map((allergy, index) => (
            <tr key={`${allergy.drug}-${allergy.reaction}-${index}`}>
              {index === 0 ? (
                <td rowSpan={allergies.length}>
                  <i className="allergy-text">Allergies</i>
                  <div className={`small mt-1 ${reviewClassName} allergy-review-text`}>{reviewLabel}</div>
                </td>
              ) : null}
              <td>{allergy.drug || 'Unspecified allergen'}</td>
              <td>{allergy.reaction || 'Reaction not recorded'}</td>
            </tr>
          )) : (
            <tr>
              <td>
                <i className="allergy-text">Allergies</i>
                <div className={`small mt-1 ${reviewClassName}`}>{reviewLabel}</div>
              </td>
              <td colSpan={2} className="text-danger">No allergy status recorded</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default Allergies;
