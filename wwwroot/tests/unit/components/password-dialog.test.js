/* eslint-env jest */

class MockElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this.value = '';
    this.textContent = '';
    this.type = tagName === 'input' ? 'text' : undefined;
    this._className = '';
    this.classList = {
      _classes: new Set(),
      add: (...classes) => classes.forEach((name) => this.classList._classes.add(name)),
      remove: (...classes) => classes.forEach((name) => this.classList._classes.delete(name)),
      contains: (name) => this.classList._classes.has(name)
    };
    this._listeners = new Map();
    this.addEventListener = (type, handler) => {
      const handlers = this._listeners.get(type) || [];
      handlers.push(handler);
      this._listeners.set(type, handlers);
    };
    this.removeEventListener = (type, handler) => {
      const handlers = this._listeners.get(type) || [];
      this._listeners.set(type, handlers.filter((entry) => entry !== handler));
    };
    this.dispatchEvent = (event) => {
      event.target = event.target || this;
      const handlers = this._listeners.get(event.type) || [];
      handlers.forEach((handler) => handler(event));
      return true;
    };
    this.click = () => this.dispatchEvent({ type: 'click', preventDefault() {}, stopPropagation() {} });
    this.focus = jest.fn();
    this.select = jest.fn();
    this.contains = (node) => node === this || this.children.some((child) => child.contains?.(node) || child === node);
    this.appendChild = (child) => {
      child.parentNode = this;
      this.children.push(child);
      return child;
    };
    this.removeChild = (child) => {
      this.children = this.children.filter((entry) => entry !== child);
      child.parentNode = null;
      if (child.id) {
        this.ownerDocument.elements.delete(child.id);
      }
    };
    this.setAttribute = (name, value) => {
      this[name] = value;
      if (name === 'id') {
        this.id = value;
      }
    };
    this.getAttribute = (name) => this[name] ?? null;
    this.removeAttribute = (name) => {
      delete this[name];
    };
  }

  set id(value) {
    this._id = value;
    if (value) {
      this.ownerDocument.elements.set(value, this);
    }
  }

  get id() {
    return this._id ?? '';
  }

  set className(value) {
    this._className = value;
    this.classList._classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get className() {
    return this._className;
  }
}

function getDeepText(element) {
  if (!element) {
    return '';
  }

  return [element.textContent || '', ...element.children.map((child) => getDeepText(child))].join(' ');
}

function createMockDocument() {
  const documentListeners = new Map();
  const document = {
    elements: new Map(),
    body: null,
    createElement(tagName) {
      return new MockElement(tagName, document);
    },
    getElementById(id) {
      return document.elements.get(id) ?? null;
    },
    addEventListener(type, handler) {
      const handlers = documentListeners.get(type) || [];
      handlers.push(handler);
      documentListeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = documentListeners.get(type) || [];
      documentListeners.set(type, handlers.filter((entry) => entry !== handler));
    },
    dispatchEvent(event) {
      const handlers = documentListeners.get(event.type) || [];
      handlers.forEach((handler) => handler(event));
    }
  };

  document.body = new MockElement('body', document);

  return document;
}

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('password dialog', () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = global.document;
    global.document = createMockDocument();
  });

  afterEach(() => {
    global.document = originalDocument;
    jest.clearAllMocks();
  });

  test('renders Hebrew encrypt labels and keeps the validation message hidden initially', async () => {
    const { promptPassword } = await import('../../../js/components/password-dialog.js');

    const pending = promptPassword('encrypt');
    await flushPromises();

    const dialog = document.getElementById('password-dialog');
    const error = document.getElementById('password-error');

    expect(dialog).not.toBeNull();
    expect(getDeepText(dialog)).toContain('בחר סיסמה');
    expect(getDeepText(dialog)).toContain('אישור סיסמה');
    expect(error.className).toContain('hidden');

    document.getElementById('password-cancel').click();
    await expect(pending).resolves.toBeNull();
  });

  test('encrypt mode blocks empty, short, and mismatched passwords before resolving', async () => {
    const { promptPassword } = await import('../../../js/components/password-dialog.js');

    const pending = promptPassword('encrypt');
    await flushPromises();

    const submit = document.getElementById('password-submit');
    const passwordInput = document.getElementById('password-input');
    const confirmInput = document.getElementById('password-confirm-input');
    const error = document.getElementById('password-error');

    submit.click();
    expect(error.classList.contains('hidden')).toBe(false);

    passwordInput.value = 'short';
    confirmInput.value = 'short';
    submit.click();
    expect(error.textContent).toContain('לפחות 8 תווים');

    passwordInput.value = 'test-password-123';
    confirmInput.value = 'different-password-123';
    submit.click();
    expect(error.textContent).toContain('אישור הסיסמה');

    confirmInput.value = 'test-password-123';
    submit.click();

    await expect(pending).resolves.toBe('test-password-123');
    expect(document.getElementById('password-dialog')).toBeNull();
  });

  test('decrypt mode uses only one password field and resolves without confirm validation', async () => {
    const { promptPassword } = await import('../../../js/components/password-dialog.js');

    const pending = promptPassword('decrypt');
    await flushPromises();

    expect(document.getElementById('password-confirm-input')).toBeNull();

    document.getElementById('password-input').value = 'decrypt-password-123';
    document.getElementById('password-submit').click();

    await expect(pending).resolves.toBe('decrypt-password-123');
  });

  test('cancel resolves to null', async () => {
    const { promptPassword } = await import('../../../js/components/password-dialog.js');

    const pending = promptPassword('decrypt');
    await flushPromises();
    document.getElementById('password-cancel').click();

    await expect(pending).resolves.toBeNull();
  });
});
