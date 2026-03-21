# API Reference

IndentiaDB exposes multiple protocol-compatible interfaces on two ports:

| Port | Protocols |
|------|-----------|
| 7001 | SPARQL, Graph Store Protocol, GraphQL, SHACL, WebSocket, Health/Metrics |
| 9200 | Elasticsearch-compatible REST API |

All examples below assume IndentiaDB is running on `localhost`.

---

## SPARQL Endpoints (port 7001)

IndentiaDB implements the [SPARQL 1.1 Protocol](https://www.w3.org/TR/sparql11-protocol/) with extensions for SPARQL 1.2 and RDF-star.

### Query via GET

```
GET /sparql?query=<URL-encoded SPARQL query>
```

**Example -- SELECT:**

```bash
curl -G 'http://localhost:7001/sparql' \
  --data-urlencode 'query=SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10'
```

**Example -- ASK:**

```bash
curl -G 'http://localhost:7001/sparql' \
  --data-urlencode 'query=ASK { <http://example.org/alice> a <http://xmlns.com/foaf/0.1/Person> }'
```

### Query via POST

```
POST /sparql
Content-Type: application/sparql-query
```

**Example -- CONSTRUCT:**

```bash
curl -X POST 'http://localhost:7001/sparql' \
  -H 'Content-Type: application/sparql-query' \
  -H 'Accept: text/turtle' \
  -d 'CONSTRUCT { ?s ?p ?o } WHERE { ?s a <http://xmlns.com/foaf/0.1/Person> ; ?p ?o }'
```

### Update via POST

```
POST /update
Content-Type: application/sparql-update
```

**Example -- INSERT DATA:**

```bash
curl -X POST 'http://localhost:7001/update' \
  -H 'Content-Type: application/sparql-update' \
  -d '
INSERT DATA {
  GRAPH <http://example.org/people> {
    <http://example.org/alice> a <http://xmlns.com/foaf/0.1/Person> ;
      <http://xmlns.com/foaf/0.1/name> "Alice" ;
      <http://xmlns.com/foaf/0.1/age> 30 .
  }
}'
```

**Example -- DELETE DATA:**

```bash
curl -X POST 'http://localhost:7001/update' \
  -H 'Content-Type: application/sparql-update' \
  -d '
DELETE DATA {
  GRAPH <http://example.org/people> {
    <http://example.org/alice> <http://xmlns.com/foaf/0.1/age> 30 .
  }
}'
```

### Response Formats

| Accept Header | Format |
|---------------|--------|
| `application/sparql-results+json` | JSON results (default for SELECT/ASK) |
| `application/sparql-results+xml` | XML results |
| `text/turtle` | Turtle (default for CONSTRUCT/DESCRIBE) |
| `application/n-triples` | N-Triples |

---

## Graph Store Protocol (port 7001)

IndentiaDB implements the [SPARQL 1.1 Graph Store HTTP Protocol](https://www.w3.org/TR/sparql11-http-rdf-update/) on two equivalent path prefixes: `/data` and `/graph-store`.

### Endpoints

```
GET    /data?graph=<uri>       # Retrieve a named graph
PUT    /data?graph=<uri>       # Replace a named graph
POST   /data?graph=<uri>       # Merge triples into a named graph
DELETE /data?graph=<uri>       # Delete a named graph
```

The `/graph-store` prefix behaves identically:

```
GET    /graph-store?graph=<uri>
PUT    /graph-store?graph=<uri>
POST   /graph-store?graph=<uri>
DELETE /graph-store?graph=<uri>
```

Omit the `graph` parameter to target the default graph.

### Supported Content Types

| Content-Type | Format |
|--------------|--------|
| `text/turtle` | Turtle |
| `application/n-triples` | N-Triples |
| `application/n-quads` | N-Quads |
| `application/trig` | TriG |

### Examples

**Retrieve a graph as Turtle:**

```bash
curl 'http://localhost:7001/data?graph=http://example.org/people' \
  -H 'Accept: text/turtle'
```

**Replace a graph:**

```bash
curl -X PUT 'http://localhost:7001/data?graph=http://example.org/people' \
  -H 'Content-Type: text/turtle' \
  -d '
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
<http://example.org/bob> a foaf:Person ;
  foaf:name "Bob" .
'
```

**Merge triples into a graph:**

```bash
curl -X POST 'http://localhost:7001/data?graph=http://example.org/people' \
  -H 'Content-Type: application/n-triples' \
  -d '<http://example.org/carol> <http://xmlns.com/foaf/0.1/name> "Carol" .'
```

**Delete a graph:**

```bash
curl -X DELETE 'http://localhost:7001/data?graph=http://example.org/people'
```

---

## GraphQL (port 7001)

IndentiaDB exposes a GraphQL endpoint that maps queries and mutations to its underlying data models.

### Endpoint

```
POST /graphql
Content-Type: application/json
```

### Query Example

```bash
curl -X POST 'http://localhost:7001/graphql' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "query { person(id: \"alice\") { name age knows { name } } }",
  "variables": {}
}'
```

**Response:**

```json
{
  "data": {
    "person": {
      "name": "Alice",
      "age": 30,
      "knows": [
        { "name": "Bob" }
      ]
    }
  }
}
```

### Mutation Example

```bash
curl -X POST 'http://localhost:7001/graphql' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "mutation CreatePerson($input: PersonInput!) { createPerson(input: $input) { id name } }",
  "variables": {
    "input": {
      "name": "Dave",
      "age": 28
    }
  }
}'
```

**Response:**

```json
{
  "data": {
    "createPerson": {
      "id": "person:dave",
      "name": "Dave"
    }
  }
}
```

---

## Elasticsearch-Compatible API (port 9200)

IndentiaDB provides an Elasticsearch-compatible REST API on port 9200. This enables integration with existing Elasticsearch clients, dashboards, and tooling without code changes.

### Cluster Information

```bash
# Cluster info
curl 'http://localhost:9200/'

# Cluster health
curl 'http://localhost:9200/_cluster/health'
```

### Index Management

**Create an index:**

```bash
curl -X PUT 'http://localhost:9200/articles' \
  -H 'Content-Type: application/json' \
  -d '{
  "mappings": {
    "properties": {
      "title":   { "type": "text" },
      "body":    { "type": "text" },
      "tags":    { "type": "keyword" },
      "created": { "type": "date" },
      "embedding": {
        "type": "dense_vector",
        "dims": 384,
        "index": true,
        "similarity": "cosine"
      }
    }
  }
}'
```

### Document Indexing

**Index a single document:**

```bash
curl -X POST 'http://localhost:9200/articles/_doc' \
  -H 'Content-Type: application/json' \
  -d '{
  "title": "Introduction to Graph Databases",
  "body": "Graph databases store data as nodes and edges...",
  "tags": ["graph", "database"],
  "created": "2026-01-15",
  "embedding": [0.12, -0.34, 0.56, ...]
}'
```

**Bulk operations:**

```bash
curl -X POST 'http://localhost:9200/_bulk' \
  -H 'Content-Type: application/x-ndjson' \
  -d '
{"index": {"_index": "articles"}}
{"title": "First Article", "body": "Content of the first article."}
{"index": {"_index": "articles"}}
{"title": "Second Article", "body": "Content of the second article."}
'
```

### Search

**Match query:**

```bash
curl -X POST 'http://localhost:9200/articles/_search' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": {
    "match": {
      "body": "graph databases"
    }
  }
}'
```

**Bool query with range filter:**

```bash
curl -X POST 'http://localhost:9200/articles/_search' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": {
    "bool": {
      "must": [
        { "match": { "body": "graph databases" } }
      ],
      "filter": [
        { "term": { "tags": "database" } },
        { "range": { "created": { "gte": "2025-01-01" } } }
      ]
    }
  },
  "size": 10,
  "sort": [{ "created": "desc" }]
}'
```

**KNN (vector) search:**

```bash
curl -X POST 'http://localhost:9200/articles/_search' \
  -H 'Content-Type: application/json' \
  -d '{
  "knn": {
    "field": "embedding",
    "query_vector": [0.12, -0.34, 0.56, ...],
    "k": 10,
    "num_candidates": 100
  }
}'
```

**Hybrid search (BM25 + KNN):**

```bash
curl -X POST 'http://localhost:9200/articles/_search' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": {
    "match": { "body": "graph databases" }
  },
  "knn": {
    "field": "embedding",
    "query_vector": [0.12, -0.34, 0.56, ...],
    "k": 10,
    "num_candidates": 100
  }
}'
```

Hybrid scoring can be configured via the `ES_HYBRID_SCORER` environment variable. See the [Configuration Reference](configuration.md) for details on `rrf`, `bayesian`, and `linear` modes.

---

## SHACL Validation (port 7001)

IndentiaDB supports [SHACL](https://www.w3.org/TR/shacl/) (Shapes Constraint Language) for validating RDF data against a shapes graph.

### Endpoint

```
POST /shacl/validate
Content-Type: text/turtle
```

The request body contains the SHACL shapes graph in Turtle format. The server validates the current data graph against the provided shapes and returns a validation report.

### Example

**Shapes graph:**

```bash
curl -X POST 'http://localhost:7001/shacl/validate' \
  -H 'Content-Type: text/turtle' \
  -d '
@prefix sh:   <http://www.w3.org/ns/shacl#> .
@prefix ex:   <http://example.org/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

ex:PersonShape a sh:NodeShape ;
  sh:targetClass ex:Person ;
  sh:property [
    sh:path ex:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
  ] ;
  sh:property [
    sh:path ex:age ;
    sh:minCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 0 ;
  ] .
'
```

**Response (conforming):**

```json
{
  "conforms": true,
  "results": []
}
```

**Response (violation):**

```json
{
  "conforms": false,
  "results": [
    {
      "focusNode": "http://example.org/alice",
      "path": "http://example.org/age",
      "severity": "http://www.w3.org/ns/shacl#Violation",
      "message": "Value must have datatype xsd:integer",
      "sourceShape": "http://example.org/PersonShape"
    }
  ]
}
```

---

## Health and Metrics

### Health Check

```
GET /health
```

```bash
curl 'http://localhost:7001/health'
```

**Response:**

```json
{
  "status": "healthy",
  "role": "leader",
  "cluster": {
    "node_id": "node-1",
    "peers": 3,
    "replication_factor": 3
  },
  "uptime_seconds": 86400,
  "version": "1.0.0"
}
```

### Prometheus Metrics

```
GET /metrics
```

```bash
curl 'http://localhost:7001/metrics'
```

Returns metrics in Prometheus exposition format:

```
# HELP indentiadb_queries_total Total number of queries processed
# TYPE indentiadb_queries_total counter
indentiadb_queries_total{type="sparql"} 15432
indentiadb_queries_total{type="surrealql"} 8210
indentiadb_queries_total{type="graphql"} 3021

# HELP indentiadb_query_duration_seconds Query execution duration
# TYPE indentiadb_query_duration_seconds histogram
indentiadb_query_duration_seconds_bucket{type="sparql",le="0.01"} 12000
indentiadb_query_duration_seconds_bucket{type="sparql",le="0.1"} 14500
...
```

---

## WebSocket / Live Queries

IndentiaDB supports real-time change notifications via WebSocket connections.

### Connection

```
ws://localhost:7001/ws
```

### LIVE SELECT

After establishing a WebSocket connection, send a `LIVE SELECT` statement to subscribe to changes on a table or query pattern.

**Subscribe:**

```json
{
  "sql": "LIVE SELECT * FROM person WHERE age > 21"
}
```

**Server acknowledgment:**

```json
{
  "id": "live-query-uuid-1234",
  "status": "OK"
}
```

### Notification Format

When matching data changes, the server pushes notifications:

**CREATE notification:**

```json
{
  "live_id": "live-query-uuid-1234",
  "action": "CREATE",
  "result": {
    "id": "person:alice",
    "name": "Alice",
    "age": 30
  }
}
```

**UPDATE notification:**

```json
{
  "live_id": "live-query-uuid-1234",
  "action": "UPDATE",
  "result": {
    "id": "person:alice",
    "name": "Alice",
    "age": 31
  }
}
```

**DELETE notification:**

```json
{
  "live_id": "live-query-uuid-1234",
  "action": "DELETE",
  "result": {
    "id": "person:alice"
  }
}
```

### Unsubscribe

```json
{
  "sql": "KILL 'live-query-uuid-1234'"
}
```
