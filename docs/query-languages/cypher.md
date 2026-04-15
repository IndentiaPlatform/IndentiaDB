# OpenCypher Reference

IndentiaDB supports a growing subset of openCypher for querying and mutating the LPG (Labeled Property Graph) projection of your data. Cypher queries are sent to the LPG engine, which evaluates them against the in-memory CSR graph built from your RDF triples and document records.

---

## Endpoint

```
POST http://localhost:7001/lpg/cypher
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "query": "MATCH (n:Person) RETURN n.name, n.age ORDER BY n.age DESC LIMIT 10"
}
```

---

## Read Queries

### MATCH … WHERE … RETURN

```cypher
MATCH (n:Person)
WHERE n.age > 25
RETURN n.name, n.age
ORDER BY n.age DESC
LIMIT 20
```

```cypher
MATCH (n:Person)-[:KNOWS]->(m:Person)
WHERE n.name = "Alice"
RETURN m.name, m.city
```

```cypher
-- Chained hops
MATCH (a:Person)-[:KNOWS]->(b:Person)-[:WORKS_AT]->(c:Company)
WHERE c.name = "Acme"
RETURN a.name, b.name, c.city
```

**Supported clauses:** `MATCH`, `WHERE`, `RETURN`, `ORDER BY`, `LIMIT`, `SKIP`

**Node patterns:**
- `(n)` — any node
- `(n:Label)` — node with label
- `(n:Label {property: "value"})` — node with label and property filter

**Relationship patterns:**
- `-[:TYPE]->` — outgoing
- `<-[:TYPE]-` — incoming
- `-[:TYPE]-` — undirected

---

## Aggregations

Aggregation functions are available in `RETURN`:

```cypher
MATCH (n:Person)
RETURN count(n) AS total_persons

MATCH (n:Person)
RETURN n.department, count(n) AS headcount, avg(n.salary) AS avg_salary
ORDER BY headcount DESC
```

```cypher
MATCH (n:Document)
RETURN
  sum(n.word_count)    AS total_words,
  avg(n.word_count)    AS avg_words,
  min(n.published_at)  AS earliest,
  max(n.published_at)  AS latest,
  collect(n.title)     AS all_titles
```

| Function | Description |
|----------|-------------|
| `count(x)` | Number of non-null values |
| `sum(x)` | Numeric sum |
| `avg(x)` | Numeric average |
| `min(x)` | Minimum (numeric or string) |
| `max(x)` | Maximum (numeric or string) |
| `collect(x)` | Array of all non-null values |

---

## Write Operations

Write operations require **write permission**. Requests with only read permission return `403`.

### CREATE — Create Nodes

```cypher
CREATE (n:Person {name: "Alice", age: 30, email: "alice@example.org"})
```

```cypher
CREATE (n:Company {name: "Acme", founded: 1990})
```

Multiple nodes in one statement:

```cypher
CREATE
  (a:Person {name: "Alice"}),
  (b:Person {name: "Bob"})
```

### CREATE — Create Relationships

```cypher
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2022, strength: "close"}]->(b)
```

```cypher
MATCH (p:Person {name: "Alice"}), (c:Company {name: "Acme"})
CREATE (p)-[:WORKS_AT {role: "Engineer", start_year: 2020}]->(c)
```

### MERGE — Upsert Nodes

`MERGE` finds an existing node matching the pattern or creates it if it does not exist. Use `ON CREATE SET` and `ON MATCH SET` to handle each case:

```cypher
MERGE (n:Person {email: "alice@example.org"})
ON CREATE SET n.created_at = timestamp(), n.status = "new"
ON MATCH  SET n.last_seen  = timestamp()
RETURN n
```

```cypher
-- Idempotent node creation
MERGE (c:Company {vat_id: "NL123456789B01"})
ON CREATE SET c.name = "NewCo", c.created = date()
```

### MERGE — Upsert Relationships

```cypher
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
MERGE (a)-[:KNOWS]->(b)
ON CREATE SET r.since = date()
```

### SET — Update Properties

```cypher
MATCH (n:Person {name: "Alice"})
SET n.verified = true, n.score = 42.5
```

```cypher
MATCH (n:Person)
WHERE n.age < 18
SET n.status = "minor"
```

### DELETE — Remove Nodes and Relationships

```cypher
-- Delete a relationship
MATCH (a:Person {name: "Alice"})-[r:KNOWS]->(b:Person {name: "Bob"})
DELETE r
```

```cypher
-- Delete a node (must have no relationships first)
MATCH (n:Person {name: "Deprecated"})
DELETE n
```

```cypher
-- Detach delete: remove node and all its relationships
MATCH (n:Person {name: "Deprecated"})
DETACH DELETE n
```

---

## Examples

### Find mutual connections

```cypher
MATCH (a:Person)-[:KNOWS]->(b:Person)<-[:KNOWS]-(c:Person)
WHERE a.name = "Alice" AND c.name = "Charlie"
  AND a <> c
RETURN b.name AS mutual_friend
```

### Count connections per node

```cypher
MATCH (n:Person)-[:KNOWS]->(m:Person)
RETURN n.name, count(m) AS friend_count
ORDER BY friend_count DESC
LIMIT 10
```

### Create a complete sub-graph

```cypher
CREATE
  (alice:Person {name: "Alice", age: 30}),
  (bob:Person   {name: "Bob",   age: 25}),
  (acme:Company {name: "Acme"}),
  (alice)-[:KNOWS]->(bob),
  (alice)-[:WORKS_AT {role: "Lead"}]->(acme),
  (bob)-[:WORKS_AT   {role: "Engineer"}]->(acme)
```

### Merge and update user profile

```cypher
MERGE (u:User {email: "alice@example.org"})
ON CREATE SET
  u.name       = "Alice",
  u.created_at = timestamp(),
  u.login_count = 0
ON MATCH SET
  u.last_login  = timestamp(),
  u.login_count = u.login_count + 1
RETURN u.name, u.login_count
```

### Aggregation with filtering

```cypher
MATCH (n:Document)-[:TAGGED]->(t:Tag)
WITH t.name AS tag, collect(n.title) AS docs, count(n) AS doc_count
WHERE doc_count >= 5
RETURN tag, doc_count, docs
ORDER BY doc_count DESC
```

### Cleanup stale records

```cypher
MATCH (n:Session)
WHERE n.expires_at < timestamp()
DETACH DELETE n
```

---

## ACL Behaviour

### Read queries

- **Read permission** required. Returns `401` without a valid token; `403` if the actor lacks read permission.
- Nodes and relationships not visible to the actor are excluded from MATCH results transparently.

### Write queries (CREATE, MERGE, SET, DELETE)

- **Write permission** required. Returns `403` if the actor only has read permission.
- Attempting to mutate a node or relationship that the actor cannot see returns `403`.
- All writes are applied to the LPG projection and persisted to the underlying SurrealDB store.

---

## Supported Language Features

| Feature | Status |
|---------|--------|
| `MATCH (n)` / `(n:Label)` | ✅ |
| `MATCH (n)-[:TYPE]->(m)` | ✅ |
| Chained hops | ✅ |
| `WHERE` filter expressions | ✅ |
| `RETURN` with aliases | ✅ |
| `ORDER BY` / `LIMIT` / `SKIP` | ✅ |
| `count()` / `sum()` / `avg()` / `min()` / `max()` / `collect()` | ✅ |
| `CREATE (node)` | ✅ |
| `CREATE (a)-[:TYPE]->(b)` | ✅ |
| `MERGE` with `ON CREATE SET` / `ON MATCH SET` | ✅ |
| `SET n.prop = value` | ✅ |
| `DELETE` / `DETACH DELETE` | ✅ |
| Variable-length paths `[:TYPE*1..3]` | Planned |
| `WITH` intermediate projections | Planned |
| `UNWIND` | Planned |
| `FOREACH` | Planned |
| `CALL` subqueries | Planned |
