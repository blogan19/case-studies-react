import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentDashboard from './StudentDashboard';

const baseProps = {
  library: [
    {
      id: 'case-1',
      title: 'Sepsis review',
      summary: 'A deteriorating inpatient case',
      isFavourite: true,
      publishedData: {
        revision_topic: 'Infection',
        short_description: 'Escalating sepsis on the ward',
      },
    },
    {
      id: 'case-2',
      title: 'Heart failure optimisation',
      summary: 'Adjust chronic medicines',
      isFavourite: false,
      publishedData: {
        revision_topic: 'Cardiology',
        short_description: 'Fluid balance and long-term management',
      },
    },
  ],
  caseStudySets: [],
  sessions: [
    {
      id: 'session-1',
      title: 'Saved sepsis case',
      summary: 'Continue from question 2',
      status: 'in_progress',
      score: null,
      startedAt: '2026-04-20T09:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    },
  ],
  liveSessions: [
    {
      id: 'live-1',
      title: 'Ward teaching',
      summary: 'Morning live case',
      sessionCode: 'ABC123',
      status: 'active',
      answeredCount: 3,
      totalQuestions: 5,
      score: 66.67,
      lastViewedAt: '2026-04-20T11:00:00.000Z',
    },
  ],
  onStartCase: jest.fn(),
  onResumeSession: jest.fn(),
  onRejoinLiveSession: jest.fn(),
  onToggleFavourite: jest.fn(),
  onBack: jest.fn(),
};

describe('StudentDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders saved sessions in a table and resumes a session', async () => {
    const user = userEvent.setup();
    render(<StudentDashboard {...baseProps} />);

    expect(screen.getByRole('columnheader', { name: 'Case study' })).toBeInTheDocument();
    expect(screen.getByText('Saved sepsis case')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Resume' }));

    expect(baseProps.onResumeSession).toHaveBeenCalledWith('session-1');
  });

  it('allows a student to search the revision library', async () => {
    const user = userEvent.setup();
    render(<StudentDashboard {...baseProps} />);

    const searchInput = screen.getByRole('searchbox', { name: 'Search case study library' });
    await user.type(searchInput, 'cardiology');

    expect(screen.getByText('Heart failure optimisation')).toBeInTheDocument();
    expect(screen.queryByText('Sepsis review')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 case studies shown')).toBeInTheDocument();
  });

  it('toggles favourites from the revision library card', async () => {
    const user = userEvent.setup();
    render(<StudentDashboard {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Remove Sepsis review from favourites' }));

    expect(baseProps.onToggleFavourite).toHaveBeenCalledWith('case-1', true);
  });

  it('rejoins an active live session from the live history table', async () => {
    const user = userEvent.setup();
    render(<StudentDashboard {...baseProps} />);

    const liveTableRow = screen.getByText('Ward teaching').closest('tr');
    expect(liveTableRow).not.toBeNull();

    await user.click(within(liveTableRow).getByRole('button', { name: 'Rejoin' }));

    expect(baseProps.onRejoinLiveSession).toHaveBeenCalledWith('ABC123');
  });
});
