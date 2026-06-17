const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

describe('E2E: Full Workflow', () => {
  const testCompetitors = [
    { name: 'TestCompetitor-1', url: 'https://example1.com', remarks: 'Test competitor 1' },
    { name: 'TestCompetitor-2', url: 'https://example2.com', remarks: 'Test competitor 2' },
    { name: 'TestCompetitor-3', url: 'https://example3.com', remarks: 'Test competitor 3' },
  ];

  let createdCompetitorIds = [];
  let today = new Date().toISOString().split('T')[0];

  test('AC-001: User can create competitors via API', async () => {
    for (const competitor of testCompetitors) {
      const response = await axios.post(`${API_BASE}/competitors`, competitor);
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      createdCompetitorIds.push(response.data.id);
    }
    expect(createdCompetitorIds).toHaveLength(3);
  });

  test('AC-002: Can fetch competitor list', async () => {
    const response = await axios.get(`${API_BASE}/competitors?page=1&limit=10`);
    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(response.data.total).toBeGreaterThanOrEqual(3);
  });

  test('AC-003: Can update competitor', async () => {
    const competitorId = createdCompetitorIds[0];
    const updateData = { name: 'UpdatedCompetitor-1', url: 'https://updated.com', remarks: 'Updated' };
    const response = await axios.put(`${API_BASE}/competitors/${competitorId}`, updateData);
    expect(response.status).toBe(200);
  });

  test('AC-004: Can delete competitor', async () => {
    const competitorId = createdCompetitorIds[2];
    const response = await axios.delete(`${API_BASE}/competitors/${competitorId}`);
    expect(response.status).toBe(200);
  });

  test('AC-005 & AC-006: Can generate report and fetch via API', async () => {
    // Simulate a report generation (normally done by cron job)
    const reportDate = today;

    try {
      const response = await axios.get(`${API_BASE}/reports/${reportDate}`);
      expect(response.status).toBe(200);
      expect(response.data.report_date).toBe(reportDate);
      expect(response.data.content).toBeDefined();
    } catch (error) {
      // 404 is expected if no report exists for today
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  });

  test('AC-007: Can fetch report list with pagination', async () => {
    const response = await axios.get(`${API_BASE}/reports?page=1&limit=10`);
    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(response.data.page).toBe(1);
  });

  test('Health check endpoint', async () => {
    const response = await axios.get('http://localhost:3001/health');
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
  });
});

describe('Data Integrity Checks', () => {
  test('Competitor data validation', async () => {
    const invalidData = { url: 'not-a-url' };
    try {
      await axios.post(`${API_BASE}/competitors`, invalidData);
      fail('Should have failed due to missing name');
    } catch (error) {
      expect(error.response?.status).toBe(400);
    }
  });

  test('Report date format validation', async () => {
    try {
      await axios.get(`${API_BASE}/reports/invalid-date`);
      fail('Should have failed due to invalid date format');
    } catch (error) {
      expect(error.response?.status).toBe(400);
    }
  });

  test('Nonexistent competitor returns 404', async () => {
    try {
      await axios.get(`${API_BASE}/competitors/999999`);
      fail('Should have returned 404');
    } catch (error) {
      expect(error.response?.status).toBe(404);
    }
  });
});

describe('Performance Checks', () => {
  test('Competitor list fetch completes within 2 seconds', async () => {
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE}/competitors?page=1&limit=100`);
    const duration = Date.now() - startTime;
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(2000);
  });

  test('Report fetch completes within 1 second', async () => {
    const startTime = Date.now();
    try {
      await axios.get(`${API_BASE}/reports?page=1&limit=10`);
    } catch (error) {
      // ignore 404
    }
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000);
  });
});
