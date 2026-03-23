# Alerting Engine

IndentiaDB includes a real-time alerting engine that monitors the knowledge graph for changes and triggers notifications when user-defined conditions are met. Alerts are powered by SurrealDB's `LIVE SELECT` mechanism, which pushes change events over WebSockets the moment data is created, updated, or deleted. Combined with SPARQL pattern matching, threshold evaluation, deduplication, rate limiting, and multi-channel delivery, the alerting engine turns IndentiaDB from a passive data store into an event-driven platform.

---

## Architecture

```text
+-------------------------------------------------------------+
|                    Alert Definition                          |
|   SPARQL Pattern --+--> Alert Compiler --> LIVE SELECT       |
|   Threshold Rule --+                                        |
+-------------------------------------------------------------+
|                    Alert Runtime                             |
|   LIVE SELECT --> WebSocket Listener --> Condition Evaluator |
|                                     --> Deduplication        |
|                                     --> Rate Limiter         |
|                                     --> Dispatcher           |
+-------------------------------------------------------------+
|                    Alert Delivery                            |
|   Dispatcher --> Webhook / Email / Slack / Custom Handler    |
+-------------------------------------------------------------+
|                    Alert Storage                             |
|   Alert Definitions --> SurrealDB                            |
|   Alert History     --> SurrealDB                            |
+-------------------------------------------------------------+
```

When an alert rule is created, IndentiaDB compiles the SPARQL pattern or threshold condition into a SurrealDB `LIVE SELECT` query. A WebSocket listener receives change notifications in real time, evaluates the condition, checks deduplication and rate-limiting filters, and dispatches actions through the configured channels.

---

## Alert Conditions

IndentiaDB supports three types of alert conditions:

### SPARQL Pattern Match

Trigger when triples matching a SPARQL WHERE clause are created, updated, or deleted:

```json
{
  "type": "sparql_pattern",
  "pattern": "?product schema:stockLevel ?level . ?product schema:name ?name .",
  "filter": "?level < 10",
  "events": ["create", "update"]
}
```

### Threshold Crossing

Trigger when a SPARQL aggregate query crosses a numeric threshold:

```json
{
  "type": "threshold",
  "query": "SELECT (COUNT(*) AS ?count) WHERE { ?s a ex:FailedLogin }",
  "operator": "greater_than",
  "value": 100,
  "interval_seconds": 60
}
```

### Aggregate Condition

Trigger on complex aggregate conditions:

```json
{
  "type": "aggregate",
  "query": "SELECT (AVG(?value) AS ?avg) WHERE { ?s schema:value ?value }",
  "condition": "> 50"
}
```

### Threshold Operators

| Operator | Symbol | Description |
|----------|--------|-------------|
| `greater_than` | `>` | Value exceeds threshold |
| `greater_than_or_equal` | `>=` | Value meets or exceeds threshold |
| `less_than` | `<` | Value falls below threshold |
| `less_than_or_equal` | `<=` | Value meets or falls below threshold |
| `equal` | `=` | Value equals threshold |
| `not_equal` | `!=` | Value differs from threshold |

### Change Events

| Event | Description |
|-------|-------------|
| `create` | New triple was inserted |
| `update` | Existing triple was modified |
| `delete` | Triple was removed |

---

## Alert Actions

When an alert condition is satisfied, one or more actions are dispatched:

### Webhook

Send an HTTP request to an external endpoint:

```json
{
  "type": "webhook",
  "url": "https://api.example.com/alerts",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer {{API_TOKEN}}",
    "Content-Type": "application/json"
  },
  "body_template": "{\"alert\": \"{{alert_name}}\", \"product\": \"{{name}}\", \"level\": {{level}}}"
}
```

!!! tip "Template variables"
    Body templates support `{{variable}}` placeholders that are replaced with bound SPARQL variables from the alert condition. Any variable bound in the pattern or filter is available for substitution.

### Email

Send an email notification:

```json
{
  "type": "email",
  "to": ["ops-team@example.com", "manager@example.com"],
  "subject_template": "[{{severity}}] {{alert_name}} triggered",
  "body_template": "Alert '{{alert_name}}' fired at {{triggered_at}}.\n\nDetails:\n{{trigger_data}}"
}
```

### Slack

Post a message to a Slack channel:

```json
{
  "type": "slack",
  "webhook_url": "https://hooks.slack.com/services/T00/B00/xxxx",
  "channel": "#alerts",
  "message_template": ":warning: *{{alert_name}}*\nProduct {{name}} stock is {{level}} (threshold: 10)"
}
```

### Log

Record the alert event in history without external delivery (useful for auditing):

```json
{
  "type": "log"
}
```

### Custom Handler

Invoke a registered custom handler function:

```json
{
  "type": "custom",
  "handler_name": "pagerduty_escalation",
  "config": {
    "routing_key": "R0123456789ABCDEF",
    "severity": "critical"
  }
}
```

---

## Alert Severity

Every alert rule carries a severity level that affects routing and prioritization:

| Severity | Description | Typical Actions |
|----------|-------------|-----------------|
| `info` | Informational, no action needed | Log, dashboard update |
| `warning` | Potential issue, monitor closely | Slack, email digest |
| `error` | Problem detected, investigate | Webhook, email, Slack |
| `critical` | Immediate action required | PagerDuty, SMS, phone |

Severities are ordered: `info < warning < error < critical`. Filtering by severity uses this ordering.

---

## Alert Lifecycle

An alert progresses through three possible states:

### States

| State | Description |
|-------|-------------|
| **Active** | Alert is monitoring for changes via a LIVE SELECT query. Includes the `live_query_id` and `started_at` timestamp. |
| **Paused** | Alert is temporarily disabled. Includes `paused_at` and an optional `reason`. |
| **Error** | Alert encountered a runtime error (e.g., WebSocket disconnection). Includes `error` message and `occurred_at` timestamp. |

### State Transitions

```text
         create
           |
           v
       +--------+    resume     +--------+
       | Paused |------------->| Active |
       +--------+<-------------+--------+
           ^       pause           |
           |                       |
           |                  error|
           |                       v
           |                  +--------+
           +------ reset <----| Error  |
                              +--------+
```

### Managing Alert State via REST API

```bash
# Create a new alert (starts in Paused state)
curl -X POST http://localhost:8000/api/alerts \
  -H "Content-Type: application/json" \
  -d @alert-definition.json

# Resume (activate) an alert
curl -X POST http://localhost:8000/api/alerts/low-stock-alert/resume

# Pause an alert
curl -X POST http://localhost:8000/api/alerts/low-stock-alert/pause \
  -d '{"reason": "Scheduled maintenance window"}'

# Delete an alert
curl -X DELETE http://localhost:8000/api/alerts/low-stock-alert
```

---

## Deduplication

The deduplication filter prevents identical alert events from being dispatched multiple times within a configurable time window. It works by hashing the trigger data and comparing against recently dispatched events.

### How It Works

1. When an alert fires, the trigger data is serialized to canonical JSON and hashed.
2. The hash is compared against recent dispatches for the same alert ID.
3. If a matching hash exists within the dedup window, the alert is suppressed.
4. Otherwise, the alert is dispatched and the hash is recorded.

### Configuration

```json
{
  "config": {
    "dedup_window_seconds": 60
  }
}
```

!!! note "Per-alert deduplication"
    Deduplication is scoped per alert ID. The same trigger data from different alert rules will not be deduplicated against each other.

---

## Rate Limiting

Rate limiting prevents alert storms by enforcing two constraints:

| Constraint | Description |
|-----------|-------------|
| **Cooldown** | Minimum time between consecutive alerts (in seconds) |
| **Hourly limit** | Maximum number of alerts dispatched per hour |

### How It Works

1. **Cooldown check**: If the last dispatch was less than `cooldown_seconds` ago, the alert is suppressed.
2. **Hourly limit check**: If the number of dispatches in the current hour exceeds `max_alerts_per_hour`, the alert is suppressed.
3. Both constraints are evaluated independently -- either one can suppress an alert.

### Configuration

```json
{
  "config": {
    "cooldown_seconds": 300,
    "max_alerts_per_hour": 10
  }
}
```

### Filter Pipeline

Deduplication and rate limiting are applied in sequence as a combined filter:

```text
Trigger Data --> Deduplication Filter --> Rate Limit Filter --> Dispatcher
                 (suppress duplicates)   (enforce cooldown)    (deliver)
```

If deduplication passes, rate limiting is checked. If both pass, the alert is dispatched and both filters record the dispatch.

---

## REST API

### `POST /api/alerts` -- Create Alert

```bash
curl -X POST http://localhost:8000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "low-stock-alert",
    "name": "Low Stock Alert",
    "description": "Triggers when product stock falls below threshold",
    "condition": {
      "type": "sparql_pattern",
      "pattern": "?product schema:stockLevel ?level . ?product schema:name ?name .",
      "filter": "?level < 10",
      "events": ["update"]
    },
    "actions": [
      {
        "type": "webhook",
        "url": "https://api.example.com/alerts",
        "method": "POST",
        "headers": {},
        "body_template": "{\"alert\": \"low_stock\", \"product\": \"{{name}}\", \"level\": {{level}}}"
      },
      {
        "type": "slack",
        "webhook_url": "https://hooks.slack.com/services/T00/B00/xxxx",
        "channel": "#inventory",
        "message_template": "Low stock: {{name}} has {{level}} units remaining"
      }
    ],
    "config": {
      "cooldown_seconds": 300,
      "max_alerts_per_hour": 10,
      "dedup_window_seconds": 60,
      "severity": "warning",
      "tags": ["inventory", "stock"]
    }
  }'
```

### `GET /api/alerts` -- List Alerts

```bash
# List all alerts
curl http://localhost:8000/api/alerts

# Filter by state
curl "http://localhost:8000/api/alerts?state=active"

# Filter by severity
curl "http://localhost:8000/api/alerts?severity=critical"

# Filter by tags
curl "http://localhost:8000/api/alerts?tags=inventory,stock"
```

### `GET /api/alerts/:id` -- Get Alert

```bash
curl http://localhost:8000/api/alerts/low-stock-alert
```

### `PUT /api/alerts/:id` -- Update Alert

```bash
curl -X PUT http://localhost:8000/api/alerts/low-stock-alert \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "cooldown_seconds": 600,
      "severity": "error"
    }
  }'
```

### `DELETE /api/alerts/:id` -- Delete Alert

```bash
curl -X DELETE http://localhost:8000/api/alerts/low-stock-alert
```

### `POST /api/alerts/:id/resume` -- Activate Alert

```bash
curl -X POST http://localhost:8000/api/alerts/low-stock-alert/resume
```

### `POST /api/alerts/:id/pause` -- Pause Alert

```bash
curl -X POST http://localhost:8000/api/alerts/low-stock-alert/pause \
  -d '{"reason": "Investigating false positives"}'
```

### `POST /api/alerts/:id/test` -- Test Alert

Manually trigger an alert to verify delivery configuration:

```bash
curl -X POST http://localhost:8000/api/alerts/low-stock-alert/test \
  -d '{"name": "Widget A", "level": 3}'
```

### `GET /api/alerts/history` -- Alert History

```bash
# All history
curl http://localhost:8000/api/alerts/history

# History for a specific alert
curl "http://localhost:8000/api/alerts/history?alert_id=low-stock-alert"

# History with time range
curl "http://localhost:8000/api/alerts/history?from=2026-03-01&to=2026-03-23"

# Limit results
curl "http://localhost:8000/api/alerts/history?limit=50"
```

Response:

```json
{
  "events": [
    {
      "id": "evt_01HY...",
      "alert_id": "low-stock-alert",
      "triggered_at": "2026-03-23T14:30:00Z",
      "trigger_data": {"name": "Widget A", "level": 5},
      "change_type": "update",
      "delivery_status": [
        {
          "action_index": 0,
          "status": {"result": "success"},
          "attempted_at": "2026-03-23T14:30:01Z",
          "completed_at": "2026-03-23T14:30:01Z"
        },
        {
          "action_index": 1,
          "status": {"result": "success"},
          "attempted_at": "2026-03-23T14:30:01Z",
          "completed_at": "2026-03-23T14:30:02Z"
        }
      ]
    }
  ]
}
```

---

## Delivery Status

Each action in an alert event tracks its own delivery status:

| Status | Description |
|--------|-------------|
| `pending` | Delivery has not been attempted yet |
| `success` | Delivery completed successfully |
| `failed` | Delivery failed after all retries (includes `error` and `retries` count) |
| `skipped` | Delivery was skipped (includes `reason`, e.g., deduplication) |

### Retry Behavior

Failed deliveries are retried with exponential backoff:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `max_retries` | 3 | Maximum retry attempts |
| `initial_delay_ms` | 1000 | Initial delay between retries |
| `max_delay_ms` | 30000 | Maximum delay cap |
| `backoff_multiplier` | 2.0 | Multiplier for exponential backoff |

Retry sequence with defaults: 1s, 2s, 4s (then give up).

---

## SurrealQL Integration

### LIVE SELECT Triggers

Under the hood, alert rules compile to SurrealDB LIVE SELECT queries. You can also define alerts directly in SurrealQL:

```sql
-- Monitor for new high-priority incidents
LIVE SELECT * FROM incident
WHERE priority = "critical"
  AND status = "open";
```

### Querying Alert History in SurrealQL

```sql
-- Recent alert events
SELECT * FROM alert_history
WHERE triggered_at > time::now() - 24h
ORDER BY triggered_at DESC
LIMIT 50;

-- Failed deliveries requiring attention
SELECT * FROM alert_history
WHERE delivery_status[*].status.result CONTAINS "failed"
  AND triggered_at > time::now() - 7d;

-- Alert frequency by rule
SELECT alert_id, count() AS total
FROM alert_history
WHERE triggered_at > time::now() - 24h
GROUP BY alert_id
ORDER BY total DESC;
```

---

## Examples

### Fraud Detection Alert

```bash
curl -X POST http://localhost:8000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "fraud-detection",
    "name": "Suspicious Transaction Pattern",
    "description": "Detects multiple high-value transactions from the same account within 5 minutes",
    "condition": {
      "type": "threshold",
      "query": "SELECT (COUNT(*) AS ?count) WHERE { ?tx a ex:Transaction ; ex:account ?acc ; ex:amount ?amt . FILTER(?amt > 10000) }",
      "operator": "greater_than",
      "value": 3,
      "interval_seconds": 300
    },
    "actions": [
      {
        "type": "webhook",
        "url": "https://fraud-api.internal/v1/alerts",
        "method": "POST",
        "headers": {"X-Priority": "critical"},
        "body_template": "{\"type\": \"multi_high_value\", \"count\": {{count}}}"
      },
      {
        "type": "slack",
        "webhook_url": "https://hooks.slack.com/services/T00/B00/xxxx",
        "channel": "#fraud-alerts",
        "message_template": ":rotating_light: *Fraud Alert*: {{count}} high-value transactions detected in 5-minute window"
      }
    ],
    "config": {
      "cooldown_seconds": 600,
      "max_alerts_per_hour": 5,
      "severity": "critical",
      "tags": ["fraud", "security"]
    }
  }'
```

### Data Quality Monitor

```bash
curl -X POST http://localhost:8000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "missing-email-alert",
    "name": "Customer Missing Email",
    "description": "Triggers when a customer record is created without an email address",
    "condition": {
      "type": "sparql_pattern",
      "pattern": "?customer a schema:Customer . ?customer schema:name ?name . FILTER NOT EXISTS { ?customer schema:email ?email }",
      "filter": null,
      "events": ["create"]
    },
    "actions": [
      {
        "type": "email",
        "to": ["data-quality@example.com"],
        "subject_template": "Missing email for customer {{name}}",
        "body_template": "Customer {{name}} was created without an email address.\n\nPlease review and update the record."
      }
    ],
    "config": {
      "cooldown_seconds": 0,
      "dedup_window_seconds": 3600,
      "severity": "warning",
      "tags": ["data-quality", "customer"]
    }
  }'
```

### Schema Violation Alert

```bash
curl -X POST http://localhost:8000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "schema-violation",
    "name": "SHACL Violation Detected",
    "description": "Triggers when data violates a SHACL constraint",
    "condition": {
      "type": "sparql_pattern",
      "pattern": "?report a sh:ValidationReport . ?report sh:result ?result . ?result sh:focusNode ?node . ?result sh:resultMessage ?message .",
      "filter": null,
      "events": ["create"]
    },
    "actions": [
      {"type": "log"},
      {
        "type": "webhook",
        "url": "https://monitoring.internal/schema-violations",
        "method": "POST",
        "headers": {},
        "body_template": "{\"node\": \"{{node}}\", \"message\": \"{{message}}\"}"
      }
    ],
    "config": {
      "severity": "error",
      "tags": ["schema", "validation"]
    }
  }'
```

---

## Configuration

### Full Alerting Configuration

```toml
[alerting]
# Enable/disable the alerting engine
enabled = true

# Maximum number of concurrent alert listeners (LIVE SELECT queries)
max_concurrent_alerts = 100

# Default cooldown between alerts (seconds)
default_cooldown_seconds = 60

# Alert history retention (days)
history_retention_days = 90

[alerting.websocket]
# WebSocket reconnection settings
reconnect_interval_seconds = 5
max_reconnect_attempts = 10
keepalive_interval_seconds = 30

[alerting.webhook]
# Default webhook delivery settings
timeout_seconds = 10
max_retries = 3
initial_retry_delay_ms = 1000
max_retry_delay_ms = 30000
backoff_multiplier = 2.0

[alerting.email]
# SMTP settings for email delivery
smtp_host = "smtp.example.com"
smtp_port = 587
smtp_username = "alerts@example.com"
smtp_password = "${SMTP_PASSWORD}"
from_address = "indentiadb-alerts@example.com"
use_tls = true

[alerting.slack]
# Default Slack webhook URL (can be overridden per alert)
default_webhook_url = "https://hooks.slack.com/services/T00/B00/default"
```

!!! warning "Concurrent alert limits"
    Each active alert maintains a WebSocket connection to SurrealDB. Setting `max_concurrent_alerts` too high may exhaust connection limits. Monitor connection counts and adjust based on your SurrealDB deployment capacity.

---

## Metrics

The alerting engine exposes latency and throughput metrics for monitoring:

| Metric | Description |
|--------|-------------|
| `alert_evaluations_total` | Total number of condition evaluations |
| `alert_triggers_total` | Total number of triggered alerts |
| `alert_deliveries_total` | Total delivery attempts by channel |
| `alert_delivery_latency_ms` | Delivery latency histogram |
| `alert_dedup_suppressed_total` | Alerts suppressed by deduplication |
| `alert_ratelimit_suppressed_total` | Alerts suppressed by rate limiting |
| `alert_active_count` | Current number of active alert listeners |
