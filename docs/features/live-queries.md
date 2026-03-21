# Live Queries & Real-Time Features

IndentiaDB is reactive by design. Every data change — whether written through SurrealQL, SPARQL, or the Elasticsearch API — can trigger immediate notifications to connected WebSocket clients, fire SurrealQL event handlers, or match SPARQL-based alert rules.

---

## LIVE SELECT (WebSocket)

### Connecting

```
ws://localhost:7001/ws
```

The WebSocket endpoint accepts SurrealQL statements. Authenticate by sending a `SIGNIN` message immediately after connecting, before issuing any `LIVE SELECT`.

**JavaScript:**

```javascript
const ws = new WebSocket("ws://localhost:7001/ws");
let liveQueryId = null;

ws.onopen = () => {
    // Authenticate with JWT
    ws.send(JSON.stringify({
        id:     "auth-1",
        method: "signin",
        params: [{ token: "YOUR_JWT_TOKEN" }]
    }));
};

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.id === "auth-1") {
        // Start a LIVE SELECT after authentication
        ws.send(JSON.stringify({
            id:     "live-1",
            method: "query",
            params: ["LIVE SELECT * FROM sensor_readings WHERE device_id = 'sensor-42'"]
        }));
    }

    if (msg.id === "live-1" && msg.result) {
        // Store the live query UUID for later KILL
        liveQueryId = msg.result[0].result;
        console.log("Subscribed with live query ID:", liveQueryId);
    }

    // Live notifications arrive without an id — they have "action" and "result"
    if (!msg.id && msg.result && msg.result.action) {
        const notification = msg.result;
        console.log(`[${notification.action}]`, notification.result);
        // notification.action: "CREATE" | "UPDATE" | "DELETE"
        // notification.result: the affected record (or deleted record ID)
    }
};

// Unsubscribe
function unsubscribe() {
    ws.send(JSON.stringify({
        id:     "kill-1",
        method: "query",
        params: [`KILL "${liveQueryId}"`]
    }));
}
```

**Python (websockets library):**

```python
import asyncio
import json
import websockets

ENDPOINT = "ws://localhost:7001/ws"
JWT_TOKEN = "YOUR_JWT_TOKEN"

async def subscribe_to_changes():
    async with websockets.connect(ENDPOINT) as ws:
        # Authenticate
        await ws.send(json.dumps({
            "id":     "auth-1",
            "method": "signin",
            "params": [{"token": JWT_TOKEN}]
        }))
        auth_response = json.loads(await ws.recv())
        assert auth_response.get("result") is not None, "Authentication failed"

        # Subscribe
        await ws.send(json.dumps({
            "id":     "live-1",
            "method": "query",
            "params": ["LIVE SELECT * FROM orders WHERE status != 'completed'"]
        }))
        sub_response = json.loads(await ws.recv())
        live_query_id = sub_response["result"][0]["result"]
        print(f"Live query ID: {live_query_id}")

        # Process notifications indefinitely
        async for message in ws:
            msg = json.loads(message)
            if "action" in msg.get("result", {}):
                action = msg["result"]["action"]
                record = msg["result"]["result"]
                print(f"[{action}] {json.dumps(record, indent=2)}")

        # To unsubscribe (outside the loop in real usage):
        # await ws.send(json.dumps({
        #     "id": "kill-1",
        #     "method": "query",
        #     "params": [f'KILL "{live_query_id}"']
        # }))

asyncio.run(subscribe_to_changes())
```

### Notification Format

Each live notification is a JSON message with the following structure:

```json
{
  "result": {
    "action": "UPDATE",
    "id":     "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "result": {
      "id":        "sensor_readings:ynew8z2q7kzqb4a3",
      "device_id": "sensor-42",
      "value":     23.7,
      "unit":      "celsius",
      "timestamp": "2025-11-14T09:23:41.882Z"
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `action` | `"CREATE"` — new record matched the WHERE clause; `"UPDATE"` — existing record updated; `"DELETE"` — record deleted or no longer matches WHERE |
| `id` | The UUID of the live query that produced this notification |
| `result` | The full record at the time of the event (for DELETE: only the record ID) |

### Unsubscribe (KILL)

```sql
KILL "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
```

Active live queries are also automatically cleaned up when the WebSocket connection closes.

---

## DEFINE EVENT Triggers

`DEFINE EVENT` registers a SurrealQL handler that fires whenever a record in a table is created, updated, or deleted. Unlike polling, events are synchronous with the write transaction — the trigger fires before the write is acknowledged to the client.

### 1. Audit Log

Record every change to a table with before/after snapshots:

```sql
DEFINE EVENT audit_employees ON TABLE employees
WHEN $event = "CREATE" OR $event = "UPDATE" OR $event = "DELETE"
THEN {
    CREATE audit_log SET
        table      = "employees",
        record_id  = $value.id,
        action     = $event,
        before     = $before,
        after      = $value,
        changed_by = $auth.id,
        changed_at = time::now()
    ;
};
```

`$before` is `NONE` on CREATE; `$value` is `NONE` on DELETE.

### 2. Field Change Tracking

Fire only when a specific field changes, and record the delta:

```sql
DEFINE EVENT track_salary_change ON TABLE employees
WHEN $event = "UPDATE" AND $before.salary != $value.salary
THEN {
    CREATE salary_changes SET
        employee_id = $value.id,
        old_salary  = $before.salary,
        new_salary  = $value.salary,
        delta       = $value.salary - $before.salary,
        changed_by  = $auth.id,
        changed_at  = time::now()
    ;
};
```

### 3. Archive on Delete

Move deleted records to an archive table instead of losing them:

```sql
DEFINE EVENT archive_deleted_customers ON TABLE customers
WHEN $event = "DELETE"
THEN {
    CREATE customer_archive CONTENT {
        original_id:  $before.id,
        data:         $before,
        deleted_by:   $auth.id,
        deleted_at:   time::now(),
        deletion_reason: $input.reason  -- passed as query variable
    };
};
```

### 4. Cascade Updates

When a parent record changes, update all child records:

```sql
DEFINE EVENT cascade_department_rename ON TABLE departments
WHEN $event = "UPDATE" AND $before.name != $value.name
THEN {
    UPDATE employees
        SET department_name = $value.name
        WHERE department_id = $value.id
    ;
};
```

### 5. Conditional Events (WHEN Clause)

Events can carry arbitrary SurrealQL conditions in `WHEN`:

```sql
DEFINE EVENT notify_low_stock ON TABLE inventory
WHEN $event = "UPDATE"
  AND $value.quantity < 10
  AND $before.quantity >= 10
THEN {
    CREATE notifications SET
        type       = "low_stock",
        product_id = $value.id,
        quantity   = $value.quantity,
        threshold  = 10,
        created_at = time::now(),
        resolved   = false
    ;
};
```

This fires only on the transition from above-threshold to below-threshold — not on every update while the item is already low.

### 6. Multi-Table Activity Feed

Aggregate events from multiple tables into a unified activity feed:

```sql
DEFINE EVENT orders_activity ON TABLE orders
WHEN $event IN ["CREATE", "UPDATE"]
THEN {
    CREATE activity_feed SET
        entity_type = "order",
        entity_id   = $value.id,
        action      = $event,
        actor       = $auth.id,
        summary     = string::concat("Order ", string::from($value.id),
                                     " was ", string::lowercase($event), "d"),
        payload     = $value,
        occurred_at = time::now()
    ;
};

DEFINE EVENT customers_activity ON TABLE customers
WHEN $event IN ["CREATE", "UPDATE", "DELETE"]
THEN {
    CREATE activity_feed SET
        entity_type = "customer",
        entity_id   = $value.id ?? $before.id,
        action      = $event,
        actor       = $auth.id,
        summary     = string::concat("Customer ", string::lowercase($event), "d"),
        payload     = $value ?? $before,
        occurred_at = time::now()
    ;
};
```

---

## Alerting Engine

The alerting engine is a REST-based service that evaluates SPARQL pattern-matching rules against incoming writes. When a rule matches, it delivers a webhook notification.

### Create an Alert

```bash
curl -X POST http://localhost:7001/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Low Stock Alert",
    "rule": {
      "pattern": "?product schema:stockLevel ?level",
      "filter":  "?level < 10",
      "events":  ["update"],
      "prefixes": {
        "schema": "http://schema.org/"
      }
    },
    "notification": {
      "type":     "webhook",
      "url":      "https://hooks.example.com/alert-receiver",
      "headers":  { "X-Alert-Source": "indentiadb" },
      "template": "{\"product\": \"{{product}}\", \"level\": {{level}}}"
    }
  }'
```

**Response:**

```json
{
  "id":      "alert:3f8a92c1-e4d7-4b2a-9f1c-2a3b4c5d6e7f",
  "name":    "Low Stock Alert",
  "status":  "active",
  "created": "2025-11-14T09:00:00Z"
}
```

### List Alerts

```bash
curl http://localhost:7001/alerts \
  -H "Authorization: Bearer $TOKEN"
```

### Pause an Alert

```bash
curl -X POST http://localhost:7001/alerts/alert:3f8a92c1-e4d7-4b2a-9f1c-2a3b4c5d6e7f/pause \
  -H "Authorization: Bearer $TOKEN"
```

### Resume an Alert

```bash
curl -X POST http://localhost:7001/alerts/alert:3f8a92c1-e4d7-4b2a-9f1c-2a3b4c5d6e7f/resume \
  -H "Authorization: Bearer $TOKEN"
```

### Alert History

```bash
curl http://localhost:7001/alerts/alert:3f8a92c1-e4d7-4b2a-9f1c-2a3b4c5d6e7f/history \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**

```json
{
  "alert_id": "alert:3f8a92c1-e4d7-4b2a-9f1c-2a3b4c5d6e7f",
  "firings": [
    {
      "fired_at":    "2025-11-14T10:23:00Z",
      "bindings":    { "product": "http://example.org/product/42", "level": 7 },
      "delivered":   true,
      "response_ms": 84
    },
    {
      "fired_at":    "2025-11-14T11:05:00Z",
      "bindings":    { "product": "http://example.org/product/17", "level": 3 },
      "delivered":   true,
      "response_ms": 91
    }
  ]
}
```

---

## Rust Live Query API

The Rust API gives direct access to the live query engine for embedding in Rust applications or custom IndentiaDB plugins.

### Subscribe to a Named Graph

```rust
use indentiagraph_surreal::events::{LiveQueryManager, LiveQueryConfig, EventKind};
use oxigraph::model::NamedNode;
use futures::StreamExt;

async fn watch_graph(connection: Arc<dyn Connection>) -> anyhow::Result<()> {
    let manager = LiveQueryManager::new(connection, LiveQueryConfig::default());

    let graph = NamedNode::new("http://example.org/data")?;
    let mut stream = manager.subscribe_graph(&graph).await?;

    println!("Watching graph: {}", graph.as_str());

    while let Some(result) = stream.next().await {
        match result {
            Ok(event) => {
                println!(
                    "[{}] {:?} on quad: {} {} {} {}",
                    event.timestamp,
                    event.kind,
                    event.quad.subject,
                    event.quad.predicate,
                    event.quad.object,
                    event.quad.graph_name,
                );
            }
            Err(e) => eprintln!("Stream error: {}", e),
        }
    }

    Ok(())
}
```

---

## Event Filtering

The `TripleFilter` builder lets you subscribe to highly specific changes:

```rust
use indentiagraph_surreal::events::{TripleFilter, LiveQueryManager};
use oxigraph::model::NamedNode;
use futures::StreamExt;

async fn watch_temperature_sensors(manager: &LiveQueryManager) -> anyhow::Result<()> {
    let filter = TripleFilter::new()
        .with_graph(NamedNode::new("http://example.org/sensors")?)
        .with_predicate(NamedNode::new("http://schema.org/temperature")?)
        .creates_only();  // Only fire on INSERT, not UPDATE or DELETE

    let mut stream = manager.subscribe(filter).await?;

    while let Some(Ok(event)) = stream.next().await {
        let temperature = event.quad.object.to_string();
        println!("New temperature reading: {}", temperature);
    }

    Ok(())
}
```

Available filter methods:

| Method | Description |
|--------|-------------|
| `.with_graph(NamedNode)` | Only events in this named graph |
| `.with_subject(Subject)` | Only events where the subject matches |
| `.with_predicate(NamedNode)` | Only events where the predicate matches |
| `.with_object(Term)` | Only events where the object matches |
| `.creates_only()` | Only `INSERT` events |
| `.updates_only()` | Only `UPDATE` events (triple replacement) |
| `.deletes_only()` | Only `DELETE` events |
| `.excluding_inferred()` | Skip triples produced by RDFS/OWL inference |

---

## Change Tracking Patterns

### Pattern 1: Timestamp Polling (Simple Baseline)

Use a `last_seen` timestamp stored per client to retrieve only changes since last check:

```sql
-- Client records a high-water mark
LET $last_seen = "2025-11-14T09:00:00Z";

SELECT * FROM events
WHERE occurred_at > $last_seen
ORDER BY occurred_at ASC
LIMIT 1000;
```

This is the simplest pattern but has polling latency and thundering-herd issues under high cardinality.

### Pattern 2: Optimistic Locking

Use a version counter to detect and reject conflicting concurrent writes:

```sql
-- Read with version
SELECT id, name, version FROM documents WHERE id = "doc:42";
-- version = 7

-- Write only if version matches (optimistic lock)
UPDATE documents SET
    name    = "New Name",
    version = version + 1
WHERE id = "doc:42"
  AND version = 7;
-- Returns empty result if another writer incremented version first
```

### Pattern 3: Changelogs

Maintain an append-only changelog table that records every mutation:

```sql
DEFINE TABLE changelog SCHEMAFULL;
DEFINE FIELD table_name  ON changelog TYPE string;
DEFINE FIELD record_id   ON changelog TYPE record;
DEFINE FIELD operation   ON changelog TYPE string;  -- CREATE | UPDATE | DELETE
DEFINE FIELD delta       ON changelog TYPE object;  -- field-level diff
DEFINE FIELD lsn         ON changelog TYPE int;     -- log sequence number
DEFINE FIELD occurred_at ON changelog TYPE datetime;

-- Attach to any table via DEFINE EVENT
DEFINE EVENT changelog_products ON TABLE products
WHEN $event IN ["CREATE", "UPDATE", "DELETE"]
THEN {
    CREATE changelog SET
        table_name  = "products",
        record_id   = $value.id ?? $before.id,
        operation   = $event,
        delta       = object::diff($before, $value),
        lsn         = sequence::next("global_lsn"),
        occurred_at = time::now()
    ;
};
```

### Pattern 4: Cursor Pagination over Changes

Consumers maintain a cursor (last seen log sequence number) and page through changes:

```sql
-- Consumer keeps track of: last_lsn = 1042
SELECT * FROM changelog
WHERE lsn > $last_lsn
ORDER BY lsn ASC
LIMIT 100;
-- Next cursor = max(lsn) from results
```

This enables reliable exactly-once processing: if the consumer crashes and restarts, it replays from `last_lsn`.

### Pattern 5: Snapshot Differentials

Compute a diff between two complete snapshots at different points in time:

```sql
-- Snapshot A (stored by bitemporal history or explicit snapshot table)
-- Snapshot B (current state)

SELECT b.id, b.value, a.value AS previous_value
FROM current_state AS b
LEFT JOIN snapshot_20251101 AS a ON a.id = b.id
WHERE b.value != a.value OR a.id IS NULL;
```

### Pattern 6: Compaction

Collapse a long changelog into a summary:

```sql
-- Keep only the latest state per record, discard intermediate changes older than 30 days
DELETE changelog
WHERE occurred_at < time::now() - 30d
  AND operation != "DELETE";

-- For each remaining DELETE, ensure the record is gone from the live table
-- (handled by the DEFINE EVENT archive pattern above)
```

---

## AI Agent Patterns

### Pattern 1: Inbox (Task Assignment)

```sql
DEFINE TABLE inbox SCHEMAFULL;
DEFINE FIELD agent_id    ON inbox TYPE string;
DEFINE FIELD task        ON inbox TYPE object;
DEFINE FIELD status      ON inbox TYPE string DEFAULT "pending";
DEFINE FIELD created_at  ON inbox TYPE datetime DEFAULT time::now();

-- Agent polls its inbox
SELECT * FROM inbox
WHERE agent_id = $agent_id
  AND status   = "pending"
ORDER BY created_at ASC
LIMIT 1;

-- Mark in-progress
UPDATE inbox SET status = "in_progress", started_at = time::now()
WHERE id = $task_id AND status = "pending";

-- Mark done
UPDATE inbox SET status = "done", completed_at = time::now(), result = $result
WHERE id = $task_id;
```

### Pattern 2: FIFO Task Queue

```sql
DEFINE TABLE task_queue SCHEMAFULL;
DEFINE FIELD queue_name  ON task_queue TYPE string;
DEFINE FIELD payload     ON task_queue TYPE object;
DEFINE FIELD status      ON task_queue TYPE string DEFAULT "queued";
DEFINE FIELD priority    ON task_queue TYPE int    DEFAULT 0;
DEFINE FIELD enqueued_at ON task_queue TYPE datetime DEFAULT time::now();
DEFINE INDEX idx_queue_priority ON task_queue FIELDS queue_name, priority, enqueued_at;

-- Dequeue (atomic claim)
BEGIN TRANSACTION;
    LET $task = (
        SELECT * FROM task_queue
        WHERE queue_name = "embedding_jobs"
          AND status     = "queued"
        ORDER BY priority DESC, enqueued_at ASC
        LIMIT 1
    )[0];

    IF $task != NONE {
        UPDATE task_queue SET status = "running", claimed_at = time::now()
        WHERE id = $task.id AND status = "queued";
    };

    RETURN $task;
COMMIT TRANSACTION;
```

### Pattern 3: Pub/Sub Channels

```sql
DEFINE TABLE pubsub_channels SCHEMAFULL;
DEFINE FIELD channel   ON pubsub_channels TYPE string;
DEFINE FIELD message   ON pubsub_channels TYPE object;
DEFINE FIELD published_at ON pubsub_channels TYPE datetime DEFAULT time::now();
DEFINE FIELD ttl       ON pubsub_channels TYPE duration DEFAULT 1h;

-- Publish
CREATE pubsub_channels SET
    channel = "model.inference.complete",
    message = {
        model_id:   "gpt-4o",
        request_id: "req-abc123",
        tokens:     1024,
        latency_ms: 387
    };

-- Subscribe (via LIVE SELECT)
LIVE SELECT * FROM pubsub_channels
WHERE channel = "model.inference.complete";

-- Clean up expired messages
DELETE pubsub_channels WHERE published_at < time::now() - ttl;
```

### Pattern 4: Agent State Machine

```sql
DEFINE TABLE agent_state SCHEMAFULL;
DEFINE FIELD agent_id       ON agent_state TYPE string;
DEFINE FIELD current_state  ON agent_state TYPE string;
DEFINE FIELD context        ON agent_state TYPE object;
DEFINE FIELD transitions    ON agent_state TYPE array;
DEFINE FIELD updated_at     ON agent_state TYPE datetime;

-- Transition with history
UPDATE agent_state SET
    current_state = $new_state,
    transitions   = array::push(transitions, {
        from:  current_state,
        to:    $new_state,
        at:    time::now(),
        reason: $reason
    }),
    updated_at = time::now()
WHERE agent_id = $agent_id
  AND current_state IN $allowed_from_states;
```

### Pattern 5: Collaborative Editing (Last-Write-Wins with Conflict Detection)

```sql
DEFINE TABLE documents SCHEMAFULL;
DEFINE FIELD content    ON documents TYPE string;
DEFINE FIELD version    ON documents TYPE int DEFAULT 0;
DEFINE FIELD editors    ON documents TYPE array;
DEFINE FIELD updated_at ON documents TYPE datetime;

-- Conflict-free update with version check
BEGIN TRANSACTION;
    LET $doc = SELECT * FROM documents WHERE id = $doc_id;

    IF $doc.version != $expected_version {
        THROW "Conflict: document was modified by another editor (version mismatch)";
    };

    UPDATE documents SET
        content    = $new_content,
        version    = version + 1,
        editors    = array::push(editors, { user: $auth.id, at: time::now() }),
        updated_at = time::now()
    WHERE id = $doc_id;
COMMIT TRANSACTION;
```

### Pattern 6: Heartbeat Monitoring

```sql
DEFINE TABLE agent_heartbeats SCHEMAFULL;
DEFINE FIELD agent_id    ON agent_heartbeats TYPE string;
DEFINE FIELD last_seen   ON agent_heartbeats TYPE datetime;
DEFINE FIELD metadata    ON agent_heartbeats TYPE object;

-- Agent sends heartbeat every 30s
UPSERT agent_heartbeats SET
    last_seen = time::now(),
    metadata  = { load: $load, tasks_completed: $tasks_completed }
WHERE agent_id = $agent_id;

-- Monitor detects stale agents (not seen in 2 minutes)
SELECT agent_id, last_seen,
       duration::from::secs(time::unix() - time::unix(last_seen)) AS silent_for
FROM agent_heartbeats
WHERE last_seen < time::now() - 2m
ORDER BY last_seen ASC;
```

### Pattern 7: Event Sourcing

Store all state as an immutable sequence of events; derive current state by replaying:

```sql
DEFINE TABLE event_store SCHEMAFULL;
DEFINE FIELD aggregate_id   ON event_store TYPE string;
DEFINE FIELD aggregate_type ON event_store TYPE string;
DEFINE FIELD event_type     ON event_store TYPE string;
DEFINE FIELD payload        ON event_store TYPE object;
DEFINE FIELD sequence_nr    ON event_store TYPE int;
DEFINE FIELD occurred_at    ON event_store TYPE datetime DEFAULT time::now();
DEFINE INDEX idx_aggregate ON event_store FIELDS aggregate_id, sequence_nr UNIQUE;

-- Append event
CREATE event_store SET
    aggregate_id   = "order:abc123",
    aggregate_type = "Order",
    event_type     = "OrderShipped",
    payload        = { tracking_number: "UPS-98765", carrier: "UPS" },
    sequence_nr    = (SELECT VALUE count() FROM event_store WHERE aggregate_id = "order:abc123") + 1;

-- Replay aggregate (get all events in order)
SELECT event_type, payload, occurred_at
FROM event_store
WHERE aggregate_id = "order:abc123"
ORDER BY sequence_nr ASC;

-- Snapshot for performance (store materialized state)
CREATE order_snapshots SET
    aggregate_id = "order:abc123",
    state        = $current_state,
    at_sequence  = $last_sequence_nr,
    snapshot_at  = time::now();
```

!!! tip "Event Sourcing + Bitemporal"
    Combine event sourcing with IndentiaDB's [bitemporal](bitemporal.md) layer for the ultimate auditability pattern: the event store gives you a causal history of decisions, while the bitemporal index gives you point-in-time queries over the derived state.
