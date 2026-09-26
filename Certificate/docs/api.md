# Certificate API — Quick Reference

Full spec: [`/Certificate/api/swagger.yaml`](../api/swagger.yaml)  
Base URL: `https://api.risingedgetechnologies.com/v1`

All requests (except Verify) require `Authorization: Bearer <JWT>`.

---

## Endpoints

### List certificates
```
GET /certificates
```
Query params: `status`, `search`, `page`, `per_page`

### Generate certificate
```
POST /certificates
Content-Type: application/json

{
  "candidateName": "Arjun Sharma",
  "email": "arjun@example.com",
  "courseName": "Signal Integrity Academy",
  "courseCode": "SIA201",
  "completionDate": "2026-06-15",
  "duration": "24 Hours",
  "instructor": "Dr. Rahul Mehta",
  "grade": "A+",
  "enrollmentId": "RE-2026-00142",
  "sendEmail": true
}
```

### Get certificate
```
GET /certificates/{id}
```

### Revoke certificate
```
DELETE /certificates/{id}
Content-Type: application/json

{ "reason": "Candidate violation of terms" }
```

### Download PDF
```
GET /certificates/{id}/pdf
→ application/pdf
```

### Get audit log
```
GET /certificates/{id}/audit
→ { events: [ AuditEvent ] }
```

### Verify (public, no auth)
```
GET /certificates/verify/{certNumber}
→ { valid: true, status: "active", certificate: { ... } }
```

### Resend email
```
POST /certificates/{id}/email/resend
```

### Stats
```
GET /certificates/stats
→ { total, active, revoked, expired, pending, issued_this_month, ... }
```

---

## Certificate Number Format

```
RET-{YEAR}-{COURSECODE6}-{SEQ6}
```

Examples:
- `RET-2026-SIA201-000451`
- `RET-2026-PCBDES-000052`
- `RET-2025-EMBSYS-001200`

---

## Status Values

| Status    | Meaning                                       |
|-----------|-----------------------------------------------|
| `active`  | Valid, can be verified and downloaded         |
| `revoked` | Permanently invalidated                       |
| `expired` | Past the expiry window (if applicable)        |
| `pending` | Generated but email not yet dispatched        |

---

## Audit Event Types

| Event       | Triggered by                         |
|-------------|--------------------------------------|
| `generated` | Admin generates the certificate      |
| `email_sent`| Email service delivers successfully  |
| `email_failed`| Email delivery fails               |
| `downloaded`| Candidate or admin downloads PDF     |
| `verified`  | Anyone checks the verification page  |
| `revoked`   | Admin revokes the certificate        |
| `resent`    | Admin resends the email              |
| `viewed`    | Certificate details page opened      |

---

## Error Shape

```json
{
  "error": "not_found",
  "message": "Certificate RET-2026-SIA201-000451 does not exist.",
  "details": {}
}
```

HTTP status codes: `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `500` Server Error
