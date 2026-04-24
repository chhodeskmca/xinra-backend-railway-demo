const { randomBytes } = require('node:crypto');
const { env } = require('../../config/env');

function generateQrToken() {
  return randomBytes(32).toString('hex');
}

function buildQrScanUrl(qrToken) {
  const scanPath = `/${qrToken}`;

  if (!env.frontendBaseUrl) {
    return scanPath;
  }

  return `${env.frontendBaseUrl.replace(/\/+$/, '')}${scanPath}`;
}

module.exports = {
  buildQrScanUrl,
  generateQrToken
};
