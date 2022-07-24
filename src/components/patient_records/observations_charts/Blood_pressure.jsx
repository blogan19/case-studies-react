import React from 'react';
import Container from 'react-bootstrap/Container';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function BloodPressure(props) {
  const bloodPressure = props.data.observations.blood_pressure
  const labels = bloodPressure.map((bp) => bp['datetime'])
  const systolic = bloodPressure.map((bp) => bp['systolic'])
  const diastolic = bloodPressure.map((bp) => bp['diastolic'])

  const data = {
    labels,
    datasets : [
      {
        label: 'Systolic',
        data: systolic,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Diastolic',
        data: diastolic,
        borderColor: 'rgba(53, 162, 235, 0.5)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      }
    ]
  } 
  const options =  {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: false,
        text: 'Blood Pressure',
      },
    },
    scales: {
      yAxes: {
        title: {
            display: true,
            text: 'Blood Pressure (mmHg)',
            font: {
                size: 15
            }
        },
        ticks: {
            precision: 0
        }
      },
      xAxes: {
        title: {
            display: true,
            text: 'Time Recorded',
            font: {
                size: 15
            }
        },
        ticks: {
            precision: 0
        }
      },
    },
    
  };
  return (
   <Container className="container-shadow mt-3">
    <h4>Blood Pressure</h4>
     <Line options={options} data={data}></Line>
   </Container>
  );
}

export default BloodPressure;
