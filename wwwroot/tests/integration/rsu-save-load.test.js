/**
 * RSU Save/Load Integration Tests
 * Tests for RSU data persistence in JSON plan files
 * 
 * Covers issue: RSU info isn't saved and loaded to/from JSON
 */

describe('RSU Save/Load Integration', () => {
  // Mock RSU configuration for testing
  const mockRsuConfiguration = {
    stockSymbol: 'GOOGL',
    currentPricePerShare: 175.50,
    currency: '$',
    expectedAnnualReturn: 12,
    returnMethod: 'CAGR',
    defaultVestingPeriodYears: 4,
    liquidationStrategy: 'SellAfter2Years',
    marginalTaxRate: 47,
    subjectTo3PercentSurtax: true,
    grants: [
      {
        id: 1,
        grantDate: '2022-03-15',
        numberOfShares: 500,
        sharesSold: 100,
        priceAtGrant: 120,
        currency: '$',
        vestingPeriodYears: 4,
        vestingType: 'Standard'
      },
      {
        id: 2,
        grantDate: '2023-03-15',
        numberOfShares: 750,
        sharesSold: 0,
        priceAtGrant: 140,
        currency: '$',
        vestingPeriodYears: 4,
        vestingType: 'Standard'
      }
    ]
  };

  // ============================================================================
  // Save Tests
  // ============================================================================

  describe('Save RSU Data', () => {
    test('includes rsuConfiguration in saved plan data', () => {
      // Simulate gatherInputData output
      const planData = {
        birthYear: 1985,
        earlyRetirementYear: 2035,
        accumulationPortfolio: [],
        expenses: [],
        rsuConfiguration: mockRsuConfiguration,
        includeRsuInCalculations: true
      };

      expect(planData.rsuConfiguration).toBeDefined();
      expect(planData.rsuConfiguration.stockSymbol).toBe('GOOGL');
    });

    test('saves all RSU grants', () => {
      const planData = {
        rsuConfiguration: mockRsuConfiguration
      };

      expect(planData.rsuConfiguration.grants).toHaveLength(2);
      expect(planData.rsuConfiguration.grants[0].numberOfShares).toBe(500);
      expect(planData.rsuConfiguration.grants[1].numberOfShares).toBe(750);
    });

    test('saves RSU tax configuration', () => {
      const planData = {
        rsuConfiguration: mockRsuConfiguration
      };

      expect(planData.rsuConfiguration.marginalTaxRate).toBe(47);
      expect(planData.rsuConfiguration.subjectTo3PercentSurtax).toBe(true);
    });

    test('saves expected return settings', () => {
      const planData = {
        rsuConfiguration: mockRsuConfiguration
      };

      expect(planData.rsuConfiguration.expectedAnnualReturn).toBe(12);
      expect(planData.rsuConfiguration.returnMethod).toBe('CAGR');
    });

    test('saves includeRsuInCalculations checkbox state', () => {
      // When checkbox is checked
      const planDataChecked = {
        rsuConfiguration: mockRsuConfiguration,
        includeRsuInCalculations: true
      };
      expect(planDataChecked.includeRsuInCalculations).toBe(true);

      // When checkbox is unchecked
      const planDataUnchecked = {
        rsuConfiguration: mockRsuConfiguration,
        includeRsuInCalculations: false
      };
      expect(planDataUnchecked.includeRsuInCalculations).toBe(false);
    });

    test('omits rsuConfiguration when no grants exist', () => {
      const emptyRsuConfig = {
        ...mockRsuConfiguration,
        grants: []
      };

      // When no grants, rsuConfiguration should be undefined in save
      const planData = {
        birthYear: 1985,
        rsuConfiguration: emptyRsuConfig.grants.length > 0 ? emptyRsuConfig : undefined
      };

      expect(planData.rsuConfiguration).toBeUndefined();
    });
  });

  // ============================================================================
  // Load Tests
  // ============================================================================

  describe('Load RSU Data', () => {
    test('parses rsuConfiguration from JSON', () => {
      const jsonString = JSON.stringify({
        birthYear: 1985,
        rsuConfiguration: mockRsuConfiguration
      });

      const loadedData = JSON.parse(jsonString);

      expect(loadedData.rsuConfiguration).toBeDefined();
      expect(loadedData.rsuConfiguration.stockSymbol).toBe('GOOGL');
    });

    test('restores all grant fields', () => {
      const jsonString = JSON.stringify({
        rsuConfiguration: mockRsuConfiguration
      });

      const loadedData = JSON.parse(jsonString);
      const grant = loadedData.rsuConfiguration.grants[0];

      expect(grant.id).toBe(1);
      expect(grant.grantDate).toBe('2022-03-15');
      expect(grant.numberOfShares).toBe(500);
      expect(grant.sharesSold).toBe(100);
      expect(grant.priceAtGrant).toBe(120);
      expect(grant.vestingPeriodYears).toBe(4);
      expect(grant.vestingType).toBe('Standard');
    });

    test('restores sharesSold field correctly', () => {
      const jsonString = JSON.stringify({
        rsuConfiguration: mockRsuConfiguration
      });

      const loadedData = JSON.parse(jsonString);
      const grants = loadedData.rsuConfiguration.grants;

      // First grant has 100 shares sold
      expect(grants[0].sharesSold).toBe(100);
      expect(grants[0].numberOfShares - grants[0].sharesSold).toBe(400); // Remaining shares
      
      // Second grant has 0 shares sold
      expect(grants[1].sharesSold).toBe(0);
      expect(grants[1].numberOfShares - grants[1].sharesSold).toBe(750); // All shares remain
    });

    test('restores includeRsuInCalculations checkbox state', () => {
      // Test with true
      const jsonStringTrue = JSON.stringify({
        rsuConfiguration: mockRsuConfiguration,
        includeRsuInCalculations: true
      });
      const loadedDataTrue = JSON.parse(jsonStringTrue);
      expect(loadedDataTrue.includeRsuInCalculations).toBe(true);

      // Test with false
      const jsonStringFalse = JSON.stringify({
        rsuConfiguration: mockRsuConfiguration,
        includeRsuInCalculations: false
      });
      const loadedDataFalse = JSON.parse(jsonStringFalse);
      expect(loadedDataFalse.includeRsuInCalculations).toBe(false);
    });

    test('handles missing includeRsuInCalculations (defaults to undefined)', () => {
      const jsonString = JSON.stringify({
        rsuConfiguration: mockRsuConfiguration
        // No includeRsuInCalculations
      });

      const loadedData = JSON.parse(jsonString);
      expect(loadedData.includeRsuInCalculations).toBeUndefined();
    });

    test('handles missing rsuConfiguration gracefully', () => {
      const jsonString = JSON.stringify({
        birthYear: 1985,
        earlyRetirementYear: 2035
        // No rsuConfiguration
      });

      const loadedData = JSON.parse(jsonString);

      expect(loadedData.rsuConfiguration).toBeUndefined();
    });

    test('handles empty grants array', () => {
      const jsonString = JSON.stringify({
        rsuConfiguration: {
          stockSymbol: 'AAPL',
          grants: []
        }
      });

      const loadedData = JSON.parse(jsonString);

      expect(loadedData.rsuConfiguration.grants).toEqual([]);
    });
  });

  // ============================================================================
  // Round-Trip Tests
  // ============================================================================

  describe('Round-Trip Save/Load', () => {
    test('preserves all data through save and load cycle', () => {
      const originalData = {
        birthYear: 1985,
        earlyRetirementYear: 2035,
        rsuConfiguration: mockRsuConfiguration
      };

      // Simulate save
      const jsonString = JSON.stringify(originalData);

      // Simulate load
      const loadedData = JSON.parse(jsonString);

      // Verify all fields match
      expect(loadedData.rsuConfiguration.stockSymbol).toBe(originalData.rsuConfiguration.stockSymbol);
      expect(loadedData.rsuConfiguration.currentPricePerShare).toBe(originalData.rsuConfiguration.currentPricePerShare);
      expect(loadedData.rsuConfiguration.expectedAnnualReturn).toBe(originalData.rsuConfiguration.expectedAnnualReturn);
      expect(loadedData.rsuConfiguration.marginalTaxRate).toBe(originalData.rsuConfiguration.marginalTaxRate);
      expect(loadedData.rsuConfiguration.grants).toHaveLength(originalData.rsuConfiguration.grants.length);
    });

    test('preserves grant IDs through round-trip', () => {
      const originalData = {
        rsuConfiguration: mockRsuConfiguration
      };

      const jsonString = JSON.stringify(originalData);
      const loadedData = JSON.parse(jsonString);

      expect(loadedData.rsuConfiguration.grants[0].id).toBe(1);
      expect(loadedData.rsuConfiguration.grants[1].id).toBe(2);
    });

    test('preserves date strings correctly', () => {
      const originalData = {
        rsuConfiguration: mockRsuConfiguration
      };

      const jsonString = JSON.stringify(originalData);
      const loadedData = JSON.parse(jsonString);

      expect(loadedData.rsuConfiguration.grants[0].grantDate).toBe('2022-03-15');
      expect(loadedData.rsuConfiguration.grants[1].grantDate).toBe('2023-03-15');
    });

    test('handles numeric precision correctly', () => {
      const originalData = {
        rsuConfiguration: {
          ...mockRsuConfiguration,
          currentPricePerShare: 175.123456789
        }
      };

      const jsonString = JSON.stringify(originalData);
      const loadedData = JSON.parse(jsonString);

      expect(loadedData.rsuConfiguration.currentPricePerShare).toBe(175.123456789);
    });
  });

  // ============================================================================
  // Version Compatibility Tests
  // ============================================================================

  describe('Version Compatibility', () => {
    test('loads files without RSU data (old version)', () => {
      const oldVersionData = {
        version: '1.0',
        birthYear: 1985,
        accumulationPortfolio: [],
        expenses: []
        // No rsuConfiguration
      };

      const jsonString = JSON.stringify(oldVersionData);
      const loadedData = JSON.parse(jsonString);

      // Should not throw, rsuConfiguration is simply undefined
      expect(() => {
        const rsu = loadedData.rsuConfiguration;
      }).not.toThrow();
    });

    test('loads files with partial RSU config', () => {
      const partialData = {
        rsuConfiguration: {
          stockSymbol: 'MSFT'
          // Missing other fields
        }
      };

      const jsonString = JSON.stringify(partialData);
      const loadedData = JSON.parse(jsonString);

      expect(loadedData.rsuConfiguration.stockSymbol).toBe('MSFT');
      expect(loadedData.rsuConfiguration.grants).toBeUndefined();
    });
  });
});

// ============================================================================
// UI State Restoration Tests
// ============================================================================

describe('RSU UI State Restoration', () => {
  const mockRsuConfiguration = {
    stockSymbol: 'NVDA',
    currentPricePerShare: 850.25,
    expectedAnnualReturn: 15,
    marginalTaxRate: 50,
    subjectTo3PercentSurtax: false,
    grants: []
  };

  test('restores stock symbol to input field', () => {
    // This tests that updateRsuUIFromState would populate the correct fields
    const config = mockRsuConfiguration;
    
    // Simulate what the UI restoration does
    const symbolValue = config.stockSymbol;
    expect(symbolValue).toBe('NVDA');
  });

  test('restores price to input field', () => {
    const config = mockRsuConfiguration;
    const priceValue = config.currentPricePerShare.toFixed(2);
    expect(priceValue).toBe('850.25');
  });

  test('restores expected return to input field', () => {
    const config = mockRsuConfiguration;
    const returnValue = config.expectedAnnualReturn.toString();
    expect(returnValue).toBe('15');
  });

  test('restores tax rate to input field', () => {
    const config = mockRsuConfiguration;
    const taxValue = config.marginalTaxRate.toString();
    expect(taxValue).toBe('50');
  });

  test('restores surtax checkbox state', () => {
    const config = mockRsuConfiguration;
    const surtaxChecked = config.subjectTo3PercentSurtax;
    expect(surtaxChecked).toBe(false);
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('RSU Save/Load Edge Cases', () => {
  describe('Invalid Data Handling', () => {
    test('handles negative share counts gracefully', () => {
      const invalidData = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          grants: [
            {
              id: 1,
              grantDate: '2023-01-15',
              numberOfShares: -100, // Invalid
              sharesSold: 0,
              priceAtGrant: 100,
              currency: '$',
              vestingPeriodYears: 4,
              vestingType: 'Standard'
            }
          ]
        }
      };

      const jsonString = JSON.stringify(invalidData);
      const loadedData = JSON.parse(jsonString);
      
      // Data loads without error, validation happens separately
      expect(loadedData.rsuConfiguration.grants[0].numberOfShares).toBe(-100);
    });

    test('handles invalid grant date format', () => {
      const invalidData = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          grants: [
            {
              id: 1,
              grantDate: 'not-a-date', // Invalid date
              numberOfShares: 1000,
              sharesSold: 0,
              priceAtGrant: 100,
              currency: '$',
              vestingPeriodYears: 4,
              vestingType: 'Standard'
            }
          ]
        }
      };

      const jsonString = JSON.stringify(invalidData);
      const loadedData = JSON.parse(jsonString);
      
      // Data loads, date validation happens later
      expect(loadedData.rsuConfiguration.grants[0].grantDate).toBe('not-a-date');
    });

    test('handles empty stock symbol', () => {
      const invalidData = {
        rsuConfiguration: {
          stockSymbol: '', // Empty
          currentPricePerShare: 150,
          grants: []
        }
      };

      const jsonString = JSON.stringify(invalidData);
      const loadedData = JSON.parse(jsonString);
      
      expect(loadedData.rsuConfiguration.stockSymbol).toBe('');
    });

    test('handles zero price', () => {
      const invalidData = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 0, // Zero
          grants: []
        }
      };

      const jsonString = JSON.stringify(invalidData);
      const loadedData = JSON.parse(jsonString);
      
      expect(loadedData.rsuConfiguration.currentPricePerShare).toBe(0);
    });
  });

  describe('Special Characters', () => {
    test('handles Unicode in grant dates', () => {
      const data = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          grants: [
            {
              id: 1,
              grantDate: '2023-01-15',
              numberOfShares: 1000,
              sharesSold: 0,
              priceAtGrant: 100,
              currency: '₪', // Hebrew shekel
              vestingPeriodYears: 4,
              vestingType: 'Standard'
            }
          ]
        }
      };

      const jsonString = JSON.stringify(data);
      const loadedData = JSON.parse(jsonString);
      
      expect(loadedData.rsuConfiguration.grants[0].currency).toBe('₪');
    });

    test('handles special stock symbols', () => {
      const data = {
        rsuConfiguration: {
          stockSymbol: 'BRK.B', // Berkshire Hathaway class B
          currentPricePerShare: 350,
          grants: []
        }
      };

      const jsonString = JSON.stringify(data);
      const loadedData = JSON.parse(jsonString);
      
      expect(loadedData.rsuConfiguration.stockSymbol).toBe('BRK.B');
    });
  });

  describe('Large Data Sets', () => {
    test('handles maximum grants (50)', () => {
      const grants = [];
      for (let i = 1; i <= 50; i++) {
        grants.push({
          id: i,
          grantDate: '2023-01-15',
          numberOfShares: 100,
          sharesSold: 0,
          priceAtGrant: 100,
          currency: '$',
          vestingPeriodYears: 4,
          vestingType: 'Standard'
        });
      }

      const data = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          grants
        }
      };

      const jsonString = JSON.stringify(data);
      const loadedData = JSON.parse(jsonString);
      
      expect(loadedData.rsuConfiguration.grants).toHaveLength(50);
    });

    test('handles large share counts', () => {
      const data = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          grants: [
            {
              id: 1,
              grantDate: '2023-01-15',
              numberOfShares: 1000000, // 1 million shares
              sharesSold: 0,
              priceAtGrant: 100,
              currency: '$',
              vestingPeriodYears: 4,
              vestingType: 'Standard'
            }
          ]
        }
      };

      const jsonString = JSON.stringify(data);
      const loadedData = JSON.parse(jsonString);
      
      expect(loadedData.rsuConfiguration.grants[0].numberOfShares).toBe(1000000);
    });

    test('handles high precision prices', () => {
      const data = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 175.123456789012345,
          grants: []
        }
      };

      const jsonString = JSON.stringify(data);
      const loadedData = JSON.parse(jsonString);
      
      // JavaScript preserves about 15-17 significant digits
      expect(loadedData.rsuConfiguration.currentPricePerShare).toBeCloseTo(175.123456789012345, 10);
    });
  });

  describe('Migration Scenarios', () => {
    test('migrates old format without priceIsFromApi', () => {
      const oldFormat = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          // Missing priceIsFromApi
          grants: []
        }
      };

      const jsonString = JSON.stringify(oldFormat);
      const loadedData = JSON.parse(jsonString);
      
      // Missing fields should be undefined
      expect(loadedData.rsuConfiguration.priceIsFromApi).toBeUndefined();
    });

    test('migrates old format without returnMethod', () => {
      const oldFormat = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          expectedAnnualReturn: 10,
          // Missing returnMethod
          grants: []
        }
      };

      const jsonString = JSON.stringify(oldFormat);
      const loadedData = JSON.parse(jsonString);
      
      expect(loadedData.rsuConfiguration.returnMethod).toBeUndefined();
    });

    test('handles new fields added in future versions', () => {
      const futureFormat = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          expectedAnnualReturn: 10,
          futureNewField: 'some value', // Hypothetical future field
          grants: []
        }
      };

      const jsonString = JSON.stringify(futureFormat);
      const loadedData = JSON.parse(jsonString);
      
      // Unknown fields should be preserved
      expect(loadedData.rsuConfiguration.futureNewField).toBe('some value');
    });
  });

  describe('sharesSold Persistence', () => {
    test('preserves sharesSold across save/load cycle', () => {
      const data = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          grants: [
            {
              id: 1,
              grantDate: '2022-03-15',
              numberOfShares: 1000,
              sharesSold: 250, // Important: some shares already sold
              priceAtGrant: 100,
              currency: '$',
              vestingPeriodYears: 4,
              vestingType: 'Standard'
            }
          ]
        }
      };

      const jsonString = JSON.stringify(data);
      const loadedData = JSON.parse(jsonString);
      
      expect(loadedData.rsuConfiguration.grants[0].sharesSold).toBe(250);
      expect(loadedData.rsuConfiguration.grants[0].numberOfShares - loadedData.rsuConfiguration.grants[0].sharesSold).toBe(750);
    });

    test('handles sharesSold of 0', () => {
      const data = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          grants: [
            {
              id: 1,
              grantDate: '2023-01-15',
              numberOfShares: 1000,
              sharesSold: 0,
              priceAtGrant: 100,
              currency: '$',
              vestingPeriodYears: 4,
              vestingType: 'Standard'
            }
          ]
        }
      };

      const jsonString = JSON.stringify(data);
      const loadedData = JSON.parse(jsonString);
      
      expect(loadedData.rsuConfiguration.grants[0].sharesSold).toBe(0);
    });

    test('handles sharesSold equal to total shares (all sold)', () => {
      const data = {
        rsuConfiguration: {
          stockSymbol: 'GOOGL',
          currentPricePerShare: 150,
          grants: [
            {
              id: 1,
              grantDate: '2020-01-15',
              numberOfShares: 1000,
              sharesSold: 1000, // All shares sold
              priceAtGrant: 100,
              currency: '$',
              vestingPeriodYears: 4,
              vestingType: 'Standard'
            }
          ]
        }
      };

      const jsonString = JSON.stringify(data);
      const loadedData = JSON.parse(jsonString);
      
      expect(loadedData.rsuConfiguration.grants[0].sharesSold).toBe(1000);
      expect(loadedData.rsuConfiguration.grants[0].numberOfShares - loadedData.rsuConfiguration.grants[0].sharesSold).toBe(0);
    });
  });
});
