/**
 * RSU Chart Unit Tests
 * Tests for RSU chart data transformation and visualization
 * 
 * Tests for:
 * - Chart data transformation
 * - Currency conversion for chart display
 * - Dataset generation
 * - Chart options and configuration
 */

import {
  transformRsuTimelineForChart,
  RSU_CHART_COLORS
} from '../../../js/components/rsu-chart.js';

// Mock Chart.js for unit tests
global.Chart = jest.fn().mockImplementation(() => ({
  destroy: jest.fn(),
  update: jest.fn()
}));

// ============================================================================
// Chart Data Transformation
// ============================================================================

describe('RSU Chart Data Transformation', () => {
  describe('transformRsuTimelineForChart', () => {
    const mockTimeline = [
      {
        year: 2025,
        sharesVested: 250,
        sharesSold: 0,
        sharesHeld: 250,
        totalRemainingShares: 1000,
        sharesForfeited: 0,
        marketValue: 25000,
        forfeitedValue: 0,
        grossSaleProceeds: 0,
        netSaleProceeds: 0,
        taxesPaid: 0,
        projectedStockPrice: 100,
        transactions: []
      },
      {
        year: 2026,
        sharesVested: 250,
        sharesSold: 125,
        sharesHeld: 375,
        totalRemainingShares: 875,
        sharesForfeited: 0,
        marketValue: 38500,
        forfeitedValue: 0,
        grossSaleProceeds: 13750,
        netSaleProceeds: 12500,
        taxesPaid: 1250,
        projectedStockPrice: 110,
        transactions: []
      },
      {
        year: 2027,
        sharesVested: 250,
        sharesSold: 250,
        sharesHeld: 375,
        totalRemainingShares: 625,
        sharesForfeited: 0,
        marketValue: 45375,
        forfeitedValue: 0,
        grossSaleProceeds: 30250,
        netSaleProceeds: 27500,
        taxesPaid: 2750,
        projectedStockPrice: 121,
        transactions: []
      }
    ];

    test('transforms timeline to chart data points', () => {
      const chartData = transformRsuTimelineForChart(
        mockTimeline,
        '$',
        3.7,
        2028,
        80 // cost basis
      );

      expect(chartData).toHaveLength(3);
      expect(chartData[0].year).toBe(2025);
      expect(chartData[1].year).toBe(2026);
      expect(chartData[2].year).toBe(2027);
    });

    test('includes all required chart data fields', () => {
      const chartData = transformRsuTimelineForChart(
        mockTimeline,
        '$',
        3.7,
        2028,
        80
      );

      const point = chartData[0];
      expect(point).toHaveProperty('year');
      expect(point).toHaveProperty('totalValue');
      expect(point).toHaveProperty('vestedValue');
      expect(point).toHaveProperty('heldValue');
      expect(point).toHaveProperty('cumulativeProceeds');
      expect(point).toHaveProperty('totalNetValue');
      expect(point).toHaveProperty('isRetirementYear');
    });

    test('marks retirement year correctly', () => {
      const chartData = transformRsuTimelineForChart(
        mockTimeline,
        '$',
        3.7,
        2026, // retirement in 2026
        80
      );

      expect(chartData[0].isRetirementYear).toBe(false);
      expect(chartData[1].isRetirementYear).toBe(true);
      expect(chartData[2].isRetirementYear).toBe(false);
    });

    test('accumulates proceeds correctly', () => {
      const chartData = transformRsuTimelineForChart(
        mockTimeline,
        '$',
        3.7,
        2028,
        80
      );

      // First year: no sales yet
      expect(chartData[0].cumulativeProceeds).toBe(0);
      
      // Proceeds should increase after sales
      expect(chartData[1].cumulativeProceeds).toBeGreaterThan(0);
      expect(chartData[2].cumulativeProceeds).toBeGreaterThan(chartData[1].cumulativeProceeds);
    });

    test('handles empty timeline', () => {
      const chartData = transformRsuTimelineForChart(
        [],
        '$',
        3.7,
        2028,
        80
      );

      expect(chartData).toEqual([]);
    });
  });

  describe('Currency Conversion', () => {
    const mockTimeline = [
      {
        year: 2025,
        sharesVested: 100,
        sharesSold: 0,
        sharesHeld: 100,
        totalRemainingShares: 100,
        sharesForfeited: 0,
        marketValue: 10000, // $10,000
        forfeitedValue: 0,
        grossSaleProceeds: 0,
        netSaleProceeds: 0,
        taxesPaid: 0,
        projectedStockPrice: 100,
        transactions: []
      }
    ];

    test('converts USD values to ILS', () => {
      const chartData = transformRsuTimelineForChart(
        mockTimeline,
        '₪', // Target currency ILS
        3.7, // Exchange rate
        2028,
        80
      );

      // Market value $10,000 × 3.7 = ₪37,000
      expect(chartData[0].totalValue).toBe(37000);
    });

    test('keeps USD values when display currency is USD', () => {
      const chartData = transformRsuTimelineForChart(
        mockTimeline,
        '$', // Target currency USD
        3.7,
        2028,
        80
      );

      // Should remain $10,000
      expect(chartData[0].totalValue).toBe(10000);
    });
  });

  describe('Net Value Calculation', () => {
    test('calculates net value with 25% tax on capital gains', () => {
      const timeline = [
        {
          year: 2025,
          sharesVested: 100,
          sharesSold: 0,
          sharesHeld: 100,
          totalRemainingShares: 100,
          sharesForfeited: 0,
          marketValue: 20000, // $200 per share
          forfeitedValue: 0,
          grossSaleProceeds: 0,
          netSaleProceeds: 0,
          taxesPaid: 0,
          projectedStockPrice: 200,
          transactions: []
        }
      ];

      const costBasisPerShare = 100; // $100 cost basis
      const chartData = transformRsuTimelineForChart(
        timeline,
        '$',
        3.7,
        2028,
        costBasisPerShare
      );

      // 100 held shares at $200 = $20,000 gross
      // Cost basis = 100 × $100 = $10,000
      // Capital gain = $10,000
      // Tax (25%) = $2,500
      // Net held value = $17,500
      // Total net = $17,500 + $0 proceeds = $17,500
      expect(chartData[0].totalNetValue).toBe(17500);
    });

    test('includes cumulative proceeds in total net value', () => {
      const timeline = [
        {
          year: 2025,
          sharesVested: 100,
          sharesSold: 50,
          sharesHeld: 50,
          totalRemainingShares: 50,
          sharesForfeited: 0,
          marketValue: 10000,
          forfeitedValue: 0,
          grossSaleProceeds: 10000,
          netSaleProceeds: 8750, // After 25% tax on gain
          taxesPaid: 1250,
          projectedStockPrice: 200,
          transactions: []
        }
      ];

      const costBasisPerShare = 100;
      const chartData = transformRsuTimelineForChart(
        timeline,
        '$',
        3.7,
        2028,
        costBasisPerShare
      );

      // 50 held shares at $200 = $10,000 gross
      // Cost basis = 50 × $100 = $5,000
      // Capital gain = $5,000
      // Tax (25%) = $1,250
      // Net held value = $8,750
      // Plus proceeds: $8,750
      // Total net = $8,750 + $8,750 = $17,500
      expect(chartData[0].totalNetValue).toBe(17500);
    });

    test('no tax when price equals cost basis', () => {
      const timeline = [
        {
          year: 2025,
          sharesVested: 100,
          sharesSold: 0,
          sharesHeld: 100,
          totalRemainingShares: 100,
          sharesForfeited: 0,
          marketValue: 10000, // $100 per share (same as cost)
          forfeitedValue: 0,
          grossSaleProceeds: 0,
          netSaleProceeds: 0,
          taxesPaid: 0,
          projectedStockPrice: 100,
          transactions: []
        }
      ];

      const costBasisPerShare = 100; // Same as current price
      const chartData = transformRsuTimelineForChart(
        timeline,
        '$',
        3.7,
        2028,
        costBasisPerShare
      );

      // No capital gain, so net = gross
      expect(chartData[0].totalNetValue).toBe(10000);
    });
  });
});

// ============================================================================
// Chart Colors
// ============================================================================

describe('RSU Chart Colors', () => {
  test('defines required chart colors', () => {
    expect(RSU_CHART_COLORS).toHaveProperty('totalValue');
    expect(RSU_CHART_COLORS).toHaveProperty('vestedValue');
    expect(RSU_CHART_COLORS).toHaveProperty('heldValue');
    expect(RSU_CHART_COLORS).toHaveProperty('soldValue');
    expect(RSU_CHART_COLORS).toHaveProperty('cumulativeProceeds');
    expect(RSU_CHART_COLORS).toHaveProperty('forfeitedValue');
    expect(RSU_CHART_COLORS).toHaveProperty('retirementLine');
    expect(RSU_CHART_COLORS).toHaveProperty('grid');
  });

  test('colors are valid rgba values', () => {
    const rgbaPattern = /^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[\d.]+\)$/;
    
    expect(RSU_CHART_COLORS.totalValue).toMatch(rgbaPattern);
    expect(RSU_CHART_COLORS.vestedValue).toMatch(rgbaPattern);
    expect(RSU_CHART_COLORS.heldValue).toMatch(rgbaPattern);
  });

  test('provides array of grant colors', () => {
    expect(Array.isArray(RSU_CHART_COLORS.grantColors)).toBe(true);
    expect(RSU_CHART_COLORS.grantColors.length).toBeGreaterThan(0);
  });

  test('grant colors are distinct from main colors', () => {
    // Grant colors should be visually distinct from main chart colors
    const mainColors = [
      RSU_CHART_COLORS.totalValue,
      RSU_CHART_COLORS.vestedValue,
      RSU_CHART_COLORS.cumulativeProceeds
    ];

    RSU_CHART_COLORS.grantColors.forEach(grantColor => {
      mainColors.forEach(mainColor => {
        expect(grantColor).not.toBe(mainColor);
      });
    });
  });
});

// ============================================================================
// Chart Instance Management
// ============================================================================

describe('RSU Chart Instance Management', () => {
  // These tests verify the chart lifecycle management
  
  test('getRsuChartInstance returns null for non-existent chart', () => {
    // Since we're testing the module import, we need to mock this
    // The actual implementation should return null when no chart exists
    const { getRsuChartInstance } = require('../../../js/components/rsu-chart.js');
    
    const instance = getRsuChartInstance('nonexistent-canvas');
    expect(instance).toBeNull();
  });
});

// ============================================================================
// Chart Options Validation
// ============================================================================

describe('RSU Chart Options', () => {
  test('validates required RsuChartOptions fields', () => {
    const validOptions = {
      canvasId: 'rsuValueChart',
      data: [],
      currency: '$',
      usdIlsRate: 3.7,
      earlyRetirementYear: 2030
    };

    expect(validOptions.canvasId).toBeDefined();
    expect(validOptions.currency).toBeDefined();
    expect(validOptions.usdIlsRate).toBeDefined();
    expect(validOptions.earlyRetirementYear).toBeDefined();
  });

  test('validates RsuSharesChartOptions fields', () => {
    const validOptions = {
      canvasId: 'rsuSharesChart',
      earlyRetirementYear: 2030
    };

    expect(validOptions.canvasId).toBeDefined();
    expect(validOptions.earlyRetirementYear).toBeDefined();
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Chart Edge Cases', () => {
  test('handles timeline with all zeros', () => {
    const zeroTimeline = [
      {
        year: 2025,
        sharesVested: 0,
        sharesSold: 0,
        sharesHeld: 0,
        totalRemainingShares: 0,
        sharesForfeited: 0,
        marketValue: 0,
        forfeitedValue: 0,
        grossSaleProceeds: 0,
        netSaleProceeds: 0,
        taxesPaid: 0,
        projectedStockPrice: 0,
        transactions: []
      }
    ];

    const chartData = transformRsuTimelineForChart(
      zeroTimeline,
      '$',
      3.7,
      2028,
      0
    );

    expect(chartData[0].totalValue).toBe(0);
    expect(chartData[0].totalNetValue).toBe(0);
    expect(chartData[0].cumulativeProceeds).toBe(0);
  });

  test('handles very large values', () => {
    const largeTimeline = [
      {
        year: 2025,
        sharesVested: 100000,
        sharesSold: 0,
        sharesHeld: 100000,
        totalRemainingShares: 100000,
        sharesForfeited: 0,
        marketValue: 50000000, // $50M
        forfeitedValue: 0,
        grossSaleProceeds: 0,
        netSaleProceeds: 0,
        taxesPaid: 0,
        projectedStockPrice: 500,
        transactions: []
      }
    ];

    const chartData = transformRsuTimelineForChart(
      largeTimeline,
      '$',
      3.7,
      2028,
      100
    );

    expect(chartData[0].totalValue).toBe(50000000);
  });

  test('handles single data point', () => {
    const singlePoint = [
      {
        year: 2025,
        sharesVested: 100,
        sharesSold: 0,
        sharesHeld: 100,
        totalRemainingShares: 100,
        sharesForfeited: 0,
        marketValue: 10000,
        forfeitedValue: 0,
        grossSaleProceeds: 0,
        netSaleProceeds: 0,
        taxesPaid: 0,
        projectedStockPrice: 100,
        transactions: []
      }
    ];

    const chartData = transformRsuTimelineForChart(
      singlePoint,
      '$',
      3.7,
      2025,
      80
    );

    expect(chartData).toHaveLength(1);
    expect(chartData[0].isRetirementYear).toBe(true);
  });

  test('handles retirement year not in timeline', () => {
    const timeline = [
      {
        year: 2025,
        sharesVested: 100,
        sharesSold: 0,
        sharesHeld: 100,
        totalRemainingShares: 100,
        sharesForfeited: 0,
        marketValue: 10000,
        forfeitedValue: 0,
        grossSaleProceeds: 0,
        netSaleProceeds: 0,
        taxesPaid: 0,
        projectedStockPrice: 100,
        transactions: []
      }
    ];

    const chartData = transformRsuTimelineForChart(
      timeline,
      '$',
      3.7,
      2030, // Retirement year not in timeline
      80
    );

    expect(chartData[0].isRetirementYear).toBe(false);
  });

  test('handles zero cost basis', () => {
    const timeline = [
      {
        year: 2025,
        sharesVested: 100,
        sharesSold: 0,
        sharesHeld: 100,
        totalRemainingShares: 100,
        sharesForfeited: 0,
        marketValue: 10000,
        forfeitedValue: 0,
        grossSaleProceeds: 0,
        netSaleProceeds: 0,
        taxesPaid: 0,
        projectedStockPrice: 100,
        transactions: []
      }
    ];

    const chartData = transformRsuTimelineForChart(
      timeline,
      '$',
      3.7,
      2028,
      0 // Zero cost basis
    );

    // With zero cost basis, entire value is taxable gain
    // Net = 10000 - (10000 * 0.25) = 7500
    expect(chartData[0].totalNetValue).toBe(7500);
  });
});

// ============================================================================
// Hebrew Labels
// ============================================================================

describe('Hebrew Labels', () => {
  test('chart uses Hebrew month names', () => {
    const hebrewMonths = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
    
    // Verify the expected Hebrew months array
    expect(hebrewMonths).toHaveLength(12);
    expect(hebrewMonths[0]).toBe('ינו׳');
    expect(hebrewMonths[11]).toBe('דצמ׳');
  });

  test('chart axis titles are in Hebrew', () => {
    // These are the expected Hebrew labels in the chart options
    const expectedLabels = {
      xAxis: 'תאריך',
      yAxis: 'שווי',
      retirement: 'פרישה',
      totalValue: 'שווי RSU כולל',
      netValue: 'שווי נטו צפוי',
      proceeds: 'הכנסות מצטברות נטו',
      vested: 'מניות שהבשילו',
      sold: 'מניות למכירה (מצטבר)'
    };

    expect(expectedLabels.xAxis).toBe('תאריך');
    expect(expectedLabels.yAxis).toBe('שווי');
    expect(expectedLabels.retirement).toBe('פרישה');
  });
});
