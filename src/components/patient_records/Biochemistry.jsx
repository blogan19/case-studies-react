import React, { useState } from 'react';
import Icon from './Patient_record_icon';
import Offcanvas from 'react-bootstrap/Offcanvas';
import BiochemistryTable from './patient_records_tables/biochemistry_table';

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


function Biochemistry(props) {
  
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleClick = () => setShow(true);

  //Call grouping function
  const results = props.biochemistry
  const groupedResults = group_data(results)
  console.log(groupedResults)
  
  const groupKeys = Array.from(groupedResults.keys())
  
  return (
    <>
      <td onClick={handleClick}>
        <Icon logo="bi bi-droplet-fill" title_text="Biochemistry"/>
      </td>
      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%' }}>
        <Offcanvas.Header closeButton className='blue-back text-white'>
          <Offcanvas.Title>Biochemistry</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
           {groupKeys.map((group, item) =>(
              <BiochemistryTable key={group} data={groupedResults.get(group)}/>
           ))}
           
          
              
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Biochemistry;

