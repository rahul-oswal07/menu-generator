#!/usr/bin/env node

/**
 * Simple script to test Swagger documentation endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testSwaggerEndpoints() {
  console.log('🧪 Testing Swagger Documentation Endpoints\n');
  
  const endpoints = [
    { path: '/', name: 'API Root' },
    { path: '/api-docs.json', name: 'OpenAPI JSON' },
    { path: '/api/health', name: 'Health Check' },
    { path: '/api/health/detailed', name: 'Detailed Health' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}: ${BASE_URL}${endpoint.path}`);
      const response = await makeRequest(endpoint.path);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${endpoint.name}: OK (${response.statusCode})`);
        
        // Show a preview of JSON responses
        if (response.headers['content-type']?.includes('application/json')) {
          try {
            const json = JSON.parse(response.body);
            if (endpoint.path === '/api-docs.json') {
              console.log(`   📋 OpenAPI Version: ${json.openapi}`);
              console.log(`   📋 API Title: ${json.info.title}`);
              console.log(`   📋 API Version: ${json.info.version}`);
              console.log(`   📋 Endpoints: ${Object.keys(json.paths).length}`);
            } else if (json.success !== undefined) {
              console.log(`   📋 Success: ${json.success}`);
              if (json.data?.status) {
                console.log(`   📋 Status: ${json.data.status}`);
              }
            }
          } catch (e) {
            // Not JSON or parsing failed
          }
        }
      } else {
        console.log(`❌ ${endpoint.name}: Failed (${response.statusCode})`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Error - ${error.message}`);
    }
    console.log('');
  }
  
  console.log('🎉 Swagger Documentation Test Complete!');
  console.log('');
  console.log('📖 Access the interactive documentation at:');
  console.log(`   ${BASE_URL}/api-docs`);
  console.log('');
  console.log('🔧 API Endpoints:');
  console.log(`   Upload: POST ${BASE_URL}/api/upload`);
  console.log(`   Process: POST ${BASE_URL}/api/process`);
  console.log(`   Status: GET ${BASE_URL}/api/status/:sessionId`);
  console.log(`   Results: GET ${BASE_URL}/api/results/:sessionId`);
  console.log(`   Health: GET ${BASE_URL}/api/health`);
}

// Run the test
testSwaggerEndpoints().catch(console.error);