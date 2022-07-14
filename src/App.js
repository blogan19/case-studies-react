import NavBar from './components/NavBar';
import PatientDetails from './components/Patient_details';
import CaseInstructions from './components/CaseInstructions';
import ObservationsBanner from './components/observations/observationsBanner';
import Prescription from './components/prescriptions/Prescription';
//import MCQ from './components/questions/MCQ';
import Example from './components/observations/biochemistry';
import data from './case_study.json'

const App = () => {
  return (
    
    <>
      <NavBar/>
      <PatientDetails firstname={data.patient.firstname} surname={data.patient.surname} hospitalNo={data.patient.hospitalNo} dob={data.patient.dob} address={data.patient.address} weight={data.patient.weight} height={data.patient.height} allergies={data.allergies} />
      <CaseInstructions instructions={data.case_instructions}/>
      <ObservationsBanner />
      <Prescription prescriptions={data.prescriptionList}/>
      <Example />
    </>
  );
  
}

export default App;
