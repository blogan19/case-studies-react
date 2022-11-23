import React from "react";
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

const NavBar = ({setCreate}) => {
    return(
        <Navbar className="blue-back">
        <Container>
          <Navbar.Brand href="#home" className="text-white">Electronic Prescription Chart</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            
              <Nav.Link href="#" onClick={() => setCreate(false)} className="text-white">Create New Case Study</Nav.Link>           
            
              <Nav.Link href="#" onClick={() => setCreate(true)} className="text-white">View Case Study</Nav.Link>           
            
            
          </Nav>
        </Navbar.Collapse>
        </Container>
      </Navbar>
    )
}
export default NavBar