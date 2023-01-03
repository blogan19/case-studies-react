import React from "react";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

const ShortAnswer = (props) => {
    const question = props.question
    return(
        <Container className="mt-3 p-3 bg-light text-dark rounded">
            <Row>
            <Col xs={12}>
                <h3>
                    Q{question.questionNumber}: {question.questionTitle} 
                </h3>
            </Col>
            </Row>
            <Row>
            <Form>
                    <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
                        <Form.Label>{question.questionText}</Form.Label>
                        <Form.Control type="text" rows={3} />
                    </Form.Group>
                </Form>
            </Row>
        </Container>
    )
}
export default ShortAnswer