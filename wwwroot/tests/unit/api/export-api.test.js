/**
 * Export API Unit Tests
 * Tests for Excel and CSV export functions
 */

import {
  exportToExcel,
  exportToCsv
} from '../../../js/api/export-api.js';

// ---------------------------------------------------------------------------
// DOM / fetch mock helpers

function mockSuccessResponse({ contentDisposition = null, blob = new Blob(['data']) } = {}) {
  const headers = new Map();
  if (contentDisposition) {
    headers.set('content-disposition', contentDisposition);
  }

  return {
    ok: true,
    headers: {
      get: (key) => headers.get(key.toLowerCase()) ?? null
    },
    blob: jest.fn().mockResolvedValue(blob),
    json: jest.fn().mockResolvedValue({})
  };
}

function mockFailResponse({ status = 500, errorJson = { error: 'Server error' } } = {}) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    blob: jest.fn().mockResolvedValue(new Blob()),
    json: jest.fn().mockResolvedValue(errorJson)
  };
}

const minimalInput = {
  birthDate: '1990-01-01',
  birthYear: 1990,
  earlyRetirementYear: 2045,
  fullRetirementAge: 67,
  monthlyContribution: { amount: 5000, currency: 'USD' },
  adjustContributionsForInflation: true,
  withdrawalRate: 4,
  inflationRate: 2,
  capitalGainsTax: 25,
  pensionNetMonthly: { amount: 1500, currency: 'USD' },
  targetMonthlyExpense: { amount: 8000, currency: 'USD' },
  usdIlsRate: 3.6,
  accumulationPortfolio: [],
  retirementAllocation: [],
  expenses: [],
  useRetirementPortfolio: false,
  includeRsuInCalculations: false,
  currency: '$'
};

describe('Export API', () => {
  let mockAnchor;

  beforeEach(() => {
    // Mock URL.*
    global.URL = {
      createObjectURL: jest.fn(() => 'blob:mock-url'),
      revokeObjectURL: jest.fn()
    };

    // Mock anchor element
    mockAnchor = { href: '', download: '', click: jest.fn() };

    // Mock document APIs
    global.document = {
      createElement: jest.fn(() => mockAnchor),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      }
    };

    // Mock setTimeout so URL.revokeObjectURL is called synchronously
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.URL;
    delete global.document;
    global.fetch = undefined;
  });

  // ==========================================================================
  // exportToExcel
  // ==========================================================================

  describe('exportToExcel', () => {
    test('sends POST to /api/Export/excel with JSON body', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockSuccessResponse());
      await exportToExcel(minimalInput);

      expect(global.fetch).toHaveBeenCalledWith('/api/Export/excel', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: expect.any(String)
      }));

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.input).toEqual(minimalInput);
      expect(body.input.monthlyContribution).toEqual({ amount: 5000, currency: 'USD' });
      expect(body.input.adjustContributionsForInflation).toBe(true);
      expect(body.input.pensionNetMonthly).toEqual({ amount: 1500, currency: 'USD' });
    });

    test('includes scenarioName and scenarioNotes in request body', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockSuccessResponse());
      await exportToExcel(minimalInput, { scenarioName: 'Test Plan', scenarioNotes: 'My notes', usdIlsRate: 3.7 });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.scenarioName).toBe('Test Plan');
      expect(body.scenarioNotes).toBe('My notes');
      expect(body.usdIlsRate).toBe(3.7);
    });

    test('uses default filename FIRE_Plan.xlsx when no Content-Disposition header', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockSuccessResponse());
      await exportToExcel(minimalInput);

      expect(mockAnchor.download).toBe('FIRE_Plan.xlsx');
    });

    test('reads filename from Content-Disposition header', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockSuccessResponse({ contentDisposition: 'attachment; filename="MyPlan_2025.xlsx"' })
      );
      await exportToExcel(minimalInput);

      expect(mockAnchor.download).toBe('MyPlan_2025.xlsx');
    });

    test('reads filename without quotes in Content-Disposition', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockSuccessResponse({ contentDisposition: 'attachment; filename=Plan.xlsx' })
      );
      await exportToExcel(minimalInput);

      expect(mockAnchor.download).toBe('Plan.xlsx');
    });

    test('creates object URL, appends anchor, clicks, and removes anchor', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockSuccessResponse());
      await exportToExcel(minimalInput);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
    });

    test('revokes object URL after timeout', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockSuccessResponse());
      await exportToExcel(minimalInput);

      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
      jest.runAllTimers();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    test('throws Error on non-ok response with error field', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockFailResponse({ status: 400, errorJson: { error: 'Invalid input data' } })
      );

      await expect(exportToExcel(minimalInput)).rejects.toThrow('Invalid input data');
    });

    test('throws with status message when error JSON has no error field', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockFailResponse({ status: 503, errorJson: {} })
      );

      await expect(exportToExcel(minimalInput)).rejects.toThrow('Export failed with status 503');
    });

    test('throws with fallback message when JSON parse fails', async () => {
      const response = {
        ok: false,
        status: 500,
        headers: { get: () => null },
        blob: jest.fn(),
        json: jest.fn().mockRejectedValue(new SyntaxError('bad json'))
      };
      global.fetch = jest.fn().mockResolvedValue(response);

      await expect(exportToExcel(minimalInput)).rejects.toThrow('Export failed');
    });
  });

  // ==========================================================================
  // exportToCsv
  // ==========================================================================

  describe('exportToCsv', () => {
    test('sends POST to /api/Export/csv with JSON body', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockSuccessResponse());
      await exportToCsv(minimalInput);

      expect(global.fetch).toHaveBeenCalledWith('/api/Export/csv', expect.objectContaining({
        method: 'POST'
      }));

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.input).toEqual(minimalInput);
      expect(body.input.adjustContributionsForInflation).toBe(true);
      expect(body.input.targetMonthlyExpense).toEqual({ amount: 8000, currency: 'USD' });
    });

    test('uses default filename FIRE_Plan.csv when no Content-Disposition header', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockSuccessResponse());
      await exportToCsv(minimalInput);

      expect(mockAnchor.download).toBe('FIRE_Plan.csv');
    });

    test('reads filename from Content-Disposition header', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockSuccessResponse({ contentDisposition: 'attachment; filename="Report.csv"' })
      );
      await exportToCsv(minimalInput);

      expect(mockAnchor.download).toBe('Report.csv');
    });

    test('triggers file download (creates anchor and clicks it)', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockSuccessResponse());
      await exportToCsv(minimalInput);

      expect(mockAnchor.click).toHaveBeenCalled();
    });

    test('throws Error on non-ok response', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockFailResponse({ status: 500, errorJson: { error: 'CSV export failed' } })
      );

      await expect(exportToCsv(minimalInput)).rejects.toThrow('CSV export failed');
    });

    test('includes scenarioName in request body', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockSuccessResponse());
      await exportToCsv(minimalInput, { scenarioName: 'CSV Scenario' });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.scenarioName).toBe('CSV Scenario');
    });
  });
});
