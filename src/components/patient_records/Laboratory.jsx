import React, { useMemo, useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Icon from './Patient_record_icon';
import BiochemistryTable from './patient_records_tables/biochemistry_table';
import MicrobiologyTable from './patient_records_tables/MicrobiologyTable';

const groupData = (results = {}) => {
  const groupedResults = new Map();

  Object.keys(results).forEach((key) => {
    const result = results[key];
    const groupKey = result.category;
    const existing = groupedResults.get(groupKey) || [];
    groupedResults.set(groupKey, [...existing, result]);
  });

  return groupedResults;
};

const Laboratory = ({ biochemistry = {}, microbiology = [] }) => {
  const [show, setShow] = useState(false);
  const groupedResults = useMemo(() => groupData(biochemistry), [biochemistry]);
  const groupKeys = Array.from(groupedResults.keys());
  const hasResults = Object.keys(biochemistry).length > 0 || microbiology.length > 0;

  return (
    <>
      <td onClick={() => setShow(true)}>
        <Icon logo="bi bi-droplet-fill" title_text="Results" />
      </td>
      <Offcanvas show={show} onHide={() => setShow(false)} style={{ width: '100%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Results</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {hasResults ? (
            <>
              {microbiology.length > 0 ? <MicrobiologyTable results={microbiology} /> : null}
              {groupKeys.map((group) => <BiochemistryTable key={group} data={groupedResults.get(group)} />)}
            </>
          ) : (
            <Container>
              <Table className="tbl-notes container-shadow">
                <thead>
                  <tr className="blue-back text-white">
                    <th colSpan={3}>Results</th>
                  </tr>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="text-center text-muted">No results recorded yet.</td>
                  </tr>
                </tbody>
              </Table>
            </Container>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default Laboratory;
