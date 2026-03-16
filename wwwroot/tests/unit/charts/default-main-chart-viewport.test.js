import { calculateDefaultMainChartViewport } from '../../../js/components/chart-manager.js';

describe('calculateDefaultMainChartViewport', () => {
  test('returns a safe zero-bounded viewport when there is no yearly data', () => {
    expect(calculateDefaultMainChartViewport(0)).toEqual({
      minIndex: 0,
      maxIndex: 0
    });
  });

  test('caps the default viewport at 30 future years for longer plans', () => {
    expect(calculateDefaultMainChartViewport(66)).toEqual({
      minIndex: 0,
      maxIndex: 30
    });
  });

  test('uses the full plan range for shorter plans', () => {
    expect(calculateDefaultMainChartViewport(15)).toEqual({
      minIndex: 0,
      maxIndex: 14
    });
  });
});
