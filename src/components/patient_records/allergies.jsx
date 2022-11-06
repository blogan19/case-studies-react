import React from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';

const Allergies = (props) => {
  const allergies = props.allergyList;
  const rowList = allergies.map((allergy) => (
    <tr>
      <td key={allergy.drug} colSpan={2} >
        {allergy.drug} {allergy.reaction}
      </td>
    </tr>
  ));

  return (
    <>
      <Container className="mt-3">
        <Table bordered className='container-shadow'>
          <tbody>
            <tr>
              <td rowSpan={rowList.length}>
                <i className="allergy-text">Allergies</i>
              </td>
              <td colSpan={2}>
                             
                  {rowList}                 
                
              </td>
            </tr>
          </tbody>
        </Table>
      </Container>
    </>
  );
}

export default Allergies;
