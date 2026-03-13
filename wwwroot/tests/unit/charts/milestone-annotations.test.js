/**
 * Milestone Annotations Tests
 *
 * Tests for buildMilestoneAnnotations() in chart-manager.ts.
 *
 * Covers:
 *  - Normal cases: each milestone renders its annotation
 *  - Missing-data cases: absent milestones produce no annotation
 *  - Overlapping-year cases: labels are staggered so they remain readable
 *  - RTL label compatibility: label text contains Hebrew characters
 */

import { buildMilestoneAnnotations } from '../../../js/components/chart-manager.js';

// Minimal yearly-data helper
function makeYears(...years) {
  return years.map(year => ({ year, age: year - 1990 }));
}

describe('buildMilestoneAnnotations', () => {
  // ===========================================================================
  // Normal cases – each milestone independently
  // ===========================================================================

  describe('Early Retirement annotation', () => {
    test('renders when earlyRetirementYear is in yearlyData', () => {
      const yearlyData = makeYears(2030, 2035, 2040, 2045, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2040
      });

      expect(annotations).toHaveProperty('earlyRetirementLine');
      const ann = annotations.earlyRetirementLine;
      expect(ann.label.content).toBe('פרישה מוקדמת');
      expect(ann.xMin).toBe(2);   // index of 2040
      expect(ann.xMax).toBe(2);
    });

    test('does not render when earlyRetirementYear is not in yearlyData', () => {
      const yearlyData = makeYears(2030, 2035, 2045);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2040
      });

      expect(annotations).not.toHaveProperty('earlyRetirementLine');
    });
  });

  describe('Full Retirement annotation', () => {
    test('renders when birthYear + fullRetirementAge is in yearlyData', () => {
      const yearlyData = makeYears(2030, 2040, 2052, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2030,
        birthYear: 1985,
        fullRetirementAge: 67   // full retirement year = 2052
      });

      expect(annotations).toHaveProperty('fullRetirementLine');
      const ann = annotations.fullRetirementLine;
      expect(ann.label.content).toBe('פרישה מלאה');
      expect(ann.xMin).toBe(2);   // index of 2052
    });

    test('does not render when birthYear is missing', () => {
      const yearlyData = makeYears(2030, 2052, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2030,
        fullRetirementAge: 67
      });

      expect(annotations).not.toHaveProperty('fullRetirementLine');
    });

    test('does not render when fullRetirementAge is missing', () => {
      const yearlyData = makeYears(2030, 2052, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2030,
        birthYear: 1985
      });

      expect(annotations).not.toHaveProperty('fullRetirementLine');
    });
  });

  describe('FIRE Target annotation', () => {
    test('renders when explicit fireTargetYear is in yearlyData', () => {
      const yearlyData = makeYears(2030, 2038, 2052, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2040,
        fireTargetYear: 2038
      });

      expect(annotations).toHaveProperty('fireTargetLine');
      const ann = annotations.fireTargetLine;
      expect(ann.label.content).toBe('יעד הושג');
      expect(ann.xMin).toBe(1);   // index of 2038
    });

    test('renders when birthYear + fireAgeReached is in yearlyData', () => {
      const yearlyData = makeYears(2030, 2038, 2052, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2030,
        birthYear: 1990,
        fireAgeReached: 48    // FIRE target year = 2038
      });

      expect(annotations).toHaveProperty('fireTargetLine');
      const ann = annotations.fireTargetLine;
      expect(ann.label.content).toBe('יעד הושג');
      expect(ann.xMin).toBe(1);   // index of 2038
    });

    test('does not render when fireAgeReached is missing', () => {
      const yearlyData = makeYears(2030, 2038, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2030,
        birthYear: 1990
      });

      expect(annotations).not.toHaveProperty('fireTargetLine');
    });
  });

  describe('RSU Depletion annotation', () => {
    test('renders from yearlyData when holdings reach zero on the main chart timeline', () => {
      const yearlyData = [
        { year: 2030, age: 40, rsuSharesSold: 0, rsuHoldingsValue: 12000 },
        { year: 2031, age: 41, rsuSharesSold: 50, rsuHoldingsValue: 3000 },
        { year: 2032, age: 42, rsuSharesSold: 25, rsuHoldingsValue: 0 },
        { year: 2033, age: 43, rsuSharesSold: 0, rsuHoldingsValue: 0 }
      ];
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2030
      });

      expect(annotations).toHaveProperty('rsuDepletionLine');
      const ann = annotations.rsuDepletionLine;
      expect(ann.label.content).toBe('כל ה-RSU נמכרו');
      expect(ann.xMin).toBe(2);   // index of 2032
    });

    test('renders for the last year with sharesSold > 0', () => {
      const yearlyData = makeYears(2030, 2034, 2036, 2040, 2050);
      const rsuTimeline = [
        { year: 2030, sharesSold: 100 },
        { year: 2034, sharesSold: 200 },
        { year: 2036, sharesSold: 0 },   // no sale
        { year: 2040, sharesSold: 50 },  // last sale
        { year: 2045, sharesSold: 0 }
      ];
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2030,
        rsuTimeline
      });

      expect(annotations).toHaveProperty('rsuDepletionLine');
      const ann = annotations.rsuDepletionLine;
      expect(ann.label.content).toBe('כל ה-RSU נמכרו');
      expect(ann.xMin).toBe(3);   // index of 2040
    });

    test('does not render when rsuTimeline is empty', () => {
      const yearlyData = makeYears(2030, 2040);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2030,
        rsuTimeline: []
      });

      expect(annotations).not.toHaveProperty('rsuDepletionLine');
    });

    test('does not render when rsuTimeline has no sales', () => {
      const yearlyData = makeYears(2030, 2040);
      const rsuTimeline = [
        { year: 2030, sharesSold: 0 },
        { year: 2040, sharesSold: 0 }
      ];
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2030,
        rsuTimeline
      });

      expect(annotations).not.toHaveProperty('rsuDepletionLine');
    });

    test('does not render when rsuTimeline is undefined', () => {
      const yearlyData = makeYears(2030, 2040);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2030
      });

      expect(annotations).not.toHaveProperty('rsuDepletionLine');
    });
  });

  // ===========================================================================
  // Missing-data cases – empty yearlyData or no matching years
  // ===========================================================================

  describe('Missing data cases', () => {
    test('returns empty object when yearlyData is empty', () => {
      const annotations = buildMilestoneAnnotations([], {
        earlyRetirementYear: 2040,
        birthYear: 1985,
        fullRetirementAge: 67,
        fireAgeReached: 55,
        rsuTimeline: [{ year: 2042, sharesSold: 100 }]
      });

      expect(annotations).toEqual({});
    });

    test('only renders events whose year appears in yearlyData', () => {
      // yearlyData only covers 2030-2040; full-retirement (2052) is absent
      const yearlyData = makeYears(2030, 2035, 2040);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2035,
        birthYear: 1985,
        fullRetirementAge: 67    // 2052 – not in chart
      });

      expect(annotations).toHaveProperty('earlyRetirementLine');
      expect(annotations).not.toHaveProperty('fullRetirementLine');
    });
  });

  // ===========================================================================
  // Overlapping-year cases – labels must be staggered
  // ===========================================================================

  describe('Overlapping milestones', () => {
    test('two events on the same year get different label positions', () => {
      // earlyRetirementYear and FIRE target both in 2040
      const yearlyData = makeYears(2030, 2040, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2040,
        birthYear: 1990,
        fireAgeReached: 50    // 1990 + 50 = 2040 – same year
      });

      expect(annotations).toHaveProperty('earlyRetirementLine');
      expect(annotations).toHaveProperty('fireTargetLine');

      // Both labels are at the top (position: 'end') but staggered via yAdjust
      expect(annotations.earlyRetirementLine.label.position).toBe('end');
      expect(annotations.fireTargetLine.label.position).toBe('end');
      const mockCtx = { chart: { scales: { x: { getPixelForValue: (val) => val * 100 } } } };
      const earlyYAdjust = typeof annotations.earlyRetirementLine.label.yAdjust === 'function' ? annotations.earlyRetirementLine.label.yAdjust(mockCtx) : annotations.earlyRetirementLine.label.yAdjust;
      const fireYAdjust  = typeof annotations.fireTargetLine.label.yAdjust === 'function' ? annotations.fireTargetLine.label.yAdjust(mockCtx) : annotations.fireTargetLine.label.yAdjust;
      expect(earlyYAdjust).not.toBe(fireYAdjust);
    });

    test('three events on the same year each get a unique yAdjust', () => {
      const yearlyData = makeYears(2030, 2040, 2060);
      // early retirement, full retirement, and FIRE target all in 2040
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2040,
        birthYear: 1973,       // 1973 + 67 = 2040 (full retirement)
        fullRetirementAge: 67,
        fireAgeReached: 67     // 1973 + 67 = 2040 (FIRE target)
      });

      const mockCtx = { chart: { scales: { x: { getPixelForValue: (val) => val * 100 } } } };
      const yAdjusts = ['earlyRetirementLine', 'fullRetirementLine', 'fireTargetLine']
        .filter(key => annotations[key] !== undefined)
        .map(key => {
           const label = annotations[key].label;
           return typeof label.yAdjust === 'function' ? label.yAdjust(mockCtx) : label.yAdjust;
        });

      expect(new Set(yAdjusts).size).toBe(yAdjusts.length);
    });

    test('events on different years do not affect each others positions', () => {
      const yearlyData = makeYears(2035, 2040, 2052, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2035,
        birthYear: 1985,
        fullRetirementAge: 67,  // 2052
        fireAgeReached: 50      // 2035 same as early retirement
      });

      // fullRetirementLine is alone on 2052 – position should be 'end' with yAdjust 5
      if (annotations.fullRetirementLine) {
        expect(annotations.fullRetirementLine.label.position).toBe('end');
        const mockCtx = { chart: { scales: { x: { getPixelForValue: (val) => val * 100 } } } };
        const yAdjust = annotations.fullRetirementLine.label.yAdjust;
        expect(typeof yAdjust === 'function' ? yAdjust(mockCtx) : yAdjust).toBe(5);
      }
    });
  });

  // ===========================================================================
  // RTL compatibility – label text is Hebrew
  // ===========================================================================

  describe('Milestone label text', () => {
    test('rendered annotation labels match the expected localized strings', () => {
      const yearlyData = makeYears(2030, 2035, 2040, 2045, 2052, 2055, 2060);
      const rsuTimeline = [{ year: 2045, sharesSold: 100 }];

      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2035,
        birthYear: 1985,
        fullRetirementAge: 67,   // 2052
        fireAgeReached: 50,      // 2035
        rsuTimeline
      });

      expect(annotations.earlyRetirementLine.label.content).toBe('פרישה מוקדמת');
      expect(annotations.fireTargetLine.label.content).toBe('יעד הושג');
      expect(annotations.fullRetirementLine.label.content).toBe('פרישה מלאה');
      expect(annotations.rsuDepletionLine.label.content).toBe('כל ה-RSU נמכרו');
    });
  });

  // ===========================================================================
  // Visual rendering properties
  // ===========================================================================

  describe('Annotation visual properties', () => {
    test('each annotation is a vertical line (type = line)', () => {
      const yearlyData = makeYears(2030, 2040, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2040
      });

      for (const key of Object.keys(annotations)) {
        expect(annotations[key].type).toBe('line');
      }
    });

    test('labels are displayed', () => {
      const yearlyData = makeYears(2030, 2040, 2060);
      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2040
      });

      for (const key of Object.keys(annotations)) {
        expect(annotations[key].label.display).toBe(true);
      }
    });

    test('each milestone uses a distinct border colour', () => {
      const yearlyData = makeYears(2030, 2035, 2040, 2052, 2055, 2060);
      const rsuTimeline = [{ year: 2055, sharesSold: 100 }];

      const annotations = buildMilestoneAnnotations(yearlyData, {
        earlyRetirementYear: 2035,
        birthYear: 1985,
        fullRetirementAge: 67,
        fireAgeReached: 50,
        rsuTimeline
      });

      const colors = Object.values(annotations).map(a => a.borderColor);
      expect(new Set(colors).size).toBe(colors.length);
    });
  });
});
