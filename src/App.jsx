import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './style.css';
import CaseStudyDisplay from './Case_study_display';
import CaseStudyEdit from './Case_study_edit';


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
          <Route path="/" element={<CaseStudyDisplay />}></Route>
          <Route path="/create" element={<CaseStudyEdit/>}></Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
