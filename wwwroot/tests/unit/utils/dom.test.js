/**
 * DOM Utility Unit Tests
 * Tests for DOM manipulation functions with mocked document
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
  getElement,
  requireElement,
  getInputValue,
  getInputNumber,
  getInputInt,
  setInputValue,
  setTextContent,
  setInnerHTML,
  escapeHtml,
  toggleClass,
  addClass,
  removeClass,
  showElement,
  hideElement,
  querySelector,
  querySelectorAll,
  createElement
} from '../../../js/utils/dom.js';

describe('DOM Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // getElement
  // ============================================================================

  describe('getElement', () => {
    test('returns element when found', () => {
      const mockElement = { id: 'test' };
      mockDocument.getElementById.mockReturnValue(mockElement);

      const result = getElement('test');
      
      expect(mockDocument.getElementById).toHaveBeenCalledWith('test');
      expect(result).toBe(mockElement);
    });

    test('returns null when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      const result = getElement('nonexistent');
      
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // requireElement
  // ============================================================================

  describe('requireElement', () => {
    test('returns element when found', () => {
      const mockElement = { id: 'test' };
      mockDocument.getElementById.mockReturnValue(mockElement);

      const result = requireElement('test');
      
      expect(result).toBe(mockElement);
    });

    test('throws error when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => requireElement('nonexistent'))
        .toThrow('Required element not found: nonexistent');
    });
  });

  // ============================================================================
  // getInputValue
  // ============================================================================

  describe('getInputValue', () => {
    test('returns input value when element exists', () => {
      const mockInput = { value: 'test value' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      const result = getInputValue('myInput');
      
      expect(result).toBe('test value');
    });

    test('returns empty string when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      const result = getInputValue('nonexistent');
      
      expect(result).toBe('');
    });

    test('returns empty string when value is empty', () => {
      const mockInput = { value: '' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      const result = getInputValue('emptyInput');
      
      expect(result).toBe('');
    });
  });

  // ============================================================================
  // getInputNumber
  // ============================================================================

  describe('getInputNumber', () => {
    test('returns parsed number from input', () => {
      const mockInput = { value: '123.45' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      const result = getInputNumber('myInput');
      
      expect(result).toBe(123.45);
    });

    test('returns default value for empty input', () => {
      const mockInput = { value: '' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      const result = getInputNumber('myInput', 99);
      
      expect(result).toBe(99);
    });

    test('returns default value for non-numeric input', () => {
      const mockInput = { value: 'abc' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      const result = getInputNumber('myInput', 50);
      
      expect(result).toBe(50);
    });

    test('returns 0 as default when not specified', () => {
      const mockInput = { value: 'invalid' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      const result = getInputNumber('myInput');
      
      expect(result).toBe(0);
    });

    test('returns negative numbers correctly', () => {
      const mockInput = { value: '-42.5' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      const result = getInputNumber('myInput');
      
      expect(result).toBe(-42.5);
    });
  });

  // ============================================================================
  // getInputInt
  // ============================================================================

  describe('getInputInt', () => {
    test('returns parsed integer from input', () => {
      const mockInput = { value: '42' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      const result = getInputInt('myInput');
      
      expect(result).toBe(42);
    });

    test('truncates decimal values', () => {
      const mockInput = { value: '42.9' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      const result = getInputInt('myInput');
      
      expect(result).toBe(42);
    });

    test('returns default value for non-numeric input', () => {
      const mockInput = { value: 'abc' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      const result = getInputInt('myInput', 10);
      
      expect(result).toBe(10);
    });
  });

  // ============================================================================
  // setInputValue
  // ============================================================================

  describe('setInputValue', () => {
    test('sets string value on input element', () => {
      const mockInput = { value: '' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      setInputValue('myInput', 'new value');
      
      expect(mockInput.value).toBe('new value');
    });

    test('sets number value on input element', () => {
      const mockInput = { value: '' };
      mockDocument.getElementById.mockReturnValue(mockInput);

      setInputValue('myInput', 42);
      
      expect(mockInput.value).toBe('42');
    });

    test('does nothing when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      // Should not throw
      expect(() => setInputValue('nonexistent', 'value')).not.toThrow();
    });
  });

  // ============================================================================
  // setTextContent
  // ============================================================================

  describe('setTextContent', () => {
    test('sets text content on element', () => {
      const mockElement = { textContent: '' };
      mockDocument.getElementById.mockReturnValue(mockElement);

      setTextContent('myDiv', 'Hello World');
      
      expect(mockElement.textContent).toBe('Hello World');
    });

    test('does nothing when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => setTextContent('nonexistent', 'text')).not.toThrow();
    });
  });

  // ============================================================================
  // setInnerHTML
  // ============================================================================

  describe('setInnerHTML', () => {
    test('sets innerHTML on element', () => {
      const mockElement = { innerHTML: '' };
      mockDocument.getElementById.mockReturnValue(mockElement);

      setInnerHTML('myDiv', '<span>Hello</span>');
      
      expect(mockElement.innerHTML).toBe('<span>Hello</span>');
    });

    test('does nothing when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => setInnerHTML('nonexistent', '<div></div>')).not.toThrow();
    });
  });

  // ============================================================================
  // escapeHtml
  // ============================================================================

  describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
      expect(escapeHtml('<img src=x onerror="alert(1)">'))
        .toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    });

    test('escapes quotes and backticks for attribute contexts', () => {
      expect(escapeHtml(`'\"\``)).toBe('&#39;&quot;&#96;');
    });
  });

  // ============================================================================
  // Class manipulation
  // ============================================================================

  describe('toggleClass', () => {
    test('toggles class on element', () => {
      const mockElement = {
        classList: {
          toggle: jest.fn()
        }
      };
      mockDocument.getElementById.mockReturnValue(mockElement);

      toggleClass('myDiv', 'active');
      
      expect(mockElement.classList.toggle).toHaveBeenCalledWith('active', undefined);
    });

    test('toggles class with force parameter', () => {
      const mockElement = {
        classList: {
          toggle: jest.fn()
        }
      };
      mockDocument.getElementById.mockReturnValue(mockElement);

      toggleClass('myDiv', 'active', true);
      
      expect(mockElement.classList.toggle).toHaveBeenCalledWith('active', true);
    });

    test('does nothing when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => toggleClass('nonexistent', 'class')).not.toThrow();
    });
  });

  describe('addClass', () => {
    test('adds class to element', () => {
      const mockElement = {
        classList: {
          add: jest.fn()
        }
      };
      mockDocument.getElementById.mockReturnValue(mockElement);

      addClass('myDiv', 'newClass');
      
      expect(mockElement.classList.add).toHaveBeenCalledWith('newClass');
    });

    test('does nothing when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => addClass('nonexistent', 'class')).not.toThrow();
    });
  });

  describe('removeClass', () => {
    test('removes class from element', () => {
      const mockElement = {
        classList: {
          remove: jest.fn()
        }
      };
      mockDocument.getElementById.mockReturnValue(mockElement);

      removeClass('myDiv', 'oldClass');
      
      expect(mockElement.classList.remove).toHaveBeenCalledWith('oldClass');
    });

    test('does nothing when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => removeClass('nonexistent', 'class')).not.toThrow();
    });
  });

  // ============================================================================
  // Show/Hide elements
  // ============================================================================

  describe('showElement', () => {
    test('sets display to block by default', () => {
      const mockElement = { style: { display: 'none' } };
      mockDocument.getElementById.mockReturnValue(mockElement);

      showElement('myDiv');
      
      expect(mockElement.style.display).toBe('block');
    });

    test('sets display to custom value', () => {
      const mockElement = { style: { display: 'none' } };
      mockDocument.getElementById.mockReturnValue(mockElement);

      showElement('myDiv', 'flex');
      
      expect(mockElement.style.display).toBe('flex');
    });

    test('does nothing when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => showElement('nonexistent')).not.toThrow();
    });
  });

  describe('hideElement', () => {
    test('sets display to none', () => {
      const mockElement = { style: { display: 'block' } };
      mockDocument.getElementById.mockReturnValue(mockElement);

      hideElement('myDiv');
      
      expect(mockElement.style.display).toBe('none');
    });

    test('does nothing when element not found', () => {
      mockDocument.getElementById.mockReturnValue(null);

      expect(() => hideElement('nonexistent')).not.toThrow();
    });
  });

  // ============================================================================
  // Query selectors
  // ============================================================================

  describe('querySelector', () => {
    test('calls document.querySelector with selector', () => {
      const mockElement = { tagName: 'DIV' };
      mockDocument.querySelector.mockReturnValue(mockElement);

      const result = querySelector('.my-class');
      
      expect(mockDocument.querySelector).toHaveBeenCalledWith('.my-class');
      expect(result).toBe(mockElement);
    });

    test('returns null when not found', () => {
      mockDocument.querySelector.mockReturnValue(null);

      const result = querySelector('.nonexistent');
      
      expect(result).toBeNull();
    });
  });

  describe('querySelectorAll', () => {
    test('calls document.querySelectorAll with selector', () => {
      const mockNodeList = [{ tagName: 'DIV' }, { tagName: 'DIV' }];
      mockDocument.querySelectorAll.mockReturnValue(mockNodeList);

      const result = querySelectorAll('.my-class');
      
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('.my-class');
      expect(result).toBe(mockNodeList);
    });
  });

  // ============================================================================
  // createElement
  // ============================================================================

  describe('createElement', () => {
    test('creates element with tag name', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        appendChild: jest.fn()
      };
      mockDocument.createElement.mockReturnValue(mockElement);

      const result = createElement('div');
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(result).toBe(mockElement);
    });

    test('creates element with attributes', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        appendChild: jest.fn()
      };
      mockDocument.createElement.mockReturnValue(mockElement);

      createElement('input', { type: 'text', id: 'myInput' });
      
      expect(mockElement.setAttribute).toHaveBeenCalledWith('type', 'text');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('id', 'myInput');
    });

    test('creates element with text children', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        appendChild: jest.fn()
      };
      const mockTextNode = { nodeType: 3 };
      mockDocument.createElement.mockReturnValue(mockElement);
      mockDocument.createTextNode.mockReturnValue(mockTextNode);

      createElement('span', {}, ['Hello']);
      
      expect(mockDocument.createTextNode).toHaveBeenCalledWith('Hello');
      expect(mockElement.appendChild).toHaveBeenCalledWith(mockTextNode);
    });

    test('creates element with node children', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        appendChild: jest.fn()
      };
      const childNode = { nodeType: 1 };
      mockDocument.createElement.mockReturnValue(mockElement);

      createElement('div', {}, [childNode]);
      
      expect(mockElement.appendChild).toHaveBeenCalledWith(childNode);
    });
  });
});
