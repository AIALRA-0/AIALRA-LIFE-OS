# API Contract

## POST /api/plan/generate

Request:

```json
{
  "date": "2026-06-04",
  "mustDo": "Example: call DSO, run cocotb tests, 30 min walk",
  "temporaryItems": "Optional appointments or travel",
  "specialNeeds": "Low sleep, pain, urgent admin, new resource scan",
  "bodyStatus": {
    "sleepQuality": 3,
    "weightKg": 100,
    "painLevel": 2,
    "energy": 3
  },
  "mentalStatus": {
    "focus": 2,
    "anxiety": 3,
    "urgeRisk": 2
  },
  "requiresResearch": false
}
```

Response:

```json
{
  "dailyPlanId": "uuid",
  "status": "DRAFT|ACTIVE",
  "validation": {
    "ok": true,
    "errors": []
  }
}
```

## POST /api/plan/block/:id/checkin

Request:

```json
{
  "status": "COMPLETED|PARTIAL|MISSED|SKIPPED|RESCHEDULED",
  "actualStart": "2026-06-04T06:30:00-04:00",
  "actualEnd": "2026-06-04T07:00:00-04:00",
  "energy": 3,
  "focus": 4,
  "urgeTrigger": null,
  "note": "Finished cocotb ALU regression; one failing edge case remains.",
  "artifactUrl": "https://github.com/.../commit/..."
}
```

Response:

```json
{
  "ok": true,
  "blockStatus": "COMPLETED",
  "nextBlockId": "uuid"
}
```

## POST /api/review/daily

Request:

```json
{
  "date": "2026-06-04",
  "mode": "generate_and_save"
}
```

Response:

```json
{
  "summary": "...",
  "completionRate": 0.74,
  "skillUpdates": [],
  "riskFlags": [],
  "tomorrowFocus": []
}
```
