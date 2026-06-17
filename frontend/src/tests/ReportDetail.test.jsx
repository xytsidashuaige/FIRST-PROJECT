import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import ReportDetail from '../pages/ReportDetail';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ date: '2026-06-17' }),
  useNavigate: () => jest.fn(),
}));

describe('ReportDetail', () => {
  const mockReport = {
    id: 1,
    report_date: '2026-06-17',
    content: {
      report_date: '2026-06-17',
      total_changes: 2,
      competitors: [
        {
          competitor_id: 1,
          competitor_name: 'CompetitorA',
          changes: [
            {
              field: 'price',
              change_type: 'pricing',
              old_value: '$100',
              new_value: '$120',
              description: 'Price changed from $100 to $120',
            },
          ],
        },
        {
          competitor_id: 2,
          competitor_name: 'CompetitorB',
          changes: [
            {
              field: 'description',
              change_type: 'content',
              old_value: 'Old description',
              new_value: 'New description',
              description: 'Description updated',
            },
          ],
        },
      ],
      generated_at: new Date().toISOString(),
    },
    generated_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load and display report successfully', async () => {
    axios.get.mockResolvedValue(mockReport);

    render(
      <BrowserRouter>
        <ReportDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/竞对日报详情/)).toBeInTheDocument();
      expect(screen.getByText('CompetitorA')).toBeInTheDocument();
      expect(screen.getByText('CompetitorB')).toBeInTheDocument();
    });
  });

  test('should display loading state', () => {
    axios.get.mockImplementation(() => new Promise(() => {}));

    render(
      <BrowserRouter>
        <ReportDetail />
      </BrowserRouter>
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  test('should display error when report not found', async () => {
    axios.get.mockRejectedValue({
      response: { status: 404, data: { error: '该日期暂无日报' } },
    });

    render(
      <BrowserRouter>
        <ReportDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/该日期.*暂无日报/)).toBeInTheDocument();
    });
  });

  test('should display change details correctly', async () => {
    axios.get.mockResolvedValue(mockReport);

    render(
      <BrowserRouter>
        <ReportDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('price')).toBeInTheDocument();
      expect(screen.getByText('$100')).toBeInTheDocument();
      expect(screen.getByText('$120')).toBeInTheDocument();
      expect(screen.getByText('pricing')).toBeInTheDocument();
    });
  });

  test('should display empty report message', async () => {
    const emptyReport = {
      ...mockReport,
      content: {
        ...mockReport.content,
        competitors: [],
        total_changes: 0,
      },
    };

    axios.get.mockResolvedValue(emptyReport);

    render(
      <BrowserRouter>
        <ReportDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/未发现任何变化/)).toBeInTheDocument();
    });
  });
});
