# IndentiaDB

**De next-generation multi-model database voor Knowledge Graphs en Enterprise AI.**

IndentiaDB combineert alle enterprise features in één platform: **ACID**, **schaalbaar**, **full-text search**, **real-time**, **graph**, **relational**, **multi-tenant**, **bitemporal**, **schema-less**, **schema-full**, **serverless**, **embedded** — één database voor al uw data-uitdagingen.

> **Full-text search + semantic reasoning + graph traversal + RDF-star provenance — in één query.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              IndentiaDB                                   │
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

IndentiaDB is een **multi-model database** die elementen van **relationeel**, **graph** en **document** paradigma's combineert in één pakket. Query met SPARQL, SurrealQL of Elasticsearch Query DSL — de keuze is aan jou.

De engine is volledig geschreven in **Rust** en ondersteunt meerdere persistence layers: **TiKV** voor horizontale schaalbaarheid in de cloud, of **SurrealDB** als single node — zowel in-memory als on-disk.

**Complexe relaties zonder JOINs**: IndentiaDB kan complexe relaties aan zoals traditionele relationele databases, maar doet dit zonder joins. In plaats daarvan gebruikt het technieken zoals **record links** en **graph connections** die niet alleen complexe datamodellen ondersteunen, maar ook resulteren in bondige, developer-friendly code.

**Schema-less of Schema-full**: Standaard schema-less, wat betekent dat je impliciet ongestructureerde data kunt creëren in elke tabel. Maar je kunt kiezen voor schema-full tabellen wanneer het datamodel goed gedefinieerd is.

**ACID compliant** met transacties over meerdere tabellen die ook **events emitten** wanneer data verandert — zo kun je **real-time updates** ontvangen in je front-end applicatie, net zoals Firebase. En daar bovenop: **geospatiale data**, **bitemporal queries**, **predefined analytics views**, **semantic inferencing** — allemaal beveiligd met **fine-grained permissions** out of the box.

---

## Waarom IndentiaDB?

| Uitdaging | Traditionele Oplossing | IndentiaDB |
|-----------|------------------------|---------------|
| Knowledge Graph + Documents | 2 databases (Neo4j + MongoDB) | 1 platform |
| Full-text Search | Aparte ES cluster | Ingebouwd (ES-compatible) |
| Real-time Updates | Custom WebSocket code | `LIVE SELECT` out-of-the-box |
| Complex Relationships | JOIN hell | Record links + Graph edges |
| Schema Evolution | Migraties, downtime | Schema-less → Schema-full |
| AI/RAG Integration | Data export nodig | Native RDF 1.2 met provenance |
| Multi-tenant Security | Application-level | Database-level ACL |

---

## Kenmerken

*   **Multi-Model Database**: Combineer RDF triples, JSON documents en graph edges in één unified platform.
*   **Hoge Prestaties**: Geavanceerde compressie (FSST, ZSTD) en query-optimalisatie voor razendsnelle antwoorden op miljarden triples.
*   **Horizontaal Schaalbaar**: Keuze uit SurrealDB (embedded) of TiKV (distributed) met automatische sharding en replicatie.
*   **Real-time First**: LIVE queries met push notifications — reageer direct op data changes via WebSocket.
*   **ACID Transactions**: Transacties over meerdere tabellen met snapshot isolation en monotonic reads.
*   **No-JOIN Architecture**: Record links en graph connections voor complexe relaties zonder JOIN overhead.
*   **RDF 1.2 & SPARQL 1.2 (WD Jan 29, 2026)**: Nieuwste standaarden inclusief Triple Terms (RDF-star) voor RAG en provenance.
*   **Elasticsearch Compatible**: Volledige ES 9.x REST API — gebruik Kibana, Logstash, Beats zonder wijzigingen.
*   **Semantic Inferencing**: RDFS/OWL reasoning met forward/backward chaining en explanation support.
*   **Bitemporal Queries**: Time-travel met transaction time én valid time — query data "as of" elk moment.
*   **Enterprise Security**: LDAP, OIDC, JWT authenticatie met RBAC en fine-grained ACL op triple-niveau.
*   **Memory Safe**: 100% Rust — geen garbage collection pauses, geen buffer overflows, geen data races.
*   **Kubernetes Native**: Operator met `IndentiaDBCluster` CRD voor declaratief cluster management.
*   **WASM Support**: Run in de browser of op edge devices via WebAssembly.
*   **Geospatial**: GeoSPARQL met centimeter-precisie, nearest neighbor search en topologische relaties.
*   **Full-Text Search**: BM25/TF-IDF ranking, fragment inverted index, `ql:contains-word` predicates.
*   **Schema Flexibility**: Start schema-less, migreer naar schema-full wanneer je model stabiliseert.
*   **Developer Friendly**: Intuïtieve query syntax, structured logging, Prometheus metrics, CLI tools.

---

## 🎯 Complete Feature Overzicht

### 📊 RDF & SPARQL Standaarden

#### Standards Compliance
> Conform W3C RDF 1.2 Working Draft (28 jan 2026) en SPARQL 1.2 Working Draft (29 jan 2026).
> Inclusief alle normatieve wijzigingen: sameValue drie-waardige vergelijking, GROUP_CONCAT xsd:string retourtype, property path evaluatie fixes, en Extend multipliciteit.

#### RDF 1.2 Ondersteuning
- ✅ **Triple Terms (Quoted Triples)**: Maak statements over statements voor provenance tracking
- ✅ **Reified Triples**: Ondersteuning voor `~` operator syntax
- ✅ **Base Direction Tags**: Taalrichtingen voor internationalisatie (`@ar--rtl`, `@en--ltr`)
- ✅ **RDF-star Syntax**: Volledig geïmplementeerd in parser en storage layer

#### SPARQL 1.2 Query Functies
- ✅ **TRIPLE(s, p, o)**: Construeer triple terms dynamisch
- ✅ **SUBJECT(t)**: Extraheer subject uit triple term
- ✅ **PREDICATE(t)**: Extraheer predicate uit triple term
- ✅ **OBJECT(t)**: Extraheer object uit triple term
- ✅ **isTRIPLE(t)**: Type check voor triple terms
- ✅ **LANGDIR()**: Directionele taal tag functies
- ✅ **SEMIJOIN/ANTIJOIN**: Efficiënte EXISTS/NOT EXISTS operatoren

#### SPARQL 1.1 Query Forms
- ✅ **SELECT**: Standaard query resultaten
- ✅ **CONSTRUCT**: RDF graph constructie
- ✅ **ASK**: Boolean query resultaten
- ✅ **DESCRIBE**: Resource beschrijving queries
- ✅ **SPARQL UPDATE**: INSERT DATA, DELETE DATA, DELETE/INSERT WHERE, LOAD, CLEAR, CREATE, DROP (incl. RDF-star quoted triples)

### 🗄️ Storage & Index Management

#### Index Structuur
- ✅ **6 Permutaties**: SPO, SOP, PSO, POS, OSP, OPS voor optimale query performance
- ✅ **ZSTD Compressie**: Instelbare compressie niveaus (1-22) met standaard niveau 3
- ✅ **Delta Encoding**: Efficiënte varint encoding voor triples binnen blocks
- ✅ **Block Metadata**: Binary-compatible met C++ QLever format (PR #1572)
- ✅ **Memory-Mapped I/O**: Efficiënte disk access zonder volledige data load

#### Vocabulary Management
- ✅ **FSST Decompression**: C++ QLever vocabulary compatibility
- ✅ **Dual Vocabulary**: Gescheiden internal (IRIs) en external (literals) vocabularies
- ✅ **Prefix Compression**: Efficiënte opslag van gemeenschappelijke IRI prefixes
- ✅ **Runtime Vocabulary**: Dynamische vocabulary extensie tijdens updates
- ✅ **Inline Literals**: Kleine literals direct in ID geëncodeerd

#### Data Formats
- ✅ **N-Triples (.nt)**: Line-based parallel parsing
- ✅ **N-Quads (.nq)**: Quad support met named graphs
- ✅ **Turtle (.ttl)**: Compacte RDF syntax
- ✅ **TriG (.trig)**: Named graphs in Turtle syntax
- ✅ **Auto-detect**: Automatische format herkenning op basis van bestandsextensie

### 🔍 Query Execution & Optimization

#### Query Optimizer
- ✅ **Cost-Based Optimization**: Permutatie selectie gebaseerd op cardinality estimates
- ✅ **Filter Pushdown**: Verplaats filters naar data source voor betere performance
- ✅ **Join Optimization**: Automatische join order optimalisatie
- ✅ **Cardinality Estimation**: Schatting van intermediate result sizes
- ✅ **Statistics Collection**: Index statistieken voor query planning
- ✅ **Block-Level Pruning**: Skip blocks op basis van metadata

#### Join Strategies
- ✅ **Hash Join**: O(1) lookup voor high-cardinality joins
- ✅ **Merge Join**: Efficiënt voor gesorteerde inputs
- ✅ **Index Nested Loop**: Gebruik permutation indexes voor lookups
- ✅ **EXISTS Join**: Gespecialiseerde semi-join implementatie

#### Aggregation
- ✅ **Hash-Based Aggregation**: O(1) group lookup
- ✅ **Sorted Aggregation**: O(1) per-row voor gesorteerde input
- ✅ **COUNT, SUM, AVG, MIN, MAX**: Standaard aggregate functies
- ✅ **GROUP_CONCAT**: String concatenatie aggregatie (retourneert `xsd:string` per SPARQL 1.2)
- ✅ **SAMPLE**: Willekeurige waarde uit groep

### 🌐 Geavanceerde Query Features

#### Property Paths (SPARQL 1.2 compliant — Issue #266, #267)
- ✅ **Sequence Paths**: `/` operator voor pad sequenties (existentieel gekwantificeerde intermediairs)
- ✅ **Alternative Paths**: `|` operator voor pad alternatieven
- ✅ **Transitive Paths**: `+` en `*` operatoren met BFS en visited-set cycle detection
- ✅ **Inverse Paths**: `^` operator voor omgekeerde richting
- ✅ **Negated Property Sets**: `!` operator
- ✅ **Bidirectional Search**: Optimalisatie voor transitive closure

#### Path Search Algorithms
- ✅ **Dijkstra's Algorithm**: Kortste pad met weights
- ✅ **Breadth-First Search**: Ongewogen kortste pad
- ✅ **All Paths**: Vind alle paden tussen nodes
- ✅ **K-Shortest Paths**: Vind top K kortste paden

#### Spatial & Geographic Queries (GeoSPARQL)
- ✅ **GeoPoint Encoding**: 60-bit encoding (30 lat + 30 lon) met centimeter precisie
- ✅ **Nearest Neighbor Search**: K-nearest points queries
- ✅ **Distance Joins**: Join op geografische afstand
- ✅ **Bounding Box Filtering**: Efficiënte spatial indexing
- ✅ **Haversine Distance**: Nauwkeurige afstandsberekening op Earth surface
- ✅ **WKT Parsing**: Well-Known Text format ondersteuning
- ✅ **Topologische Relaties**: `sf:intersects`, `sf:contains`, `sf:within`, `sf:overlaps`, etc.
- ✅ **Geometry Properties**: `dimension`, `isEmpty`, `envelope`, `buffer`

#### Full-Text Search
- ✅ **Text Index Reader**: Inverted index voor woord lookups
- ✅ **Text Vocabulary**: Gescheiden vocabulary voor full-text woorden
- ✅ **BM25 Scoring**: Okapi BM25 relevantie ranking
- ✅ **TF-IDF Scoring**: Term frequency-inverse document frequency
- ✅ **Simple8b Compression**: Variabele integer compressie voor postings
- ✅ **Gap Encoding**: Delta encoding voor posting lists
- ✅ **DocsDB**: Optionele text excerpts voor result display
- ✅ **`ql:contains-word`**: Predicate voor woord matching
- ✅ **`ql:contains-entity`**: Predicate voor entity matching

#### Vector Search (ANN) — *New!*
- ✅ **IVF Index**: Inverted File index met k-means clustering (geporteerd van ArangoDB)
- ✅ **Similarity Metrics**: L2, Cosine, InnerProduct met correcte sort ordering
- ✅ **Approximate Nearest Neighbor**: Configurable nProbe voor recall/speed tradeoff
- ✅ **Filter Pushdown**: Pre-filtering tijdens vector search met stored values
- ✅ **Training Pipeline**: Automatische k-means training op bestaande data
- ✅ **Stored Values**: Covering index support voor filter-only queries
- ✅ **Optimizer Integration**: `use_vector_index_rule` voor automatische index selectie
- ✅ **APPROX_NEAR Functions**: `APPROX_NEAR_L2`, `APPROX_NEAR_COSINE`, `APPROX_NEAR_INNER_PRODUCT`

#### Federated Queries (SERVICE) & Virtual Graphs
- ✅ **Remote Endpoint Queries**: HTTP SPARQL endpoint integration
- ✅ **Endpoint Policies**: Whitelist/blacklist configuratie
- ✅ **Pattern Matching**: URL pattern-based endpoint selectie
- ✅ **Timeout Configuration**: Configureerbare request timeouts
- ✅ **Result Streaming**: Efficiënte verwerking van grote remote resultsets
- ✅ **Bound Joins**: FedX-style VALUES batching voor 10-100x snellere federation
- ✅ **Parallel Source Selection**: Concurrent ASK queries met caching
- ✅ **Cost-Based Join Ordering**: Automatische optimalisatie van join volgorde
- ✅ **Exclusive Groups**: Groepeer patterns met dezelfde bron
- ✅ **Filter Pushdown**: Verplaats filters naar remote endpoints
- ✅ **Virtual Graphs**: R2RML mapping van SQL databases naar RDF
- ✅ **LocalTripleSource**: Volledige algebra evaluatie tegen SurrealDB
- ✅ **ServiceResolver**: Pluggable SERVICE clause delegatie
- ✅ **SERVICE SILENT**: Error handling mode voor onbetrouwbare endpoints
- ✅ **DefaultServiceResolver**: On-demand endpoint instantiatie met caching

### 🔄 Updates & Transactions

#### SPARQL Update Operations
- ✅ **INSERT DATA**: Voeg triples toe (incl. RDF-star quoted triples)
- ✅ **DELETE DATA**: Verwijder triples (incl. RDF-star quoted triples)
- ✅ **DELETE/INSERT WHERE**: Conditionele updates met WHERE pattern evaluatie
- ✅ **CLEAR GRAPH**: Verwijder alle triples uit named graph
- ✅ **CREATE GRAPH**: Maak een nieuwe named graph aan
- ✅ **DROP GRAPH**: Verwijder named graph
- ✅ **LOAD**: Laad externe RDF bronnen

#### Delta Triples System
- ✅ **In-Memory Updates**: Tracking van insertions en deletions
- ✅ **Monotonic Read Guarantees**: Consistente query resultaten
- ✅ **Snapshot Isolation**: Query isolation op snapshot niveau
- ✅ **Efficient Merging**: Combine delta triples met base index
- ✅ **Serialization**: Persisteer delta triples naar disk

#### Blank Node Management
- ✅ **Cluster-Wide Allocation**: Unieke blank node IDs across cluster
- ✅ **Block-Based Allocation**: Efficiënte ID toewijzing per node
- ✅ **Collision Prevention**: Garantie van geen duplicate blank node IDs
- ✅ **Local Manager**: Per-node blank node state

### 🔧 Clustering & High Availability

#### Raft Consensus
- ✅ **OpenRaft Integration**: State-of-the-art Raft implementatie
- ✅ **Leader Election**: Automatische leader verkiezing bij failures
- ✅ **Log Replication**: Betrouwbare replicatie van updates
- ✅ **Snapshot & Compaction**: Periodieke log compaction
- ✅ **Membership Changes**: Dynamisch toevoegen/verwijderen van nodes

#### Cluster Management
- ✅ **Leader Failover**: Automatische failover bij leader crash
- ✅ **Follower Replication Status**: Real-time replicatie monitoring
- ✅ **Network Health Checking**: Periodieke node health checks
- ✅ **Partition Detection**: Detectie van network partitions
- ✅ **Cluster Health Metrics**: Groen/Geel/Rood status indicatoren
- ✅ **Quorum Enforcement**: Majority consensus voor writes

#### Network Layer
- ✅ **gRPC Communication**: High-performance binary protocol via tonic
- ✅ **TLS Encryption**: Optionele transport encryptie
- ✅ **Connection Pooling**: Hergebruik van netwerk connecties
- ✅ **Retry Logic**: Automatische retry bij transient failures
- ✅ **Timeout Configuration**: Per-operatie timeout settings

### ⚡ Performance & Caching

#### Query Cache
- ✅ **LRU Eviction**: Least Recently Used cache eviction
- ✅ **Snapshot-Based Keys**: Cache keys gekoppeld aan snapshot index
- ✅ **Automatic Invalidation**: Invalideer oude entries bij updates
- ✅ **Thread-Safe Access**: Concurrent cache reads/writes
- ✅ **Cache Statistics**: Hit/miss ratio tracking

#### Materialized Views
- ✅ **Named Result Cache**: Bewaar query resultaten met naam
- ✅ **Pre-Computed Results**: Hergebruik van dure queries
- ✅ **Manual Invalidation**: Expliciete cache refresh
- ✅ **Result Serialization**: Efficiënte storage van cached results

#### Memory Management
- ✅ **mimalloc Allocator**: 5-15% performance verbetering
- ✅ **External Sorting**: Sort datasets groter dan RAM
- ✅ **Memory Limits**: Configureerbare memory budgets
- ✅ **Zero-Copy Operations**: Minimize data copying via memory mapping

### 🔐 Security & Access Control (ACL/AuthN/AuthZ)

#### Authentication (AuthN)
- ✅ **LDAP Provider**: Verbinding met Active Directory/OpenLDAP servers
  - Connection pooling voor efficiënt resource gebruik
  - User search en bind authenticatie
  - Group membership extractie (memberOf attribute)
  - Windows SID parsing (objectSid attribute)
  - Group-to-role en group-to-SID mapping
- ✅ **OpenID Connect (OIDC)**: OAuth2/JWT token authenticatie
  - Discovery document fetching (/.well-known/openid-configuration)
  - JWKS fetching met automatische caching en refresh
  - JWT validatie (RS256, RS384, RS512, ES256, ES384, PS256, PS384, PS512)
  - Role extractie uit claims (configureerbare claim paths)
  - SID extractie uit group claims
- ✅ **HTTP Basic Authentication**: Eenvoudige username/password authenticatie
- ✅ **JWT Bearer Tokens**: Standalone JWT validatie
- ✅ **Rate Limiting**: Brute force bescherming per IP/user

#### Authorization (AuthZ)
- ✅ **Role-Based Access Control (RBAC)**: Permission hierarchy
  - `None` → `Read` → `Write` → `Admin`
  - Meerdere rollen per Actor (meest permissieve wint)
  - Configureerbare role-to-permission mapping
- ✅ **Write Access Control**: SPARQL UPDATE permissie validatie
  - Graph-level write verificatie
  - Default graph access control
  - Atomaire update rejection bij ontoegankelijke graphs

#### Graph-Level ACL (Apache Jena/Fuseki-style)
- ✅ **SecurityContext Trait**: Interface voor toegangsregels
  - `visible_graphs()`: Zichtbare named graphs
  - `visible_default_graph()`: Default graph toegang
  - `predicate_quad()`: Quad-level filtering predicate
- ✅ **Visibility Patterns**:
  - `"**"` = Alle graphs inclusief default
  - `"*"` = Alle named graphs, exclusief default
  - Specifieke graph URIs
  - Lege lijst = geen toegang
- ✅ **SecurityRegistry**: Actor/role naar context mapping
- ✅ **FROM/FROM NAMED Intersection**: Automatische query rewriting

#### Triple-Level ACL (Elasticsearch-style Document Security)
- ✅ **Security Identifiers (SIDs)**: Windows-compatible SID format
  - Domain + RID structuur (S-1-5-21-domain-RID)
  - User SID en Group SIDs per principal
- ✅ **PrincipalSidSet**: Verzameling SIDs voor een actor
- ✅ **SecurityAnnotationIndex**: SID-based triple filtering
- ✅ **RDF-star Security Annotations**: Fine-grained access control via quoted triples
- ✅ **AclDatasetWrapper**: Transparante filtering van query resultaten

#### Audit Logging
- ✅ **Authentication Events**: Login success/failure logging
- ✅ **Authorization Failures**: Access denied logging met context
- ✅ **Structured Logging**: Machine-readable audit trails

### 🛠️ Developer & Operations Features

#### Index Building
- ✅ **Parallel Parsing**: Multi-threaded RDF parsing (N-Triples, N-Quads)
- ✅ **Progress Reporting**: Real-time progress bars met indicatif
- ✅ **Configurable Compression**: ZSTD levels 1-22
- ✅ **Partial Vocabulary Building**: Batch-based vocabulary construction
- ✅ **K-Way Merge**: Efficiënte merge van partial vocabularies
- ✅ **Temp File Management**: Automatische cleanup van temporary files
- ✅ **Resume Support**: Herstart failed builds (via temp files)

#### Validation & Diagnostics
- ✅ **Index Validator**: Verifieer index integriteit
- ✅ **Checksum Validation**: SHA256 checksums voor data files
- ✅ **Component Validation**: Per-component validatie (vocab, permutaties)
- ✅ **Validation Reports**: Gedetailleerde fout rapportage
- ✅ **Query Tracing**: Gestructureerde logging van query execution

#### Logging & Monitoring
- ✅ **Structured Logging**: Tracing-based logging infrastructure
- ✅ **Log Levels**: Debug, Info, Warn, Error filtering
- ✅ **JSON Output**: Machine-readable log format
- ✅ **Span Instrumentation**: Performance profiling met tracing spans
- ✅ **Prometheus Metrics**: Exporteer metrics voor monitoring

#### HTTP/REST API (indentiadb-server)
- ✅ **SPARQL Endpoint**: HTTP POST/GET SPARQL queries
- ✅ **Multiple Output Formats**: JSON, XML, Turtle, CSV, TSV
- ✅ **CORS Support**: Cross-Origin Resource Sharing
- ✅ **GZIP Compression**: Response compression
- ✅ **Health Checks**: `/health` endpoint voor liveness probes
- ✅ **Metrics Endpoint**: `/metrics` voor Prometheus scraping
- ✅ **Graph Store Protocol**: RESTful RDF graph management
- ✅ **GraphQL Endpoint**: `/graphql` query + mutation flow met dynamische schema generatie
- ✅ **SHACL Endpoint**: `/shacl/validate` voor request-driven shape validatie
- ✅ **Entity Resolution Endpoint**: `/entity-resolution/match` (stateless match scoring/classificatie)
- ✅ **Geospatial Endpoint**: `/geospatial/evaluate` (GeoSPARQL `geof:*` function evaluator)
- ✅ **Actor/Role Resource Limits**: per-actor/per-role overrides enforced in `/sparql` en `/graphql`
- ✅ **RDF-star Graph Store Output**: quoted triples serialiseren correct; `Accept: application/n-triples-star` ondersteund

#### Elasticsearch Compatibility (Port 9200)
- ✅ **Full REST API**: Document CRUD, Search, Bulk, Index Management
- ✅ **Query DSL**: match, bool, term, range, knn, function_score, nested, fuzzy, wildcard, regexp
- ✅ **Retrievers API**: standard, knn, rrf, linear, pinned, text_similarity_reranker (ES 8.14+)
- ✅ **Aggregations**: bucket (terms, histogram, date_histogram, range, filter, nested), metric (avg, sum, min, max, count, cardinality), pipeline (bucket_script)
- ✅ **X-Pack Security**: API keys, users, roles, role mappings, privileges, audit logging
- ✅ **Kibana Compatible**: System indices (.kibana, .security, .monitoring), saved objects
- ✅ **Scroll & PIT**: Scroll API en Point-in-Time pagination
- ✅ **Cat APIs**: /_cat/indices, /_cat/health, /_cat/nodes, /_cat/templates, /_cat/aliases
- ✅ **Cluster APIs**: /_cluster/health, /_cluster/state, /_cluster/stats
- 🔜 **Hybrid Extensions**: `_ext` voor SPARQL enrichment en KG boost

### 🧪 Testing & Quality

#### Test Coverage
- ✅ **Unit Tests**: Uitgebreide unit test coverage
- ✅ **Integration Tests**: End-to-end test scenarios
- ✅ **Property-Based Testing**: PropTest voor invariant checking
- ✅ **W3C Compliance Tests**: SPARQL 1.1 en SPARQL 1.2 (WD Jan 29, 2026) conformance suite
- ✅ **RDF 1.2 Conformance**: RDF 1.2 (WD Jan 28, 2026) spec compliance tests
- ✅ **Equivalence Testing**: Verify parity met C++ QLever
- ✅ **Cluster Integration Tests**: Multi-node scenario testing

#### Benchmarking
- ✅ **Criterion Benchmarks**: Micro-benchmarks voor critical paths
- ✅ **Query Benchmarks**: Macro-benchmarks op real datasets
- ✅ **Olympics Dataset**: Standaard benchmark dataset
- ✅ **Performance Regression Detection**: Automated performance tracking

### ☸️ Kubernetes Operator

#### Cluster Management
- ✅ **IndentiaDBCluster CRD**: Declaratieve cluster configuratie
- ✅ **Reconciliation Loop**: Automatische state synchronisatie
- ✅ **StatefulSet Management**: Geautomatiseerd pod lifecycle beheer
- ✅ **Service Discovery**: Headless en client services
- ✅ **ConfigMap Generation**: Automatische configuratie provisioning
- ✅ **PVC Management**: Persistent storage provisioning
- ✅ **Finalizers**: Cleanup bij cluster deletion

#### Backend Support
- ✅ **SurrealDB Backend**: Integrated SurrealDB v3 deployment
- ✅ **TiKV Backend**: Distributed TiKV cluster deployment (optioneel)
- ✅ **Raft Configuration**: Automatische consensus configuratie

#### Operations
- ✅ **Horizontal Scaling**: Dynamisch schalen via replica count
- ✅ **Rolling Updates**: Zero-downtime upgrades
- ✅ **Health Monitoring**: Liveness en readiness probes
- ✅ **Status Reporting**: Cluster phase en conditions
- ✅ **ServiceMonitor**: Prometheus Operator integratie

### 📡 Real-time Events & Alerting

#### LIVE Query Support
- ✅ **SurrealDB LIVE SELECT**: Native real-time subscriptions
- ✅ **Triple Event Stream**: Create, Update, Delete notifications
- ✅ **WebSocket Transport**: Bi-directional real-time communicatie
- ✅ **Filtering**: Filter op graph, subject, predicate, event type
- ✅ **Reconnection Handling**: Automatische reconnect met backoff

#### Alerting Engine
- ✅ **Pattern-based Alerts**: Trigger op SPARQL pattern matches
- ✅ **Threshold Alerts**: Trigger wanneer waarden thresholds overschrijden
- ✅ **Change Detection**: INSERT, UPDATE, DELETE event triggers
- ✅ **Multi-channel Delivery**: Webhooks, Email, Slack, custom handlers
- ✅ **Alert Lifecycle**: Create, pause, resume, delete alerts
- ✅ **Rate Limiting**: Voorkom alert storms
- ✅ **Deduplication**: Intelligent dedup met configureerbare window
- ✅ **Template Engine**: Customizable alert messages

### ⏰ Bitemporal Support

Bitemporal data management houdt **twee onafhankelijke tijddimensies** bij voor elke RDF triple:

| Dimensie | Beschrijving | Beheerd door |
|----------|--------------|--------------|
| **Transaction Time (tx)** | Wanneer data werd opgeslagen in de database | Systeem (automatisch, immutable) |
| **Valid Time** | Wanneer data geldig/waar was in de echte wereld | Gebruiker (handmatig) |

#### Time Dimensions
- ✅ **Transaction Time**: System-managed, immutable timestamp (`tx_start` is READONLY)
- ✅ **Valid Time**: User-specified temporal validity
- ✅ **Bi-temporal Queries**: Query beide dimensies tegelijk
- ✅ **AS OF Queries**: Time-travel naar specifiek moment
- ✅ **BETWEEN Queries**: Range queries over tijdsperiodes

#### Storage
- ✅ **Version Tracking**: UUID v7 versie identificatie met `previous_version` links
- ✅ **Temporal Indexes**: Geoptimaliseerde indexes voor temporele queries
- ✅ **Current State View**: `triple_current` view voor actuele staat
- ✅ **History Retention**: Volledige audit trail - DELETE sluit versies, verwijdert niet

#### Temporal SPARQL Syntax

**Point-in-time query (AS OF)**:
```sparql
SELECT ?name WHERE {
    TEMPORAL AS OF TX "2024-06-01T00:00:00Z" VALID "2024-03-15T00:00:00Z"
    ?person foaf:name ?name .
}
```
*"Wat wisten we op 1 juni 2024 over de situatie van 15 maart 2024?"*

**Range query (BETWEEN)**:
```sparql
SELECT ?salary ?valid_start ?valid_end WHERE {
    TEMPORAL BETWEEN VALID "2024-01-01" AND "2024-12-31"
    ex:alice ex:salary ?salary .
    BIND(TEMPORAL_START(?salary) AS ?valid_start)
    BIND(TEMPORAL_END(?salary) AS ?valid_end)
}
```

**Temporal Functions**:
- `TEMPORAL_START(?var)` - Retourneert `valid_start`
- `TEMPORAL_END(?var)` - Retourneert `valid_end`
- `TX_START(?var)` - Retourneert `tx_start`
- `TX_END(?var)` - Retourneert `tx_end`

#### Configuratie

```toml
[bitemporal]
enabled = true
default_valid_time = "now"      # of "unbounded"
tx_precision = "millisecond"    # "millisecond", "microsecond", "nanosecond"

[bitemporal.purge]
enabled = false
retention_period = "7 years"    # GDPR compliance
purge_interval = "1 day"

[bitemporal.query]
default_mode = "current"        # of "all" voor volledige history
```

#### GDPR Purge
- ✅ **Retention Policy**: Automatische purge van oude versies na configureerbare periode
- ✅ **Safe Purge**: Alleen gesloten versies (`tx_end` is ingesteld) worden verwijderd
- ✅ **Dry-run Mode**: Verificatie voordat data wordt verwijderd
- ✅ **Background Job**: Automatische purge op configureerbaar interval

#### Use Cases

| Use Case | Oplossing |
|----------|-----------|
| Audit trail | Volledige history via `store.history()` |
| Correcties achteraf | Update met historische `valid_time` |
| "Wat wisten we toen?" | `AS OF TX` query |
| "Wat was waar toen?" | `AS OF VALID` query |
| GDPR vergeetrecht | `purge_before()` met cutoff datum |
| Financial compliance | Onveranderlijke `tx_start` + versie chains |

📖 **Gedetailleerde documentatie**: [`indentiagraph-surreal/src/bitemporal/README.md`](indentiagraph-surreal/src/bitemporal/README.md)

### 🧠 Semantic Inferencing (RDFS/OWL)

#### Reasoning Profiles
- ✅ **RDFS Reasoning**: subClassOf, subPropertyOf, domain, range
- ✅ **OWL Reasoning**: sameAs, inverseOf, transitiveProperty, symmetricProperty
- ✅ **Custom Rules**: User-defined inference rules

#### Execution Modes
- ✅ **Forward Chaining (Materialization)**: Eager inference op insert
- ✅ **Backward Chaining (Query Expansion)**: Lazy inference at query time
- ✅ **Hybrid Mode**: Combinatie voor optimale performance
- ✅ **Incremental Updates**: Efficient inference maintenance

#### Advanced Features
- ✅ **Rete Network**: Efficient pattern matching algorithm
- ✅ **Explanation/Proof**: Trace hoe inferences zijn afgeleid
- ✅ **Inference Retraction**: Correcte handling bij data deletion
- ✅ **Statistics**: Inference performance metrics

### 🌐 WebAssembly (WASM) Support

- ✅ **Browser Compatibility**: Run IndentiaDB in de browser
- ✅ **Edge Computing**: Lightweight deployment op edge devices
- ✅ **wasm-bindgen**: JavaScript/TypeScript bindings
- ✅ **Index Reading**: Lees en query indexes in WASM
- ✅ **Vocabulary Support**: Volledige vocabulary access

---

## 📚 Documentatie

Voor gedetailleerde informatie over de gebruikte standaarden en de architectuur:

*   **Specificaties**:
    *   [RDF 1.2 Concepts en Abstract Datamodel](docs/specifications/rdf12-concepts.md)
    *   [SPARQL 1.2 Querytaal](docs/specifications/sparql12-query.md)
*   **Architectuur**:
    *   [Gefedereerde Queries](docs/architecture/federated-queries.md)
    *   [Index Builder](docs/architecture/index-builder.md)
    *   [Text Search Architectuur](docs/text-search-architecture.md)
*   **Integraties**:
    *   [Elasticsearch Compatibility](docs/elastic_compat.md) - ES REST API, Query DSL, Kibana support
    *   [Kubernetes Operator](indentiadb-operator/README.md) - Cluster deployment en beheer
*   **Ontwikkeling**:
    *   [Migratie Voortgang](docs/MIGRATION_PROGRESS.md)
    *   [Prestatie Optimalisatie Opties](docs/perf_improvement_options.md)

---

## 🚀 Prestaties & Optimalisaties

IndentiaDB is geoptimaliseerd voor maximale throughput en lage latency, met specifieke optimalisaties voor moderne hardware.

### Recente Verbeteringen
*   **Geheugen Allocatie**: Gebruik van `mimalloc` als standaard allocator zorgt voor 5-15% betere prestaties.
*   **Compiler Optimalisaties**: Agressieve optimalisaties zoals LTO (Link Time Optimization) en specifieke CPU-target settings.
*   **Apple Silicon (M1/M2/M3)**: Native ondersteuning voor ARM64 NEON SIMD instructies en LSE atomics.
*   **2026-02-12: Operator/runtime config-alignment**: `indentiagraph-operator` genereert nu config die overeenkomt met de actuele runtime schema's (`[server]`, `[cluster]`, `[security]`, `[observability]`) en verwijdert verouderde sleutels zoals `http_port`, `grpc_port` en `[raft]`.
*   **2026-02-12: HA deploy-wiring hardening**: Operator StatefulSet gebruikt nu correcte `/health` probes, mount `/config`, deterministische pod-DNS `--bind-address`, correcte seed-node bootstrap en een automatische `PodDisruptionBudget` (quorum-bescherming).
*   **2026-02-12: OKD base manifest fixes**: `deploy/okd/base` genereert nu valide seed-node argumenten en runtime bind-configuratie voor cluster mode, zodat pods elkaar consistent kunnen adverteren.
*   **2026-02-12: Bitemporal integrity hardening**: update-paden respecteren nu geconfigureerde default valid-time; delete valideert `valid_end > valid_start`; schema bevat nu ASSERT-regels voor `tx_end > tx_start` en `valid_end > valid_start`.
*   **2026-02-12: Distributed execution completed (P0)**: de distributed executor gebruikt nu een lokale worker-runtime voor end-to-end subplan execution en decodeert merged rows terug naar echte RDF bindings (geen placeholder-oplossingen meer).
*   **2026-02-12: Coordinator fail-closed dispatch**: `indentiagraph-query` geeft nu een expliciete subplan-fout wanneer geen uitvoerbare worker-runtime beschikbaar is; de eerdere stille `empty result` fallback is verwijderd om dataintegriteit te beschermen.
*   **2026-02-12: Distributed gRPC worker hardening**: `indentiagraph-cluster` `DistributedQueryService` ondersteunt nu echte worker-backed subplan streaming (indien runtime geconfigureerd), corrigeert concurrentie-accounting (`fetch_sub` na task-completion), en buffert inkomende shuffle-rows met backpressure (`ready_for_more`) en buffer-limietcontrole.
*   **2026-02-12: Federation parser hardening**: `indentiagraph-surreal` federation engine gebruikt nu echte SPARQL parsing via `spargebra` (incl. prefix-resolutie) i.p.v. handmatige placeholder parsing; queries zonder statement patterns of met unsupported path-expressies falen nu fail-closed.
*   **2026-02-12: Open issue (wire-format)**: `distributed_query.proto` definieert `pattern` als binair veld voor `GraphPattern`, maar `spargebra::GraphPattern` is in deze build niet serde-serialiseerbaar; niet-lege `pattern` payloads in de gRPC service worden daarom expliciet geweigerd (fail-closed) totdat het wire-format is gestabiliseerd.
*   **2026-02-12: Elasticsearch write-ops wired**: `/_reindex`, `/{index}/_update_by_query` en `/{index}/_delete_by_query` zijn nu gekoppeld aan Surreal-backed services met correcte `400` parse errors, `503` zonder backend en `500` voor interne fouten.
*   **2026-02-12: Operator secure-default/HA drift fix**: `allow_insecure_bind_without_auth` staat nu standaard op `false`, operator probe-poorten zijn uitgelijnd op `8081`, en metrics-port defaults/manifests zijn geharmoniseerd naar `8080`.
*   **2026-02-12: Bitemporal delete integrity**: `SurrealTripleStore` controleert nu eerst op exact één open versie vóór close, zodat integriteitsfouten (meerdere open versies) fail-closed blijven zonder data-mutatierisico.
*   **2026-02-12: Validatie**: `cargo test -p indentiagraph-operator` en `cargo test -p indentiagraph-surreal --test bitemporal_schema_integration` draaien groen op deze wijzigingen.
*   **2026-02-12: Federation merge_results fix (P0)**: `indentiagraph-surreal` federation engine `merge_results` populeerde `all_bindings` Vec correct vanuit `JoinResult` streams; voorheen retourneerde elke multi-source query altijd nul resultaten.
*   **2026-02-12: RDF 1.2 SPARQL UPDATE completion**: INSERT DATA/DELETE DATA met quoted triples (RDF-star), DELETE/INSERT WHERE met conditionele updates, en graph management operaties (LOAD, CLEAR, CREATE, DROP) zijn volledig geïmplementeerd in `indentiagraph-surreal/src/transaction.rs` en `indentiagraph-query/src/update.rs`.
*   **2026-02-12: Inferencing explainer wiring**: `Explainer::get_inference_info()` is gekoppeld aan de `RetractionEngine` en retourneert nu de werkelijke rule-ID en source triples i.p.v. placeholder data; nieuwe methode `RetractionEngine::get_inference_by_triple()` toegevoegd.
*   **2026-02-12: Error handling hardening**: 18 productie `panic!()`/`.unwrap()` calls vervangen door `Result`-gebaseerde foutafhandeling in `graphql/translator.rs`, `federation/engine.rs`, `bitemporal/types.rs`, `cluster/storage.rs`, `inference/rete/network.rs` en `inferencing/store.rs`; alle resterende panics zijn uitsluitend in `#[cfg(test)]` code.
*   **2026-02-12: Dead code & warning cleanup**: ongebruikte imports en functies verwijderd in `permutation.rs`, `evaluator.rs`, `update.rs` en 13 elasticsearch-bestanden; `triple_matches_prefix` geannoteerd met `#[cfg(test)]`.
*   **2026-02-12: W3C compliance test infrastructure**: `w3c_compliance.rs` gebruikt nu echte `spargebra` SPARQL parsers en een volledige Turtle manifest parser via `rio_turtle` voor het laden van W3C test suites.
*   **2026-02-12: Volledige workspace verificatie**: `cargo check --workspace` compileert met nul fouten; `cargo test` voor server (940), cluster (274), bitemporal (375) en federation (307) modules draaien groen.
*   **2026-02-12: SPARQL 1.2 WD Jan 29, 2026 compliance**: Alle vier normatieve wijzigingen geïmplementeerd — `sameValue` drie-waardige vergelijking (Issue #187), `GROUP_CONCAT` retourneert `xsd:string`, property path evaluatie fixes voor SequencePath (#266) en OneOrMorePath (#267) met BFS cycle detection, en Extend multipliciteit (#290). Inclusief BlankNode join-variabele ondersteuning in BGP evaluator voor spargebra sequence path optimalisatie. 12 nieuwe compliance tests.

### Benchmark Resultaten (Olympics Dataset)

| Systeem | Gemiddelde Querytijd | vs Oxigraph |
|---------|---------------------|-------------|
| 🥇 **QLever Native (C++)** | **52ms** | 33x sneller |
| 🥈 **IndentiaDB (Rust)** | **344ms** | **5x sneller** |
| 🥉 **Oxigraph (Rust)** | 1764ms | baseline |

*Getest op Apple M2 Max, Januari 2026*

---

## Installatie

### Vereisten

*   Rust toolchain (versie 1.75 of hoger)
*   Een Linux of macOS omgeving
*   `cmake` en een C++ compiler (voor dependencies)

### Bouwen (Native)

IndentiaDB kan gecompileerd worden voor alle grote platformen. Voor productieomgevingen raden we aan om *release* builds te maken met CPU-optimalisaties.

#### 🍎 macOS (Apple Silicon & Intel)
De build-configuratie detecteert automatisch de architectuur. Voor Apple Silicon (M1/M2/M3) worden NEON-optimalisaties automatisch geactiveerd.

```bash
# Bouwen
cargo build --release
```

#### 🐧 Linux (AMD64)
Voor maximale prestaties op Linux servers, gebruik de `native` CPU target flag. Dit optimaliseert de binary voor de specifieke processor van de host machine (bijv. AVX2/AVX-512 instructies).

```bash
# Bouwen met specifieke CPU optimalisaties
RUSTFLAGS="-C target-cpu=native" cargo build --release
```

#### 🪟 Windows (x64)
Zorg dat je de Rust toolchain en C++ build tools (Visual Studio Build Tools met CMake) geïnstalleerd hebt.

```powershell
# PowerShell
cargo build --release
```

---

### 🐳 Docker

Er is geen standaard Dockerfile in de repository, maar je kunt de applicatie eenvoudig containerizen met een multi-stage build.

**1. Maak een `Dockerfile`:**

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

**2. Bouwen en Runnen:**

```bash
# Build image
docker build -t indentiadb .

# Run container (zorg voor config en data volumes)
docker run -d \
  -p 7001:7001 \
  -p 7002:7002 \
  -v $(pwd)/config:/config \
  -v $(pwd)/data:/data \
  indentiadb
```

---

## Snel Starten

### 1. Data Indexeren

```bash
# Indexeer een Turtle dataset (automatisch parallel op M-series chips)
./target/release/indentiadb-indexer \
    -i mijn-index \
    -F ttl \
    -f data.ttl \
    --threads 0  # 0 = auto-detect cores
```

### 2. Server Starten

```bash
# Start de server op poort 7020
./target/release/indentiadb-server -i mijn-index -p 7020
```

### 3. Queryen

```bash
# Via curl
curl -s 'http://localhost:7020/sparql' \
    --data-urlencode 'query=SELECT * WHERE { ?s ?p ?o } LIMIT 5'
```

---

## Architectuur

De codebase is georganiseerd als een Rust workspace:

```
indentiadb/
├── indentiadb-cli/        # Command-line tool voor beheer
├── indentiadb-server/     # HTTP SPARQL server
├── indentiadb-builder/    # Index builder (high-performance)
├── indentiadb-cluster/    # Raft protocol & networking
├── indentiadb-query/      # SPARQL parser, planner, evaluator
├── indentiadb-storage/    # Index storage, vocabulary, delta-triples
├── indentiadb-auth/       # Authentication, Authorization & ACL
├── indentiadb-surreal/    # SurrealDB backend, ES compat, alerting, inferencing
├── indentiadb-operator/   # Kubernetes operator (kube-rs)
├── indentiadb-wasm/       # WebAssembly bindings
└── indentiadb-core/       # Shared types en traits
```

### Index Structuur
IndentiaDB gebruikt 6 permutaties (SPO, SOP, PSO, POS, OSP, OPS) voor efficiënte query-evaluatie. De vocabulary gebruikt een gecombineerde structuur met efficiënte hash-lookup en inline opslag voor kleine literals.

---

## 🗄️ Dual Storage Backends

IndentiaDB ondersteunt **twee storage backends** die elk voor verschillende use cases geoptimaliseerd zijn:

### SurrealDB Backend (Standaard)

| Eigenschap | Waarde |
|------------|--------|
| **Type** | Embedded multi-model database |
| **Geschikt voor** | Ontwikkeling, kleine/middelgrote deployments, edge computing |
| **Setup** | Zero configuration - start direct |
| **Replicatie** | Via Raft consensus (ingebouwd) |
| **Features** | LIVE queries, real-time subscriptions, hybrid SPARQL+SurrealQL |

```toml
[storage]
backend = "surrealdb"
path = "/data/indentiadb"
```

### TiKV Backend (Productie)

| Eigenschap | Waarde |
|------------|--------|
| **Type** | Gedistribueerde key-value store (CNCF graduated) |
| **Geschikt voor** | Grote datasets, hoge beschikbaarheid, multi-datacenter |
| **Setup** | Separate TiKV cluster (3+ nodes aanbevolen) |
| **Replicatie** | Multi-Raft met automatische sharding |
| **Features** | Horizontale schaalbaarheid, ACID transactions, PD scheduling |

```toml
[storage]
backend = "tikv"
pd_endpoints = ["pd-0:2379", "pd-1:2379", "pd-2:2379"]
```

### Vergelijking Storage Backends

| Aspect | SurrealDB | TiKV |
|--------|-----------|------|
| **Complexiteit** | ⭐ Laag | ⭐⭐⭐ Hoog |
| **Schaalbaarheid** | ⭐⭐ Verticaal | ⭐⭐⭐⭐⭐ Horizontaal |
| **Latency** | ⭐⭐⭐⭐ Sub-ms | ⭐⭐⭐ Lage ms |
| **HA** | ✅ Raft | ✅ Multi-Raft |
| **Max Dataset** | ~100GB | 100TB+ |
| **LIVE Queries** | ✅ Native | 🔧 Via polling |
| **Multi-DC** | ❌ | ✅ |

### Wanneer Welke Backend?

**Kies SurrealDB wanneer:**
- Snelle ontwikkeling en prototyping
- Dataset < 100GB
- Real-time subscriptions vereist
- Eenvoudige deployment gewenst
- Edge/embedded scenarios

**Kies TiKV wanneer:**
- Dataset > 100GB
- Multi-datacenter replicatie nodig
- Horizontale schaalbaarheid vereist
- Maximale durability belangrijk
- Integration met TiDB ecosystem

---

## 🌐 Multi-Modal Platform

IndentiaDB is een **unified platform** dat drie data modellen combineert:

```
┌─────────────────────────────────────────────────────────────────┐
│                    IndentiaDB Multi-Modal                     │
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
| **Schema** | Ontologie-based | Schema-less | Mapping-based |
| **Relaties** | First-class (triples) | References/Relations | Nested objects |
| **Query Taal** | SPARQL 1.2 | SurrealQL | ES Query DSL |
| **Inferencing** | ✅ RDFS/OWL | ❌ | ❌ |
| **Full-text** | ✅ (ql:contains) | ✅ | ✅ Native |
| **Aggregaties** | GROUP BY | GROUP BY + Math | Aggregations |
| **Real-time** | LIVE SELECT | LIVE SELECT | ❌ |

### Hybrid Query Voorbeelden

**RDF + JSON combineren:**
```sql
-- Haal RDF data, sla op in JSON
LET $experts = SPARQL("
  SELECT ?person ?skill WHERE {
    ?person ex:hasExpertise ?skill .
    FILTER(?skill = 'Rust')
  }
");

-- Combineer met document data
SELECT * FROM employees
WHERE email IN $experts.person;
```

**ES Search + RDF Enrichment:**
```python
# Zoek documenten, verrijk met knowledge graph
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

## Vergelijking met Alternatieven

| Feature | IndentiaDB | QLever (C++) | Oxigraph | Blazegraph | Apache Jena | MarkLogic | ArangoDB | PostgreSQL | SQL Server | Oracle |
|---------|---------------|--------------|----------|------------|-------------|-----------|----------|------------|------------|--------|
| **Taal** | Rust 🦀 | C++ | Rust 🦀 | Java ☕ | Java ☕ | C++ | C++ | C | C/C++ | C/C++ |
| **Memory Safety** | ✅ | ❌ | ✅ | ✅ (GC) | ✅ (GC) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Clustering** | ✅ Raft | ❌ | ❌ | ✅ | Limited | ✅ | ✅ CP master/master | ✅ Patroni/Citus | ✅ Always On AG | ✅ RAC |
| **Dual Storage** | ✅ SurrealDB/TiKV | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (RocksDB) | ❌ | ❌ | ❌ |
| **Multi-Modal** | ✅ RDF+JSON+ES | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ Doc+Graph+KV+Search | ✅ (via extensies) | Partial (Rel+Graph) | ✅ Rel+Graph+RDF+JSON |
| **SPARQL 1.1** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (AQL) | ❌ (via Ontop/FDW) | ❌ | ✅ |
| **SPARQL 1.2 (WD Jan 29)** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **RDF 1.2 Triple Terms** | ✅ | Partial | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Property Paths** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Graph Traversals) | ✅ (AGE/Cypher) | Partial (MATCH) | ✅ |
| **GeoSPARQL** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ (GeoJSON native) | ❌ (PostGIS) | ❌ (Spatial types) | Partial (Spatial+RDF) |
| **Full-Text Search** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ ArangoSearch | ✅ Native + BM25 | ✅ Native | ✅ Oracle Text |
| **Federated Queries** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ (SmartGraphs) | ✅ FDW | ✅ Linked Servers | ✅ DB Links |
| **SPARQL UPDATE** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (sinds 12.2) |
| **Vector Search** | ✅ IVF (ArangoDB port) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ FAISS | ✅ pgvector | ✅ DiskANN | ✅ HNSW+IVF |
| **6 Permutaties** | ✅ | ✅ | ❌ (2) | Variable | Variable | N/A | N/A | N/A | N/A | N/A |
| **QLever Index Compat** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **RAG Optimized** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ HybridGraphRAG | Partial (pgvector) | Partial (Vector) | ✅ AI Vector Search |
| **ES Compatibility** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Kibana Support** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Bitemporal** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | Partial (Temporal Tables) | ✅ Flashback+Validity |
| **RDFS/OWL Reasoning** | ✅ | ❌ | ❌ | ✅ | ✅ | Partial | ❌ | ❌ | ❌ | ✅ (OWL subset) |
| **Real-time Events** | ✅ LIVE | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ CDC/Streaming | ✅ LISTEN/NOTIFY | ✅ CDC/Change Tracking | ✅ Streams/CDC |
| **K8s Operator** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ kube-arangodb | ✅ CloudNativePG | Partial (Azure Arc) | ✅ Oracle Operator |
| **WASM Support** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Licentie** | TBD | Open | Open | Open | Open | Proprietary | BSL 1.1 | PostgreSQL (Open) | Proprietary | Proprietary |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Maturity** | Beta | Production | Production | Production | Production | Production | Production | Production | Production | Production |

### 🔐 Security Features Vergelijking

| Security Feature | IndentiaDB | QLever (C++) | Oxigraph | Blazegraph | Apache Jena | MarkLogic | ArangoDB | PostgreSQL | SQL Server | Oracle |
|------------------|---------------|--------------|----------|------------|-------------|-----------|----------|------------|------------|--------|
| **LDAP Authenticatie** | ✅ | ❌ | ❌ | ❌ | ✅ (Shiro) | ✅ | ✅ (Enterprise) | ✅ | ✅ (AD) | ✅ |
| **OIDC/OAuth2** | ✅ | ❌ | ❌ | ❌ | ✅ (Plugin) | ✅ | ✅ (JWT/OAuth2) | ✅ (via ext) | ✅ (Entra ID) | ✅ (OCI IAM) |
| **JWT Tokens** | ✅ | ❌ | ❌ | ❌ | ✅ (Plugin) | ✅ | ✅ | ❌ | ✅ | ✅ |
| **HTTP Basic Auth** | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **RBAC** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Graph-Level ACL** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ (Collection) | ❌ (Schema) | ❌ (Schema) | ✅ (Named Graph) |
| **Triple-Level ACL** | ✅ (SIDs) | ❌ | ❌ | ❌ | Partial | ✅ | ❌ | ❌ (RLS) | ❌ (RLS) | ✅ (VPD/RAS) |
| **Windows SID Support** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Rate Limiting** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ (via ext) | ✅ (Resource Gov) | ✅ (Resource Mgr) |
| **Audit Logging** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ (Enterprise) | ✅ (pgAudit) | ✅ | ✅ |
| **Connection Pooling** | ✅ | N/A | N/A | ✅ | ✅ | ✅ | ✅ | ✅ (PgBouncer) | ✅ | ✅ |
| **FROM Clause Filtering** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | N/A | N/A | N/A | ✅ (Named Graph) |
| **RDF-star Security** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **X-Pack Compatible** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 💰 Pricing Vergelijking

| Aspect | IndentiaDB | MarkLogic | Neo4j Enterprise | AWS Neptune | ArangoDB | PostgreSQL | SQL Server | Oracle |
|--------|---------------|-----------|------------------|-------------|----------|------------|------------|--------|
| **Model** | TBD | Proprietary | Proprietary | Cloud Service | BSL 1.1 / Enterprise | Open Source | Proprietary | Proprietary |
| **Licentie** | TBD | Per Core | Per Core | Pay-per-use | BSL 1.1 (Community), Proprietary (Enterprise) | PostgreSQL License | Per Core / CAL | Per Processor / NUP |
| **Entry Cost** | €0 | €€€€€ | €€€€ | Variable | €0 (Community, ≤100 GiB) | €0 | €0 (Express) | €0 (XE/Free) |
| **Self-hosted** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Cloud Managed** | 🔜 | ✅ | ✅ | ✅ | ✅ (ArangoGraph) | ✅ (RDS/Aurora/Supabase) | ✅ (Azure SQL) | ✅ (OCI/Autonomous) |
| **Support** | Community + Enterprise | Enterprise only | Enterprise only | AWS Support | Community + Enterprise | Community + EDB/Crunchy | Microsoft Support | Oracle Support |

---

## Development

### Tests Uitvoeren
```bash
cargo test
cargo test -p indentiadb-query  # Specifieke crate
```

### Benchmarks
```bash
cargo bench -p indentiadb-query
```

---

## RDF 1.2 & SPARQL 1.2 Ondersteuning

IndentiaDB ondersteunt de nieuwste RDF 1.2 (WD 28 jan 2026) en SPARQL 1.2 (WD 29 jan 2026) standaarden, inclusief alle normatieve wijzigingen. Dit is essentieel voor moderne Knowledge Graph en RAG (Retrieval-Augmented Generation) toepassingen.

### Nieuwe Features in RDF 1.2

#### Triple Terms (Quoted Triples)

De belangrijkste feature is de mogelijkheid om **statements over statements** te maken:

```turtle
# RDF 1.2 - statement over een feit
<< :Amsterdam :hasPopulation "921402" >> :source :CBS ;
                                         :retrievedDate "2024-01-15" ;
                                         :confidence 0.99 .

# Reified triples met de ~ operator
:Amsterdam :capitalOf :Netherlands ~ :statement1 .
:statement1 :source :Wikipedia ;
            :confidence 0.95 .
```

#### Base Direction voor Internationalisatie

```turtle
# Tekst met expliciete leesrichting
"مرحبا"@ar--rtl    # Arabisch, rechts-naar-links
"Hello"@en--ltr    # Engels, links-naar-rechts
```

### Nieuwe Features in SPARQL 1.2

| Feature | Beschrijving | Voorbeeld |
|---------|--------------|-----------|
| **TRIPLE()** | Creëer triple term | `SELECT (TRIPLE(?s, ?p, ?o) AS ?t)` |
| **SUBJECT()** | Extract subject | `SELECT (SUBJECT(?t) AS ?s)` |
| **PREDICATE()** | Extract predicate | `SELECT (PREDICATE(?t) AS ?p)` |
| **OBJECT()** | Extract object | `SELECT (OBJECT(?t) AS ?o)` |
| **isTRIPLE()** | Type check | `FILTER(isTRIPLE(?term))` |
| **SEMIJOIN** | Efficiënt EXISTS | `A SEMIJOIN B` |
| **ANTIJOIN** | Efficiënt NOT EXISTS | `A ANTIJOIN B` |

### SPARQL 1.2 WD Normatieve Wijzigingen (Jan 29, 2026)

| Wijziging | Issue | Status |
|-----------|-------|--------|
| **sameValue drie-waardige vergelijking** | #187 | ✅ `ValueComparison` enum (True/False/Error) |
| **GROUP_CONCAT retourneert `xsd:string`** | Feb 3 ED | ✅ Typed literal in `evaluate_aggregate()` |
| **Property path evaluatie fixes** | #266, #267 | ✅ BFS met visited-set cycle detection |
| **Extend multipliciteit** | #290 | ✅ `card[Extend(Ω, var, expr)] = card[Ω]` |

### Voorbeeldquery's

```sparql
# Vind alle feiten met hun bronnen en confidence
SELECT ?subject ?predicate ?object ?source ?confidence
WHERE {
    << ?subject ?predicate ?object >> :source ?source ;
                                      :confidence ?confidence .
    FILTER (?confidence > 0.8)
}
ORDER BY DESC(?confidence)

# Vind feiten bevestigd door meerdere bronnen
SELECT ?fact (COUNT(?source) AS ?numSources)
WHERE {
    << ?s ?p ?o >> :source ?source .
    BIND(TRIPLE(?s, ?p, ?o) AS ?fact)
}
GROUP BY ?fact
HAVING (COUNT(?source) >= 2)
```

### Vector Search Voorbeelden

```sparql
# Vind de 10 meest vergelijkbare documenten met cosine similarity
SELECT ?doc ?score
WHERE {
    ?doc :embedding ?vec .
    FILTER vec:approxNearCosine(?vec, $query_vector)
}
ORDER BY DESC(?score)
LIMIT 10

# Vector search met pre-filtering (alleen actieve documenten)
SELECT ?doc ?score
WHERE {
    ?doc :embedding ?vec ;
         :status :active .
    FILTER vec:approxNearCosine(?vec, $query_vector)
}
ORDER BY DESC(?score)
LIMIT 10

# L2 distance search (voor Euclidean distance)
SELECT ?doc ?distance
WHERE {
    ?doc :embedding ?vec .
    FILTER vec:approxNearL2(?vec, $query_vector)
}
ORDER BY ASC(?distance)
LIMIT 10

# Combinatie van vector search met full-text
SELECT ?doc ?score ?textScore
WHERE {
    ?doc :embedding ?vec ;
         :text ?text .
    FILTER vec:approxNearCosine(?vec, $query_vector)
    FILTER ql:contains-word(?text, "machine learning")
}
ORDER BY DESC(?score + ?textScore)
LIMIT 10
```

---

## RAG Integratie (Retrieval-Augmented Generation)

IndentiaDB is bij uitstek geschikt als kennisbron voor RAG-systemen. De RDF 1.2 features maken het mogelijk om feiten met **provenance, confidence en bronvermelding** op te slaan.

### Waarom RDF 1.2 voor RAG?

| RAG Behoefte | RDF 1.2 Oplossing |
|--------------|-------------------|
| **Bronvermelding** | `<< fact >> :source :Wikipedia` |
| **Betrouwbaarheid** | `<< fact >> :confidence 0.85` |
| **Temporele geldigheid** | `<< fact >> :validUntil "2025-01-01"` |
| **Citaties voor LLM** | Automatisch bronnen meegeven |
| **Hallucinatie preventie** | Verifieerbare, getraceerde feiten |

### RAG Pipeline Architectuur

```
┌──────────────────────────────────────────────────────────────┐
│                    RAG Pipeline met IndentiaDB            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  User Query: "Wat is de hoofdstad van Nederland?"            │
│                          │                                    │
│                          ▼                                    │
│  ┌────────────────────────────────────────────┐              │
│  │  IndentiaDB Knowledge Graph (RDF 1.2)   │              │
│  │                                             │              │
│  │  << :Nederland :hoofdstad :Amsterdam >>     │              │
│  │      :source :Wikipedia ;                   │              │
│  │      :confidence 0.99 ;                     │              │
│  │      :lastVerified "2024-06-01" .           │              │
│  └────────────────────────────────────────────┘              │
│                          │                                    │
│                          ▼                                    │
│  Retrieved Context:                                          │
│  - Feit: Nederland → hoofdstad → Amsterdam                   │
│  - Bronnen: Wikipedia, Wikidata                              │
│  - Confidence: 0.99                                          │
│                          │                                    │
│                          ▼                                    │
│  LLM Response:                                               │
│  "De hoofdstad van Nederland is Amsterdam.                   │
│   [Bron: Wikipedia, Wikidata]"                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Confidence Scores: Bronnen en Berekening

Confidence scores komen uit verschillende bronnen en worden gecombineerd:

#### 1. NLP/NER Extractie Confidence

```python
# SpaCy, Hugging Face of custom model
result = extractor.extract("Amsterdam is de hoofdstad van Nederland")
# {"subject": "Amsterdam", "relation": "hoofdstad_van", 
#  "object": "Nederland", "confidence": 0.92}
```

#### 2. LLM Extractie met Confidence

```python
prompt = """
Extract facts from this text as JSON with confidence (0-1):
Text: "Amsterdam, often considered the capital, is the largest city..."
"""
# LLM output: {"confidence": 0.85}  # lager vanwege "often considered"
```

#### 3. Bron Betrouwbaarheid (Pre-assigned)

| Bron | Standaard Confidence |
|------|----------------------|
| Wikidata | 0.95 |
| Wikipedia | 0.85 |
| Nieuwsartikelen | 0.70 |
| Social media | 0.40 |
| User-generated | 0.30 |

#### 4. Corroboratie Score

```python
def calculate_confidence(fact, sources):
    base = sources[0].reliability
    corroboration_bonus = len(sources) * 0.05
    return min(base + corroboration_bonus, 1.0)
```

#### 5. Temporele Decay

```python
import math
from datetime import datetime

def temporal_confidence(original_confidence, last_verified_date):
    days_old = (datetime.now() - last_verified_date).days
    decay_factor = math.exp(-days_old / 365)
    return original_confidence * decay_factor
```

### RAG Query Voorbeelden

```sparql
# Query voor RAG: haal feiten op met bronvermelding
PREFIX ig: <http://indentiadb.nl/ontology/>

SELECT ?subject ?predicate ?object ?source ?confidence ?lastVerified
WHERE {
    << ?subject ?predicate ?object >> ig:source ?source ;
                                      ig:confidence ?confidence ;
                                      ig:lastVerified ?lastVerified .
    
    # Filter op hoge betrouwbaarheid en recente verificatie
    FILTER (?confidence > 0.7)
    FILTER (?lastVerified > "2024-01-01"^^xsd:date)
}
ORDER BY DESC(?confidence)
LIMIT 10
```

```sparql
# Multi-source verificatie query
SELECT ?s ?p ?o (GROUP_CONCAT(?source; separator=", ") AS ?sources)
       (AVG(?conf) AS ?avgConfidence)
WHERE {
    << ?s ?p ?o >> ig:source ?source ;
                   ig:confidence ?conf .
}
GROUP BY ?s ?p ?o
HAVING (COUNT(?source) >= 2 AND AVG(?conf) > 0.8)
```

---

## SPARQL Federation & Virtual Graphs

IndentiaDB bevat een krachtige SPARQL Federation module voor het bevragen van gedistribueerde RDF databronnen. Dit maakt naadloze integratie mogelijk met externe knowledge graphs, linked data endpoints en SQL databases.

### Architectuur Overzicht

De federation module volgt een gelaagde architectuur, geïnspireerd door FedX en Comunica:

```
┌─────────────────────────────────────────────────────────────┐
│                    SPARQL Query                              │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Source Selection (3-fase FedX algoritme)        │
│  1. Cache check voor bekende bronnen                         │
│  2. Parallelle ASK queries naar onbekende bronnen            │
│  3. Annoteer patterns met bron-toewijzingen                  │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Query Optimizer                                 │
│  - Vorm exclusive groups (patterns met zelfde bron)          │
│  - Cost-based join ordering                                  │
│  - Push filters/limits naar bronnen                          │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Execution Engine                                │
│  - ControlledWorkerScheduler (concurrency control)           │
│  - Bound joins met VALUES batching                           │
│  - Streaming resultaten                                      │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐       ┌──────────┐       ┌──────────┐
   │ Lokale  │       │ SPARQL   │       │ Virtual  │
   │ Store   │       │ Endpoint │       │ Graph    │
   └─────────┘       └──────────┘       └──────────┘
   (SurrealDB)       (DBpedia,          (SQL via
                      Wikidata)          R2RML)
```

### Triple Source Abstractie

De `TripleSource` trait biedt een uniforme interface voor het bevragen van verschillende databronnen:

```rust
use indentiagraph_surreal::federation::triple_source::{
    LocalTripleSource, SparqlTripleSource, TripleSource,
    ServiceResolver, DefaultServiceResolver,
};

// Lokale SurrealDB store
let local = LocalTripleSource::new(
    "local".into(),
    store.clone(),
    SourceCapabilities::local_store(),
);

// Remote SPARQL endpoint
let dbpedia = SparqlTripleSource::new(
    "dbpedia".into(),
    "https://dbpedia.org/sparql".into(),
    None, // auth
    SourceCapabilities::sparql_endpoint(),
)?;
```

**Ondersteunde brontypen:**

| Bron | Implementatie | Beschrijving |
|------|---------------|--------------|
| Lokaal (SurrealDB) | `LocalTripleSource` | Directe algebra-evaluatie, minimale latency (~1ms) |
| SPARQL Endpoint | `SparqlTripleSource` | HTTP POST naar remote endpoints, SPARQL JSON results |
| SQL Database | *Gepland* | Via R2RML mapping |
| REST API | *Gepland* | Via JSON-LD mapping |

### LocalTripleSource: Volledige Algebra Evaluatie

De `LocalTripleSource` evalueert `FederatedExpr` bomen direct tegen SurrealDB zonder SPARQL serialisatie:

```rust
// Ondersteunde expressie types
match expr {
    FederatedExpr::Pattern(p)  => // Triple pattern lookup
    FederatedExpr::Group(g)    => // Exclusive group (meerdere patterns)
    FederatedExpr::Join(j)     => // N-ary join
    FederatedExpr::Union(u)    => // N-ary union
    FederatedExpr::Filter(f)   => // Filter evaluatie
    FederatedExpr::Service(s)  => // Delegeert naar ServiceResolver
}
```

### SERVICE Clause Delegatie

SERVICE clauses worden automatisch gedelegeerd naar remote SPARQL endpoints via de `ServiceResolver`:

```rust
// Custom ServiceResolver voor speciale endpoints
struct CustomServiceResolver { /* ... */ }

#[async_trait]
impl ServiceResolver for CustomServiceResolver {
    async fn resolve_service(
        &self,
        endpoint: &str,
        query: &str,
        bindings: Option<&BindingSet>,
    ) -> FederationResult<JoinResult> {
        // Custom logic (auth, caching, load balancing, etc.)
    }
}

// Gebruik met LocalTripleSource
let source = LocalTripleSource::with_service_resolver(
    "local".into(),
    store,
    SourceCapabilities::local_store(),
    Arc::new(CustomServiceResolver::new()),
);
```

De `DefaultServiceResolver` maakt on-demand `SparqlTripleSource` instances met connection caching:

```rust
let resolver = DefaultServiceResolver::new();

// Eerste call naar endpoint X: maakt nieuwe SparqlTripleSource
// Volgende calls: hergebruikt gecachede instance
```

### Belangrijkste Features

| Feature | Beschrijving |
|---------|--------------|
| **Bound Joins** | Batcht bindings met VALUES clause (standaard 25 per batch) voor 10-100x snellere queries |
| **Exclusive Groups** | Groepeert patterns met dezelfde bron om netwerk round-trips te verminderen |
| **Filter Pushdown** | Verplaatst filters naar databronnen voor vroege filtering |
| **Parallel Execution** | Concurrent bron queries met configureerbare worker pool |
| **Result Caching** | TTL-gebaseerde cache voor source selection beslissingen |
| **Multiple Join Strategies** | Hash join, nested loop join, bound join met automatische selectie |
| **SERVICE SILENT** | Fouten in SERVICE clauses worden genegeerd met `SERVICE SILENT` |

### Voorbeeld: Gefedereerde Query

**Met expliciete SERVICE clause:**

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX company: <http://example.org/company/>

# Combineer lokale data met externe SPARQL endpoints
SELECT ?employee ?name ?birthPlace ?population WHERE {
    # Lokaal pattern (IndentiaDB/SurrealDB)
    ?employee a company:Employee ;
              company:worksAt ?company .

    # Remote SERVICE call naar DBpedia
    SERVICE <https://dbpedia.org/sparql> {
        ?employee foaf:name ?name ;
                  dbo:birthPlace ?birthPlace .
        ?birthPlace dbo:population ?population .
    }
}
```

**Met SERVICE SILENT (fouten negeren):**

```sparql
SELECT ?person ?localName ?externalInfo WHERE {
    # Lokale data
    ?person ex:name ?localName .

    # Remote endpoint - fout wordt genegeerd als endpoint onbereikbaar is
    SERVICE SILENT <https://unreliable-endpoint.example.com/sparql> {
        ?person ex:externalInfo ?externalInfo .
    }
}
```

**Transparante federation (automatische source selection):**

```sparql
PREFIX ex: <http://example.org/>

# Source selector bepaalt automatisch welke bron elk pattern beantwoordt
SELECT ?person ?name ?abstract WHERE {
    ?person ex:name ?name .           # → SurrealDB (lokaal)
    ?person ex:type ex:Researcher .   # → SurrealDB (lokaal)
    ?person ex:abstract ?abstract .   # → QLever (remote, via ASK detection)
}
```

> **Note:** Transparante federation vereist dat endpoints geregistreerd zijn en de source selector ASK queries kan uitvoeren om te bepalen welke bron welk pattern kan beantwoorden.

### Bound Join Optimalisatie

De bound join optimalisatie batcht bindings om netwerk overhead te verminderen:

```
Zonder bound join: N aparte queries (traag)
Met bound join:    ceil(N/25) gebatchte queries (10-100x sneller)
```

**Gegenereerde VALUES clause:**

```sparql
SELECT ?__index ?name ?birthPlace WHERE {
    VALUES (?__index ?employee) {
        (0 <http://example.org/emp/1>)
        (1 <http://example.org/emp/2>)
        ...
        (24 <http://example.org/emp/25>)
    }
    ?employee foaf:name ?name ;
              dbo:birthPlace ?birthPlace .
}
```

De `__index` variabele correleert resultaten terug naar de originele bindings.

### Virtual Graphs (R2RML)

R2RML (RDB to RDF Mapping Language) maakt het mogelijk om relationele databases als RDF grafen te bevragen zonder data te kopiëren. IndentiaGraph ondersteunt het laden van standaard R2RML mappings vanuit `.ttl` bestanden.

#### R2RML Mapping Bestand (.ttl)

```turtle
@prefix rr: <http://www.w3.org/ns/r2rml#> .
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# Map 'employees' tabel naar RDF
ex:EmployeeMapping a rr:TriplesMap ;
    rr:logicalTable [ rr:tableName "employees" ] ;

    rr:subjectMap [
        rr:template "http://company.com/employee/{id}" ;
        rr:class ex:Employee ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate foaf:name ;
        rr:objectMap [ rr:column "full_name" ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:email ;
        rr:objectMap [ rr:column "email" ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:salary ;
        rr:objectMap [
            rr:column "salary" ;
            rr:datatype xsd:decimal ;
        ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:department ;
        rr:objectMap [
            rr:template "http://company.com/department/{dept_id}" ;
        ] ;
    ] .

# Map 'departments' tabel
ex:DepartmentMapping a rr:TriplesMap ;
    rr:logicalTable [ rr:tableName "departments" ] ;

    rr:subjectMap [
        rr:template "http://company.com/department/{id}" ;
        rr:class ex:Department ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate foaf:name ;
        rr:objectMap [ rr:column "name" ] ;
    ] .
```

#### R2RML Mapping Laden

```rust
use indentiadb::federation::{
    FederationEngine, FederationSource, SourceType,
    r2rml::{R2RMLParser, R2RMLMapping},
};

// Laad R2RML mapping vanuit .ttl bestand
let mapping = R2RMLParser::parse_file("mappings/employees.ttl")?;

// Of parse vanuit string
let ttl_content = std::fs::read_to_string("mappings/employees.ttl")?;
let mapping = R2RMLParser::parse(&ttl_content)?;

// Registreer als virtual graph
let virtual_source = FederationSource {
    id: "hr-database".into(),
    name: "HR SQL Database".into(),
    source_type: SourceType::SqlDatabase {
        connection_string: "postgresql://user:pass@localhost/hr".into(),
        mapping: mapping,
    },
    capabilities: SourceCapabilities::virtual_graph(),
    available: true,
    priority: 5,
};

engine.register_source(virtual_source).await?;
```

#### SQL Database als RDF Graaf Bevragen

Na registratie kan de SQL database bevraagd worden met SPARQL alsof het een RDF graaf is:

```sparql
PREFIX ex: <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

# Query de SQL database via R2RML mapping
SELECT ?employee ?name ?deptName ?salary WHERE {
    ?employee a ex:Employee ;
              foaf:name ?name ;
              ex:salary ?salary ;
              ex:department ?dept .

    ?dept foaf:name ?deptName .

    FILTER (?salary > 50000)
}
ORDER BY DESC(?salary)
```

Deze SPARQL query wordt automatisch vertaald naar SQL:

```sql
SELECT
    CONCAT('http://company.com/employee/', e.id) AS employee,
    e.full_name AS name,
    d.name AS deptName,
    e.salary AS salary
FROM employees e
JOIN departments d ON e.dept_id = d.id
WHERE e.salary > 50000
ORDER BY e.salary DESC
```

#### Ondersteunde R2RML Features

| Feature | Status | Beschrijving |
|---------|--------|--------------|
| `rr:tableName` | ✅ | Directe tabel mapping |
| `rr:sqlQuery` | ✅ | Custom SQL query als bron |
| `rr:template` | ✅ | URI templates met `{column}` placeholders |
| `rr:column` | ✅ | Directe kolom mapping |
| `rr:constant` | ✅ | Constante waarden |
| `rr:class` | ✅ | RDF type toewijzing |
| `rr:datatype` | ✅ | XSD datatype conversie |
| `rr:language` | ✅ | Taal tags voor literals |
| `rr:joinCondition` | ✅ | Foreign key relaties |
| `rr:inverseExpression` | 🔄 | Inverse template matching |

#### Ondersteunde Databases

| Database | Driver | Connection String |
|----------|--------|-------------------|
| PostgreSQL | `sqlx` | `postgresql://user:pass@host/db` |
| MySQL | `sqlx` | `mysql://user:pass@host/db` |
| SQLite | `sqlx` | `sqlite:///path/to/file.db` |
| SQL Server | `sqlx` | `mssql://user:pass@host/db` |

#### Programmatische Mapping (Rust API)

```rust
use indentiadb::federation::{
    FederationSource, SourceType, R2RMLMapping,
    LogicalTable, TableSource, SubjectMap, PredicateObjectMap, ObjectMap,
};

// Map SQL tabel naar RDF triples
let employee_mapping = R2RMLMapping {
    logical_table: LogicalTable {
        source: TableSource::TableName("employees".into()),
    },
    subject_map: SubjectMap {
        template: "http://company.com/employee/{id}".into(),
        class: Some("http://company.com/ontology/Employee".into()),
    },
    predicate_object_maps: vec![
        PredicateObjectMap {
            predicate: "http://xmlns.com/foaf/0.1/name".into(),
            object_map: ObjectMap::Column("full_name".into()),
        },
        PredicateObjectMap {
            predicate: "http://company.com/ontology/department".into(),
            object_map: ObjectMap::Column("dept_id".into()),
        },
    ],
};

// Registreer als virtual graph
let virtual_employees = FederationSource {
    id: "sql-employees".into(),
    name: "Employee SQL Database".into(),
    source_type: SourceType::SqlDatabase {
        connection_string: "postgresql://localhost/company".into(),
        mapping: employee_mapping,
    },
    capabilities: SourceCapabilities::virtual_graph(),
    available: true,
    priority: 1,
};
```

#### Federated Query over SQL + RDF

Combineer data uit SQL databases met native RDF en externe SPARQL endpoints:

```sparql
PREFIX ex: <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX dbo: <http://dbpedia.org/ontology/>

SELECT ?employee ?name ?cityPopulation WHERE {
    # SQL Database (via R2RML)
    ?employee a ex:Employee ;
              foaf:name ?name ;
              ex:birthPlace ?city .

    # DBpedia SPARQL endpoint
    SERVICE <https://dbpedia.org/sparql> {
        ?city dbo:population ?cityPopulation .
    }
}
```

### Endpoint Registratie

```rust
use indentiadb::federation::{
    FederationSource, SourceType, SourceCapabilities, EndpointAuth,
    SurrealSourceSelector, SourceSelectionConfig,
};

// Registreer een publiek SPARQL endpoint
let dbpedia = FederationSource {
    id: "dbpedia".into(),
    name: "DBpedia".into(),
    source_type: SourceType::SparqlEndpoint {
        url: "https://dbpedia.org/sparql".into(),
        auth: None,
    },
    capabilities: SourceCapabilities::sparql_endpoint(),
    available: true,
    priority: 10,
};

// Registreer een beveiligd endpoint met authenticatie
let company_graph = FederationSource {
    id: "company".into(),
    name: "Company Knowledge Graph".into(),
    source_type: SourceType::SparqlEndpoint {
        url: "https://kg.company.com/sparql".into(),
        auth: Some(EndpointAuth::Bearer {
            token: "secret-token".into(),
        }),
    },
    capabilities: SourceCapabilities::sparql_endpoint(),
    available: true,
    priority: 5,
};

// Maak source selector
let config = SourceSelectionConfig::default();
let mut selector = SurrealSourceSelector::new(config);
selector.register_endpoint(dbpedia);
selector.register_endpoint(company_graph);
```

### Cost Model

De optimizer gebruikt cardinality schattingen voor efficiënte join volgorde:

| Pattern Type | Basis Kosten | Toelichting |
|--------------|--------------|-------------|
| Exclusive (enkele bron) | 100 | Meest efficiënt |
| Exclusive Group | 100 + 10×patterns | Gegroepeerde zelfde-bron patterns |
| Multi-Source | 100 + 50×bronnen | Vereist union over bronnen |
| SERVICE (simpel) | 50 × patterns | Kan bound join gebruiken |
| SERVICE (complex) | 100 | Heeft filters/optionals |

### Authenticatie Methodes

| Methode | Beschrijving | Gebruik |
|---------|--------------|---------|
| `None` | Geen authenticatie | Publieke endpoints (DBpedia, Wikidata) |
| `Basic` | HTTP Basic Auth | Legacy systemen |
| `Bearer` | JWT Bearer token | OAuth2/OIDC endpoints |
| `ApiKey` | API key in header | REST APIs |

### Configuratie Voorbeeld

```toml
[federation]
default_timeout_secs = 30
max_concurrent_requests = 10
cache_ttl_secs = 3600
bound_join_batch_size = 25

[[federation.endpoints]]
id = "dbpedia"
name = "DBpedia"
url = "https://dbpedia.org/sparql"
priority = 10

[[federation.endpoints]]
id = "wikidata"
name = "Wikidata"
url = "https://query.wikidata.org/sparql"
priority = 10

[[federation.endpoints]]
id = "internal"
name = "Internal KG"
url = "https://kg.internal.company.com/sparql"
priority = 5
auth_type = "bearer"
auth_token = "${INTERNAL_KG_TOKEN}"
```

---

## UnifiedTripleStore: SurrealDB + QLever als Één Systeem

Voor high-performance scenario's ondersteunt IndentiaGraph een **unified multi-store architectuur** waarbij SurrealDB (OLTP) en QLever (OLAP) als één coherent systeem worden beheerd. Dit is **geen externe federation** maar een interne architectuur waar beide stores automatisch gesynchroniseerd blijven.

### Pariteit & Keuzehulp (status: 12 februari 2026)

SPARQL 1.2 (WD Jan 29, 2026) / RDF 1.2 ondersteuning is **niet volledig identiek** tussen de twee query-paden. Kies per workload:

| Scenario | Kies | Waarom |
|----------|------|--------|
| Bitemporal queries (`TEMPORAL AS OF`, `BETWEEN`, `TEMPORAL_START/END`) | **Surreal query engine** | Dit pad heeft expliciete temporal parsing/rewriting. |
| Standaard SPARQL read workloads via HTTP `/sparql` | **QLever-Rust query pad** | Dit is het primaire server-pad voor SPARQL query-afhandeling. |
| Complexe OLAP-achtige joins/aggregaties op grote grafen | **QLever-Rust (of unified routing naar QLever-index)** | Geoptimaliseerd voor query-uitvoering op index/permutaties. |
| Transactionele writes + lage latency reads | **Surreal als primary store** | Sterk voor OLTP en mixed model (RDF + document). |
| Eén logisch systeem voor zowel OLTP als OLAP | **UnifiedTripleStore (Surreal + QLever)** | Writes naar primary, query-routing op complexiteit. |

**Belangrijk:** behandel QLever-Rust en Surreal op dit moment als **complementair**, niet als 100% uitwisselbaar voor alle SPARQL 1.2 features in elk runtime-pad.

### Architectuur

```
┌────────────────────────────────────────────────────────────────┐
│                      IndentiaGraph                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   UnifiedTripleStore                      │  │
│  │                                                           │  │
│  │   write() ──────┬──────────────────────────────────────▶ │  │
│  │                 │                                         │  │
│  │          ┌──────▼──────┐              ┌──────────────┐   │  │
│  │          │  SurrealDB  │───sync──────▶│    QLever    │   │  │
│  │          │  (Primary)  │              │ (Query Index)│   │  │
│  │          └──────┬──────┘              └──────┬───────┘   │  │
│  │                 │                            │            │  │
│  │   query() ◀─────┴────────────────────────────┘            │  │
│  │            (auto-routing based on query complexity)       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

**Voordelen:**
- SurrealDB voor lage-latency transactionele writes
- QLever voor geoptimaliseerde complex SPARQL queries
- Automatische query routing op basis van complexiteit
- Consistente data via synchronisatie

### UnifiedTripleStore API

```rust
use indentiagraph_surreal::store::UnifiedTripleStore;

/// Unified store that keeps SurrealDB and QLever in sync
pub struct UnifiedTripleStore {
    surreal: Arc<SurrealTripleStore>,  // Primary store for writes
    qlever: Arc<QLeverIndex>,          // Query-optimized index
    config: UnifiedStoreConfig,
}

#[derive(Clone)]
pub struct UnifiedStoreConfig {
    /// Sync mode for QLever updates
    pub sync_mode: SyncMode,
    /// Use QLever for queries with more than N triple patterns
    pub qlever_threshold_patterns: usize,
    /// Use QLever for queries touching more than N triples (estimated)
    pub qlever_threshold_cardinality: u64,
}

#[derive(Clone)]
pub enum SyncMode {
    /// Sync QLever immediately after each write
    Immediate,
    /// Sync after transaction commit
    OnCommit,
    /// Batch sync at intervals
    Batched { interval_ms: u64 },
    /// Manual sync only
    Manual,
}
```

### Initialisatie

```rust
use indentiagraph_surreal::store::{UnifiedTripleStore, UnifiedStoreConfig, SyncMode};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize unified store
    let store = UnifiedTripleStore::new(
        surreal_store,
        "/var/lib/indentiagraph/qlever",
        UnifiedStoreConfig {
            sync_mode: SyncMode::Immediate,
            qlever_threshold_patterns: 3,
            qlever_threshold_cardinality: 10_000,
        },
    ).await?;

    // Initial sync: build QLever index from SurrealDB (one-time)
    store.rebuild_qlever_index().await?;

    Ok(())
}
```

### SPARQL UPDATE Operations

Alle write operaties worden automatisch naar beide stores gesynchroniseerd:

#### INSERT DATA

```rust
// INSERT naar beide stores
store.update(r#"
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    INSERT DATA {
        <http://example.org/person/789> a foaf:Person ;
            foaf:name "Pieter Post" ;
            foaf:mbox <mailto:pieter@example.org> .
    }
"#).await?;
// ✓ SurrealDB: direct geschreven
// ✓ QLever: automatisch gesynchroniseerd
```

#### DELETE DATA

```rust
// DELETE uit beide stores
store.update(r#"
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    DELETE DATA {
        <http://example.org/person/789> foaf:mbox <mailto:pieter@example.org> .
    }
"#).await?;
```

#### DELETE WHERE (Pattern Matching)

```rust
// DELETE met pattern matching
store.update(r#"
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    DELETE WHERE {
        <http://example.org/person/789> foaf:mbox ?email .
    }
"#).await?;
// Vindt alle matching triples en verwijdert ze uit beide stores
```

#### DELETE + INSERT (Atomische Update)

```rust
// Atomische update: DELETE + INSERT in één operatie
store.update(r#"
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    DELETE { ?p foaf:name ?old }
    INSERT { ?p foaf:name "Pieter de Post" }
    WHERE {
        ?p foaf:name ?old .
        FILTER(?p = <http://example.org/person/789>)
    }
"#).await?;
```

### Transacties

Transacties bufferen writes tot commit, waarna beide stores atomisch worden bijgewerkt:

```rust
// Begin transaction
let mut tx = store.begin().await?;

// Meerdere operaties binnen dezelfde transactie
tx.update(r#"
    INSERT DATA {
        <http://example.org/order/1> a <http://example.org/Order> ;
            <http://example.org/status> "pending" .
    }
"#).await?;

tx.update(r#"
    INSERT DATA {
        <http://example.org/order/1> <http://example.org/total> "99.99"^^xsd:decimal .
    }
"#).await?;

tx.update(r#"
    DELETE { <http://example.org/order/1> <http://example.org/status> "pending" }
    INSERT { <http://example.org/order/1> <http://example.org/status> "confirmed" }
    WHERE { <http://example.org/order/1> <http://example.org/status> "pending" }
"#).await?;

// Commit: SurrealDB + QLever worden samen bijgewerkt
tx.commit().await?;
// Of: tx.rollback().await? om alle wijzigingen ongedaan te maken
```

### Automatische Query Routing

Queries worden automatisch naar de optimale store gerouteerd:

```rust
// Simple lookup → SurrealDB (low latency, ~1ms)
let result = store.query(r#"
    SELECT ?name WHERE {
        <http://example.org/person/789> foaf:name ?name
    }
"#).await?;

// Complex analytical query → QLever (optimized joins)
let result = store.query(r#"
    SELECT ?type (COUNT(?p) as ?count)
    WHERE {
        ?p a ?type .
        ?p foaf:knows ?other .
        ?other foaf:name ?name .
        FILTER(CONTAINS(?name, "Jan"))
    }
    GROUP BY ?type
    ORDER BY DESC(?count)
    LIMIT 100
"#).await?;
```

#### Routing Regels

| Query Karakteristiek | Gekozen Store | Reden |
|---------------------|---------------|-------|
| Point lookup (1 subject) | SurrealDB | Lage latency |
| < 3 triple patterns | SurrealDB | Overhead niet waard |
| ≥ 3 triple patterns | QLever | Betere join optimalisatie |
| Aggregaties (GROUP BY) | QLever | Geoptimaliseerd voor OLAP |
| Subqueries | QLever | Complexe query planning |
| Estimated > 10K results | QLever | Betere streaming |

### Query Planning

```rust
impl UnifiedTripleStore {
    /// Analyze query and determine best execution store
    fn plan_query(&self, sparql: &str) -> QueryPlan {
        let stats = self.analyze_query(sparql);

        let store = if stats.is_simple_lookup {
            StoreChoice::Surreal  // Point queries: SurrealDB
        } else if stats.pattern_count >= self.config.qlever_threshold_patterns {
            StoreChoice::QLever   // Complex joins: QLever
        } else if stats.estimated_cardinality >= self.config.qlever_threshold_cardinality {
            StoreChoice::QLever   // Large result sets
        } else if stats.has_aggregation || stats.has_subquery {
            StoreChoice::QLever   // Analytical queries
        } else {
            StoreChoice::Surreal  // Default: SurrealDB
        };

        QueryPlan { store, estimated_cost: stats.estimated_cardinality }
    }
}
```

### Sync Modes

| Mode | Consistentie | Latency | Use Case |
|------|--------------|---------|----------|
| `Immediate` | Strong | +5-10ms per write | Kritieke data, real-time queries |
| `OnCommit` | Strong (per tx) | Batch overhead | Transactionele workloads |
| `Batched` | Eventual | Minimaal | High-throughput ingestion |
| `Manual` | Eventual | Geen overhead | Bulk loads, maintenance |

### Volledige Voorbeeld

```rust
use indentiagraph_surreal::store::{UnifiedTripleStore, UnifiedStoreConfig, SyncMode};

#[tokio::main]
async fn main() -> Result<()> {
    // === SETUP ===
    let store = UnifiedTripleStore::new(
        surreal_store,
        "/var/lib/indentiagraph/qlever",
        UnifiedStoreConfig::default(),
    ).await?;

    // Initial sync (run once after setup)
    store.rebuild_qlever_index().await?;

    // === INSERT ===
    store.update(r#"
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX ex: <http://example.org/>

        INSERT DATA {
            ex:person/1 a foaf:Person ;
                foaf:name "Alice" ;
                foaf:knows ex:person/2 .

            ex:person/2 a foaf:Person ;
                foaf:name "Bob" ;
                foaf:knows ex:person/3 .

            ex:person/3 a foaf:Person ;
                foaf:name "Charlie" .
        }
    "#).await?;
    println!("✓ 3 personen toegevoegd aan beide stores");

    // === UPDATE ===
    store.update(r#"
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>

        DELETE { ?p foaf:name "Alice" }
        INSERT { ?p foaf:name "Alice van den Berg" }
        WHERE { ?p foaf:name "Alice" }
    "#).await?;
    println!("✓ Alice hernoemd in beide stores");

    // === DELETE ===
    store.update(r#"
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX ex: <http://example.org/>

        DELETE WHERE {
            ex:person/3 ?p ?o .
        }
    "#).await?;
    println!("✓ Charlie verwijderd uit beide stores");

    // === TRANSACTION ===
    let mut tx = store.begin().await?;

    tx.update(r#"
        PREFIX ex: <http://example.org/>
        INSERT DATA {
            ex:order/100 a ex:Order ;
                ex:customer ex:person/1 ;
                ex:total "250.00"^^xsd:decimal .
        }
    "#).await?;

    tx.update(r#"
        PREFIX ex: <http://example.org/>
        INSERT DATA {
            ex:order/100 ex:status "confirmed" .
        }
    "#).await?;

    tx.commit().await?;
    println!("✓ Order transactie committed naar beide stores");

    // === QUERY (auto-routed) ===

    // Simple lookup → SurrealDB
    let result = store.query(r#"
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        SELECT ?name WHERE {
            <http://example.org/person/1> foaf:name ?name
        }
    "#).await?;
    println!("Naam (via SurrealDB): {:?}", result.first());

    // Complex query → QLever
    let result = store.query(r#"
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX ex: <http://example.org/>

        SELECT ?person ?name (COUNT(?friend) as ?friendCount)
        WHERE {
            ?person a foaf:Person ;
                    foaf:name ?name ;
                    foaf:knows ?friend .
        }
        GROUP BY ?person ?name
        ORDER BY DESC(?friendCount)
    "#).await?;
    println!("Friend counts (via QLever): {:?}", result);

    Ok(())
}
```

### Operatie Overzicht

| Operatie | SurrealDB | QLever | Sync Gedrag |
|----------|-----------|--------|-------------|
| `INSERT DATA` | ✅ Direct | ✅ Direct | Parallel write |
| `DELETE DATA` | ✅ Direct | ✅ Direct | Parallel write |
| `DELETE WHERE` | ✅ Direct | ✅ Direct | Pattern match → delete |
| `DELETE/INSERT` | ✅ Direct | ✅ Direct | Atomic update |
| Transaction | ✅ Native | ✅ On commit | Buffered, then sync |
| Simple Query | ✅ Gebruikt | - | Low latency (~1ms) |
| Complex Query | - | ✅ Gebruikt | Optimized joins |
| Aggregation | - | ✅ Gebruikt | OLAP optimized |

---

## Hybrid Queries (SPARQL + SurrealQL)

IndentiaDB ondersteunt **hybrid queries** die SPARQL en SurrealQL combineren. Dit maakt het mogelijk om data uit de RDF triplestore te halen en te verwerken met SurrealQL operaties.

### Architectuur

```
┌─────────────────────────────────────────────────────────────┐
│                      Hybrid Query                            │
│  LET $x = SPARQL("SELECT ?s WHERE { ?s ?p ?o }");           │
│  RETURN $x;                                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    QueryRouter                               │
│  1. Detecteer query mode (SPARQL/SurrealQL/Hybrid)          │
│  2. Extract SPARQL subqueries                                │
│  3. Route naar juiste backend                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│    Oxigraph      │              │    SurrealDB     │
│  (RDF Triplestore)│              │   (Documents)    │
│                  │              │                  │
│  SPARQL queries  │              │  SurrealQL ops   │
│  Graph traversal │              │  CRUD, Transform │
└────────┬─────────┘              └────────┬─────────┘
         │                                 │
         └────────────────┬────────────────┘
                          ▼
                   Hybrid Result
```

### Syntax

De `SPARQL()` functie embedt een SPARQL query binnen SurrealQL:

```sql
-- Basis syntax
LET $variable = SPARQL("SPARQL query here");

-- Resultaat gebruiken
RETURN $variable;
```

### Query Mode Detectie

De QueryRouter detecteert automatisch het query type:

| Pattern | Mode | Backend |
|---------|------|---------|
| `SPARQL("...")` aanwezig | **Hybrid** | Beide |
| `?var` + `WHERE {` | **SPARQL** | Oxigraph |
| `SELECT ... FROM table` | **SurrealQL** | SurrealDB |

### Voorbeelden

#### 1. Basis Hybrid Query

```sql
-- Haal RDF data op en return direct
LET $triples = SPARQL("SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10");
RETURN $triples;
```

**Resultaat:**
```json
[
  {"s": "http://example.org/person1", "p": "http://xmlns.com/foaf/0.1/name", "o": "Alice"},
  {"s": "http://example.org/person1", "p": "http://xmlns.com/foaf/0.1/age", "o": "30"}
]
```

#### 2. RDF naar SurrealDB Migratie

```sql
-- Haal personen uit RDF knowledge graph
LET $rdf_persons = SPARQL("
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  SELECT ?uri ?name ?email
  WHERE {
    ?uri a foaf:Person ;
         foaf:name ?name .
    OPTIONAL { ?uri foaf:mbox ?email }
  }
");

-- Importeer naar SurrealDB
FOR $person IN $rdf_persons {
  CREATE person SET
    external_uri = $person.uri,
    name = $person.name,
    email = $person.email,
    imported_at = time::now()
};
```

#### 3. Data Verrijking (Enrich SurrealDB met RDF)

```sql
-- Haal bestaande users op
LET $users = SELECT * FROM users WHERE department = 'Engineering';

-- Verrijk met RDF metadata
FOR $user IN $users {
  -- Zoek expertise in knowledge graph
  LET $expertise = SPARQL("
    PREFIX org: <http://example.org/org/>
    PREFIX skill: <http://example.org/skill/>
    SELECT ?skill ?level
    WHERE {
      <" + $user.rdf_uri + "> skill:hasSkill ?skillNode .
      ?skillNode skill:name ?skill ;
                 skill:level ?level .
    }
  ");

  -- Update user met expertise
  UPDATE $user.id SET skills = $expertise
};
```

#### 4. Federated Query met Filtering

```sql
-- Haal producten uit RDF catalog
LET $products = SPARQL("
  PREFIX schema: <http://schema.org/>
  SELECT ?product ?name ?price
  WHERE {
    ?product a schema:Product ;
             schema:name ?name ;
             schema:price ?price .
    FILTER (?price < 100)
  }
");

-- Filter en transformeer met SurrealQL
LET $affordable = SELECT * FROM $products
  WHERE price > 10
  ORDER BY price ASC;

-- Combineer met lokale inventory
SELECT
  p.name,
  p.price,
  i.stock_count,
  i.warehouse
FROM $affordable AS p
JOIN inventory AS i ON i.product_uri = p.product;
```

#### 5. Knowledge Graph Analytics

```sql
-- Vind connecties in social graph
LET $connections = SPARQL("
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  SELECT ?person1 ?person2 (COUNT(?mutual) AS ?mutualFriends)
  WHERE {
    ?person1 foaf:knows ?mutual .
    ?person2 foaf:knows ?mutual .
    FILTER (?person1 != ?person2)
  }
  GROUP BY ?person1 ?person2
  HAVING (COUNT(?mutual) >= 3)
  ORDER BY DESC(?mutualFriends)
  LIMIT 100
");

-- Sla resultaten op voor dashboard
FOR $conn IN $connections {
  CREATE social_connection SET
    source = $conn.person1,
    target = $conn.person2,
    strength = $conn.mutualFriends,
    computed_at = time::now()
};
```

#### 6. RAG Pipeline met Provenance

```sql
-- Haal feiten met bronvermelding op (RDF 1.2 quoted triples)
LET $facts = SPARQL("
  PREFIX ig: <http://indentiadb.nl/ontology/>
  SELECT ?subject ?predicate ?object ?source ?confidence
  WHERE {
    << ?subject ?predicate ?object >> ig:source ?source ;
                                      ig:confidence ?confidence .
    FILTER (?confidence > 0.8)
  }
  ORDER BY DESC(?confidence)
  LIMIT 50
");

-- Formatteer voor LLM context
LET $context = SELECT
  string::concat(subject, ' ', predicate, ' ', object) AS fact,
  source,
  confidence
FROM $facts;

RETURN {
  facts: $context,
  total: array::len($facts),
  avg_confidence: math::mean($facts.confidence)
};
```

### Execution Flow

```
1. Query Parsing
   ├── Detecteer SPARQL() function calls
   ├── Extract variable bindings (LET $x = ...)
   └── Parse SurrealQL template

2. SPARQL Phase
   ├── Voor elke SPARQL() call:
   │   ├── Stuur query naar Oxigraph
   │   ├── Ontvang bindings als JSON
   │   └── Bind aan $variable
   └── Verzamel alle SPARQL resultaten

3. SurrealQL Phase
   ├── Substitueer $variables met SPARQL resultaten
   ├── Execute SurrealQL tegen SurrealDB
   └── Return gecombineerd resultaat

4. Result Merging
   └── Return unified response met:
       ├── sparqlResults: [...SPARQL bindings...]
       ├── surrealResults: [...SurrealQL results...]
       └── execution: {sparqlPhase: ms, surrealPhase: ms, total: ms}
```

### Beperkingen

| Beperking | Beschrijving |
|-----------|--------------|
| **Geen nested SPARQL** | `SPARQL("... SPARQL(...) ...")` niet ondersteund |
| **Read-only SPARQL** | SPARQL UPDATE in hybrid mode nog niet ondersteund |
| **Variable scope** | SPARQL variabelen (`?x`) zijn niet direct bruikbaar als SurrealQL variabelen |
| **Type conversie** | RDF datatypes worden geconverteerd naar JSON (string/number/boolean) |

### Best Practices

1. **Beperk SPARQL resultsets** - Gebruik `LIMIT` om grote resultsets te voorkomen
2. **Filter vroeg** - Pas `FILTER` toe in SPARQL, niet in SurrealQL
3. **Batch operaties** - Gebruik `FOR` loops voor bulk inserts/updates
4. **Cache resultaten** - Sla frequente SPARQL queries op in SurrealDB tabellen
5. **Monitor performance** - Check `execution.sparqlPhase` vs `execution.surrealPhase`

---

## Elasticsearch Compatibility Layer

IndentiaDB biedt een **volledige Elasticsearch-compatible REST API** op poort 9200. Dit maakt het mogelijk om bestaande Elasticsearch clients, Kibana, Logstash, Beats en andere tooling direct te gebruiken.

> **Status**: ✅ Geïmplementeerd - Compatibel met ES 9.1.4 clients. Zie [docs/elastic_compat.md](docs/elastic_compat.md) voor details.

### Waarom Elasticsearch Compatibiliteit?

| Voordeel | Beschrijving |
|----------|--------------|
| **Drop-in Replacement** | Bestaande ES clients werken zonder codewijzigingen |
| **Kibana Support** | Direct verbinden met Kibana voor dashboards en visualisaties |
| **Hybrid Queries** | Combineer ES Query DSL met SPARQL en SurrealQL |
| **Knowledge Graph Enrichment** | Verrijk zoekresultaten met RDF data |
| **Unified Search** | Text + Vector + Graph search in één query |

### Basis Gebruik

```python
from elasticsearch import Elasticsearch

es = Elasticsearch("http://localhost:9200")

# Indexeren
es.index(
    index="producten",
    id="laptop-1",
    document={
        "titel": "MacBook Pro 16",
        "beschrijving": "Professionele laptop met M3 Pro chip",
        "categorie": "elektronica",
        "prijs": 2499.99,
        "product_uri": "https://schema.org/Product/macbook-pro-16"
    }
)

# Zoeken met Query DSL
result = es.search(
    index="producten",
    query={
        "bool": {
            "must": [{"match": {"beschrijving": "laptop"}}],
            "filter": [{"term": {"categorie": "elektronica"}}]
        }
    }
)
```

### Hybrid Query met Knowledge Graph (`_ext`)

De `_ext` extensie maakt het mogelijk om ES queries te combineren met SPARQL — **de killer feature van IndentiaDB**. Hiermee kun je full-text search combineren met semantic reasoning, graph traversal en RDF-star provenance.

#### Basis: ES Search + SPARQL Enrichment

```python
from elasticsearch import Elasticsearch

es = Elasticsearch("http://localhost:9200")

# Zoek producten en verrijk met knowledge graph data
result = es.search(
    index="producten",
    query={"match": {"beschrijving": "laptop"}},
    _ext={
        "sparql_enrich": {
            "uri_field": "product_uri",  # Veld dat linkt naar RDF entity
            "query": """
                PREFIX schema: <http://schema.org/>
                SELECT ?manufacturer ?rating ?category WHERE {
                    $uri schema:manufacturer/schema:name ?manufacturer .
                    OPTIONAL { $uri schema:aggregateRating/schema:ratingValue ?rating }
                    OPTIONAL { $uri schema:category/rdfs:label ?category }
                }
            """
        }
    }
)

# Response bevat zowel ES hits als SPARQL enrichments
for hit in result["hits"]["hits"]:
    print(f"Product: {hit['_source']['naam']}")
    print(f"  Manufacturer: {hit['_ext']['manufacturer']}")
    print(f"  Rating: {hit['_ext']['rating']}")
```

#### Knowledge Graph Boosting

Boost search scores op basis van graph eigenschappen:

```python
result = es.search(
    index="artikelen",
    query={
        "bool": {
            "must": [{"match": {"content": "machine learning"}}],
            "should": [{"match": {"title": "AI"}}]
        }
    },
    _ext={
        # Boost artikelen van gerenommeerde auteurs
        "kg_boost": {
            "entity_field": "author_uri",
            "boost_query": """
                PREFIX ex: <http://example.org/>
                SELECT ((?citations / 100.0) AS ?boost) WHERE {
                    $uri ex:citationCount ?citations .
                    $uri ex:hIndex ?h .
                    FILTER(?h > 20)
                }
            """,
            "default_boost": 1.0,
            "max_boost": 5.0
        }
    }
)
```

#### Graph Traversal Filter

Filter ES resultaten op basis van graph relaties:

```python
result = es.search(
    index="employees",
    query={"match_all": {}},
    _ext={
        # Alleen medewerkers die rapporteren aan specifieke manager (via graph)
        "sparql_filter": {
            "uri_field": "employee_uri",
            "query": """
                PREFIX org: <http://example.org/org/>
                ASK WHERE {
                    $uri org:reportsTo+ <http://example.org/person/ceo> .
                }
            """
        }
    }
)
```

#### RDF-star Provenance in Search Results

Haal provenance en confidence mee bij search results:

```python
result = es.search(
    index="facts",
    query={"match": {"claim": "climate change"}},
    _ext={
        "sparql_enrich": {
            "uri_field": "fact_uri",
            "query": """
                PREFIX prov: <http://www.w3.org/ns/prov#>
                PREFIX ex: <http://example.org/>

                SELECT ?source ?confidence ?verifiedDate WHERE {
                    # RDF-star: metadata over het feit zelf
                    << $uri ?p ?o >> prov:wasAttributedTo ?source ;
                                     ex:confidence ?confidence ;
                                     prov:generatedAtTime ?verifiedDate .
                    FILTER(?confidence > 0.8)
                }
                ORDER BY DESC(?confidence)
                LIMIT 3
            """
        }
    }
)

# Response met provenance
for hit in result["hits"]["hits"]:
    print(f"Claim: {hit['_source']['claim']}")
    for source in hit['_ext']['sources']:
        print(f"  Source: {source['source']} (confidence: {source['confidence']})")
```

#### Semantic Search met Inferencing

Combineer full-text search met RDFS/OWL reasoning:

```python
result = es.search(
    index="products",
    query={"match": {"description": "portable computer"}},
    _ext={
        # Expand search met subclass inferencing
        "sparql_expand": {
            "uri_field": "category_uri",
            "inference": "rdfs",  # Enable RDFS reasoning
            "query": """
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX schema: <http://schema.org/>

                SELECT ?relatedCategory WHERE {
                    # Vind alle subcategorieën (via rdfs:subClassOf inferencing)
                    ?relatedCategory rdfs:subClassOf* $uri .
                }
            """
        },
        # Filter op gerelateerde categorieën
        "category_filter": {
            "field": "category_uri",
            "values_from_sparql": true
        }
    }
)
```

#### Multi-hop Graph Enrichment

Verrijk met data meerdere hops verwijderd in de graph:

```python
result = es.search(
    index="papers",
    query={"match": {"abstract": "neural networks"}},
    _ext={
        "sparql_enrich": {
            "uri_field": "paper_uri",
            "query": """
                PREFIX cito: <http://purl.org/spar/cito/>
                PREFIX dcterms: <http://purl.org/dc/terms/>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>

                SELECT ?authorName ?institution ?citedByCount
                       (GROUP_CONCAT(?coAuthor; separator=", ") AS ?coAuthors) WHERE {
                    # Auteur info
                    $uri dcterms:creator ?author .
                    ?author foaf:name ?authorName ;
                            foaf:member ?inst .
                    ?inst foaf:name ?institution .

                    # Co-auteurs (1 hop)
                    $uri dcterms:creator ?coAuthorUri .
                    ?coAuthorUri foaf:name ?coAuthor .
                    FILTER(?coAuthorUri != ?author)

                    # Citation count (aggregatie)
                    {
                        SELECT (COUNT(?citing) AS ?citedByCount) WHERE {
                            ?citing cito:cites $uri .
                        }
                    }
                }
                GROUP BY ?authorName ?institution ?citedByCount
            """
        }
    }
)
```

#### RAG-Ready: Feiten met Bronvermelding

Ideaal voor Retrieval-Augmented Generation pipelines:

```python
# RAG Pipeline: Haal verifieerbare feiten op voor LLM context
result = es.search(
    index="knowledge_base",
    query={
        "bool": {
            "must": [{"match": {"content": user_question}}],
            "filter": [{"range": {"confidence": {"gte": 0.8}}}]
        }
    },
    _ext={
        "sparql_enrich": {
            "uri_field": "entity_uri",
            "query": """
                PREFIX schema: <http://schema.org/>
                PREFIX prov: <http://www.w3.org/ns/prov#>

                SELECT ?fact ?source ?confidence ?lastVerified WHERE {
                    # Haal gerelateerde feiten op
                    $uri ?predicate ?object .
                    BIND(CONCAT(STR($uri), " ", STR(?predicate), " ", STR(?object)) AS ?fact)

                    # Met provenance (RDF-star)
                    << $uri ?predicate ?object >> prov:wasAttributedTo ?source ;
                                                  schema:confidence ?confidence ;
                                                  prov:generatedAtTime ?lastVerified .

                    FILTER(?confidence > 0.85)
                }
                ORDER BY DESC(?confidence)
                LIMIT 10
            """
        },
        # Format voor LLM context
        "format": "rag_context"
    }
)

# Genereer LLM prompt met verifieerbare feiten
context = "\n".join([
    f"- {fact['fact']} [Source: {fact['source']}, Confidence: {fact['confidence']}]"
    for hit in result["hits"]["hits"]
    for fact in hit.get("_ext", {}).get("facts", [])
])

llm_prompt = f"""Answer based on these verified facts:
{context}

Question: {user_question}
"""
```

#### Volledige `_ext` Opties

| Optie | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| `sparql_enrich` | Verrijk hits met SPARQL query resultaten | Manufacturer, ratings ophalen |
| `sparql_filter` | Filter hits op basis van ASK query | Alleen items in bepaalde graph relatie |
| `sparql_expand` | Expand query met SPARQL resultaten | Subclass expansion |
| `kg_boost` | Boost scores op basis van graph properties | Citation count boosting |
| `inference` | Enable reasoning (`rdfs`, `owl`, `custom`) | Subclass inferencing |
| `format` | Output format (`default`, `rag_context`, `graph`) | RAG-ready formatting |
| `timeout` | SPARQL query timeout in ms | `"timeout": 5000` |
| `cache` | Cache SPARQL results | `"cache": true` |

### Ondersteunde APIs

| API Categorie | Endpoints | Status |
|---------------|-----------|--------|
| **Document** | `_doc`, `_bulk`, `_mget`, `_update`, `_update_by_query`, `_reindex` | ✅ |
| **Search** | `_search`, `_msearch`, `_count`, scroll, PIT | ✅ |
| **Query DSL** | `match`, `bool`, `term`, `range`, `knn`, `function_score`, `nested`, `fuzzy`, `wildcard` | ✅ |
| **Retrievers** | `standard`, `knn`, `rrf`, `linear`, `pinned`, `text_similarity_reranker` | ✅ |
| **Aggregations** | bucket (`terms`, `histogram`, `date_histogram`, `range`, `filter`), metric (`avg`, `sum`, `min`, `max`, `count`, `cardinality`), pipeline | ✅ |
| **Index** | Create, delete, mappings, settings, templates, component templates, aliases, ILM, data streams | ✅ |
| **Cluster** | `_cluster/health`, `_cluster/state`, `_cluster/stats`, `_cluster/info` | ✅ |
| **Cat** | `_cat/indices`, `_cat/health`, `_cat/nodes`, `_cat/templates`, `_cat/aliases`, `_cat/count` | ✅ |
| **Security** | API keys, users, roles, role mappings, privileges, audit (X-Pack compatible) | ✅ |
| **System** | Kibana indices, Security indices, Monitoring indices | ✅ |

### Architectuur

```
                    ES Query DSL Request
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                 IndentiaDB ES Layer                        │
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐│
│  │ Query DSL   │   │ _ext Parser │   │ Response Merger     ││
│  │ Translator  │   │ (SPARQL)    │   │                     ││
│  └──────┬──────┘   └──────┬──────┘   └──────────┬──────────┘│
└─────────┼─────────────────┼──────────────────────┼───────────┘
          │                 │                      │
          ▼                 ▼                      ▼
   ┌────────────┐    ┌────────────┐    ┌─────────────────────┐
   │ SurrealDB  │    │  Oxigraph  │    │ Fragment Inverted   │
   │ (Documents)│    │  (RDF/KG)  │    │ Index (Full-text)   │
   └────────────┘    └────────────┘    └─────────────────────┘
```

### Configuratie

```toml
[elasticsearch_compat]
enabled = true
port = 9200
host = "0.0.0.0"
cluster_name = "indentiadb-cluster"

[elasticsearch_compat.kibana]
auto_create_system_indices = true
version_compat = "9.1.4"

[elasticsearch_compat.security]
enabled = true
api_key_enabled = true
audit_logging = true
```

> **Versie Compatibiliteit**: IndentiaDB rapporteert als ES `9.1.4-indentiadb` en is compatibel met ES 8.x/9.x clients.

Zie [docs/elastic_compat.md](docs/elastic_compat.md) voor de volledige documentatie.

### Studio Integratie

In Indentia Studio wordt het query type automatisch gedetecteerd en weergegeven:

| Badge | Betekenis |
|-------|-----------|
| **SurrealQL** (paars) | Pure SurrealQL query |
| **SPARQL** (cyaan) | Pure SPARQL query |
| **Hybrid** (grape) | Gecombineerde SPARQL + SurrealQL |

De editor biedt context-aware autocompletion:
- Binnen `SPARQL("...")`: SPARQL keywords, prefixes, variabelen
- Buiten SPARQL strings: SurrealQL keywords, functies, tabellen

---

## Security Configuratie

IndentiaDB ondersteunt uitgebreide security configuratie via TOML bestanden. Hieronder staan voorbeelden voor de verschillende authenticatie providers.

### LDAP Configuratie

```toml
[authentication.ldap]
server_url = "ldaps://ldap.example.com:636"
bind_dn = "cn=service,ou=services,dc=example,dc=com"
bind_password = "${LDAP_BIND_PASSWORD}"  # Via environment variable
user_search_base = "ou=users,dc=example,dc=com"
user_search_filter = "(sAMAccountName={0})"
group_member_attribute = "memberOf"
sid_attribute = "objectSid"  # Voor Windows AD
display_name_attribute = "displayName"
timeout_seconds = 10
pool_size = 5

# Group-to-role mapping
[authentication.ldap.group_role_mapping]
"CN=Admins,OU=Groups,DC=example,DC=com" = "admin"
"CN=DataScientists,OU=Groups,DC=example,DC=com" = "writer"
"CN=Readers,OU=Groups,DC=example,DC=com" = "reader"

# Group-to-SID mapping voor triple-level ACL
[authentication.ldap.group_sid_mapping]
"CN=Finance,OU=Groups,DC=example,DC=com" = "S-1-5-21-domain-2001"
"CN=HR,OU=Groups,DC=example,DC=com" = "S-1-5-21-domain-2002"
```

### OpenID Connect Configuratie

```toml
[authentication.oidc]
issuer_url = "https://auth.example.com/realms/myrealm"
client_id = "indentiadb-client"
audience = "indentiadb-api"  # Optioneel, default is client_id
roles_claim = "realm_access.roles"  # Keycloak-style
sids_claim = "groups"
jwks_refresh_interval_secs = 3600
http_timeout_secs = 10

# Role mapping van OIDC claims naar applicatie rollen
[authentication.oidc.role_mapping]
"realm-admin" = "admin"
"realm-writer" = "writer"
"realm-reader" = "reader"
```

### Graph-Level ACL Configuratie

```toml
[authorization]
default_access = "deny"  # "allow" of "deny"

# Role-to-permission mapping
[authorization.role_permissions]
admin = "Admin"
writer = "Write"
reader = "Read"

# Security contexts per actor of role
[acl.contexts.public_reader]
visible_graphs = ["http://example.org/public"]
visible_default_graph = false

[acl.contexts.data_scientist]
# "*" = alle named graphs, exclusief default
visible_graphs = ["*"]
visible_default_graph = false

[acl.contexts.admin]
# "**" = alle graphs inclusief default
visible_graphs = ["**"]
visible_default_graph = true

# Actor-to-context mapping
[acl.actor_contexts]
"guest" = "public_reader"
"alice" = "data_scientist"

# Role-to-context mapping
[acl.role_contexts]
"admin" = "admin"
"reader" = "public_reader"
```

### Triple-Level ACL met RDF-star

Voor fine-grained access control kunnen security annotaties worden toegevoegd aan triples met RDF-star syntax:

```turtle
# Data met security annotaties
<< :confidential_report :contains :financial_data >>
    :allowedSID "S-1-5-21-domain-2001" ;  # Finance group
    :classification "confidential" .

<< :public_report :contains :summary >>
    :allowedSID "*" ;  # Iedereen
    :classification "public" .
```

Query's worden automatisch gefilterd op basis van de actor's SIDs:

```sparql
# Deze query toont alleen triples waarvoor de actor geautoriseerd is
SELECT ?s ?p ?o
WHERE {
    ?s ?p ?o .
}
```

---

## Implementatie Status RDF 1.2 / SPARQL 1.2

### ✅ 100% Feature Complete (Januari 2026)

IndentiaDB is **volledig compliant** met de RDF 1.2 en SPARQL 1.2 specificaties. Alle features zijn geïmplementeerd, getest en gevalideerd tegen de officiële W3C specificaties.

#### RDF 1.2 Core Compliance

| Feature | Status | Details |
|---------|--------|---------|
| **Triple Terms (Quoted Triples)** | ✅ 100% | Volledige ondersteuning voor `<< s p o >>` syntax |
| **rdf:dirLangString Datatype** | ✅ 100% | Nieuw datatype voor directional language tags |
| **Base Direction Tags** | ✅ 100% | `ltr` en `rtl` direction support via `@lang--dir` |
| **RDF-star Semantics** | ✅ 100% | Quoted triples als first-class terms in object positie |
| **Triple Term Serialization** | ✅ 100% | N-Triples, Turtle, JSON-LD ondersteuning |

#### SPARQL 1.2 Core Compliance

| Feature | Status | Details |
|---------|--------|---------|
| **TRIPLE(s, p, o)** | ✅ 100% | Construeer triple terms dynamisch |
| **SUBJECT(t)** | ✅ 100% | Extract subject uit triple term |
| **PREDICATE(t)** | ✅ 100% | Extract predicate uit triple term |
| **OBJECT(t)** | ✅ 100% | Extract object uit triple term |
| **isTRIPLE(t)** | ✅ 100% | Type check voor triple terms |
| **LANGDIR(lit)** | ✅ 100% | Haal direction op van directional literal |
| **STRLANGDIR(s, l, d)** | ✅ 100% | Creëer directional language literal |
| **HASDIR(lit)** | ✅ 100% | Check of literal direction heeft |
| **DIR(lit)** | ✅ 100% | Haal direction string op |
| **SEMIJOIN/ANTIJOIN** | ✅ 100% | Efficiënte EXISTS/NOT EXISTS operatoren |
| **Reification Syntax** | ✅ 100% | `:s :p :o ~ ?r` annotatie syntax |

#### Test Coverage

- **130+ unit tests** voor RDF 1.2 / SPARQL 1.2 features
- **W3C Conformance Tests** geslaagd
- **Round-trip tests** voor alle serialization formats
- **Query execution tests** voor alle SPARQL 1.2 functies

### Vergelijking met Andere Triplestores

| Feature | IndentiaDB | Apache Jena | Oxigraph | QLever |
|---------|---------------|-------------|----------|--------|
| **RDF 1.2 Triple Terms** | ✅ | ✅ | ❌ | ❌ |
| **SPARQL 1.2 Functies (9/9)** | ✅ | ✅ | ❌ | ❌ |
| **Base Direction** | ✅ | ✅ | ❌ | ❌ |
| **SEMIJOIN/ANTIJOIN** | ✅ | ✅ | ❌ | ❌ |
| **Directional Literals** | ✅ | ✅ | ❌ | ❌ |
| **RAG-optimized Queries** | ✅ | ❌ | ❌ | ❌ |

---

## Roadmap

### ✅ Geïmplementeerd (v0.1.0)

#### Core Functionaliteit
- [x] Core SPARQL 1.1 ondersteuning (SELECT, CONSTRUCT, ASK, DESCRIBE)
- [x] Alle 6 permutaties indexen (SPO, SOP, PSO, POS, OSP, OPS)
- [x] C++ QLever index compatibiliteit (format PR #1572)
- [x] ZSTD compressie met delta encoding
- [x] Memory-mapped I/O voor vocabularies
- [x] FSST decompression voor C++ QLever compatibility

#### RDF 1.2 & SPARQL 1.2
- [x] RDF 1.2 Triple Terms (Quoted Triples)
- [x] SPARQL 1.2 functies (TRIPLE, SUBJECT, PREDICATE, OBJECT, isTRIPLE)
- [x] Base direction voor literals (@ar--rtl, @en--ltr)
- [x] LANGDIR, STRLANGDIR, HASDIR, DIR functies
- [x] RAG-geoptimaliseerde provenance queries

#### Query Optimization & Execution
- [x] Cost-based query optimization
- [x] Filter pushdown optimization
- [x] Join optimization (Hash, Merge, Index Nested Loop)
- [x] Cardinality estimation
- [x] Block-level pruning
- [x] Query result caching met LRU eviction
- [x] Materialized views

#### Property Paths & Path Search
- [x] SPARQL Property Paths (/, |, +, *, ^, !)
- [x] Transitive closure met bidirectional search
- [x] Dijkstra's shortest path algorithm
- [x] Breadth-First Search
- [x] All paths en K-shortest paths

#### Spatial Queries (GeoSPARQL)
- [x] GeoPoint encoding (60-bit, centimeter precision)
- [x] Nearest neighbor search
- [x] Distance joins
- [x] Haversine distance calculations
- [x] Topological relations (sf:intersects, sf:contains, etc.)
- [x] WKT format parsing

#### Full-Text Search
- [x] Text index reader (inverted index)
- [x] BM25 ranking
- [x] TF-IDF scoring
- [x] Simple8b compression
- [x] ql:contains-word en ql:contains-entity predicates
- [x] DocsDB voor text excerpts

#### Federated Queries
- [x] SERVICE clause ondersteuning
- [x] HTTP SPARQL endpoint integration
- [x] Endpoint policies (whitelist/blacklist)
- [x] Pattern matching voor endpoint selectie
- [x] Result streaming

#### Updates & Transactions
- [x] SPARQL UPDATE (INSERT DATA, DELETE DATA, DELETE/INSERT WHERE)
- [x] Delta triples system
- [x] Snapshot isolation
- [x] Monotonic read guarantees
- [x] Cluster-wide blank node allocation

#### Clustering & HA
- [x] Raft consensus (OpenRaft)
- [x] Leader election en failover
- [x] Log replication
- [x] Snapshot & compaction
- [x] Dynamic membership changes
- [x] Network health checking
- [x] gRPC communication met TLS support

#### Performance
- [x] mimalloc allocator (5-15% sneller)
- [x] Link-Time Optimization (LTO)
- [x] Apple Silicon NEON optimizations
- [x] Parallel RDF parsing
- [x] External sorting voor grote datasets

#### Developer Tools
- [x] Index builder CLI (indentiadb-indexer)
- [x] SPARQL server CLI (indentiadb-server)
- [x] Progress bars met indicatif
- [x] Structured logging met tracing
- [x] Index validation tools
- [x] Prometheus metrics export

#### Testing & Quality
- [x] W3C SPARQL 1.1 compliance tests
- [x] RDF 1.2 conformance tests
- [x] Property-based testing met PropTest
- [x] Cluster integration tests
- [x] Criterion benchmarks
- [x] QLever equivalence testing

#### Security & Access Control
- [x] LDAP authenticatie met connection pooling
- [x] OpenID Connect (OIDC) met JWKS caching
- [x] JWT Bearer token validatie (RS256, ES256, etc.)
- [x] HTTP Basic Authentication
- [x] Role-Based Access Control (RBAC)
- [x] Permission hierarchy (None → Read → Write → Admin)
- [x] Graph-level ACL (SecurityContext)
- [x] Visibility patterns ("**", "*", specifieke graphs)
- [x] Triple-level ACL met Security Identifiers (SIDs)
- [x] Windows SID parsing en group mapping
- [x] FROM/FROM NAMED clause filtering
- [x] AclDatasetWrapper voor transparante filtering
- [x] Rate limiting voor brute force bescherming
- [x] Audit logging voor authentication/authorization events

### 🔄 In Ontwikkeling (v0.2.0)

- [x] SPARQL 1.2 SEMIJOIN/ANTIJOIN operators ✅
- [x] Elasticsearch Compatibility Layer ✅
- [x] Kubernetes Operator ✅
- [x] Real-time Alerting Engine ✅
- [x] Bitemporal Support ✅
- [x] Semantic Inferencing (RDFS/OWL) ✅
- [x] WASM Support ✅
- [x] LocalTripleSource met volledige algebra evaluatie ✅
- [x] SERVICE clause delegatie via ServiceResolver ✅
- [x] SERVICE SILENT ondersteuning ✅
- [ ] Query federation optimization (join pushdown)
- [ ] Distributed query execution across cluster
- [ ] GraphQL interface
- [ ] Streaming SPARQL results (via HTTP chunked encoding)
- [ ] Query timeouts en resource limits
- [ ] Advanced spatial operators (polygon intersection)
- [ ] Hybrid extensions (`_ext` voor SPARQL enrichment)

---

## 🧮 Vector Search (Rust API)

IndentiaDB bevat een volledige **Approximate Nearest Neighbor (ANN)** implementatie geporteerd van ArangoDB, met IVF (Inverted File) indexing voor hoge performance vector search.

### Eenvoudig Voorbeeld

```rust
use indentiagraph_vector::{
    VectorIndexConfig, SimilarityMetric, VectorIndexSearchConfig,
    PersistentAnnEngine, AnnEngine
};

// 1. Configureer de vector index
let config = VectorIndexConfig {
    dimension: 768,                    // Embedding dimensie (bijv. OpenAI ada-002)
    metric: SimilarityMetric::Cosine,  // Cosine similarity voor text embeddings
    n_lists: 100,                      // Aantal Voronoi cells
    training_iterations: 25,           // K-means iteraties
    default_n_probe: 10,               // Aantal cells om te doorzoeken
    ..Default::default()
};

// 2. Maak engine aan en train
let mut engine = PersistentAnnEngine::new();
engine.build(config).unwrap();

// Train met bestaande vectoren (minimaal 256 * n_lists vectoren nodig)
let training_vectors: Vec<f32> = load_training_vectors(); // ~25k+ vectoren
engine.train(training_vectors).unwrap();

// 3. Voeg vectoren toe
engine.upsert("doc1".to_string(), vec![0.1, 0.2, 0.3, /* ... 768 dims */]).unwrap();
engine.upsert("doc2".to_string(), vec![0.4, 0.5, 0.6, /* ... */]).unwrap();

// 4. Zoek met query vector
let query = vec![0.15, 0.25, 0.35, /* ... */];
let search_config = VectorIndexSearchConfig {
    k: 10,                    // Top-10 resultaten
    n_probe: Some(20),        // Hoger = betere recall, trager
    offset: 0,
};

let results = engine.search(&query, &search_config).unwrap();
for hit in results {
    println!("{}: score={:.4}", hit.id, hit.score);
}
```

### Met Stored Values (Covering Index)

```rust
use std::collections::HashMap;
use serde_json::json;

// Voeg document metadata toe voor filter-only queries
let mut values = HashMap::new();
values.insert("title".to_string(), json!("Machine Learning Basics"));
values.insert("category".to_string(), json!("AI"));
values.insert("status".to_string(), json!("published"));

engine.upsert_with_values(
    "doc3".to_string(),
    embedding_vector,
    values
).unwrap();

// Later: filter zonder document lookup
let filter_context = FilterContext {
    is_covered_by_stored_values: true,
    var_to_regs: vec![],
};

let results = engine.search_with_filter(
    &query,
    &search_config,
    Box::new(|doc_id, stored_values| {
        // Filter alleen op stored values
        stored_values
            .map(|v| v.get("status") == Some(&json!("published")))
            .unwrap_or(false)
    }),
    filter_context,
).unwrap();
```

### Optimizer Integratie

```rust
use indentiagraph_vector::optimizer::{
    default_vector_registry, RuleContext
};

// Maak optimizer context voor query planning
let registry = default_vector_registry();

let ctx = RuleContext::default()
    .with_feature("vector")
    .with_sort(true)
    .with_limit(true)
    .with_metadata("approx_near_function", "APPROX_NEAR_COSINE")
    .with_metadata("has_vector_index", "true")
    .with_metadata("vector_metric", "cosine")
    .with_metadata("sort_ascending", "false")
    .with_metadata("vector_field_match", "true");

let outcome = registry.evaluate(&ctx);

// Bekijk welke rules zijn toegepast
for event in &outcome.explain {
    println!("[{}] {}: {}", event.rule, event.action, event.reason);
}
```

### Metrics & Configuratie

| Metric | Sort Order | Use Case |
|--------|------------|----------|
| `L2` | ASC (kleinste afstand) | Image embeddings, Euclidean space |
| `Cosine` | DESC (hoogste similarity) | Text embeddings, semantic search |
| `InnerProduct` | DESC (hoogste product) | Neural network outputs |

### Performance Karakteristieken

| Operatie | Complexiteit | Notes |
|----------|--------------|-------|
| Training | O(n × k × d × i) | n=vectoren, k=centroids, d=dimensie, i=iteraties |
| Insert | O(d × k) | Assignment naar nearest centroid |
| Search (n_probe=1) | O(d × k + n/k) | Snelste, lagere recall |
| Search (n_probe=10) | O(d × k + 10n/k) | Goede balans |
| Search (n_probe=100) | O(d × k + 100n/k) | Hoge recall, trager |

> **Tip**: Begin met `n_probe = sqrt(n_lists)` voor een goede balans tussen snelheid en recall.

### 📋 Roadmap (v0.3.0+)

#### Advanced Features
- [ ] SHACL validation ondersteuning
- [ ] Reasoning engine (RDFS, OWL-2 RL)
- [ ] Temporal queries (time-travel via snapshot history)
- [ ] Multi-tenancy met named graphs per tenant
- [ ] Query federation met intelligent caching

#### Performance & Scalability
- [ ] GPU acceleration voor joins (via CUDA/Metal)
- [ ] Adaptive query execution (runtime re-optimization)
- [ ] Parallel query execution across cores
- [ ] Incremental index updates (zonder volledige rebuild)
- [ ] Tiered storage (hot/warm/cold data)

#### Operations & Observability
- [ ] Web UI voor cluster management
- [ ] Query analyzer en execution plan visualizer
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Backup & restore tooling
- [ ] Rolling updates zonder downtime

#### Ecosystem Integration
- [x] Kubernetes operator voor cluster deployment ✅
- [ ] Apache Arrow integratie voor analytics
- [ ] DuckDB federation (SQL over RDF)
- [ ] Kafka/Pulsar streaming ingest
- [ ] S3/object storage backends
