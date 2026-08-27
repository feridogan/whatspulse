const axios = require('axios');
const fs = require('fs');
const path = require('path');

const COOLIFY_URL = 'https://coolify.cakirlar.net/api/v1';
const COOLIFY_TOKEN = '4|eHtKdthi9hZ2AcfIvhhj2NLRZ0VyNWXda60yr4Wle71dc';
const TARGET_DOMAIN = 'https://mesaj.cakirlar.net';
const GITHUB_REPO = 'https://github.com/feridogan/whatspulse.git';
const BRANCH = 'main';

const client = axios.create({
  baseURL: COOLIFY_URL,
  headers: {
    'Authorization': `Bearer ${COOLIFY_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

async function main() {
  console.log('🚀 Starting Coolify API deployment automation...');

  // 1. Fetch Projects
  console.log('📦 Fetching Coolify projects...');
  let projects = [];
  try {
    const res = await client.get('/projects');
    projects = res.data;
    console.log(`Found ${projects.length} projects:`, projects.map(p => ({ uuid: p.uuid, name: p.name })));
  } catch (err) {
    console.error('Error fetching projects:', err.response?.data || err.message);
    throw err;
  }

  if (projects.length === 0) {
    throw new Error('No projects found in Coolify.');
  }

  const targetProject = projects[0];
  console.log(`Selected Project: ${targetProject.name} (${targetProject.uuid})`);

  // 2. Fetch Environments
  let environmentName = 'production';
  if (targetProject.environments && targetProject.environments.length > 0) {
    environmentName = targetProject.environments[0].name;
  }
  console.log(`Selected Environment: ${environmentName}`);

  // 3. Fetch Servers
  console.log('🖥️ Fetching Coolify servers...');
  let servers = [];
  try {
    const res = await client.get('/servers');
    servers = res.data;
    console.log(`Found ${servers.length} servers:`, servers.map(s => ({ uuid: s.uuid, name: s.name, ip: s.ip })));
  } catch (err) {
    console.error('Error fetching servers:', err.response?.data || err.message);
    throw err;
  }

  if (servers.length === 0) {
    throw new Error('No servers found in Coolify.');
  }

  const targetServer = servers[0];
  console.log(`Selected Server: ${targetServer.name} (${targetServer.uuid})`);

  // Read docker-compose.coolify.yml content
  const composePath = path.join(__dirname, '..', 'docker-compose.coolify.yml');
  const composeContent = fs.readFileSync(composePath, 'utf-8');

  // Check if whatspulse already exists in resources or applications
  console.log('🔍 Checking existing applications / resources...');
  let existingApp = null;
  try {
    const res = await client.get('/applications');
    if (Array.isArray(res.data)) {
      existingApp = res.data.find(a => 
        (a.name && a.name.toLowerCase().includes('whatspulse')) ||
        (a.fqdn && a.fqdn.includes('mesaj.cakirlar.net')) ||
        (a.repository && a.repository.includes('whatspulse'))
      );
    }
  } catch (err) {
    console.log('Note: /applications listing status:', err.message);
  }

  let appUuid = null;

  if (existingApp) {
    console.log(`ℹ️ Found existing application: ${existingApp.name} (${existingApp.uuid})`);
    appUuid = existingApp.uuid;
  } else {
    // Try creating docker-compose application or public git application
    console.log('🆕 Creating new application on Coolify...');
    try {
      // First try /applications/docker-compose or /applications/public
      const createPayload = {
        project_uuid: targetProject.uuid,
        server_uuid: targetServer.uuid,
        environment_name: environmentName,
        docker_compose_raw: composeContent,
        name: 'WhatsPulse WhatsApp SaaS',
        description: 'WhatsPulse WhatsApp Messaging & Anti-Ban Platform',
      };

      const res = await client.post('/applications/docker-compose', createPayload);
      console.log('✅ Created Docker Compose application:', res.data);
      appUuid = res.data?.uuid || res.data?.application?.uuid;
    } catch (composeErr) {
      console.log('Docker-compose create endpoint response:', composeErr.response?.data || composeErr.message);
      
      // Fallback: Try creating public git application
      try {
        const gitPayload = {
          project_uuid: targetProject.uuid,
          server_uuid: targetServer.uuid,
          environment_name: environmentName,
          git_repository: GITHUB_REPO,
          git_branch: BRANCH,
          build_pack: 'dockercompose',
          name: 'WhatsPulse',
          docker_compose_location: '/docker-compose.coolify.yml',
          ports_exposes: '3000',
        };
        const res = await client.post('/applications/public', gitPayload);
        console.log('✅ Created Public Git Application:', res.data);
        appUuid = res.data?.uuid || res.data?.application?.uuid;
      } catch (gitErr) {
        console.error('Git application create failed:', gitErr.response?.data || gitErr.message);
      }
    }
  }

  // Update FQDN / Domain if app exists
  if (appUuid) {
    try {
      console.log(`🌐 Setting domain to ${TARGET_DOMAIN}...`);
      await client.patch(`/applications/${appUuid}`, {
        fqdn: TARGET_DOMAIN,
      });
      console.log('✅ Domain configured successfully.');
    } catch (err) {
      console.log('Domain update response:', err.response?.data || err.message);
    }

    // Trigger Deployment
    console.log(`🚀 Triggering deployment for ${appUuid}...`);
    try {
      const deployRes = await client.post(`/deploy`, {
        uuid: appUuid,
      });
      console.log('🎉 Deployment triggered successfully!', deployRes.data);
    } catch (err) {
      try {
        const startRes = await client.post(`/applications/${appUuid}/start`);
        console.log('🎉 Application start triggered!', startRes.data);
      } catch (err2) {
        console.log('Deploy error:', err.response?.data || err.message);
      }
    }
  }

  console.log('✨ Coolify deployment process completed.');
}

main().catch(err => {
  console.error('Fatal error during deployment:', err);
  process.exit(1);
});
