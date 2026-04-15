# Graph Algorithms

IndentiaDB ships 35 graph algorithms that run directly on the LPG (Labeled Property Graph) projection of your data. All algorithms are available via a single REST endpoint, require no external graph processing system, and respect the same ACL rules as all other query interfaces.

---

## How It Works

The LPG engine builds an in-memory Compressed Sparse Row (CSR) graph from your RDF triples or document records. The algorithm library (`indentiagraph-algo`) operates on this CSR structure, which provides:

- O(1) neighbour lookup per node
- Cache-friendly sequential iteration for BFS/DFS/Dijkstra
- Optional edge-weight extraction from any node property

You POST the algorithm name and a JSON config object. Results arrive as a JSON array of rows — one row per node (or pair, or path, depending on the algorithm).

---

## Endpoint

```
POST http://localhost:7001/algo/:name
Authorization: Bearer <token>
Content-Type: application/json
```

---

## Request Format

```json
{
  "weight_property": "cost",
  "config": {
    "source": "http://example.org/node-a",
    "damping_factor": 0.85
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `weight_property` | string | No | Node property to use as edge weight. Omit for unweighted. |
| `config` | object | No | Algorithm-specific parameters (see per-algorithm tables below). |

---

## Response Format

```json
{
  "algorithm": "pagerank",
  "rows": [
    { "node": "http://example.org/alice", "score": 0.42 },
    { "node": "http://example.org/bob",   "score": 0.28 }
  ],
  "stats": {
    "node_count": 1200,
    "edge_count": 4500
  }
}
```

---

## ACL Behaviour

- **Read permission** is required. Requests without a valid token return `401`. Requests where the actor lacks read permission return `403`.
- Result rows are **post-filtered**: any row whose `"node"` field refers to a node not visible to the current actor is silently removed from the response.
- The graph projection used internally is always the full graph. ACL filtering applies only to the output.

---

## Algorithm Reference

### Community Detection

#### PageRank

Ranks nodes by their relative importance in a directed graph. A node scores higher if many high-scoring nodes point to it.

**`POST /algo/pagerank`**

| Config key | Type | Default | Description |
|-----------|------|---------|-------------|
| `damping_factor` | float | 0.85 | Probability of following a link vs. teleporting |
| `iterations` | integer | 20 | Number of power-iteration rounds |
| `tolerance` | float | 1e-6 | Convergence threshold |

Output: `[{ "node": "...", "score": 0.42 }, ...]`

```bash
curl -X POST http://localhost:7001/algo/pagerank \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "config": { "damping_factor": 0.85, "iterations": 20 } }'
```

---

#### Louvain Community Detection

Finds communities by maximising graph modularity. Works well on large graphs; non-deterministic (use a fixed seed for reproducibility).

**`POST /algo/louvain`**

| Config key | Type | Default | Description |
|-----------|------|---------|-------------|
| `resolution` | float | 1.0 | Higher values → more, smaller communities |
| `iterations` | integer | 10 | Max Louvain passes |
| `seed` | integer? | null | Optional RNG seed for reproducibility |

Output: `[{ "node": "...", "community": 3 }, ...]`

---

#### Label Propagation

Fast randomised community detection. Each node adopts the most common label among its neighbours.

**`POST /algo/label_propagation`**

| Config key | Type | Default | Description |
|-----------|------|---------|-------------|
| `iterations` | integer | 10 | Max propagation rounds |
| `seed` | integer? | null | Optional RNG seed |

Output: `[{ "node": "...", "community": 7 }, ...]`

---

### Connectivity

#### Weakly Connected Components (WCC)

Finds connected components ignoring edge direction. Use this to identify isolated subgraphs.

**`POST /algo/wcc`**

No additional config required.

Output: `[{ "node": "...", "component": 0 }, ...]`

---

#### Strongly Connected Components (SCC)

Finds components where every node can reach every other node following directed edges. Uses Tarjan's algorithm.

**`POST /algo/scc`**

No additional config required.

Output: `[{ "node": "...", "component": 2 }, ...]`

---

### Centrality

All centrality algorithms return `[{ "node": "...", "score": 0.0 }, ...]` unless otherwise noted.

#### Betweenness Centrality

Measures how often a node lies on the shortest path between two other nodes. High-scoring nodes are "brokers" or bridges.

**`POST /algo/betweenness`** — No config required.

#### Closeness Centrality

Average shortest path length from a node to all reachable nodes. High score → node is "central" in the graph.

**`POST /algo/closeness`** — No config required.

#### Degree Centrality

Normalised in+out degree per node.

**`POST /algo/degree_centrality`**

| Config key | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | string | `"both"` | `"in"`, `"out"`, or `"both"` |

#### Harmonic Centrality

Variant of closeness that handles disconnected graphs gracefully.

**`POST /algo/harmonic_centrality`** — No config required.

#### Eigenvector Centrality

A node scores high if its neighbours score high. Power-iteration method.

**`POST /algo/eigenvector_centrality`**

| Config key | Type | Default | Description |
|-----------|------|---------|-------------|
| `iterations` | integer | 100 | Max power-iteration rounds |
| `tolerance` | float | 1e-6 | Convergence threshold |

#### Katz Centrality

Centrality with exponential attenuation over long paths. More stable than eigenvector centrality on sparse graphs.

**`POST /algo/katz_centrality`**

| Config key | Type | Default | Description |
|-----------|------|---------|-------------|
| `alpha` | float | 0.1 | Attenuation factor (must be < 1/largest eigenvalue) |
| `beta` | float | 1.0 | Exogenous influence |

---

### Structural Analysis

#### Triangle Count

Counts triangles globally and per node. Useful for clustering-coefficient analysis.

**`POST /algo/triangle_count`** — No config required.

Output:
```json
[
  { "global_count": 142 },
  { "node": "http://example.org/alice", "triangles": 12 },
  ...
]
```

#### K-Core Decomposition

Assigns a core number to each node: the largest k such that the node is part of a subgraph where every node has degree ≥ k.

**`POST /algo/kcore`** — No config required.

Output: `[{ "node": "...", "core": 4 }, ...]`

#### Topological Sort

Returns a valid processing order for a DAG. Returns an error row if the graph contains a cycle.

**`POST /algo/topological_sort`** — No config required.

Output: `[{ "position": 0, "node": "..." }, { "position": 1, "node": "..." }, ...]`

#### Cycle Detection

Detects whether the graph contains at least one cycle.

**`POST /algo/cycle_detection`** — No config required.

Output: `[{ "has_cycle": true }]`

#### Bipartite Check

Checks whether the graph is bipartite and, if so, returns the 2-coloured partition.

**`POST /algo/bipartite_check`** — No config required.

Output:
```json
[
  { "is_bipartite": true },
  { "node": "http://example.org/alice", "partition": 0 },
  { "node": "http://example.org/bob",   "partition": 1 }
]
```

#### Bridges

Finds all bridge edges — edges whose removal disconnects the graph.

**`POST /algo/bridges`** — No config required.

Output: `[{ "from": "...", "to": "..." }, ...]`

#### Articulation Points

Finds all articulation points — nodes whose removal disconnects the graph.

**`POST /algo/articulation_points`** — No config required.

Output: `[{ "node": "..." }, ...]`

#### Maximal Cliques

Finds all maximal fully-connected subgraphs using Bron–Kerbosch with pivoting.

**`POST /algo/maximal_cliques`**

| Config key | Type | Default | Description |
|-----------|------|---------|-------------|
| `max_clique_size` | integer? | null | Upper bound on clique size (for performance) |

Output: `[{ "clique": ["node_a", "node_b", "node_c"] }, ...]`

#### Graph Coloring

Assigns a colour to each node so that no two adjacent nodes share a colour (greedy, not optimal).

**`POST /algo/graph_coloring`** — No config required.

Output:
```json
[
  { "chromatic_number": 3 },
  { "node": "http://example.org/alice", "color": 0 },
  { "node": "http://example.org/bob",   "color": 1 }
]
```

#### Node Similarity

Computes Jaccard similarity between node neighbour sets. Returns the top-k most similar pairs.

**`POST /algo/node_similarity`**

| Config key | Type | Default | Description |
|-----------|------|---------|-------------|
| `top_k` | integer | 10 | Number of similar pairs to return per node |
| `cutoff` | float | 0.1 | Minimum Jaccard similarity |

Output: `[{ "node1": "...", "node2": "...", "score": 0.67 }, ...]`

---

### Graph-Level Metrics

#### Graph Metrics

Computes the diameter, radius, centre, and periphery of the graph.

**`POST /algo/graph_metrics`** — No config required.

Output:
```json
[{
  "diameter": 6,
  "radius": 3,
  "center": ["http://example.org/central-node"],
  "periphery": ["http://example.org/leaf-a", "http://example.org/leaf-b"]
}]
```

---

### Path Algorithms

#### Dijkstra (Single-Source Shortest Paths)

Computes shortest distances from one source node to all reachable nodes. Requires non-negative edge weights.

**`POST /algo/dijkstra`**

| Config key | Type | Required | Description |
|-----------|------|---------|-------------|
| `source` | string | Yes | Source node IRI or ID |

Output: `[{ "node": "...", "distance": 3.5 }, ...]`

#### A* (Heuristic Shortest Path)

Finds the shortest path between source and target using a heuristic. Falls back to Dijkstra if no heuristic is available.

**`POST /algo/astar`**

| Config key | Type | Required | Description |
|-----------|------|---------|-------------|
| `source` | string | Yes | Source node IRI |
| `target` | string | Yes | Target node IRI |

Output: `[{ "found": true, "path": ["node_a", "node_b", "node_c"], "distance": 4.2 }]`

#### Bellman-Ford

Single-source shortest paths supporting negative edge weights. Detects negative cycles.

**`POST /algo/bellman_ford`**

| Config key | Type | Required | Description |
|-----------|------|---------|-------------|
| `source` | string | Yes | Source node IRI |

Output: `[{ "node": "...", "distance": -1.5 }, ...]`
On negative cycle: `[{ "has_negative_cycle": true }]`

#### Bidirectional Dijkstra

Faster single-pair shortest path by searching from both ends simultaneously.

**`POST /algo/bidirectional_dijkstra`**

| Config key | Type | Required | Description |
|-----------|------|---------|-------------|
| `source` | string | Yes | Source node IRI |
| `target` | string | Yes | Target node IRI |

Output: `[{ "found": true, "distance": 3.0 }]`

#### K-Shortest Paths (Yen's Algorithm)

Finds the top-K shortest paths between source and target.

**`POST /algo/k_shortest_paths`**

| Config key | Type | Required | Description |
|-----------|------|---------|-------------|
| `source` | string | Yes | Source node IRI |
| `target` | string | Yes | Target node IRI |
| `k` | integer | Yes | Number of shortest paths to return |

Output:
```json
[
  { "rank": 1, "cost": 2.0, "path": ["node_a", "node_b", "node_c"] },
  { "rank": 2, "cost": 2.5, "path": ["node_a", "node_d", "node_c"] }
]
```

#### All-Pairs Shortest Path (Floyd-Warshall)

Computes shortest distances between every pair of nodes. O(n³) — use on small graphs only.

**`POST /algo/apsp`** — No config required.

Output: `[{ "from": "...", "to": "...", "distance": 5.0 }, ...]`

#### All Simple Paths

Enumerates all cycle-free paths between source and target.

**`POST /algo/all_simple_paths`**

| Config key | Type | Required | Description |
|-----------|------|---------|-------------|
| `source` | string | Yes | Source node IRI |
| `target` | string | Yes | Target node IRI |
| `max_depth` | integer? | No | Limit path length |

Output: `[{ "path": ["node_a", "node_b", "node_c"] }, ...]`

#### Elementary Circuits (Johnson's Algorithm)

Finds all elementary cycles in a directed graph.

**`POST /algo/elementary_circuits`**

| Config key | Type | Required | Description |
|-----------|------|---------|-------------|
| `max_length` | integer? | No | Limit cycle length |

Output: `[{ "cycle": ["node_a", "node_b", "node_a"] }, ...]`

---

### Flow Algorithms

Both flow algorithms require a `source` and `sink` in the config, and edge weights are used as capacities.

#### Dinic Maximum Flow

Efficient max-flow using BFS level graphs. O(V²E) complexity.

**`POST /algo/dinic`**

| Config key | Type | Required | Description |
|-----------|------|---------|-------------|
| `source` | string | Yes | Source node IRI |
| `sink` | string | Yes | Sink node IRI |

Output: `[{ "max_flow": 42.0 }]`

#### Ford-Fulkerson Maximum Flow

Classic augmenting-path max-flow algorithm.

**`POST /algo/ford_fulkerson`**

| Config key | Type | Required | Description |
|-----------|------|---------|-------------|
| `source` | string | Yes | Source node IRI |
| `sink` | string | Yes | Sink node IRI |

Output: `[{ "max_flow": 42.0 }]`

---

### Spanning Tree & Matching

#### Minimum Spanning Tree (Kruskal)

Finds the minimum-weight spanning tree. Returns total weight and all tree edges.

**`POST /algo/mst`** — Requires `weight_property` in the request.

Output:
```json
[
  { "total_weight": 15.5 },
  { "from": "node_a", "to": "node_b", "weight": 3.0 },
  { "from": "node_b", "to": "node_c", "weight": 2.5 }
]
```

#### Maximum Matching

Finds the maximum cardinality matching in an undirected graph.

**`POST /algo/max_matching`** — No config required.

Output:
```json
[
  { "match_count": 4 },
  { "node1": "node_a", "node2": "node_b" },
  { "node1": "node_c", "node2": "node_d" }
]
```

---

### Random Walk

Generates random walks starting from specified nodes. Useful for node embedding (node2vec) and sampling.

**`POST /algo/random_walk`**

| Config key | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_nodes` | array of strings | all nodes | Starting node IRIs |
| `walk_length` | integer | 10 | Steps per walk |
| `num_walks` | integer | 5 | Walks per starting node |
| `seed` | integer? | null | RNG seed |

Output: `[{ "walk": ["node_a", "node_b", "node_a", "node_c"] }, ...]`

---

## Performance Notes

- All algorithms run **in-process** on the in-memory CSR graph. No network round-trips to the storage backend.
- The CSR is rebuilt when the underlying LPG projection is invalidated (on write or on periodic refresh).
- For large graphs (>1M nodes): prefer centrality algorithms over APSP; use `max_depth` limits on `all_simple_paths` and `elementary_circuits`.
- Flow algorithms (Dinic, Ford-Fulkerson) treat edge weights as integer capacities. Float weights are rounded to the nearest integer.

---

## All Algorithms at a Glance

| Name | `kind` | Category | Output |
|------|--------|----------|--------|
| `pagerank` | Community | node → score |
| `louvain` | Community | node → community id |
| `label_propagation` | Community | node → community id |
| `wcc` | Connectivity | node → component id |
| `scc` | Connectivity | node → component id |
| `betweenness` | Centrality | node → score |
| `closeness` | Centrality | node → score |
| `degree_centrality` | Centrality | node → score |
| `harmonic_centrality` | Centrality | node → score |
| `eigenvector_centrality` | Centrality | node → score |
| `katz_centrality` | Centrality | node → score |
| `triangle_count` | Structural | global count + node counts |
| `kcore` | Structural | node → core number |
| `topological_sort` | Structural | ordered node list |
| `cycle_detection` | Structural | has_cycle boolean |
| `bipartite_check` | Structural | is_bipartite + partition |
| `bridges` | Structural | edge list |
| `articulation_points` | Structural | node list |
| `maximal_cliques` | Structural | list of cliques |
| `graph_coloring` | Structural | chromatic number + node colors |
| `node_similarity` | Structural | node pairs + Jaccard scores |
| `graph_metrics` | Metrics | diameter, radius, center, periphery |
| `dijkstra` | Paths | node → distance |
| `astar` | Paths | path + distance |
| `bellman_ford` | Paths | node → distance |
| `bidirectional_dijkstra` | Paths | distance |
| `k_shortest_paths` | Paths | ranked path list |
| `apsp` | Paths | all-pairs distances |
| `all_simple_paths` | Paths | path list |
| `elementary_circuits` | Paths | cycle list |
| `dinic` | Flow | max_flow |
| `ford_fulkerson` | Flow | max_flow |
| `mst` | Spanning Tree | total weight + edge list |
| `max_matching` | Matching | match count + node pairs |
| `random_walk` | Sampling | walk sequences |
