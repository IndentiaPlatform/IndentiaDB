<p align="center">
  <h1 align="center">IndentiaDB</h1>
  <p align="center"><strong>Multi-Model Database for Knowledge Graphs & Enterprise AI</strong></p>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache-2.0"></a>
  <img src="https://img.shields.io/badge/Rust-1.78+-orange.svg" alt="Rust">
  <img src="https://img.shields.io/badge/Version-0.1.0-green.svg" alt="Version: 0.1.0">
</p>

---

IndentiaDB is a next-generation multi-model database that unifies RDF graphs, documents, full-text search, and vector embeddings into a single ACID-compliant engine. Built in Rust for performance and safety, it provides native SPARQL 1.2 support, an Elasticsearch-compatible API, and first-class AI/RAG integration — all in one binary.

---

## Key Features

| | Feature | Description |
|---|---|---|
| **Multi-Model** | RDF + JSON + Graph + Full-Text + Vector | Five data models in one database — no polyglot persistence needed |
| **SPARQL 1.2** | W3C Working Draft compliance | Full RDF-star support, federated queries, property graphs |
| **Enterprise Search** | BM25 + Vector hybrid search | Elasticsearch-compatible REST API on port 9200 |
| **AI-Ready** | RAG pipelines & embeddings | Knowledge graph extraction, vector similarity, chunking |
| **Real-Time** | LIVE queries & event triggers | WebSocket streaming, DEFINE EVENT reactive workflows |
| **ACID Transactions** | Snapshot isolation | Consistent reads/writes across all data models |
| **Security** | Triple-level ACL | ABAC/RBAC with RDF-star annotations on individual triples |
| **Kubernetes Native** | Operator with CRD | StatefulSet management, auto-scaling, rolling upgrades |
| **WASM Support** | Browser & edge runtime | Embed IndentiaDB in WebAssembly environments |
| **Inference Engine** | RDFS/OWL reasoning | Forward-chaining materialization with incremental updates |

---

## Quick Start

### Docker (simplest)

```bash
docker run -p 7001:7001 -p 9200:9200 quay.io/indentia/indentiagraph:latest
```

IndentiaDB is now running with:
- **SPARQL / GraphQL / REST** on port `7001`
- **Elasticsearch-compatible API** on port `9200`

### Docker Compose

```bash
git clone https://github.com/Indentia/indentiagraph.git
cd indentiagraph
docker compose up -d
```

See [`docker-compose.yml`](docker-compose.yml) for the full configuration.

### Binary

```bash
# Download the latest release
curl -L https://github.com/Indentia/indentiagraph/releases/latest/download/indentiagraph-$(uname -s)-$(uname -m) -o indentiagraph
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

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                    Clients                        │
│  SPARQL  ·  GraphQL  ·  REST  ·  ES API  ·  WS  │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│               IndentiaDB Server                   │
│                                                   │
│  ┌───────────┐ ┌───────────┐ ┌─────────────────┐ │
│  │  SPARQL   │ │ SurrealQL │ │ ES-Compatible   │ │
│  │  Engine   │ │  Engine   │ │ API (port 9200) │ │
│  └─────┬─────┘ └─────┬─────┘ └───────┬─────────┘ │
│        │              │               │            │
│  ┌─────▼──────────────▼───────────────▼─────────┐ │
│  │           Hybrid Query Router                 │ │
│  │    SPARQL() + LPG() + SurrealQL unified       │ │
│  └─────────────────┬────────────────────────────┘ │
│                    │                               │
│  ┌─────────────────▼────────────────────────────┐ │
│  │           Multi-Model Store                   │ │
│  │                                               │ │
│  │  RDF Triples │ Documents │ Graph Edges        │ │
│  │  Vectors     │ Full-Text │ Geospatial         │ │
│  └─────────────────┬────────────────────────────┘ │
│                    │                               │
│  ┌─────────────────▼────────────────────────────┐ │
│  │      SurrealDB (embedded) / TiKV             │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

---

## Data Models

IndentiaDB natively supports five data models through a unified storage engine:

| Model | Query Language | Example |
|-------|---------------|---------|
| **Relational** | SurrealQL | `SELECT name, salary FROM employee WHERE department = "Engineering"` |
| **Document** | SurrealQL | `CREATE project CONTENT { name: "Alpha", tags: ["ai", "graph"] }` |
| **Graph (RDF)** | SPARQL 1.2 | `SELECT ?name WHERE { ?p a foaf:Person ; foaf:name ?name }` |
| **Graph (LPG)** | LPG JSON DSL | `LPG({"kind":"traverse","start":{"label":"Person"},"edge":"knows"})` |
| **Vector** | SurrealQL | `SELECT *, vector::similarity::cosine(embedding, $query) AS score FROM chunks` |

---

## API Endpoints

| Endpoint | Port | Method | Path | Description |
|----------|------|--------|------|-------------|
| SPARQL Query | 7001 | `GET/POST` | `/sparql` | Execute SPARQL 1.2 queries |
| SPARQL Update | 7001 | `POST` | `/update` | Execute SPARQL UPDATE operations |
| GraphQL | 7001 | `POST` | `/graphql` | GraphQL queries and mutations |
| SHACL Validation | 7001 | `POST` | `/shacl/validate` | Validate RDF data against SHACL shapes |
| Health | 7001 | `GET` | `/health` | Server health status |
| Metrics | 7001 | `GET` | `/metrics` | Prometheus-compatible metrics |
| WebSocket | 7001 | `WS` | `/ws` | LIVE SELECT streaming |
| ES Search | 9200 | `GET/POST` | `/_search` | Elasticsearch-compatible search |
| ES Index | 9200 | `PUT/POST` | `/{index}/_doc` | Elasticsearch-compatible indexing |
| ES Bulk | 9200 | `POST` | `/_bulk` | Elasticsearch-compatible bulk operations |

---

## Configuration

### Minimal Configuration (TOML)

```toml
[server]
bind = "0.0.0.0"
port = 7001

[surrealdb]
path = "rocksdb://data/indentiadb"
username = "root"
password = "root"
namespace = "indentia"
database = "main"

[elasticsearch_compat]
enabled = true
port = 9200
hybrid_scorer = "bayesian"       # rrf | bayesian | linear
vector_search_mode = "hnsw"      # hnsw | flat

[cluster]
node_id = "node-1"
# peers = ["node-2:7002", "node-3:7003"]
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ES_HYBRID_SCORER` | `rrf` | Hybrid search fusion algorithm (`rrf`, `bayesian`, `linear`) |
| `ES_VECTOR_SEARCH_MODE` | `hnsw` | Vector index type (`hnsw`, `flat`) |
| `SURREAL_USER` | `root` | SurrealDB root username |
| `SURREAL_PASS` | `root` | SurrealDB root password |
| `INDENTIA_LOG` | `info` | Log level (`trace`, `debug`, `info`, `warn`, `error`) |
| `INDENTIA_DATA_DIR` | `./data` | Data directory path |

---

## Deployment

| Environment | Guide |
|-------------|-------|
| Docker / Docker Compose | [docs/deployment-docker.md](docs/deployment-docker.md) |
| Kubernetes | [docs/deployment-kubernetes.md](docs/deployment-kubernetes.md) |
| OpenShift / OKD | [docs/deployment-openshift.md](docs/deployment-openshift.md) |

---

## Examples

| Category | Count | Path |
|----------|-------|------|
| SurrealQL (CRUD, relations, functions) | 25 | [examples/surrealql/](examples/surrealql/) |
| RDF / SPARQL (triples, reasoning, federation) | 8 | [examples/rdf/](examples/rdf/) |
| LPG Graph (traversals, algorithms, patterns) | 10 | [examples/lpg/](examples/lpg/) |
| Enterprise Search & RAG | 25 | [examples/enterprise-search/](examples/enterprise-search/) |
| Live Data & AI Agents | 25 | [examples/live-data/](examples/live-data/) |
| Combined Multi-Model | 5 | [examples/combined/](examples/combined/) |

---

## Performance

### Hybrid Search Benchmark (SQuAD, NDCG@10)

| Scorer | Algorithm | NDCG@10 |
|--------|-----------|---------|
| RRF | Reciprocal Rank Fusion (BM25 + Dense) | 0.8874 |
| **Bayesian** | **Bayesian Probability Calibration (BM25 + Dense)** | **0.9149** |

The Bayesian scorer auto-calibrates from the BM25 score distribution, requiring zero manual tuning. Set `ES_HYBRID_SCORER=bayesian` to enable.

> Reference: *"Bayesian BM25: A Probabilistic Framework for Hybrid Text and Vector Search"*

---

## Documentation

- [Full Documentation](docs/)
- [API Reference](docs/api-reference.md)
- [Examples](examples/)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

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
