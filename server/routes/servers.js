const express = require('express');
const db = require('../db');
const plans = require('../plans');
const pterodactyl = require('../lib/pterodactyl');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const PANEL_URL = process.env.PTERODACTYL_PANEL_URL || '';

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM servers WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const servers = rows.map((s) => ({
    id: s.id,
    planKey: s.plan_key,
    planName: plans[s.plan_key]?.name || s.plan_key,
    status: s.status,
    createdAt: s.created_at,
    panelUrl: s.pterodactyl_identifier ? `${PANEL_URL}/server/${s.pterodactyl_identifier}` : null,
  }));
  res.json(servers);
});

// Free servers skip Stripe entirely and provision immediately, capped at
// plans.free.limitPerAccount per user so one signup can't farm free instances.
router.post('/deploy-free', requireAuth, async (req, res) => {
  const plan = plans.free;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (plan.limitPerAccount && user.has_used_free_plan) {
    return res.status(403).json({ error: 'Your account has already claimed its free server' });
  }

  try {
    const panelUser = await pterodactyl.createOrGetPanelUser({ email: user.email, name: user.name });
    const server = await pterodactyl.createServer({
      panelUserId: panelUser.id,
      plan,
      serverName: `${user.name}'s Free Server`,
    });

    db.prepare(
      `INSERT INTO servers (user_id, plan_key, pterodactyl_server_id, pterodactyl_identifier, status)
       VALUES (?, 'free', ?, ?, 'active')`
    ).run(user.id, server.id, server.identifier);
    db.prepare('UPDATE users SET has_used_free_plan = 1 WHERE id = ?').run(user.id);

    res.status(201).json({
      ok: true,
      panelUrl: `${PANEL_URL}/server/${server.identifier}`,
    });
  } catch (err) {
    console.error('Free server provisioning failed:', err.response?.data || err.message);
    res.status(502).json({ error: 'Could not provision your server right now. Please try again shortly.' });
  }
});

module.exports = router;
