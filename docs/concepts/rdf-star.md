# RDF-star Guide

RDF-star (part of the RDF 1.2 specification) is the single most impactful improvement to the RDF standard in over a decade. This guide explains what it is, why it matters, and how to use it effectively in IndentiaDB.

---

## The Problem: Annotating Facts in RDF 1.1

A knowledge graph stores facts as triples: subject → predicate → object. But real-world knowledge is rarely clean and absolute. You need to record:

- **Where** a fact came from (data source, ingestion job, agent)
- **How confident** you are in it (ML score, expert review, heuristic)
- **When** it was valid (temporal provenance, bitemporal modelling)
- **Who** is allowed to see it (access control)

In RDF 1.1, the only way to annotate a triple was **reification** — creating a `rdf:Statement` blank node that *represents* the triple, then attaching properties to the blank node:

```turtle
# Goal: "Alice knows Bob" — confidence 0.9, from LinkedIn
# RDF 1.1 reification — 6 triples for 1 annotated fact:

_:stmt1 a               rdf:Statement ;
        rdf:subject     ex:alice ;
        rdf:predicate   foaf:knows ;
        rdf:object      ex:bob .
_:stmt1 ex:confidence   "0.9"^^xsd:decimal .
_:stmt1 ex:source       <http://linkedin.com/import> .
```

This is painful in three ways:

| Problem | Impact |
|---------|--------|
| **Verbosity** | 6 triples instead of 1 — storage and ingestion cost multiplies |
| **Blank node fragility** | Blank nodes have no stable identity; you cannot reference `_:stmt1` from another named graph or across SPARQL federation |
| **Query complexity** | Finding all high-confidence facts requires a three-way join through the blank node |

A knowledge graph with 10 million annotated facts requires **60 million triples** under reification. Queries that filter on confidence scores must traverse an extra hop for every result.

---

## The Solution: RDF-star Quoted Triples

RDF 1.2 introduces **quoted triples**: the triple `<< s p o >>` is itself a first-class RDF term that can appear as the subject or object of another triple.

```sparql
# RDF 1.2 — same annotation in 1 statement:
INSERT DATA {
    << ex:alice foaf:knows ex:bob >>
        ex:confidence "0.9"^^xsd:decimal ;
        ex:source     <http://linkedin.com/import> .
}
```

No blank node. No indirection. The quoted triple `<< ex:alice foaf:knows ex:bob >>` *is* the subject — you annotate it directly. The base triple and its metadata are stored together.

!!! success "Impact at scale"
    10 million annotated facts → **10 million quoted triples** instead of 60 million reified triples. Queries that filter on annotation properties are direct — no intermediate joins through blank nodes.

---

## Syntax Reference

### Inline annotation (the common case)

```sparql
PREFIX ex:   <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    << ex:alice foaf:knows ex:bob >>
        ex:since      "2020-01-15"^^xsd:date ;
        ex:confidence "0.95"^^xsd:decimal ;
        ex:source     <http://crm.example.org/import-001> .
}
```

### Shorthand with `~` operator (SPARQL 1.2)

The `~` operator is syntactic sugar for inline annotation of the immediately preceding triple:

```sparql
INSERT DATA {
    ex:alice foaf:knows ex:bob
        ~ ex:confidence "0.95"^^xsd:decimal
        ~ ex:source     <http://crm.example.org/import-001> .
}
```

This is exactly equivalent to the `<< >>` form — choose whichever reads more clearly for your use case.

### Quoted triple as subject

```sparql
INSERT DATA {
    << ex:alice foaf:knows ex:bob >>
        ex:confidence "0.95"^^xsd:decimal .
}
```

### Quoted triple as object

```sparql
# ex:claim1 asserts a specific triple
INSERT DATA {
    ex:claim1 ex:asserts << ex:alice foaf:knows ex:bob >> .
}
```

### Nested quoted triples

A quoted triple can itself contain a quoted triple:

```sparql
# "Source X claims that Source Y claims that Alice knows Bob"
INSERT DATA {
    << ex:sourceX ex:claims << ex:alice foaf:knows ex:bob >> >>
        ex:recordedAt "2026-01-15T09:00:00Z"^^xsd:dateTime .
}
```

---

## Querying Quoted Triples

### Match and retrieve annotation properties

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

SELECT ?person1 ?person2 ?confidence ?source
WHERE {
    << ?person1 foaf:knows ?person2 >>
        ex:confidence ?confidence ;
        ex:source     ?source .
}
ORDER BY DESC(?confidence)
```

### Filter by confidence threshold

```sparql
SELECT ?person1 ?person2 ?confidence
WHERE {
    << ?person1 foaf:knows ?person2 >>
        ex:confidence ?confidence .
    FILTER (?confidence >= 0.8)
}
```

### Find all facts from a specific source

```sparql
SELECT ?s ?p ?o
WHERE {
    << ?s ?p ?o >> ex:source <http://crm.example.org/import-001> .
}
```

### Retrieve annotation or fall back gracefully

Use `OPTIONAL` when not every triple has an annotation:

```sparql
SELECT ?person1 ?person2 ?confidence
WHERE {
    ?person1 foaf:knows ?person2 .
    OPTIONAL {
        << ?person1 foaf:knows ?person2 >> ex:confidence ?confidence .
    }
}
```

---

## The TRIPLE() Function Family

SPARQL 1.2 adds functions for constructing and decomposing triple terms programmatically.

### Construct a triple term

```sparql
SELECT (TRIPLE(ex:alice, foaf:knows, ex:bob) AS ?t) WHERE {}
```

### Decompose a triple term

```sparql
SELECT ?s ?p ?o
WHERE {
    << ex:alice foaf:knows ex:bob >> ex:confidence ?conf .
    BIND(SUBJECT(  << ex:alice foaf:knows ex:bob >> ) AS ?s)
    BIND(PREDICATE(<< ex:alice foaf:knows ex:bob >> ) AS ?p)
    BIND(OBJECT(   << ex:alice foaf:knows ex:bob >> ) AS ?o)
}
```

### Type-test with isTRIPLE()

```sparql
SELECT ?value
WHERE {
    ex:claim1 ex:asserts ?value .
    FILTER (isTRIPLE(?value))
}
```

---

## Use Cases

### 1. Provenance and lineage

Track where every fact came from and how it got into the graph:

```sparql
INSERT DATA {
    GRAPH <http://example.org/hr> {
        ex:alice ex:worksAt ex:Acme .
    }

    << ex:alice ex:worksAt ex:Acme >>
        prov:wasGeneratedBy  ex:hr_import_2026_q1 ;
        prov:generatedAtTime "2026-01-15T10:00:00Z"^^xsd:dateTime ;
        ex:confidence        "0.99"^^xsd:decimal ;
        ex:source            "hr-system-v2" .
}
```

### 2. ML confidence scores

Attach model confidence directly to inferred relationships:

```sparql
INSERT DATA {
    << ex:product_a ex:similarTo ex:product_b >>
        ex:mlScore     "0.87"^^xsd:decimal ;
        ex:modelId     "rec-model-v3" ;
        ex:computedAt  "2026-03-01T00:00:00Z"^^xsd:dateTime .
}
```

Query: "find all product similarities above 0.85 computed by the latest model":

```sparql
SELECT ?a ?b ?score
WHERE {
    << ?a ex:similarTo ?b >>
        ex:mlScore  ?score ;
        ex:modelId  "rec-model-v3" .
    FILTER (?score > 0.85)
}
ORDER BY DESC(?score)
```

### 3. Access control (triple-level ACL)

IndentiaDB uses RDF-star for per-triple access control — the only database that does this at the storage layer:

```sparql
INSERT DATA {
    << ex:patient_record_42 ex:diagnosis ex:condition_cancer >>
        acl:allowedSid "S-1-5-21-domain-1050" ;  # medical-staff group
        acl:allowedSid "S-1-5-21-domain-2001" .  # oncology group
}
```

Triples without `acl:allowedSid` annotations are visible to all principals with graph access. See the [ACL documentation](../security/acl.md) for the full model.

### 4. Temporal validity

Combine quoted triples with validity periods for bitemporal modelling:

```sparql
INSERT DATA {
    << ex:alice ex:ceo_of ex:Acme >>
        ex:validFrom  "2023-06-01"^^xsd:date ;
        ex:validUntil "2025-12-31"^^xsd:date .
}
```

Query current CEOs:

```sparql
SELECT ?person ?company
WHERE {
    << ?person ex:ceo_of ?company >>
        ex:validFrom  ?from ;
        ex:validUntil ?until .
    FILTER (
        ?from  <= "2026-03-28"^^xsd:date &&
        ?until >= "2026-03-28"^^xsd:date
    )
}
```

---

## Comparison: Reification vs RDF-star

| Aspect | RDF 1.1 Reification | RDF 1.2 (RDF-star) |
|--------|--------------------|--------------------|
| Triples per annotated fact | 4–6 per annotation | 1 base triple + annotation triples |
| Subject identity | Blank node (fragile, local) | The triple itself (stable, global) |
| Cross-graph reference | Not possible with blank nodes | Works naturally |
| Query complexity | 3-way join through blank node | Direct pattern match |
| SPARQL syntax | Complex `?stmt rdf:subject ?s ...` | `<< ?s ?p ?o >> ?prop ?val` |
| Storage overhead (10M facts, 3 annotations each) | ~60M triples | ~10M base + 30M annotation triples |
| Interoperability | Wide (RDF 1.1 is universal) | Growing — RDF 1.2 is W3C Working Draft |

---

## Other RDF 1.2 Additions

RDF-star is the headline feature of RDF 1.2, but the specification adds two other important changes that IndentiaDB also supports.

### rdf:JSON literals

`rdf:JSON` is a new built-in datatype for embedding JSON values as RDF literals:

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX ex:  <http://example.org/>

INSERT DATA {
    ex:sensor42 ex:config
        "{\"threshold\": 25, \"unit\": \"celsius\"}"^^rdf:JSON .
}
```

In IndentiaDB, fields backed by `rdf:JSON` literals are automatically indexed as Elasticsearch `keyword` fields (exact match) rather than `text` (full-text). This preserves the raw JSON for filtering and aggregation without tokenization.

### Language tags with base direction (`rdf:dirLangString`)

RDF 1.2 introduces a new datatype for language-tagged strings that also carry a text rendering direction (`ltr` or `rtl`). The SPARQL syntax uses a double-dash suffix:

```sparql
INSERT DATA {
    ex:title1 rdfs:label "Hello World"@en--ltr .
    ex:title2 rdfs:label "مرحبا بالعالم"@ar--rtl .
}
```

The `LANGDIR()` SPARQL function returns the direction string (`"ltr"` or `"rtl"`):

```sparql
SELECT ?label (LANG(?label) AS ?lang) (LANGDIR(?label) AS ?dir) WHERE {
    ?doc rdfs:label ?label .
}
```

### Content-Type version signalling

When IndentiaDB returns RDF from the Graph Store Protocol (`GET /data`), the response includes `version=1.2` in the `Content-Type` header — for example:

```
Content-Type: application/n-triples; version=1.2
Content-Type: text/turtle; version=1.2
```

RDF 1.2-aware clients can use this to enable quoted-triple parsing. RDF 1.1 clients that ignore unknown parameters continue to work unchanged.

---

## When to Use Quoted Triples

**Use RDF-star when you need to annotate facts** — provenance, confidence, access control, temporal validity, audit trails.

**Use standard triples when** the fact itself is the complete statement and you have no per-fact metadata to attach.

**Don't reify** unless you are integrating with a legacy system that only understands RDF 1.1. Even then, consider storing in RDF-star format and exporting as reification for compatibility.

---

## Further Reading

- [SPARQL 1.2 Reference](../query-languages/sparql.md) — Full query language with RDF-star examples
- [Lineage & Provenance](../features/lineage.md) — Production provenance pipeline built on RDF-star
- [ACL Filtering](../security/acl.md) — Per-triple access control using RDF-star
- [W3C RDF 1.2 Working Draft](https://www.w3.org/TR/rdf12-concepts/) — Specification
