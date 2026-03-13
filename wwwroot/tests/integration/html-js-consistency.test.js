/**
 * HTML/JS Consistency Tests
 * 
 * These tests verify that element IDs used in TypeScript code
 * actually exist in the HTML file. This prevents the mismatch
 * issues where JS references IDs that don't exist in HTML.
 */

const fs = require('fs');
const path = require('path');

// Read the actual HTML file
const htmlPath = path.join(__dirname, '../../index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Extract all element IDs from HTML
const extractHtmlIds = (html) => {
  const idRegex = /id=["']([^"']+)["']/g;
  const ids = new Set();
  let match;
  while ((match = idRegex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return ids;
};

// Read TypeScript source files to find referenced IDs
const tsDir = path.join(__dirname, '../../ts');
const readTsFiles = (dir) => {
  let content = '';
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      content += readTsFiles(fullPath);
    } else if (file.name.endsWith('.ts')) {
      content += fs.readFileSync(fullPath, 'utf-8');
    }
  }
  return content;
};

const tsContent = readTsFiles(tsDir);

// Extract IDs referenced in TypeScript via common patterns
const extractTsIds = (ts) => {
  const patterns = [
    /getElementById\(['"]([^'"]+)['"]\)/g,
    /getElement\(['"]([^'"]+)['"]\)/g,
    /getInputNumber\(['"]([^'"]+)['"]/g,
    /getInputValue\(['"]([^'"]+)['"]/g,
    /setInputValue\(['"]([^'"]+)['"]/g,
    /setTextContent\(['"]([^'"]+)['"]/g,
  ];
  
  const ids = new Set();
  for (const pattern of patterns) {
    let match;
    // Reset regex state
    pattern.lastIndex = 0;
    while ((match = pattern.exec(ts)) !== null) {
      ids.add(match[1]);
    }
  }
  return ids;
};

const htmlIds = extractHtmlIds(htmlContent);
const tsIds = extractTsIds(tsContent);

describe('HTML/JS Element ID Consistency', () => {
  
  describe('Critical Input Elements', () => {
    // These are the IDs that MUST exist in HTML for the app to work
    const criticalInputIds = [
      'birthYear',
      'earlyRetirementAge',  // Changed from 'earlyRetirementYear' to match HTML
      'fullRetirementAge',
      'monthlyContribution',
      'monthlyContributionCurrency',
      'adjustContributionsForInflation',
      'withdrawalRate',
      'inflationRate',  // Note: NOT 'inflation'
      'capitalGainsTax',
      'usdIlsRate',
    ];
    
    criticalInputIds.forEach(id => {
      test(`HTML should have input element with id="${id}"`, () => {
        expect(htmlIds.has(id)).toBe(true);
      });
    });
  });
  
  describe('Currency Selection Elements', () => {
    // Currency is selected via buttons, not a select
    test('HTML should have currencyUSD button', () => {
      expect(htmlIds.has('currencyUSD')).toBe(true);
    });
    
    test('HTML should have currencyILS button', () => {
      expect(htmlIds.has('currencyILS')).toBe(true);
    });
    
    test('HTML should NOT have displayCurrency select (deprecated)', () => {
      // If this fails, it means HTML was updated but not JS
      // Currently we expect it to NOT exist
      expect(htmlIds.has('displayCurrency')).toBe(false);
    });
  });
  
  describe('Tab Elements', () => {
    const tabIds = [
      'tab-accumulation',
      'tab-expenses', 
      'tab-retirement',
      'tab-results',
      'content-accumulation',
      'content-expenses',
      'content-retirement',
      'content-results',
    ];
    
    tabIds.forEach(id => {
      test(`HTML should have tab element with id="${id}"`, () => {
        expect(htmlIds.has(id)).toBe(true);
      });
    });
  });
  
  describe('Table Elements', () => {
    const tableIds = [
      'accumulationTable',
      'retirementAllocationTable',
      'expensesTable',
    ];
    
    tableIds.forEach(id => {
      test(`HTML should have table element with id="${id}"`, () => {
        expect(htmlIds.has(id)).toBe(true);
      });
    });
  });
  
  describe('Portfolio Summary Elements (hyphenated IDs)', () => {
    const summaryIds = [
      'accumulation-count',
      'accumulation-market-value',
      'accumulation-cost-basis',
      'accumulation-gain-loss',
    ];
    
    summaryIds.forEach(id => {
      test(`HTML should have summary element with id="${id}"`, () => {
        expect(htmlIds.has(id)).toBe(true);
      });
    });
  });
  
  describe('Results Summary Elements', () => {
    const resultsIds = [
      'totalContributions',
      'annualWithdrawalNet',
      'annualWithdrawalGross',
      'monthlyExpenseNet',
      'monthlyExpenseGross',
      'startValue',
      'startUnrealizedGain',
      'peakValue',
      'peakUnrealizedGain',
      'endValue',
      'endUnrealizedGain',
    ];
    
    resultsIds.forEach(id => {
      test(`HTML should have results element with id="${id}"`, () => {
        expect(htmlIds.has(id)).toBe(true);
      });
    });
  });
  
  describe('Chart Canvas Elements', () => {
    const chartIds = [
      'mainChart',
      'accumulationStartChart',
      'accumulationEndChart',
      'expensesChart',
      'retirementPortfolioChart',
      'startAccumulationChart',
      'startRetirementChart',
      'endRetirementChart',
      'resultsExpensesChart',
    ];
    
    chartIds.forEach(id => {
      test(`HTML should have canvas element with id="${id}"`, () => {
        expect(htmlIds.has(id)).toBe(true);
      });
    });
  });
  
  describe('File Operation Elements', () => {
    test('HTML should have savePlan button', () => {
      expect(htmlIds.has('savePlan')).toBe(true);
    });
    
    test('HTML should have loadPlan button', () => {
      expect(htmlIds.has('loadPlan')).toBe(true);
    });
    
    test('HTML should have fileInput element', () => {
      expect(htmlIds.has('fileInput')).toBe(true);
    });
  });
  
  describe('TypeScript ID References Should Exist in HTML', () => {
    // Find IDs referenced in TS that don't exist in HTML
    // Exclude dynamic IDs (those with template literals or variables)
    const missingIds = [...tsIds].filter(id => {
      // Skip IDs that are clearly dynamic or internal
      if (id.includes('${') || id.includes('`')) return false;
      // Skip test-only IDs
      if (id.startsWith('test-')) return false;
      return !htmlIds.has(id);
    });
    
    test('All TypeScript-referenced IDs should exist in HTML', () => {
      if (missingIds.length > 0) {
        console.log('IDs referenced in TypeScript but missing from HTML:', missingIds);
      }
      // Allow some known exceptions:
      // - RSU grant form fields that are dynamically referenced
      // - RSU table copy button (dynamically created in TypeScript)
      const allowedMissing = new Set([
        // RSU grant form and field IDs (referenced dynamically in RSU module)
        'add-rsu-grant-btn',
        'rsu-grant-form-container',
        'rsu-grant-form',
        'cancel-grant-btn',
        'grant-id',
        'grant-date',
        'grant-shares',
        'grant-shares-sold',
        'grant-price',
        'grant-currency',
        'grant-vesting-years',
        'grant-vesting-type',
        // RSU table copy button (created dynamically in rsu-table.ts)
        'copy-rsu-table-btn',
        // Tab Navigation component IDs (Phase 2 - not yet integrated into index.html)
        'view-mode-btn',
        'view-mode-menu',
        'summary-total-portfolio',
        'summary-retirement-date',
        'summary-years-to-retirement',
      ]);
      
      const trulyMissing = missingIds.filter(id => !allowedMissing.has(id));
      expect(trulyMissing).toEqual([]);
    });
  });
  
  describe('Deprecated/Wrong ID Patterns', () => {
    // These IDs should NOT be referenced in TypeScript anymore
    const deprecatedIds = [
      'retirementYear',  // Should be 'earlyRetirementYear'
      'inflation',       // Should be 'inflationRate'
      'displayCurrency', // Should use currencyUSD/currencyILS buttons
    ];
    
    deprecatedIds.forEach(id => {
      test(`TypeScript should NOT reference deprecated id="${id}"`, () => {
        // Check if this deprecated ID appears in common getter patterns
        const patterns = [
          new RegExp(`getInputNumber\\(['"]${id}['"]`, 'g'),
          new RegExp(`getInputValue\\(['"]${id}['"]`, 'g'),
          new RegExp(`setInputValue\\(['"]${id}['"]`, 'g'),
          new RegExp(`getElement\\(['"]${id}['"]`, 'g'),
        ];
        
        let found = false;
        for (const pattern of patterns) {
          if (pattern.test(tsContent)) {
            found = true;
            break;
          }
        }
        
        expect(found).toBe(false);
      });
    });
  });
});
