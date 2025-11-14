# mount-file.js Analysis Checklist

To complete the Jackal decryption implementation, we need to extract the following details from mount-file.js:

## 1. URL Parsing ✅
Current implementation looks correct:
```typescript
const pathParts = url.pathname.split('/');
// /v/{vaultAddress}/{fileId}
const vaultAddress = pathParts[2]; // jkl1wuegm9pa02nnaur0xs8klx3ztngr4fd4m0hj06
const fileId = pathParts[3];        // 01K9YXQ9RYC2ZKXY30ZDBFAG5F
const key = url.searchParams.get('k'); // 01K9YXZ5DKZHM5WCDG41X5SS6V
```

## 2. Metadata API Calls ❓
**NEED FROM mount-file.js:**

### What API endpoint is called for metadata?
- [ ] `storage.getMetaDataByUlid(d)` where `d = {ulid: ulid, userAddress: address, linkKey : key.value}`
- [ ] What HTTP endpoint does this translate to?
- [ ] Example: `https://api.jackalprotocol.com/jackal/storage/...`
- [ ] What headers are needed?

### What does the metadata response contain?
- [ ] `meta.metaDataType` (should be 'file')
- [ ] `meta.fileMeta.type` (MIME type)
- [ ] `meta.fileMeta.name` (filename)
- [ ] `meta.fileMeta.size` (file size)
- [ ] Storage provider URL(s)?
- [ ] Encryption parameters (IV, algorithm, etc.)?

## 3. Encrypted Chunk Fetching ❓
**NEED FROM mount-file.js:**

### How are encrypted chunks downloaded?
- [ ] `storage.downloadByUlid(downloadOptions)` - what HTTP calls does this make?
- [ ] Provider URL format: `https://mprov...` or similar?
- [ ] Download endpoint: `/download/`, `/v2/download/`, etc.?
- [ ] Single file or multiple chunks?

### Example request:
```javascript
// What does this translate to in terms of raw HTTP?
const downloadOptions = {
  ulid: ulid,
  linkKey: key.value,
  trackers: { chunks: [], progress: 0 },
  userAddress: address
}
const file = await storage.downloadByUlid(downloadOptions)
```

## 4. Crypto Details ❓
**NEED FROM mount-file.js:**

### Key derivation:
- [ ] Is `key.value` used directly as crypto key?
- [ ] Or is it derived with PBKDF2/HKDF?
- [ ] What salt/iterations if derivation is used?

### Encryption algorithm:
- [ ] Algorithm: 'AES-GCM', 'AES-CBC', 'AES-CTR'?
- [ ] Key length: 128, 192, 256 bits?
- [ ] IV/nonce: where does it come from?
  - [ ] From metadata response?
  - [ ] Embedded in encrypted data?
  - [ ] Generated from file ID?

### Example crypto call we need to replicate:
```javascript
// What are the exact parameters used?
const decrypted = await crypto.subtle.decrypt(
  { 
    name: '???', // AES-GCM?
    iv: ???,     // from where?
    // tagLength: ??? (if GCM)
  },
  cryptoKey,     // derived how?
  encryptedData  // from download
);
```

## 5. Response Format ❓
**NEED FROM mount-file.js:**

### How is the final file created?
```javascript
const file = await storage.downloadByUlid(downloadOptions)
const url = URL.createObjectURL(file)
```

- [ ] Is `file` already decrypted?
- [ ] What type is it? `Blob`, `ArrayBuffer`, `Uint8Array`?
- [ ] How is MIME type determined?

## Next Steps

Please provide the specific details from mount-file.js for the ❓ sections above, and I'll implement the exact HTTP calls and crypto operations to match the front-end behavior.

The framework is ready - we just need these implementation details!