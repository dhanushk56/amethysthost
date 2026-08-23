// Terminal boot animation – smoother looping with fade out/in
function runBoot(container) {
  const BOOT_LINES = [
    '[  OK  ] Started System Logger.',
    '[  OK  ] Reached target Multi-User System.',
    '[  OK  ] Starting AmethystHost node agent...',
    '[  OK  ] Agent connected to panel.',
    '[  OK  ] Allocating server resources...',
    '> Server ready in 4.2s',
    '> IP: 198.51.100.42:25565',
    '> Type: Java Edition 1.21.1',
  ];

  let idx = 0;
  container.innerHTML = ''; // clear previous content

  const next = () => {
    if (idx >= BOOT_LINES.length) {
      // Append blinking cursor
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      container.appendChild(cursor);

      // Wait, then restart with a smooth fade
      setTimeout(() => {
        container.style.transition = 'opacity 0.5s ease';
        container.style.opacity = '0';
        setTimeout(() => {
          // Reset and restart
          runBoot(container);
          container.style.opacity = '1';
        }, 500);
      }, 3200);
      return;
    }

    const line = document.createElement('div');
    line.textContent = BOOT_LINES[idx];
    container.appendChild(line);
    idx++;
    setTimeout(next, 300 + Math.random() * 200); // variable delay for realism
  };

  next();
}

// Start the boot sequence when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('boot-container');
  if (container) {
    runBoot(container);
  }
});
