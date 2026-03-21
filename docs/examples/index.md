# Examples Overview

This section contains complete, runnable examples for every query language and use case supported by IndentiaDB. All examples are tested against a running IndentiaDB instance and include the expected output.

---

## Example Categories

| Category | Examples | Description |
|----------|----------|-------------|
| [SurrealQL](surrealql.md) | 25 | CRUD, aggregates, graph edges, transactions, events, and indexes |
| [RDF & SPARQL](rdf-sparql.md) | 8 | Triples, named graphs, blank nodes, literal datatypes, class hierarchies |
| [LPG Graph](lpg-graph.md) | 20 | Traversals, PageRank, shortest path, connected components, ACL integration |
| [Enterprise Search](enterprise-search.md) | 25 | BM25 full-text, vector RAG, hybrid search, AI agent patterns |
| [Live Data & Agents](live-data.md) | 25 | DEFINE EVENT triggers, change tracking, reactive patterns, pub/sub |
| [Multi-Model](multi-model.md) | 5 | All models combined in unified queries and transactions |

---

## SurrealQL Examples

[25 examples](surrealql.md) covering all SurrealQL capabilities:

- **Relational / SQL** — math aggregates, string functions, array functions, date/time, conditional expressions, subqueries, pagination, GROUP BY
- **NoSQL / Document** — nested CRUD, array manipulation, SCHEMAFULL validation, SCHEMALESS flexibility, record links, UPSERT/MERGE, DELETE patterns, type checking
- **Graph Edges** — RELATE, outgoing traversal (`->`), incoming traversal (`<-`), bidirectional (`<->`), edge property queries, multi-hop patterns
- **Advanced** — transactions (BEGIN/COMMIT/CANCEL), DEFINE EVENT triggers, indexes and unique constraints

---

## RDF & SPARQL Examples

[8 examples](rdf-sparql.md) covering the native RDF triple store:

- Insert and query typed triples
- Named graphs for partitioning and provenance
- Blank nodes for anonymous resources
- Literal datatypes (integer, float, boolean, date)
- Language-tagged literals
- All 8 Subject/Predicate/Object pattern combinations
- Triple deletion
- Class hierarchies with `rdfs:subClassOf`

---

## LPG Graph Examples

[20 examples](lpg-graph.md) covering the Labeled Property Graph engine:

- **LPG from RDF** — label scan, traversal with property filter, bidirectional traversal, multi-hop depth, shortest path, PageRank, connected components, neighbor count
- **LPG from Documents** — document table projection, incremental RDF delta
- **Multi-Model LPG** — RDF-to-LPG projection, PageRank via CSR, combined document + RDF, incremental updates
- **ACL Integration** — admin visibility, deny policy, per-IRI permission cache, graph-level default permission
- **CSR Algorithms** — PageRank convergence, connected components with label filter

---

## Enterprise Search Examples

[25 examples](enterprise-search.md) covering all search modalities:

- **Full-Text Search (BM25)** — basic search, multi-field, highlighting, fuzzy/stemming, phrase search, boolean filters, faceted aggregation
- **Vector / RAG** — cosine similarity store, KNN with Euclidean distance, hybrid text + vector, RAG chunk-and-retrieve, context window assembly, metadata-filtered search, chunk deduplication
- **AI Agent Patterns** — tool registry, conversation memory, knowledge extraction, task planning (DAG), observation log, chain-of-thought reasoning, multi-source knowledge fusion
- **Enterprise Patterns** — access-controlled search, search audit trail, document lifecycle, cross-lingual search

---

## Live Data & Agent Examples

[25 examples](live-data.md) covering reactive and real-time patterns:

- **DEFINE EVENT Triggers** — audit log on CREATE, field change tracking on UPDATE, archive on DELETE, cascade status updates, conditional events, multi-table activity feed
- **Change Tracking** — timestamp-based polling, optimistic locking, before/after changelog, cursor-based pagination, snapshot differentials, changelog compaction
- **AI Agent Real-Time** — inbox pattern, FIFO task queue, pub/sub channels, agent state machine, collaborative editing, heartbeat monitoring, event sourcing
- **Reactive Patterns** — materialized views, notification system, cache invalidation, data pipeline, threshold alerts, knowledge graph sync

---

## Multi-Model Examples

[5 examples](multi-model.md) demonstrating how all four data models work together in a single IndentiaDB instance:

1. **Relational / SQL style** — typed tables, aggregates, subqueries
2. **NoSQL / Document** — schemaless tables with nested objects and record links
3. **Graph RDF** — triples with ontology and instance data
4. **Graph LPG** — traversals, shortest path, PageRank, and connected components over RDF data
5. **Combined transaction** — a single dataset that spans document tables, RDF triples, and LPG projections with incremental updates

---

## Running the Examples

All examples require a running IndentiaDB instance. Start one quickly with Docker:

```bash
docker run -d \
  --name indentiadb \
  -p 7001:7001 \
  -p 9200:9200 \
  -e SURREAL_USER=root \
  -e SURREAL_PASS=changeme \
  quay.io/indentia/indentiagraph:latest
```

Execute SurrealQL examples via the HTTP API:

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/sql \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM employee ORDER BY name"}'
```

Execute SPARQL examples:

```bash
curl -u root:changeme \
  -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10'
```
