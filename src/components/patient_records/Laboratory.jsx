import React, { useState } from 'react';
import Icon from './Patient_record_icon';
import Offcanvas from 'react-bootstrap/Offcanvas';
import BiochemistryTable from './patient_records_tables/biochemistry_table';
import MicrobiologyTable from './patient_records_tables/MicrobiologyTable';

const group_data = (results) =>{
  //Create map to group elements by their category e.g. FBC
  const groupedResults = new Map()
  Object.keys(results).map((x) => {
      //use category as a key for map
      const result = results[x]
      const key = result.category
      //check if key already exists
      if (groupedResults.get(key) === undefined){
          //set new key with array
          groupedResults.set(key, [result] )
      }else{
        //push item to existing array and reset key
        const arr = groupedResults.get(key);
        arr.push(result)
        groupedResults.set(key, arr)
      }
    } 
  )
  return groupedResults;
}


const Laboratory = (props) => {
  
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleClick = () => setShow(true);

  //Microbiology
  const microbiology_results = props.microbiology

  //Call grouping function on biochemistry results groups results by their type e.g. FBC
  const biochemistry_results = props.biochemistry
  const groupedResults = group_data(biochemistry_results)
  const groupKeys = Array.from(groupedResults.keys())
  
  return (
    <>
      <td onClick={handleClick}>
        <Icon logo="bi bi-droplet-fill" title_text="Lab Results"/>
      </td>
      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%' }}>
        <Offcanvas.Header closeButton className='blue-back text-white'>
          <Offcanvas.Title>Laboratory Results</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
           <MicrobiologyTable results={microbiology_results}></MicrobiologyTable>
           {groupKeys.map((group) =>(
              <BiochemistryTable key={group} data={groupedResults.get(group)}/>
           ))}              
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Laboratory;

