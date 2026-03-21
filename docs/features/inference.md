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
