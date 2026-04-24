// SSE (Server-Sent Events) service for real-time board sync
// Replaces Socket.IO with a simpler, standards-based approach

const clients = new Map(); // orgId -> Set<res>

function addClient(orgId, res) {
  if (!clients.has(orgId)) {
    clients.set(orgId, new Set());
  }
  clients.get(orgId).add(res);

  // Clean up on disconnect
  res.on('close', () => {
    removeClient(orgId, res);
  });
}

function removeClient(orgId, res) {
  const orgClients = clients.get(orgId);
  if (orgClients) {
    orgClients.delete(res);
    if (orgClients.size === 0) {
      clients.delete(orgId);
    }
  }
}

function broadcast(orgId, eventType, data) {
  const orgClients = clients.get(orgId.toString());
  if (!orgClients) return;

  const payload = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
  
  orgClients.forEach(res => {
    try {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${payload}\n\n`);
    } catch (err) {
      // Client disconnected
      removeClient(orgId.toString(), res);
    }
  });
}

function getClientCount(orgId) {
  const orgClients = clients.get(orgId?.toString());
  return orgClients ? orgClients.size : 0;
}

module.exports = { addClient, removeClient, broadcast, getClientCount };
