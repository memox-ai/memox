import { PolicyEngine } from './core/policies';
import { MemoryRouter } from './core/router';
import { RESTServer } from './api/server';
import { MemoxConfig } from './core/types';

async function testPolicies() {
  console.log('\n--- Testing Policy Engine ---');
  const config = {
    piiScrubbing: { enabled: true },
    ttl: { enforceTtl: true, defaultTtlSeconds: 300 }
  };
  const engine = new PolicyEngine(config);

  // 1. PII Scrubbing
  const rawText = "User SSN is 123-45-6789 and private key is sk-1234567890abcdef1234567890abcdef. Password is: superSecret123!";
  const scrubbedText = engine.scrub(rawText);
  console.log(`Original: "${rawText}"`);
  console.log(`Scrubbed: "${scrubbedText}"`);

  if (!scrubbedText.includes('[REDACTED_SSN]') || !scrubbedText.includes('[REDACTED_API_KEY]') || !scrubbedText.includes('[REDACTED_CREDENTIALS]')) {
    throw new Error('PII scrubbing failed to redact sensitive info!');
  }
  console.log('✅ PII Scrubbing Passed.');

  // 2. TTL Enforce
  const payload = { sessionId: 'session-123', content: 'hello' };
  const processed = engine.applyTTL(payload);
  console.log(`Processed payload TTL: ${processed.ttl_seconds}s (Default: 300s)`);
  if (processed.ttl_seconds !== 300) {
    throw new Error('TTL enforcement failed!');
  }
  console.log('✅ TTL Enforcement Passed.');
}

async function testRouterAndREST() {
  console.log('\n--- Testing Router and REST Server ---');
  
  // Custom router config specifically setting primary to postgres (which will fallback to mock postgres)
  const config: MemoxConfig = {
    router: {
      primaryProvider: 'postgres',
      fallbackProvider: 'redis',
      enableAuditLogs: true
    },
    databases: {
      sqlite: { path: './dist/test_history.db' }
    }
  };

  const router = new MemoryRouter(config);
  
  // Test writing via router
  console.log('Writing test memories to router...');
  await router.write({
    sessionId: 'session-test',
    content: 'This contains sensitive SSN 999-99-9999 and important API info.'
  });

  await router.write({
    sessionId: 'session-test',
    content: 'Another generic memory record.'
  });

  // Test loading from router
  console.log('Loading memories from router...');
  const searchResults = await router.load('session-test', 'generic');
  console.log('Search results:', JSON.stringify(searchResults, null, 2));

  if (searchResults.length === 0 || !searchResults[0].content.includes('Another generic memory record')) {
    throw new Error('Router load/search failed!');
  }
  console.log('✅ Router Write/Load Passed.');
  router.close();

  // Test REST API gateway
  console.log('Starting REST Server...');
  const server = new RESTServer(3500);
  await server.start();

  try {
    // Write request
    console.log('Posting to /v1/memory/write...');
    const writeRes = await fetch('http://localhost:3500/v1/memory/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-rest-test',
        content: 'This is stored via REST API and contains sk-11223344556677889900112233445566'
      })
    });
    const writeData = await writeRes.json();
    console.log('Response:', writeData);
    if (!writeData.success) {
      throw new Error('REST write endpoint failed!');
    }

    // Load request
    console.log('Posting to /v1/memory/load...');
    const loadRes = await fetch('http://localhost:3500/v1/memory/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-rest-test',
        query: 'stored'
      })
    });
    const loadData = await loadRes.json();
    console.log('Response:', JSON.stringify(loadData, null, 2));
    if (!loadData.success || loadData.memories.length === 0) {
      throw new Error('REST load endpoint failed!');
    }
    
    // Verify PII was scrubbed
    const content = loadData.memories[0].content;
    console.log(`Scrubbed content retrieved: "${content}"`);
    if (!content.includes('[REDACTED_API_KEY]')) {
      throw new Error('REST PII Scrubbing check failed!');
    }

    console.log('✅ REST API Server write and load endpoints passed.');
  } finally {
    await server.stop();
  }
}

async function runTests() {
  try {
    await testPolicies();
    await testRouterAndREST();
    console.log('\n✨ ALL TESTS PASSED SUCCESSFULLY! ✨\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
    process.exit(1);
  }
}

runTests();
