type PasswordDialogMode = 'encrypt' | 'decrypt';

function createContainer(className: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = className;
  return element;
}

function createLabel(text: string, htmlFor: string): HTMLLabelElement {
  const label = document.createElement('label');
  label.htmlFor = htmlFor;
  label.className = 'block text-sm font-medium text-gray-700 mb-2 text-right';
  label.textContent = text;
  return label;
}

function createInput(id: string, autocomplete: 'new-password' | 'current-password'): HTMLInputElement {
  const input = document.createElement('input');
  input.id = id;
  input.type = 'password';
  input.className = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';
  input.dir = 'ltr';
  input.autocomplete = autocomplete;
  return input;
}

function createErrorElement(): HTMLParagraphElement {
  const error = document.createElement('p');
  error.id = 'password-error';
  error.className = 'hidden text-sm text-red-600 text-right';
  error.setAttribute('role', 'alert');
  return error;
}

function setError(errorElement: HTMLParagraphElement, message: string): void {
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
}

function clearError(errorElement: HTMLParagraphElement): void {
  errorElement.textContent = '';
  errorElement.classList.add('hidden');
}

export function promptPassword(mode: PasswordDialogMode): Promise<string | null> {
  return new Promise((resolve) => {
    const parent = document.body ?? document.documentElement;
    if (!parent) {
      resolve(null);
      return;
    }
    const previousActiveElement = document.activeElement as HTMLElement | null;

    const overlay = createContainer('fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4');
    overlay.id = 'password-dialog';
    overlay.dir = 'rtl';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'password-dialog-title');
    overlay.setAttribute('aria-describedby', 'password-dialog-description');

    const panel = createContainer('w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl');
    const form = document.createElement('form');
    form.className = 'space-y-0';
    form.noValidate = true;
    const title = document.createElement('h2');
    title.id = 'password-dialog-title';
    title.className = 'mb-2 text-xl font-bold text-gray-900 text-right';
    title.textContent = mode === 'encrypt' ? 'הגנת קובץ בסיסמה' : 'הזן סיסמה לטעינה';

    const subtitle = document.createElement('p');
    subtitle.id = 'password-dialog-description';
    subtitle.className = 'mb-4 text-sm text-gray-600 text-right';
    subtitle.textContent = mode === 'encrypt'
      ? 'בחר סיסמה לשמירת התוכנית המוצפנת'
      : 'הזן את הסיסמה של קובץ התוכנית המוצפן';

    const passwordGroup = createContainer('mb-4');
    const passwordLabel = createLabel('סיסמה', 'password-input');
    const passwordInput = createInput('password-input', mode === 'decrypt' ? 'current-password' : 'new-password');
    passwordGroup.appendChild(passwordLabel);
    passwordGroup.appendChild(passwordInput);

    const confirmGroup = createContainer('mb-4');
    let confirmInput: HTMLInputElement | null = null;
    if (mode === 'encrypt') {
      const confirmLabel = createLabel('אישור סיסמה', 'password-confirm-input');
      confirmInput = createInput('password-confirm-input', 'new-password');
      confirmGroup.appendChild(confirmLabel);
      confirmGroup.appendChild(confirmInput);
    }

    const errorElement = createErrorElement();

    const buttons = createContainer('mt-6 flex flex-row-reverse gap-3');
    const submitButton = document.createElement('button');
    submitButton.id = 'password-submit';
    submitButton.type = 'submit';
    submitButton.className = 'inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700';
    submitButton.textContent = mode === 'encrypt' ? 'שמור מוצפן' : 'טען קובץ';

    const cancelButton = document.createElement('button');
    cancelButton.id = 'password-cancel';
    cancelButton.type = 'button';
    cancelButton.className = 'inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50';
    cancelButton.textContent = 'ביטול';

    buttons.appendChild(submitButton);
    buttons.appendChild(cancelButton);

    form.appendChild(title);
    form.appendChild(subtitle);
    form.appendChild(passwordGroup);
    if (mode === 'encrypt' && confirmInput) {
      form.appendChild(confirmGroup);
    }
    form.appendChild(errorElement);
    form.appendChild(buttons);
    panel.appendChild(form);
    overlay.appendChild(panel);
    parent.appendChild(overlay);

    const getFocusableElements = (): HTMLElement[] => [
      passwordInput,
      ...(confirmInput ? [confirmInput] : []),
      submitButton,
      cancelButton
    ];

    const cleanup = (result: string | null) => {
      document.removeEventListener('keydown', handleKeydown);
      form.removeEventListener('submit', handleFormSubmit);
      cancelButton.removeEventListener('click', handleCancel);
      submitButton.removeEventListener('click', handleSubmitClick);
      parent.removeChild(overlay);
      previousActiveElement?.focus?.();
      resolve(result);
    };

    const handleCancel = () => {
      cleanup(null);
    };

    const handleSubmit = () => {
      const password = passwordInput.value;

      if (!password) {
        setError(errorElement, 'נא להזין סיסמה');
        passwordInput.focus();
        return;
      }

      if (mode === 'encrypt') {
        if (password.length < 8) {
          setError(errorElement, 'הסיסמה חייבת להכיל לפחות 8 תווים');
          passwordInput.focus();
          return;
        }

        if (password !== confirmInput?.value) {
          setError(errorElement, 'אישור הסיסמה חייב להיות זהה לסיסמה');
          confirmInput?.focus();
          return;
        }
      }

      clearError(errorElement);
      cleanup(password);
    };

    const handleFormSubmit = (event: Event) => {
      event.preventDefault();
      handleSubmit();
    };

    const handleSubmitClick = (event: Event) => {
      event.preventDefault();
      handleSubmit();
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        const currentIndex = focusableElements.findIndex((element) => element === document.activeElement);
        const nextIndex = currentIndex === -1
          ? 0
          : (currentIndex + (event.shiftKey ? -1 : 1) + focusableElements.length) % focusableElements.length;
        event.preventDefault();
        focusableElements[nextIndex]?.focus();
      }
    };

    form.addEventListener('submit', handleFormSubmit);
    cancelButton.addEventListener('click', handleCancel);
    submitButton.addEventListener('click', handleSubmitClick);
    document.addEventListener('keydown', handleKeydown);
    passwordInput.focus();
  });
}
