require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const db = require('./db');
const authRoutes = require('./routes/auth');
const planRoutes = require('./routes/plans');
const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhook');
const serverRoutes = require('./routes/servers');

const app = express();

// Stripe webhook needs the RAW body, so it must be mounted BEFORE express.json()
app.use('/api/webhook', webhookRoutes);

app.use(cors({ origin: process.env.PUBLIC_URL || true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/servers', serverRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NetherHost-clone running on http://localhost:${PORT}`);
  console.log(`Panel target: ${process.env.PTERODACTYL_PANEL_URL || '(not configured)'}`);
});
