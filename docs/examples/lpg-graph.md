# Labeled Property Graph (LPG) Examples

IndentiaDB projects RDF triples and document tables into an in-memory LPG for graph algorithms and traversals. The LPG engine supports traverse queries, shortest path, PageRank, connected components, and neighbor counting — all integrated with the ACL security layer.

---

## Table of Contents

### LPG from RDF

1. [Label Scan (Match Nodes by Label)](#1-label-scan)
2. [Traverse with Property Filter](#2-traverse-with-property-filter)
3. [Bidirectional Traversal](#3-bidirectional-traversal)
4. [Multi-Hop Depth Traversal](#4-multi-hop-depth-traversal)
5. [Shortest Path (No Path Case)](#5-shortest-path-no-path)
6. [PageRank (Hub-and-Spoke)](#6-pagerank-hub-and-spoke)
7. [Connected Components](#7-connected-components)
8. [Neighbor Count (Degree)](#8-neighbor-count)

### LPG from Documents

9. [Document Table Projection](#9-document-table-projection)
10. [Incremental RDF Delta](#10-incremental-rdf-delta)

### Multi-Model LPG

11. [RDF-to-LPG Projection (Traverse, ShortestPath)](#11-rdf-to-lpg-projection)
12. [PageRank and Connected Components via CSR](#12-pagerank-and-connected-components-via-csr)
13. [Combined Document + RDF Projection](#13-combined-document-and-rdf-projection)
14. [Incremental Updates (RDF Delta + Document Delta)](#14-incremental-updates)

### ACL Integration

15. [Admin Sees All](#15-admin-sees-all)
16. [Deny Policy Blocks Non-Admin](#16-deny-policy-blocks-non-admin)
17. [Per-IRI Permission Cache](#17-per-iri-permission-cache)
18. [Graph-Level Default Permission](#18-graph-level-default-permission)

### CSR Graph Algorithms

19. [PageRank Convergence (Larger Graph)](#19-pagerank-convergence)
20. [Connected Components with Label Filter](#20-connected-components-with-label-filter)

---

## How LPG Projection Works

The LPG engine reads from two sources:

1. **RDF triples** — `rdf:type` triples become node labels; other predicates become edges or properties
2. **Document tables** — configured via `LpgProjectionConfig` with rules mapping tables to labels and fields to edges

Queries use a JSON DSL with `LpgQuery` and `LpgQueryKind` variants.

---

## LPG from RDF

### 1. Label Scan

Match all nodes that carry a specific label (derived from `rdf:type` triples).

**RDF data:**

```sql
-- Insert rdf:type triples to assign labels
CREATE triples CONTENT { subject: {"_rdf_type":"NamedNode","iri":"http://example.org/alice"}, predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", object: {"_rdf_type":"NamedNode","iri":"http://example.org/Person"}, graph: "default" };
CREATE triples CONTENT { subject: {"_rdf_type":"NamedNode","iri":"http://example.org/bob"}, predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", object: {"_rdf_type":"NamedNode","iri":"http://example.org/Person"}, graph: "default" };
CREATE triples CONTENT { subject: {"_rdf_type":"NamedNode","iri":"http://example.org/acme"}, predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", object: {"_rdf_type":"NamedNode","iri":"http://example.org/Company"}, graph: "default" };
```

**LPG query (JSON DSL):**

```json
// After projection, filter nodes by label:
// graph.nodes where labels contains "Person" -> alice, bob
// graph.nodes where labels contains "Company" -> acme
```

**Expected:** 2 Person nodes, 1 Company node.

### 2. Traverse with Property Filter

Traverse outgoing edges and filter target nodes by label.

**LPG query:**

```json
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

**Expected:** Returns the 2 Person nodes linked from hub, with their `name` property.

### 3. Bidirectional Traversal

Traverse edges in both directions from a node.

**RDF data:** a -> b -> c (chain via `link` edges)

**LPG query:**

```json
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

**Expected:** Returns `a` (via incoming edge) and `c` (via outgoing edge).

### 4. Multi-Hop Depth Traversal

Traverse up to N hops with hop count per result.

**RDF data:** Chain a -> b -> c -> d (via `next` edges)

**LPG query:**

```json
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
  "limit": 10,
  "return_fields": ["id", "hop_count"]
}
```

**Expected:** b (hop 1), c (hop 2), d (hop 3).

### 5. Shortest Path (No Path)

When no path exists between disconnected nodes, the result is empty.

**LPG query:**

```json
{
  "kind": {
    "ShortestPath": {
      "start": { "iri": "http://example.org/a" },
      "target": { "iri": "http://example.org/z" },
      "edge": null,
      "direction": "Out"
    }
  },
  "limit": 1,
  "return_fields": []
}
```

**Expected:** Empty result (nodes a and z are disconnected).

### 6. PageRank (Hub-and-Spoke)

Compute PageRank on a graph where 5 spoke nodes all point to a hub.

**RDF data:** s1->hub, s2->hub, s3->hub, s4->hub, s5->hub

**LPG query:**

```json
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
  "return_fields": []
}
```

**Expected:** Hub node has the highest PageRank score. All scores sum to approximately 1.0.

### 7. Connected Components

Find disconnected subgraphs in the data.

**RDF data:** Three islands:

- Island 1: a -- b (via link)
- Island 2: c -- d -- e (via link)
- Island 3: f (isolated, only has rdf:type)

**LPG query:**

```json
{
  "kind": {
    "ConnectedComponents": {
      "label_filter": null
    }
  },
  "limit": 100,
  "return_fields": []
}
```

**Expected:** At least 3 connected components. The largest component (c-d-e) has 3+ members.

### 8. Neighbor Count

Count in-degree, out-degree, or total degree of a node.

**RDF data:** Star graph: hub->a, hub->b, hub->c, a->hub

**LPG queries:**

```json
// Out-degree of hub
{ "kind": { "NeighborCount": { "start": {"iri":"http://example.org/hub"}, "direction": "Out", "edge": null } } }
// Result: count = 3

// In-degree of hub
{ "kind": { "NeighborCount": { "start": {"iri":"http://example.org/hub"}, "direction": "In", "edge": null } } }
// Result: count = 1 (only a->hub)

// Both-degree of hub
{ "kind": { "NeighborCount": { "start": {"iri":"http://example.org/hub"}, "direction": "Both", "edge": null } } }
// Result: count = 4
```

---

## LPG from Documents

### 9. Document Table Projection

Project SurrealDB document tables into LPG nodes with edges derived from IRI reference fields.

**SurrealQL setup:**

```sql
DEFINE TABLE product SCHEMALESS;
CREATE product:laptop CONTENT {
    name: "Laptop Pro",
    category: "Electronics",
    manufacturer_iri: "http://example.org/acme"
};
CREATE product:phone CONTENT {
    name: "SmartPhone X",
    category: "Electronics",
    manufacturer_iri: "http://example.org/acme"
};
CREATE product:book CONTENT {
    name: "Rust in Action",
    category: "Books",
    manufacturer_iri: "http://example.org/publisher1"
};
```

**Projection config:**

```json
{
  "document_rules": [{
    "table": "product",
    "label": "Product",
    "include_fields": ["name", "category"],
    "edge_fields": [{
      "field": "manufacturer_iri",
      "edge_type": "manufactured_by"
    }]
  }]
}
```

**Result:** 3 Product nodes + 2 Company nodes (from RDF), connected by 3 `manufactured_by` edges.

### 10. Incremental RDF Delta

Apply an incremental RDF update (e.g., from SPARQL INSERT DATA) without rebuilding the entire projection.

**SPARQL update:**

```sparql
PREFIX ex: <http://example.org/>
INSERT DATA {
    ex:alice a ex:Manager .
}
```

**Result after delta:** Alice retains her existing Employee label (from document projection) and gains a new Manager label (from the RDF delta). Document properties like `name` are preserved.

---

## Multi-Model LPG

### 11. RDF-to-LPG Projection

Build an LPG from RDF triples and query with traverse and shortest path.

**RDF data:** Social graph — alice knows bob, bob knows carol (all typed as Person).

**1-hop traverse from alice (edge: knows, direction: Out):**

```json
{
  "kind": {
    "Traverse": {
      "start": { "iri": "http://example.org/alice" },
      "edge": "knows",
      "direction": "Out",
      "min_hops": 1,
      "max_hops": 1,
      "target_label": "Person"
    }
  },
  "limit": 10,
  "return_fields": ["id", "hop_count"]
}
```

**Result:** bob (1 hop)

**2-hop traverse (friends-of-friends):**
Same query with `max_hops: 2`. **Result:** bob (1 hop) and carol (2 hops).

**Shortest path alice -> carol:**

```json
{
  "kind": {
    "ShortestPath": {
      "start": { "iri": "http://example.org/alice" },
      "target": { "iri": "http://example.org/carol" },
      "edge": "knows",
      "direction": "Out"
    }
  },
  "limit": 1,
  "return_fields": []
}
```

**Result:** path length = 2 (alice -> bob -> carol)

### 12. PageRank and Connected Components via CSR

The CSR (Compressed Sparse Row) representation enables efficient graph algorithms.

```
// Build CSR from projected graph
let csr = CsrGraph::from_graph(&graph);

// PageRank (damping=0.85, max_iter=20, tolerance=1e-6)
let scores = csr.pagerank(0.85, 20, 1e-6, None);
// Scores sum to ~1.0

// Connected components filtered by label
let components = csr.connected_components(Some("Person"));
// All Person nodes in one component (alice->bob->carol are connected)
```

### 13. Combined Document and RDF Projection

Merge RDF classes with document table properties into a unified LPG.

**Setup:** Alice and Bob exist as both RDF resources (typed as Person) and document records in `hr_employee` (with salary, department).

**Projection config:**

```json
{
  "document_rules": [{
    "table": "hr_employee",
    "label": "Employee",
    "iri_field": "rdf_iri",
    "include_fields": ["name", "department", "salary", "rdf_iri"],
    "edge_fields": [{
      "field": "colleague_iri",
      "edge_type": "colleague"
    }]
  }]
}
```

**Result:** Alice has labels `["Person", "Employee"]` with properties `{department: "Engineering", salary: 85000}`.

**Traverse colleague edges:**

```json
{
  "kind": {
    "Traverse": {
      "start": { "iri": "http://example.org/alice" },
      "edge": "colleague",
      "direction": "Out",
      "min_hops": 1,
      "max_hops": 1,
      "target_label": "Employee"
    }
  },
  "limit": 10,
  "return_fields": ["id", "name", "department"]
}
```

**Result:** Bob (id: http://example.org/bob, name: "Bob de Vries", department: "Engineering")

### 14. Incremental Updates

Apply both RDF deltas and document deltas incrementally.

**RDF delta** (SPARQL INSERT DATA `ex:alice a ex:Manager`):

- Alice gains the "Manager" label
- Update mode: Incremental (no full rebuild)
- Document properties (department, salary) are preserved

**Document delta** (UPDATE hr_employee:bob SET salary = 105000):

- Bob's salary property updates from 92000 to 105000 in the LPG
- Update mode: Incremental

After both deltas, Alice has labels `["Person", "Employee", "Manager"]` and Bob has `salary: 105000`.

---

## ACL Integration

The ACL layer wraps the LPG engine and filters query results based on the caller's `SecurityContext`.

### 15. Admin Sees All

An admin `SecurityContext` bypasses all ACL checks.

```
SecurityContext::admin(sid)
// Admin sees both "secret" and "public" documents via traversal,
// even with UnannotatedNodePolicy::Deny
```

### 16. Deny Policy Blocks Non-Admin

With `UnannotatedNodePolicy::Deny`, a non-admin user with no cached permissions sees zero results.

```
let ctx = SecurityContext::new(sid); // non-admin, no permissions
// Traverse returns 0 results -- all IRI nodes are denied
```

### 17. Per-IRI Permission Cache

Grant `Permission::Read` for specific IRIs to allow selective access.

```
let mut ctx = SecurityContext::new(sid);
ctx.effective_permissions.insert("http://example.org/alice", Permission::Read);
ctx.effective_permissions.insert("http://example.org/bob", Permission::Read);
// Carol is NOT in the permission cache

// Traverse from hub -> alice, bob, carol:
// Result: only alice and bob are returned (carol is denied)
```

### 18. Graph-Level Default Permission

A `"default"` graph-level permission grants read access to all nodes.

```
let mut ctx = SecurityContext::new(sid);
ctx.effective_permissions.insert("default", Permission::Read);
// All nodes in the default graph are accessible
```

---

## CSR Graph Algorithms

### 19. PageRank Convergence

On a 10-node web-like graph with realistic link structure, PageRank converges:

- Scores sum to approximately 1.0 (within 0.01)
- The most linked-to page (page0, with 6 incoming links) has the highest score
- Parameters: damping=0.85, max_iterations=200, tolerance=1e-10

### 20. Connected Components with Label Filter

Filter connected components by node label to analyze subgraphs.

**Setup:** Two groups of "Team" nodes (a1-a2 and b1-b2) plus an unlabeled node x.

```
// Without filter: includes all nodes
csr.connected_components(None)

// With "Team" filter: only Team-labeled nodes
csr.connected_components(Some("Team"))
// Returns 2 components, each with 2 members
```
