# Architecture

This document describes the internal architecture of IndentiaDB: how data is stored, how queries are executed, and how high availability is achieved.

---

## Storage Layer Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        IndentiaDB Process                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     Query Router                               │  │
│  │   SurrealQL  │  SPARQL 1.2  │  LPG JSON DSL  │  ES DSL        │  │
│  └────────┬─────────────┬───────────────┬──────────────┬──────────┘  │
│           │             │               │              │              │
│  ┌────────▼──────┐  ┌───▼────────┐  ┌──▼──────────┐  │              │
│  │  SurrealDB    │  │  RDF Triple │  │  LPG Engine │  │              │
│  │  Engine       │  │  Store      │  │  (CSR)      │  │              │
│  └────────┬──────┘  └───┬────────┘  └──────────────┘  │              │
│           │             │                              │              │
│  ┌────────▼─────────────▼──────────────────────────────▼──────────┐  │
│  │              Physical Storage Backend                           │  │
│  │                                                                 │  │
│  │   Option A: SurrealDB embedded (kv-mem / kv-surrealkv)         │  │
│  │   Option B: TiKV distributed (Raft consensus, multi-DC)        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 1. Dual Storage Backends

IndentiaDB supports two physical storage backends. You choose one at deployment time based on your scale and availability requirements.

### Option A: SurrealDB Embedded

SurrealDB is embedded directly into the IndentiaDB process. No separate database process is needed. This is the default for development and single-node production deployments.

**Storage engines available within SurrealDB embedded:**

| Engine | Description | Recommended For |
|--------|-------------|-----------------|
| `kv-mem` | In-memory only, data lost on restart | Development, testing, ephemeral workloads |
| `kv-surrealkv` | Persistent on-disk storage using SurrealKV | Production single-node deployments |

**Characteristics:**

- Zero operational overhead — one binary, one process
- Supports LIVE queries (WebSocket push on data change)
- Full ACID transactions with snapshot isolation
- Maximum practical dataset size: approximately 1 TB (single-node disk)
- Multi-datacenter replication: not supported
- High availability: not supported (single node)

### Option B: TiKV Distributed

TiKV is an external distributed key-value store based on the Raft consensus protocol, developed by PingCAP. IndentiaDB connects to an existing TiKV cluster as its storage backend via SurrealDB's `kv-tikv` driver.

**Characteristics:**

- Horizontal scaling across multiple nodes and datacenters
- Raft-based replication with automatic failover
- Unlimited dataset size (add nodes to scale)
- Multi-datacenter support with region-aware placement
- High availability: yes (3+ TiKV nodes required for quorum)
- LIVE queries: not available (TiKV does not support push notifications)
- Operational complexity: high (requires TiKV cluster + PD + TiFlash for analytics)

#### TiKV Cluster Topology

A TiKV deployment consists of two components:

```
┌──────────────────────────────────┐
│   PD (Placement Driver) × 3      │
│   pd-0, pd-1, pd-2               │
│   ─────────────────────────────  │
│   • Raft quorum for metadata     │
│   • Cluster topology coordinator │
│   • Region leader election       │
│   • Port 2379 (client API)       │
│   • Port 2380 (peer replication) │
└────────────────┬─────────────────┘
                 │ registers with PD
┌────────────────▼─────────────────┐
│   TiKV storage nodes × 3         │
│   tikv-0, tikv-1, tikv-2         │
│   ─────────────────────────────  │
│   • Range-based sharding         │
│   • Raft replication per region  │
│   • Port 20160 (gRPC data)       │
│   • Port 20180 (status/metrics)  │
└──────────────────────────────────┘
```

Minimum cluster: 3 PD nodes + 3 TiKV nodes. All three TiKV nodes must be available for writes (Raft quorum requires a majority).

#### Configuring IndentiaDB to Use TiKV

Set the `SURREAL_URL` environment variable to the PD endpoints:

```bash
# Single PD node (not recommended for production)
SURREAL_URL=tikv://pd-0:2379

# Three PD nodes (recommended — Raft quorum for metadata)
SURREAL_URL=tikv://pd-0:2379,pd-1:2379,pd-2:2379
```

With Docker:

```bash
docker run -d \
  -e SURREAL_URL="tikv://pd-0:2379,pd-1:2379,pd-2:2379" \
  -p 7001:7001 -p 9200:9200 \
  ghcr.io/indentiaplatform/indentiadb-trial:latest
```

In `config.toml`:

```toml
[storage]
backend = "tikv"
tikv_pd_endpoints = ["pd-0:2379", "pd-1:2379", "pd-2:2379"]
```

#### Docker Compose: Full TiKV Stack

```yaml
services:
  pd-0:
    image: pingcap/pd:v8.5.0
    command: >
      --name=pd-0
      --client-urls=http://0.0.0.0:2379
      --peer-urls=http://0.0.0.0:2380
      --advertise-client-urls=http://pd-0:2379
      --advertise-peer-urls=http://pd-0:2380
      --initial-cluster=pd-0=http://pd-0:2380,pd-1=http://pd-1:2380,pd-2=http://pd-2:2380

  tikv-0:
    image: pingcap/tikv:v8.5.0
    command: >
      --addr=0.0.0.0:20160
      --advertise-addr=tikv-0:20160
      --pd=pd-0:2379,pd-1:2379,pd-2:2379
    depends_on: [pd-0, pd-1, pd-2]

  indentiadb:
    image: ghcr.io/indentiaplatform/indentiadb-trial:latest
    environment:
      SURREAL_URL: "tikv://pd-0:2379,pd-1:2379,pd-2:2379"
    ports:
      - "7001:7001"
      - "9200:9200"
    depends_on: [tikv-0, tikv-1, tikv-2]
```

!!! warning "TiKV and LIVE queries"
    TiKV does not support push notifications. `LIVE SELECT` statements and `DEFINE EVENT` handlers are unavailable when using the TiKV backend. Use the embedded `kv-surrealkv` backend if you need reactive queries.

### Comparison Table

| Dimension | SurrealDB Embedded | TiKV Distributed |
|-----------|-------------------|-----------------|
| Complexity | Low — single process | High — separate cluster |
| Scalability | Single node | Horizontal, unlimited |
| Write Latency | ~0.1–1 ms (local disk) | ~1–10 ms (network round-trip) |
| High Availability | No | Yes (Raft quorum) |
| Max Dataset | ~1 TB | Unlimited |
| LIVE Queries | Yes (WebSocket) | No |
| Multi-DC | No | Yes |
| Operational Cost | Minimal | Significant |
| Recommended For | Development, <1 TB prod | >1 TB, HA required |

> **Recommendation:** Start with SurrealDB embedded (`kv-surrealkv`). Migrate to TiKV when you approach 500 GB of stored data, require cross-datacenter replication, or need automatic failover.

---

## 2. The QLever-compatible SPARQL Engine

IndentiaDB's SPARQL subsystem is a **Rust-native reimplementation of the core indexing and query-evaluation concepts from QLever** — a high-performance SPARQL engine developed at the University of Freiburg. The original C++ QLever project demonstrated that permutation-based triple indexing with vocabulary compression can evaluate SPARQL queries one to two orders of magnitude faster than traditional B-tree approaches.

IndentiaDB embeds those same algorithmic ideas natively in Rust, without a C++ dependency or a separate C++ QLever process. The goals are:

- Bit-exact result compatibility with upstream C++ QLever for deterministic SPARQL queries
- Native integration with the SurrealDB write path and transaction layer
- Extension via RDF-star and SPARQL 1.2 features not yet in upstream QLever

### What QLever-compatible Contributes

| Concept | C++ QLever Origin | IndentiaDB Implementation |
|---------|-------------------|--------------------------|
| 6-permutation triple index | QLever's SPO/SOP/PSO/POS/OSP/OPS layout | Same layout, ZSTD + delta + varint compression |
| Vocabulary compression | FSST (Fast Static Symbol Table) | FSST-compatible encoding; memory-mapped via `memmap2` |
| `ql:contains-word` predicate | QLever's text index extension | Full inverted BM25 index integrated in IndentiaDB's FTS layer |
| Cost-based join ordering | QLever's cardinality estimator | `sparopt` crate — filter pushdown, join reordering |
| Delta triple tracking | QLever's delta index for updates | IndentiaDB delta layer that tracks insertions/deletions per graph |

### Query Routing: QLever-compatible Engine vs SurrealDB Engine

Not every query hits the QLever-compatible path. The query router dispatches based on the operation type:

| Query Characteristic | Target Engine | Reason |
|---------------------|---------------|--------|
| `SELECT / CONSTRUCT / ASK / DESCRIBE` — read only, no FTS | **QLever-compatible** (Rust) | Permutation indexes optimally serve pure graph reads |
| `SELECT` with `ql:contains-word` predicate | **QLever-compatible + FTS index** | QLever-compatible invokes the integrated BM25 text index |
| `INSERT DATA / DELETE DATA / DELETE…WHERE` | **SurrealDB** | All writes go through the SurrealDB ACID layer |
| `SPARQL()` inside a SurrealQL statement | **QLever-compatible** (inline dispatch) | Results returned as SurrealQL-typed values |
| Requests to port `9200` | **FTS + vector layer** | Elasticsearch-compatible API, bypasses SPARQL parser |
| `SERVICE <external-endpoint>` | **Federation engine** | Distributed across QLever-compatible + remote SPARQL endpoints |

The split means reads are fully served by the highly-optimised permutation indexes while all state changes go through SurrealDB's transaction log, maintaining ACID guarantees and enabling LIVE queries.

### The `ql:contains-word` Predicate

C++ QLever introduced the `ql:contains-word` predicate as a standard way to express full-text conditions inside SPARQL. IndentiaDB supports it natively:

```sparql
PREFIX ql: <http://qlever.cs.uni-freiburg.de/builtin/>

SELECT ?article ?title ?score WHERE {
  ?article <http://purl.org/dc/terms/title>   ?title .
  ?article <http://purl.org/dc/terms/subject> ?subject .
  (?title ?score) ql:contains-word "knowledge graph" .
}
ORDER BY DESC(?score)
LIMIT 20
```

The `(?var ?score)` pair binds the BM25 score alongside the matched literal. The query is routed to the QLever-compatible engine which evaluates the triple patterns via permutation lookup and resolves the text predicate against the inverted BM25 index in a single pass.

### Dual-Backend HA Architecture (QLever-compatible + SurrealDB)

For large-scale deployments, QLever-compatible read replicas can be run alongside the SurrealDB cluster. The query router sends all reads to the QLever-compatible tier and all writes to SurrealDB, with an asynchronous sync process keeping the QLever-compatible index up to date:

```
 Clients
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                    Query Router                          │
│   SPARQL reads ──► QLever-compatible replicas (ReadOnlyMany PVC)   │
│   Writes       ──► SurrealDB cluster (TiKV backend)     │
└─────────────────────────────────────────────────────────┘
         │                         │
         ▼                         ▼
 ┌────────────────┐       ┌─────────────────────┐
 │ QLever-compatible nodes   │◄──────│ SurrealDB + TiKV    │
 │ qlever-0,1,2   │ async │ surreal-0,1,2       │
 │ (NFS/CephFS    │ sync  │ + pd-0,1,2          │
 │  shared index) │       │ + tikv-0,1,2        │
 └────────────────┘       └─────────────────────┘
```

Use this topology when:
- Your RDF dataset exceeds 100 million triples and SPARQL query latency is critical
- You need to separate read and write scaling independently
- You are running analytics-heavy workloads alongside real-time updates

For most deployments under 50 million triples, a single IndentiaDB process with the integrated QLever-compatible engine and `kv-surrealkv` storage is sufficient.

---

## 3. RDF Triple Storage

The RDF triple store is the semantic core of IndentiaDB. It is implemented as a custom storage layer optimized for SPARQL pattern matching.

### 6-Permutation Index

Every triple `(subject, predicate, object)` in every named graph is indexed in six orderings:

| Index | Ordering | Optimized For |
|-------|----------|---------------|
| SPO | Subject → Predicate → Object | Lookup all predicates and objects for a subject |
| SOP | Subject → Object → Predicate | Lookup all predicates connecting a subject to an object |
| PSO | Predicate → Subject → Object | Lookup all subjects with a given predicate |
| POS | Predicate → Object → Subject | Lookup all subjects that point to a given object via a predicate |
| OSP | Object → Subject → Predicate | Lookup all subjects that reference a given object |
| OPS | Object → Predicate → Subject | Lookup via object then predicate |

The query optimizer selects the index permutation that best matches the bound variables in each triple pattern. A fully-bound pattern `(s, p, o)` resolves with a single key lookup. An unbound-subject pattern `(?, p, o)` uses the POS index.

### Compression

Triple data is compressed at multiple levels:

- **ZSTD compression** on stored byte sequences (configurable level 1–22, default 3). Level 3 gives a good balance of compression ratio and CPU overhead. Set `TRIPLE_STORE_COMPRESSION_LEVEL=9` for higher compression at the cost of write throughput.
- **Delta encoding** for sequences of similar IRIs and literals. Adjacent values in sorted order are stored as deltas rather than full values.
- **Varint compression** on integer deltas — small integers require fewer bytes.

### Dual Vocabulary System

All IRI strings and literal values are stored in two vocabulary tables:

1. **IRI vocabulary** — maps every unique IRI string to an integer ID. Triple index entries store integer IDs, not raw strings. This means the string `http://xmlns.com/foaf/0.1/name` (31 bytes) is stored once and referenced by a 4-byte integer everywhere else.
2. **Literal vocabulary** — maps literal values (strings, numbers, dates) to integer IDs with datatype and optional language tag.

Vocabulary lookups use memory-mapped I/O via the `memmap2` crate, allowing the vocabulary to exceed RAM size while maintaining fast random access through the OS page cache.

### Memory-Mapped I/O

The vocabulary files are memory-mapped using `memmap2`. This means:

- The OS page cache serves as an automatic buffer pool
- Random reads do not require explicit `read()` syscalls
- The working set of frequently-accessed vocabulary entries remains hot in L3 cache
- Vocabulary files can be larger than available RAM

---

## 4. Query Execution Pipeline

### Parsing

SPARQL queries are parsed by the `spargebra` crate, which produces a typed abstract syntax tree representing the query algebra. The parser validates syntax and resolves prefix declarations.

### Optimization

The `sparopt` crate applies cost-based query optimization to the parsed algebra:

1. **Filter pushdown** — WHERE clause filters are pushed as close to the data source as possible, reducing intermediate result set sizes.
2. **Cardinality estimation** — the optimizer estimates the number of results each triple pattern will produce based on stored statistics.
3. **Join ordering** — joins are reordered so the smallest result sets are joined first, minimizing the size of intermediate results.

### Join Strategies

The query executor selects from four join strategies depending on the cardinality and index availability:

| Strategy | When Used | Complexity |
|----------|-----------|------------|
| **Hash Join** | Large result sets, no ordering required | O(n + m) time, O(n) memory |
| **Merge Join** | Both inputs sorted on the join key | O(n + m) time, O(1) memory |
| **Index Nested Loop** | Small outer result set, indexed inner | O(n × log m) time |
| **EXISTS Join** | Semi-join / anti-join for FILTER EXISTS / FILTER NOT EXISTS | O(n) with hash set probe |

### Aggregation

SPARQL aggregation functions are evaluated after join processing:

- `COUNT(?x)` / `COUNT(*)` — counts non-null bindings
- `SUM(?x)` — sum of numeric values
- `AVG(?x)` — arithmetic mean
- `MIN(?x)` / `MAX(?x)` — minimum and maximum over any comparable type
- `GROUP_CONCAT(?x; separator=", ")` — concatenate string values; returns `xsd:string` per SPARQL 1.2 Feb 3 ED
- `SAMPLE(?x)` — returns an arbitrary value from the group (useful for non-grouped columns)

### Property Paths

SPARQL property path expressions are evaluated with full BFS cycle detection (per SPARQL 1.2 Issues #266 and #267):

| Operator | Syntax | Meaning |
|----------|--------|---------|
| Sequence | `p1 / p2` | p1 followed by p2 |
| Alternative | `p1 \| p2` | p1 or p2 |
| Zero or more | `p*` | Transitive closure including zero hops |
| One or more | `p+` | Transitive closure requiring at least one hop |
| Zero or one | `p?` | Optional single hop |
| Inverse | `^p` | Traverse in reverse direction |
| Negated property set | `!(p1 \| p2)` | Any predicate except p1 or p2 |

BFS with cycle detection ensures property paths over cyclic graphs terminate correctly.

---

## 5. Vector Storage

### HNSW Indexing

Vector embeddings are indexed using HNSW (Hierarchical Navigable Small World) graphs. HNSW is an approximate nearest neighbor algorithm that provides sub-linear search time with configurable accuracy/speed trade-offs.

**Index configuration parameters:**

| Parameter | SurrealQL Keyword | Description | Default |
|-----------|-------------------|-------------|---------|
| `dimension` | `DIMENSION n` | Number of dimensions in each vector | Required |
| `distance metric` | `DIST COSINE` or `DIST EUCLIDEAN` | Similarity metric | `COSINE` |
| `m` | `M n` | Maximum connections per node per layer | 16 |
| `ef_construction` | `EFC n` | Candidate list size during index build | 200 |
| `n_probe` | at query time `<\|k,ef\|>` | Candidate list size during search | 100 |

**Search complexity:** O(d × k + n\_probe × n/k) where d is the vector dimension, k is the number of requested neighbors, and n is the total number of indexed vectors.

**Index definition example:**

```sql
DEFINE INDEX idx_embedding ON document FIELDS embedding
  HNSW DIMENSION 1536 DIST COSINE
  EFC 200 M 16;
```

**Query syntax:**

```sql
-- Find 10 nearest neighbors with ef=200
SELECT id, title,
  vector::similarity::cosine(embedding, $query_vec) AS score
FROM document
WHERE embedding <|10,200|> $query_vec
ORDER BY score DESC;
```

The `<|k,ef|>` operator performs the HNSW search with k results and ef candidate list size. Increasing ef improves recall at the cost of search latency.

---

## 6. Full-Text Search

### Inverted Index Structure

The full-text search engine maintains a fragment inverted index:

1. **4-character prefix fragments** — tokens are split into overlapping 4-character prefixes. This enables prefix matching and fuzzy queries without a separate phonetic index.
2. **Word postings** — for each unique term, a posting list records which document IDs contain that term and at what positions.
3. **Entity co-occurrence postings** — tracks which terms appear near which other terms, enabling phrase queries and proximity scoring.

### Multi-Stage Compression

Posting lists are compressed in multiple stages to minimize storage overhead:

1. **Gap encoding** — document IDs in posting lists are stored as gaps (deltas) between consecutive IDs rather than absolute values. Most gaps are small integers.
2. **Frequency encoding** — term frequencies are encoded separately from positions.
3. **Simple8b** — packs multiple small integers into 64-bit words using a variable-length encoding scheme optimized for modern CPUs.
4. **ZSTD** — the final compressed blocks are ZSTD-compressed for additional size reduction.

### BM25/TF-IDF Scoring

Document ranking uses BM25 with configurable k1 and b parameters:

```
BM25(d, q) = Σ IDF(t) × (tf(t,d) × (k1 + 1)) / (tf(t,d) + k1 × (1 - b + b × |d|/avgdl))
```

- `k1` controls term frequency saturation (default 1.2)
- `b` controls document length normalization (default 0.75)

Configure per-index:

```sql
DEFINE INDEX idx_body ON article FIELDS body
  SEARCH ANALYZER english_analyzer BM25(1.2, 0.75);
```

---

## 7. Raft Consensus for High Availability

When deploying IndentiaDB in HA mode (three or more nodes), nodes coordinate using the **OpenRaft 0.9** implementation of the Raft consensus protocol.

### How Raft Works in IndentiaDB

- **Leader election** — one node is elected leader per term. All writes go through the leader. Elections use randomized timeouts to avoid split votes.
- **Log replication** — the leader appends write operations to its log and replicates them to followers. A write is committed once a quorum (majority) of nodes acknowledge it.
- **Snapshot isolation** — reads return a consistent snapshot of committed state. Uncommitted writes are not visible.
- **Monotonic reads** — read requests are serviced only by nodes that are up-to-date. Stale reads are prevented by checking the commit index before serving results.

### Network Transport

Raft messages between nodes use gRPC (via the `tonic` crate) with mutual TLS:

```toml
[raft]
node_id = 1
peers = [
    { id = 2, addr = "node2:7010" },
    { id = 3, addr = "node3:7010" }
]
tls_cert = "/etc/indentiadb/server.crt"
tls_key  = "/etc/indentiadb/server.key"
tls_ca   = "/etc/indentiadb/ca.crt"
```

### HAProxy Load Balancing

Client connections should be load-balanced using HAProxy (or any HTTP/WebSocket-aware proxy). HAProxy should route all write operations to the Raft leader and can distribute read operations across all healthy nodes.

Example HAProxy backend configuration:

```
frontend indentiadb_front
    bind *:7001
    default_backend indentiadb_back

backend indentiadb_back
    balance roundrobin
    option httpchk GET /health
    server node1 node1:7001 check
    server node2 node2:7001 check
    server node3 node3:7001 check
```

For writes requiring leader routing, use the `/health/leader` endpoint to identify the current leader and route accordingly.

### Cluster Sizing

| Nodes | Fault Tolerance | Quorum |
|-------|----------------|--------|
| 1 | None (single point of failure) | 1 |
| 3 | 1 node failure | 2 |
| 5 | 2 node failures | 3 |

> **Recommendation:** Deploy 3 nodes for production HA. Deploy 5 nodes only when you need to tolerate 2 simultaneous failures (e.g., multi-AZ with one full AZ failure).

---

## Storage Layer ASCII Diagram

```
IndentiaDB Storage Architecture
════════════════════════════════════════════════════════════════════

  WRITES                          READS
    │                               │
    ▼                               ▼
┌───────────────────────────────────────────────────────────────┐
│                      Query Router                             │
│                                                               │
│  SurrealQL ──┐    SPARQL ──┐    LPG DSL ──┐    ES DSL ──┐   │
└──────────────┼─────────────┼──────────────┼─────────────┼───┘
               │             │              │             │
               ▼             ▼              │             ▼
     ┌─────────────┐  ┌──────────────┐     │   ┌─────────────────┐
     │  SurrealDB  │  │  RDF Triple  │     │   │  Full-Text      │
     │  Engine     │  │  Store       │     │   │  Inverted Index  │
     │             │  │              │     │   │  (BM25/TF-IDF)  │
     │ SCHEMAFULL  │  │ 6-perm index │     │   └─────────────────┘
     │ SCHEMALESS  │  │ SPO,SOP,PSO  │     │
     │ HNSW Vector │  │ POS,OSP,OPS  │     │
     │ DEFINE EVENT│  │              │     │
     │ LIVE queries│  │ ZSTD compr.  │     │
     └──────┬──────┘  │ Delta encode │     │
            │         │ Varint compr.│     │
            │         │              │     │
            │         │ Vocabulary:  │     │
            │         │  IRI table   │     │
            │         │  Lit table   │     │
            │         │ (memmap2 I/O)│     │
            │         └──────┬───────┘     │
            │                │             │
            │                └──────┬──────┘
            │                       │ LPG Projection
            │                       ▼
            │               ┌───────────────┐
            │               │  LPG Engine   │
            │               │  CSR Graph    │
            │               │  Adjacency    │
            │               │               │
            │               │  PageRank     │
            │               │  Shortest Path│
            │               │  ConnComp     │
            │               │  Neighbor Count│
            │               └───────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│                   Physical Storage Backend                    │
│                                                               │
│  ┌──────────────────────────┐  ┌──────────────────────────┐  │
│  │   SurrealDB Embedded     │  │   TiKV Distributed       │  │
│  │                          │  │                           │  │
│  │  kv-mem (in-memory)      │  │  Raft consensus           │  │
│  │  kv-surrealkv (on-disk)  │  │  Multi-node, multi-DC     │  │
│  │                          │  │  Unlimited scale          │  │
│  │  Max ~1 TB               │  │  gRPC + mutual TLS        │  │
│  │  LIVE queries ✓          │  │  LIVE queries ✗           │  │
│  │  Multi-DC ✗              │  │  Multi-DC ✓               │  │
│  └──────────────────────────┘  └──────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘

  HA Layer (3+ nodes, OpenRaft 0.9)
  ─────────────────────────────────
  Leader ◄──── gRPC/TLS ────► Follower 1
    │                              │
    └────── gRPC/TLS ──────► Follower 2
```
