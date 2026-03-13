/**
 * DOM Utilities
 * Helper functions for DOM manipulation
 */

/**
 * Safely get an element by ID
 */
export function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Get element by ID or throw error
 */
export function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id) as T | null;
  if (!element) {
    throw new Error(`Required element not found: ${id}`);
  }
  return element;
}

/**
 * Get input value as string
 */
export function getInputValue(id: string): string {
  const element = getElement<HTMLInputElement>(id);
  return element?.value || '';
}

/**
 * Get input value as number, handling commas
 */
export function getInputNumber(id: string, defaultValue: number = 0): number {
  const value = getInputValue(id);
  // Remove commas before parsing
  const cleanValue = value.replace(/,/g, '');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Format a number with commas
 */
export function formatNumberWithCommas(value: number | string): string {
  if (value === '' || value === undefined || value === null) return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Setup formatting for a number input (format on blur, unformat on focus)
 */
export function setupNumberInputFormatting(id: string, min: number | null = null): void {
  const input = getElement<HTMLInputElement>(id);
  if (!input) return;

  const formatValue = () => {
    let val = input.value.replace(/,/g, '');
    let num = parseFloat(val);
    
    if (!isNaN(num)) {
      if (min !== null && num < min) {
        num = min;
      }

      if (num >= 1000) {
        input.value = formatNumberWithCommas(num);
      } else {
        input.value = num.toString();
      }
    }
  };

  // Format initially
  formatValue();

  input.addEventListener('focus', () => {
    const val = input.value.replace(/,/g, '');
    input.value = val;
    // Select all text for easy replacement
    input.select();
  });

  input.addEventListener('blur', formatValue);
}

/**
 * Setup custom spinner buttons for an input
 * Expects buttons with IDs: {id}-inc and {id}-dec
 */
export function setupInputSpinners(id: string, step: number, min: number | null = null): void {
  const input = getElement<HTMLInputElement>(id);
  const incBtn = getElement(`${id}-inc`);
  const decBtn = getElement(`${id}-dec`);
  
  if (!input || !incBtn || !decBtn) return;
  
  const updateValue = (delta: number) => {
    let val = parseFloat(input.value.replace(/,/g, ''));
    if (isNaN(val)) val = 0;
    
    let newVal = val + delta;
    if (min !== null && newVal < min) newVal = min;
    
    // Format
    if (newVal >= 1000) {
        input.value = formatNumberWithCommas(newVal);
    } else {
        input.value = newVal.toString();
    }
    
    // Trigger events
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
  };
  
  incBtn.addEventListener('click', (e) => {
    e.preventDefault();
    updateValue(step);
  });
  
  decBtn.addEventListener('click', (e) => {
    e.preventDefault();
    updateValue(-step);
  });
}

/**
 * Get input value as integer
 */
export function getInputInt(id: string, defaultValue: number = 0): number {
  const value = getInputValue(id);
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Set input value
 */
export function setInputValue(id: string, value: string | number): void {
  const element = getElement<HTMLInputElement>(id);
  if (element) {
    element.value = String(value);
  }
}

/**
 * Set element text content
 */
export function setTextContent(id: string, text: string): void {
  const element = getElement(id);
  if (element) {
    element.textContent = text;
  }
}

/**
 * Set element innerHTML
 */
export function setInnerHTML(id: string, html: string): void {
  const element = getElement(id);
  if (element) {
    element.innerHTML = html;
  }
}

/**
 * Escape a value before inserting it into HTML text or attribute contexts.
 */
export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"'`]/g, char => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      case '`':
        return '&#96;';
      default:
        return char;
    }
  });
}

/**
 * Add event listener to element by ID
 */
export function addEventListenerById(
  id: string,
  event: string,
  handler: EventListener
): void {
  const element = getElement(id);
  if (element) {
    element.addEventListener(event, handler);
  }
}

/**
 * Add event listener to multiple elements by IDs
 */
export function addEventListenerToMany(
  ids: string[],
  event: string,
  handler: EventListener
): void {
  ids.forEach(id => addEventListenerById(id, event, handler));
}

/**
 * Toggle class on element
 */
export function toggleClass(id: string, className: string, force?: boolean): void {
  const element = getElement(id);
  if (element) {
    element.classList.toggle(className, force);
  }
}

/**
 * Add class to element
 */
export function addClass(id: string, className: string): void {
  const element = getElement(id);
  if (element) {
    element.classList.add(className);
  }
}

/**
 * Remove class from element
 */
export function removeClass(id: string, className: string): void {
  const element = getElement(id);
  if (element) {
    element.classList.remove(className);
  }
}

/**
 * Show element (remove display: none)
 */
export function showElement(id: string, display: string = 'block'): void {
  const element = getElement<HTMLElement>(id);
  if (element) {
    element.style.display = display;
  }
}

/**
 * Hide element (set display: none)
 */
export function hideElement(id: string): void {
  const element = getElement<HTMLElement>(id);
  if (element) {
    element.style.display = 'none';
  }
}

/**
 * Query selector wrapper
 */
export function querySelector<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

/**
 * Query selector all wrapper
 */
export function querySelectorAll<T extends Element>(selector: string): NodeListOf<T> {
  return document.querySelectorAll<T>(selector);
}

/**
 * Create element with attributes and children
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes?: Record<string, string>,
  children?: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  if (children) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }
  
  return element;
}
