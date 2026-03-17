/* eslint-env jest */

function loadModule({ calculationConfig } = {}) {
  jest.resetModules();
  if (calculationConfig) {
    jest.doMock('../../../js/config/calculation-constants.js', () => ({
      CALCULATION_CONFIG: calculationConfig
    }));
  }
  const module = require('../../../js/orchestration/results-coordinator.js');
  jest.dontMock('../../../js/config/calculation-constants.js');
  return module;
}

function createClassList(initialClasses = []) {
  const classes = new Set(initialClasses);
  return {
    add: jest.fn((...names) => names.forEach((name) => classes.add(name))),
    remove: jest.fn((...names) => names.forEach((name) => classes.delete(name))),
    contains: jest.fn((name) => classes.has(name))
  };
}

function createMockElement(initialClasses = []) {
  return {
    textContent: '',
    className: '',
    classList: createClassList(initialClasses)
  };
}

function createDependencies(overrides = {}) {
  const state = {
    accumulationPortfolio: [
      {
        id: 1,
        symbol: 'VTI',
        quantity: 10,
        currentPrice: { amount: 100, currency: 'USD' },
        averageCost: { amount: 80, currency: 'USD' }
      }
    ],
    displayCurrency: '$',
    useRetirementPortfolio: true,
    expenses: [{ id: 1, year: 2045, netAmount: { amount: 1000, currency: 'USD' }, type: 'Trip' }]
  };

  const elements = {
    annualWithdrawalGross: createMockElement(),
    monthlyExpenseGross: createMockElement(),
    'results-tab-info': createMockElement(),
    contributionsBreakdown: createMockElement(),
    startUnrealizedGain: createMockElement(),
    endUnrealizedGain: createMockElement(),
    peakUnrealizedGain: createMockElement(),
    peakTaxToPay: createMockElement(['hidden']),
    accumulationEndUnrealizedGain: createMockElement(),
    accumulationEndTaxToPay: createMockElement(['hidden'])
  };

  const sankeyManager = {
    update: jest.fn()
  };

  return {
    state,
    convertFromUSD: jest.fn((value) => value),
    formatCurrency: jest.fn((value, currency) => `${currency}${value}`),
    setTextContent: jest.fn((id, value) => {
      const element = elements[id];
      if (element) {
        element.textContent = value;
      }
    }),
    getElement: jest.fn((id) => elements[id] ?? null),
    escapeHtml: jest.fn((value) => String(value ?? '')),
    getUsdIlsRate: jest.fn(() => 3.7),
    getEarlyRetirementYear: jest.fn(() => 2045),
    getInputNumber: jest.fn((id, fallback) => {
      if (id === 'birthYear') return 1990;
      if (id === 'fullRetirementAge') return 67;
      if (id === 'inflationRate') return 2;
      if (id === 'capitalGainsTax') return 25;
      if (id === 'targetMonthlyExpense') return 5000;
      if (id === 'withdrawalRate') return 4;
      return fallback;
    }),
    getTargetMonthlyExpenseCurrency: jest.fn(() => '$'),
    convertPortfolioToChartData: jest.fn(() => [{ symbol: 'VTI', value: 1000, percentage: 100 }]),
    updateDonutChart: jest.fn(),
    updateMainChart: jest.fn(),
    updateExpensesChart: jest.fn(),
    getRsuGrants: jest.fn(() => []),
    calculateRsuTimeline: jest.fn(),
    calculatePerGrantTimelines: jest.fn(),
    calculateVestedShares: jest.fn(),
    calculateSection102EligibleShares: jest.fn(),
    getRsuConfiguration: jest.fn(() => ({ currentPricePerShare: 0 })),
    updateRsuValueChart: jest.fn(),
    updateRsuSharesChart: jest.fn(),
    updateRsuNestedDonutChart: jest.fn(),
    getSankeyManager: jest.fn(() => sankeyManager),
    ...overrides
  };
}

function createResult(overrides = {}) {
  return {
    totalContributions: 100000,
    totalAccumulationContributions: 25000,
    totalMonthlyContributions: 25000,
    currentValue: 120000,
    currentCostBasis: 90000,
    peakValue: 300000,
    grossPeakValue: 330000,
    retirementTaxToPay: 30000,
    netAnnualWithdrawal: 48000,
    grossAnnualWithdrawal: 52000,
    netMonthlyExpense: 4000,
    grossMonthlyExpense: 4300,
    formulaMetadata: {
      totalContributions: {
        currentCostBasis: 75000,
        accumulationContributions: 25000,
        computedTotalContributions: 100000,
        usesManualTaxBasis: false,
        manualTaxBasis: null
      },
      annualWithdrawal: {
        peakValueForWithdrawal: 300000,
        withdrawalRate: 4,
        effectiveTaxRate: 7.6923
      },
      peakValue: {
        displayedValueIsGross: true,
        usesRetirementPortfolio: true,
        taxAdjustedPeakValue: 300000,
        retirementTaxToPay: 30000
      }
    },
    preRetirementPortfolio: [{ symbol: 'VTI', value: 150000, percentage: 100 }],
    retirementPortfolio: [{ symbol: 'Bonds', value: 200000, percentage: 100 }],
    yearlyData: [
      { year: 2045, portfolioValue: 300000 },
      { year: 2055, portfolioValue: 180000 }
    ],
    ...overrides
  };
}

describe('results coordinator', () => {
  test('builds formula explanations with converted values and conditional notes', () => {
    const { buildResultsFormulaExplanations } = loadModule();

    const explanations = buildResultsFormulaExplanations({
      result: createResult({
        totalContributions: 50000,
        currentCostBasis: 60000,
        totalMonthlyContributions: 0,
        peakValue: 87500,
        grossPeakValue: 100000,
        retirementTaxToPay: 12500,
        netAnnualWithdrawal: 3500,
        grossAnnualWithdrawal: 3500,
        netMonthlyExpense: 291.6667,
        grossMonthlyExpense: 291.6667,
        currentValue: 100000,
        yearlyData: [
          { year: 2045, portfolioValue: 100000 },
          { year: 2055, portfolioValue: 60000 }
        ],
        formulaMetadata: {
          totalContributions: {
            currentCostBasis: 60000,
            accumulationContributions: 0,
            computedTotalContributions: 60000,
            usesManualTaxBasis: true,
            manualTaxBasis: 50000
          },
          annualWithdrawal: {
            peakValueForWithdrawal: 87500,
            withdrawalRate: 4,
            effectiveTaxRate: 0
          },
          peakValue: {
            displayedValueIsGross: true,
            usesRetirementPortfolio: true,
            taxAdjustedPeakValue: 87500,
            retirementTaxToPay: 12500
          }
        }
      }),
      displayCurrency: '₪',
      usdIlsRate: 4,
      convertFromUSD: (value, currency) => currency === '₪' ? value * 4 : value,
      formatCurrency: (value, currency) => `${currency}${value.toFixed(2)}`
    });

    expect(Object.keys(explanations)).toEqual([
      'totalContributions',
      'annualWithdrawalNet',
      'monthlyExpenseNet',
      'startValue',
      'peakValue',
      'endValue'
    ]);
    expect(explanations.totalContributions.variables).toEqual([
      { label: 'בסיס עלות נוכחי', value: '₪240000.00' },
      { label: 'הפקדות בתקופת הצבירה', value: '₪0.00' },
      { label: 'סה"כ הפקדות מחושב', value: '₪240000.00' },
      { label: 'בסיס מס ידני בשימוש', value: '₪200000.00' }
    ]);
    expect(explanations.totalContributions.notes).toContain('הערה: הוזן בסיס מס ידני ולכן הערך המוצג מבוסס עליו במקום הסכום המחושב.');
    expect(explanations.peakValue.notes).toContain('הערה: בעת המעבר לתיק פרישה מחושב גם מס איזון חד-פעמי, ולכן מוצגים גם הערך ברוטו וגם הערך לאחר מס.');
    expect(explanations.annualWithdrawalNet.variables).toContainEqual({ label: 'שיעור מס אפקטיבי', value: '0.00%' });
    expect(explanations.endValue.variables).toContainEqual({ label: 'שווי סופי', value: '₪240000.00' });
  });

  test('displays summary cards, contribution breakdown, and retirement tax messaging', () => {
    const { createResultsCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createResultsCoordinator(dependencies);

    coordinator.displayResults(createResult());

    expect(dependencies.setTextContent).toHaveBeenCalledWith('totalContributions', '$100000');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('annualWithdrawalNet', '$48000');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('monthlyExpenseNet', '$4000');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('startValue', '$120000');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('endValue', '$180000');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('peakValue', '$330000');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('accumulationEndValue', '$330000');
    expect(dependencies.getElement('results-tab-info').textContent).toBe('($4000/חודש)');
    expect(dependencies.getElement('contributionsBreakdown').textContent).toBe('מתוכם הפקדות חודשיות: $25000');
    expect(dependencies.getElement('peakTaxToPay').textContent).toBe('מס לתשלום: $30000');
    expect(dependencies.getElement('peakTaxToPay').classList.remove).toHaveBeenCalledWith('hidden');
    expect(dependencies.getElement('peakUnrealizedGain').classList.add).toHaveBeenCalledWith('hidden');
  });

  test('prefers result metadata over ui state for retirement-portfolio explainability', () => {
    const { createResultsCoordinator } = loadModule();
    const dependencies = createDependencies({
      state: {
        accumulationPortfolio: [],
        displayCurrency: '$',
        useRetirementPortfolio: true,
        expenses: []
      }
    });
    const coordinator = createResultsCoordinator(dependencies);

    coordinator.displayResults(createResult({
      peakValue: 280000,
      grossPeakValue: 280000,
      retirementTaxToPay: 0,
      formulaMetadata: {
        totalContributions: {
          currentCostBasis: 75000,
          accumulationContributions: 25000,
          computedTotalContributions: 100000,
          usesManualTaxBasis: false,
          manualTaxBasis: null
        },
        annualWithdrawal: {
          peakValueForWithdrawal: 280000,
          withdrawalRate: 4,
          effectiveTaxRate: 0
        },
        peakValue: {
          displayedValueIsGross: false,
          usesRetirementPortfolio: false,
          taxAdjustedPeakValue: 280000,
          retirementTaxToPay: 0
        }
      }
    }));

    expect(dependencies.setTextContent).toHaveBeenCalledWith('peakValue', '$280000');
    expect(dependencies.getElement('peakTaxToPay').classList.add).toHaveBeenCalledWith('hidden');
    expect(dependencies.getElement('peakUnrealizedGain').classList.remove).toHaveBeenCalledWith('hidden');
  });

  test('coordinates donut, main, expenses, and sankey chart refreshes without RSU charts when no grants exist', () => {
    const { createResultsCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createResultsCoordinator(dependencies);
    const result = createResult();

    coordinator.updateCharts(result);

    expect(dependencies.convertPortfolioToChartData).toHaveBeenCalledWith(
      dependencies.state.accumulationPortfolio,
      3.7
    );
    expect(dependencies.updateDonutChart).toHaveBeenNthCalledWith(
      1,
      'startAccumulationChart',
      [{ symbol: 'VTI', value: 1000, percentage: 100 }],
      expect.any(Number),
      '$',
      3.7
    );
    expect(dependencies.updateDonutChart).toHaveBeenNthCalledWith(
      2,
      'startRetirementChart',
      result.preRetirementPortfolio,
      2045,
      '$',
      3.7
    );
    expect(dependencies.updateDonutChart).toHaveBeenNthCalledWith(
      3,
      'endRetirementChart',
      result.retirementPortfolio,
      2055,
      '$',
      3.7
    );
    expect(dependencies.updateDonutChart).toHaveBeenNthCalledWith(
      4,
      'accumulationEndChart',
      result.preRetirementPortfolio,
      2045,
      '$',
      3.7
    );
    expect(dependencies.updateMainChart).toHaveBeenCalledWith({
      canvasId: 'mainChart',
      data: result,
      currency: '$',
      usdIlsRate: 3.7,
      earlyRetirementYear: 2045,
      expenses: dependencies.state.expenses,
      inflationRate: 2,
      capitalGainsTax: 25,
      targetMonthlyExpense: 5000,
      targetMonthlyExpenseCurrency: '$',
      withdrawalRate: 4,
      birthYear: 1990,
      fullRetirementAge: 67,
      rsuTimeline: undefined
    });
    expect(dependencies.updateExpensesChart).toHaveBeenCalledTimes(1);
    expect(dependencies.getSankeyManager().update).toHaveBeenCalledWith(result, '$', 3.7);
    expect(dependencies.updateRsuValueChart).not.toHaveBeenCalled();
  });

  test('uses a dedicated projection-age fallback instead of the simulation-years safety cap', () => {
    const { createResultsCoordinator } = loadModule({
      calculationConfig: {
        MAX_SIMULATION_YEARS: 80
      }
    });
    const dependencies = createDependencies();
    const coordinator = createResultsCoordinator(dependencies);
    const result = createResult({
      yearlyData: []
    });

    coordinator.updateCharts(result);

    expect(dependencies.updateDonutChart).toHaveBeenNthCalledWith(
      3,
      'endRetirementChart',
      result.retirementPortfolio,
      2090,
      '$',
      3.7
    );
  });
});
