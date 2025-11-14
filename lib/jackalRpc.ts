// Jackal RPC client for direct blockchain queries
// Based on DevTools inspection of Jackal Vault

interface AbciQueryParams {
  path: string;
  data: string;
  prove: boolean;
}

interface JsonRpcRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: AbciQueryParams;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

/**
 * Post an ABCI query to Jackal RPC endpoint
 * Discovered endpoint: https://jklrpc.squirrelglogic.com/
 * 
 * @param path - Query path like "/canine_chain.filetree.Query/File"
 * @param dataHex - Hex-encoded query data 
 * @returns Parsed JSON response
 */
export async function postAbciQuery(path: string, dataHex: string): Promise<any> {
  const rpcEndpoint = 'https://rpc.jackalprotocol.com/';
  
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: Date.now(), // Use timestamp as ID
    method: "abci_query",
    params: {
      path: path,
      data: dataHex,
      prove: false
    }
  };

  console.log('🔗 RPC Request:', JSON.stringify(request, null, 2));

  try {
    const response = await fetch(rpcEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Shar3-Jackal-Client/1.0'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
    }

    const jsonResponse: JsonRpcResponse = await response.json();
    console.log('📡 RPC Response:', JSON.stringify(jsonResponse, null, 2));

    if (jsonResponse.error) {
      throw new Error(`RPC error: ${JSON.stringify(jsonResponse.error)}`);
    }

    return jsonResponse.result;

  } catch (error) {
    console.error('❌ RPC Error:', error);
    throw new Error(`Failed to query Jackal RPC: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download encrypted chunk from Jackal storage provider
 * 
 * @param providerUrl - Storage provider base URL  
 * @param chunkId - Chunk/file ID for download
 * @returns Encrypted chunk data
 */
export async function downloadEncryptedChunk(providerUrl: string, chunkId: string): Promise<Uint8Array> {
  const downloadUrl = `${providerUrl}/download/${chunkId}`;
  
  console.log('📦 Downloading chunk:', downloadUrl);

  try {
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Shar3-Jackal-Client/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Chunk download failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log('📄 Content-Type:', contentType);

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    console.log(`✅ Downloaded ${data.length} bytes`);
    return data;

  } catch (error) {
    console.error('❌ Download Error:', error);
    throw new Error(`Failed to download chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}