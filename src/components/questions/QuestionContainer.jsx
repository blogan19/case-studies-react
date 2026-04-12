import React from 'react';
import MultipleChoice from './MultipleChoice';
import CarePlan from './CarePlan';
import Calculation from './Calculation';
import DrugChoice from './DrugChoice';
import MultipleAnswer from './MultipleAnswer';
import WorkthroughTask from './WorkthroughTask';

const QuestionContainer = ({ questions = [], prescriptions = [] }) => {
  return questions.map((question, index) => {
    switch (question.questionType) {
      case 'MultipleChoice':
        return <MultipleChoice key={question.questionNumber || index} question={question} />;
      case 'Calculation':
        return <Calculation key={question.questionNumber || index} question={question} />;
      case 'CarePlan':
        return <CarePlan key={question.questionNumber || index} question={question} />;
      case 'DrugChoice':
        return (
          <DrugChoice
            key={question.questionNumber || index}
            question={question}
            prescriptions={prescriptions}
          />
        );
      case 'MultipleAnswer':
        return <MultipleAnswer key={question.questionNumber || index} question={question} />;
      case 'WorkthroughTask':
        return <WorkthroughTask key={question.questionNumber || index} question={question} />;
      default:
        return null;
    }
  });
};

export default QuestionContainer;
