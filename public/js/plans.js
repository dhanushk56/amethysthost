function formatPrice(cents) {
  if (cents === 0) return { amount: '$0', interval: '/forever' };
  return { amount: `$${(cents / 100).toFixed(2)}`, interval: '/month' };
}

async function renderPlans() {
  const grid = document.getElementById('plansGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/plans');
    const plans = await res.json();
    grid.innerHTML = plans
      .map((p, i) => {
        const { amount, interval } = formatPrice(p.priceCents);
        const popular = p.key === 'starter';
        const ctaHref = p.priceCents === 0 ? '/register.html' : `/dashboard.html?buy=${p.key}`;
        const ctaLabel = p.priceCents === 0 ? 'Start Free' : `Get ${p.name.replace(' Server', '')}`;
        return `
          <div class="plan-card ${popular ? 'popular' : ''}">
            ${popular ? '<span class="plan-badge">Popular</span>' : ''}
            <h3>${p.name}</h3>
            <p class="tagline">${p.tagline}</p>
            <div class="plan-price"><span class="amount">${amount}</span><span class="interval">${interval}</span></div>
            <ul class="plan-specs">
              <li>${(p.ramMb / 1024).toFixed(0)} GB Dedicated RAM</li>
              <li>${(p.diskMb / 1024).toFixed(0)} GB NVMe Storage</li>
              <li>${p.cpuPercent}% CPU</li>
              <li>${p.backups} automated backup${p.backups === 1 ? '' : 's'}</li>
            </ul>
            <a href="${ctaHref}" class="btn ${popular ? 'btn-primary' : 'btn-ghost'} btn-block">${ctaLabel}</a>
          </div>`;
      })
      .join('');
  } catch (err) {
    grid.innerHTML = '<p style="color:var(--danger)">Could not load plans. Is the server running?</p>';
  }
}

renderPlans();
