import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';

function Allergies(props) {
  const allergies = props.allergyList;
  const rowList = allergies.map((allergy) => (
    <tr>
      <td key={allergy} colSpan={2} >
        {allergy}
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
              <td colSpan={2} >{rowList[0]}</td>
            </tr>
            {rowList.pop()}
          </tbody>
        </Table>
      </Container>
    </>
  );
}

export default Allergies;
