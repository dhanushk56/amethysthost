const express = require('express');
const plans = require('../plans');

const router = express.Router();

router.get('/', (req, res) => {
  // Never expose internal Pterodactyl egg/nest/location IDs to the client.
  const safe = Object.values(plans).map(
    ({ key, name, tagline, priceCents, interval, ramMb, diskMb, cpuPercent, databases, backups }) => ({
      key,
      name,
      tagline,
      priceCents,
      interval,
      ramMb,
      diskMb,
      cpuPercent,
      databases,
      backups,
    })
  );
  res.json(safe);
});

module.exports = router;
