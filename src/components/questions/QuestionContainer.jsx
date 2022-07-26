import React from "react";
import Container from 'react-bootstrap/Container';
import MultipleChoice from "./MultipleChoice";
import CarePlan from "./CarePlan";

const QuestionContainer = (props) => {
  return(
      props.questions.map((question) => {
        switch(question.questionType){
          case "MultipleChoice":
            return <MultipleChoice question={question}/>
            break;
          case "CarePlan":
            return <CarePlan question={question}/>
        }
      })
    
  )
}

export default QuestionContainer