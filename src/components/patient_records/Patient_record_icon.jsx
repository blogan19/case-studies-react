import React, { useState } from 'react';

function Icon(props) {
  let classes =  `${props.logo} icon-style`
  return (
    <>
        <div xs={12}>
          <i
            className={classes}
            alt="case notes"
          ></i>
        </div>
        <div sm={12} className="text-muted">
          {props.title_text}
        </div>
    </>
  );
}

export default Icon;
