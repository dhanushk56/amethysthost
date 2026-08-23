function statusLabel(s) {
  if (s === 'active') return 'Online';
  if (s === 'provisioning') return 'Provisioning…';
  if (s === 'suspended') return 'Suspended — billing issue';
  return s;
}

function renderBanner(msg, tone = 'ok') {
  const banner = document.getElementById('banner');
  const color = tone === 'ok' ? 'var(--spark)' : 'var(--danger)';
  banner.innerHTML = `<div style="border:1px solid ${color}; color:${color}; padding:12px 16px; border-radius:8px; margin-bottom:20px; font-size:0.9rem;">${msg}</div>`;
}

async function loadServers() {
  const list = document.getElementById('serverList');
  const res = await fetch('/api/servers');
  if (res.status === 401) {
    window.location.href = '/login.html';
    return;
  }
  const servers = await res.json();

  if (servers.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No servers yet. Deploy your free server to get started.</p>
      </div>`;
    return;
  }

  list.innerHTML = servers
    .map(
      (s) => `
      <div class="server-card">
        <div>
          <strong>${s.planName}</strong>
          <div class="mono" style="color:var(--text-dim); font-size:0.8rem; margin-top:4px;">Created ${new Date(s.createdAt).toLocaleDateString()}</div>
        </div>
        <span class="status-pill ${s.status}">● ${statusLabel(s.status)}</span>
        ${s.panelUrl ? `<a href="${s.panelUrl}" target="_blank" class="btn btn-ghost">Open in Panel</a>` : ''}
      </div>`
    )
    .join('');
}

async function loadUser() {
  const res = await fetch('/api/auth/me');
  if (res.status === 401) {
    window.location.href = '/login.html';
    return;
  }
  const { user } = await res.json();
  document.getElementById('userName').textContent = user.name;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
});

document.getElementById('deployFreeBtn').addEventListener('click', async (e) => {
  const btn = e.target;
  btn.disabled = true;
  btn.textContent = 'Deploying…';
  try {
    const res = await fetch('/api/servers/deploy-free', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    renderBanner('Your free server is live — find it below.');
    loadServers();
  } catch (err) {
    renderBanner(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Deploy Free Server';
  }
});

// If we arrived here via ?buy=starter from the pricing page, kick off Stripe Checkout.
async function handleBuyParam() {
  const params = new URLSearchParams(window.location.search);
  const planKey = params.get('buy');
  if (!planKey) return;

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    window.location.href = data.url; // off to Stripe Checkout
  } catch (err) {
    renderBanner(`Couldn't start checkout: ${err.message}`, 'error');
  }
}

if (new URLSearchParams(window.location.search).get('checkout') === 'success') {
  renderBanner('Payment received — your server is being provisioned now.');
}

loadUser();
loadServers();
handleBuyParam();
