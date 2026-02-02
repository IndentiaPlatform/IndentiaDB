# IndentiaDB

**The next-generation multi-model database for Knowledge Graphs and Enterprise AI.**

IndentiaDB combines all enterprise features in one platform: **ACID**, **scalable**, **full-text search**, **real-time**, **graph**, **relational**, **multi-tenant**, **bitemporal**, **schema-less**, **schema-full**, **serverless**, **embedded** — one database for all your data challenges.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                IndentiaDB                                    │
│                                                                             │
│    🦀 Rust · ⚡ Blazing Fast · 🔒 Enterprise Security · 🌐 Multi-Model      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│   │    RDF      │   │    JSON     │   │   Graph     │   │  Full-Text  │    │
│   │  SPARQL 1.2 │   │  SurrealQL  │   │   Edges     │   │  ES Compat  │    │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘    │
│          │                 │                 │                 │           │
│          └─────────────────┴─────────────────┴─────────────────┘           │
│                                    │                                        │
│                    ┌───────────────┴───────────────┐                       │
│                    │      Unified Query Layer      │                       │
│                    │   SPARQL + SurrealQL + ES DSL │                       │
│                    └───────────────┬───────────────┘                       │
│                                    │                                        │
│              ┌─────────────────────┴─────────────────────┐                 │
│              │                                           │                 │
│       ┌──────┴──────┐                           ┌───────┴───────┐          │
│       │  SurrealDB  │         or                │     TiKV      │          │
│       │  (Simple)   │                           │ (Distributed) │          │
│       │  Single Node│                           │  Multi-DC HA  │          │
│       └─────────────┘                           └───────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

IndentiaDB is a **multi-model database** that combines elements of **relational**, **graph**, and **document** paradigms into one package. Query with SPARQL, SurrealQL, or Elasticsearch Query DSL — the choice is yours.

The engine is written entirely in **Rust** and supports multiple persistence layers: **TiKV** for horizontal scalability in the cloud, or **SurrealDB** as a single node — both in-memory and on-disk.

**Complex relationships without JOINs**: IndentiaDB handles complex relationships like traditional relational databases, but without joins. Instead, it uses techniques like **record links** and **graph connections** that not only support complex data models but also result in concise, developer-friendly code.

**Schema-less or Schema-full**: Schema-less by default, meaning you can implicitly create unstructured data in any table. But you can opt into schema-full tables when the data model is well-defined.

**ACID compliant** with transactions across multiple tables that also **emit events** when data changes — enabling **real-time updates** in your front-end application, similar to Firebase. And on top of that: **geospatial data**, **bitemporal queries**, **predefined analytics views**, **semantic inferencing** — all secured with **fine-grained permissions** out of the box.

---

## Why IndentiaDB?

| Challenge | Traditional Solution | IndentiaDB |
|-----------|---------------------|------------|
| Knowledge Graph + Documents | 2 databases (Neo4j + MongoDB) | 1 platform |
| Full-text Search | Separate ES cluster | Built-in (ES-compatible) |
| Real-time Updates | Custom WebSocket code | `LIVE SELECT` out-of-the-box |
| Complex Relationships | JOIN hell | Record links + Graph edges |
| Schema Evolution | Migrations, downtime | Schema-less → Schema-full |
| AI/RAG Integration | Data export required | Native RDF 1.2 with provenance |
| Multi-tenant Security | Application-level | Database-level ACL |

---

## Features

*   **Multi-Model Database**: Combine RDF triples, JSON documents, and graph edges in one unified platform.
*   **High Performance**: Advanced compression (FSST, ZSTD) and query optimization for blazing-fast responses on billions of triples.
*   **Horizontally Scalable**: Choose between SurrealDB (embedded) or TiKV (distributed) with automatic sharding and replication.
*   **Real-time First**: LIVE queries with push notifications — react instantly to data changes via WebSocket.
*   **ACID Transactions**: Transactions across multiple tables with snapshot isolation and monotonic reads.
*   **No-JOIN Architecture**: Record links and graph connections for complex relationships without JOIN overhead.
*   **RDF 1.2 & SPARQL 1.2**: Latest standards including Triple Terms (RDF-star) for RAG and provenance.
*   **Elasticsearch Compatible**: Full ES 9.x REST API — use Kibana, Logstash, Beats without modifications.
*   **Semantic Inferencing**: RDFS/OWL reasoning with forward/backward chaining and explanation support.
*   **Bitemporal Queries**: Time-travel with transaction time and valid time — query data "as of" any moment.
*   **Enterprise Security**: LDAP, OIDC, JWT authentication with RBAC and fine-grained ACL at triple-level.
*   **Memory Safe**: 100% Rust — no garbage collection pauses, no buffer overflows, no data races.
*   **Kubernetes Native**: Operator with `IndentiaDBCluster` CRD for declarative cluster management.
*   **WASM Support**: Run in the browser or on edge devices via WebAssembly.
*   **Geospatial**: GeoSPARQL with centimeter precision, nearest neighbor search, and topological relations.
*   **Full-Text Search**: BM25/TF-IDF ranking, fragment inverted index, `ql:contains-word` predicates.
*   **Schema Flexibility**: Start schema-less, migrate to schema-full when your model stabilizes.
*   **Developer Friendly**: Intuitive query syntax, structured logging, Prometheus metrics, CLI tools.

---

## Complete Feature Overview

### RDF & SPARQL Standards

#### RDF 1.2 Support
- ✅ **Triple Terms (Quoted Triples)**: Make statements about statements for provenance tracking
- ✅ **Reified Triples**: Support for `~` operator syntax
- ✅ **Base Direction Tags**: Language directions for internationalization (`@ar--rtl`, `@en--ltr`)
- ✅ **RDF-star Syntax**: Fully implemented in parser and storage layer

#### SPARQL 1.2 Query Functions
- ✅ **TRIPLE(s, p, o)**: Construct triple terms dynamically
- ✅ **SUBJECT(t)**: Extract subject from triple term
- ✅ **PREDICATE(t)**: Extract predicate from triple term
- ✅ **OBJECT(t)**: Extract object from triple term
- ✅ **isTRIPLE(t)**: Type check for triple terms
- ✅ **LANGDIR()**: Directional language tag functions
- ✅ **SEMIJOIN/ANTIJOIN**: Efficient EXISTS/NOT EXISTS operators

#### SPARQL 1.1 Query Forms
- ✅ **SELECT**: Standard query results
- ✅ **CONSTRUCT**: RDF graph construction
- ✅ **ASK**: Boolean query results
- ✅ **DESCRIBE**: Resource description queries
- ✅ **SPARQL UPDATE**: INSERT DATA, DELETE DATA, DELETE/INSERT WHERE

### Storage & Index Management

#### Index Structure
- ✅ **6 Permutations**: SPO, SOP, PSO, POS, OSP, OPS for optimal query performance
- ✅ **ZSTD Compression**: Configurable compression levels (1-22) with default level 3
- ✅ **Delta Encoding**: Efficient varint encoding for triples within blocks
- ✅ **Block Metadata**: Binary-compatible with C++ QLever format (PR #1572)
- ✅ **Memory-Mapped I/O**: Efficient disk access without full data load

#### Vocabulary Management
- ✅ **FSST Decompression**: C++ QLever vocabulary compatibility
- ✅ **Dual Vocabulary**: Separate internal (IRIs) and external (literals) vocabularies
- ✅ **Prefix Compression**: Efficient storage of common IRI prefixes
- ✅ **Runtime Vocabulary**: Dynamic vocabulary extension during updates
- ✅ **Inline Literals**: Small literals encoded directly in ID

#### Data Formats
- ✅ **N-Triples (.nt)**: Line-based parallel parsing
- ✅ **N-Quads (.nq)**: Quad support with named graphs
- ✅ **Turtle (.ttl)**: Compact RDF syntax
- ✅ **TriG (.trig)**: Named graphs in Turtle syntax
- ✅ **Auto-detect**: Automatic format detection based on file extension

### Query Execution & Optimization

#### Query Optimizer
- ✅ **Cost-Based Optimization**: Permutation selection based on cardinality estimates
- ✅ **Filter Pushdown**: Push filters to data source for better performance
- ✅ **Join Optimization**: Automatic join order optimization
- ✅ **Cardinality Estimation**: Estimation of intermediate result sizes
- ✅ **Statistics Collection**: Index statistics for query planning
- ✅ **Block-Level Pruning**: Skip blocks based on metadata

#### Join Strategies
- ✅ **Hash Join**: O(1) lookup for high-cardinality joins
- ✅ **Merge Join**: Efficient for sorted inputs
- ✅ **Index Nested Loop**: Use permutation indexes for lookups
- ✅ **EXISTS Join**: Specialized semi-join implementation

#### Aggregation
- ✅ **Hash-Based Aggregation**: O(1) group lookup
- ✅ **Sorted Aggregation**: O(1) per-row for sorted input
- ✅ **COUNT, SUM, AVG, MIN, MAX**: Standard aggregate functions
- ✅ **GROUP_CONCAT**: String concatenation aggregation
- ✅ **SAMPLE**: Random value from group

### Advanced Query Features

#### Property Paths
- ✅ **Sequence Paths**: `/` operator for path sequences
- ✅ **Alternative Paths**: `|` operator for path alternatives
- ✅ **Transitive Paths**: `+` and `*` operators (one-or-more, zero-or-more)
- ✅ **Inverse Paths**: `^` operator for reverse direction
- ✅ **Negated Property Sets**: `!` operator
- ✅ **Bidirectional Search**: Optimization for transitive closure

#### Path Search Algorithms
- ✅ **Dijkstra's Algorithm**: Shortest path with weights
- ✅ **Breadth-First Search**: Unweighted shortest path
- ✅ **All Paths**: Find all paths between nodes
- ✅ **K-Shortest Paths**: Find top K shortest paths

#### Spatial & Geographic Queries (GeoSPARQL)
- ✅ **GeoPoint Encoding**: 60-bit encoding (30 lat + 30 lon) with centimeter precision
- ✅ **Nearest Neighbor Search**: K-nearest points queries
- ✅ **Distance Joins**: Join on geographic distance
- ✅ **Bounding Box Filtering**: Efficient spatial indexing
- ✅ **Haversine Distance**: Accurate distance calculation on Earth surface
- ✅ **WKT Parsing**: Well-Known Text format support
- ✅ **Topological Relations**: `sf:intersects`, `sf:contains`, `sf:within`, `sf:overlaps`, etc.
- ✅ **Geometry Properties**: `dimension`, `isEmpty`, `envelope`, `buffer`

#### Full-Text Search
- ✅ **Text Index Reader**: Inverted index for word lookups
- ✅ **Text Vocabulary**: Separate vocabulary for full-text words
- ✅ **BM25 Scoring**: Okapi BM25 relevance ranking
- ✅ **TF-IDF Scoring**: Term frequency-inverse document frequency
- ✅ **Simple8b Compression**: Variable integer compression for postings
- ✅ **Gap Encoding**: Delta encoding for posting lists
- ✅ **DocsDB**: Optional text excerpts for result display
- ✅ **`ql:contains-word`**: Predicate for word matching
- ✅ **`ql:contains-entity`**: Predicate for entity matching

#### Federated Queries (SERVICE) & Virtual Graphs
- ✅ **Remote Endpoint Queries**: HTTP SPARQL endpoint integration
- ✅ **Endpoint Policies**: Whitelist/blacklist configuration
- ✅ **Pattern Matching**: URL pattern-based endpoint selection
- ✅ **Timeout Configuration**: Configurable request timeouts
- ✅ **Result Streaming**: Efficient processing of large remote result sets
- ✅ **Bound Joins**: FedX-style VALUES batching for 10-100x faster federation
- ✅ **Parallel Source Selection**: Concurrent ASK queries with caching
- ✅ **Cost-Based Join Ordering**: Automatic optimization of join order
- ✅ **Exclusive Groups**: Group patterns with the same source
- ✅ **Filter Pushdown**: Push filters to remote endpoints
- ✅ **Virtual Graphs**: R2RML mapping from SQL databases to RDF

### Updates & Transactions

#### SPARQL Update Operations
- ✅ **INSERT DATA**: Add triples
- ✅ **DELETE DATA**: Remove triples
- ✅ **DELETE/INSERT WHERE**: Conditional updates
- ✅ **CLEAR GRAPH**: Remove all triples from named graph
- ✅ **DROP GRAPH**: Remove named graph
- ✅ **LOAD**: Load external RDF sources

#### Delta Triples System
- ✅ **In-Memory Updates**: Tracking of insertions and deletions
- ✅ **Monotonic Read Guarantees**: Consistent query results
- ✅ **Snapshot Isolation**: Query isolation at snapshot level
- ✅ **Efficient Merging**: Combine delta triples with base index
- ✅ **Serialization**: Persist delta triples to disk

#### Blank Node Management
- ✅ **Cluster-Wide Allocation**: Unique blank node IDs across cluster
- ✅ **Block-Based Allocation**: Efficient ID assignment per node
- ✅ **Collision Prevention**: Guarantee of no duplicate blank node IDs
- ✅ **Local Manager**: Per-node blank node state

### Clustering & High Availability

#### Raft Consensus
- ✅ **OpenRaft Integration**: State-of-the-art Raft implementation
- ✅ **Leader Election**: Automatic leader election on failures
- ✅ **Log Replication**: Reliable replication of updates
- ✅ **Snapshot & Compaction**: Periodic log compaction
- ✅ **Membership Changes**: Dynamically add/remove nodes

#### Cluster Management
- ✅ **Leader Failover**: Automatic failover on leader crash
- ✅ **Follower Replication Status**: Real-time replication monitoring
- ✅ **Network Health Checking**: Periodic node health checks
- ✅ **Partition Detection**: Detection of network partitions
- ✅ **Cluster Health Metrics**: Green/Yellow/Red status indicators
- ✅ **Quorum Enforcement**: Majority consensus for writes

#### Network Layer
- ✅ **gRPC Communication**: High-performance binary protocol via tonic
- ✅ **TLS Encryption**: Optional transport encryption
- ✅ **Connection Pooling**: Reuse of network connections
- ✅ **Retry Logic**: Automatic retry on transient failures
- ✅ **Timeout Configuration**: Per-operation timeout settings

### Performance & Caching

#### Query Cache
- ✅ **LRU Eviction**: Least Recently Used cache eviction
- ✅ **Snapshot-Based Keys**: Cache keys tied to snapshot index
- ✅ **Automatic Invalidation**: Invalidate old entries on updates
- ✅ **Thread-Safe Access**: Concurrent cache reads/writes
- ✅ **Cache Statistics**: Hit/miss ratio tracking

#### Materialized Views
- ✅ **Named Result Cache**: Store query results with name
- ✅ **Pre-Computed Results**: Reuse of expensive queries
- ✅ **Manual Invalidation**: Explicit cache refresh
- ✅ **Result Serialization**: Efficient storage of cached results

#### Memory Management
- ✅ **mimalloc Allocator**: 5-15% performance improvement
- ✅ **External Sorting**: Sort datasets larger than RAM
- ✅ **Memory Limits**: Configurable memory budgets
- ✅ **Zero-Copy Operations**: Minimize data copying via memory mapping

### Security & Access Control (ACL/AuthN/AuthZ)

#### Authentication (AuthN)
- ✅ **LDAP Provider**: Connection to Active Directory/OpenLDAP servers
  - Connection pooling for efficient resource usage
  - User search and bind authentication
  - Group membership extraction (memberOf attribute)
  - Windows SID parsing (objectSid attribute)
  - Group-to-role and group-to-SID mapping
- ✅ **OpenID Connect (OIDC)**: OAuth2/JWT token authentication
  - Discovery document fetching (/.well-known/openid-configuration)
  - JWKS fetching with automatic caching and refresh
  - JWT validation (RS256, RS384, RS512, ES256, ES384, PS256, PS384, PS512)
  - Role extraction from claims (configurable claim paths)
  - SID extraction from group claims
- ✅ **HTTP Basic Authentication**: Simple username/password authentication
- ✅ **JWT Bearer Tokens**: Standalone JWT validation
- ✅ **Rate Limiting**: Brute force protection per IP/user

#### Authorization (AuthZ)
- ✅ **Role-Based Access Control (RBAC)**: Permission hierarchy
  - `None` → `Read` → `Write` → `Admin`
  - Multiple roles per Actor (most permissive wins)
  - Configurable role-to-permission mapping
- ✅ **Write Access Control**: SPARQL UPDATE permission validation
  - Graph-level write verification
  - Default graph access control
  - Atomic update rejection on inaccessible graphs

#### Graph-Level ACL (Apache Jena/Fuseki-style)
- ✅ **SecurityContext Trait**: Interface for access rules
  - `visible_graphs()`: Visible named graphs
  - `visible_default_graph()`: Default graph access
  - `predicate_quad()`: Quad-level filtering predicate
- ✅ **Visibility Patterns**:
  - `"**"` = All graphs including default
  - `"*"` = All named graphs, excluding default
  - Specific graph URIs
  - Empty list = no access
- ✅ **SecurityRegistry**: Actor/role to context mapping
- ✅ **FROM/FROM NAMED Intersection**: Automatic query rewriting

#### Triple-Level ACL (Elasticsearch-style Document Security)
- ✅ **Security Identifiers (SIDs)**: Windows-compatible SID format
  - Domain + RID structure (S-1-5-21-domain-RID)
  - User SID and Group SIDs per principal
- ✅ **PrincipalSidSet**: Collection of SIDs for an actor
- ✅ **SecurityAnnotationIndex**: SID-based triple filtering
- ✅ **RDF-star Security Annotations**: Fine-grained access control via quoted triples
- ✅ **AclDatasetWrapper**: Transparent filtering of query results

#### Audit Logging
- ✅ **Authentication Events**: Login success/failure logging
- ✅ **Authorization Failures**: Access denied logging with context
- ✅ **Structured Logging**: Machine-readable audit trails

### Developer & Operations Features

#### Index Building
- ✅ **Parallel Parsing**: Multi-threaded RDF parsing (N-Triples, N-Quads)
- ✅ **Progress Reporting**: Real-time progress bars with indicatif
- ✅ **Configurable Compression**: ZSTD levels 1-22
- ✅ **Partial Vocabulary Building**: Batch-based vocabulary construction
- ✅ **K-Way Merge**: Efficient merge of partial vocabularies
- ✅ **Temp File Management**: Automatic cleanup of temporary files
- ✅ **Resume Support**: Restart failed builds (via temp files)

#### Validation & Diagnostics
- ✅ **Index Validator**: Verify index integrity
- ✅ **Checksum Validation**: SHA256 checksums for data files
- ✅ **Component Validation**: Per-component validation (vocab, permutations)
- ✅ **Validation Reports**: Detailed error reporting
- ✅ **Query Tracing**: Structured logging of query execution

#### Logging & Monitoring
- ✅ **Structured Logging**: Tracing-based logging infrastructure
- ✅ **Log Levels**: Debug, Info, Warn, Error filtering
- ✅ **JSON Output**: Machine-readable log format
- ✅ **Span Instrumentation**: Performance profiling with tracing spans
- ✅ **Prometheus Metrics**: Export metrics for monitoring

#### HTTP/REST API (indentiadb-server)
- ✅ **SPARQL Endpoint**: HTTP POST/GET SPARQL queries
- ✅ **Multiple Output Formats**: JSON, XML, Turtle, CSV, TSV
- ✅ **CORS Support**: Cross-Origin Resource Sharing
- ✅ **GZIP Compression**: Response compression
- ✅ **Health Checks**: `/health` endpoint for liveness probes
- ✅ **Metrics Endpoint**: `/metrics` for Prometheus scraping
- ✅ **Graph Store Protocol**: RESTful RDF graph management

#### Elasticsearch Compatibility (Port 9200)
- ✅ **Full REST API**: Document CRUD, Search, Bulk, Index Management
- ✅ **Query DSL**: match, bool, term, range, knn, function_score, nested, fuzzy, wildcard, regexp
- ✅ **Retrievers API**: standard, knn, rrf, linear, pinned, text_similarity_reranker (ES 8.14+)
- ✅ **Aggregations**: bucket (terms, histogram, date_histogram, range, filter, nested), metric (avg, sum, min, max, count, cardinality), pipeline (bucket_script)
- ✅ **X-Pack Security**: API keys, users, roles, role mappings, privileges, audit logging
- ✅ **Kibana Compatible**: System indices (.kibana, .security, .monitoring), saved objects
- ✅ **Scroll & PIT**: Scroll API and Point-in-Time pagination
- ✅ **Cat APIs**: /_cat/indices, /_cat/health, /_cat/nodes, /_cat/templates, /_cat/aliases
- ✅ **Cluster APIs**: /_cluster/health, /_cluster/state, /_cluster/stats

### Testing & Quality

#### Test Coverage
- ✅ **Unit Tests**: Extensive unit test coverage
- ✅ **Integration Tests**: End-to-end test scenarios
- ✅ **Property-Based Testing**: PropTest for invariant checking
- ✅ **W3C Compliance Tests**: SPARQL 1.1 conformance suite
- ✅ **RDF 1.2 Conformance**: RDF 1.2 spec compliance tests
- ✅ **Equivalence Testing**: Verify parity with C++ QLever
- ✅ **Cluster Integration Tests**: Multi-node scenario testing

#### Benchmarking
- ✅ **Criterion Benchmarks**: Micro-benchmarks for critical paths
- ✅ **Query Benchmarks**: Macro-benchmarks on real datasets
- ✅ **Olympics Dataset**: Standard benchmark dataset
- ✅ **Performance Regression Detection**: Automated performance tracking

### Kubernetes Operator

#### Cluster Management
- ✅ **IndentiaDBCluster CRD**: Declarative cluster configuration
- ✅ **Reconciliation Loop**: Automatic state synchronization
- ✅ **StatefulSet Management**: Automated pod lifecycle management
- ✅ **Service Discovery**: Headless and client services
- ✅ **ConfigMap Generation**: Automatic configuration provisioning
- ✅ **PVC Management**: Persistent storage provisioning
- ✅ **Finalizers**: Cleanup on cluster deletion

#### Backend Support
- ✅ **SurrealDB Backend**: Integrated SurrealDB v3 deployment
- ✅ **TiKV Backend**: Distributed TiKV cluster deployment (optional)
- ✅ **Raft Configuration**: Automatic consensus configuration

#### Operations
- ✅ **Horizontal Scaling**: Dynamic scaling via replica count
- ✅ **Rolling Updates**: Zero-downtime upgrades
- ✅ **Health Monitoring**: Liveness and readiness probes
- ✅ **Status Reporting**: Cluster phase and conditions
- ✅ **ServiceMonitor**: Prometheus Operator integration

### Real-time Events & Alerting

#### LIVE Query Support
- ✅ **SurrealDB LIVE SELECT**: Native real-time subscriptions
- ✅ **Triple Event Stream**: Create, Update, Delete notifications
- ✅ **WebSocket Transport**: Bi-directional real-time communication
- ✅ **Filtering**: Filter on graph, subject, predicate, event type
- ✅ **Reconnection Handling**: Automatic reconnect with backoff

#### Alerting Engine
- ✅ **Pattern-based Alerts**: Trigger on SPARQL pattern matches
- ✅ **Threshold Alerts**: Trigger when values exceed thresholds
- ✅ **Change Detection**: INSERT, UPDATE, DELETE event triggers
- ✅ **Multi-channel Delivery**: Webhooks, Email, Slack, custom handlers
- ✅ **Alert Lifecycle**: Create, pause, resume, delete alerts
- ✅ **Rate Limiting**: Prevent alert storms
- ✅ **Deduplication**: Intelligent dedup with configurable window
- ✅ **Template Engine**: Customizable alert messages

### Bitemporal Support

#### Time Dimensions
- ✅ **Transaction Time**: System-managed, immutable timestamp
- ✅ **Valid Time**: User-specified temporal validity
- ✅ **Bi-temporal Queries**: Query both dimensions simultaneously
- ✅ **AS OF Queries**: Time-travel to specific moment

#### Storage
- ✅ **Version Tracking**: UUID v7 version identification
- ✅ **Temporal Indexes**: Optimized indexes for temporal queries
- ✅ **Current State View**: `triple_current` view for current state
- ✅ **History Retention**: Complete audit trail

### Semantic Inferencing (RDFS/OWL)

#### Reasoning Profiles
- ✅ **RDFS Reasoning**: subClassOf, subPropertyOf, domain, range
- ✅ **OWL Reasoning**: sameAs, inverseOf, transitiveProperty, symmetricProperty
- ✅ **Custom Rules**: User-defined inference rules

#### Execution Modes
- ✅ **Forward Chaining (Materialization)**: Eager inference on insert
- ✅ **Backward Chaining (Query Expansion)**: Lazy inference at query time
- ✅ **Hybrid Mode**: Combination for optimal performance
- ✅ **Incremental Updates**: Efficient inference maintenance

#### Advanced Features
- ✅ **Rete Network**: Efficient pattern matching algorithm
- ✅ **Explanation/Proof**: Trace how inferences were derived
- ✅ **Inference Retraction**: Correct handling on data deletion
- ✅ **Statistics**: Inference performance metrics

### WebAssembly (WASM) Support

- ✅ **Browser Compatibility**: Run IndentiaDB in the browser
- ✅ **Edge Computing**: Lightweight deployment on edge devices
- ✅ **wasm-bindgen**: JavaScript/TypeScript bindings
- ✅ **Index Reading**: Read and query indexes in WASM
- ✅ **Vocabulary Support**: Full vocabulary access

---

## Dual Storage Backends

IndentiaDB supports **two storage backends** optimized for different use cases:

### SurrealDB Backend (Default)

| Property | Value |
|----------|-------|
| **Type** | Embedded multi-model database |
| **Suitable for** | Development, small/medium deployments, edge computing |
| **Setup** | Zero configuration - starts immediately |
| **Replication** | Via Raft consensus (built-in) |
| **Features** | LIVE queries, real-time subscriptions, hybrid SPARQL+SurrealQL |

```toml
[storage]
backend = "surrealdb"
path = "/data/indentiadb"
```

### TiKV Backend (Production)

| Property | Value |
|----------|-------|
| **Type** | Distributed key-value store (CNCF graduated) |
| **Suitable for** | Large datasets, high availability, multi-datacenter |
| **Setup** | Separate TiKV cluster (3+ nodes recommended) |
| **Replication** | Multi-Raft with automatic sharding |
| **Features** | Horizontal scalability, ACID transactions, PD scheduling |

```toml
[storage]
backend = "tikv"
pd_endpoints = ["pd-0:2379", "pd-1:2379", "pd-2:2379"]
```

### Storage Backend Comparison

| Aspect | SurrealDB | TiKV |
|--------|-----------|------|
| **Complexity** | ⭐ Low | ⭐⭐⭐ High |
| **Scalability** | ⭐⭐ Vertical | ⭐⭐⭐⭐⭐ Horizontal |
| **Latency** | ⭐⭐⭐⭐ Sub-ms | ⭐⭐⭐ Low ms |
| **HA** | ✅ Raft | ✅ Multi-Raft |
| **Max Dataset** | ~100GB | 100TB+ |
| **LIVE Queries** | ✅ Native | 🔧 Via polling |
| **Multi-DC** | ❌ | ✅ |

### When to Choose Which Backend?

**Choose SurrealDB when:**
- Fast development and prototyping
- Dataset < 100GB
- Real-time subscriptions required
- Simple deployment desired
- Edge/embedded scenarios

**Choose TiKV when:**
- Dataset > 100GB
- Multi-datacenter replication needed
- Horizontal scalability required
- Maximum durability important
- Integration with TiDB ecosystem

---

## Multi-Modal Platform

IndentiaDB is a **unified platform** that combines three data models:

```
┌─────────────────────────────────────────────────────────────────┐
│                      IndentiaDB Multi-Modal                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐│
│  │  RDF/SPARQL  │   │    JSON      │   │   Full-Text Search   ││
│  │  Knowledge   │ + │  Documents   │ + │  (ES Compatible)     ││
│  │    Graph     │   │  (SurrealQL) │   │                      ││
│  └──────┬───────┘   └──────┬───────┘   └──────────┬───────────┘│
│         │                  │                       │            │
│         └──────────────────┼───────────────────────┘            │
│                            ▼                                    │
│              ┌──────────────────────────┐                       │
│              │    Unified Query Layer   │                       │
│              │  SPARQL + SurrealQL +    │                       │
│              │  ES Query DSL + Hybrid   │                       │
│              └──────────────────────────┘                       │
│                            │                                    │
│              ┌─────────────┴─────────────┐                      │
│              ▼                           ▼                      │
│     ┌──────────────┐            ┌──────────────┐                │
│     │   SurrealDB  │     or     │     TiKV     │                │
│     │   (Simple)   │            │ (Distributed)│                │
│     └──────────────┘            └──────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model Capabilities

| Capability | RDF/SPARQL | JSON/SurrealQL | ES Full-Text |
|------------|------------|----------------|--------------|
| **Schema** | Ontology-based | Schema-less | Mapping-based |
| **Relations** | First-class (triples) | References/Relations | Nested objects |
| **Query Language** | SPARQL 1.2 | SurrealQL | ES Query DSL |
| **Inferencing** | ✅ RDFS/OWL | ❌ | ❌ |
| **Full-text** | ✅ (ql:contains) | ✅ | ✅ Native |
| **Aggregations** | GROUP BY | GROUP BY + Math | Aggregations |
| **Real-time** | LIVE SELECT | LIVE SELECT | ❌ |

### Hybrid Query Examples

**Combining RDF + JSON:**
```sql
-- Retrieve RDF data, store in JSON
LET $experts = SPARQL("
  SELECT ?person ?skill WHERE {
    ?person ex:hasExpertise ?skill .
    FILTER(?skill = 'Rust')
  }
");

-- Combine with document data
SELECT * FROM employees
WHERE email IN $experts.person;
```

**ES Search + RDF Enrichment:**
```python
# Search documents, enrich with knowledge graph
result = es.search(
    index="products",
    query={"match": {"title": "laptop"}},
    _ext={
        "sparql_enrich": {
            "uri_field": "product_uri",
            "query": "SELECT ?manufacturer WHERE { $uri schema:manufacturer/schema:name ?manufacturer }"
        }
    }
)
```

---

## Comparison with Alternatives

| Feature | IndentiaDB | QLever (C++) | Oxigraph | Blazegraph | Apache Jena | MarkLogic |
|---------|------------|--------------|----------|------------|-------------|-----------|
| **Language** | Rust 🦀 | C++ | Rust 🦀 | Java ☕ | Java ☕ | C++ |
| **Memory Safety** | ✅ | ❌ | ✅ | ✅ (GC) | ✅ (GC) | ❌ |
| **Clustering** | ✅ Raft | ❌ | ❌ | ✅ | Limited | ✅ |
| **Dual Storage** | ✅ SurrealDB/TiKV | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multi-Modal** | ✅ RDF+JSON+ES | ❌ | ❌ | ❌ | ❌ | ✅ |
| **SPARQL 1.1** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SPARQL 1.2** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **RDF 1.2 Triple Terms** | ✅ | Partial | ❌ | ❌ | ✅ | ❌ |
| **Property Paths** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GeoSPARQL** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Full-Text Search** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Federated Queries** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **SPARQL UPDATE** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **6 Permutations** | ✅ | ✅ | ❌ (2) | Variable | Variable | N/A |
| **QLever Index Compat** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **RAG Optimized** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **ES Compatibility** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Kibana Support** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Bitemporal** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **RDFS/OWL Reasoning** | ✅ | ❌ | ❌ | ✅ | ✅ | Partial |
| **Real-time Events** | ✅ LIVE | ❌ | ❌ | ❌ | ❌ | ✅ |
| **K8s Operator** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **WASM Support** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **License** | TBD | Open | Open | Open | Open | Proprietary |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Maturity** | Beta | Production | Production | Production | Production | Production |

### Security Features Comparison

| Security Feature | IndentiaDB | QLever (C++) | Oxigraph | Blazegraph | Apache Jena | MarkLogic |
|------------------|------------|--------------|----------|------------|-------------|-----------|
| **LDAP Authentication** | ✅ | ❌ | ❌ | ❌ | ✅ (Shiro) | ✅ |
| **OIDC/OAuth2** | ✅ | ❌ | ❌ | ❌ | ✅ (Plugin) | ✅ |
| **JWT Tokens** | ✅ | ❌ | ❌ | ❌ | ✅ (Plugin) | ✅ |
| **HTTP Basic Auth** | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **RBAC** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Graph-Level ACL** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Triple-Level ACL** | ✅ (SIDs) | ❌ | ❌ | ❌ | Partial | ✅ |
| **Windows SID Support** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Rate Limiting** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Audit Logging** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Connection Pooling** | ✅ | N/A | N/A | ✅ | ✅ | ✅ |
| **FROM Clause Filtering** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **RDF-star Security** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **X-Pack Compatible** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Pricing Comparison

| Aspect | IndentiaDB | MarkLogic | Neo4j Enterprise | AWS Neptune |
|--------|------------|-----------|------------------|-------------|
| **Model** | TBD | Proprietary | Proprietary | Cloud Service |
| **License** | TBD | Per Core | Per Core | Pay-per-use |
| **Entry Cost** | €0 | €€€€€ | €€€€ | Variable |
| **Self-hosted** | ✅ | ✅ | ✅ | ❌ |
| **Cloud Managed** | Coming soon | ✅ | ✅ | ✅ |
| **Support** | Community + Enterprise | Enterprise only | Enterprise only | AWS Support |

---

## Architecture

The codebase is organized as a Rust workspace:

```
indentiadb/
├── indentiadb-cli/           # Command-line tool for management
├── indentiadb-server/        # HTTP SPARQL server
├── indentiadb-builder/       # Index builder (high-performance)
├── indentiadb-cluster/       # Raft protocol & networking
├── indentiadb-query/         # SPARQL parser, planner, evaluator
├── indentiadb-storage/       # Index storage, vocabulary, delta-triples
├── indentiadb-auth/          # Authentication, Authorization & ACL
├── indentiadb-surreal/       # SurrealDB backend, ES compat, alerting, inferencing
├── indentiadb-operator/      # Kubernetes operator (kube-rs)
├── indentiadb-wasm/          # WebAssembly bindings
└── indentiadb-core/          # Shared types and traits
```

### Index Structure
IndentiaDB uses 6 permutations (SPO, SOP, PSO, POS, OSP, OPS) for efficient query evaluation. The vocabulary uses a combined structure with efficient hash-lookup and inline storage for small literals.

---

## Performance & Benchmarks

IndentiaDB is optimized for maximum throughput and low latency, with specific optimizations for modern hardware.

### Recent Improvements
*   **Memory Allocation**: Use of `mimalloc` as default allocator provides 5-15% better performance.
*   **Compiler Optimizations**: Aggressive optimizations like LTO (Link Time Optimization) and specific CPU-target settings.
*   **Apple Silicon (M1/M2/M3)**: Native support for ARM64 NEON SIMD instructions and LSE atomics.

### Benchmark Results (Olympics Dataset)

| System | Average Query Time | vs Oxigraph |
|--------|-------------------|-------------|
| 🥇 **QLever Native (C++)** | **52ms** | 33x faster |
| 🥈 **IndentiaDB (Rust)** | **344ms** | **5x faster** |
| 🥉 **Oxigraph (Rust)** | 1764ms | baseline |

*Tested on Apple M2 Max, January 2026*

---

## Installation

### Requirements

*   Rust toolchain (version 1.75 or higher)
*   A Linux or macOS environment
*   `cmake` and a C++ compiler (for dependencies)

### Building (Native)

IndentiaDB can be compiled for all major platforms. For production environments, we recommend building *release* builds with CPU optimizations.

#### macOS (Apple Silicon & Intel)
The build configuration automatically detects the architecture. For Apple Silicon (M1/M2/M3), NEON optimizations are automatically activated.

```bash
# Build
cargo build --release
```

#### Linux (AMD64)
For maximum performance on Linux servers, use the `native` CPU target flag. This optimizes the binary for the specific processor of the host machine (e.g., AVX2/AVX-512 instructions).

```bash
# Build with specific CPU optimizations
RUSTFLAGS="-C target-cpu=native" cargo build --release
```

#### Windows (x64)
Ensure you have the Rust toolchain and C++ build tools (Visual Studio Build Tools with CMake) installed.

```powershell
# PowerShell
cargo build --release
```

---

### Docker

There is no standard Dockerfile in the repository, but you can easily containerize the application with a multi-stage build.

**1. Create a `Dockerfile`:**

```dockerfile
FROM rust:1.75-bookworm as builder
WORKDIR /usr/src/app
COPY . .
RUN cargo build --release -p indentiadb-cli -p indentiadb-builder

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/src/app/target/release/indentiadb /usr/local/bin/
COPY --from=builder /usr/src/app/target/release/indentiadb-indexer /usr/local/bin/
EXPOSE 7001 7002
VOLUME ["/data", "/config"]
ENTRYPOINT ["indentiadb"]
CMD ["serve", "--config", "/config/indentiadb.toml"]
```

**2. Build and Run:**

```bash
# Build image
docker build -t indentiadb .

# Run container (ensure config and data volumes)
docker run -d \
  -p 7001:7001 \
  -p 7002:7002 \
  -v $(pwd)/config:/config \
  -v $(pwd)/data:/data \
  indentiadb
```

---

## Quick Start

### 1. Index Data

```bash
# Index a Turtle dataset (automatically parallel on M-series chips)
./target/release/indentiadb-indexer \
    -i my-index \
    -F ttl \
    -f data.ttl \
    --threads 0  # 0 = auto-detect cores
```

### 2. Start Server

```bash
# Start the server on port 7020
./target/release/indentiadb-server -i my-index -p 7020
```

### 3. Query

```bash
# Via curl
curl -s 'http://localhost:7020/sparql' \
    --data-urlencode 'query=SELECT * WHERE { ?s ?p ?o } LIMIT 5'
```

---

## Development

### Running Tests
```bash
cargo test
cargo test -p indentiadb-query  # Specific crate
```

### Benchmarks
```bash
cargo bench -p indentiadb-query
```
