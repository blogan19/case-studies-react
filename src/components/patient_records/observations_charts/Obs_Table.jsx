import React from 'react';
import Table from 'react-bootstrap/Table';

const ObsTable = ({ data }) => {
  const observations = data.observations;

  return (
    <Table>
      <tbody>
        <tr>
          <th>Date Recorded</th>
          {observations.blood_pressure.map((bp, index) => <th key={`date-${index}`}>{bp.datetime}</th>)}
        </tr>
        <tr>
          <th>Blood Pressure (mmHg)</th>
          {observations.blood_pressure.map((bp, index) => <td key={`bp-${index}`}>{bp.systolic}/{bp.diastolic}</td>)}
        </tr>
        <tr>
          <th>Heart Rate <br />(Beats per minute)</th>
          {observations.heart_rate.map((hr, index) => <td key={`hr-${index}`}>{hr.rate}</td>)}
        </tr>
        <tr>
          <th>Temperature <br />(Degrees Celsius)</th>
          {observations.temperature.map((temp, index) => <td key={`temp-${index}`}>{temp.temperature}</td>)}
        </tr>
        <tr>
          <th>Respiratory Rate <br />(Breaths per minute)</th>
          {observations.resp_rate.map((rr, index) => <td key={`rr-${index}`}>{rr.bpm}</td>)}
        </tr>
        <tr>
          <th>Oxygen Sats <br />(Percentage)</th>
          {observations.oxygen.map((oxy, index) => <td key={`oxy-${index}`}>{oxy.percentage}</td>)}
        </tr>
      </tbody>
    </Table>
  );
};

export default ObsTable;
