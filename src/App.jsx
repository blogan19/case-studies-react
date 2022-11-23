import React, { useState } from 'react';
import NavBar from './components/NavBar';
import './style.css';
import CaseStudyDisplay from './Case_study_display';
import CaseStudyEdit from './Case_study_edit';


const App = () => {
  const [displayShow, setdisplayShow] = useState(true)
  return (
    <>
    {displayShow === true ? (
      <>
      <NavBar setCreate={setdisplayShow} navType={'display'}/>
        <CaseStudyDisplay />
        </>
    ):(
      <>
        <NavBar setCreate={setdisplayShow} navType={'create'}/>
        <CaseStudyEdit/>
      </>
    )}
  
    </>
  );
};

export default App;
