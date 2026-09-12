const crypto = require('crypto');
const { put } = require('@vercel/blob');

const ALLOWED_JURISDICTIONS = new Set(['scotland', 'england-wales', 'northern-ireland', 'uk-wide']);
const ALLOWED_TOPICS = new Set([
  'police-powers',
  'protest-law',
  'courts',
  'housing',
  'benefits',
  'driving',
  'employment',
  'consumer-rights'
]);
const ALLOWED_FREQUENCIES = new Set(['weekly', 'important']);

function send(res, status, body) {
  res.status(status).json(body);
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'POST');

  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed.' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return send(res, 503, {
      error: 'Law Alerts storage is not connected yet.',
      code: 'ALERTS_STORAGE_NOT_CONFIGURED'
    });
  }

  const body = parseBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const jurisdiction = String(body.jurisdiction || '').trim();
  const frequency = String(body.frequency || 'weekly').trim();
  const topics = Array.isArray(body.topics) ? [...new Set(body.topics.map(String))] : [];
  const consent = body.consent === true;

  if (!validEmail(email)) return send(res, 400, { error: 'Enter a valid email address.' });
  if (!ALLOWED_JURISDICTIONS.has(jurisdiction)) return send(res, 400, { error: 'Choose a valid jurisdiction.' });
  if (!ALLOWED_FREQUENCIES.has(frequency)) return send(res, 400, { error: 'Choose a valid alert frequency.' });
  if (!topics.length || topics.some(topic => !ALLOWED_TOPICS.has(topic))) {
    return send(res, 400, { error: 'Choose at least one valid topic.' });
  }
  if (!consent) return send(res, 400, { error: 'Please confirm that you want RightsRadar UK to store these alert preferences.' });

  const id = crypto.createHash('sha256').update(email).digest('hex');
  const now = new Date().toISOString();
  const record = {
    version: 1,
    id,
    email,
    jurisdiction,
    topics,
    frequency,
    plan: 'free-beta',
    status: 'registered',
    consentAt: now,
    updatedAt: now
  };

  try {
    await put(`law-alerts/subscribers/${id}.json`, JSON.stringify(record), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return send(res, 201, {
      ok: true,
      message: 'Your Law Alerts preferences have been saved for the beta.',
      plan: record.plan
    });
  } catch (error) {
    console.error('alerts signup failed', error);
    return send(res, 500, { error: 'We could not save your preferences right now. Please try again later.' });
  }
};
