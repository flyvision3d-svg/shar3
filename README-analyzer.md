# Jackal Vault Analyzer

A CLI tool to debug Jackal Vault URLs and analyze RPC responses for CID discovery.

## Usage

```bash
# Install dependencies
npm install

# Analyze a Vault URL
npm run analyze -- --vault-url "https://vault.jackalprotocol.com/v/jkl1.../ULID?k=KEY"

# Use custom RPC endpoint
npm run analyze -- --vault-url "..." --rpc "https://custom-rpc.example.com/"

# Or run directly with tsx
npx tsx jackal-analyzer.ts --vault-url "..."
```

## What it does

1. **Parses Vault URL** into owner, ULID, and linkKey
2. **Queries File metadata** via `/canine_chain.filetree.Query/File`
3. **Queries FindFile** via `/canine_chain.storage.Query/FindFile` with multiple encoding strategies:
   - ULID as UTF-8 string
   - ULID as hex hash (if 64 chars)
   - SHA256 of ULID (current fallback)
4. **Extracts CID candidates** from:
   - JSON response traversal (64-char hex strings)
   - Binary data scanning (32-byte sequences)
   - Protobuf string patterns
5. **Tests storage downloads** for each candidate CID against multiple hosts:
   - `jkstorage4.squirrellogic.com`
   - `pod-04.jackalstorage.online`
   - `pod-01.jackalstorage.online`
   - `m4.jkldrive.com`
6. **Saves debug data** to `./debug/` folder:
   - `<timestamp>-file.json` - File query response
   - `<timestamp>-findfile-<strategy>.json` - FindFile responses
   - `<timestamp>-findfile.bin` - Raw binary data
   - `<timestamp>-candidates.json` - Extracted CID candidates

## Example Output

```
🦎 Jackal Vault Analyzer
========================
📍 Vault URL: https://vault.jackalprotocol.com/v/jkl1abc.../ULID123?k=abc123
🔗 RPC Endpoint: https://rpc.jackalprotocol.com/

📋 Parsing Vault URL...
👤 Owner: jkl1abc...
🆔 ULID: ULID123
🔑 Link Key: abc123...

📊 Querying File metadata...
📦 File query data: 0a07554c49443132

🔍 Querying FindFile with multiple strategies...
📦 Strategy: ulid-as-utf8
📦 Data: 0a07554c49443132

🎯 CID Candidates:
==================
1. 5c2f5ca64bf6957011b27a8c5c25918d330d81dd26cd600452d49ff58d768c0e
   Source: binary-scan
   Path: offset-12

📦 Testing storage downloads...
===============================
🧪 Testing CID: 5c2f5ca64bf6957011b27a8c5c25918d330d81dd26cd600452d49ff58d768c0e
✅ SUCCESS: CID 5c2f5ca64bf6957011b27a8c5c25918d330d81dd26cd600452d49ff58d768c0e returned 200 OK

💾 Saved debug files to ./debug/
🎉 Analysis complete!
```

## Debug Files

All responses and binary data are saved to `./debug/` for detailed analysis:

- **Raw JSON responses** - Full RPC responses for manual inspection
- **Binary data** - Raw protobuf data for further decoding attempts  
- **CID candidates** - All potential storage identifiers found
- **Timestamped files** - Easy to correlate with specific test runs

This tool helps identify the correct CID field in Jackal's protobuf responses and verify which storage providers have the actual file data.