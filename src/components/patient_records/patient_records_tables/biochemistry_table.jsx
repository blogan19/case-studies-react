import React from 'react';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';

const BiochemistryTable = ({ data }) => {
  const category = data[0].category;
  const maxWidth = Math.max(...data.map((item) => item.results.length));

  return (
    <Container>
      <Table className="tbl-notes container-shadow">
        <thead>
          <tr className="blue-back text-white"><th colSpan={maxWidth}>{category}</th></tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <React.Fragment key={item.name}>
              <tr className="lightblue-back">
                <th colSpan={maxWidth}>{item.name} ({item.range}) {item.unit}</th>
              </tr>
              <tr>
                {item.results.map((result, index) => <td key={`${item.name}-date-${index}`}>{result.datetime}</td>)}
              </tr>
              <tr>
                {item.results.map((result, index) => <td key={`${item.name}-result-${index}`}>{result.result}</td>)}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default BiochemistryTable;
