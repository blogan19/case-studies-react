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

const TempHR = (props) => {
  const temperature = props.data.observations.temperature.map((temp) => temp['temperature'])
  const heartRate = props.data.observations.heart_rate.map((hr) => hr['rate'])

  //temp labels same as heart rate
  const labels = props.data.observations.temperature.map((temp) => temp['datetime'])

  const data = {
    labels,
    datasets : [
      {
        label: 'Temperature',
        data: temperature,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y'
      },
      {
        label: 'Heart Rate',
        data: heartRate,
        borderColor: 'rgba(53, 162, 235, 0.5)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y1'
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
        text: '',
      },
    },
    scales: {
        y: {
            title:{
              display:true,
              text: "Temperature (Degrees Celcius)"
            },
            type: 'linear',
            display: true,
            position: 'left',
          },
          y1: {
            title:{
              display:true,
              text: "HeartRate (Beats Per Minute)"
            },
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
          },
    },
    
  };
  return (
    <Container className="container-shadow mt-3">
      <h4>Heart Rate and Temperature</h4>
      <Line options={options} data={data}></Line>
    </Container>
  );
}

export default TempHR;
