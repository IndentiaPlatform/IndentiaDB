# Locy Logic Programming

Locy is a Datalog-with-Cypher-syntax logic programming language built into IndentiaDB. It allows you to define recursive inference rules over the LPG projection of your data and derive new facts using bottom-up fixpoint evaluation.

Use Locy when:
- You need **recursive reachability** (transitive closure, multi-hop reachability)
- You want to derive **new facts** from existing graph patterns
- You need **aggregated inference** (count followers-of-followers, sum costs along a path)
- You want **stratified negation** (derive facts about what is *not* connected)

---

## Endpoint

```
POST http://localhost:7001/locy/query
Authorization: Bearer <token>
Content-Type: application/json
```

---

## Request Format

```json
{
  "program": "CREATE RULE … YIELD …\nQUERY …",
  "max_iterations": 1000,
  "timeout_ms": 30000
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `program` | string | Required | Locy source program |
| `max_iterations` | integer | 1000 | Maximum fixpoint iterations per recursive stratum |
| `timeout_ms` | integer | 30000 | Overall evaluation timeout in milliseconds |

---

## Response Format

```json
{
  "derived": {
    "reachable": [
      { "n": "http://example.org/alice", "m": "http://example.org/carol" },
      { "n": "http://example.org/alice", "m": "http://example.org/dave" }
    ],
    "reachable$query": [
      { "n": "http://example.org/alice", "m": "http://example.org/carol" }
    ]
  },
  "warnings": [],
  "total_facts": 5,
  "timed_out": false
}
```

The `derived` object contains one key per rule name. When a `QUERY` command is present, its filtered results are stored under `"<rule_name>$query"`.

---

## Language Reference

### CREATE RULE

Defines an inference rule. Multiple clauses with the same name produce a union (OR semantics).

```cypher
CREATE RULE <name> AS
  MATCH <pattern>
  [WHERE <condition> [AND <condition> ...]]
  [FOLD <binding> = <aggregate_fn>(<expr>) OVER <pattern>]
  YIELD KEY <expr> [, <expr> ...]
```

**Example — direct edge rule:**

```cypher
CREATE RULE knows AS
  MATCH (n:Person)-[:KNOWS]->(m:Person)
  YIELD KEY n, m
```

**Example — base + recursive rule (two clauses, same name):**

```cypher
CREATE RULE reachable AS
  MATCH (n:Person)-[:KNOWS]->(m:Person)
  YIELD KEY n, m

CREATE RULE reachable AS
  MATCH (n:Person)-[:KNOWS]->(mid:Person)
  WHERE mid IS reachable TO m
  YIELD KEY n, m
```

The second clause uses `IS reachable TO m` — a join against derived facts from the previous stratum/iteration, binding the variable `m` to the matched target column.

---

### MATCH Pattern

Locy MATCH patterns follow OpenCypher syntax:

```cypher
MATCH (n:Label)                         -- single node
MATCH (n:Label)-[:TYPE]->(m:Label)      -- single hop
MATCH (a)-[:T1]->(b)-[:T2]->(c)         -- chained hops
```

Property filters inside patterns (`{name: "Alice"}`) are passed to the WHERE clause. Node and edge variables bound in MATCH are available in WHERE and YIELD.

---

### WHERE Conditions

Standard expression filters and IS-references:

```cypher
WHERE n.age > 18
WHERE n.name = "Alice"
WHERE n IS connected                    -- filter: n must appear in 'connected'
WHERE NOT n IS isolated                 -- negation
WHERE mid IS reachable TO m             -- join: bind m from 'reachable' where subject=mid
```

**IS reference semantics:**

| Syntax | Meaning |
|--------|---------|
| `x IS rule` | Keep rows where x appears in the first column of rule's facts |
| `NOT x IS rule` | Keep rows where x does NOT appear in rule's facts (stratified negation) |
| `x IS rule TO y` | Join: bind y to the matching target column in rule's facts |

---

### YIELD KEY

Specifies the output columns of a rule. `KEY` marks the columns that form the identity of a derived fact (used for duplicate elimination and IS-reference matching).

```cypher
YIELD KEY n, m                          -- n and m form the key
YIELD KEY n, m, count                   -- three-column key
```

---

### FOLD Aggregations

Aggregates values over a sub-pattern before yielding:

```cypher
CREATE RULE friend_count AS
  MATCH (n:Person)
  FOLD count = COUNT(m) OVER MATCH (n)-[:KNOWS]->(m)
  YIELD KEY n, count
```

| Function | Description |
|----------|-------------|
| `COUNT(x)` | Number of matched rows |
| `SUM(x)` | Numeric sum of x |
| `AVG(x)` | Numeric average of x |
| `MIN(x)` | Minimum value of x |
| `MAX(x)` | Maximum value of x |
| `COLLECT(x)` | Array of all non-null x values |

---

### QUERY Command

Filters derived facts from a named rule and stores results under `"<rule>$query"`:

```cypher
QUERY reachable                         -- all facts from 'reachable'
QUERY reachable WHERE m.department = "Engineering"
QUERY friend_count WHERE count > 5
```

---

## Examples

### Transitive Reachability

Find all persons reachable from any person through KNOWS edges:

```cypher
CREATE RULE reachable AS
  MATCH (n:Person)-[:KNOWS]->(m:Person)
  YIELD KEY n, m

CREATE RULE reachable AS
  MATCH (n:Person)-[:KNOWS]->(mid:Person)
  WHERE mid IS reachable TO m
  YIELD KEY n, m

QUERY reachable
```

```bash
curl -X POST http://localhost:7001/locy/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "program": "CREATE RULE reachable AS MATCH (n:Person)-[:KNOWS]->(m:Person) YIELD KEY n, m\nCREATE RULE reachable AS MATCH (n:Person)-[:KNOWS]->(mid:Person) WHERE mid IS reachable TO m YIELD KEY n, m\nQUERY reachable",
    "timeout_ms": 10000
  }'
```

---

### Stratified Negation

Find nodes that have no outgoing edges (isolated nodes):

```cypher
CREATE RULE has_outgoing AS
  MATCH (n)-[:EDGE]->(m)
  YIELD KEY n

CREATE RULE isolated AS
  MATCH (n)
  WHERE NOT n IS has_outgoing
  YIELD KEY n

QUERY isolated
```

---

### Counting Followers

Count the number of direct followers per person:

```cypher
CREATE RULE follower_count AS
  MATCH (n:Person)
  FOLD count = COUNT(f) OVER MATCH (f:Person)-[:FOLLOWS]->(n)
  YIELD KEY n, count

QUERY follower_count WHERE count > 100
```

---

### Multi-Hop Influence Score

Derive a custom "influence" score by joining direct and transitive reaches:

```cypher
CREATE RULE direct_reach AS
  MATCH (n:Person)-[:KNOWS]->(m:Person)
  YIELD KEY n, m

CREATE RULE transitive_reach AS
  MATCH (n:Person)-[:KNOWS]->(mid:Person)
  WHERE mid IS transitive_reach TO m
  YIELD KEY n, m

CREATE RULE influence AS
  MATCH (n:Person)
  FOLD direct   = COUNT(d) OVER (n IS direct_reach TO d)
  FOLD transitive = COUNT(t) OVER (n IS transitive_reach TO t)
  YIELD KEY n, direct, transitive

QUERY influence
```

---

### Cycle Detection via Rules

Detect nodes that are part of a cycle:

```cypher
CREATE RULE reachable AS
  MATCH (n)-[:EDGE]->(m)
  YIELD KEY n, m

CREATE RULE reachable AS
  MATCH (n)-[:EDGE]->(mid)
  WHERE mid IS reachable TO m
  YIELD KEY n, m

CREATE RULE in_cycle AS
  MATCH (n)
  WHERE n IS reachable TO n
  YIELD KEY n

QUERY in_cycle
```

---

## Evaluation Model

Locy uses **bottom-up fixpoint evaluation** with topological stratification:

1. Rules are compiled into strata based on their dependency graph.
2. Non-recursive strata are evaluated in a single pass.
3. Recursive strata iterate until no new facts are produced (fixpoint) or `max_iterations` is reached.
4. IS-references within a stratum resolve against the current derived-fact set (earlier iterations).
5. Negation (`NOT IS`) is only allowed between strata (stratified negation): a rule may not negate a fact derived in the same stratum.

**Guaranteed termination** for programs with only monotone rules (no negation) on finite graphs — the Herbrand base is finite.

---

## ACL Behaviour

- **Read permission** is required. Returns `401` without a valid token; `403` if the actor lacks read permission.
- The full LPG projection is loaded for evaluation. Result facts are not filtered at the row level — the program sees all nodes and edges the LPG projection contains.
- If your actor has restricted graph access (graph-level ACL), only the visible portion of the LPG is loaded, so derived facts will only reflect accessible nodes and edges.

---

## Supported vs. Planned Features

| Feature | Status |
|---------|--------|
| `CREATE RULE … MATCH … WHERE … YIELD KEY` | ✅ |
| Multi-clause rules (union semantics) | ✅ |
| Recursive rules with fixpoint iteration | ✅ |
| IS reference filter (`x IS rule`) | ✅ |
| IS reference join (`x IS rule TO y`) | ✅ |
| Stratified negation (`NOT x IS rule`) | ✅ |
| FOLD aggregations (COUNT/SUM/AVG/MIN/MAX/COLLECT) | ✅ |
| QUERY command with WHERE filter | ✅ |
| Multi-hop MATCH patterns | ✅ |
| ASSUME blocks (abductive reasoning) | Planned |
| ABDUCE queries | Planned |
| ALONG (path-carried values) | Planned |
| BEST BY optimisation | Planned |
| Probabilistic rules (MNOR/MPROD) | Planned |
| EXPLAIN RULE provenance trees | Planned |
