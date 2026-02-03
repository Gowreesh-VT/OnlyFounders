# Gate Scanner - Enhanced Features

## What Gate Volunteers See When Scanning

When a gate volunteer scans a participant's QR code, they will see:

### ✅ VERIFIED Screen (Green Access Granted)

**Participant Information:**
- **Photo**: Profile picture (or initials if no photo)
- **Full Legal Name**: Large display of participant's name
- **Entity ID**: Unique identifier (e.g., OF-2026-7A16)
- **Team Name**: Which syndicate unit they belong to
- **Cluster**: Tier assignment (e.g., "Tier 2 • Innovation Cluster")
- **College**: Institution name
- **Phone Number**: Contact information

**Scan History (NEW):**
- **Last Scanned**: 
  - Shows previous entry timestamp in IST format (e.g., "03 Feb, 02:45 PM")
  - Displays "First Entry" if this is their first scan
  - Shows which volunteer scanned them: "By: Gate Volunteer Alpha"
  
- **Total Scans**: 
  - Count of all entries (including current scan)
  - Displayed prominently with golden color (e.g., "3 entries")

**Visual Indicators:**
- Large "VERIFIED" text in golden color
- Green checkmark with "ACCESS GRANTED" status
- Timestamp of current scan
- Clean, professional layout matching OnlyFounders branding

### ❌ ACCESS DENIED Screen (Red Error)

Shows when QR code is:
- Expired (older than 24 hours)
- Invalid signature (tampered/wrong secret)
- Unknown entity ID (not in database)

**Displays:**
- Red "ACCESS DENIED" banner
- Error message explaining the issue
- "Try Again" button to reset scanner

### 📜 Recent Scans History

Below the scanner, volunteers see the last 10 scans with:
- Mini participant photo
- Name and access status
- Role and tier info
- Success (green) or failed (red) indicator
- Timestamp of each scan

## Database Tracking

All scans are logged using the existing schema tables:

**`entry_logs` table** - Individual scan records:
- Entity ID scanned
- Profile ID of participant  
- Gate volunteer who scanned
- Status (valid/invalid/expired)
- Gate location (GATE1, GATE2, etc.)
- Scan type (entry/exit)
- Exact timestamp

**`scan_sessions` table** - Entry/exit session tracking:
- Profile ID
- Entry scan reference
- Exit scan reference (when they leave)
- Session start time
- Session end time
- Duration in minutes
- Active status (true if still inside venue)

This allows:
- ✅ Attendance tracking
- ✅ Entry/exit monitoring  
- ✅ Security audit trail
- ✅ Active participant count (who's currently inside)
- ✅ Session duration analytics
- ✅ Real-time event capacity monitoring

## Security Features

1. **HMAC-SHA256 Signature**: Prevents QR code tampering
2. **24-hour Expiration**: QR tokens auto-expire daily
3. **Scan Logging**: Every scan recorded with timestamp + volunteer
4. **Role-based Access**: Only gate volunteers can access scanner
5. **RLS Policies**: Database-level security on scan logs

## Usage Flow

1. Participant opens E-ID page → Shows golden QR code
2. Gate volunteer scans QR (or enters manually)
3. API verifies signature + checks expiration
4. System looks up participant + previous scan sessions
5. **Logs entry** to `entry_logs` table with timestamp + volunteer
6. **Creates/updates** `scan_sessions` to track who's inside venue
7. Returns scan history (last session start + total count)
8. Display VERIFIED screen with all participant info + scan history
9. Volunteer clicks "SCAN NEXT" to process next person

## Benefits

- **Fraud Prevention**: See if someone is trying to re-enter (total scans counter)
- **Accountability**: Track which volunteer processed each entry
- **Speed**: Quick verification with all essential info at a glance
- **Professional**: Clean UI matching event branding
- **Analytics**: Data for post-event reports on attendance patterns
