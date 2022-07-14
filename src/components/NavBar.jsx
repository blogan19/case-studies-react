import React from "react";
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';

const NavBar = () => {
    return(
        <Navbar bg="light">
        <Container>
          <Navbar.Brand href="#home">Electronic Prescription Chart</Navbar.Brand>
        </Container>
      </Navbar>
    )
}
export default NavBar