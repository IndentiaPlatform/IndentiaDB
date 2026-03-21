# LPG (Labeled Property Graph) Reference

IndentiaDB builds an in-memory Labeled Property Graph (LPG) from your RDF triples and document records. The LPG engine uses a **Compressed Sparse Row (CSR)** adjacency structure for efficient graph algorithm execution.

---

## What is LPG?

A Labeled Property Graph consists of:

- **Nodes** — entities with one or more labels (e.g., `"Person"`, `"Employee"`) and a set of key-value properties
- **Edges** — typed directed connections between nodes, optionally with properties

In IndentiaDB, LPG is a *projection* — not a separate store. The data lives in RDF triples or document tables; the LPG view is built from those sources on demand and updated incrementally.

**Sources:**

| Source | How it maps to LPG |
|--------|-------------------|
| RDF `rdf:type` triples | `?s rdf:type ?class` → node `?s` gets label `?class` |
| RDF non-type triples | `?s ?p ?o` where `?o` is a NamedNode → edge from `?s` to `?o` with type `?p` |
| RDF non-type triples | `?s ?p ?o` where `?o` is a Literal → node property `?p = ?o` on node `?s` |
| Document table record | Each record becomes a node; the table `label` config maps to a node label |
| Document IRI reference fields | Become edges to other nodes (RDF or document) |

**CSR Benefits:**

- O(1) neighbor lookup per node
- Cache-friendly sequential memory layout for BFS/DFS
- Efficient parallel algorithm execution (PageRank, connected components)

---

## Endpoint

```
POST http://localhost:7001/lpg/query
Content-Type: application/json
```

---

## Request Format

Every LPG query is a JSON object with three top-level fields:

```json
{
  "kind": { "<AlgorithmName>": { /* algorithm parameters */ } },
  "limit": 100,
  "return_fields": ["id", "name", "score"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | object | Yes | Algorithm name and parameters |
| `limit` | integer | No | Maximum number of results (default: 100) |
| `return_fields` | array of strings | No | Node properties to include in results |

**Node selector** (used in `start`, `target`):

```json
{ "iri": "http://example.org/alice" }
```

or

```json
{ "label": "Person", "filter": { "name": "Alice" } }
```

---

## Algorithms

| Algorithm | `kind` Key | Description |
|-----------|-----------|-------------|
| Traverse | `Traverse` | BFS traversal from a start node |
| Shortest path | `ShortestPath` | Dijkstra shortest path between two nodes |
| PageRank | `PageRank` | Compute PageRank scores |
| Connected components | `ConnectedComponents` | Find disconnected subgraphs |
| Neighbor count | `NeighborCount` | Count in/out/total degree of a node |

---

## Example 1: Label Scan (Find All Nodes with a Label)

Find every node that carries the label `"Person"` (derived from `rdf:type` triples pointing to a `Person` class).

**RDF setup:**

```sparql
PREFIX ex:   <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

INSERT DATA {
    ex:alice a foaf:Person ; foaf:name "Alice" .
    ex:bob   a foaf:Person ; foaf:name "Bob" .
    ex:acme  a ex:Company  ; ex:name "Acme Corp" .
}
```

**LPG query:**

```json
POST /lpg/query

{
  "kind": {
    "Traverse": {
      "start": { "label": "Person" },
      "edge": null,
      "direction": "Both",
      "min_hops": 0,
      "max_hops": 0,
      "target_label": "Person"
    }
  },
  "limit": 1000,
  "return_fields": ["id", "name"]
}
```

**Response:**

```json
{
  "results": [
    { "id": "http://example.org/alice", "name": "Alice", "hop_count": 0 },
    { "id": "http://example.org/bob",   "name": "Bob",   "hop_count": 0 }
  ]
}
```

Setting `min_hops: 0` and `max_hops: 0` returns the start nodes themselves — equivalent to a label scan.

---

## Example 2: Traverse with Filter (Outgoing Edges Matching Label)

Traverse outgoing `knows` edges from a hub node and return only nodes with the label `"Person"`.

**RDF setup:**

```sparql
PREFIX ex:   <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

INSERT DATA {
    ex:hub  a ex:Hub .
    ex:alice a foaf:Person ; foaf:name "Alice" .
    ex:bob   a foaf:Person ; foaf:name "Bob" .
    ex:repo  a ex:Repository ; ex:name "IndentiaDB" .

    ex:hub ex:link ex:alice .
    ex:hub ex:link ex:bob .
    ex:hub ex:link ex:repo .
}
```

**LPG query:**

```json
POST /lpg/query

{
  "kind": {
    "Traverse": {
      "start": { "iri": "http://example.org/hub" },
      "edge": "link",
      "direction": "Out",
      "min_hops": 1,
      "max_hops": 1,
      "target_label": "Person"
    }
  },
  "limit": 10,
  "return_fields": ["id", "name"]
}
```

**Response:** Two Person nodes (alice, bob). The Repository node is excluded by the `target_label` filter.

---

## Example 3: Bidirectional Traversal

Starting from node `b` in a chain `a → b → c`, traverse edges in both directions.

```json
POST /lpg/query

{
  "kind": {
    "Traverse": {
      "start": { "iri": "http://example.org/b" },
      "edge": "link",
      "direction": "Both",
      "min_hops": 1,
      "max_hops": 1,
      "target_label": "Node"
    }
  },
  "limit": 10,
  "return_fields": ["id"]
}
```

**Response:** Returns `a` (via incoming edge `a→b`) and `c` (via outgoing edge `b→c`).

The `direction` field accepts:
- `"Out"` — follow outgoing edges only
- `"In"` — follow incoming edges only
- `"Both"` — follow edges in both directions

---

## Example 4: Multi-Hop Depth-Limited Traversal

Traverse a chain `a → b → c → d` with up to 3 hops, returning the hop count per node.

**RDF setup:** `ex:a next ex:b ; ex:b next ex:c ; ex:c next ex:d` (all typed as `ex:Node`).

```json
POST /lpg/query

{
  "kind": {
    "Traverse": {
      "start": { "iri": "http://example.org/a" },
      "edge": "next",
      "direction": "Out",
      "min_hops": 1,
      "max_hops": 3,
      "target_label": "Node"
    }
  },
  "limit": 100,
  "return_fields": ["id", "hop_count"]
}
```

**Response:**

```json
{
  "results": [
    { "id": "http://example.org/b", "hop_count": 1 },
    { "id": "http://example.org/c", "hop_count": 2 },
    { "id": "http://example.org/d", "hop_count": 3 }
  ]
}
```

Set `min_hops: 2` to skip direct neighbors and return only nodes 2 or more hops away.

---

## Example 5: Shortest Path (Dijkstra)

Find the shortest path between two nodes. Returns the path length and the node IDs along the path.

**Graph:** `alice → bob → carol` (via `knows` edges).

```json
POST /lpg/query

{
  "kind": {
    "ShortestPath": {
      "start":  { "iri": "http://example.org/alice" },
      "target": { "iri": "http://example.org/carol" },
      "edge": "knows",
      "direction": "Out"
    }
  },
  "limit": 1,
  "return_fields": ["path", "length"]
}
```

**Response:**

```json
{
  "results": [
    {
      "path": [
        "http://example.org/alice",
        "http://example.org/bob",
        "http://example.org/carol"
      ],
      "length": 2
    }
  ]
}
```

**Disconnected nodes:** If no path exists, the result array is empty.

```json
{
  "kind": {
    "ShortestPath": {
      "start":  { "iri": "http://example.org/alice" },
      "target": { "iri": "http://example.org/z" },
      "edge": null,
      "direction": "Out"
    }
  },
  "limit": 1,
  "return_fields": []
}
```

Response: `{ "results": [] }`

Set `"edge": null` to traverse any edge type. Set a specific edge name to restrict the path to that edge type only.

---

## Example 6: PageRank Algorithm

Compute PageRank over the projected graph. The hub-and-spoke example: 5 spoke nodes all point to one hub.

**RDF setup:** `s1→hub, s2→hub, s3→hub, s4→hub, s5→hub` (all via `link` edges; all typed as `Node`).

```json
POST /lpg/query

{
  "kind": {
    "PageRank": {
      "damping": 0.85,
      "max_iterations": 100,
      "tolerance": 1e-8,
      "label_filter": null
    }
  },
  "limit": 100,
  "return_fields": ["id", "score"]
}
```

**Response (abbreviated):**

```json
{
  "results": [
    { "id": "http://example.org/hub", "score": 0.4816 },
    { "id": "http://example.org/s1",  "score": 0.1037 },
    { "id": "http://example.org/s2",  "score": 0.1037 },
    { "id": "http://example.org/s3",  "score": 0.1037 },
    { "id": "http://example.org/s4",  "score": 0.1037 },
    { "id": "http://example.org/s5",  "score": 0.1037 }
  ]
}
```

All scores sum to approximately 1.0. The hub has the highest score because all spokes point to it.

**Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `damping` | float | Damping factor (teleportation probability = 1 - damping) | 0.85 |
| `max_iterations` | integer | Maximum number of power iterations | 100 |
| `tolerance` | float | Convergence threshold (stop when max delta < tolerance) | 1e-6 |
| `label_filter` | string or null | Restrict to nodes with this label; null = all nodes | null |

---

## Example 7: Connected Components

Find disconnected subgraphs in the projected graph.

**Graph:** Three islands:
- Island 1: `a ↔ b` (via undirected `link`)
- Island 2: `c ↔ d ↔ e`
- Island 3: `f` (isolated — only has `rdf:type`)

```json
POST /lpg/query

{
  "kind": {
    "ConnectedComponents": {
      "label_filter": null
    }
  },
  "limit": 100,
  "return_fields": ["id", "component_id"]
}
```

**Response (abbreviated):**

```json
{
  "results": [
    { "id": "http://example.org/a", "component_id": 0 },
    { "id": "http://example.org/b", "component_id": 0 },
    { "id": "http://example.org/c", "component_id": 1 },
    { "id": "http://example.org/d", "component_id": 1 },
    { "id": "http://example.org/e", "component_id": 1 },
    { "id": "http://example.org/f", "component_id": 2 }
  ],
  "component_count": 3
}
```

Nodes in the same component share a `component_id`. The largest component (c-d-e) has 3 members.

Use `label_filter` to restrict the analysis to a specific node type:

```json
{
  "kind": {
    "ConnectedComponents": {
      "label_filter": "Person"
    }
  },
  "limit": 100,
  "return_fields": ["id", "component_id"]
}
```

---

## Example 8: Neighbor Count Aggregation

Count in-degree, out-degree, or total degree of a specific node.

**Graph:** Star topology — `hub→a, hub→b, hub→c, a→hub`.

```json
POST /lpg/query

{
  "kind": {
    "NeighborCount": {
      "start": { "iri": "http://example.org/hub" },
      "direction": "Out",
      "edge": null
    }
  },
  "limit": 1,
  "return_fields": ["count"]
}
```

**Response:** `{ "results": [{ "count": 3 }] }` — hub has 3 outgoing edges.

```json
{
  "kind": { "NeighborCount": { "start": {"iri": "http://example.org/hub"}, "direction": "In",   "edge": null } }
}
```
**Response:** `count = 1` (only `a→hub`)

```json
{
  "kind": { "NeighborCount": { "start": {"iri": "http://example.org/hub"}, "direction": "Both", "edge": null } }
}
```
**Response:** `count = 4` (3 out + 1 in)

Set `"edge": "knows"` to count only edges of a specific type.

---

## Example 9: Combined RDF-to-LPG Projection

Build an LPG from RDF triples and combine both traverse and shortest path queries.

**Full working example:**

```sparql
# Step 1: Insert RDF social graph
PREFIX ex:   <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

INSERT DATA {
    ex:alice a foaf:Person ; foaf:name "Alice" .
    ex:bob   a foaf:Person ; foaf:name "Bob" .
    ex:carol a foaf:Person ; foaf:name "Carol" .
    ex:dave  a foaf:Person ; foaf:name "Dave" .

    ex:alice foaf:knows ex:bob .
    ex:bob   foaf:knows ex:carol .
    ex:carol foaf:knows ex:dave .
    ex:alice foaf:knows ex:dave .
}
```

```json
// Step 2a: 1-hop traverse from Alice
POST /lpg/query
{
  "kind": {
    "Traverse": {
      "start":        { "iri": "http://example.org/alice" },
      "edge":         "knows",
      "direction":    "Out",
      "min_hops":     1,
      "max_hops":     1,
      "target_label": "Person"
    }
  },
  "limit": 10,
  "return_fields": ["id", "name", "hop_count"]
}
// Result: bob (1 hop), dave (1 hop)
```

```json
// Step 2b: 2-hop traverse (friends-of-friends)
POST /lpg/query
{
  "kind": {
    "Traverse": {
      "start":        { "iri": "http://example.org/alice" },
      "edge":         "knows",
      "direction":    "Out",
      "min_hops":     1,
      "max_hops":     2,
      "target_label": "Person"
    }
  },
  "limit": 10,
  "return_fields": ["id", "name", "hop_count"]
}
// Result: bob (1 hop), dave (1 hop), carol (2 hops)
```

```json
// Step 2c: Shortest path from Alice to Carol
POST /lpg/query
{
  "kind": {
    "ShortestPath": {
      "start":     { "iri": "http://example.org/alice" },
      "target":    { "iri": "http://example.org/carol" },
      "edge":      "knows",
      "direction": "Out"
    }
  },
  "limit": 1,
  "return_fields": ["path", "length"]
}
// Result: path = [alice, bob, carol], length = 2
```

---

## Example 10: Incremental RDF Delta to LPG

The LPG projection updates incrementally when RDF data changes. You do not need to rebuild the entire graph.

**Scenario:** Alice is an Employee in the HR document table. She gains a new `Manager` label from an RDF triple insertion.

**Initial state (SurrealQL document):**

```sql
DEFINE TABLE hr_employee SCHEMALESS;
CREATE hr_employee:alice CONTENT {
    name:         "Alice van den Berg",
    rdf_iri:      "http://example.org/alice",
    department:   "Engineering",
    salary:       85000,
    colleague_iri: "http://example.org/bob"
};
```

**LPG projection config:**

```json
{
  "document_rules": [{
    "table":          "hr_employee",
    "label":          "Employee",
    "iri_field":      "rdf_iri",
    "include_fields": ["name", "department", "salary", "rdf_iri"],
    "edge_fields": [{
      "field":     "colleague_iri",
      "edge_type": "colleague"
    }]
  }]
}
```

After projection, Alice has label `["Employee"]` with properties `{name, department, salary}`.

**RDF delta: add Manager label**

```sparql
PREFIX ex: <http://example.org/>

INSERT DATA {
    ex:alice a ex:Manager .
}
```

After the delta, Alice has labels `["Employee", "Manager"]`. Document properties are preserved. No full rebuild is required.

**Verification traverse:**

```json
POST /lpg/query
{
  "kind": {
    "Traverse": {
      "start":        { "iri": "http://example.org/alice" },
      "edge":         "colleague",
      "direction":    "Out",
      "min_hops":     1,
      "max_hops":     1,
      "target_label": "Employee"
    }
  },
  "limit": 10,
  "return_fields": ["id", "name", "department"]
}
```

Alice's `colleague_iri` field created an edge to Bob. The result returns Bob's name and department from the document table.

---

## ACL and Security

LPG query results are filtered by the caller's security context. Nodes the caller does not have `read` permission on are excluded from traversal results, PageRank scores, and connected component assignments.

- Admin callers see all nodes
- Non-admin callers see only nodes they have explicit `read` permission for (per IRI or per named graph)
- Nodes excluded by ACL do not appear in result arrays; they are also skipped during traversal (so a path that would pass through a denied node appears as disconnected)

See the [Security section](../security/index.md) for how to configure permissions.

---

## Full LPG JSON DSL Reference

### Traverse Parameters

```json
{
  "kind": {
    "Traverse": {
      "start":        { "iri": "<IRI>" },
      "edge":         "<edge_type or null>",
      "direction":    "Out | In | Both",
      "min_hops":     1,
      "max_hops":     5,
      "target_label": "<label or null>"
    }
  },
  "limit":         100,
  "return_fields": ["id", "name", "hop_count"]
}
```

### ShortestPath Parameters

```json
{
  "kind": {
    "ShortestPath": {
      "start":     { "iri": "<IRI>" },
      "target":    { "iri": "<IRI>" },
      "edge":      "<edge_type or null>",
      "direction": "Out | In | Both"
    }
  },
  "limit":         1,
  "return_fields": ["path", "length"]
}
```

### PageRank Parameters

```json
{
  "kind": {
    "PageRank": {
      "damping":        0.85,
      "max_iterations": 100,
      "tolerance":      1e-6,
      "label_filter":   "<label or null>"
    }
  },
  "limit":         1000,
  "return_fields": ["id", "score"]
}
```

### ConnectedComponents Parameters

```json
{
  "kind": {
    "ConnectedComponents": {
      "label_filter": "<label or null>"
    }
  },
  "limit":         10000,
  "return_fields": ["id", "component_id"]
}
```

### NeighborCount Parameters

```json
{
  "kind": {
    "NeighborCount": {
      "start":     { "iri": "<IRI>" },
      "direction": "Out | In | Both",
      "edge":      "<edge_type or null>"
    }
  },
  "limit":         1,
  "return_fields": ["count"]
}
```
