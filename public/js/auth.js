function showError(msg) {
  const el = document.getElementById('formError');
  el.textContent = msg;
  el.style.display = 'block';
}

async function submitForm(url, body, btn) {
  btn.disabled = true;
  btn.textContent = 'Please wait…';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    window.location.href = '/dashboard.html';
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = btn.dataset.label;
  }
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  const btn = document.getElementById('submitBtn');
  btn.dataset.label = btn.textContent;
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm('/api/auth/login', {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    }, btn);
  });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  const btn = document.getElementById('submitBtn');
  btn.dataset.label = btn.textContent;
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm('/api/auth/register', {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    }, btn);
  });
}
