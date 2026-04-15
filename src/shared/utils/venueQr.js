const { randomBytes } = require('node:crypto');
const { env } = require('../../config/env');

const VENUE_SCAN_PATH = '/venue/scan';

function generateQrToken() {
  return randomBytes(32).toString('hex');
}

function buildQrScanUrl(qrToken) {
  const scanPath = `${VENUE_SCAN_PATH}/${qrToken}`;

  if (!env.frontendBaseUrl) {
    return scanPath;
  }

  return `${env.frontendBaseUrl.replace(/\/+$/, '')}${scanPath}`;
}

module.exports = {
  buildQrScanUrl,
  generateQrToken
};
