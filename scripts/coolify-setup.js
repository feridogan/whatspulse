const https = require('https');

const COOLIFY_HOST = 'coolify.cakirlar.net';
const COOLIFY_TOKEN = '5|1qmQrpyj6HMmJ9LMirsqeHFkDrSc9jVKSPR07Djneb51e9de';
const APP_UUID = 'lhq74hmmbtsg7wfhewuouc9g';

const envVars = [
  { key: 'NODE_ENV', value: 'production' },
  { key: 'PORT', value: '3000' },
  { key: 'DATABASE_URL', value: 'postgresql://whatspulse:whatspulse_secret_2026@wp_db:5432/whatspulse?schema=public' },
  { key: 'REDIS_URL', value: 'redis://wp_redis:6379' },
  { key: 'JWT_SECRET', value: 'whatspulse-super-jwt-secret-cakirlar-2026' },
  { key: 'APP_URL', value: 'https://mesaj.cakirlar.net' },
  { key: 'EVOLUTION_API_URL', value: 'https://evo-rc.cakirlar.net' },
  { key: 'EVOLUTION_INSTANCE', value: 'feridun' },
  { key: 'EVOLUTION_API_KEY', value: '11E1F8329577-40D3-B891-9CCA41C01658' },
  { key: 'EVOLUTION_GLOBAL_KEY', value: '4a8f9c2d1e0b3a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f' },
];

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: COOLIFY_HOST,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${COOLIFY_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('🚀 Setting Environment Variables for WhatsPulse...');
  for (const env of envVars) {
    const res = await makeRequest('POST', `/api/v1/applications/${APP_UUID}/envs`, env);
    console.log(`Setting ${env.key}:`, res.status === 200 || res.status === 201 ? '✅ OK' : res.data);
  }

  console.log('\n🚀 Triggering Deployment via Coolify API...');
  // Deploy endpoint in Coolify v1: POST /api/v1/deploy with { uuid: APP_UUID } or POST /api/v1/applications/{uuid}/start or GET /api/v1/deploy?uuid=...
  let deployRes = await makeRequest('POST', '/api/v1/deploy', { uuid: APP_UUID });
  console.log('Deploy POST /deploy result:', deployRes);

  if (deployRes.status !== 200 && deployRes.status !== 201) {
    console.log('Trying GET /api/v1/deploy?uuid=...');
    deployRes = await makeRequest('GET', `/api/v1/deploy?uuid=${APP_UUID}`);
    console.log('Deploy GET /deploy result:', deployRes);
  }

  if (deployRes.status !== 200 && deployRes.status !== 201) {
    console.log('Trying POST /api/v1/applications/' + APP_UUID + '/start');
    deployRes = await makeRequest('POST', `/api/v1/applications/${APP_UUID}/start`);
    console.log('Start result:', deployRes);
  }

  console.log('\n✨ Deployment setup finished!');
}

run().catch(console.error);
