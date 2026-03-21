# SPARQL, GraphQL, WebSocket, and REST Endpoints

All endpoints described on this page are available on port **7001**. Authentication is required on all endpoints; see the [API Overview](index.md#authentication) for details.

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
| `application/sparql-results+json` | JSON | SELECT and ASK |
| `application/sparql-results+xml` | XML | SELECT and ASK |
| `text/csv` | CSV | SELECT (tabular export) |
| `text/tab-separated-values` | TSV | SELECT (tabular export) |
| `text/turtle` | Turtle | CONSTRUCT and DESCRIBE |
| `application/n-triples` | N-Triples | CONSTRUCT and DESCRIBE |
| `application/ld+json` | JSON-LD | CONSTRUCT and DESCRIBE |
| `application/rdf+xml` | RDF/XML | CONSTRUCT and DESCRIBE |

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

A successful update returns HTTP 204 No Content.

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

Retrieve the default graph:

```bash
curl -u root:changeme \
  -H "Accept: text/turtle" \
  http://localhost:7001/data
```

Retrieve a named graph:

```bash
curl -u root:changeme \
  -H "Accept: text/turtle" \
  "http://localhost:7001/data?graph=http://example.org/employees"
```

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

Send the SHACL shapes graph as Turtle in the request body. The validation is run against the current contents of the triple store.

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/shacl/validate \
  -H "Content-Type: text/turtle" \
  -d '
@prefix sh:   <http://www.w3.org/ns/shacl#> .
@prefix ex:   <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

ex:PersonShape
    a sh:NodeShape ;
    sh:targetClass ex:Person ;
    sh:property [
        sh:path foaf:name ;
        sh:minCount 1 ;
        sh:datatype xsd:string ;
        sh:message "Every Person must have exactly one foaf:name of type xsd:string" ;
    ] ;
    sh:property [
        sh:path foaf:age ;
        sh:datatype xsd:integer ;
        sh:minInclusive 0 ;
        sh:maxInclusive 150 ;
    ] .
'
```

### Response — Conforms

When the data satisfies all shapes:

```json
{
  "conforms": true,
  "results": []
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
  "status": "ok",
  "role": "leader",
  "cluster": {
    "nodes": 3,
    "leader": "indentiadb-0.indentiadb-headless.indentiadb.svc.cluster.local",
    "quorum": true
  },
  "uptime_seconds": 86400,
  "version": "1.2.0"
}
```

### Status Values

| Value | Meaning |
|-------|---------|
| `ok` | Node is healthy and serving requests |
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
# HELP indentiadb_queries_total Total number of queries executed
# TYPE indentiadb_queries_total counter
indentiadb_queries_total{type="sparql_select"} 15234
indentiadb_queries_total{type="sparql_update"} 4821
indentiadb_queries_total{type="graphql"} 9012
indentiadb_queries_total{type="surrealql"} 44001

# HELP indentiadb_query_duration_seconds Query execution time
# TYPE indentiadb_query_duration_seconds histogram
indentiadb_query_duration_seconds_bucket{type="sparql_select",le="0.005"} 12000
indentiadb_query_duration_seconds_bucket{type="sparql_select",le="0.01"} 14500
indentiadb_query_duration_seconds_bucket{type="sparql_select",le="0.025"} 15100
indentiadb_query_duration_seconds_bucket{type="sparql_select",le="0.05"} 15200
indentiadb_query_duration_seconds_bucket{type="sparql_select",le="+Inf"} 15234
indentiadb_query_duration_seconds_sum{type="sparql_select"} 45.2
indentiadb_query_duration_seconds_count{type="sparql_select"} 15234

# HELP indentiadb_active_connections Current number of active connections
# TYPE indentiadb_active_connections gauge
indentiadb_active_connections 42

# HELP indentiadb_storage_bytes Total storage used on disk
# TYPE indentiadb_storage_bytes gauge
indentiadb_storage_bytes 5368709120

# HELP indentiadb_cache_hits_total Total number of query cache hits
# TYPE indentiadb_cache_hits_total counter
indentiadb_cache_hits_total 8821

# HELP indentiadb_cache_misses_total Total number of query cache misses
# TYPE indentiadb_cache_misses_total counter
indentiadb_cache_misses_total 6413
```

### Key Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `indentiadb_queries_total` | Counter | `type` | Total queries by type (sparql_select, sparql_update, graphql, surrealql) |
| `indentiadb_query_duration_seconds` | Histogram | `type` | Query execution latency distribution |
| `indentiadb_active_connections` | Gauge | — | Current number of open connections |
| `indentiadb_storage_bytes` | Gauge | — | Total bytes used on disk |
| `indentiadb_cache_hits_total` | Counter | — | Query result cache hits |
| `indentiadb_cache_misses_total` | Counter | — | Query result cache misses |

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
