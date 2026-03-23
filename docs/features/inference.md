# Semantic Inference

IndentiaDB supports RDFS and OWL forward-chaining materialization. Entailed (inferred) triples are stored in the triple index alongside asserted triples, making inferred knowledge as fast to query as directly inserted data.

---

## How Forward-Chaining Materialization Works

Forward-chaining works by applying inference rules exhaustively at write time and storing the results. When you insert a triple, the inference engine immediately computes all triples that can be derived from it (using the current schema), stores those derived triples, and propagates any further inferences they trigger. This continues until no new triples can be derived (a fixed point).

```
INSERT:   ex:poodle rdfs:subClassOf ex:dog
INSERT:   ex:rex    a ex:poodle

Inferred: ex:rex a ex:dog           (subClassOf rule)
Inferred: ex:rex a owl:Thing        (top type)
```

Because inferred triples are stored and indexed normally, a SPARQL query for `?x a ex:dog` will return `ex:rex` immediately — no runtime rule evaluation is required.

### Trade-off: Write vs. Read

| Approach | Write Cost | Query Cost | Suitable For |
|----------|-----------|------------|--------------|
| Forward-chaining (materialization) | Higher — inference runs on every write | Lower — no runtime reasoning | Read-heavy workloads, large corpora |
| Backward-chaining (on-demand) | Lower — no pre-computation | Higher — rules evaluated at query time | Write-heavy workloads, small corpora |

IndentiaDB uses forward-chaining. If your schema changes rarely and queries run frequently (the typical knowledge graph workload), materialization gives the best query performance.

---

## Incremental Updates

IndentiaDB uses **incremental inference** — when a triple is inserted or deleted, only the inferences that depend on that triple are recomputed. Full re-materialization is not required on every write.

When a triple is **retracted**, the engine identifies which inferred triples have that triple as a dependency, retracts those inferences, and re-evaluates whether they can still be derived from remaining asserted triples.

This is safe because IndentiaDB tracks derivation proofs: each inferred triple records which asserted triples and rules produced it.

---

## Configuration

Enable inference in `config.toml`:

```toml
[query]
inference = true          # Enable globally for all queries
inference_level = "rdfs"  # "rdfs" | "owl_rl" | "owl_rl_full"
```

Inference can also be toggled per-query at the SPARQL request level:

```toml
[query]
inference          = false   # Off by default
allow_query_override = true  # Allow per-query override
```

Then pass the inference flag in the request header:

```bash
curl -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -H "X-IndentiaDB-Inference: true" \
  -d 'SELECT ?dog WHERE { ?dog a <http://example.org/dog> }'
```

### Inference Levels

| Level | Rules Applied | Overhead |
|-------|--------------|----------|
| `rdfs` | `rdfs:subClassOf`, `rdfs:subPropertyOf`, `rdfs:domain`, `rdfs:range`, `rdfs:member` | Low |
| `owl_rl` | All RDFS + `owl:sameAs`, `owl:equivalentClass`, `owl:equivalentProperty`, `owl:inverseOf`, `owl:symmetricProperty`, `owl:transitiveProperty` | Medium |
| `owl_rl_full` | All OWL-RL rules including cardinality restrictions | High |

!!! warning "owl_rl_full Write Amplification"
    `owl_rl_full` can produce very large numbers of inferred triples for ontologies with broad `owl:sameAs` or complex cardinality constraints. Benchmark with your ontology before enabling in production. Use `rdfs` or `owl_rl` for most knowledge graph applications.

---

## Example: Class Hierarchy Inference with `rdfs:subClassOf`

### Assert the Schema

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ex:   <http://example.org/>

INSERT DATA {
    ex:Poodle    rdfs:subClassOf ex:Dog .
    ex:Dog       rdfs:subClassOf ex:Animal .
    ex:Animal    rdfs:subClassOf ex:LivingThing .
    ex:GoldenRetriever rdfs:subClassOf ex:Dog .
}
```

### Assert an Individual

```sparql
PREFIX ex: <http://example.org/>

INSERT DATA {
    ex:rex  a ex:Poodle ;
            ex:name "Rex" .
    ex:buddy a ex:GoldenRetriever ;
             ex:name "Buddy" .
}
```

### Inferred Triples (Automatically Added)

| Triple | Rule |
|--------|------|
| `ex:rex a ex:Dog` | `ex:Poodle rdfs:subClassOf ex:Dog` |
| `ex:rex a ex:Animal` | Transitivity of subClassOf |
| `ex:rex a ex:LivingThing` | Transitivity of subClassOf |
| `ex:buddy a ex:Dog` | `ex:GoldenRetriever rdfs:subClassOf ex:Dog` |
| `ex:buddy a ex:Animal` | Transitivity |
| `ex:buddy a ex:LivingThing` | Transitivity |

### SPARQL Query with Inference Enabled

```sparql
PREFIX ex: <http://example.org/>

SELECT ?animal ?name WHERE {
    ?animal a ex:Animal ;
            ex:name ?name .
}
```

**Results (inference ON):**

| animal | name |
|--------|------|
| `ex:rex` | "Rex" |
| `ex:buddy` | "Buddy" |

**Results (inference OFF):**

*No results* — `ex:rex` and `ex:buddy` were only asserted as `ex:Poodle` and `ex:GoldenRetriever`, not `ex:Animal`.

---

## Example: Property Inheritance with `rdfs:subPropertyOf`

```sparql
PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf:  <http://xmlns.com/foaf/0.1/>
PREFIX ex:    <http://example.org/>

INSERT DATA {
    # Any ex:authoredBy relationship is also a foaf:maker relationship
    ex:authoredBy rdfs:subPropertyOf foaf:maker .

    ex:article42 ex:authoredBy ex:alice .
}
```

After this insert, `ex:article42 foaf:maker ex:alice` is automatically inferred and stored. Queries for `?x foaf:maker ex:alice` will return `ex:article42`.

---

## Example: OWL Property Axioms

### `owl:sameAs`

```sparql
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX ex:  <http://example.org/>
PREFIX dbr: <http://dbpedia.org/resource/>

INSERT DATA {
    ex:amsterdam owl:sameAs dbr:Amsterdam .
    ex:amsterdam ex:population 921402 .
}
```

With `owl_rl` inference, queries for `dbr:Amsterdam ex:population ?pop` will return `921402` — the `sameAs` link propagates all properties from `ex:amsterdam` to `dbr:Amsterdam`.

### `owl:equivalentClass`

```sparql
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX ex:   <http://example.org/>
PREFIX schema: <http://schema.org/>

INSERT DATA {
    ex:Person owl:equivalentClass schema:Person .
    ex:alice a ex:Person .
}
```

`ex:alice a schema:Person` is automatically inferred.

### `owl:inverseOf`

```sparql
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX ex:  <http://example.org/>

INSERT DATA {
    ex:parentOf owl:inverseOf ex:childOf .
    ex:alice ex:parentOf ex:bob .
}
```

`ex:bob ex:childOf ex:alice` is automatically inferred — no need to assert both directions.

### `owl:symmetricProperty`

```sparql
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX ex:  <http://example.org/>

INSERT DATA {
    ex:knows a owl:SymmetricProperty .
    ex:alice ex:knows ex:bob .
}
```

`ex:bob ex:knows ex:alice` is automatically inferred.

---

## SPARQL Query Comparison: Inference ON vs. OFF

The following shows how inference affects query results for a medical ontology:

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX med:  <http://example.org/medical/>

# Schema (already inserted)
# med:Ibuprofen rdfs:subClassOf med:NSAID
# med:NSAID     rdfs:subClassOf med:AntiInflammatory
# med:NSAID     rdfs:subClassOf med:Analgesic

# Data (already inserted)
# med:advil a med:Ibuprofen
# med:motrin a med:Ibuprofen

SELECT ?drug WHERE { ?drug a med:Analgesic }
```

| Inference | Result |
|-----------|--------|
| OFF | `(empty)` — no triple directly asserts `a med:Analgesic` |
| ON (rdfs) | `med:advil`, `med:motrin` — via subClassOf chain |

```sparql
SELECT ?drug WHERE { ?drug a med:AntiInflammatory }
```

| Inference | Result |
|-----------|--------|
| OFF | `(empty)` |
| ON (rdfs) | `med:advil`, `med:motrin` |

---

## Performance Impact and Trade-offs

| Factor | Impact |
|--------|--------|
| **Write latency** | Increased by 10–40% for ontology-heavy schemas. Trivial schemas (few subClassOf chains) have negligible overhead. |
| **Storage** | Inferred triples use the same storage as asserted triples. A deep class hierarchy can increase triple count by 3–10×. |
| **Query performance** | Same as querying asserted data — no runtime overhead. |
| **Schema changes** | Adding a new `rdfs:subClassOf` triple triggers incremental re-materialization across all affected individuals. For large ontology refactoring, use the `inference:rematerialize` admin command. |
| **Deletion** | Deleting an asserted triple that was the sole support for an inferred triple retracts that inferred triple. |

### Admin: Force Re-Materialization

If the inference state becomes inconsistent (e.g., after a crash during materialization):

```bash
indentiagraph admin inference rematerialize --profile prod
```

This is an offline operation — the server pauses writes during re-materialization. For large corpora (>100M triples), expect this to take several minutes.

!!! tip "Limiting Inference Scope"
    To avoid inference on raw data graphs and only infer within a specific named graph, set `inference_graphs` in config:

    ```toml
    [query]
    inference        = true
    inference_graphs = [
        "http://example.org/ontology",
        "http://example.org/schema"
    ]
    ```

    Triples in other named graphs are not used as premises for inference. This is useful when you have a large RDF dump (e.g., a DBpedia snapshot) where you want only your own schema's inference rules to apply.

---

## RETE Engine Architecture

IndentiaDB's inference engine is built on a **RETE-like algorithm** — a well-known pattern-matching approach from production rule systems, adapted for RDF triple processing.

### Alpha Network

The **alpha network** is the first filtering stage. Each alpha node matches incoming triples against a single triple pattern (e.g., `?x rdf:type ?c`). When a triple is inserted, it is passed through all alpha nodes in parallel. If the triple matches a node's pattern, the resulting variable bindings are stored in that node's memory.

```
Triple: (ex:rex, rdf:type, ex:Poodle)
    ↓
Alpha Node 1: pattern (?x rdf:type ?c)  → match: {?x=ex:rex, ?c=ex:Poodle}
Alpha Node 2: pattern (?c rdfs:subClassOf ?d)  → no match
Alpha Node 3: pattern (?x ?p ?y)  → match: {?x=ex:rex, ?p=rdf:type, ?y=ex:Poodle}
```

Alpha nodes act as filters — they discard triples that do not match their pattern. Because alpha nodes are independent, they can be evaluated concurrently across worker threads.

### Beta Network

The **beta network** implements multi-pattern joins. A beta node takes two inputs — either two alpha nodes, or an alpha node and a preceding beta node — and joins their stored matches on shared variables.

For example, the RDFS subClassOf inference rule has two antecedent patterns:

```
Pattern 1: ?instance rdf:type ?class       (Alpha Node A)
Pattern 2: ?class rdfs:subClassOf ?super    (Alpha Node B)
```

The beta node joining A and B will look for compatible bindings where `?class` has the same value in both. When a match is found, the merged bindings `{?instance, ?class, ?super}` are passed to the rule's consequent to derive: `?instance rdf:type ?super`.

### Token Flow and Conflict Resolution

When a new triple arrives:

1. It flows through the alpha network, activating matching alpha nodes.
2. Each activated alpha node propagates its new bindings to connected beta nodes.
3. Beta nodes join the new bindings against stored matches from their other input.
4. Successful joins propagate upward until they reach a terminal node, producing a **rule firing**.
5. Rule firings are collected, deduplicated, and ordered by **rule priority** (higher priority fires first).
6. The consequent triples are generated from the bindings and fed back into the network for further inference.

This process continues until no new triples are derived (the **fixed point**).

### Shared Pattern Prefixes

When multiple rules share the same antecedent pattern (e.g., several rules match on `?x rdf:type ?c`), they share the same alpha node. This avoids redundant matching work and is one of the key efficiency advantages of the RETE approach over naive rule evaluation.

---

## Incremental Materialization

Rather than recomputing all inferences from scratch on every write, IndentiaDB uses **delta rules** — only the rules affected by the changed triple are re-evaluated.

### Delta Rules

When a triple is inserted, the RETE network identifies which alpha nodes match the new triple and propagates only the new bindings through the network. Existing matches stored in alpha and beta node memories are reused — the engine does not re-scan the entire triple store.

When a triple is retracted, the engine:

1. Removes the triple's bindings from the alpha node that stored it.
2. Identifies all downstream beta node matches that depended on those bindings.
3. Retracts the inferred triples produced by those matches.
4. Checks whether the retracted inferred triples can still be derived via alternative rule paths (multi-support check).

This incremental approach meets the design requirement **INF-NF-5**: incremental update cost is strictly less than full re-materialization.

### Batch Processing

For bulk inserts, the materializer processes triples in configurable batches (default: 1000 triples per batch). Within each batch, all rule firings are collected and deduplicated before derived triples are generated. This avoids redundant intermediate inferences when loading large datasets.

```toml
[query]
inference = true

[query.materialization]
mode       = "forward"
max_depth  = 10       # Maximum transitive closure depth
batch_size = 5000     # Triples per inference batch
```

---

## Custom Inference Rules

Beyond the built-in RDFS and OWL profiles, IndentiaDB supports **user-defined inference rules** using the `Custom` profile.

### Defining Rules via Configuration

Custom rules follow an antecedent-consequent pattern. Each rule specifies triple patterns for the IF (antecedent) and THEN (consequent) parts, with variables prefixed by `?`:

```toml
[query]
inference = true
inference_level = "custom"

[[query.custom_rules]]
id       = "domain-expertise"
name     = "Expert in domain implies knowledge of sub-domain"
priority = 10

[[query.custom_rules.antecedent]]
subject   = "?person"
predicate = "http://example.org/expertIn"
object    = "?domain"

[[query.custom_rules.antecedent]]
subject   = "?subdomain"
predicate = "http://example.org/subDomainOf"
object    = "?domain"

[[query.custom_rules.consequent]]
subject   = "?person"
predicate = "http://example.org/knowledgeableIn"
object    = "?subdomain"
```

### Defining Rules via SPARQL INSERT

Custom rules can also be loaded as RDF triples using an IndentiaDB-specific vocabulary:

```sparql
PREFIX rule: <http://indentia.ai/vocab/rule#>
PREFIX ex:   <http://example.org/>

INSERT DATA {
    rule:expert-knowledge a rule:InferenceRule ;
        rule:id       "expert-knowledge" ;
        rule:name     "Expert knowledge propagation" ;
        rule:priority 10 ;

        rule:antecedent [
            rule:subject   "?person" ;
            rule:predicate ex:expertIn ;
            rule:object    "?domain"
        ] ;
        rule:antecedent [
            rule:subject   "?sub" ;
            rule:predicate ex:subDomainOf ;
            rule:object    "?domain"
        ] ;
        rule:consequent [
            rule:subject   "?person" ;
            rule:predicate ex:knowledgeableIn ;
            rule:object    "?sub"
        ] .
}
```

### Optional Filters

Rules can include filter conditions using SPARQL FILTER syntax to restrict when the rule fires:

```toml
[[query.custom_rules]]
id     = "active-employee-access"
name   = "Active employees have system access"
filter = "?status = 'active'"

[[query.custom_rules.antecedent]]
subject   = "?person"
predicate = "http://example.org/employmentStatus"
object    = "?status"

[[query.custom_rules.consequent]]
subject   = "?person"
predicate = "http://example.org/hasAccess"
object    = "http://example.org/InternalSystem"
```

---

## Monitoring Inference

IndentiaDB exposes inference statistics through both the admin CLI and the metrics endpoint.

### Inference Statistics

```bash
indentiagraph admin inference stats --profile prod
```

**Output:**

```json
{
  "total_inferred": 284731,
  "by_rule": {
    "rdfs9":  142365,
    "rdfs11": 89012,
    "rdfs7":  31204,
    "rdfs5":  22150
  },
  "max_depth_reached": 7,
  "depth_limit_warnings": 0,
  "duplicates_avoided": 18429,
  "last_materialization": "2026-03-22T14:30:00Z",
  "materialization_duration_ms": 1245
}
```

### Key Metrics

| Metric | Description |
|--------|-------------|
| `total_inferred` | Total number of materialized inferred triples in the store |
| `by_rule` | Breakdown of how many triples each rule produced |
| `max_depth_reached` | Deepest transitive chain encountered |
| `depth_limit_warnings` | Times the `max_depth` limit was hit (potential incompleteness) |
| `duplicates_avoided` | Inferences that were already present (deduplication savings) |
| `materialization_duration_ms` | Time of the last (re-)materialization operation |

### Prometheus Metrics

When the metrics endpoint is enabled, inference metrics are exported in Prometheus format:

```
indentiadb_inference_total_inferred 284731
indentiadb_inference_rule_firings{rule="rdfs9"} 142365
indentiadb_inference_rule_firings{rule="rdfs11"} 89012
indentiadb_inference_max_depth 7
indentiadb_inference_materialization_duration_seconds 1.245
```

---

## Inference with Named Graphs

By default, inference applies across all named graphs. To scope inference to specific graphs, configure `inference_graphs` and use `GRAPH` patterns in queries.

### Practical Example: Multi-Tenant Knowledge Graph

Consider a multi-tenant setup where each tenant has their own named graph, but all tenants share a common ontology graph:

```toml
[query]
inference        = true
inference_level  = "rdfs"
inference_graphs = [
    "http://example.org/ontology"
]
```

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ex:   <http://example.org/>

# Schema in the ontology graph
INSERT DATA {
    GRAPH <http://example.org/ontology> {
        ex:Manager    rdfs:subClassOf ex:Employee .
        ex:Employee   rdfs:subClassOf ex:Person .
        ex:worksAt    rdfs:domain ex:Employee .
        ex:worksAt    rdfs:range  ex:Organization .
    }
}
```

```sparql
# Tenant data in a separate graph
INSERT DATA {
    GRAPH <http://example.org/tenant/acme> {
        ex:alice a ex:Manager ;
                 ex:worksAt ex:acme_corp .
    }
}
```

With `inference_graphs` restricting inference to the ontology graph, the ontology triples serve as premises, but inferred triples are only produced for data that references those ontology classes. You can then query across graphs:

```sparql
PREFIX ex: <http://example.org/>

SELECT ?person ?name WHERE {
    GRAPH <http://example.org/tenant/acme> {
        ?person a ex:Person .
    }
}
```

This returns `ex:alice` — inferred via `ex:Manager rdfs:subClassOf ex:Employee rdfs:subClassOf ex:Person` — even though `ex:alice` was only asserted as `ex:Manager`.
