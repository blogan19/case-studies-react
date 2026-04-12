import React from 'react';

const StudentTile = ({ title, description, icon, eyebrow, onClick, variant = 'default' }) => {
  return (
    <button type="button" className={`student-tile student-tile--${variant}`} onClick={onClick}>
      <div className="student-tile__inner">
        {eyebrow ? <span className="student-tile__eyebrow">{eyebrow}</span> : <span className="student-tile__eyebrow">&nbsp;</span>}
        <div className="student-tile__icon-wrap" aria-hidden="true">
          <i className={`student-tile__icon ${icon}`} />
        </div>
        <div className="student-tile__body">
          <h3 className="student-tile__title">{title}</h3>
          <p className="student-tile__copy">{description}</p>
        </div>
      </div>
    </button>
  );
};

export default StudentTile;
