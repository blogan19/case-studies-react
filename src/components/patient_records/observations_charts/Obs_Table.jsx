import React from "react";
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Table from 'react-bootstrap/Table';

const ObsTable = (props) => {

    const dates = props.data.observations.blood_pressure.map((bp)=> (
        <th>
            {bp['datetime']}
        </th>           
))

    const bloodpressure = props.data.observations.blood_pressure.map((bp)=> (
        <td>
            {bp['systolic']}/{bp['diastolic']}
        </td>
    ))

    const heartrate = props.data.observations.heart_rate.map((hr)=> (
        <td>
            {hr['rate']}
        </td>
    ))

    const temperature = props.data.observations.temperature.map((temp)=> (
        <td>
            {temp['temperature']}
        </td>
    ))

    const resp_rate = props.data.observations.resp_rate.map((rr)=> (
        <td>
            {rr['bpm']}
        </td>
    ))

    const oxygen = props.data.observations.oxygen.map((oxy)=> (
        <td>
            {oxy['percentage']}
        </td>
    ))
    
    
    return(
        <Table>
        
            <tbody>
                <tr>
                    <th>Date Recorded</th>
                    {dates}
                </tr>
                <tr>
                    <th>Blood Pressure (mmhg)</th>
                    {bloodpressure}
                </tr>
                <tr>
                    <th>Heart Rate <br/>(Beats per minute)</th>
                    {heartrate}
                </tr>
                <tr>
                    <th>Temperature <br/>(Degrees Celcius)</th>
                    {temperature}
                </tr>
                <tr>
                    <th>Respiratory Rate <br/>(Breaths per minute)</th>
                    {resp_rate}
                </tr>
                <tr>
                    <th>0yxgen Sats<br/>(Percentage)</th>
                    {oxygen}
                </tr>
            </tbody>
        </Table>
    )
}
export default ObsTable