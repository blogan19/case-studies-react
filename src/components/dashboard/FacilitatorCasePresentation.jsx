import React from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import LecturerLiveView from '../player/LecturerLiveView';
import CaseStudyDisplay from '../../Case_study_display';
import {
  getActiveLiveStageIndex,
  getLivePresentationCase,
  hasStagedLiveCase,
  normalizeCaseStudy,
} from '../../lib/caseStudy';

const FacilitatorCasePresentation = ({
  liveState,
  liveResponses,
  onBack,
  onChangeStep,
  onToggleReveal,
  onRevealQuestion,
  onChangePresentationStage,
  onChangeStageIndex,
  onEndSession,
}) => {
  const caseStudy = normalizeCaseStudy(liveState?.payload || {});
  const caseStudyName = caseStudy.case_study_name || 'Untitled case study';
  const presentationCaseStudy = getLivePresentationCase(caseStudy);
  const presentationStage = caseStudy.livePresentationStage === 'initial' ? 'initial' : 'full';
  const isStaged = hasStagedLiveCase(caseStudy);
  const stageIndex = getActiveLiveStageIndex(caseStudy);
  const stages = caseStudy.liveStages || [];
  const questions = presentationCaseStudy.questions || [];
  const totalQuestions = questions.length;
  const activeIndex = Math.max(0, Math.min(liveState?.stepIndex || 0, Math.max(totalQuestions - 1, 0)));
  const activeQuestion = questions[activeIndex] || null;
  const activeResponses = activeQuestion ? liveResponses?.[String(activeQuestion.questionNumber)]?.totalResponses || 0 : 0;
  const participantCount = Number(liveResponses?.__participantCount || 0);
  const answeredParticipantCount = Number(liveResponses?.__answeredParticipantCount || 0);
  const revealedQuestionNumbers = Array.isArray(caseStudy.revealedQuestionNumbers) ? caseStudy.revealedQuestionNumbers.map(String) : [];
  const activeQuestionRevealed = Boolean(activeQuestion && revealedQuestionNumbers.includes(String(activeQuestion.questionNumber)));
  const activeQuestionShownToStudents = Boolean(liveState?.revealAnswers || activeQuestionRevealed);
  const hasPresentedAllQuestions = Boolean(totalQuestions && activeIndex >= totalQuestions - 1);

  return (
    <div className="student-page">
      <div className="facilitator-live-banner">
        <div className="facilitator-live-banner__status">
          <Badge bg="dark">Code {liveState?.sessionCode || 'Not started'}</Badge>
          <Badge bg="primary">
            Live case study - {caseStudyName}
          </Badge>
          <Badge bg="secondary">
            {totalQuestions ? `Question ${activeIndex + 1} of ${totalQuestions}` : 'No questions'}
          </Badge>
          <Badge bg={activeQuestionShownToStudents ? 'success' : 'warning'}>
            {liveState?.revealAnswers ? 'All answers revealed' : activeQuestionRevealed ? 'Current answer revealed' : 'Current answer hidden'}
          </Badge>
          {activeQuestion ? <Badge bg="info">Presenting: Q{activeIndex + 1} {activeQuestion.questionTitle || activeQuestion.questionText || ''}</Badge> : null}
          <span className="facilitator-live-banner__responses">
            {activeResponses} current response{activeResponses === 1 ? '' : 's'} | {answeredParticipantCount}/{participantCount} students answered
          </span>
        </div>
        <div className="facilitator-live-banner__controls">
          {isStaged ? (
            <ButtonGroup size="sm">
              <Button
                type="button"
                variant="outline-primary"
                disabled={stageIndex <= 0}
                onClick={() => onChangeStageIndex?.(stageIndex - 1)}
              >
                Previous stage
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={stageIndex >= stages.length - 1}
                onClick={() => onChangeStageIndex?.(stageIndex + 1)}
              >
                Next stage
              </Button>
            </ButtonGroup>
          ) : (
            <Button
              type="button"
              size="sm"
              variant={presentationStage === 'initial' ? 'primary' : 'outline-primary'}
              onClick={() => onChangePresentationStage?.(presentationStage === 'initial' ? 'full' : 'initial')}
            >
              {presentationStage === 'initial' ? 'Advance stage' : 'Return to initial'}
            </Button>
          )}
          <ButtonGroup size="sm">
            <Button type="button" variant="outline-primary" disabled={activeIndex <= 0} onClick={() => onChangeStep(activeIndex - 1)}>
              Previous question
            </Button>
            <Button type="button" variant="outline-primary" disabled={!totalQuestions || activeIndex >= totalQuestions - 1} onClick={() => onChangeStep(activeIndex + 1)}>
              Next question
            </Button>
          </ButtonGroup>
          <Button
            type="button"
            size="sm"
            variant={activeQuestionRevealed ? 'warning' : 'success'}
            disabled={!activeQuestion || liveState?.revealAnswers}
            onClick={() => onRevealQuestion?.(activeQuestion.questionNumber)}
          >
            {activeQuestionRevealed ? 'Hide question answer' : liveState?.revealAnswers ? 'Question answer revealed' : 'Reveal question answer'}
          </Button>
          {hasPresentedAllQuestions ? (
            <Button
              type="button"
              size="sm"
              variant={liveState?.revealAnswers ? 'warning' : 'success'}
              disabled={!activeQuestion}
              onClick={() => onToggleReveal(!liveState?.revealAnswers)}
            >
              {liveState?.revealAnswers ? 'Hide all answers' : 'Reveal all answers'}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline-secondary" onClick={onBack}>
            Back to case library
          </Button>
          <Button type="button" size="sm" variant="outline-danger" onClick={onEndSession}>
            End live session
          </Button>
        </div>
      </div>

      <CaseStudyDisplay data={presentationCaseStudy} hideQuestions readOnly />

      <LecturerLiveView
        liveState={liveState}
        liveResponses={liveResponses}
        onChangeStep={onChangeStep}
        onToggleReveal={onToggleReveal}
        onChangePresentationStage={onChangePresentationStage}
      />
    </div>
  );
};

export default FacilitatorCasePresentation;
