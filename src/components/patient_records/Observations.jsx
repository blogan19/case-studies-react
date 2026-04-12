import React, { useMemo, useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Icon from './Patient_record_icon';
import BloodPressure from './observations_charts/Blood_pressure';
import TempHR from './observations_charts/Temp_heartrate';
import RespRate from './observations_charts/resp_rate';
import ObsTable from './observations_charts/Obs_Table';

const Observations = ({ observations }) => {
  const [show, setShow] = useState(false);

  const hasObservations = useMemo(() => {
    if (!observations || typeof observations !== 'object') {
      return false;
    }

    return ['blood_pressure', 'heart_rate', 'oxygen', 'resp_rate', 'temperature'].some(
      (key) => Array.isArray(observations[key]) && observations[key].length > 0
    );
  }, [observations]);

  return (
    <>
      <td onClick={() => setShow(true)}>
        <Icon logo="bi bi-heart-pulse" title_text="Observations" />
      </td>

      <Offcanvas show={show} onHide={() => setShow(false)} style={{ width: '100%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Observations</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {hasObservations ? (
            <>
              <Container>
                <ObsTable data={{ observations }} />
              </Container>
              <BloodPressure data={{ observations }} />
              <TempHR data={{ observations }} />
              <RespRate data={{ observations }} />
            </>
          ) : (
            <Container>
              <Table className="tbl-notes container-shadow">
                <thead>
                  <tr className="blue-back text-white">
                    <th colSpan={6}>Observations</th>
                  </tr>
                  <tr>
                    <th>Date Recorded</th>
                    <th>Blood Pressure</th>
                    <th>Heart Rate</th>
                    <th>Temperature</th>
                    <th>Respiratory Rate</th>
                    <th>Oxygen Sats</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={6} className="text-center text-muted">No observations recorded yet.</td>
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

export default Observations;
