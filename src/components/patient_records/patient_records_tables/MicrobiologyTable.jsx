import React from "react";
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';

const MicrobiologyTable = (props) => {
    const results = props.results
    console.log(props)
    return(
        <Container>
            <Table className='tbl-notes container-shadow text-break'>
                <thead>
                    <tr className="blue-back text-white">
                        <th colSpan={2}>Microbiology</th>
                    </tr>
                </thead>
            {results.map( (result) =>(
                
                    <tbody>
                        <tr>
                            <td>
                               <p><strong>Type:</strong>{result.sample_type}</p>
                               <p><strong>Date:</strong> {result.datetime}</p>
                               <p><strong>Growth:</strong> {result.growth}</p>
                            </td>
                            <td>
                                {result.sensitivities.map((sens) =>(
                                    <p>{sens[0]}:  {sens[1]}</p>
                                ))
                                }
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2}>{result.notes}</td>
                        </tr>
                    </tbody>
                
            ))}
                
            </Table>
        </Container>
    )
}
export default MicrobiologyTable