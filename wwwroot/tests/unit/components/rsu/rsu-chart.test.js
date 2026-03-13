/**
 * RSU Chart Unit Tests
 * Tests for RSU timeline chart data transformation and rendering
 * 
 * Covers issue: RSU timeline chart not displaying
 */

import {
  transformRsuTimelineForChart,
  RSU_CHART_COLORS
} from '../../../../js/components/rsu-chart.js';

describe('RSU Chart', () => {
  // ============================================================================
  // Chart Colors Tests
  // ============================================================================

  describe('Chart Colors', () => {
    test('has defined colors for all chart elements', () => {
      expect(RSU_CHART_COLORS.totalValue).toBeDefined();
      expect(RSU_CHART_COLORS.vestedValue).toBeDefined();
      expect(RSU_CHART_COLORS.heldValue).toBeDefined();
      expect(RSU_CHART_COLORS.cumulativeProceeds).toBeDefined();
      expect(RSU_CHART_COLORS.forfeitedValue).toBeDefined();
      expect(RSU_CHART_COLORS.retirementLine).toBeDefined();
    });

    test('colors are valid rgba format', () => {
      const rgbaPattern = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;
      expect(RSU_CHART_COLORS.totalValue).toMatch(rgbaPattern);
      expect(RSU_CHART_COLORS.vestedValue).toMatch(rgbaPattern);
    });
  });

  // ============================================================================
  // Data Transformation Tests
  // ============================================================================

  describe('transformRsuTimelineForChart', () => {
    const sampleTimeline = [
      {
        year: 2025,
        sharesVested: 250,
        sharesSold: 0,
        sharesHeld: 250,
        sharesForfeited: 0,
        marketValue: 37500,
        forfeitedValue: 0,
        grossSaleProceeds: 0,
        netSaleProceeds: 0,
        taxesPaid: 0,
        projectedStockPrice: 150,
        transactions: []
      },
      {
        year: 2026,
        sharesVested: 250,
        sharesSold: 0,
        sharesHeld: 500,
        sharesForfeited: 0,
        marketValue: 82500,
        forfeitedValue: 0,
        grossSaleProceeds: 0,
        netSaleProceeds: 0,
        taxesPaid: 0,
        projectedStockPrice: 165,
        transactions: []
      },
      {
        year: 2027,
        sharesVested: 250,
        sharesSold: 750,
        sharesHeld: 0,
        sharesForfeited: 0,
        marketValue: 0,
        forfeitedValue: 0,
        grossSaleProceeds: 136125,
        netSaleProceeds: 127093.75,
        taxesPaid: 9031.25,
        projectedStockPrice: 181.5,
        transactions: []
      }
    ];

    test('transforms timeline data for USD display', () => {
      const chartData = transformRsuTimelineForChart(
        sampleTimeline,
        '$',
        3.6, // usdIlsRate
        2027 // retirementYear
      );

      expect(chartData).toHaveLength(3);
      expect(chartData[0].year).toBe(2025);
      expect(chartData[2].year).toBe(2027);
    });

    test('converts values to ILS when display currency is ILS', () => {
      const chartData = transformRsuTimelineForChart(
        sampleTimeline,
        '₪',
        3.6, // usdIlsRate
        2027
      );

      // Values should be converted to ILS (multiplied by exchange rate)
      expect(chartData[0].totalValue).toBeCloseTo(37500 * 3.6, 0);
    });

    test('marks retirement year correctly', () => {
      const chartData = transformRsuTimelineForChart(
        sampleTimeline,
        '$',
        3.6,
        2027
      );

      expect(chartData[0].isRetirementYear).toBe(false);
      expect(chartData[1].isRetirementYear).toBe(false);
      expect(chartData[2].isRetirementYear).toBe(true);
    });

    test('calculates cumulative proceeds', () => {
      const chartData = transformRsuTimelineForChart(
        sampleTimeline,
        '$',
        3.6,
        2027
      );

      expect(chartData[0].cumulativeProceeds).toBe(0);
      expect(chartData[2].cumulativeProceeds).toBeGreaterThan(0);
    });

    test('handles empty timeline', () => {
      const chartData = transformRsuTimelineForChart(
        [],
        '$',
        3.6,
        2027
      );

      expect(chartData).toEqual([]);
    });

    test('returns all required chart data fields', () => {
      const chartData = transformRsuTimelineForChart(
        sampleTimeline,
        '$',
        3.6,
        2027
      );

      const point = chartData[0];
      expect(point).toHaveProperty('year');
      expect(point).toHaveProperty('totalValue');
      expect(point).toHaveProperty('vestedValue');
      expect(point).toHaveProperty('heldValue');
      expect(point).toHaveProperty('cumulativeProceeds');
      expect(point).toHaveProperty('isRetirementYear');
    });
  });
});

// ============================================================================
// Integration Tests for Chart with Timeline Data
// ============================================================================

describe('RSU Chart Integration', () => {
  test('chart data is compatible with Chart.js format', () => {
    const sampleTimeline = [
      {
        year: 2025,
        sharesVested: 250,
        sharesSold: 0,
        sharesHeld: 250,
        sharesForfeited: 0,
        marketValue: 37500,
        forfeitedValue: 0,
        grossSaleProceeds: 0,
        netSaleProceeds: 0,
        taxesPaid: 0,
        projectedStockPrice: 150,
        transactions: []
      }
    ];

    const chartData = transformRsuTimelineForChart(
      sampleTimeline,
      '$',
      3.6,
      2030
    );

    // Chart.js expects numeric values for data points
    expect(typeof chartData[0].year).toBe('number');
    expect(typeof chartData[0].totalValue).toBe('number');
    expect(typeof chartData[0].heldValue).toBe('number');
    expect(typeof chartData[0].cumulativeProceeds).toBe('number');
    
    // Values should not be NaN or undefined
    expect(chartData[0].totalValue).not.toBeNaN();
    expect(chartData[0].heldValue).not.toBeNaN();
  });
});
