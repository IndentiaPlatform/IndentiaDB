<p align="center">
  <h1 align="center">IndentiaDB</h1>
  <p align="center"><strong>Multi-Model Database for Knowledge Graphs & Enterprise AI</strong></p>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache-2.0"></a>
  <img src="https://img.shields.io/badge/Rust-1.78+-orange.svg" alt="Rust">
  <img src="https://img.shields.io/badge/Version-0.1.0-green.svg" alt="Version: 0.1.0">
  <img src="https://img.shields.io/badge/SPARQL-1.2-purple.svg" alt="SPARQL 1.2">
  <img src="https://img.shields.io/badge/RDF-1.2-purple.svg" alt="RDF 1.2">
</p>

---

IndentiaDB unifies RDF graphs, JSON documents, full-text search, vector embeddings, and labeled property graphs into a single ACID-compliant engine. Built in Rust. Native SPARQL 1.2, Elasticsearch-compatible API on port 9200, first-class AI/RAG integration — all in one binary.

---

## Feature Overview

| Feature | Description |
|---|---|
| **Multi-Model** | Five data models: RDF + JSON + LPG + Full-Text + Vector — no polyglot persistence needed |
| **SPARQL 1.2** | W3C Working Draft compliance, RDF-star (Triple Terms), quoted triples, SEMIJOIN/ANTIJOIN |
| **SurrealQL** | SQL-like document + relational queries with graph edge traversal |
| **Enterprise Search** | BM25 + Dense vector hybrid search with Bayesian fusion (NDCG@10: 0.9149) |
| **Elasticsearch API** | Drop-in compatible on port 9200 — works with existing ES clients, Kibana, dashboards |
| **AI-Ready / RAG** | Knowledge graph extraction, HNSW vector indexing, RAG pipelines, chunking |
| **Real-Time** | LIVE SELECT via WebSocket, DEFINE EVENT triggers, alerting engine |
| **ACID Transactions** | Snapshot isolation across all 5 data models simultaneously |
| **Security** | Three-layer ACL: LDAP/OIDC/JWT auth + RBAC/ABAC + triple-level RDF-star ACL |
| **Kubernetes Native** | Operator with CRD, StatefulSet management, auto-scaling, rolling upgrades |
| **High Availability** | Raft consensus (OpenRaft), leader election, automatic failover, 3-node cluster |
| **SHACL Validation** | W3C SHACL Core + SPARQL constraints, shapes graphs, REST validation endpoint |
| **GeoSPARQL** | 60-bit geospatial encoding, nearest neighbor, distance joins, WKT parsing |
| **Semantic Inference** | RDFS/OWL forward-chaining materialization with incremental updates |
| **Bitemporal** | Time-travel queries with transaction time + valid time (AS OF, BETWEEN) |
| **Federated Queries** | SPARQL SERVICE clause, R2RML virtual graphs, SQL database federation |
| **WASM Support** | Browser & edge runtime via WebAssembly |
| **QLever Compatibility** | FSST decompression, 6-permutation index (SPO/SOP/PSO/POS/OSP/OPS) |

---

## Quick Start

### Docker (simplest)

```bash
docker run -p 7001:7001 -p 9200:9200 ghcr.io/indentiaplatform/indentiadb-trial:latest
```

IndentiaDB is now running with:
- **SPARQL / GraphQL / REST / WebSocket** on port `7001`
- **Elasticsearch-compatible API** on port `9200`

### Docker Compose

```bash
git clone https://github.com/IndentiaPlatform/IndentiaDB.git
cd IndentiaDB
docker compose up -d
```

### Binary

```bash
# Download the latest release for your platform
curl -L https://github.com/IndentiaPlatform/IndentiaDB/releases/latest/download/indentiagraph-$(uname -s)-$(uname -m) \
  -o indentiagraph
chmod +x indentiagraph

# Start the server
./indentiagraph serve --port 7001
```

### Verify

```bash
# Health check
curl http://localhost:7001/health

# Run a SPARQL query
curl -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -d "SELECT * WHERE { ?s ?p ?o } LIMIT 10"

# Use the Elasticsearch-compatible API
curl http://localhost:9200/_search \
  -H "Content-Type: application/json" \
  -d '{"query": {"match": {"content": "knowledge graph"}}}'
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                          Clients                              │
│   SPARQL · SurrealQL · GraphQL · REST · ES API · WebSocket   │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                    IndentiaDB Server                          │
│                                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────────────────┐  │
│  │  SPARQL 1.2 │ │  SurrealQL  │ │  ES-Compatible API    │  │
│  │   Engine    │ │   Engine    │ │  (port 9200)          │  │
│  └──────┬──────┘ └──────┬──────┘ └───────────┬───────────┘  │
│         │               │                     │               │
│  ┌──────▼───────────────▼─────────────────────▼───────────┐  │
│  │              Hybrid Query Router                         │  │
│  │     SPARQL() + LPG() + SurrealQL unified routing        │  │
│  └─────────────────────────┬───────────────────────────────┘  │
│                            │                                   │
│  ┌─────────────────────────▼───────────────────────────────┐  │
│  │                  Multi-Model Store                        │  │
│  │                                                           │  │
│  │  RDF Triples  │ JSON Documents │ LPG Graph Edges         │  │
│  │  Vectors      │ Full-Text Index│ Geospatial              │  │
│  └─────────────────────────┬───────────────────────────────┘  │
│                            │                                   │
│  ┌─────────────────────────▼───────────────────────────────┐  │
│  │         Storage Backend (SurrealDB / TiKV)               │  │
│  │    6-permutation RDF index · HNSW vector · BM25          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Models

IndentiaDB natively supports six data models through a unified storage engine:

| Model | Query Language | Example |
|-------|---------------|---------|
| **Relational** | SurrealQL | `SELECT name, salary FROM employee WHERE department = "Engineering"` |
| **Document** | SurrealQL | `CREATE project CONTENT { name: "Alpha", tags: ["ai", "graph"] }` |
| **Graph (RDF)** | SPARQL 1.2 | `SELECT ?name WHERE { ?p a foaf:Person ; foaf:name ?name }` |
| **Graph (LPG)** | LPG JSON DSL | `LPG({"kind":"traverse","start":{"label":"Person"},"edge":"knows"})` |
| **Vector** | SurrealQL | `SELECT *, vector::similarity::cosine(embedding, $query) AS score FROM chunks` |
| **Full-Text** | ES Query DSL | `{"query": {"match": {"content": "knowledge graph"}}}` |

---

## Comparison

### Feature Comparison

| Feature | IndentiaDB | QLever (C++) | Oxigraph | Blazegraph | Apache Jena | MarkLogic | ArangoDB | PostgreSQL | SQL Server | Oracle |
|---------|-----------|-------------|----------|-----------|-------------|-----------|---------|------------|------------|--------|
| **Language** | Rust | C++ | Rust | Java | Java | C++ | C++ | C | C | C |
| **Clustering** | ✅ Raft HA | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Multi-Modal** | ✅ 5 models | ❌ RDF only | ❌ RDF only | ❌ RDF only | ❌ RDF only | ✅ | ✅ | ⚠️ ext | ⚠️ ext | ⚠️ ext |
| **SPARQL 1.1** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **SPARQL 1.2** | ✅ Full | ✅ Partial | ⚠️ Partial | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **RDF 1.2** | ✅ Full | ⚠️ Partial | ⚠️ Partial | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **RDF-star** | ✅ Native | ⚠️ Partial | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **GeoSPARQL** | ✅ | ❌ | ❌ | ⚠️ | ✅ ext | ✅ | ✅ | ✅ ext | ✅ | ✅ |
| **Full-Text Search** | ✅ BM25 native | ✅ ql:contains | ❌ | ✅ Lucene | ✅ Lucene | ✅ | ✅ | ⚠️ tsvector | ✅ | ✅ |
| **Federated Queries** | ✅ SERVICE | ✅ SERVICE | ✅ SERVICE | ✅ SERVICE | ✅ SERVICE | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| **Vector Search** | ✅ HNSW | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ ext | ❌ | ❌ |
| **Elasticsearch API** | ✅ Port 9200 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **RAG / AI** | ✅ Native | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| **Bitemporal** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reasoning** | ✅ RDFS/OWL | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Real-Time Events** | ✅ LIVE/Events | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **K8s Operator** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **WASM** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **License** | Apache 2.0 | Apache 2.0 | MIT/Apache | GPL 2.0 | Apache 2.0 | Commercial | Apache 2.0/Commercial | PostgreSQL | Commercial | Commercial |

### Security Comparison

| Security Feature | IndentiaDB | QLever | Oxigraph | Blazegraph | Apache Jena | MarkLogic | ArangoDB | PostgreSQL | SQL Server | Oracle |
|-----------------|-----------|--------|----------|-----------|-------------|-----------|---------|------------|------------|--------|
| **LDAP** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ ext | ✅ | ✅ |
| **OIDC / OAuth2** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **JWT Bearer** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **HTTP Basic Auth** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **RBAC** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Graph-Level ACL** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Triple-Level ACL** | ✅ RDF-star | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Windows SID Support** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Rate Limiting** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Audit Logging** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ ext | ✅ | ✅ |
| **FROM Clause Filtering** | ✅ auto | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **RDF-star Security** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Performance

### SPARQL Benchmark (Olympics Dataset, January 2026, Apple M2 Max)

| System | Average Query Time | vs Oxigraph |
|--------|-------------------|-------------|
| QLever (C++) | **52ms** | 34x faster |
| **IndentiaDB (Rust)** | **344ms** | **5x faster** |
| Oxigraph (Rust) | 1,764ms | baseline |

IndentiaDB achieves 5x faster SPARQL query execution than Oxigraph through its 6-permutation RDF index (SPO/SOP/PSO/POS/OSP/OPS) combined with FSST compression, while adding multi-model capabilities that pure SPARQL engines do not offer.

### Hybrid Search Benchmark (SQuAD, NDCG@10)

| Scorer | Algorithm | NDCG@10 |
|--------|-----------|---------|
| RRF | Reciprocal Rank Fusion (BM25 + Dense) | 0.8874 |
| **Bayesian** | **Bayesian Probability Calibration (BM25 + Dense)** | **0.9149** |

The Bayesian scorer auto-calibrates from the BM25 score distribution, requiring zero manual tuning. Enable it with `ES_HYBRID_SCORER=bayesian`.

> Reference: *"Bayesian BM25: A Probabilistic Framework for Hybrid Text and Vector Search"*

---

## API Endpoints

| Endpoint | Port | Method | Path | Description |
|----------|------|--------|------|-------------|
| SPARQL Query | 7001 | `GET/POST` | `/sparql` | Execute SPARQL 1.2 queries |
| SPARQL Update | 7001 | `POST` | `/update` | SPARQL UPDATE operations |
| Graph Store | 7001 | `GET/PUT/POST/DELETE` | `/data` | SPARQL Graph Store Protocol |
| GraphQL | 7001 | `POST` | `/graphql` | GraphQL queries and mutations |
| SHACL Validation | 7001 | `POST` | `/shacl/validate` | Validate RDF against SHACL shapes |
| Health | 7001 | `GET` | `/health` | Server health + cluster status |
| Metrics | 7001 | `GET` | `/metrics` | Prometheus-compatible metrics |
| WebSocket | 7001 | `WS` | `/ws` | LIVE SELECT streaming |
| Alerts | 7001 | `GET/POST` | `/alerts` | Alerting engine REST API |
| ES Search | 9200 | `GET/POST` | `/_search` | Elasticsearch-compatible search |
| ES Index | 9200 | `PUT` | `/{index}` | Create/configure index |
| ES Document | 9200 | `POST` | `/{index}/_doc` | Index a document |
| ES Bulk | 9200 | `POST` | `/_bulk` | Bulk index/update/delete |
| ES KNN | 9200 | `POST` | `/{index}/_search` | Vector/KNN search |

---

## Configuration

### Minimal Configuration (TOML)

```toml
[server]
bind_address = "0.0.0.0"
port = 7001

[surrealdb]
endpoints = ["ws://localhost:8000"]
namespace = "indentia"
database = "main"
username = "root"
password = "root"

[elasticsearch_compat]
enabled = true
host = "0.0.0.0"
port = 9200
hybrid_scorer = "bayesian"        # rrf | bayesian | linear
vector_search_mode = "hnsw"       # hnsw | brute_force

[cluster]
enabled = false
node_id = "node-1"
# seed_nodes = ["node-2:7002", "node-3:7003"]
```

### Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INDENTIADB_CONFIG` | `config.toml` | Path to TOML configuration file |
| `INDENTIADB_PORT` | `7001` | Main server port |
| `INDENTIADB_BIND_ADDRESS` | `0.0.0.0` | Bind address |
| `SURREAL_ENDPOINT` | — | SurrealDB WebSocket endpoint |
| `SURREAL_USERNAME` | `root` | SurrealDB username |
| `SURREAL_PASSWORD` | `root` | SurrealDB password |
| `ES_ENABLED` | `true` | Enable Elasticsearch-compatible API |
| `ES_PORT` | `9200` | Elasticsearch API port |
| `ES_HYBRID_SCORER` | `rrf` | Hybrid search scorer (`rrf`, `bayesian`, `linear`) |
| `ES_VECTOR_SEARCH_MODE` | `hnsw` | Vector index type (`hnsw`, `brute_force`) |
| `CLUSTER_ENABLED` | `false` | Enable Raft cluster mode |
| `CLUSTER_NODE_ID` | — | Unique node identifier |
| `CLUSTER_SEED_NODES` | — | Comma-separated seed node addresses |
| `QUERY_SPARQL_12` | `true` | Enable SPARQL 1.2 features |
| `QUERY_INFERENCE` | `false` | Enable RDFS/OWL inference |
| `LOG_LEVEL` | `info` | Log level (`trace`, `debug`, `info`, `warn`, `error`) |

---

## Deployment

| Environment | Guide |
|-------------|-------|
| Docker / Docker Compose | [docs/deployment/docker.md](docs/deployment/docker.md) |
| Kubernetes | [docs/deployment/kubernetes.md](docs/deployment/kubernetes.md) |
| OpenShift / OKD | [docs/deployment/openshift.md](docs/deployment/openshift.md) |

---

## Examples

| Category | Count | Description | Path |
|----------|-------|-------------|------|
| SurrealQL | 25 | CRUD, aggregates, transactions, events | [examples/surrealql/](examples/surrealql/) |
| RDF / SPARQL | 8 | Triples, named graphs, inference, federation | [examples/rdf/](examples/rdf/) |
| LPG Graph | 10 | Traversals, PageRank, shortest path | [examples/lpg/](examples/lpg/) |
| Enterprise Search & RAG | 25 | BM25, vectors, RAG, AI agents | [examples/enterprise-search/](examples/enterprise-search/) |
| Live Data & Agents | 25 | DEFINE EVENT, reactive patterns, agents | [examples/live-data/](examples/live-data/) |
| Multi-Model Combined | 5 | All 5 models in hybrid queries | [examples/combined/](examples/combined/) |

---

## Documentation

Full documentation is available at **[dbdocs.indentia.ai](https://dbdocs.indentia.ai)**.

| Section | Link |
|---------|------|
| Getting Started | [dbdocs.indentia.ai/getting-started/](https://dbdocs.indentia.ai/getting-started/) |
| Configuration Reference | [dbdocs.indentia.ai/getting-started/configuration/](https://dbdocs.indentia.ai/getting-started/configuration/) |
| SPARQL 1.2 Guide | [dbdocs.indentia.ai/query-languages/sparql/](https://dbdocs.indentia.ai/query-languages/sparql/) |
| SurrealQL Guide | [dbdocs.indentia.ai/query-languages/surrealql/](https://dbdocs.indentia.ai/query-languages/surrealql/) |
| Enterprise Search & RAG | [dbdocs.indentia.ai/features/enterprise-search/](https://dbdocs.indentia.ai/features/enterprise-search/) |
| Security & ACL | [dbdocs.indentia.ai/security/](https://dbdocs.indentia.ai/security/) |
| API Reference | [dbdocs.indentia.ai/api-reference/](https://dbdocs.indentia.ai/api-reference/) |
| Deployment | [dbdocs.indentia.ai/deployment/](https://dbdocs.indentia.ai/deployment/) |

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

```
Copyright 2024-2026 Indentia B.V.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Ownership and licence status

Indentia-authored original code and additions are owned by Indentia B.V., while use is governed by the applicable `LICENSE` files. See `NOTICE` or `INDENTIA_NOTICE.md` and `OWNERSHIP.md`.
