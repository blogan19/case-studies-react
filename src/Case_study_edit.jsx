import React from 'react';
import NavBar from './components/NavBar'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import ListGroup from 'react-bootstrap/ListGroup';

import './style.css';

const CaseStudyEdit = () => {
  return (
    <>
     <NavBar/>
     <div className="container mt-3">
        <Button variant="outline-primary">New Case Study</Button>
        <ListGroup variant="flush" className="mt-3">
            <ListGroup.Item  className="blue-black">
              <strong>Load Previous Case Study</strong>
            </ListGroup.Item>
            <ListGroup.Item>Case study 1</ListGroup.Item>
            <ListGroup.Item>Case Study 2</ListGroup.Item>
            <ListGroup.Item>Case Study 3</ListGroup.Item>
            <ListGroup.Item>Case Study 4</ListGroup.Item>
        </ListGroup>
      </div>
      
    </>
  );
};

export default CaseStudyEdit;
