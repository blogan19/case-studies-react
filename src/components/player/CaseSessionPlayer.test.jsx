import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CaseSessionPlayer from './CaseSessionPlayer';

jest.mock('../../Case_study_display', () => function CaseStudyDisplayMock() {
  return <div data-testid="case-study-display">Case study display</div>;
});

const session = {
  id: 'attempt-1',
  title: 'Antimicrobial review',
  status: 'in_progress',
  answers: {},
  progress: {},
  caseSnapshot: {
    case_study_name: 'Antimicrobial review',
    allowStudentEdits: false,
    learningContent: {
      title: 'Before you start',
      body: 'Read this background first',
    },
    questions: [
      {
        questionNumber: 1,
        questionType: 'MultipleChoice',
        questionTitle: 'Best next step',
        questionText: 'Choose the best option',
        answerOptions: ['A', 'B', 'C'],
        answer: 'A',
      },
    ],
  },
};

const drugLibrary = {
  items: [],
  metadata: {
    routes: [],
    frequencies: [],
  },
};

describe('CaseSessionPlayer', () => {
  it('renders the matching back button style and prominent task action', async () => {
    const onBack = jest.fn();
    const user = userEvent.setup();

    render(
      <CaseSessionPlayer
        session={session}
        drugLibrary={drugLibrary}
        onSave={jest.fn()}
        onSubmit={jest.fn()}
        onBack={onBack}
        saving={false}
        grading={null}
        notice={null}
      />
    );

    const backButton = screen.getByRole('button', { name: /back to dashboard/i });
    const tasksButton = screen.getByRole('button', { name: /open tasks/i });

    expect(backButton).toHaveClass('btn-outline-light');
    expect(tasksButton).toHaveClass('btn-light');

    await user.click(tasksButton);
    expect(screen.getByText('Complete the questions, save progress, and submit when ready.')).toBeInTheDocument();

    await user.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });

  it('opens learning content from the header actions', async () => {
    const user = userEvent.setup();

    render(
      <CaseSessionPlayer
        session={session}
        drugLibrary={drugLibrary}
        onSave={jest.fn()}
        onSubmit={jest.fn()}
        onBack={jest.fn()}
        saving={false}
        grading={null}
        notice={null}
      />
    );

    await user.click(screen.getByRole('button', { name: /learning content/i }));

    expect(screen.getByRole('dialog', { name: /before you start/i })).toBeInTheDocument();
    expect(screen.getByText('Read this background first')).toBeInTheDocument();
  });
});
