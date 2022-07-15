import NavBar from './components/NavBar';
import PatientDetails from './components/Patient_details';
import CaseInstructions from './components/CaseInstructions';
import ObservationsOffCanvas from './components/observations/ObservationsOffCanvas';
import Prescription from './components/prescriptions/Prescription';
//import MCQ from './components/questions/MCQ';
import data from './case_study.json'

const App = () => {
  return (
    
    <>
      <NavBar/>
      <PatientDetails firstname={data.patient.firstname} surname={data.patient.surname} hospitalNo={data.patient.hospitalNo} dob={data.patient.dob} address={data.patient.address} weight={data.patient.weight} height={data.patient.height} allergies={data.allergies} />
      <CaseInstructions instructions={data.case_instructions}/>
      <ObservationsOffCanvas />
      <Prescription prescriptions={data.prescriptionList}/>
    </>
  );
  
}

export default App;
