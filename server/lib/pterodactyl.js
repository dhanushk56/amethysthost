// Thin wrapper around the Pterodactyl Application API (admin-level key).
// This is what actually creates/suspends/deletes game server instances on
// your node. Docs: https://dashflo.net/docs/api/pterodactyl/v1/
const axios = require('axios');

const PANEL_URL = process.env.PTERODACTYL_PANEL_URL; // e.g. https://panel.example.com
const APP_KEY = process.env.PTERODACTYL_APP_API_KEY; // Admin -> Application API key (ptla_...)

const client = axios.create({
  baseURL: `${PANEL_URL}/api/application`,
  headers: {
    Authorization: `Bearer ${APP_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

function assertConfigured() {
  if (!PANEL_URL || !APP_KEY) {
    throw new Error(
      'Pterodactyl is not configured. Set PTERODACTYL_PANEL_URL and PTERODACTYL_APP_API_KEY in .env'
    );
  }
}

// Creates a panel user account the first time someone signs up on the website,
// so their servers show up under their own login in Pterodactyl too.
async function createOrGetPanelUser({ email, name }) {
  assertConfigured();
  const existing = await client.get('/users', { params: { filter: { email } } });
  if (existing.data.data.length > 0) return existing.data.data[0].attributes;

  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ') || firstName;
  const password = require('crypto').randomBytes(12).toString('hex');

  const created = await client.post('/users', {
    email,
    username: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 24),
    first_name: firstName,
    last_name: lastName,
    password,
  });
  return created.data.attributes;
}

// Finds a free allocation (IP:port) on the target node so the new server has
// somewhere to bind. Real hosts pool multiple nodes per location; this grabs
// the first node in the given location and its first unassigned allocation.
async function findFreeAllocation(locationId) {
  assertConfigured();
  const nodesRes = await client.get(`/locations/${locationId}`, {
    params: { include: 'nodes' },
  });
  const nodes = nodesRes.data.attributes.relationships.nodes.data;
  if (!nodes.length) throw new Error(`No nodes configured for location ${locationId}`);

  for (const node of nodes) {
    const nodeId = node.attributes.id;
    const allocRes = await client.get(`/nodes/${nodeId}/allocations`, {
      params: { per_page: 50 },
    });
    const free = allocRes.data.data.find((a) => !a.attributes.assigned);
    if (free) return { nodeId, allocationId: free.attributes.id };
  }
  throw new Error(`No free allocations in location ${locationId}`);
}

async function createServer({ panelUserId, plan, serverName }) {
  assertConfigured();
  const { allocationId } = await findFreeAllocation(plan.locationId);

  const res = await client.post('/servers', {
    name: serverName,
    user: panelUserId,
    egg: plan.eggId,
    nest: plan.nestId,
    docker_image: process.env.PTERO_DOCKER_IMAGE || 'ghcr.io/pterodactyl/yolks:java_21',
    startup: process.env.PTERO_STARTUP_CMD || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar',
    environment: {
      SERVER_JARFILE: 'server.jar',
      VANILLA_VERSION: 'latest',
    },
    limits: {
      memory: plan.ramMb,
      swap: plan.swapMb,
      disk: plan.diskMb,
      io: plan.ioWeight,
      cpu: plan.cpuPercent,
    },
    feature_limits: {
      databases: plan.databases,
      backups: plan.backups,
      allocations: 1,
    },
    allocation: { default: allocationId },
  });
  return res.data.attributes; // includes id, identifier, uuid
}

async function suspendServer(pterodactylServerId) {
  assertConfigured();
  await client.post(`/servers/${pterodactylServerId}/suspend`);
}

async function unsuspendServer(pterodactylServerId) {
  assertConfigured();
  await client.post(`/servers/${pterodactylServerId}/unsuspend`);
}

async function deleteServer(pterodactylServerId) {
  assertConfigured();
  await client.delete(`/servers/${pterodactylServerId}`);
}

module.exports = {
  createOrGetPanelUser,
  createServer,
  suspendServer,
  unsuspendServer,
  deleteServer,
};
