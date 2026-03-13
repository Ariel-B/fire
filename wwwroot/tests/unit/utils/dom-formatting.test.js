/**
 * DOM Formatting Utility Unit Tests
 * Tests for setupNumberInputFormatting and setupInputSpinners
 */

// Mock DOM before importing
const mockDocument = {
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  createElement: jest.fn(),
  createTextNode: jest.fn()
};

global.document = mockDocument;

import {
  setupNumberInputFormatting,
  setupInputSpinners,
  formatNumberWithCommas
} from '../../../js/utils/dom.js';

describe('DOM Formatting Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // setupNumberInputFormatting
  // ============================================================================

  describe('setupNumberInputFormatting', () => {
    let mockInput;
    let eventListeners;

    beforeEach(() => {
      eventListeners = {};
      mockInput = {
        id: 'test-input',
        value: '1000',
        addEventListener: jest.fn((event, handler) => {
          eventListeners[event] = handler;
        }),
        select: jest.fn()
      };
      mockDocument.getElementById.mockReturnValue(mockInput);
    });

    test('formats initial value with commas', () => {
      setupNumberInputFormatting('test-input');
      expect(mockInput.value).toBe('1,000');
    });

    test('unformats value on focus', () => {
      setupNumberInputFormatting('test-input');
      // Initial format
      expect(mockInput.value).toBe('1,000');
      
      // Trigger focus
      eventListeners['focus']();
      
      expect(mockInput.value).toBe('1000');
      expect(mockInput.select).toHaveBeenCalled();
    });

    test('reformats value on blur', () => {
      setupNumberInputFormatting('test-input');
      
      // Trigger focus and change value
      eventListeners['focus']();
      mockInput.value = '2500';
      
      // Trigger blur
      eventListeners['blur']();
      
      expect(mockInput.value).toBe('2,500');
    });

    test('respects minimum value on blur', () => {
      setupNumberInputFormatting('test-input', 0);
      
      // Trigger focus and set negative value
      eventListeners['focus']();
      mockInput.value = '-500';
      
      // Trigger blur
      eventListeners['blur']();
      
      expect(mockInput.value).toBe('0');
    });

    test('handles non-numeric input gracefully', () => {
      setupNumberInputFormatting('test-input');
      
      // Trigger focus and set invalid text
      eventListeners['focus']();
      mockInput.value = 'abc';
      
      // Trigger blur
      eventListeners['blur']();
      
      // Should remain as is or handle gracefully (implementation dependent, 
      // currently implementation checks !isNaN, so it skips formatting if NaN)
      expect(mockInput.value).toBe('abc'); 
    });
  });

  // ============================================================================
  // setupInputSpinners
  // ============================================================================

  describe('setupInputSpinners', () => {
    let mockInput;
    let mockIncBtn;
    let mockDecBtn;
    let inputListeners;
    let incListeners;
    let decListeners;

    beforeEach(() => {
      inputListeners = {};
      incListeners = {};
      decListeners = {};

      mockInput = {
        id: 'test-input',
        value: '1000',
        dispatchEvent: jest.fn()
      };

      mockIncBtn = {
        id: 'test-input-inc',
        addEventListener: jest.fn((event, handler) => {
          incListeners[event] = handler;
        })
      };

      mockDecBtn = {
        id: 'test-input-dec',
        addEventListener: jest.fn((event, handler) => {
          decListeners[event] = handler;
        })
      };

      mockDocument.getElementById.mockImplementation((id) => {
        if (id === 'test-input') return mockInput;
        if (id === 'test-input-inc') return mockIncBtn;
        if (id === 'test-input-dec') return mockDecBtn;
        return null;
      });
    });

    test('increments value on up button click', () => {
      setupInputSpinners('test-input', 100);
      
      const mockEvent = { preventDefault: jest.fn() };
      incListeners['click'](mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockInput.value).toBe('1,100');
      expect(mockInput.dispatchEvent).toHaveBeenCalledTimes(2); // input and change events
    });

    test('decrements value on down button click', () => {
      setupInputSpinners('test-input', 100);
      
      const mockEvent = { preventDefault: jest.fn() };
      decListeners['click'](mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockInput.value).toBe('900');
    });

    test('respects minimum value when decrementing', () => {
      mockInput.value = '50';
      setupInputSpinners('test-input', 100, 0);
      
      const mockEvent = { preventDefault: jest.fn() };
      decListeners['click'](mockEvent);
      
      expect(mockInput.value).toBe('0');
    });

    test('handles comma-separated values correctly', () => {
      mockInput.value = '1,500';
      setupInputSpinners('test-input', 100);
      
      const mockEvent = { preventDefault: jest.fn() };
      incListeners['click'](mockEvent);
      
      expect(mockInput.value).toBe('1,600');
    });
  });
});
