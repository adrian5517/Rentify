Password policy (server + frontend)

Server-side requirements (enforced):
- Minimum length: 8 characters
- At least one uppercase letter (A-Z)
- At least one number (0-9)
- At least one symbol (non-alphanumeric, e.g. !@#$%^&*)

Suggested error message for API responses:
- "Password does not meet complexity requirements. It must be at least 8 characters long and include at least one uppercase letter, one number, and one symbol."

Frontend guidance
- Show a short helper string near the password field:
  "Use at least 8 characters, including an uppercase letter, a number, and a symbol."

- Live-check example (plain JS):

```javascript
// Regex must match server-side regex
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

function validatePassword(password) {
  return passwordRegex.test(password);
}

// Example usage: enable submit only when valid
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit');
const helper = document.getElementById('pw-helper');

passwordInput.addEventListener('input', () => {
  const val = passwordInput.value;
  const ok = validatePassword(val);
  submitBtn.disabled = !ok;
  helper.textContent = ok ? 'Good password' : 'Use at least 8 chars, including an uppercase letter, a number, and a symbol.';
});
```

Accessibility and UX tips
- Show real-time hints that flip to green when each rule is satisfied.
- Avoid exposing the password in any logs or responses.
- Keep server error messages neutral to avoid leaking which rule failed beyond the generic message.

Notes for developers
- The server uses the same regex: `/^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/`.
- For stricter or different policies (e.g. requiring lowercase or banning common passwords) extend server-side checks before creating the user.
