// Signature hero element: a fake but realistic server-boot log that types
// itself out, then loops. Purely decorative — no real server involved.
const BOOT_LINES = [
  { text: '$ forgectl deploy --plan free --region na-east', cls: '' },
  { text: '  allocating 2048MB / 10GB NVMe...', cls: '' },
  { text: '  binding allocation 51.81.x.x:25565', cls: '' },
  { text: '  pulling image: yolks/java_21', cls: '' },
  { text: '  ✓ container started', cls: 'ok' },
  { text: '[Server] Preparing level "world"', cls: '' },
  { text: '[Server] Done (2.91s)! For help, type "help"', cls: 'ok' },
  { text: '[ForgeHost] server is READY — 14ms to Blaze TX', cls: 'tag' },
];

function typeLine(container, text, cls, cb) {
  const el = document.createElement('div');
  el.className = `line ${cls}`;
  container.appendChild(el);
  let i = 0;
  const speed = 12;
  const tick = () => {
    el.textContent = text.slice(0, i);
    i++;
    if (i <= text.length) {
      setTimeout(tick, speed);
    } else {
      cb();
    }
  };
  tick();
}

function runBoot(container) {
  container.innerHTML = '';
  let idx = 0;
  const next = () => {
    if (idx >= BOOT_LINES.length) {
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      container.appendChild(cursor);
      setTimeout(() => runBoot(container), 3200);
      return;
    }
    const { text, cls } = BOOT_LINES[idx++];
    typeLine(container, text, cls, next);
  };
  next();
}

const bootLog = document.getElementById('bootLog');
if (bootLog) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bootLog.innerHTML = BOOT_LINES.map((l) => `<div class="line ${l.cls}">${l.text}</div>`).join('');
  } else {
    runBoot(bootLog);
  }
}
