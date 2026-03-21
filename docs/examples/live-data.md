# Live Data and Reactive Patterns

Real-time data patterns using DEFINE EVENT triggers, change tracking, AI agent communication, and reactive architectures — all using SurrealQL.

---

## Table of Contents

### DEFINE EVENT Triggers

1. [Audit Log on CREATE](#1-audit-log-on-create)
2. [Track Field Changes on UPDATE](#2-track-field-changes-on-update)
3. [Archive Deleted Records](#3-archive-deleted-records)
4. [Cascade Status Updates](#4-cascade-status-updates)
5. [Conditional Event (Severity Filter)](#5-conditional-event)
6. [Multi-Table Activity Feed](#6-multi-table-activity-feed)

### Change Tracking

7. [Timestamp-Based Polling](#7-timestamp-based-polling)
8. [Optimistic Locking (Version Counter)](#8-optimistic-locking)
9. [Before/After Changelog](#9-beforeafter-changelog)
10. [Cursor-Based Pagination](#10-cursor-based-pagination)
11. [Snapshot Differentials](#11-snapshot-differentials)
12. [Changelog Compaction](#12-changelog-compaction)

### AI Agent Real-Time Patterns

13. [Agent Inbox Pattern](#13-agent-inbox-pattern)
14. [FIFO Task Queue](#14-fifo-task-queue)
15. [Pub/Sub Channels](#15-pubsub-channels)
16. [Agent State Machine](#16-agent-state-machine)
17. [Collaborative Editing](#17-collaborative-editing)
18. [Heartbeat Monitoring](#18-heartbeat-monitoring)
19. [Event Sourcing](#19-event-sourcing)

### Reactive Data Patterns

20. [Materialized View via Event](#20-materialized-view)
21. [Notification System](#21-notification-system)
22. [Cache Invalidation](#22-cache-invalidation)
23. [Data Pipeline (Raw -> Parsed -> Enriched -> Indexed)](#23-data-pipeline)
24. [Threshold Alerts](#24-threshold-alerts)
25. [Knowledge Graph Sync (Document -> RDF Triples)](#25-knowledge-graph-sync)

---

## DEFINE EVENT Triggers

### 1. Audit Log on CREATE

Automatically log every new document to an audit table.

```sql
DEFINE TABLE document SCHEMALESS;
DEFINE TABLE audit_log SCHEMALESS;

DEFINE EVENT log_create ON TABLE document WHEN $event = "CREATE" THEN {
    CREATE audit_log SET
        action = 'created',
        table_name = 'document',
        record_id = $value.id,
        title = $value.title,
        logged_at = time::now();
};

-- These CREATEs automatically generate audit entries
CREATE document:report1 SET title = 'Q1 Financial Report', author = 'Alice';
CREATE document:report2 SET title = 'Security Audit', author = 'Bob';
CREATE document:memo1 SET title = 'Team Update', author = 'Carol';

-- Verify audit log
SELECT * FROM audit_log ORDER BY title;
-- 3 entries, each with action: 'created' and a logged_at timestamp
```

### 2. Track Field Changes on UPDATE

Log which fields changed and their new values.

```sql
DEFINE TABLE profile SCHEMALESS;
DEFINE TABLE change_log SCHEMALESS;

DEFINE EVENT track_update ON TABLE profile WHEN $event = "UPDATE" THEN {
    CREATE change_log SET
        record_id = $value.id,
        new_name = $value.name,
        new_email = $value.email,
        changed_at = time::now();
};

CREATE profile:alice SET name = 'Alice', email = 'alice@example.com';
UPDATE profile:alice SET name = 'Alice van den Berg';
UPDATE profile:alice SET email = 'alice@newdomain.com';

SELECT * FROM change_log ORDER BY changed_at;
-- 2 entries: one for name change, one for email change
```

### 3. Archive Deleted Records

Preserve deleted records in an archive table for compliance or undo.

```sql
DEFINE TABLE article SCHEMALESS;
DEFINE TABLE article_archive SCHEMALESS;

DEFINE EVENT archive_delete ON TABLE article WHEN $event = "DELETE" THEN {
    CREATE article_archive SET
        original_id = $before.id,
        title = $before.title,
        content = $before.content,
        archived_at = time::now();
};

CREATE article:a1 SET title = 'Outdated Policy', content = 'Old content here';
CREATE article:a2 SET title = 'Current Policy', content = 'Up to date';

DELETE article:a1;

-- Archive has the deleted record
SELECT * FROM article_archive;
-- 1 entry: title = 'Outdated Policy'

-- Original table only has the remaining article
SELECT * FROM article;
-- 1 entry: title = 'Current Policy'
```

### 4. Cascade Status Updates

When a parent record changes status, all children update automatically.

```sql
DEFINE TABLE project SCHEMALESS;
DEFINE TABLE task SCHEMALESS;

DEFINE EVENT cascade_status ON TABLE project WHEN $event = "UPDATE" THEN {
    UPDATE task SET project_status = $value.status
    WHERE project_id = $value.id;
};

CREATE project:p1 SET name = 'AI Pipeline', status = 'active';
CREATE task:t1 SET title = 'Data collection', project_id = project:p1, project_status = 'active';
CREATE task:t2 SET title = 'Model training', project_id = project:p1, project_status = 'active';
CREATE task:t3 SET title = 'Evaluation', project_id = project:p1, project_status = 'active';

-- Pause the project -- cascades to all tasks
UPDATE project:p1 SET status = 'paused';

SELECT title, project_status FROM task ORDER BY title;
-- All 3 tasks now have project_status: 'paused'
```

### 5. Conditional Event

Only fire the event when a specific condition is met (e.g., severity = critical).

```sql
DEFINE TABLE incident SCHEMALESS;
DEFINE TABLE alert_queue SCHEMALESS;

DEFINE EVENT critical_alert ON TABLE incident
    WHEN $event = "CREATE" AND $value.severity = "critical"
THEN {
    CREATE alert_queue SET
        incident_id = $value.id,
        message = $value.description,
        severity = $value.severity,
        queued_at = time::now();
};

CREATE incident:i1 SET description = 'Server overheating', severity = 'critical';
CREATE incident:i2 SET description = 'Disk space low', severity = 'warning';
CREATE incident:i3 SET description = 'Database failover', severity = 'critical';
CREATE incident:i4 SET description = 'Slow query detected', severity = 'info';

-- Only critical incidents appear in the alert queue
SELECT * FROM alert_queue ORDER BY message;
-- 2 entries: "Database failover" and "Server overheating"
```

### 6. Multi-Table Activity Feed

Events from multiple tables flow into a unified activity feed.

```sql
DEFINE TABLE person SCHEMALESS;
DEFINE TABLE organization SCHEMALESS;
DEFINE TABLE membership SCHEMALESS;
DEFINE TABLE activity_feed SCHEMALESS;

DEFINE EVENT log_person_create ON TABLE person WHEN $event = "CREATE" THEN {
    CREATE activity_feed SET
        event_type = 'person_created',
        entity_name = $value.name,
        occurred_at = time::now();
};

DEFINE EVENT log_org_create ON TABLE organization WHEN $event = "CREATE" THEN {
    CREATE activity_feed SET
        event_type = 'org_created',
        entity_name = $value.name,
        occurred_at = time::now();
};

DEFINE EVENT log_membership ON TABLE membership WHEN $event = "CREATE" THEN {
    CREATE activity_feed SET
        event_type = 'membership_created',
        person_id = $value.person_id,
        org_id = $value.org_id,
        occurred_at = time::now();
};

CREATE person:alice SET name = 'Alice';
CREATE person:bob SET name = 'Bob';
CREATE organization:acme SET name = 'ACME Corp';
CREATE membership:m1 SET person_id = person:alice, org_id = organization:acme;
CREATE membership:m2 SET person_id = person:bob, org_id = organization:acme;

SELECT * FROM activity_feed ORDER BY occurred_at;
-- 5 entries: 2 person_created, 1 org_created, 2 membership_created
```

---

## Change Tracking

### 7. Timestamp-Based Polling

Poll for records modified since a checkpoint timestamp.

```sql
DEFINE TABLE doc SCHEMALESS;
DEFINE TABLE doc_changes SCHEMALESS;

DEFINE EVENT track_doc_change ON TABLE doc WHEN $event = "UPDATE" THEN {
    CREATE doc_changes SET
        doc_id = $value.id,
        title = $value.title,
        changed_at = time::now();
};

CREATE doc:d1 SET title = 'Document 1', content = 'Initial', updated_at = time::now();
CREATE doc:d2 SET title = 'Document 2', content = 'Initial', updated_at = time::now();
CREATE doc:d3 SET title = 'Document 3', content = 'Initial', updated_at = time::now();

-- Agent records the checkpoint
-- LET $checkpoint = (SELECT updated_at FROM doc ORDER BY updated_at DESC LIMIT 1);

-- Later: modify only doc:d2
UPDATE doc:d2 SET content = 'Updated content', updated_at = time::now();

-- Poll for changes since checkpoint
SELECT * FROM doc WHERE updated_at > d'<checkpoint_value>' ORDER BY updated_at;
-- Returns: Document 2
```

### 8. Optimistic Locking

Use a version counter to detect concurrent modifications by multiple agents.

```sql
DEFINE TABLE entity SCHEMALESS;

CREATE entity:e1 SET name = 'Shared Resource', version = 1, data = 'initial';

-- Agent A reads version
SELECT version FROM entity:e1;
-- version: 1

-- Agent A writes with version check (optimistic lock)
UPDATE entity:e1 SET data = 'agent_a_update', version = 2 WHERE version = 1 RETURN AFTER;
-- Succeeds (returns the updated record)

-- Agent B tries to write with stale version
UPDATE entity:e1 SET data = 'agent_b_update', version = 2 WHERE version = 1 RETURN AFTER;
-- Returns empty (WHERE version = 1 no longer matches)

-- Final state: Agent A's write persisted
SELECT * FROM entity:e1;
-- data: 'agent_a_update', version: 2
```

### 9. Before/After Changelog

Record the before and after values for each change.

```sql
DEFINE TABLE config SCHEMALESS;
DEFINE TABLE config_changelog SCHEMALESS;

DEFINE EVENT log_config_update ON TABLE config WHEN $event = "UPDATE" THEN {
    CREATE config_changelog SET
        record_id = $value.id,
        before_value = $before.value,
        after_value = $value.value,
        changed_by = $value.changed_by,
        changed_at = time::now();
};

CREATE config:max_tokens SET value = 1024, changed_by = 'admin';
UPDATE config:max_tokens SET value = 2048, changed_by = 'agent_alpha';
UPDATE config:max_tokens SET value = 4096, changed_by = 'agent_beta';
UPDATE config:max_tokens SET value = 2048, changed_by = 'admin';

SELECT * FROM config_changelog ORDER BY changed_at;
-- Entry 1: before=1024, after=2048, changed_by='agent_alpha'
-- Entry 2: before=2048, after=4096, changed_by='agent_beta'
-- Entry 3: before=4096, after=2048, changed_by='admin'
```

### 10. Cursor-Based Pagination

Process changes in small batches using a cursor.

```sql
DEFINE TABLE event_stream SCHEMALESS;

-- Insert 10 events with sequential IDs
-- CREATE event_stream SET seq = 1..10, payload = 'event_N', created_at = time::now();

-- Batch 1: fetch first 3
SELECT * FROM event_stream ORDER BY seq LIMIT 3;
-- seq: 1, 2, 3

-- Batch 2: use last seq as cursor
SELECT * FROM event_stream WHERE seq > 3 ORDER BY seq LIMIT 3;
-- seq: 4, 5, 6

-- Batch 3
SELECT * FROM event_stream WHERE seq > 6 ORDER BY seq LIMIT 3;
-- seq: 7, 8, 9

-- Batch 4: final batch
SELECT * FROM event_stream WHERE seq > 9 ORDER BY seq LIMIT 3;
-- seq: 10
```

### 11. Snapshot Differentials

Compare two snapshots to compute what changed between them.

```sql
DEFINE TABLE inventory SCHEMALESS;
DEFINE TABLE inventory_snapshot SCHEMALESS;

CREATE inventory:item1 SET name = 'Widget A', quantity = 100;
CREATE inventory:item2 SET name = 'Widget B', quantity = 200;
CREATE inventory:item3 SET name = 'Widget C', quantity = 50;

-- Take snapshot #1
CREATE inventory_snapshot:snap1 SET
    taken_at = time::now(),
    items = (SELECT name, quantity FROM inventory ORDER BY name);

-- Changes happen
UPDATE inventory:item1 SET quantity = 80;    -- decreased
UPDATE inventory:item2 SET quantity = 250;   -- increased
-- item3 unchanged

-- Take snapshot #2
CREATE inventory_snapshot:snap2 SET
    taken_at = time::now(),
    items = (SELECT name, quantity FROM inventory ORDER BY name);

-- Compare snapshots at application level
SELECT items FROM inventory_snapshot:snap1;
-- Widget A: 100, Widget B: 200, Widget C: 50
SELECT items FROM inventory_snapshot:snap2;
-- Widget A: 80, Widget B: 250, Widget C: 50
```

### 12. Changelog Compaction

Keep only the last N entries per record to prevent unbounded growth.

```sql
DEFINE TABLE change_history SCHEMALESS;

-- After 8 changes to entity:x...

-- Find entries to keep (last 3)
SELECT * FROM change_history
WHERE record_id = 'entity:x'
ORDER BY seq DESC LIMIT 3;
-- Returns seq: 8, 7, 6

-- Delete older entries (seq < 6)
DELETE FROM change_history WHERE record_id = 'entity:x' AND seq < 6;

-- Verify: only 3 entries remain
SELECT * FROM change_history WHERE record_id = 'entity:x' ORDER BY seq;
-- seq: 6, 7, 8
```

---

## AI Agent Real-Time Patterns

### 13. Agent Inbox Pattern

External systems drop messages into an inbox; the agent polls for unread messages.

```sql
DEFINE TABLE inbox SCHEMALESS;

CREATE inbox:msg1 SET from = 'user_service', subject = 'New signup',
    body = 'User john joined', status = 'unread', created_at = time::now();
CREATE inbox:msg2 SET from = 'billing', subject = 'Payment received',
    body = 'Invoice #42 paid', status = 'unread', created_at = time::now();
CREATE inbox:msg3 SET from = 'monitoring', subject = 'CPU alert',
    body = 'CPU > 90%', status = 'unread', created_at = time::now();

-- Agent polls for unread
SELECT * FROM inbox WHERE status = 'unread' ORDER BY created_at;
-- 3 messages

-- Agent processes and marks as read
UPDATE inbox:msg1 SET status = 'read', processed_at = time::now();
UPDATE inbox:msg2 SET status = 'read', processed_at = time::now();

-- Next poll
SELECT * FROM inbox WHERE status = 'unread';
-- 1 remaining: CPU alert
```

### 14. FIFO Task Queue

Priority-based task queue with status transitions (pending -> running -> done).

```sql
DEFINE TABLE task_queue SCHEMALESS;

CREATE task_queue:t1 SET action = 'embed_document', payload = 'doc_123',
    status = 'pending', priority = 1, created_at = time::now();
CREATE task_queue:t2 SET action = 'summarize', payload = 'doc_456',
    status = 'pending', priority = 2, created_at = time::now();
CREATE task_queue:t3 SET action = 'classify', payload = 'doc_789',
    status = 'pending', priority = 1, created_at = time::now();

-- Worker claims highest-priority pending task
SELECT * FROM task_queue
WHERE status = 'pending'
ORDER BY priority, created_at
LIMIT 1;
-- Returns t1 (priority 1, earliest)

-- Claim it
UPDATE task_queue:t1 SET status = 'running', claimed_by = 'worker_1',
    claimed_at = time::now() RETURN AFTER;

-- Complete the task
UPDATE task_queue:t1 SET status = 'done', completed_at = time::now();
```

### 15. Pub/Sub Channels

Named channels with per-subscriber cursors for multi-agent communication.

```sql
DEFINE TABLE channel_msg SCHEMALESS;
DEFINE TABLE subscriber_cursor SCHEMALESS;

-- Publish messages to 'alerts' channel
CREATE channel_msg SET channel = 'alerts', seq = 1, payload = 'alert_1', published_at = time::now();
CREATE channel_msg SET channel = 'alerts', seq = 2, payload = 'alert_2', published_at = time::now();
CREATE channel_msg SET channel = 'alerts', seq = 3, payload = 'alert_3', published_at = time::now();

-- Agent A subscribes to 'alerts' starting from 0
CREATE subscriber_cursor:agent_a_alerts SET
    agent = 'agent_a', channel = 'alerts', last_seq = 0;

-- Agent A reads new messages
SELECT * FROM channel_msg WHERE channel = 'alerts' AND seq > 0 ORDER BY seq;
-- Returns all 3 alerts

-- Agent A advances cursor
UPDATE subscriber_cursor:agent_a_alerts SET last_seq = 3;

-- Next poll: no new messages
SELECT * FROM channel_msg WHERE channel = 'alerts' AND seq > 3 ORDER BY seq;
-- Empty
```

### 16. Agent State Machine

Track agent state transitions with an event-driven log.

```sql
DEFINE TABLE agent_state SCHEMALESS;
DEFINE TABLE state_transitions SCHEMALESS;

DEFINE EVENT log_transition ON TABLE agent_state WHEN $event = "UPDATE" THEN {
    CREATE state_transitions SET
        agent_id = $value.id,
        from_state = $before.current_state,
        to_state = $value.current_state,
        reason = $value.transition_reason,
        transitioned_at = time::now();
};

CREATE agent_state:agent1 SET current_state = 'idle', transition_reason = 'initialized';

-- State transitions: idle -> thinking -> acting -> reflecting -> idle
UPDATE agent_state:agent1 SET current_state = 'thinking', transition_reason = 'received_query';
UPDATE agent_state:agent1 SET current_state = 'acting', transition_reason = 'plan_ready';
UPDATE agent_state:agent1 SET current_state = 'reflecting', transition_reason = 'action_complete';
UPDATE agent_state:agent1 SET current_state = 'idle', transition_reason = 'reflection_done';

SELECT * FROM state_transitions ORDER BY transitioned_at;
-- idle -> thinking (received_query)
-- thinking -> acting (plan_ready)
-- acting -> reflecting (action_complete)
-- reflecting -> idle (reflection_done)
```

### 17. Collaborative Editing

Multiple agents write to separate document sections, merged into a unified view.

```sql
DEFINE TABLE collab_doc SCHEMALESS;
DEFINE TABLE doc_section SCHEMALESS;

CREATE collab_doc:report SET title = 'Annual Review', status = 'drafting';

-- Agent A writes the introduction
CREATE doc_section:intro SET
    doc_id = collab_doc:report, section = 'introduction',
    content = 'This report covers the annual performance review.',
    author = 'agent_a', version = 1, updated_at = time::now();

-- Agent B writes the analysis
CREATE doc_section:analysis SET
    doc_id = collab_doc:report, section = 'analysis',
    content = 'Performance metrics show 15% improvement.',
    author = 'agent_b', version = 1, updated_at = time::now();

-- Agent A revises their section
UPDATE doc_section:intro SET
    content = 'This comprehensive report covers the annual performance review for FY2025.',
    version = 2, updated_at = time::now();

-- Merge: all sections for the document in order
SELECT section, content, author, version
FROM doc_section WHERE doc_id = collab_doc:report ORDER BY section;
-- analysis (agent_b, v1), introduction (agent_a, v2)
```

### 18. Heartbeat Monitoring

Detect stale agents by checking heartbeat timestamps.

```sql
DEFINE TABLE agent_heartbeat SCHEMALESS;

CREATE agent_heartbeat:worker1 SET agent_name = 'worker_1', status = 'active',
    last_heartbeat = time::now();
CREATE agent_heartbeat:worker2 SET agent_name = 'worker_2', status = 'active',
    last_heartbeat = time::now();
CREATE agent_heartbeat:worker3 SET agent_name = 'worker_3', status = 'active',
    last_heartbeat = time::now();

-- worker1 sends fresh heartbeat
UPDATE agent_heartbeat:worker1 SET last_heartbeat = time::now();

-- worker3 goes stale (simulate old heartbeat)
UPDATE agent_heartbeat:worker3 SET last_heartbeat = d'2024-01-01T00:00:00Z';

-- Supervisor: find stale agents
SELECT agent_name, last_heartbeat FROM agent_heartbeat
WHERE last_heartbeat < d'2025-01-01T00:00:00Z'
ORDER BY agent_name;
-- Returns: worker_3

-- Mark stale agents
UPDATE agent_heartbeat SET status = 'stale'
WHERE last_heartbeat < d'2025-01-01T00:00:00Z';
```

### 19. Event Sourcing

Store all mutations as append-only events; reconstruct state by replaying.

```sql
DEFINE TABLE account_events SCHEMALESS;

-- Append events
CREATE account_events SET account_id = 'acc_001', seq = 1,
    event_type = 'account_opened', amount = 0, description = 'Initial deposit pending',
    created_at = time::now();
CREATE account_events SET account_id = 'acc_001', seq = 2,
    event_type = 'deposit', amount = 500, description = 'Welcome bonus',
    created_at = time::now();
CREATE account_events SET account_id = 'acc_001', seq = 3,
    event_type = 'deposit', amount = 1000, description = 'Salary',
    created_at = time::now();
CREATE account_events SET account_id = 'acc_001', seq = 4,
    event_type = 'withdrawal', amount = 200, description = 'ATM withdrawal',
    created_at = time::now();
CREATE account_events SET account_id = 'acc_001', seq = 5,
    event_type = 'deposit', amount = 50, description = 'Cashback reward',
    created_at = time::now();
CREATE account_events SET account_id = 'acc_001', seq = 6,
    event_type = 'withdrawal', amount = 100, description = 'Transfer out',
    created_at = time::now();

-- Replay all events to compute current balance
SELECT * FROM account_events WHERE account_id = 'acc_001' ORDER BY seq;
-- Balance: 500 + 1000 - 200 + 50 - 100 = 1250

-- Replay up to seq 3 for historical balance
SELECT * FROM account_events WHERE account_id = 'acc_001' AND seq <= 3 ORDER BY seq;
-- Balance at seq 3: 500 + 1000 = 1500
```

---

## Reactive Data Patterns

### 20. Materialized View

An event trigger maintains a pre-computed aggregate table.

```sql
DEFINE TABLE sale SCHEMALESS;
DEFINE TABLE sales_summary SCHEMALESS;

DEFINE EVENT update_summary ON TABLE sale WHEN $event = "CREATE" THEN {
    UPSERT sales_summary:global SET
        total_revenue = (SELECT math::sum(amount) FROM sale GROUP ALL)[0].amount ?? 0 + $value.amount,
        total_count = (SELECT count() FROM sale GROUP ALL)[0].count,
        last_sale_at = time::now();
};

CREATE sale:s1 SET product = 'License A', amount = 500;
CREATE sale:s2 SET product = 'License B', amount = 300;
CREATE sale:s3 SET product = 'License A', amount = 500;

-- Instant access to aggregated data
SELECT * FROM sales_summary:global;
-- total_count: 3

-- Verify with direct aggregation
SELECT math::sum(amount) AS total FROM sale GROUP ALL;
-- total: 1300
```

### 21. Notification System

Events create user-facing notifications for order lifecycle changes.

```sql
DEFINE TABLE order_item SCHEMALESS;
DEFINE TABLE notification SCHEMALESS;

DEFINE EVENT notify_on_order ON TABLE order_item WHEN $event = "CREATE" THEN {
    CREATE notification SET
        recipient = $value.customer_id,
        title = 'Order Confirmed',
        message = 'Your order for ' + $value.product + ' has been confirmed.',
        read = false, created_at = time::now();
};

DEFINE EVENT notify_on_status ON TABLE order_item
    WHEN $event = "UPDATE" AND $value.status = "shipped"
THEN {
    CREATE notification SET
        recipient = $value.customer_id,
        title = 'Order Shipped',
        message = 'Your order for ' + $value.product + ' has been shipped!',
        read = false, created_at = time::now();
};

CREATE order_item:o1 SET product = 'Keyboard', customer_id = 'cust_1', status = 'confirmed';
CREATE order_item:o2 SET product = 'Monitor', customer_id = 'cust_2', status = 'confirmed';
-- 2 "Order Confirmed" notifications

UPDATE order_item:o1 SET status = 'shipped';
-- 1 additional "Order Shipped" notification

SELECT * FROM notification ORDER BY created_at;
-- 3 total notifications
```

### 22. Cache Invalidation

Invalidate cached computations when source data changes.

```sql
DEFINE TABLE source_doc SCHEMALESS;
DEFINE TABLE embedding_cache SCHEMALESS;

DEFINE EVENT invalidate_cache ON TABLE source_doc WHEN $event = "UPDATE" THEN {
    UPDATE embedding_cache SET
        valid = false,
        invalidated_at = time::now()
    WHERE doc_id = $value.id;
};

CREATE source_doc:d1 SET title = 'Product Overview', content = 'Original content';
CREATE source_doc:d2 SET title = 'FAQ', content = 'Frequently asked questions';
CREATE embedding_cache:e1 SET doc_id = source_doc:d1, vector = [0.1, 0.2, 0.3],
    valid = true, computed_at = time::now();
CREATE embedding_cache:e2 SET doc_id = source_doc:d2, vector = [0.4, 0.5, 0.6],
    valid = true, computed_at = time::now();

-- Update source doc d1 -> triggers cache invalidation
UPDATE source_doc:d1 SET content = 'Updated product overview with new features';

-- d1 cache is now invalid, d2 still valid
SELECT * FROM embedding_cache WHERE valid = false;
-- doc_id: source_doc:d1
SELECT * FROM embedding_cache WHERE valid = true;
-- doc_id: source_doc:d2
```

### 23. Data Pipeline

Chain of events flowing through stages: raw -> parsed -> enriched -> indexed.

```sql
DEFINE TABLE raw_input SCHEMALESS;
DEFINE TABLE parsed SCHEMALESS;
DEFINE TABLE enriched SCHEMALESS;
DEFINE TABLE indexed SCHEMALESS;

DEFINE EVENT parse_raw ON TABLE raw_input WHEN $event = "CREATE" THEN {
    CREATE parsed SET
        source_id = $value.id,
        text = $value.raw_text,
        char_count = string::len($value.raw_text),
        parsed_at = time::now();
};

DEFINE EVENT enrich_parsed ON TABLE parsed WHEN $event = "CREATE" THEN {
    CREATE enriched SET
        source_id = $value.source_id,
        text = $value.text,
        char_count = $value.char_count,
        category = IF $value.char_count > 20 THEN 'long' ELSE 'short' END,
        enriched_at = time::now();
};

DEFINE EVENT index_enriched ON TABLE enriched WHEN $event = "CREATE" THEN {
    CREATE indexed SET
        source_id = $value.source_id,
        text = $value.text,
        category = $value.category,
        indexed_at = time::now();
};

-- Feed raw data: automatically flows through all stages
CREATE raw_input:r1 SET raw_text = 'Short note';
CREATE raw_input:r2 SET raw_text = 'This is a longer document with many words inside it';
CREATE raw_input:r3 SET raw_text = 'Hello';

-- Verify end-to-end flow
SELECT * FROM indexed ORDER BY text;
-- 3 items with category 'short' or 'long' based on char_count
```

### 24. Threshold Alerts

Fire alerts when a metric crosses a defined threshold, with severity classification.

```sql
DEFINE TABLE metric SCHEMALESS;
DEFINE TABLE threshold_alert SCHEMALESS;

DEFINE EVENT check_threshold ON TABLE metric
    WHEN $event = "CREATE" AND $value.value > 90
THEN {
    CREATE threshold_alert SET
        metric_name = $value.name,
        metric_value = $value.value,
        threshold = 90,
        severity = IF $value.value > 95 THEN 'critical' ELSE 'warning' END,
        alerted_at = time::now();
};

CREATE metric SET name = 'cpu_usage', value = 45, host = 'server1';   -- no alert
CREATE metric SET name = 'cpu_usage', value = 92, host = 'server2';   -- warning
CREATE metric SET name = 'memory_usage', value = 88, host = 'server1'; -- no alert
CREATE metric SET name = 'cpu_usage', value = 97, host = 'server3';   -- critical
CREATE metric SET name = 'disk_usage', value = 91, host = 'server1';  -- warning

SELECT * FROM threshold_alert ORDER BY metric_value;
-- 3 alerts: disk_usage (91, warning), cpu_usage (92, warning), cpu_usage (97, critical)
```

### 25. Knowledge Graph Sync

Automatically generate RDF triples when documents are created or updated.

```sql
DEFINE TABLE kg_document SCHEMALESS;
DEFINE TABLE kg_triple SCHEMALESS;

DEFINE EVENT sync_triples_create ON TABLE kg_document WHEN $event = "CREATE" THEN {
    CREATE kg_triple SET
        subject = 'http://example.org/doc/' + string::replace($value.slug, ' ', '_'),
        predicate = 'http://purl.org/dc/terms/title',
        object = $value.title,
        source_doc = $value.id,
        synced_at = time::now();
    CREATE kg_triple SET
        subject = 'http://example.org/doc/' + string::replace($value.slug, ' ', '_'),
        predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object = 'http://xmlns.com/foaf/0.1/Document',
        source_doc = $value.id,
        synced_at = time::now();
    CREATE kg_triple SET
        subject = 'http://example.org/doc/' + string::replace($value.slug, ' ', '_'),
        predicate = 'http://purl.org/dc/terms/creator',
        object = $value.author,
        source_doc = $value.id,
        synced_at = time::now();
};

DEFINE EVENT sync_triples_update ON TABLE kg_document WHEN $event = "UPDATE" THEN {
    DELETE FROM kg_triple WHERE source_doc = $value.id
        AND predicate = 'http://purl.org/dc/terms/title';
    CREATE kg_triple SET
        subject = 'http://example.org/doc/' + string::replace($value.slug, ' ', '_'),
        predicate = 'http://purl.org/dc/terms/title',
        object = $value.title,
        source_doc = $value.id,
        synced_at = time::now();
};

-- Create documents
CREATE kg_document:d1 SET slug = 'ai-safety', title = 'AI Safety Principles', author = 'Alice';
CREATE kg_document:d2 SET slug = 'data-governance', title = 'Data Governance Guide', author = 'Bob';
-- Each generates 3 triples: dc:title, rdf:type, dc:creator

-- Update a document title -> refreshes the title triple
UPDATE kg_document:d1 SET title = 'AI Safety Principles v2';

SELECT * FROM kg_triple WHERE predicate = 'http://purl.org/dc/terms/title' ORDER BY subject;
-- 2 title triples: ai-safety = 'AI Safety Principles v2', data-governance = 'Data Governance Guide'
```
