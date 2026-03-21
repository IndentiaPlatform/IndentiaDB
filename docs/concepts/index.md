# Concepts: Multi-Model Architecture

IndentiaDB is built on a single philosophy: **one engine, five models**. A single running process serves relational tables, flexible documents, RDF knowledge graphs, property graph traversals, vector embeddings, and full-text search — all with ACID guarantees and a unified query interface.

---

## The Problem: Polyglot Persistence

Modern applications routinely need more than one way to store and query data:

- A **PostgreSQL** database for structured records and aggregations
- A **MongoDB** (or similar) store for flexible, nested documents
- A **Neo4j** or similar graph database for relationship traversals
- An **Elasticsearch** cluster for full-text search
- A **Pinecone** or **Weaviate** instance for vector similarity search
- An **Apache Jena** or **Blazegraph** triple store for knowledge graphs

This approach — known as *polyglot persistence* — introduces compounding operational costs:

| Problem | Impact |
|---------|--------|
| 6 separate systems to deploy and upgrade | DevOps complexity grows super-linearly |
| 6 separate connection pools, credentials, and authentication layers | Security surface area multiplies |
| Data must be duplicated or synchronized across stores | ETL pipelines, lag, and consistency bugs |
| No unified transaction boundary | Cross-model writes are not atomic |
| Each system has a different query language | Developer onboarding overhead per system |
| Backup and restore must be coordinated | Data integrity during recovery is fragile |
| Observability requires 6 separate monitoring setups | Cost and cognitive load |

The traditional answer is to pick the "right tool for the job." But the right tool is the one that eliminates the seams between jobs entirely.

---

## The Solution: Single Engine, Five Models

IndentiaDB stores all five data models in one storage engine, accessed through one connection, managed by one deployment:

```
┌─────────────────────────────────────────────────────────────────┐
│                          IndentiaDB                             │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │Relational │  │ Document  │  │  Graph    │  │  Vector   │   │
│  │ SurrealQL │  │ SurrealQL │  │SPARQL/LPG │  │   HNSW    │   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Full-Text (BM25 / TF-IDF)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Hybrid Query Router                        │   │
│  │    SPARQL() inside SurrealQL · Unified ACID layer       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │   Storage: SurrealDB embedded  ─OR─  TiKV distributed   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Five Data Models

| Model | Query Language | Primary Use Case | Storage Mechanism |
|-------|---------------|------------------|-------------------|
| **Relational** | SurrealQL (`SCHEMAFULL`) | Structured records, typed schemas, aggregations, JOINs | SurrealDB kv-surrealkv or TiKV |
| **Document** | SurrealQL (`SCHEMALESS`) | Flexible nested JSON, heterogeneous records, rapid iteration | SurrealDB kv-surrealkv or TiKV |
| **Graph RDF** | SPARQL 1.2 | Knowledge graphs, ontologies, provenance, inference, semantic search | 6-permutation triple index with ZSTD compression |
| **Graph LPG** | LPG JSON DSL | Traversals, shortest path, PageRank, connected components | CSR adjacency structure projected from RDF or documents |
| **Vector / Embeddings** | SurrealQL HNSW operators | Similarity search, RAG pipelines, semantic retrieval | HNSW (Hierarchical Navigable Small World) index |
| **Full-Text** | SurrealQL `@@` operator / Elasticsearch DSL | BM25 keyword search, fuzzy matching, ranked results | Inverted index with BM25/TF-IDF scoring |

> **Note:** LPG (Labeled Property Graph) is a projection of RDF or document data — it does not have a separate write path. You write RDF or document records and query the resulting LPG view.

---

## The Hybrid Query Router

The most powerful capability in IndentiaDB is the ability to call SPARQL from inside SurrealQL using the built-in `SPARQL()` function. This lets you chain RDF graph queries with document lookups, vector searches, and relational aggregations in a single transaction.

```sql
-- Fetch RDF persons, then enrich with document data
LET $persons = SPARQL("
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?uri ?name WHERE {
        ?uri a foaf:Person ;
             foaf:name ?name .
    }
");

-- Join against the relational HR table
SELECT $p.name, e.salary, e.department
FROM employee AS e
WHERE e.external_uri IN (SELECT VALUE uri FROM $persons);
```

The query router dispatches based on the query type:

- Statements beginning with `SELECT`, `CREATE`, `UPDATE`, `DELETE`, `RELATE`, `DEFINE`, `BEGIN`, `COMMIT` → SurrealQL engine
- Statements beginning with `SELECT ?`, `ASK {`, `CONSTRUCT {`, `DESCRIBE`, `INSERT DATA`, `DELETE DATA`, or `DELETE/INSERT … WHERE` → SPARQL engine
- Calls to `SPARQL("…")` inside a SurrealQL statement → inline SPARQL dispatch, results returned as SurrealQL values
- Requests to `POST /lpg/query` with a JSON body → LPG algorithm engine
- Requests to `GET/POST /graphql` → GraphQL resolver
- Requests to port `9200` with JSON body → Elasticsearch-compatible search engine

---

## Data Flow: From Write to Query

```
Client write (SurrealQL CREATE / SPARQL INSERT DATA)
       │
       ▼
  Query Router
       │
       ├─── SurrealQL ──► SurrealDB engine ──► kv-surrealkv / TiKV
       │                        │
       │                        └── DEFINE EVENT triggers (reactive)
       │
       └─── SPARQL ──────► RDF Triple Index
                                │
                                ├── 6-permutation index (SPO/SOP/PSO/POS/OSP/OPS)
                                ├── Vocabulary tables (IRIs + literals)
                                └── LPG projection (built on demand)
```

---

## Sub-Pages

- [Architecture](architecture.md) — Storage backends, RDF index internals, query execution pipeline, Raft HA
- [Data Models](data-models.md) — Each model in depth with full working examples

---

## Further Reading

- [Query Languages Overview](../query-languages/index.md) — All supported query languages
- [SPARQL 1.2 Reference](../query-languages/sparql.md) — Full SPARQL 1.2 including RDF-star
- [SurrealQL Reference](../query-languages/surrealql.md) — 25 complete SurrealQL examples
- [LPG Reference](../query-languages/lpg.md) — Graph algorithms via JSON DSL
- [Hybrid Queries](../query-languages/hybrid-queries.md) — Combining models in one query
