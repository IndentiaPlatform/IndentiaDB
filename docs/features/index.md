# Features

IndentiaDB bundles capabilities that would normally require six separate systems into a single ACID-compliant engine. This section documents every major feature area in depth.

---

## Feature Overview

| Feature | Description | Page |
|---------|-------------|------|
| **Enterprise Search** | BM25 full-text indexing with an Elasticsearch-compatible API on port 9200, hybrid BM25+vector search with Bayesian fusion, SPARQL extension patterns for RAG, and access-controlled search with audit logging | [Enterprise Search](enterprise-search.md) |
| **Vector Search & RAG** | HNSW approximate nearest-neighbour index, SurrealQL and SPARQL vector operators, hybrid text+vector queries, stored-value filtering, and a complete RAG pipeline with Knowledge Graph provenance | [Vector Search](vector-search.md) |
| **Live Queries** | `LIVE SELECT` over WebSocket, `DEFINE EVENT` triggers, a REST-based SPARQL alerting engine, Rust live-query API with triple-level filtering, and AI agent patterns (inbox, task queue, pub/sub, event sourcing) | [Live Queries](live-queries.md) |
| **Federated Queries** | SPARQL `SERVICE` clause, `SERVICE SILENT` fault-tolerant federation, R2RML virtual graphs mapping SQL databases to RDF, and a source registry supporting local, HTTP, and relational sources | [Federation](federation.md) |
| **Semantic Inference** | RDFS/OWL forward-chaining materialization with incremental updates, `rdfs:subClassOf` / `rdfs:subPropertyOf` / `owl:sameAs` / `owl:equivalentClass` support, and configurable per-query inference toggle | [Inference](inference.md) |
| **Bitemporal Time-Travel** | Dual-timeline queries (transaction time + valid time), `TEMPORAL AS OF`, `TEMPORAL BETWEEN`, and a configurable purge policy for regulatory retention compliance | [Bitemporal](bitemporal.md) |
| **Geospatial** | 60-bit geospatial encoding, WKT parsing, GeoSPARQL functions (`geof:distance`, `geof:buffer`, `geof:within`), nearest-neighbour queries, and distance joins | [Geospatial](geospatial.md) |

---

## Cross-Cutting Feature Matrix

| Capability | SPARQL | SurrealQL | ES API | LPG |
|------------|--------|-----------|--------|-----|
| Full-text search | `ql:contains-word` | `@@` operator | `match` query | — |
| Vector similarity | `vec:approxNearCosine` | `<|>` operator | `knn` field | — |
| Hybrid search | `ql:contains-word` + `vec:approxNear` | Combined | `knn` + `match` | — |
| Live queries | Via WebSocket/events | `LIVE SELECT` | — | — |
| Inference | `inference = true` | — | — | — |
| Bitemporal | `TEMPORAL AS OF` | — | — | — |
| Federation | `SERVICE` clause | `SPARQL()` call | — | — |
| Geospatial | `geof:distance` | `geo::distance` | `geo_distance` filter | — |
| ACL filtering | Transparent | Transparent | Transparent | Transparent |

---

## Where to Go Next

- If you are building a **search application** or replacing Elasticsearch: start with [Enterprise Search](enterprise-search.md).
- If you are building a **RAG pipeline or AI application**: start with [Vector Search](vector-search.md).
- If you need **real-time dashboards or event-driven automation**: start with [Live Queries](live-queries.md).
- If you are **federating multiple data sources**: start with [Federation](federation.md).
- If you need **regulatory audit trails or historical reporting**: start with [Bitemporal](bitemporal.md).
- For **security configuration** (authentication, authorization, ACL): see the [Security](../security/index.md) section.
