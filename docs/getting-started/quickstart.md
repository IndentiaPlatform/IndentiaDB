# Quick Start

This guide gets IndentiaDB running and walks through your first queries across all supported data models. Estimated time: **5 minutes**.

---

## Step 1: Start IndentiaDB

=== "Docker (simplest)"

    ```bash
    docker run -d \
      --name indentiadb \
      -p 7001:7001 \
      -p 9200:9200 \
      ghcr.io/indentiaplatform/indentiadb-trial:latest
    ```

    IndentiaDB starts with:

    - **Port 7001** — SPARQL, SurrealQL, GraphQL, WebSocket, REST
    - **Port 9200** — Elasticsearch-compatible API

=== "Docker Compose"

    See [Step 7](#step-7-docker-compose-full-setup) for a full Docker Compose configuration with persistent volumes and resource limits.

=== "Binary"

    See [Step 8](#step-8-binary-install) for pre-built binary installation.

---

## Step 2: Verify Health

```bash
curl http://localhost:7001/health
```

Expected response:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "cluster": {
    "enabled": false,
    "node_id": "standalone"
  },
  "uptime_seconds": 3
}
```

!!! tip "Wait a moment if you get connection refused"
    The server takes 2–3 seconds to initialize the storage backend on first start.

---

## Step 3: First SPARQL Query

SPARQL is the W3C standard query language for RDF graphs. IndentiaDB supports SPARQL 1.2 including RDF-star.

### Insert RDF Triples

```bash
curl -X POST http://localhost:7001/update \
  -H "Content-Type: application/sparql-update" \
  -d '
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

INSERT DATA {
  GRAPH <http://example.org/people> {
    ex:alice a foaf:Person ;
             foaf:name "Alice" ;
             foaf:age 30 ;
             foaf:knows ex:bob .

    ex:bob   a foaf:Person ;
             foaf:name "Bob" ;
             foaf:age 28 .
  }
}'
```

### Query RDF Triples

```bash
curl -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d '
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

SELECT ?name ?age
FROM <http://example.org/people>
WHERE {
  ?person a foaf:Person ;
          foaf:name ?name ;
          foaf:age  ?age .
}
ORDER BY ?age'
```

Expected response:

```json
{
  "results": {
    "bindings": [
      { "name": { "type": "literal", "value": "Bob" },   "age": { "type": "literal", "value": "28" } },
      { "name": { "type": "literal", "value": "Alice" }, "age": { "type": "literal", "value": "30" } }
    ]
  }
}
```

### SPARQL with RDF-star (SPARQL 1.2)

```bash
curl -X POST http://localhost:7001/update \
  -H "Content-Type: application/sparql-update" \
  -d '
PREFIX ex: <http://example.org/>

INSERT DATA {
  GRAPH <http://example.org/provenance> {
    << ex:alice ex:knows ex:bob >> ex:since "2020-01-15"^^xsd:date ;
                                   ex:confidence 0.95 .
  }
}'
```

---

## Step 4: First SurrealQL Query

SurrealQL is the SQL-like multi-model query language for document, relational, and graph data.

### Create Documents

```bash
curl -X POST http://localhost:7001/sql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "
      CREATE person:alice CONTENT {
        name: \"Alice\",
        department: \"Engineering\",
        salary: 95000,
        skills: [\"Rust\", \"SPARQL\", \"Python\"]
      };

      CREATE person:bob CONTENT {
        name: \"Bob\",
        department: \"Engineering\",
        salary: 88000,
        skills: [\"Go\", \"Kubernetes\", \"SQL\"]
      };

      RELATE person:alice->knows->person:bob
        SET since = time::now(), strength = 0.9;
    "
  }'
```

### Query Documents

```bash
# Select with filter
curl -X POST http://localhost:7001/sql \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT name, salary FROM person WHERE department = \"Engineering\" ORDER BY salary DESC"}'

# Graph traversal — who does Alice know?
curl -X POST http://localhost:7001/sql \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT ->knows->person.name AS colleagues FROM person:alice"}'

# Aggregate
curl -X POST http://localhost:7001/sql \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT department, math::mean(salary) AS avg_salary FROM person GROUP BY department"}'
```

---

## Step 5: First Elasticsearch-compatible Search

IndentiaDB exposes a drop-in Elasticsearch-compatible REST API on port 9200.

### Create an Index and Index Documents

```bash
# Create index with mappings
curl -X PUT http://localhost:9200/articles \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": {
      "properties": {
        "title":   { "type": "text" },
        "content": { "type": "text" },
        "author":  { "type": "keyword" },
        "tags":    { "type": "keyword" }
      }
    }
  }'

# Index documents
curl -X POST http://localhost:9200/articles/_doc \
  -H "Content-Type: application/json" \
  -d '{
    "title":   "Introduction to Knowledge Graphs",
    "content": "Knowledge graphs use RDF triples to represent entities and relationships. SPARQL is the standard query language.",
    "author":  "alice",
    "tags":    ["rdf", "sparql", "knowledge-graph"]
  }'

curl -X POST http://localhost:9200/articles/_doc \
  -H "Content-Type: application/json" \
  -d '{
    "title":   "Vector Search with HNSW",
    "content": "Hierarchical Navigable Small World graphs enable approximate nearest neighbor search at scale.",
    "author":  "bob",
    "tags":    ["vector", "hnsw", "search"]
  }'
```

### Full-Text Search

```bash
curl -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "content": "knowledge graph SPARQL"
      }
    },
    "highlight": {
      "fields": { "content": {} }
    }
  }'
```

### Multi-Field Search

```bash
curl -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "multi_match": {
        "query": "RDF triples",
        "fields": ["title^2", "content"]
      }
    }
  }'
```

---

## Step 6: First Hybrid Search (BM25 + Vector)

Hybrid search combines BM25 keyword scoring with dense vector similarity. IndentiaDB uses Bayesian probability calibration to fuse the scores — no manual weight tuning needed.

### Create a Vector-Enabled Index

```bash
curl -X PUT http://localhost:9200/knowledge-base \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": {
      "properties": {
        "content":   { "type": "text" },
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

### Index Documents with Embeddings

```bash
curl -X POST http://localhost:9200/knowledge-base/_doc \
  -H "Content-Type: application/json" \
  -d '{
    "content": "SPARQL is a query language and protocol for RDF triple stores.",
    "embedding": [0.12, 0.84, -0.33, 0.07, ...]
  }'
```

### Hybrid Search Query

```bash
curl -X POST http://localhost:9200/knowledge-base/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": { "content": "graph query language" }
    },
    "knn": {
      "field":        "embedding",
      "query_vector": [0.11, 0.82, -0.35, 0.09, ...],
      "k":            10,
      "num_candidates": 100
    },
    "hybrid": {
      "scorer": "bayesian"
    },
    "size": 5
  }'
```

!!! info "Scorer options"
    Set `"scorer"` to `"rrf"` (Reciprocal Rank Fusion), `"bayesian"` (recommended, NDCG@10: 0.9149), or `"linear"` (weighted sum with manual alpha parameter).

---

## Step 7: Docker Compose (Full Setup)

For local development with persistent data, resource limits, and health checks:

```yaml
# docker-compose.yml
version: "3.9"

services:
  indentiadb:
    image: ghcr.io/indentiaplatform/indentiadb-trial:latest
    container_name: indentiadb
    ports:
      - "7001:7001"   # SPARQL / REST / GraphQL / WebSocket
      - "9200:9200"   # Elasticsearch-compatible API
    volumes:
      - indentiadb-data:/data
      - ./config.toml:/etc/indentiadb/config.toml:ro
    environment:
      INDENTIADB_CONFIG: /etc/indentiadb/config.toml
      LOG_LEVEL: info
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7001/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "4"

volumes:
  indentiadb-data:
    driver: local
```

```bash
# Start
docker compose up -d

# Stream logs
docker compose logs -f indentiadb

# Stop
docker compose down

# Stop and remove data
docker compose down -v
```

---

## Step 8: Binary Install

```bash
# Detect your platform
OS=$(uname -s | tr '[:upper:]' '[:lower:]')   # linux or darwin
ARCH=$(uname -m)                               # x86_64 or aarch64

# Download latest release
curl -L "https://github.com/Indentia/indentiagraph/releases/latest/download/indentiagraph-${OS}-${ARCH}" \
  -o indentiagraph
chmod +x indentiagraph

# Verify the binary
./indentiagraph --version

# Start with a config file
./indentiagraph serve --config config.toml

# Or use environment variables only
INDENTIADB_PORT=7001 \
SURREAL_ENDPOINT=ws://localhost:8000 \
ES_ENABLED=true \
ES_PORT=9200 \
  ./indentiagraph serve
```

!!! warning "SurrealDB backend"
    The binary requires a SurrealDB instance. Start one with:
    ```bash
    docker run -d -p 8000:8000 surrealdb/surrealdb:latest start --log info memory
    ```

---

## What's Next?

- **[Configuration](configuration.md)** — Full TOML config reference and all environment variables
- **[SPARQL 1.2 Guide](../query-languages/sparql.md)** — RDF-star, named graphs, federation, inference
- **[SurrealQL Guide](../query-languages/surrealql.md)** — Documents, relations, LIVE SELECT, DEFINE EVENT
- **[Enterprise Search & RAG](../features/enterprise-search.md)** — Hybrid search, chunking, RAG pipelines
- **[Security](../security/index.md)** — LDAP/OIDC, RBAC/ABAC, triple-level ACL
- **[Kubernetes Deployment](../deployment/kubernetes.md)** — Operator, StatefulSet, HA cluster
