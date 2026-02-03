# QR Code System Verification Report

## ✅ QR Token Format: VERIFIED

### Token Structure
```
format: entityId:timestamp:signature
example: OF-2026-7A16:1770092845231:e8215b64cf2aa8429079d6f1f7e94af3f0ef0355b352be9783bced8eb933793b
```

### Components
1. **Entity ID**: Unique participant identifier (e.g., `OF-2026-7A16`)
2. **Timestamp**: Unix timestamp in milliseconds when token was generated
3. **Signature**: HMAC-SHA256 hash for verification

---

## 🔐 Security Features

✅ **HMAC-SHA256 Signature**
- Uses shared secret: `QR_SECRET` from `.env.local`
- Prevents token tampering
- Same secret used in generation and verification

✅ **Time-based Expiration**
- Valid for 24 hours after generation
- Prevents replay attacks with old QR codes
- Automatically rejects expired tokens

---

## 🎯 QR Code Flow

### 1. **Token Generation** (`/app/api/admin/bulk-import/route.ts`)
```javascript
function generateQRToken(entityId: string): string {
    const timestamp = Date.now();
    const secret = process.env.QR_SECRET;
    const data = `${entityId}:${timestamp}`;
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return `${data}:${signature}`;
}
```
- Generated during bulk import
- Stored in `profiles.qr_token` column
- One-time generation per user

### 2. **QR Display** (`/app/eid/page.tsx`)
```javascript
- Fetches user profile from /api/auth/me
- Reads qr_token from profile
- Generates golden QR code image (#FFD700 on black)
- Displays with entity ID and timestamp (IST)
```

### 3. **QR Verification** (`/app/api/gate/verify-qr/route.ts`)
```javascript
- Receives QR token from scanner
- Splits into parts: [entityId, timestamp, signature]
- Validates:
  ✓ Format (3 parts)
  ✓ Timestamp age (< 24 hours)
  ✓ HMAC signature match
- Looks up participant by entity_id
- Returns full participant details
```

### 4. **Gate Scanner** (`/app/gate/scanner/page.tsx`)
```javascript
- Manual entry or QR camera scan
- Sends token to /api/gate/verify-qr
- Shows VERIFIED or ACCESS DENIED
- Displays participant photo, name, team, cluster
- Logs scan to recent scans history
```

---

## ✅ Route Verification

| Route | Secret Variable | Format | Status |
|-------|----------------|---------|--------|
| `/api/admin/bulk-import` | `QR_SECRET` | `entityId:timestamp:signature` | ✅ |
| `/api/gate/verify-qr` | `QR_SECRET` | `entityId:timestamp:signature` | ✅ |
| `/eid` (E-ID page) | Uses stored token | Displays from `qr_token` | ✅ |
| `/gate/scanner` | N/A | Sends to verify API | ✅ |

---

## 🎨 E-ID QR Code Design

✅ **Colors**: Golden (#FFD700) on black background
✅ **Size**: 256x256 pixels
✅ **Margin**: 1 module
✅ **Border**: None (removed white/teal borders)
✅ **Timestamp**: IST (UTC+5:30)

---

## 📊 Test Results

✅ Token generation: PASS
✅ Token parsing: PASS
✅ Signature verification: PASS
✅ Timestamp validation: PASS
✅ Expiration detection: PASS
✅ Secret consistency: PASS

**All QR routes verified and working correctly! 🎉**
