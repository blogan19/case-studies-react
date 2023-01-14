import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';

const Login = ({setdisplayShow, handleClose}) => {
    const [email,setEmail] = useState('')
    const [password,setPassword] = useState('')
    return(
        <>
            <Form>    
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formEmail">
                        <Form.Label>Email</Form.Label>
                        <Form.Control type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </Form.Group> 
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formPassword">
                        <Form.Label>Password</Form.Label>
                        <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </Form.Group>
                </Row>
                <Row>
                    <Col>
                        <Button variant="success" onClick={() => {handleClose();setdisplayShow(false)}}>Log in</Button>
                    </Col>
                </Row>
            </Form>  
        </>


    )
}
export default Login
