#!/usr/bin/env tsx

import { program } from 'commander';
import { createHash } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface VaultUrlParts {
  owner: string;
  ulid: string;
  linkKey: string;
}

interface RpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

interface CidCandidate {
  source: string;
  path: string;
  value: string;
}

/**
 * Parse Jackal Vault URL into components
 * Example: https://vault.jackalprotocol.com/v/jkl1.../ULID?k=KEY
 */
function parseVaultUrl(vaultUrl: string): VaultUrlParts {
  try {
    const url = new URL(vaultUrl);
    
    // Extract path: /v/{owner}/{ulid}
    const pathParts = url.pathname.split('/');
    if (pathParts.length < 4 || pathParts[1] !== 'v') {
      throw new Error('Invalid vault URL format - expected /v/{owner}/{ulid}');
    }
    
    const owner = pathParts[2];
    const ulid = pathParts[3];
    const linkKey = url.searchParams.get('k');
    
    if (!owner || !ulid || !linkKey) {
      throw new Error('Missing required URL components (owner, ulid, or linkKey)');
    }
    
    return { owner, ulid, linkKey };
  } catch (error) {
    throw new Error(`Failed to parse vault URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build protobuf query data for File query
 */
function buildFileQueryData(ulid: string): string {
  const ulidBytes = Buffer.from(ulid, 'utf8');
  return `0a${ulidBytes.length.toString(16).padStart(2, '0')}${ulidBytes.toString('hex')}`;
}

/**
 * Build protobuf query data for FindFile query
 * Try multiple encoding strategies
 */
function buildFindFileQueryData(ulid: string): Array<{strategy: string, data: string}> {
  const strategies = [];
  
  // Strategy 1: ULID as UTF-8 string
  const ulidBytes = Buffer.from(ulid, 'utf8');
  strategies.push({
    strategy: 'ulid-as-utf8',
    data: `0a${ulidBytes.length.toString(16).padStart(2, '0')}${ulidBytes.toString('hex')}`
  });
  
  // Strategy 2: If ULID looks like hex, treat as 32-byte hash
  if (/^[0-9a-f]{64}$/i.test(ulid)) {
    const hexBytes = Buffer.from(ulid, 'hex');
    strategies.push({
      strategy: 'ulid-as-hex-hash',
      data: `0a20${hexBytes.toString('hex')}`
    });
  }
  
  // Strategy 3: SHA256 of ULID (current fallback method)
  const sha256Hash = createHash('sha256').update(ulid).digest();
  strategies.push({
    strategy: 'sha256-of-ulid',
    data: `0a20${sha256Hash.toString('hex')}`
  });
  
  return strategies;
}

/**
 * Send RPC query and return response
 */
async function sendRpcQuery(endpoint: string, path: string, data: string): Promise<RpcResponse> {
  const request = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "abci_query",
    params: {
      path: path,
      data: data,
      prove: false
    }
  };
  
  console.log(`🔗 Sending RPC query to ${path}`);
  console.log(`📦 Request:`, JSON.stringify(request, null, 2));
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Jackal-Analyzer/1.0'
    },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
  }
  
  const jsonResponse: RpcResponse = await response.json();
  console.log(`📡 Response:`, JSON.stringify(jsonResponse, null, 2));
  
  return jsonResponse;
}

/**
 * Extract all 64-character hex strings from an object
 */
function extractHexCandidates(obj: any, path: string = '', candidates: CidCandidate[] = []): CidCandidate[] {
  if (!obj || typeof obj !== 'object') return candidates;
  
  for (const [key, val] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof val === 'string' && /^[0-9a-f]{64}$/i.test(val)) {
      candidates.push({
        source: 'object-traversal',
        path: currentPath,
        value: val.toLowerCase()
      });
    } else if (Array.isArray(val)) {
      val.forEach((item, idx) => 
        extractHexCandidates(item, `${currentPath}[${idx}]`, candidates)
      );
    } else if (typeof val === 'object') {
      extractHexCandidates(val, currentPath, candidates);
    }
  }
  
  return candidates;
}

/**
 * Extract hex candidates from raw binary data
 */
function extractBinaryCandidates(data: Buffer): CidCandidate[] {
  const candidates: CidCandidate[] = [];
  
  // Look for 32-byte sequences that could be hashes
  for (let i = 0; i <= data.length - 32; i++) {
    const hash = data.slice(i, i + 32).toString('hex');
    if (/^[0-9a-f]{64}$/i.test(hash)) {
      candidates.push({
        source: 'binary-scan',
        path: `offset-${i}`,
        value: hash
      });
    }
  }
  
  // Look for length-prefixed hex strings (protobuf pattern)
  for (let i = 0; i < data.length - 1; i++) {
    const len = data[i];
    if (len === 32 && i + 1 + len <= data.length) { // 32-byte string
      const str = data.slice(i + 1, i + 1 + len).toString('hex');
      if (/^[0-9a-f]{64}$/i.test(str)) {
        candidates.push({
          source: 'protobuf-string',
          path: `offset-${i}-len-${len}`,
          value: str
        });
      }
    }
  }
  
  return candidates;
}

/**
 * Test storage provider download with a CID
 */
async function testStorageDownload(cid: string): Promise<{status: number, body: string, error?: string}> {
  const hosts = [
    'jkstorage4.squirrellogic.com',
    'pod-04.jackalstorage.online',
    'pod-01.jackalstorage.online',
    'm4.jkldrive.com'
  ];
  
  for (const host of hosts) {
    const url = `https://${host}/download/${cid}`;
    
    try {
      console.log(`📦 Testing ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Jackal-Analyzer/1.0' }
      });
      
      const body = await response.text();
      const snippet = body.length > 200 ? body.substring(0, 200) + '...' : body;
      
      console.log(`📡 ${host}: ${response.status} ${response.statusText}`);
      console.log(`📄 Body snippet: ${snippet}`);
      
      if (response.ok) {
        return { status: response.status, body: snippet };
      }
      
      return { status: response.status, body: snippet };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${host}: ${errorMsg}`);
      return { status: 0, body: '', error: errorMsg };
    }
  }
  
  return { status: 0, body: '', error: 'All hosts failed' };
}

/**
 * Save debug data to files
 */
function saveDebugFiles(timestamp: string, data: {
  fileResponse?: any,
  findFileResponses?: Array<{strategy: string, response: any}>,
  decodedData?: Buffer,
  candidates?: CidCandidate[]
}) {
  const debugDir = './debug';
  if (!existsSync(debugDir)) {
    mkdirSync(debugDir, { recursive: true });
  }
  
  if (data.fileResponse) {
    writeFileSync(
      join(debugDir, `${timestamp}-file.json`), 
      JSON.stringify(data.fileResponse, null, 2)
    );
    console.log(`💾 Saved File query response to debug/${timestamp}-file.json`);
  }
  
  if (data.findFileResponses) {
    data.findFileResponses.forEach((item, idx) => {
      writeFileSync(
        join(debugDir, `${timestamp}-findfile-${item.strategy}.json`), 
        JSON.stringify(item.response, null, 2)
      );
    });
    console.log(`💾 Saved FindFile responses to debug/${timestamp}-findfile-*.json`);
  }
  
  if (data.decodedData) {
    writeFileSync(join(debugDir, `${timestamp}-findfile.bin`), data.decodedData);
    console.log(`💾 Saved binary data to debug/${timestamp}-findfile.bin`);
  }
  
  if (data.candidates) {
    writeFileSync(
      join(debugDir, `${timestamp}-candidates.json`), 
      JSON.stringify(data.candidates, null, 2)
    );
    console.log(`💾 Saved CID candidates to debug/${timestamp}-candidates.json`);
  }
}

/**
 * Main analyzer function
 */
async function analyzeVault(vaultUrl: string, rpcEndpoint: string = 'https://rpc.jackalprotocol.com/') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    console.log('🦎 Jackal Vault Analyzer');
    console.log('========================');
    console.log(`📍 Vault URL: ${vaultUrl}`);
    console.log(`🔗 RPC Endpoint: ${rpcEndpoint}`);
    console.log();
    
    // Step 1: Parse Vault URL
    console.log('📋 Parsing Vault URL...');
    const { owner, ulid, linkKey } = parseVaultUrl(vaultUrl);
    console.log(`👤 Owner: ${owner}`);
    console.log(`🆔 ULID: ${ulid}`);
    console.log(`🔑 Link Key: ${linkKey.substring(0, 8)}...`);
    console.log();
    
    // Step 2: Query File metadata
    console.log('📊 Querying File metadata...');
    const fileQueryData = buildFileQueryData(ulid);
    console.log(`📦 File query data: ${fileQueryData}`);
    
    const fileResponse = await sendRpcQuery(
      rpcEndpoint,
      '/canine_chain.filetree.Query/File',
      fileQueryData
    );
    console.log();
    
    // Step 3: Query FindFile with multiple strategies
    console.log('🔍 Querying FindFile with multiple strategies...');
    const findFileStrategies = buildFindFileQueryData(ulid);
    const findFileResponses = [];
    
    for (const strategy of findFileStrategies) {
      console.log(`📦 Strategy: ${strategy.strategy}`);
      console.log(`📦 Data: ${strategy.data}`);
      
      try {
        const response = await sendRpcQuery(
          rpcEndpoint,
          '/canine_chain.storage.Query/FindFile',
          strategy.data
        );
        findFileResponses.push({ strategy: strategy.strategy, response });
      } catch (error) {
        console.log(`❌ Strategy ${strategy.strategy} failed:`, error);
        findFileResponses.push({ 
          strategy: strategy.strategy, 
          response: { error: error instanceof Error ? error.message : String(error) } 
        });
      }
      console.log();
    }
    
    // Step 4: Extract and decode binary data
    console.log('🔓 Extracting binary data...');
    let decodedData: Buffer | null = null;
    const allCandidates: CidCandidate[] = [];
    
    // Try to get binary data from any successful FindFile response
    for (const item of findFileResponses) {
      // @ts-ignore - Handle mixed response types
      const valueB64 = item.response?.result?.response?.value;
      if (valueB64) {
        console.log(`✅ Found value in ${item.strategy} strategy`);
        decodedData = Buffer.from(valueB64, 'base64');
        console.log(`📦 Decoded ${decodedData.length} bytes`);
        break;
      }
    }
    
    if (!decodedData) {
      console.log('❌ No binary data found in any FindFile response');
    } else {
      // Extract candidates from binary data
      const binaryCandidates = extractBinaryCandidates(decodedData);
      allCandidates.push(...binaryCandidates);
    }
    
    // Extract candidates from JSON responses
    const responseCandidates = extractHexCandidates(fileResponse, 'file');
    allCandidates.push(...responseCandidates);
    
    for (const item of findFileResponses) {
      const candidates = extractHexCandidates(item.response, `findfile.${item.strategy}`);
      allCandidates.push(...candidates);
    }
    
    // Remove duplicates
    const uniqueCandidates = allCandidates.filter((candidate, index, self) => 
      index === self.findIndex(c => c.value === candidate.value)
    );
    
    console.log();
    console.log('🎯 CID Candidates:');
    console.log('==================');
    if (uniqueCandidates.length === 0) {
      console.log('❌ No 64-character hex candidates found');
    } else {
      uniqueCandidates.forEach((candidate, idx) => {
        console.log(`${idx + 1}. ${candidate.value}`);
        console.log(`   Source: ${candidate.source}`);
        console.log(`   Path: ${candidate.path}`);
        console.log();
      });
    }
    
    // Step 5: Test storage downloads
    console.log('📦 Testing storage downloads...');
    console.log('===============================');
    
    for (const candidate of uniqueCandidates) {
      console.log(`🧪 Testing CID: ${candidate.value}`);
      console.log(`   From: ${candidate.source} (${candidate.path})`);
      
      const result = await testStorageDownload(candidate.value);
      
      if (result.status === 200) {
        console.log(`✅ SUCCESS: CID ${candidate.value} returned 200 OK`);
        console.log(`📄 Content preview: ${result.body}`);
      } else if (result.error) {
        console.log(`❌ ERROR: ${result.error}`);
      } else {
        console.log(`❌ FAILED: HTTP ${result.status}`);
        console.log(`📄 Response: ${result.body}`);
      }
      console.log();
    }
    
    // Step 6: Save debug files
    saveDebugFiles(timestamp, {
      fileResponse,
      findFileResponses,
      decodedData: decodedData || undefined,
      candidates: uniqueCandidates
    });
    
    console.log('🎉 Analysis complete!');
    
  } catch (error) {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  }
}

// CLI setup
program
  .name('jackal-analyzer')
  .description('Analyze Jackal Vault URLs and debug RPC responses')
  .version('1.0.0')
  .requiredOption('--vault-url <url>', 'Jackal Vault URL to analyze')
  .option('--rpc <endpoint>', 'RPC endpoint', 'https://rpc.jackalprotocol.com/')
  .action((options) => {
    analyzeVault(options.vaultUrl, options.rpc);
  });

program.parse();