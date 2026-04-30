import React from "react";
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';

const MicrobiologyTable = (props) => {
    const results = props.results || [];
    return(
        <Container>
            <Table className='tbl-notes container-shadow text-break'>
                <thead>
                    <tr className="blue-back text-white">
                        <th colSpan={2}>Microbiology</th>
                    </tr>
                </thead>
                <tbody>
            {results.map((result, resultIndex) =>(
                        <React.Fragment key={`result-${resultIndex}`}>
                        <tr>
                            <td>
                               <p><strong>Type:</strong>{result.sample_type}</p>
                               <p><strong>Date:</strong> {result.datetime}</p>
                               <p><strong>Growth:</strong> {result.growth}</p>
                            </td>
                            <td>
                                {(result.sensitivities || []).map((sens, sensIndex) =>(
                                    <p key={`${resultIndex}-${sensIndex}`}>{sens[0]}:  {sens[1]}</p>
                                ))
                                }
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2}>{result.notes}</td>
                        </tr>
                        </React.Fragment>
            
            ))}
                </tbody>
            </Table>
        </Container>
    )
}
export default MicrobiologyTable
