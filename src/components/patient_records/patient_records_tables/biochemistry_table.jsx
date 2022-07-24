import React from 'react';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';


function BiochemistryTable(props) {  
    //get category name and longest length of a row
    const category = props.data[0].category
    const maxWidth = Math.max(...props.data.map((item) => item['results'].length))

    const table_rows = props.data.map((item) => (
        <React.Fragment key={item['name']}>
            <tr className='lightblue-back'>
                <th colSpan={item['results'].length}>
                    {item['name']}  ({item['range']}) {item['unit']}
                </th>
            </tr>
            <tr>
                {item['results'].map((result)=> 
                    <td key={`${result.datetime}_${result.name}`}>{result.datetime}</td>
                )}
            </tr>
            <tr>
                {item['results'].map((result)=> 
                    <td key={`${result.result}_${result.datetime}`}>{result.result}</td>
                )}
            </tr>
        </React.Fragment>
    )
        
    )

  return (
    <Container>
        <Table  className='tbl-notes container-shadow'>
           <thead>
                <tr className="blue-back text-white" >
                    <th colSpan={maxWidth}>{category}</th>
                </tr>
           </thead>
           <tbody>
                {table_rows}
            </tbody>
        </Table>
    </Container>
  );
}

export default BiochemistryTable;
