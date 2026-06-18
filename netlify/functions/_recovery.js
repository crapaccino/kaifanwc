const crypto = require('crypto');

function normalizeNickname(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function recoverySecret() {
  return process.env.RECOVERY_SECRET || process.env.ADMIN_PASSWORD || 'kaifanwc-fallback-secret';
}

function recoveryCodeForPlayer(player) {
  const base = `${player.id}:${normalizeNickname(player.nickname)}`;
  const digest = crypto.createHmac('sha256', recoverySecret()).update(base).digest('hex').toUpperCase();
  return `KWC-${digest.slice(0, 4)}-${digest.slice(4, 8)}`;
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
}

function codesMatch(input, expected) {
  return normalizeCode(input) === normalizeCode(expected);
}

module.exports = { normalizeNickname, recoveryCodeForPlayer, codesMatch };
