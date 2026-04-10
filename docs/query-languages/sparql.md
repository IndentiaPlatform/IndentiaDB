# SPARQL 1.2 Reference

IndentiaDB implements the SPARQL 1.1 specification plus the SPARQL 1.2 Working Draft (through the 9 April 2026 update), aligned with the RDF 1.2 Candidate Recommendation (7 April 2026). This reference covers every supported feature with complete working examples.

---

## Endpoints

| Operation | Method | Endpoint | Content-Type |
|-----------|--------|----------|--------------|
| SELECT / ASK / CONSTRUCT / DESCRIBE (GET) | GET | `/sparql?query=<encoded>` | — |
| SELECT / ASK / CONSTRUCT / DESCRIBE (POST) | POST | `/sparql` | `application/sparql-query` |
| INSERT DATA / DELETE DATA / DELETE…INSERT…WHERE | POST | `/update` | `application/sparql-update` |
| Graph Store: PUT graph | PUT | `/rdf-graphs/service?graph=<iri>` | `text/turtle` |
| Graph Store: GET graph | GET | `/rdf-graphs/service?graph=<iri>` | — |
| Graph Store: DELETE graph | DELETE | `/rdf-graphs/service?graph=<iri>` | — |

---

## Response Formats

| Accept Header | Format | Applicable To |
|---------------|--------|---------------|
| `application/sparql-results+json` | SPARQL JSON | SELECT, ASK |
| `application/sparql-results+xml` | SPARQL XML | SELECT, ASK |
| `text/csv` | CSV | SELECT |
| `text/tab-separated-values` | TSV | SELECT |
| `text/turtle` | Turtle | CONSTRUCT, DESCRIBE |
| `application/n-triples` | N-Triples | CONSTRUCT, DESCRIBE |
| `application/n-triples;profile="http://www.w3.org/ns/rdf-canon#c14n"` | N-Triples Canonical (RDF 1.2 C14N) | CONSTRUCT, DESCRIBE |
| `application/ld+json` | JSON-LD | CONSTRUCT, DESCRIBE |

Canonical N-Triples output (`ntriples-c14n`) applies the escaping and
language-tag normalization rules from the RDF 1.2 Candidate Recommendation
(Section 3 and the related RDF Dataset Canonicalization spec). Select it via
the `profile` parameter on the `Accept` header, or by passing
`?format=ntriples-c14n` as a query parameter.
| `application/rdf+xml` | RDF/XML | CONSTRUCT, DESCRIBE |
| `application/n-quads` | N-Quads | CONSTRUCT with named graphs |
| `text/n3` | N3 (Notation3) | CONSTRUCT, DESCRIBE |

The default format is `application/sparql-results+json` for SELECT and ASK, and `text/turtle` for CONSTRUCT and DESCRIBE.

---

## Namespace Prefixes

All examples use these common prefixes:

```sparql
PREFIX rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:   <http://www.w3.org/2002/07/owl#>
PREFIX xsd:   <http://www.w3.org/2001/XMLSchema#>
PREFIX foaf:  <http://xmlns.com/foaf/0.1/>
PREFIX ex:    <http://example.org/>
PREFIX skos:  <http://www.w3.org/2004/02/skos/core#>
PREFIX dbo:   <http://dbpedia.org/ontology/>
PREFIX geo:   <http://www.opengis.net/ont/geosparql#>
```

---

## Example 1: Basic SELECT

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?person ?name WHERE {
    ?person a foaf:Person ;
            foaf:name ?name .
}
ORDER BY ?name
LIMIT 100
```

```bash
curl -X POST 'http://localhost:7001/sparql' \
  -H 'Content-Type: application/sparql-query' \
  -H 'Accept: application/sparql-results+json' \
  -d 'PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?person ?name WHERE {
    ?person a foaf:Person ; foaf:name ?name .
}
ORDER BY ?name LIMIT 100'
```

---

## Example 2: SELECT with FILTER and OPTIONAL

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

SELECT ?name ?age ?email WHERE {
    ?person a foaf:Person ;
            foaf:name ?name ;
            foaf:age  ?age .
    OPTIONAL { ?person foaf:mbox ?email }
    FILTER (?age >= 25)
    FILTER (!BOUND(?email) || CONTAINS(STR(?email), "@example.org"))
}
ORDER BY DESC(?age)
LIMIT 50
```

The `OPTIONAL` clause includes `?email` as `null` if the triple does not exist. `FILTER (!BOUND(?email) || ...)` accepts rows where email is absent or matches a condition.

---

## Example 3: INSERT DATA with Named Graph

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    GRAPH <http://example.org/social> {
        ex:alice a foaf:Person ;
            foaf:name "Alice van den Berg" ;
            foaf:age 30 ;
            foaf:mbox <mailto:alice@example.org> ;
            foaf:knows ex:bob , ex:carol .

        ex:bob a foaf:Person ;
            foaf:name "Bob de Vries" ;
            foaf:age 28 .

        ex:carol a foaf:Person ;
            foaf:name "Carol Jansen" ;
            foaf:age 35 .
    }
    GRAPH <http://example.org/hr> {
        ex:alice ex:worksAt ex:acme ;
                 ex:salary  "85000"^^xsd:integer .
        ex:bob   ex:worksAt ex:acme ;
                 ex:salary  "92000"^^xsd:integer .
    }
}
```

---

## Example 4: DELETE/INSERT UPDATE WHERE

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

DELETE {
    GRAPH <http://example.org/hr> {
        ex:alice ex:salary ?old_salary .
    }
}
INSERT {
    GRAPH <http://example.org/hr> {
        ex:alice ex:salary "90000"^^<http://www.w3.org/2001/XMLSchema#integer> .
        ex:alice ex:salary_updated_at "2026-03-21"^^<http://www.w3.org/2001/XMLSchema#date> .
    }
}
WHERE {
    GRAPH <http://example.org/hr> {
        ex:alice ex:salary ?old_salary .
    }
}
```

The `DELETE/INSERT … WHERE` form is atomic. The WHERE clause binds variables that are used in both the DELETE and INSERT templates.

---

## Example 5: CONSTRUCT

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

CONSTRUCT {
    ?person foaf:name ?name ;
            foaf:age  ?age ;
            ex:ageGroup ?group .
}
WHERE {
    GRAPH <http://example.org/social> {
        ?person a foaf:Person ;
                foaf:name ?name ;
                foaf:age  ?age .
    }
    BIND(
        IF(?age < 30, "young",
        IF(?age < 50, "middle",
        "senior")) AS ?group
    )
}
```

CONSTRUCT returns an RDF graph (triples) rather than a result set. Use `Accept: text/turtle` to receive Turtle syntax.

---

## Example 6: ASK

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

ASK {
    GRAPH <http://example.org/social> {
        ex:alice foaf:knows ex:bob .
    }
}
```

Returns `{"boolean": true}` or `{"boolean": false}` in JSON format.

---

## Example 7: DESCRIBE

```sparql
PREFIX ex: <http://example.org/>

DESCRIBE ex:alice
```

Returns all known triples about `ex:alice` across all named graphs. The exact triples returned depend on the DESCRIBE algorithm (CBD — Concise Bounded Description — by default).

---

## Example 8: Property Paths (All Operators)

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

# Sequence: p1 / p2 — follows two consecutive predicates
SELECT ?org WHERE {
    ex:alice foaf:knows / ex:worksAt ?org .
}

# Alternative: p1 | p2 — matches either predicate
SELECT ?connection WHERE {
    ex:alice (foaf:knows | foaf:member) ?connection .
}

# Zero or more (transitive): p* — any number of hops including zero
SELECT ?ancestor WHERE {
    ex:GradStudent rdfs:subClassOf* ?ancestor .
}

# One or more (transitive): p+ — requires at least one hop
SELECT ?reachable WHERE {
    ex:alice foaf:knows+ ?reachable .
    FILTER (?reachable != ex:alice)
}

# Zero or one: p? — optional single hop
SELECT ?contact WHERE {
    ex:alice foaf:knows? ?contact .
}

# Inverse: ^p — traverse in reverse direction
SELECT ?follower WHERE {
    ex:alice ^foaf:knows ?follower .
    # equivalent to: ?follower foaf:knows ex:alice
}

# Negated property set: !(p1 | p2) — any predicate except listed
SELECT ?s ?p ?o WHERE {
    ?s ?p ?o .
    FILTER (?p != rdf:type)
    # DSL equivalent:
    # ?s !(rdf:type) ?o .
}

# Compound: (p1 / p2)+ — sequence, one or more times
SELECT ?deep WHERE {
    ex:alice (foaf:knows / foaf:knows)+ ?deep .
}
```

> **BFS Cycle Detection:** IndentiaDB evaluates transitive property paths using BFS with cycle detection (SPARQL 1.2 Issues #266 and #267). Cyclic graphs terminate correctly without infinite loops.

---

## Example 9: Named Graphs (FROM, FROM NAMED, GRAPH)

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

# Query a specific named graph
SELECT ?name WHERE {
    GRAPH <http://example.org/social> {
        ?p a foaf:Person ; foaf:name ?name .
    }
}

# Query multiple named graphs using FROM NAMED + GRAPH variable
SELECT ?graph ?name WHERE {
    GRAPH ?graph {
        ?p a foaf:Person ; foaf:name ?name .
    }
}

# Restrict default dataset with FROM
SELECT ?name
FROM <http://example.org/social>
WHERE {
    ?p a foaf:Person ; foaf:name ?name .
}

# Combine default graph and named graphs
SELECT ?name ?employer
FROM          <http://example.org/social>
FROM NAMED    <http://example.org/hr>
WHERE {
    ?p foaf:name ?name .
    GRAPH <http://example.org/hr> {
        ?p <http://example.org/worksAt> ?employer .
    }
}
```

---

## Example 10: RDF-star — Quoted Triples (Insert + Query)

### Why RDF-star matters: reification vs quoted triples

In RDF 1.1, adding metadata to a triple — a confidence score, a source, a timestamp — required **reification**: creating a blank node that indirectly represents the triple, then attaching properties to that blank node. To express "Alice knows Bob with 90% confidence, according to source X", you needed 6 extra triples:

```sparql
# RDF 1.1 — 6 triples to annotate one fact
INSERT DATA {
    _:stmt1 a               rdf:Statement ;
            rdf:subject     ex:alice ;
            rdf:predicate   foaf:knows ;
            rdf:object      ex:bob .
    _:stmt1 ex:confidence   "0.9"^^xsd:decimal .
    _:stmt1 ex:source       ex:SourceX .
}
```

This is verbose, fragile (blank nodes cannot be referenced across graphs), and query-hostile: finding all high-confidence facts requires joining through the reification structure.

**RDF 1.2 (RDF-star) solves this with one line:**

```sparql
# RDF 1.2 — 1 quoted triple with inline annotation
INSERT DATA {
    << ex:alice foaf:knows ex:bob >>
        ex:confidence "0.9"^^xsd:decimal ;
        ex:source     ex:SourceX .
}
```

`<< ex:alice foaf:knows ex:bob >>` is a **quoted triple** — the triple itself becomes a first-class value that you can attach properties to directly. No blank nodes, no joins, no fragility.

!!! tip "The practical impact"
    A knowledge graph with 10 million annotated facts needs **60 million triples** under RDF 1.1 reification. Under RDF-star, it needs **10 million** — the base facts — plus the annotation triples directly attached. Queries are simpler, storage is smaller, and the intent is immediately readable.

See the [RDF-star Guide](../concepts/rdf-star.md) for a deeper treatment of use cases, patterns, and the comparison with other approaches.

```sparql
PREFIX foaf:  <http://xmlns.com/foaf/0.1/>
PREFIX ex:    <http://example.org/>
PREFIX xsd:   <http://www.w3.org/2001/XMLSchema#>

# Insert quoted triples with provenance metadata
INSERT DATA {
    << ex:alice foaf:knows ex:bob >>
        ex:since      "2020-01-15"^^xsd:date ;
        ex:confidence "0.95"^^xsd:decimal ;
        ex:source     <http://example.org/linkedin_import> .

    << ex:bob foaf:knows ex:carol >>
        ex:since      "2022-06-01"^^xsd:date ;
        ex:confidence "0.80"^^xsd:decimal ;
        ex:source     <http://example.org/manual_entry> .
}
```

```sparql
# Query: find all knows relationships with metadata
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

SELECT ?subject ?object ?since ?confidence ?source WHERE {
    << ?subject foaf:knows ?object >>
        ex:since      ?since ;
        ex:confidence ?confidence ;
        ex:source     ?source .
}
ORDER BY DESC(?confidence)
```

---

## Example 11: Provenance Query with RDF-star

```sparql
PREFIX foaf:  <http://xmlns.com/foaf/0.1/>
PREFIX ex:    <http://example.org/>
PREFIX xsd:   <http://www.w3.org/2001/XMLSchema#>

SELECT ?subject ?predicate ?object ?source ?confidence
WHERE {
    << ?subject ?predicate ?object >>
        ex:source     ?source ;
        ex:confidence ?confidence .
    FILTER (?confidence > 0.8)
}
ORDER BY DESC(?confidence)
```

This pattern is the foundation of triple-level provenance tracking. Every fact in the knowledge graph can carry its own evidence score, data source, ingestion timestamp, and authoring agent — without creating auxiliary reification nodes.

---

## Example 12: SPARQL 1.2 TRIPLE() Function Family

SPARQL 1.2 introduces the `TRIPLE()`, `SUBJECT()`, `PREDICATE()`, `OBJECT()`, and `isTRIPLE()` functions for constructing and decomposing triple terms programmatically.

```sparql
PREFIX ex: <http://example.org/>

# TRIPLE(s, p, o) constructs a triple term from components
SELECT ?t WHERE {
    BIND(TRIPLE(ex:alice, <http://xmlns.com/foaf/0.1/knows>, ex:bob) AS ?t)
}

# SUBJECT(), PREDICATE(), OBJECT() decompose a quoted triple
SELECT ?s ?p ?o WHERE {
    ?annotation rdf:subject   ?quoted_triple .
    BIND(SUBJECT(?quoted_triple)   AS ?s)
    BIND(PREDICATE(?quoted_triple) AS ?p)
    BIND(OBJECT(?quoted_triple)    AS ?o)
}

# isTRIPLE() tests whether a value is a triple term
SELECT ?val WHERE {
    ?s ex:hasAnnotation ?val .
    FILTER (isTRIPLE(?val))
}

# Combined: construct quoted triple term and use in INSERT
INSERT {
    TRIPLE(?s, ?p, ?o) ex:assertedBy ex:system1 .
}
WHERE {
    GRAPH ex:staging {
        ?s ?p ?o .
    }
}
```

---

## Example 13: Federated SERVICE Query

```sparql
PREFIX foaf:    <http://xmlns.com/foaf/0.1/>
PREFIX dbo:     <http://dbpedia.org/ontology/>
PREFIX ex:      <http://example.org/>
PREFIX company: <http://example.org/company/>

SELECT ?employee ?name ?birthPlace WHERE {
    # Local graph: find employees
    GRAPH <http://example.org/hr> {
        ?employee a company:Employee .
    }

    # Federated: enrich from DBpedia
    SERVICE <https://dbpedia.org/sparql> {
        ?employee foaf:name      ?name ;
                  dbo:birthPlace ?birthPlace .
    }
}
ORDER BY ?name
```

The `SERVICE` clause sends a sub-query to a remote SPARQL endpoint and joins the results with the local dataset. Variable bindings from the local pattern are available as values in the federated sub-query.

---

## Example 14: SERVICE SILENT (Fault Tolerance)

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?name ?label WHERE {
    ?person a foaf:Person ; foaf:name ?name .

    # SERVICE SILENT: if the remote endpoint is unavailable, skip rather than fail
    SERVICE SILENT <https://external-kb.example.com/sparql> {
        ?person rdfs:label ?label .
    }
}
```

With `SERVICE SILENT`, if the remote endpoint returns an error or is unreachable, the query continues with the local results — the `?label` variable simply has no binding for those rows.

---

## Example 15: Aggregate Functions

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

SELECT
    (COUNT(?person)            AS ?count)
    (COUNT(DISTINCT ?person)   AS ?unique_people)
    (SUM(?salary)              AS ?total_payroll)
    (AVG(?salary)              AS ?average_salary)
    (MIN(?salary)              AS ?min_salary)
    (MAX(?salary)              AS ?max_salary)
    (SAMPLE(?name)             AS ?example_name)
WHERE {
    GRAPH <http://example.org/hr> {
        ?person a foaf:Person ;
                foaf:name ?name ;
                ex:salary ?salary .
    }
}
```

> **SPARQL 1.2 Change:** `GROUP_CONCAT` now returns `xsd:string` (per Feb 3, 2026 Editor's Draft), consistent with other aggregate functions that return typed literals.

---

## Example 16: GROUP BY / HAVING

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

SELECT ?department (COUNT(?person) AS ?headcount) (AVG(?salary) AS ?avg_salary)
WHERE {
    GRAPH <http://example.org/hr> {
        ?person a foaf:Person ;
                ex:department ?department ;
                ex:salary     ?salary .
    }
}
GROUP BY ?department
HAVING (COUNT(?person) >= 2 && AVG(?salary) > 70000)
ORDER BY DESC(?avg_salary)
```

---

## Example 17: GROUP_CONCAT

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

SELECT ?department (GROUP_CONCAT(?name; separator=", ") AS ?members)
WHERE {
    GRAPH <http://example.org/hr> {
        ?person a foaf:Person ;
                foaf:name   ?name ;
                ex:department ?department .
    }
}
GROUP BY ?department
ORDER BY ?department
```

Returns one row per department with all member names concatenated. Per SPARQL 1.2, the return type is `xsd:string`.

---

## Example 18: BIND and Expression Variables

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

SELECT ?name ?salary ?tax_bracket ?net_salary WHERE {
    GRAPH <http://example.org/hr> {
        ?person foaf:name ?name ;
                ex:salary ?salary .
    }

    BIND(
        IF(?salary > 100000, "high",
        IF(?salary > 60000,  "medium",
        "low")) AS ?tax_bracket
    )

    BIND(
        IF(?salary > 100000,
            ?salary * 0.45,
        IF(?salary > 60000,
            ?salary * 0.35,
            ?salary * 0.25)) AS ?net_salary
    )
}
ORDER BY DESC(?salary)
```

---

## Example 19: Sub-Queries (SELECT inside SELECT)

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

SELECT ?name ?salary WHERE {
    # Outer query: people with above-average salary
    ?person foaf:name ?name ;
            ex:salary ?salary .

    # Sub-query: compute the average
    {
        SELECT (AVG(?s) AS ?avg_salary) WHERE {
            ?p ex:salary ?s .
        }
    }

    FILTER (?salary > ?avg_salary)
}
ORDER BY DESC(?salary)
```

Sub-queries are enclosed in `{ SELECT … }` and their result variables are in scope in the outer query.

---

## Example 20: VALUES Clause

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

SELECT ?person ?name WHERE {
    VALUES ?person {
        ex:alice
        ex:bob
        ex:carol
    }
    ?person foaf:name ?name .
}
```

The `VALUES` clause provides an inline set of bindings — equivalent to a SQL `IN` clause or a parameterized query. Also useful for injecting IDs from application code:

```sparql
SELECT ?name ?salary WHERE {
    VALUES (?person ?min_salary) {
        (ex:alice 80000)
        (ex:bob   85000)
    }
    ?person foaf:name ?name ;
            ex:salary ?salary .
    FILTER (?salary >= ?min_salary)
}
```

---

## Example 21: GeoSPARQL Distance Query

IndentiaDB supports GeoSPARQL for spatial queries over RDF geometry data.

```sparql
PREFIX geo:   <http://www.opengis.net/ont/geosparql#>
PREFIX geof:  <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:    <http://example.org/>
PREFIX xsd:   <http://www.w3.org/2001/XMLSchema#>
PREFIX uom:   <http://www.opengis.net/def/uom/OGC/1.0/>

# Insert location data (WKT point geometry)
INSERT DATA {
    ex:amsterdam ex:name "Amsterdam" ;
                 geo:hasGeometry [
                     geo:asWKT "POINT(4.9041 52.3676)"^^geo:wktLiteral
                 ] .
    ex:berlin ex:name "Berlin" ;
              geo:hasGeometry [
                  geo:asWKT "POINT(13.4050 52.5200)"^^geo:wktLiteral
              ] .
    ex:paris ex:name "Paris" ;
             geo:hasGeometry [
                 geo:asWKT "POINT(2.3522 48.8566)"^^geo:wktLiteral
             ] .
}

# Query: find cities within 700 km of Amsterdam
SELECT ?city ?name ?distance WHERE {
    ex:amsterdam geo:hasGeometry ?ref_geom .
    ?ref_geom geo:asWKT ?ref_wkt .

    ?city ex:name ?name ;
          geo:hasGeometry ?geom .
    ?geom geo:asWKT ?city_wkt .

    BIND(geof:distance(?ref_wkt, ?city_wkt, uom:metre) AS ?distance_m)
    BIND(?distance_m / 1000 AS ?distance)

    FILTER (?city != ex:amsterdam)
    FILTER (?distance < 700)
}
ORDER BY ?distance
```

---

## RDF 1.2 Features

### Triple Terms (Quoted Triples)

SPARQL 1.2 introduces triple terms as first-class values. A quoted triple `<< s p o >>` can appear as the subject or object of another triple, or be bound to a variable.

```sparql
# A quoted triple as subject
INSERT DATA {
    << ex:alice foaf:knows ex:bob >> ex:confidence 0.9 .
}

# A quoted triple as object
SELECT ?annotation WHERE {
    ex:evidence1 ex:supports ?annotation .
    FILTER (isTRIPLE(?annotation))
}
```

### Reified Triples with ~ Operator

The `~` operator creates a reified triple:

```sparql
INSERT DATA {
    ex:alice foaf:knows ex:bob ~ ex:confidence 0.9 .
}
```

This is syntactic sugar equivalent to:

```sparql
INSERT DATA {
    << ex:alice foaf:knows ex:bob >> ex:confidence 0.9 .
}
```

### Base Direction Tags

SPARQL 1.2 adds support for base direction in language-tagged literals using the `--ltr` and `--rtl` suffixes:

```sparql
# English (left-to-right)
INSERT DATA {
    ex:doc1 rdfs:label "Hello World"@en--ltr .
}

# Arabic (right-to-left)
INSERT DATA {
    ex:doc2 rdfs:label "مرحبا بالعالم"@ar--rtl .
}

# LANGDIR() function returns the base direction
SELECT ?label (LANGDIR(?label) AS ?direction) WHERE {
    ?doc rdfs:label ?label .
    FILTER (LANG(?label) = "ar")
}
```

### rdf:JSON Literals

RDF 1.2 introduces `rdf:JSON` as a first-class datatype for embedding arbitrary JSON values in RDF literals:

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX ex:  <http://example.org/>

INSERT DATA {
    ex:sensor42 ex:latestReading
        "{\"temperature\": 21.3, \"unit\": \"celsius\", \"ts\": 1711620000}"^^rdf:JSON .
}
```

Query and filter on the JSON literal value:

```sparql
SELECT ?sensor ?reading WHERE {
    ?sensor ex:latestReading ?reading .
    FILTER (DATATYPE(?reading) = rdf:JSON)
}
```

!!! note "Elasticsearch indexing"
    When IndentiaDB auto-maps RDF triples to Elasticsearch indices, fields backed by `rdf:JSON` literals are indexed as `keyword` (exact match) rather than `text` (full-text analyzed). This preserves the raw JSON string for filtering and aggregation without tokenization artifacts.

### SEMIJOIN and ANTIJOIN Operators

SPARQL 1.2 formalizes SEMIJOIN and ANTIJOIN as explicit algebraic operators. In query syntax they are expressed via `FILTER EXISTS` and `FILTER NOT EXISTS`:

```sparql
# SEMIJOIN: people who have at least one known contact
SELECT ?name WHERE {
    ?person foaf:name ?name .
    FILTER EXISTS { ?person foaf:knows ?anyone }
}

# ANTIJOIN: people with no known contacts
SELECT ?name WHERE {
    ?person foaf:name ?name .
    FILTER NOT EXISTS { ?person foaf:knows ?anyone }
}
```

### sameValue Three-Valued Comparison (SPARQL 1.2 Issue #187)

The `sameValue` operator implements three-valued comparison semantics consistent with the RDF data model. Two values are `sameValue` if and only if they are the same RDF term (or error in both). This differs from `=`, which raises a type error for incompatible datatypes.

---

## SPARQL 1.2 Working Draft Changes (through 9 April 2026)

The following changes from the SPARQL 1.2 Working Draft are implemented:

| Issue | Change | Status |
|-------|--------|--------|
| Issue #187 | `sameValue` three-valued comparison operator | Implemented |
| Feb 3 ED | `GROUP_CONCAT` returns `xsd:string` | Implemented |
| Issue #266 | Property path evaluation: BFS with cycle detection | Implemented |
| Issue #267 | Property path cardinality semantics fixes | Implemented |
| Issue #290 | Extend cardinality fix for `OPTIONAL` patterns | Implemented |
| RDF 1.2 CR | N-Triples Canonical (C14N) serialization — language tag lowercasing, canonical escaping | Implemented (2026-04-11) |
| RDF 1.2 §3.3.1 | RDF Reference IRI validation (strict mode) | Implemented (2026-04-11) |

---

## Error Codes

| HTTP Status | Meaning | Common Causes |
|-------------|---------|---------------|
| 200 OK | Query succeeded | — |
| 400 Bad Request | Malformed SPARQL | Syntax error, unresolved prefix, invalid IRI |
| 401 Unauthorized | Authentication required | Missing or invalid credentials |
| 403 Forbidden | ACL denied access | Caller lacks read permission for the requested graph |
| 406 Not Acceptable | Unsupported response format | `Accept` header requests unsupported serialization |
| 413 Payload Too Large | Query body too large | `max_body_size` exceeded (default 10 MB) |
| 500 Internal Server Error | Server-side execution error | Query timeout, storage backend error |
| 503 Service Unavailable | Overloaded or starting up | Raft leader election in progress, storage backend offline |

---

## Complete curl Examples

```bash
# SELECT via GET
curl -G 'http://localhost:7001/sparql' \
  --data-urlencode 'query=SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10'

# SELECT via POST with JSON response
curl -X POST 'http://localhost:7001/sparql' \
  -H 'Content-Type: application/sparql-query' \
  -H 'Accept: application/sparql-results+json' \
  -d 'PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?name WHERE { ?p a foaf:Person ; foaf:name ?name }'

# CONSTRUCT returning Turtle
curl -X POST 'http://localhost:7001/sparql' \
  -H 'Content-Type: application/sparql-query' \
  -H 'Accept: text/turtle' \
  -d 'CONSTRUCT { ?s ?p ?o } WHERE { ?s a <http://xmlns.com/foaf/0.1/Person> ; ?p ?o }'

# ASK
curl -X POST 'http://localhost:7001/sparql' \
  -H 'Content-Type: application/sparql-query' \
  -d 'ASK { <http://example.org/alice> a <http://xmlns.com/foaf/0.1/Person> }'

# INSERT DATA
curl -X POST 'http://localhost:7001/update' \
  -H 'Content-Type: application/sparql-update' \
  -d 'PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>
INSERT DATA {
    GRAPH <http://example.org/people> {
        ex:alice a foaf:Person ; foaf:name "Alice" ; foaf:age 30 .
    }
}'

# DELETE DATA
curl -X POST 'http://localhost:7001/update' \
  -H 'Content-Type: application/sparql-update' \
  -d 'PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>
DELETE DATA {
    GRAPH <http://example.org/people> {
        ex:alice foaf:age 30 .
    }
}'

# DESCRIBE
curl -G 'http://localhost:7001/sparql' \
  -H 'Accept: text/turtle' \
  --data-urlencode 'query=DESCRIBE <http://example.org/alice>'
```
