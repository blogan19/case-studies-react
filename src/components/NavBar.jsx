import React from "react";
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';

const NavBar = () => {
    return(
        <Navbar className="blue-back">
        <Container>
          <Navbar.Brand href="#home" className="text-white">Electronic Prescription Chart</Navbar.Brand>
        </Container>
      </Navbar>
    )
}
export default NavBar