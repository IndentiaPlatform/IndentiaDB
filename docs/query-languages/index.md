# Query Languages

IndentiaDB supports six query interfaces. Each targets a different data model and use case. All interfaces share the same underlying storage and the same ACID transaction boundary.

---

## Supported Query Languages

| Query Language | Endpoint | Port | Use Case |
|---------------|----------|------|----------|
| **SPARQL 1.2** | `POST /sparql` (query), `POST /update` (update) | 7001 | RDF triple store, knowledge graphs, ontologies, federated queries, RDF-star provenance |
| **SurrealQL** | `POST /sql` (WebSocket `ws://`) | 7001 | Relational tables, document CRUD, graph edge traversals, vector search, full-text search, transactions, LIVE queries |
| **LPG JSON DSL** | `POST /lpg/query` | 7001 | Graph algorithms: traversal, shortest path, PageRank, connected components, neighbor count |
| **GraphQL** | `GET/POST /graphql` | 7001 | GraphQL clients, API gateways, frontend integrations |
| **Elasticsearch Query DSL** | `GET/POST /_search`, `POST /:index/_search` | 9200 | Full-text search, hybrid BM25+vector, ES client libraries, Kibana-compatible analytics |
| **Hybrid (SPARQL inside SurrealQL)** | `POST /sql` | 7001 | Cross-model queries: fetch RDF data and use results in document/relational queries |

---

## Quick Reference by Task

| Task | Query Language | Example |
|------|---------------|---------|
| Structured record query | SurrealQL | `SELECT name FROM employee WHERE salary > 80000` |
| Flexible document query | SurrealQL | `SELECT metadata.lead FROM project WHERE status = "active"` |
| RDF triple pattern | SPARQL | `SELECT ?name WHERE { ?p a foaf:Person ; foaf:name ?name }` |
| Provenance annotation | SPARQL (RDF-star) | `<< ex:alice foaf:knows ex:bob >> ex:confidence 0.95 .` |
| Graph traversal (edge-based) | SurrealQL | `SELECT ->knows->person.name FROM person:alice` |
| Graph traversal (algorithm) | LPG JSON DSL | `{"kind": {"PageRank": {"damping": 0.85, ...}}}` |
| Shortest path | LPG JSON DSL | `{"kind": {"ShortestPath": {"start": {...}, "target": {...}}}}` |
| Vector similarity search | SurrealQL | `WHERE embedding <\|10,200\|> $query_vec` |
| Full-text search | SurrealQL | `WHERE title @1@ "knowledge graph"` |
| Full-text search (ES API) | ES Query DSL | `{"query": {"match": {"title": "knowledge graph"}}}` |
| Hybrid BM25 + vector | ES Query DSL | `{"query": {...}, "knn": {...}}` |
| Cross-model: RDF + document | Hybrid SurrealQL | `LET $rdf = SPARQL("SELECT ?s WHERE {…}"); SELECT … FROM employee WHERE id IN $rdf` |

---

## SPARQL 1.2

SPARQL is the W3C standard query language for RDF data. IndentiaDB implements SPARQL 1.1 plus the SPARQL 1.2 Working Draft features including RDF-star quoted triples, the `TRIPLE()` / `SUBJECT()` / `PREDICATE()` / `OBJECT()` function family, `LANGDIR()` for directional language tags, `SEMIJOIN`, and `ANTIJOIN`.

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?name ?age WHERE {
    ?person a foaf:Person ;
            foaf:name ?name ;
            foaf:age  ?age .
    FILTER (?age > 25)
}
ORDER BY ?name
```

**Endpoint:** `POST http://localhost:7001/sparql`
**Content-Type:** `application/sparql-query`

See the [SPARQL 1.2 Reference](sparql.md) for the complete guide.

---

## SurrealQL

SurrealQL is IndentiaDB's primary query language, used for relational records, documents, graph edges, vector search, and full-text search. It is a superset of SQL with extensions for graph traversal, record links, LIVE queries, event triggers, schema definitions, and vector operators.

```sql
-- Relational
SELECT name, department.name FROM employee WHERE salary > 50000 ORDER BY name;

-- Document
SELECT milestones[WHERE completed = false] AS pending FROM project;

-- Graph edge traversal
SELECT ->knows->person.name AS friends FROM person:alice;

-- Vector search
SELECT title, vector::similarity::cosine(embedding, $q) AS score
FROM document WHERE embedding <|10,200|> $q ORDER BY score DESC;
```

**Endpoint:** WebSocket `ws://localhost:7001/rpc` or HTTP `POST http://localhost:7001/sql`

See the [SurrealQL Reference](surrealql.md) for 25 complete examples.

---

## LPG JSON DSL

The LPG (Labeled Property Graph) JSON DSL is used to run graph algorithms over a projection of your RDF or document data. It accepts a JSON query body describing the algorithm and parameters.

```json
POST /lpg/query

{
  "kind": {
    "Traverse": {
      "start": { "iri": "http://example.org/alice" },
      "edge": "knows",
      "direction": "Out",
      "min_hops": 1,
      "max_hops": 3,
      "target_label": "Person"
    }
  },
  "limit": 100,
  "return_fields": ["id", "name", "hop_count"]
}
```

**Endpoint:** `POST http://localhost:7001/lpg/query`
**Content-Type:** `application/json`

See the [LPG Reference](lpg.md) for all algorithms and examples.

---

## GraphQL

IndentiaDB exposes a GraphQL endpoint that maps to your SurrealDB schema. Queries, mutations, and subscriptions are supported.

```graphql
query {
  employee(where: { salary: { gt: 80000 } }, orderBy: { salary: DESC }) {
    name
    salary
    department {
      name
      location
    }
  }
}
```

**Endpoint:** `GET/POST http://localhost:7001/graphql`
**Content-Type:** `application/json`

---

## Elasticsearch Query DSL

IndentiaDB listens on port 9200 and accepts the Elasticsearch Query DSL for full-text search and hybrid search operations. Existing applications using the ES client can point to IndentiaDB without code changes.

```bash
curl -X POST 'http://localhost:9200/article/_search' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "multi_match": {
        "query": "knowledge graph database",
        "fields": ["title^2", "body"],
        "fuzziness": "AUTO"
      }
    },
    "knn": {
      "field": "embedding",
      "query_vector": [0.021, -0.039, 0.085],
      "k": 10,
      "num_candidates": 200
    },
    "size": 10
  }'
```

**Port:** 9200
**Content-Type:** `application/json`

---

## Hybrid Queries (SPARQL inside SurrealQL)

The `SPARQL()` function in SurrealQL dispatches an inline SPARQL query and returns results as a SurrealQL value (array of objects). This allows you to bridge the RDF and document/relational models in a single statement.

```sql
LET $persons = SPARQL("
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?uri ?name WHERE {
        ?uri a foaf:Person ;
             foaf:name ?name .
    }
");

SELECT $p.name, e.salary
FROM employee AS e
WHERE e.external_uri IN (SELECT VALUE uri FROM $persons);
```

**Endpoint:** `POST http://localhost:7001/sql`

See [Hybrid Queries](hybrid-queries.md) for 5 complete cross-model examples including RDF-to-document migration, data enrichment, and RAG pipeline patterns.
