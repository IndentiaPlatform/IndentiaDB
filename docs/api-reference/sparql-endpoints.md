# SPARQL, GraphQL, WebSocket, and REST Endpoints

All endpoints described on this page are available on port **7001**. Authentication is required on all endpoints in production deployments; see the [API Overview](index.md#authentication) for details.

!!! note "Trial image"
    The trial image (`ghcr.io/indentiaplatform/indentiadb-trial`) runs without authentication by default — all endpoints are accessible without credentials. The `-u root:changeme` flags shown in examples are included for consistency with production usage and are ignored in trial mode.

---

## SPARQL Query — GET / POST `/sparql`

Execute SPARQL 1.2 SELECT, ASK, CONSTRUCT, and DESCRIBE queries against the RDF triple store.

### GET Request

URL-encode the `query` parameter and send it as a query string:

```bash
curl -u root:changeme \
  "http://localhost:7001/sparql?query=SELECT%20%3Fs%20%3Fp%20%3Fo%20WHERE%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20LIMIT%2010"
```

Optional dataset parameters:

| Parameter | Description |
|-----------|-------------|
| `default-graph-uri` | Restrict the query to a specific default graph |
| `named-graph-uri` | Include an additional named graph in the dataset |

### POST Request — `application/sparql-query`

Send the raw SPARQL query string as the request body:

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10"
```

### POST Request — `application/x-www-form-urlencoded`

Send the query as a form-encoded `query` field:

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "query=SELECT ?s WHERE { ?s a <http://example.org/Person> }"
```

### Response Formats

The `Accept` header controls the serialization format:

| Accept Header | Format | Use Case |
|---------------|--------|----------|
| `application/sparql-results+json` | JSON | SELECT, ASK, CONSTRUCT, DESCRIBE |
| `application/sparql-results+xml` | XML | SELECT, ASK |
| `text/csv` | CSV | SELECT (tabular export) |
| `text/tab-separated-values` | TSV | SELECT (tabular export) |
| `application/x-ndjson` | NDJSON | SELECT (streaming) |
| `text/turtle` | Turtle | CONSTRUCT, DESCRIBE |
| `application/n-triples` | N-Triples | CONSTRUCT, DESCRIBE |
| `application/n-triples;profile="http://www.w3.org/ns/rdf-canon#c14n"` | N-Triples Canonical (C14N) | CONSTRUCT, DESCRIBE — deterministic output |

!!! tip "Canonical N-Triples (RDF 1.2 C14N)"
    The canonical N-Triples variant implements the escaping rules from the
    RDF 1.2 Candidate Recommendation (7 April 2026) and the related RDF
    Dataset Canonicalization spec. It differs from plain N-Triples in two
    ways:

    1. **Canonical character escaping** — `\b`, `\t`, `\n`, `\f`, `\r`,
       `\"`, `\\` as named escapes; all other C0/C1 controls, DEL, and
       XML 1.1 invalid characters as `\uXXXX`.
    2. **Language tag canonicalization** — language tags are lowercased
       per BCP47 (`"chat"@EN-GB` → `"chat"@en-gb`), including the
       direction component of directional language-tagged strings
       (`"مرحبا"@AR--RTL` → `"مرحبا"@ar--rtl`).

    Select it via either:

    - **Accept header with profile parameter:**
      ```bash
      curl -u root:changeme \
        -H 'Accept: application/n-triples;profile="http://www.w3.org/ns/rdf-canon#c14n"' \
        "http://localhost:7001/sparql?query=..."
      ```
    - **Query parameter:**
      ```bash
      curl -u root:changeme \
        "http://localhost:7001/sparql?format=ntriples-c14n&query=..."
      ```

    Use canonical form when you need byte-for-byte reproducible output for
    hashing, signing, or diff-based change detection.

!!! note "CONSTRUCT and DESCRIBE output format"
    CONSTRUCT and DESCRIBE queries return a JSON array of N-Triples strings when `Accept: application/sparql-results+json` is used:
    ```json
    [
      "<http://example.org/alice> <http://xmlns.com/foaf/0.1/name> \"Alice\"",
      "<http://example.org/bob> <http://xmlns.com/foaf/0.1/name> \"Bob\""
    ]
    ```
    For native RDF serialization, use `Accept: text/turtle` or `Accept: application/n-triples` — the response will be one triple per line in N-Triples format (which is a valid Turtle subset).

### SELECT Example

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d '
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?person ?name
WHERE {
  ?person a foaf:Person ;
          foaf:name ?name .
}
ORDER BY ?name
'
```

Response:

```json
{
  "head": { "vars": ["person", "name"] },
  "results": {
    "bindings": [
      {
        "person": { "type": "uri", "value": "http://example.org/alice" },
        "name": { "type": "literal", "value": "Alice" }
      }
    ]
  }
}
```

### ASK Example

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d '
PREFIX ex: <http://example.org/>
ASK { ex:alice a ex:Person }
'
```

Response:

```json
{ "head": {}, "boolean": true }
```

### CONSTRUCT Example

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: text/turtle" \
  -d '
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex: <http://example.org/>
CONSTRUCT { ?s foaf:name ?name }
WHERE { ?s foaf:name ?name }
'
```

### DESCRIBE Example

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: text/turtle" \
  -d 'DESCRIBE <http://example.org/alice>'
```

### Named Dataset Parameters

Restrict a query to a specific named graph:

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d 'SELECT * WHERE { ?s ?p ?o }' \
  "http://localhost:7001/sparql?default-graph-uri=http://example.org/employees"
```

---

## SPARQL Update — POST `/update`

Execute SPARQL 1.1 Update operations to modify the triple store.

### Request

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/update \
  -H "Content-Type: application/sparql-update" \
  -d '
PREFIX ex: <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
INSERT DATA {
  ex:alice a ex:Person ;
           foaf:name "Alice" ;
           foaf:age 30 .
}
'
```

A successful update returns HTTP 200 with a JSON confirmation body:

```json
{
  "success": true,
  "message": "Update applied successfully",
  "snapshot_index": 1,
  "affected_triples": 7
}
```

### INSERT DATA

```sparql
PREFIX ex: <http://example.org/>
INSERT DATA {
  ex:bob a ex:Person ;
         <http://xmlns.com/foaf/0.1/name> "Bob" .
}
```

### DELETE DATA

```sparql
PREFIX ex: <http://example.org/>
DELETE DATA {
  ex:alice <http://xmlns.com/foaf/0.1/age> 30 .
}
```

### DELETE / INSERT WHERE

Conditional update based on a pattern match:

```sparql
PREFIX ex: <http://example.org/>
DELETE { ex:alice ex:status "inactive" }
INSERT { ex:alice ex:status "active" }
WHERE  { ex:alice ex:status "inactive" }
```

### Graph Management

Create a named graph:

```sparql
CREATE GRAPH <http://example.org/employees>
```

Drop a named graph and all its triples:

```sparql
DROP GRAPH <http://example.org/employees>
```

Copy all triples from one graph to another:

```sparql
COPY <http://example.org/staging> TO <http://example.org/production>
```

Move triples (copy then drop source):

```sparql
MOVE <http://example.org/staging> TO <http://example.org/archive>
```

---

## Graph Store Protocol — GET / PUT / POST / DELETE `/data`

The SPARQL 1.1 Graph Store HTTP Protocol allows reading and writing entire graphs via HTTP.

### GET — Read a Graph

Retrieve a named graph in the desired RDF serialization:

```bash
# N-Triples (default)
curl -u root:changeme \
  -H "Accept: application/n-triples" \
  "http://localhost:7001/data?graph=http://example.org/employees"

# Turtle
curl -u root:changeme \
  -H "Accept: text/turtle" \
  "http://localhost:7001/data?graph=http://example.org/employees"

# TriG (includes GRAPH <iri> { ... } wrapper for named graphs)
curl -u root:changeme \
  -H "Accept: application/trig" \
  "http://localhost:7001/data?graph=http://example.org/employees"
```

Retrieve the default graph:

```bash
curl -u root:changeme \
  -H "Accept: application/n-triples" \
  http://localhost:7001/data
```

Supported `Accept` headers for GET:

| Accept Header | Response `Content-Type` |
|---------------|------------------------|
| `application/n-triples` _(default)_ | `application/n-triples; version=1.2` |
| `application/n-triples-star` | `application/n-triples-star; version=1.2` |
| `text/turtle` | `text/turtle; version=1.2` |
| `application/trig` | `application/trig; version=1.2` |
| `application/rdf+xml` | `application/rdf+xml; version=1.2` |
| `application/ld+json` | `application/ld+json; version=1.2` |

The `version=1.2` parameter signals RDF 1.2 conformance — clients that understand quoted triples and `rdf:JSON` can use this to opt in to RDF-star-aware parsing.

### PUT — Replace a Graph

Replace the entire content of a named graph (or the default graph) with the uploaded RDF:

```bash
curl -u root:changeme \
  -X PUT \
  -H "Content-Type: text/turtle" \
  "http://localhost:7001/data?graph=http://example.org/employees" \
  --data-binary @employees.ttl
```

Replace the default graph:

```bash
curl -u root:changeme \
  -X PUT \
  -H "Content-Type: text/turtle" \
  http://localhost:7001/data \
  --data-binary @data.ttl
```

### POST — Merge Into a Graph

Add triples to an existing named graph without removing existing triples:

```bash
curl -u root:changeme \
  -X POST \
  -H "Content-Type: text/turtle" \
  "http://localhost:7001/data?graph=http://example.org/employees" \
  -d '
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:carol a ex:Person ; foaf:name "Carol" .
'
```

### DELETE — Remove a Graph

Delete all triples from a named graph:

```bash
curl -u root:changeme \
  -X DELETE \
  "http://localhost:7001/data?graph=http://example.org/employees"
```

Delete the default graph:

```bash
curl -u root:changeme \
  -X DELETE \
  http://localhost:7001/data
```

### Supported Content Types

| Content-Type | Format |
|--------------|--------|
| `text/turtle` | Turtle |
| `application/n-triples` | N-Triples |
| `application/n-quads` | N-Quads (includes graph name) |
| `application/trig` | TriG (Turtle with named graphs) |
| `application/rdf+xml` | RDF/XML |
| `application/ld+json` | JSON-LD |

---

## GraphQL — POST `/graphql`

Execute GraphQL queries and mutations against the IndentiaDB schema.

### Query Example

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ article { id title author } }"
  }'
```

Response:

```json
{
  "data": {
    "article": [
      { "id": "article:1", "title": "Introduction to Graph Databases", "author": "Alice" }
    ]
  }
}
```

### Mutation Example

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateArticle($title: String!, $author: String!) { createArticle(data: {title: $title, author: $author}) { id title } }",
    "variables": { "title": "GraphQL in IndentiaDB", "author": "Bob" }
  }'
```

### Variable Substitution

Variables are passed in the `variables` field of the request body:

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetArticle($id: ID!) { article(id: $id) { title content } }",
    "variables": { "id": "article:1" }
  }'
```

### Schema Introspection

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/graphql \
  -H "Content-Type: application/json" \
  -d '{ "query": "{ __schema { types { name } } }" }'
```

### Error Format

GraphQL errors are returned alongside partial data using the standard GraphQL error structure:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Field 'nonexistent' does not exist on type 'article'",
      "locations": [{ "line": 1, "column": 3 }],
      "path": ["article", "nonexistent"]
    }
  ]
}
```

---

## SHACL Validation — POST `/shacl/validate`

Validate RDF data against SHACL (Shapes Constraint Language) shapes.

### Request

Send a JSON body with a `shapes` field containing the SHACL shapes as a Turtle string. The validation is run against the current contents of the triple store.

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/shacl/validate \
  -H "Content-Type: application/json" \
  -d '{
    "shapes": "@prefix sh: <http://www.w3.org/ns/shacl#> .\n@prefix ex: <http://example.org/> .\n@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\nex:PersonShape\n    a sh:NodeShape ;\n    sh:targetClass ex:Person ;\n    sh:property [ sh:path foaf:name ; sh:minCount 1 ; sh:datatype xsd:string ] ."
  }'
```

### Response — Conforms

When the data satisfies all shapes:

```json
{
  "conforms": true,
  "results": [],
  "stats": {
    "focus_nodes_validated": 2,
    "constraints_checked": 4,
    "violations": 0,
    "warnings": 0,
    "infos": 0,
    "duration_ms": 3
  }
}
```

### Response — Violation

When constraints are violated, each violation is reported with its focus node, path, severity, and message:

```json
{
  "conforms": false,
  "results": [
    {
      "focusNode": "http://example.org/alice",
      "resultPath": "http://xmlns.com/foaf/0.1/name",
      "severity": "http://www.w3.org/ns/shacl#Violation",
      "message": "Every Person must have exactly one foaf:name of type xsd:string",
      "sourceShape": "http://example.org/PersonShape",
      "sourceConstraintComponent": "http://www.w3.org/ns/shacl#MinCountConstraintComponent"
    }
  ]
}
```

### Severity Levels

| Severity IRI | Meaning |
|--------------|---------|
| `sh:Violation` | Hard constraint failure |
| `sh:Warning` | Advisory constraint |
| `sh:Info` | Informational constraint |

---

## WebSocket — `/ws`

The WebSocket endpoint provides real-time streaming for LIVE SELECT queries. Connect over `ws://` (or `wss://` for TLS) and send JSON messages.

### Connection

```
ws://localhost:7001/ws
```

Authentication credentials must be included as query parameters or in the initial handshake message:

```
ws://root:changeme@localhost:7001/ws
```

### LIVE SELECT Subscription

Send a JSON message to subscribe to live changes on a table or query:

```json
{
  "id": "sub-001",
  "method": "query",
  "params": ["LIVE SELECT * FROM article WHERE status = 'published'"]
}
```

The server responds with a subscription UUID:

```json
{
  "id": "sub-001",
  "result": "550e8400-e29b-41d4-a716-446655440000"
}
```

### CREATE Notification

When a new record is created that matches the live query:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "CREATE",
  "result": {
    "id": "article:5",
    "title": "New Article",
    "status": "published"
  }
}
```

### UPDATE Notification

When a matching record is updated:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "UPDATE",
  "result": {
    "id": "article:5",
    "title": "Updated Title",
    "status": "published"
  }
}
```

### DELETE Notification

When a matching record is deleted:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "DELETE",
  "result": {
    "id": "article:5"
  }
}
```

### KILL — Unsubscribe

Send a KILL message with the subscription UUID to stop receiving notifications:

```json
{
  "id": "kill-001",
  "method": "kill",
  "params": ["550e8400-e29b-41d4-a716-446655440000"]
}
```

### JavaScript Example

```javascript
const ws = new WebSocket('ws://localhost:7001/ws');

ws.onopen = () => {
  // Subscribe to live changes
  ws.send(JSON.stringify({
    id: 'sub-1',
    method: 'query',
    params: ['LIVE SELECT * FROM sensor_reading WHERE value > 90']
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.id === 'sub-1') {
    // Store the subscription UUID for later use
    const subscriptionId = msg.result;
    console.log('Subscribed:', subscriptionId);
    return;
  }

  // Handle live notifications
  console.log('Live event:', msg.action, msg.result);

  // Unsubscribe after receiving 10 events
  if (eventCount++ >= 10) {
    ws.send(JSON.stringify({
      id: 'kill-1',
      method: 'kill',
      params: [msg.id]
    }));
  }
};

ws.onerror = (err) => console.error('WebSocket error:', err);
ws.onclose = () => console.log('Disconnected');
```

### Python Example

```python
import asyncio
import json
import websockets

async def live_select():
    uri = "ws://localhost:7001/ws"

    async with websockets.connect(uri) as ws:
        # Subscribe to live changes
        await ws.send(json.dumps({
            "id": "sub-1",
            "method": "query",
            "params": ["LIVE SELECT * FROM orders WHERE status = 'pending'"]
        }))

        # Get subscription UUID
        response = json.loads(await ws.recv())
        subscription_id = response["result"]
        print(f"Subscribed with ID: {subscription_id}")

        # Process live events
        async for message in ws:
            event = json.loads(message)
            print(f"Action: {event['action']}, Data: {event['result']}")

            # Kill subscription after first event
            await ws.send(json.dumps({
                "id": "kill-1",
                "method": "kill",
                "params": [subscription_id]
            }))
            break

asyncio.run(live_select())
```

---

## Health — GET `/health`

Returns the current health status of the server and its cluster membership.

```bash
curl -u root:changeme http://localhost:7001/health
```

### Response Format

```json
{
  "status": "healthy",
  "role": "standalone",
  "node_id": 1,
  "snapshot_index": 0,
  "current_term": 0,
  "cluster_members": [
    { "node_id": 1, "address": "0.0.0.0:7001", "role": "standalone", "reachable": true }
  ],
  "replication_lag": null,
  "index_loaded": true,
  "uptime_seconds": 86400,
  "embedded_surreal": {
    "url": "surrealkv:///data/surrealdb",
    "namespace": "indentiagraph",
    "database": "alerting",
    "ready": true,
    "projection_bootstrapped": true,
    "last_projected_log_index": 0,
    "active_listener_count": 0,
    "listener_role": "Standalone"
  }
}
```

In a 3-node HA cluster the `cluster_members` array lists all peer nodes, `role` reflects `"leader"` or `"follower"`, and `replication_lag` shows the follower's lag behind the leader in log entries.

### Status Values

| Value | Meaning |
|-------|---------|
| `healthy` | Node is healthy and serving requests |
| `starting` | Node is initializing or joining the cluster |
| `degraded` | Node is operational but the cluster has reduced capacity |
| `error` | Node has encountered a fatal error |

### Role Values

| Value | Meaning |
|-------|---------|
| `leader` | This node is the current Raft leader |
| `follower` | This node is a Raft follower |
| `candidate` | This node is running a leader election |
| `standalone` | Single-node mode (no cluster) |

---

## Metrics — GET `/metrics`

Returns Prometheus-compatible metrics in the text exposition format.

```bash
curl -u root:changeme http://localhost:7001/metrics
```

### Sample Response

```
# HELP indentiagraph_indentiagraph_queries_total Total number of queries executed
# TYPE indentiagraph_indentiagraph_queries_total counter
indentiagraph_indentiagraph_queries_total 15234

# HELP indentiagraph_indentiagraph_query_duration_seconds Query execution time
# TYPE indentiagraph_indentiagraph_query_duration_seconds histogram
indentiagraph_indentiagraph_query_duration_seconds_bucket{le="0.005"} 12000
indentiagraph_indentiagraph_query_duration_seconds_bucket{le="0.01"} 14500
indentiagraph_indentiagraph_query_duration_seconds_bucket{le="0.025"} 15100
indentiagraph_indentiagraph_query_duration_seconds_bucket{le="0.05"} 15200
indentiagraph_indentiagraph_query_duration_seconds_bucket{le="+Inf"} 15234
indentiagraph_indentiagraph_query_duration_seconds_sum 45.2
indentiagraph_indentiagraph_query_duration_seconds_count 15234

# HELP indentiagraph_indentiagraph_cluster_size Number of cluster members
# TYPE indentiagraph_indentiagraph_cluster_size gauge
indentiagraph_indentiagraph_cluster_size 1

# HELP indentiagraph_indentiagraph_is_leader Whether this node is the Raft leader
# TYPE indentiagraph_indentiagraph_is_leader gauge
indentiagraph_indentiagraph_is_leader 1
```

### Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `indentiagraph_indentiagraph_queries_total` | Counter | Total queries executed |
| `indentiagraph_indentiagraph_query_duration_seconds` | Histogram | Query execution latency distribution |
| `indentiagraph_indentiagraph_cluster_size` | Gauge | Number of cluster members |
| `indentiagraph_indentiagraph_is_leader` | Gauge | 1 if this node is the Raft leader, 0 otherwise |
| `indentiagraph_indentiagraph_leader_elections_total` | Counter | Total Raft leader elections |

---

## Geospatial — POST `/geospatial/evaluate`

Evaluate GeoSPARQL functions for geographic data.

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/geospatial/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "function": "geof:distance",
    "args": [
      "POINT(4.9041 52.3676)",
      "POINT(13.4050 52.5200)",
      "http://www.opengis.net/def/uom/OGC/1.0/kilometre"
    ]
  }'
```

---

## Alerts — GET / POST / DELETE `/alerts`

Manage threshold-based alerts on query results.

### List Alerts

```bash
curl -u root:changeme http://localhost:7001/alerts
```

### Create Alert

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "high-latency",
    "query": "SELECT count() FROM requests WHERE latency_ms > 1000 GROUP ALL",
    "condition": "result > 0",
    "interval_seconds": 60,
    "webhook": "https://hooks.example.com/alert"
  }'
```

### Delete Alert

```bash
curl -u root:changeme \
  -X DELETE http://localhost:7001/alerts/high-latency
```

---

## Holonic Four-Graph — `/holonic/*`

Native implementation of Cagle's holonic model on named graphs.
The router is mounted only when the server is started with
`[holonic] enabled=true` (see the [Holonic feature page](../features/holonic.md)).
`/holonic/health` is **always mounted** and is in the authentication
bypass list so orchestrators and probes can poll it without
credentials.

### Readiness — `GET /holonic/health`

```bash
curl -s http://localhost:7001/holonic/health
```

Response shapes:

| Status | Body | Meaning |
|--------|------|---------|
| `200` | `{"available": true, "default_tenant": "acme"}` | Service attached, ready to accept CRUD |
| `503` | `Holonic service not configured (enable via AppState::enable_holonic)` | Feature not enabled on this server |

### Holon CRUD — `POST/GET /holonic/holons`

```bash
# Declare a holon in the tenant registry graph
curl -u root:changeme \
  -X POST "http://localhost:7001/holonic/holons?tenant=acme" \
  -H 'Content-Type: application/json' \
  -d '{"iri":"https://id.indentia.ai/identity/person/acme/leon",
       "label":"Leon de Vries",
       "member_of":"https://id.indentia.ai/identity/org/acme/indentia"}'

# List every holon in the tenant
curl -u root:changeme \
  "http://localhost:7001/holonic/holons?tenant=acme"

# Get one holon's detail including every layer
curl -u root:changeme \
  "http://localhost:7001/holonic/holons/<url-encoded-iri>?tenant=acme"
```

### Layer writes

Four layer endpoints share the same body shape:
`{"turtle": "<valid Turtle>", "graph_slug": "optional-slug"}`.
The server parses `@prefix` directives via `oxttl` and emits
canonical N-Triples into the target named graph.

| Layer | Endpoint | Typical use |
|-------|----------|-------------|
| Interior | `POST /holonic/holons/{iri}/interior` | A-Box facts from a specific source (CRM, LDAP, WhatsApp) |
| Boundary | `POST /holonic/holons/{iri}/boundary` | SHACL shape acting as membrane |
| Context  | `POST /holonic/holons/{iri}/context`  | Membership + PROV-O events |
| Projection | `POST /holonic/holons/{iri}/projection` | Derived views |

### Portals — `POST/GET /holonic/portals`

Portals encode cross-holon transforms as RDF rather than code.
A `cga:TransformPortal` triple in the source holon's boundary
graph declares target + a SPARQL CONSTRUCT that translates the
source into the target's schema.

```bash
# Register a portal
curl -u root:changeme \
  -X POST "http://localhost:7001/holonic/portals?tenant=acme" \
  -H 'Content-Type: application/json' \
  -d '{
    "iri": "urn:portal:leon-to-crm",
    "source": "https://id.indentia.ai/identity/person/acme/leon",
    "target": "https://id.indentia.ai/identity/person/crm/leon",
    "construct_query": "CONSTRUCT { ?s <http://crm/worksAt> ?o } WHERE { ?s <http://indentia.ai/core#worksAt> ?o }"
  }'

# List outbound portals from a holon
curl -u root:changeme \
  "http://localhost:7001/holonic/portals?tenant=acme&source=<url-encoded-source-iri>"
```

### Authentication + Authorization

When an `AuthenticationService` is attached to the server:

| Method | Required | Status when missing |
|--------|----------|---------------------|
| Anonymous on any `/holonic/*` | Authentication | `401 Unauthorized` |
| `GET`, `HEAD` | `Permission::Read` | `403 Forbidden` |
| `POST`, `PUT`, `PATCH`, `DELETE` | `Permission::Write` | `403 Forbidden` |
| Write without `AuthorizationService` (but authn enabled) | Configured authz | `403 Forbidden` |

Cross-tenant `?tenant=` values that do not match the actor's
`org_scope.org_path` slug are logged under the `holonic.authz`
tracing target but currently not blocked — blocking requires a
canonical tenant claim on `Actor` which is a follow-up ADR.

### Caveats

- **Cluster mode is refused at startup** — holonic writes
  bypass the Raft-routed `UpdateExecutor` path, which would
  diverge from followers. Configure standalone mode for holonic
  ingest.
- **SPARQL `INSERT DATA` cannot carry `@prefix`** — the store's
  custom `parse_into` decodes Turtle to N-Triples first.
- The `/holonic/health` probe always responds, even when
  holonic is disabled (503). Rely on status codes, not the
  presence of the route, to distinguish "not mounted" from
  "not configured".

See [Holonic Four-Graph Layer](../features/holonic.md) for the
conceptual model and deployment pattern.
