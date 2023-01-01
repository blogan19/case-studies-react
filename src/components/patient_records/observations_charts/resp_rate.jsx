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

const RespRate = (props) => {
  const respRate = props.data.observations.resp_rate
  const labels = respRate.map((rr) => rr['datetime'])
  const rate = respRate.map((rr) => rr['bpm'])

  const data = {
    labels,
    datasets : [
      {
        label: 'Respiratory Rate BPM',
        data: rate,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
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
            text: 'Respiratory Rate',
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
    <h4>Respiratory Rate</h4>
     <Line options={options} data={data}></Line>
   </Container>
  );
}

export default RespRate;
