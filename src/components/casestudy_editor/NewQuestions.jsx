import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import InputGroup from 'react-bootstrap/InputGroup';
import Alert from 'react-bootstrap/Alert'; 


const AddQuestions = ({closeModal,setQuestions, previousResult}) => {


    // "questions": [{
    //     "questionNumber": 1,
    //     "questionType": "MultipleChoice",
    //     "questionTitle": "Nitrofurantoin",
    //     "questionText": "What would the most appropriate duration for nitrofurantoin be for this patient?",
    //     "answerOptions": ["7 days","3 days","14 days"],
    //     "answer": "7 days",
    //     "answerExplanation":""
    //   },{

    const newRecord = {questionNumber: '',questionType:'', questionTitle: '',questionText: '',opt1: '',opt2: '', opt3:'',opt4:'',opt5:'', answer: '',answerExplanation:''}
    const [recordState, setRecordState] = useState([
        { ...newRecord },
    ]);


    const loadPrevious = () => {
        console.log(previousResult)
    }
    //Functions called on first render
    useEffect(() => {
        if(previousResult != ""){
            loadPrevious()
        }
    },[]);
  
    const addRecord = () => { 
        setRecordState([...recordState, {...newRecord}])
    }

    const handleChange = (e) => {
        const updatedRecord = [...recordState];
        updatedRecord[e.target.dataset.idx][e.target.name] = e.target.value;
        setRecordState(updatedRecord);
    };

    const saveRecord = () => {
        let questionList = []
        recordState.map((x,id) => {
            //Create array of answer options then drop any empty ones
            let answerOptions = [x.opt1,x.opt2,x.opt3,x.opt4,x.opt5]
            answerOptions = answerOptions.filter(n => n != '')
            let question = {
                "questionNumber": id,
                "questionType": "MultipleChoice",
                "questionTitle": x.questionTitle,
                "questionText": x.questionText,
                "answerOptions": answerOptions,
                "answer": x.answer,
                "answerExplanation": x.answerExplanation
            }
            questionList.push(question)
        })
        setQuestions(questionList)
        closeModal()
        console.log(questionList)
    } 

    return(

        <>
            
            {
                recordState.map((val,idx) => {    
                    let answer = recordState[idx].answer  
                    console.log(answer)
                return(
                    <Container className="container-shadow mt-3">
                    <br/>
                    <Form>
                        <Row className="mb-3">
                            <h3>Question {idx +1} 
                                <Button variant="danger" className="float-end" onClick={() => {setRecordState(recordState.filter(x => x !== val))}}><i class="bi bi-trash3"></i></Button>{' '}
                            </h3>

                        </Row>
                        <Row className="mb-3">
                            <Form.Group as={Col} controlId="formHospitalno">
                                <Form.Label>Question Title</Form.Label>
                                <Form.Control type="text" name="questionTitle" data-idx={idx}  value={recordState[idx].questionTitle} onChange={handleChange}/>
                            </Form.Group>
                        </Row>
                        <Row className="mb-3">
                            <Form.Group as={Col} controlId="formHospitalno">
                                <Form.Label>Question Text</Form.Label>
                                <Form.Control type="text" name="questionText" data-idx={idx}  value={recordState[idx].questionText} onChange={handleChange}/>
                            </Form.Group>
                        </Row>
                        <Row className="mb-3">
                            <Form.Group as={Col} controlId="formHospitalno">
                                <Form.Label>Answer Options (Use beween two or five options)</Form.Label>
                                <InputGroup className="mb-3">
                                    <Form.Control type="text" name="opt1" placeholder="Answer Option 1" data-idx={idx}  value={recordState[idx].opt1} onChange={handleChange} style={answer === "opt1" ? {border:"solid 3px green"}:{}}/>
                                    <InputGroup.Radio aria-label="Radio for setting answer" label="Option 1" name={"answer"} type="radio"  data-idx={idx} value="opt1" onChange={handleChange} />
                                </InputGroup>
                                <InputGroup className="mb-3">
                                    <Form.Control type="text" name="opt2" placeholder="Answer Option 2" data-idx={idx}  value={recordState[idx].opt2} onChange={handleChange} style={answer === "opt2" ? {border:"solid 3px green"}:{}}/>
                                    <InputGroup.Radio aria-label="Radio for setting answer" label="Option 2" name={"answer"} type="radio" data-idx={idx} value="opt2" onChange={handleChange} />
                                </InputGroup>
                                <InputGroup className="mb-3">
                                    <Form.Control type="text" name="opt3" placeholder="Answer Option 3" data-idx={idx}  value={recordState[idx].opt3} onChange={handleChange} style={answer === "opt3" ? {border:"solid 3px green"}:{}}/>
                                    <InputGroup.Radio aria-label="Radio for setting answer" label="Option 3" name={"answer"} type="radio" data-idx={idx} value="opt3" onChange={handleChange} />
                                </InputGroup>
                                <InputGroup className="mb-3">
                                    <Form.Control type="text" name="opt4" placeholder="Answer Option 4" data-idx={idx}  value={recordState[idx].opt4} onChange={handleChange} style={answer === "opt4" ? {border:"solid 3px green"}:{}}/>
                                    <InputGroup.Radio aria-label="Radio for setting answer" label="Option 4" name={"answer"} type="radio" data-idx={idx} value="opt4" onChange={handleChange} />
                                </InputGroup>
                                <InputGroup className="mb-3">
                                    <Form.Control type="text" name="opt5" placeholder="Answer Option 5" data-idx={idx}  value={recordState[idx].opt5} onChange={handleChange} style={answer === "opt5" ? {border:"solid 3px green"}:{}}/>
                                    <InputGroup.Radio aria-label="Radio for setting answer" label="Option 5" name={"answer"} type="radio" data-idx={idx} value="opt5" onChange={handleChange} />
                                </InputGroup>
                            </Form.Group>
                        </Row>
                        {
                            answer === "" ? (
                                 <Alert variant="danger">You have not selected a correct answer</Alert>
    
                            ):""
                        }
                        <Row className="mb-3">
                            <Form.Group as={Col} controlId="formHospitalno">
                                <Form.Label>Answer Explanation</Form.Label>
                                <Form.Control type="text" name="answerExplanation" placeholder="answerExplanation" data-idx={idx}  value={recordState[idx].answerExplanation} onChange={handleChange}/>
                            </Form.Group>
                        </Row>
                        <br/>
                    </Form>
                    </Container>
                )
                })
            }
            <Container className="container-shadow mt-3">
                <Button onClick={addRecord} variant="outline-info" className="mt-3 mb-3">Add Question</Button>{' '}
                <Button onClick={saveRecord} variant="success" className="mt-3 mb-3">Save Questions</Button>
            </Container>
            

        </>
    )
}
export default AddQuestions


