# RDF Triple Store Examples

IndentiaDB stores RDF triples in a `triples` table with structured subject/predicate/object fields and named graph support. This enables SPARQL-like pattern matching using standard SurrealQL. IndentiaDB also exposes a full SPARQL 1.2 endpoint for native SPARQL queries, property paths, inference, RDF-star, and federated queries.

---

## Table of Contents

### Basics (SurrealQL Triple Patterns)

1. [Insert and Query Triples](#1-insert-and-query-triples)
2. [Named Graphs](#2-named-graphs)
3. [Blank Nodes](#3-blank-nodes)
4. [Literal Datatypes (integer, float, boolean, date)](#4-literal-datatypes)
5. [Language-Tagged Literals](#5-language-tagged-literals)
6. [All 8 SPO Pattern Combinations](#6-all-8-spo-pattern-combinations)
7. [Triple Deletion](#7-triple-deletion)
8. [Class Hierarchy (rdfs:subClassOf)](#8-class-hierarchy)

### SPARQL Queries

9. [SPARQL SELECT with FILTER and OPTIONAL](#9-sparql-select-with-filter-and-optional)
10. [SPARQL Aggregates (COUNT, GROUP BY, HAVING)](#10-sparql-aggregates)
11. [SPARQL CONSTRUCT (Build New Graphs)](#11-sparql-construct)
12. [SPARQL ASK (Boolean Queries)](#12-sparql-ask)
13. [SPARQL Property Paths](#13-sparql-property-paths)
14. [SPARQL UPDATE (INSERT DATA, DELETE/INSERT WHERE)](#14-sparql-update)

### Advanced RDF Features

15. [RDF-star Provenance Annotations](#15-rdf-star-provenance-annotations)
16. [Federated Queries (SERVICE)](#16-federated-queries)
17. [RDFS Inference (subClassOf, subPropertyOf)](#17-rdfs-inference)
18. [OWL Reasoning (sameAs, inverseOf, symmetricProperty)](#18-owl-reasoning)
19. [Hybrid Query: SPARQL() in SurrealQL](#19-hybrid-query-sparql-in-surrealql)

### Real-World Use Cases

20. [Knowledge Graph: Organization Ontology](#20-knowledge-graph-organization-ontology)
21. [Knowledge Graph: Supply Chain Traceability](#21-knowledge-graph-supply-chain-traceability)
22. [Knowledge Graph: Compliance and Regulatory](#22-knowledge-graph-compliance-and-regulatory)
23. [Knowledge Graph: IT Infrastructure (CMDB)](#23-knowledge-graph-it-infrastructure-cmdb)
24. [Knowledge Graph: Medical Ontology](#24-knowledge-graph-medical-ontology)
25. [Knowledge Graph: Research Publications](#25-knowledge-graph-research-publications)

---

## Triple Structure

Every RDF triple is stored as a record in the `triples` table with four fields:

| Field | Type | Description |
|-------|------|-------------|
| `subject` | object | NamedNode (`{"_rdf_type": "NamedNode", "iri": "..."}`) or BlankNode |
| `predicate` | string | The predicate IRI |
| `object` | object | NamedNode, Literal, or BlankNode |
| `graph` | string | Named graph identifier (use `"default"` for the default graph) |

**Object types:**

```
NamedNode:  {"_rdf_type": "NamedNode", "iri": "<IRI>"}
Literal:    {"_rdf_type": "Literal", "value": "<value>", "datatype": "<xsd:type>"}
LangString: {"_rdf_type": "Literal", "value": "<value>",
             "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
             "language": "<tag>"}
BlankNode:  {"_rdf_type": "BlankNode", "bnode_id": "<id>"}
```

---

## Basics (SurrealQL Triple Patterns)

### 1. Insert and Query Triples

Insert typed triples and query by subject or predicate.

```sql
-- Ontology: Person is an owl:Class
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/Person" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://www.w3.org/2002/07/owl#Class" },
    graph: "default"
};

-- Instance: alice is a Person
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/Person" },
    graph: "default"
};

-- Literal property: alice's name
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://xmlns.com/foaf/0.1/name",
    object: { "_rdf_type": "Literal", "value": "Alice",
              "datatype": "http://www.w3.org/2001/XMLSchema#string" },
    graph: "default"
};

-- Typed literal: alice's age
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://xmlns.com/foaf/0.1/age",
    object: { "_rdf_type": "Literal", "value": "30",
              "datatype": "http://www.w3.org/2001/XMLSchema#integer" },
    graph: "default"
};

-- Query by subject: all triples about alice
SELECT * FROM triples WHERE subject.iri = 'http://example.org/alice';
-- Returns 3 triples

-- Query by predicate: all rdf:type triples
SELECT * FROM triples
WHERE predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
```

### 2. Named Graphs

Triples can be organized into named graphs for access control, provenance, or logical partitioning.

```sql
-- Insert into "employees" graph
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/Person" },
    graph: "employees"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://example.org/worksAt",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/AcmeCorp" },
    graph: "employees"
};

-- Insert into "social" graph
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://xmlns.com/foaf/0.1/knows",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/bob" },
    graph: "social"
};

-- Query specific graph
SELECT * FROM triples WHERE graph = 'employees';
-- Returns 2 triples

SELECT * FROM triples WHERE graph = 'social';
-- Returns 1 triple

-- Cross-graph query for a subject
SELECT * FROM triples WHERE subject.iri = 'http://example.org/alice';
-- Returns 3 triples across all graphs
```

### 3. Blank Nodes

Blank nodes represent anonymous resources (e.g., addresses, nested structures).

```sql
-- Blank node as subject: an address
CREATE triples CONTENT {
    subject: { "_rdf_type": "BlankNode", "bnode_id": "addr1" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://schema.org/PostalAddress" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "BlankNode", "bnode_id": "addr1" },
    predicate: "http://schema.org/streetAddress",
    object: { "_rdf_type": "Literal", "value": "123 Main St",
              "datatype": "http://www.w3.org/2001/XMLSchema#string" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "BlankNode", "bnode_id": "addr1" },
    predicate: "http://schema.org/postalCode",
    object: { "_rdf_type": "Literal", "value": "12345",
              "datatype": "http://www.w3.org/2001/XMLSchema#string" },
    graph: "default"
};

-- Link a named node to the blank node
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://schema.org/address",
    object: { "_rdf_type": "BlankNode", "bnode_id": "addr1" },
    graph: "default"
};

-- Query blank node triples by bnode_id
SELECT * FROM triples
WHERE subject._rdf_type = 'BlankNode' AND subject.bnode_id = 'addr1';
-- Returns 3 triples

-- Find triples referencing addr1 as object
SELECT * FROM triples
WHERE object._rdf_type = 'BlankNode' AND object.bnode_id = 'addr1';
-- Returns 1 triple (alice's address link)
```

### 4. Literal Datatypes

Store and query typed literals: integer, float, boolean, and date.

```sql
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/sensor1" },
    predicate: "http://example.org/count",
    object: { "_rdf_type": "Literal", "value": "42",
              "datatype": "http://www.w3.org/2001/XMLSchema#integer" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/sensor1" },
    predicate: "http://example.org/temperature",
    object: { "_rdf_type": "Literal", "value": "36.6",
              "datatype": "http://www.w3.org/2001/XMLSchema#float" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/sensor1" },
    predicate: "http://example.org/active",
    object: { "_rdf_type": "Literal", "value": "true",
              "datatype": "http://www.w3.org/2001/XMLSchema#boolean" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/sensor1" },
    predicate: "http://example.org/calibratedOn",
    object: { "_rdf_type": "Literal", "value": "2026-01-15",
              "datatype": "http://www.w3.org/2001/XMLSchema#date" },
    graph: "default"
};

-- Query all sensor1 triples -- datatypes are preserved in object.datatype
SELECT * FROM triples WHERE subject.iri = 'http://example.org/sensor1';
-- Returns 4 triples with distinct datatypes
```

### 5. Language-Tagged Literals

Multilingual labels using `rdf:langString` with a `language` field.

```sql
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/amsterdam" },
    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
    object: { "_rdf_type": "Literal", "value": "Amsterdam",
              "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
              "language": "en" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/amsterdam" },
    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
    object: { "_rdf_type": "Literal", "value": "Amsterdam",
              "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
              "language": "nl" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/amsterdam" },
    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
    object: { "_rdf_type": "Literal", "value": "Amszterdam",
              "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
              "language": "hu" },
    graph: "default"
};

-- All labels
SELECT * FROM triples
WHERE subject.iri = 'http://example.org/amsterdam'
  AND predicate = 'http://www.w3.org/2000/01/rdf-schema#label';
-- Returns 3 labels

-- Filter by language tag
SELECT * FROM triples
WHERE subject.iri = 'http://example.org/amsterdam' AND object.language = 'en';
-- Returns 1 triple: "Amsterdam"@en

SELECT * FROM triples
WHERE subject.iri = 'http://example.org/amsterdam' AND object.language = 'nl';
-- Returns 1 triple: "Amsterdam"@nl
```

### 6. All 8 SPO Pattern Combinations

Every combination of bound/unbound Subject, Predicate, and Object.

**Setup data:** alice knows bob, alice knows carol, bob knows carol, alice likes carol.

```sql
-- Insert the graph
-- (using abbreviated form; see Section 1 for full CONTENT syntax)

-- Pattern 1: ??? -- all triples (no filter)
SELECT * FROM triples;
-- Returns 4 triples

-- Pattern 2: S?? -- given subject
SELECT * FROM triples WHERE subject.iri = 'http://example.org/alice';
-- Returns 3 triples (alice is subject of knows-bob, knows-carol, likes-carol)

-- Pattern 3: ?P? -- given predicate
SELECT * FROM triples WHERE predicate = 'http://xmlns.com/foaf/0.1/knows';
-- Returns 3 triples (all "knows" relationships)

-- Pattern 4: ??O -- given object
SELECT * FROM triples WHERE object.iri = 'http://example.org/carol';
-- Returns 3 triples (carol is object of 3 triples)

-- Pattern 5: SP? -- given subject + predicate
SELECT * FROM triples
WHERE subject.iri = 'http://example.org/alice'
  AND predicate = 'http://xmlns.com/foaf/0.1/knows';
-- Returns 2 triples (alice knows bob, alice knows carol)

-- Pattern 6: S?O -- given subject + object
SELECT * FROM triples
WHERE subject.iri = 'http://example.org/alice'
  AND object.iri = 'http://example.org/carol';
-- Returns 2 triples (alice->carol via knows and likes)

-- Pattern 7: ?PO -- given predicate + object
SELECT * FROM triples
WHERE predicate = 'http://xmlns.com/foaf/0.1/knows'
  AND object.iri = 'http://example.org/carol';
-- Returns 2 triples (alice knows carol, bob knows carol)

-- Pattern 8: SPO -- fully specified
SELECT * FROM triples
WHERE subject.iri = 'http://example.org/alice'
  AND predicate = 'http://xmlns.com/foaf/0.1/knows'
  AND object.iri = 'http://example.org/bob';
-- Returns exactly 1 triple
```

### 7. Triple Deletion

Delete specific triples by matching on subject, predicate, and object.

```sql
-- Setup: alice rdf:type Person, alice knows bob, bob rdf:type Person
-- (3 triples total)

-- Delete a specific triple
DELETE triples
WHERE subject.iri = 'http://example.org/alice'
  AND predicate = 'http://xmlns.com/foaf/0.1/knows'
  AND object.iri = 'http://example.org/bob';

-- Verify: 2 triples remain (both rdf:type triples)
SELECT * FROM triples;
-- The knows triple is gone, type triples remain
```

### 8. Class Hierarchy

Model `rdfs:subClassOf` chains and find instances across the hierarchy.

```sql
-- Build class hierarchy: GradStudent subClassOf Student subClassOf Person
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/Student" },
    predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/Person" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/GradStudent" },
    predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/Student" },
    graph: "default"
};

-- Create instances at each level
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/Person" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/bob" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/Student" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/carol" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/GradStudent" },
    graph: "default"
};

-- Find direct subclasses of Person
SELECT * FROM triples
WHERE predicate = 'http://www.w3.org/2000/01/rdf-schema#subClassOf'
  AND object.iri = 'http://example.org/Person';
-- Returns: Student

-- Find all subClassOf relationships
SELECT * FROM triples
WHERE predicate = 'http://www.w3.org/2000/01/rdf-schema#subClassOf';
-- Returns: Student subClassOf Person, GradStudent subClassOf Student

-- Find direct instances of Person
SELECT * FROM triples
WHERE predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
  AND object.iri = 'http://example.org/Person';
-- Returns: alice (1 direct instance)

-- Transitive closure: find subclasses of Student (second level)
SELECT * FROM triples
WHERE predicate = 'http://www.w3.org/2000/01/rdf-schema#subClassOf'
  AND object.iri = 'http://example.org/Student';
-- Returns: GradStudent
```

The full class hierarchy (Person > Student > GradStudent) can be traversed level-by-level. IndentiaDB's inference engine can also compute transitive closure automatically when RDFS or OWL reasoning is enabled.

---

## SPARQL Queries

The examples below use the native SPARQL 1.2 endpoint (`POST /sparql`). All SPARQL queries assume the following data has been loaded:

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
            foaf:age 28 ;
            foaf:knows ex:carol .

        ex:carol a foaf:Person ;
            foaf:name "Carol Jansen" ;
            foaf:age 35 ;
            foaf:mbox <mailto:carol@example.org> ;
            foaf:knows ex:alice .

        ex:dave a foaf:Person ;
            foaf:name "Dave Bakker" ;
            foaf:age 42 .
    }
    GRAPH <http://example.org/hr> {
        ex:alice ex:worksAt ex:acme ;
                 ex:department "Engineering" ;
                 ex:salary "85000"^^xsd:integer .
        ex:bob   ex:worksAt ex:acme ;
                 ex:department "Marketing" ;
                 ex:salary "92000"^^xsd:integer .
        ex:carol ex:worksAt ex:globex ;
                 ex:department "Engineering" ;
                 ex:salary "105000"^^xsd:integer .
    }
}
```

### 9. SPARQL SELECT with FILTER and OPTIONAL

Query persons with optional email, filtering by age.

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

SELECT ?name ?age ?email WHERE {
    GRAPH <http://example.org/social> {
        ?person a foaf:Person ;
                foaf:name ?name ;
                foaf:age  ?age .
        OPTIONAL { ?person foaf:mbox ?email }
    }
    FILTER (?age >= 30)
}
ORDER BY DESC(?age)
```

**Results:**

| name | age | email |
|------|-----|-------|
| "Dave Bakker" | 42 | |
| "Carol Jansen" | 35 | `mailto:carol@example.org` |
| "Alice van den Berg" | 30 | `mailto:alice@example.org` |

The `OPTIONAL` clause includes `?email` as unbound if the triple does not exist. `FILTER` removes Bob (age 28).

```bash
curl -X POST 'http://localhost:7001/sparql' \
  -H 'Content-Type: application/sparql-query' \
  -H 'Accept: application/sparql-results+json' \
  -d 'PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex: <http://example.org/>
SELECT ?name ?age ?email WHERE {
    GRAPH <http://example.org/social> {
        ?person a foaf:Person ; foaf:name ?name ; foaf:age ?age .
        OPTIONAL { ?person foaf:mbox ?email }
    }
    FILTER (?age >= 30)
} ORDER BY DESC(?age)'
```

### 10. SPARQL Aggregates

Count persons per department and compute average salary.

```sparql
PREFIX ex: <http://example.org/>

SELECT ?dept (COUNT(?person) AS ?headcount) (AVG(?sal) AS ?avg_salary) WHERE {
    GRAPH <http://example.org/hr> {
        ?person ex:worksAt ?company ;
                ex:department ?dept ;
                ex:salary ?sal .
    }
}
GROUP BY ?dept
HAVING (COUNT(?person) > 1)
ORDER BY DESC(?avg_salary)
```

**Results:**

| dept | headcount | avg_salary |
|------|-----------|------------|
| "Engineering" | 2 | 95000 |

Marketing is excluded by the `HAVING` clause (headcount = 1).

### 11. SPARQL CONSTRUCT

Build a new graph with computed properties. CONSTRUCT returns RDF triples instead of a result table.

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

CONSTRUCT {
    ?person foaf:name ?name ;
            ex:ageGroup ?group ;
            ex:isSenior ?senior .
}
WHERE {
    GRAPH <http://example.org/social> {
        ?person a foaf:Person ;
                foaf:name ?name ;
                foaf:age  ?age .
    }
    BIND(
        IF(?age < 30, "junior",
        IF(?age < 40, "mid",
        "senior")) AS ?group
    )
    BIND(?age >= 40 AS ?senior)
}
```

**Output (Turtle):**

```turtle
ex:alice foaf:name "Alice van den Berg" ; ex:ageGroup "mid" ; ex:isSenior false .
ex:bob   foaf:name "Bob de Vries" ;       ex:ageGroup "junior" ; ex:isSenior false .
ex:carol foaf:name "Carol Jansen" ;       ex:ageGroup "mid" ; ex:isSenior false .
ex:dave  foaf:name "Dave Bakker" ;        ex:ageGroup "senior" ; ex:isSenior true .
```

Use `Accept: text/turtle` to receive Turtle syntax, or `application/ld+json` for JSON-LD.

### 12. SPARQL ASK

Boolean existence checks — returns `true` or `false`.

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

-- Does Alice know Bob?
ASK {
    GRAPH <http://example.org/social> {
        ex:alice foaf:knows ex:bob .
    }
}
-- Returns: {"boolean": true}

-- Does Dave know anyone?
ASK {
    GRAPH <http://example.org/social> {
        ex:dave foaf:knows ?someone .
    }
}
-- Returns: {"boolean": false}

-- Is there anyone earning more than 100k?
ASK {
    GRAPH <http://example.org/hr> {
        ?person ex:salary ?sal .
        FILTER (?sal > 100000)
    }
}
-- Returns: {"boolean": true} (Carol earns 105000)
```

### 13. SPARQL Property Paths

Traverse relationships using path operators: `/` (sequence), `*` (zero or more), `+` (one or more), `^` (inverse), `|` (alternative).

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

-- Transitive: find everyone reachable from Alice via knows+ (1 or more hops)
SELECT ?reachable ?name WHERE {
    GRAPH <http://example.org/social> {
        ex:alice foaf:knows+ ?reachable .
        ?reachable foaf:name ?name .
    }
    FILTER (?reachable != ex:alice)
}
-- Returns: Bob (1 hop), Carol (1 hop, also 2 hops via Bob)

-- Inverse: who knows Alice? (follow knows edges in reverse)
SELECT ?follower ?name WHERE {
    GRAPH <http://example.org/social> {
        ex:alice ^foaf:knows ?follower .
        ?follower foaf:name ?name .
    }
}
-- Returns: Carol (carol knows alice)

-- Sequence: who does Alice know, and where do they work?
SELECT ?colleague ?company WHERE {
    GRAPH <http://example.org/social> {
        ex:alice foaf:knows ?colleague .
    }
    GRAPH <http://example.org/hr> {
        ?colleague ex:worksAt ?company .
    }
}
-- Returns: Bob -> acme, Carol -> globex

-- Alternative path: match either knows or worksAt predicates
SELECT ?related WHERE {
    ex:alice (foaf:knows | ex:worksAt) ?related .
}
-- Returns: ex:bob, ex:carol, ex:acme
```

### 14. SPARQL UPDATE

Modify the triple store using SPARQL Update operations.

```sparql
PREFIX ex:  <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

-- INSERT DATA: add a new employee
INSERT DATA {
    GRAPH <http://example.org/hr> {
        ex:eve ex:worksAt ex:acme ;
               ex:department "Engineering" ;
               ex:salary "78000"^^xsd:integer .
    }
}
```

```sparql
PREFIX ex:  <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

-- DELETE/INSERT WHERE: give all Engineering staff a 10% raise
DELETE {
    GRAPH <http://example.org/hr> {
        ?person ex:salary ?oldSalary .
    }
}
INSERT {
    GRAPH <http://example.org/hr> {
        ?person ex:salary ?newSalary .
        ?person ex:lastRaise "2026-03-23"^^xsd:date .
    }
}
WHERE {
    GRAPH <http://example.org/hr> {
        ?person ex:department "Engineering" ;
                ex:salary ?oldSalary .
    }
    BIND((?oldSalary * 1.1) AS ?newSalary)
}
-- Alice: 85000 -> 93500, Carol: 105000 -> 115500, Eve: 78000 -> 85800
```

The `DELETE/INSERT … WHERE` form is atomic — the WHERE clause binds variables used in both templates.

---

## Advanced RDF Features

### 15. RDF-star Provenance Annotations

RDF-star allows annotating triples with metadata (provenance, confidence, timestamps) using quoted triple syntax `<< s p o >>`.

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

-- Assert a fact and annotate it with provenance
INSERT DATA {
    ex:alice foaf:knows ex:bob .

    << ex:alice foaf:knows ex:bob >>
        ex:source "HR System Import" ;
        ex:confidence "0.95"^^xsd:float ;
        ex:assertedOn "2026-01-15"^^xsd:date ;
        ex:assertedBy ex:admin .
}
```

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

-- Query: find all annotated facts and their provenance
SELECT ?s ?p ?o ?source ?confidence WHERE {
    << ?s ?p ?o >> ex:source ?source ;
                   ex:confidence ?confidence .
    FILTER (?confidence > 0.9)
}
-- Returns: alice knows bob, source="HR System Import", confidence=0.95
```

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

-- Query: who asserted that alice knows bob?
SELECT ?asserter ?date WHERE {
    << ex:alice foaf:knows ex:bob >>
        ex:assertedBy ?asserter ;
        ex:assertedOn ?date .
}
-- Returns: asserter=ex:admin, date=2026-01-15
```

RDF-star is essential for enterprise use cases where you need to track **who said what, when, and with what confidence** — without creating separate reification triples.

### 16. Federated Queries

Query remote SPARQL endpoints alongside local data using the `SERVICE` clause.

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>
PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX dbr:  <http://dbpedia.org/resource/>

-- Enrich local employee data with DBpedia city information
SELECT ?name ?city ?cityPopulation WHERE {
    GRAPH <http://example.org/hr> {
        ?person ex:worksAt ?company .
        ?company ex:locatedIn ?city .
    }
    GRAPH <http://example.org/social> {
        ?person foaf:name ?name .
    }
    SERVICE <https://dbpedia.org/sparql> {
        ?city dbo:populationTotal ?cityPopulation .
    }
}
```

```sparql
PREFIX ex:  <http://example.org/>
PREFIX wd:  <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>

-- SERVICE SILENT: continue even if remote endpoint is unavailable
SELECT ?product ?name ?gtin WHERE {
    GRAPH <http://example.org/inventory> {
        ?product ex:name ?name ;
                 ex:wikidataId ?wdId .
    }
    SERVICE SILENT <https://query.wikidata.org/sparql> {
        ?wdId wdt:P953 ?gtin .
    }
}
-- If Wikidata is down, results still return with ?gtin unbound
```

### 17. RDFS Inference

With inference enabled (`inference = true`, `inference_level = "rdfs"`), IndentiaDB automatically materializes entailed triples from `rdfs:subClassOf` and `rdfs:subPropertyOf` hierarchies.

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ex:   <http://example.org/>

-- Define class hierarchy
INSERT DATA {
    ex:Laptop       rdfs:subClassOf ex:Computer .
    ex:Computer     rdfs:subClassOf ex:Device .
    ex:Device       rdfs:subClassOf ex:Asset .
    ex:Smartphone   rdfs:subClassOf ex:Device .

    ex:laptop001 a ex:Laptop ; ex:assignedTo ex:alice .
    ex:phone042  a ex:Smartphone ; ex:assignedTo ex:bob .
    ex:server007 a ex:Computer ; ex:assignedTo ex:carol .
}
```

```sparql
PREFIX ex: <http://example.org/>

-- Query all Assets (inference resolves the full hierarchy)
SELECT ?item ?assignee WHERE {
    ?item a ex:Asset ;
          ex:assignedTo ?assignee .
}
-- Returns all 3 items: laptop001, phone042, server007
-- Without inference, this returns 0 results (none directly typed as Asset)
```

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

-- Property hierarchy: ex:authoredBy is a subproperty of foaf:maker
INSERT DATA {
    ex:authoredBy rdfs:subPropertyOf foaf:maker .
    ex:article42  ex:authoredBy ex:alice .
}

-- Query via the super-property
SELECT ?doc ?maker WHERE {
    ?doc foaf:maker ?maker .
}
-- Returns: article42 -> alice (inferred via subPropertyOf)
```

Enable inference per-request when not enabled globally:

```bash
curl -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -H "X-IndentiaDB-Inference: true" \
  -d 'PREFIX ex: <http://example.org/>
SELECT ?item ?assignee WHERE {
    ?item a ex:Asset ; ex:assignedTo ?assignee .
}'
```

### 18. OWL Reasoning

With `inference_level = "owl_rl"`, IndentiaDB supports OWL axioms including `owl:sameAs`, `owl:inverseOf`, `owl:symmetricProperty`, and `owl:transitiveProperty`.

```sparql
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX ex:  <http://example.org/>

-- owl:sameAs: link internal and external identifiers
INSERT DATA {
    ex:amsterdam owl:sameAs <http://dbpedia.org/resource/Amsterdam> .
    ex:amsterdam ex:population 921402 ;
                 ex:country ex:netherlands .
}

-- Queries for either IRI return the same facts
SELECT ?prop ?val WHERE {
    <http://dbpedia.org/resource/Amsterdam> ?prop ?val .
}
-- Returns: population 921402, country ex:netherlands (via sameAs propagation)
```

```sparql
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX ex:  <http://example.org/>

-- owl:inverseOf: bidirectional relationships
INSERT DATA {
    ex:manages owl:inverseOf ex:managedBy .
    ex:alice ex:manages ex:bob .
    ex:alice ex:manages ex:carol .
}

-- Query the inverse direction (auto-inferred)
SELECT ?employee ?manager WHERE {
    ?employee ex:managedBy ?manager .
}
-- Returns: bob managedBy alice, carol managedBy alice
```

```sparql
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX ex:  <http://example.org/>

-- owl:symmetricProperty: mutual relationships
INSERT DATA {
    ex:collaboratesWith a owl:SymmetricProperty .
    ex:alice ex:collaboratesWith ex:bob .
}

-- Query: who collaborates with Bob? (auto-inferred reverse)
SELECT ?person WHERE {
    ?person ex:collaboratesWith ex:bob .
}
-- Returns: alice (asserted) — and bob collaboratesWith alice is also inferred
```

```sparql
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX ex:   <http://example.org/>

-- owl:transitiveProperty: reachability chains
INSERT DATA {
    ex:locatedIn a owl:TransitiveProperty .
    ex:office42 ex:locatedIn ex:building_a .
    ex:building_a ex:locatedIn ex:campus_west .
    ex:campus_west ex:locatedIn ex:amsterdam .
}

-- Query: what is office42 located in? (transitive closure)
SELECT ?location WHERE {
    ex:office42 ex:locatedIn ?location .
}
-- Returns: building_a, campus_west, amsterdam (all levels)
```

### 19. Hybrid Query: SPARQL() in SurrealQL

The `SPARQL()` function lets you query the RDF triple store from within SurrealQL, combining both data models in a single query.

```sql
-- Fetch RDF persons and enrich with document data
LET $rdf_persons = SPARQL("
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX ex:   <http://example.org/>
    SELECT ?uri ?name ?age WHERE {
        GRAPH <http://example.org/social> {
            ?uri a foaf:Person ;
                 foaf:name ?name ;
                 foaf:age ?age .
        }
    }
    ORDER BY ?name
");

-- Join RDF data with SurrealQL document table
FOR $person IN $rdf_persons {
    LET $doc = SELECT * FROM employee WHERE external_uri = $person.uri;
    IF $doc[0] != NONE THEN
        RETURN {
            name: $person.name,
            age: $person.age,
            department: $doc[0].department,
            hire_date: $doc[0].hire_date
        };
    END;
};
```

```sql
-- Use SPARQL knowledge graph facts as context for a vector search
LET $experts = SPARQL("
    PREFIX ex: <http://example.org/>
    SELECT ?person ?skill WHERE {
        ?person ex:hasSkill ?skill .
        ?skill ex:domain 'machine-learning' .
    }
");

-- Find documents authored by ML experts
SELECT title, content, vector::similarity::cosine(embedding, $query_vec) AS score
FROM document
WHERE author IN $experts.map(|$e| $e.person)
ORDER BY score DESC
LIMIT 10;
```

---

## Real-World Use Cases

### 20. Knowledge Graph: Organization Ontology

Model an enterprise organization structure with departments, roles, and reporting relationships.

```sparql
PREFIX org:  <http://www.w3.org/ns/org#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    GRAPH <http://example.org/organization> {
        -- Organization
        ex:acme a org:Organization ;
            foaf:name "Acme Corporation" ;
            org:hasUnit ex:engineering, ex:marketing, ex:security .

        -- Departments
        ex:engineering a org:OrganizationalUnit ;
            foaf:name "Engineering" ;
            org:unitOf ex:acme .
        ex:marketing a org:OrganizationalUnit ;
            foaf:name "Marketing" ;
            org:unitOf ex:acme .
        ex:security a org:OrganizationalUnit ;
            foaf:name "Security" ;
            org:unitOf ex:acme ;
            org:subOrganizationOf ex:engineering .

        -- People and Roles
        ex:alice a foaf:Person ;
            foaf:name "Alice van den Berg" ;
            org:memberOf ex:engineering ;
            org:holds ex:alice_role .
        ex:alice_role a org:Role ;
            org:roleTitle "Principal Engineer" .

        ex:bob a foaf:Person ;
            foaf:name "Bob de Vries" ;
            org:memberOf ex:security ;
            org:holds ex:bob_role ;
            org:reportsTo ex:alice .
        ex:bob_role a org:Role ;
            org:roleTitle "Security Engineer" .

        ex:carol a foaf:Person ;
            foaf:name "Carol Jansen" ;
            org:memberOf ex:engineering ;
            org:holds ex:carol_role ;
            org:reportsTo ex:alice .
        ex:carol_role a org:Role ;
            org:roleTitle "Senior Engineer" .
    }
}
```

```sparql
PREFIX org:  <http://www.w3.org/ns/org#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

-- Who reports to Alice?
SELECT ?name ?title WHERE {
    GRAPH <http://example.org/organization> {
        ?person org:reportsTo ex:alice ;
                foaf:name ?name ;
                org:holds ?role .
        ?role org:roleTitle ?title .
    }
}
-- Returns: Bob (Security Engineer), Carol (Senior Engineer)
```

```sparql
PREFIX org:  <http://www.w3.org/ns/org#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>

-- All departments and their headcount
SELECT ?dept ?deptName (COUNT(?person) AS ?headcount) WHERE {
    GRAPH <http://example.org/organization> {
        ?dept a org:OrganizationalUnit ;
              foaf:name ?deptName .
        ?person org:memberOf ?dept .
    }
}
GROUP BY ?dept ?deptName
ORDER BY DESC(?headcount)
-- Returns: Engineering (2), Security (1)
```

### 21. Knowledge Graph: Supply Chain Traceability

Track product components, suppliers, certifications, and origin across a supply chain.

```sparql
PREFIX sc:   <http://example.org/supplychain/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    GRAPH <http://example.org/supplychain> {
        -- Products
        sc:laptop_x1 a sc:Product ;
            rdfs:label "Laptop X1" ;
            sc:manufacturer sc:acme ;
            sc:hasComponent sc:cpu_a9, sc:battery_b3, sc:display_d7 .

        -- Components with suppliers and origin
        sc:cpu_a9 a sc:Component ;
            rdfs:label "CPU A9 Chipset" ;
            sc:supplier sc:chipfab_tw ;
            sc:countryOfOrigin "Taiwan" ;
            sc:hasCertification sc:cert_rohs, sc:cert_iso9001 .

        sc:battery_b3 a sc:Component ;
            rdfs:label "Li-Ion Battery B3" ;
            sc:supplier sc:battcorp_kr ;
            sc:countryOfOrigin "South Korea" ;
            sc:hasCertification sc:cert_ul, sc:cert_rohs .

        sc:display_d7 a sc:Component ;
            rdfs:label "OLED Display D7" ;
            sc:supplier sc:displaytech_jp ;
            sc:countryOfOrigin "Japan" ;
            sc:hasCertification sc:cert_rohs .

        -- Suppliers
        sc:chipfab_tw a sc:Supplier ;
            rdfs:label "ChipFab Taiwan" ;
            sc:riskScore "2"^^xsd:integer .
        sc:battcorp_kr a sc:Supplier ;
            rdfs:label "BattCorp Korea" ;
            sc:riskScore "1"^^xsd:integer .
        sc:displaytech_jp a sc:Supplier ;
            rdfs:label "DisplayTech Japan" ;
            sc:riskScore "3"^^xsd:integer .

        -- Certifications
        sc:cert_rohs a sc:Certification ; rdfs:label "RoHS Compliant" .
        sc:cert_iso9001 a sc:Certification ; rdfs:label "ISO 9001" .
        sc:cert_ul a sc:Certification ; rdfs:label "UL Safety" .
    }
}
```

```sparql
PREFIX sc:   <http://example.org/supplychain/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- Full bill of materials with supplier risk
SELECT ?product ?component ?supplier ?origin ?riskScore WHERE {
    GRAPH <http://example.org/supplychain> {
        ?prod a sc:Product ;
              rdfs:label ?product ;
              sc:hasComponent ?comp .
        ?comp rdfs:label ?component ;
              sc:supplier ?sup ;
              sc:countryOfOrigin ?origin .
        ?sup rdfs:label ?supplier ;
             sc:riskScore ?riskScore .
    }
}
ORDER BY DESC(?riskScore)
-- Returns all components sorted by supplier risk (DisplayTech highest at 3)
```

```sparql
PREFIX sc:   <http://example.org/supplychain/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- Which components lack a specific certification?
SELECT ?component ?supplier WHERE {
    GRAPH <http://example.org/supplychain> {
        ?comp a sc:Component ;
              rdfs:label ?component ;
              sc:supplier ?sup .
        ?sup rdfs:label ?supplier .
        FILTER NOT EXISTS {
            ?comp sc:hasCertification sc:cert_iso9001 .
        }
    }
}
-- Returns: Battery B3 (BattCorp), Display D7 (DisplayTech) — both lack ISO 9001
```

### 22. Knowledge Graph: Compliance and Regulatory

Model regulatory frameworks, controls, and compliance evidence for audit trails.

```sparql
PREFIX comp: <http://example.org/compliance/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    GRAPH <http://example.org/compliance> {
        -- Regulatory frameworks
        comp:gdpr a comp:Framework ;
            rdfs:label "GDPR" ;
            comp:jurisdiction "EU" .
        comp:iso27001 a comp:Framework ;
            rdfs:label "ISO 27001" ;
            comp:jurisdiction "International" .

        -- Controls
        comp:ctrl_encryption a comp:Control ;
            rdfs:label "Data Encryption at Rest" ;
            comp:requiredBy comp:gdpr, comp:iso27001 ;
            comp:category "Technical" .
        comp:ctrl_access_review a comp:Control ;
            rdfs:label "Quarterly Access Review" ;
            comp:requiredBy comp:iso27001 ;
            comp:category "Administrative" .
        comp:ctrl_dpia a comp:Control ;
            rdfs:label "Data Protection Impact Assessment" ;
            comp:requiredBy comp:gdpr ;
            comp:category "Administrative" .
        comp:ctrl_incident_response a comp:Control ;
            rdfs:label "Incident Response Plan" ;
            comp:requiredBy comp:gdpr, comp:iso27001 ;
            comp:category "Operational" .

        -- Evidence (audit artifacts)
        comp:ev_enc_report a comp:Evidence ;
            rdfs:label "Encryption Audit Report Q1 2026" ;
            comp:satisfies comp:ctrl_encryption ;
            comp:assessedBy comp:auditor_alice ;
            comp:assessedOn "2026-01-20"^^xsd:date ;
            comp:status "Compliant" .
        comp:ev_access_log a comp:Evidence ;
            rdfs:label "Access Review Log Q4 2025" ;
            comp:satisfies comp:ctrl_access_review ;
            comp:assessedBy comp:auditor_bob ;
            comp:assessedOn "2025-12-15"^^xsd:date ;
            comp:status "Compliant" .
        comp:ev_dpia_draft a comp:Evidence ;
            rdfs:label "DPIA for Customer Portal" ;
            comp:satisfies comp:ctrl_dpia ;
            comp:assessedBy comp:auditor_alice ;
            comp:assessedOn "2026-02-10"^^xsd:date ;
            comp:status "In Review" .
    }
}
```

```sparql
PREFIX comp: <http://example.org/compliance/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- Compliance dashboard: controls and their current status per framework
SELECT ?framework ?control ?status WHERE {
    GRAPH <http://example.org/compliance> {
        ?ctrl comp:requiredBy ?fw ;
              rdfs:label ?control .
        ?fw rdfs:label ?framework .
        OPTIONAL {
            ?ev comp:satisfies ?ctrl ;
                comp:status ?status .
        }
    }
}
ORDER BY ?framework ?control
```

```sparql
PREFIX comp: <http://example.org/compliance/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- Find controls with no evidence at all (compliance gaps)
SELECT ?framework ?control WHERE {
    GRAPH <http://example.org/compliance> {
        ?ctrl comp:requiredBy ?fw ;
              rdfs:label ?control .
        ?fw rdfs:label ?framework .
        FILTER NOT EXISTS {
            ?ev comp:satisfies ?ctrl .
        }
    }
}
-- Returns: ISO 27001 / Incident Response Plan (no evidence submitted)
```

### 23. Knowledge Graph: IT Infrastructure (CMDB)

Model servers, services, dependencies, and incidents as a configuration management database.

```sparql
PREFIX cmdb: <http://example.org/cmdb/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    GRAPH <http://example.org/cmdb> {
        -- Infrastructure
        cmdb:srv_web01 a cmdb:Server ;
            rdfs:label "web-01.prod" ;
            cmdb:environment "production" ;
            cmdb:os "Ubuntu 24.04" ;
            cmdb:cpuCores "8"^^xsd:integer ;
            cmdb:ramGB "32"^^xsd:integer .
        cmdb:srv_db01 a cmdb:Server ;
            rdfs:label "db-01.prod" ;
            cmdb:environment "production" ;
            cmdb:os "Rocky Linux 9" ;
            cmdb:cpuCores "16"^^xsd:integer ;
            cmdb:ramGB "128"^^xsd:integer .
        cmdb:srv_cache01 a cmdb:Server ;
            rdfs:label "cache-01.prod" ;
            cmdb:environment "production" ;
            cmdb:os "Ubuntu 24.04" ;
            cmdb:cpuCores "4"^^xsd:integer ;
            cmdb:ramGB "16"^^xsd:integer .

        -- Services
        cmdb:svc_api a cmdb:Service ;
            rdfs:label "Customer API" ;
            cmdb:runsOn cmdb:srv_web01 ;
            cmdb:tier "Tier 1" .
        cmdb:svc_database a cmdb:Service ;
            rdfs:label "Primary Database" ;
            cmdb:runsOn cmdb:srv_db01 ;
            cmdb:tier "Tier 1" .
        cmdb:svc_cache a cmdb:Service ;
            rdfs:label "Redis Cache" ;
            cmdb:runsOn cmdb:srv_cache01 ;
            cmdb:tier "Tier 2" .

        -- Dependencies
        cmdb:svc_api cmdb:dependsOn cmdb:svc_database .
        cmdb:svc_api cmdb:dependsOn cmdb:svc_cache .

        -- Incident
        cmdb:inc_001 a cmdb:Incident ;
            rdfs:label "API latency spike" ;
            cmdb:affectsService cmdb:svc_api ;
            cmdb:rootCause cmdb:srv_cache01 ;
            cmdb:severity "P2" ;
            cmdb:openedOn "2026-03-20"^^xsd:date ;
            cmdb:status "Resolved" .
    }
}
```

```sparql
PREFIX cmdb: <http://example.org/cmdb/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- Impact analysis: if db-01 goes down, which services are affected?
SELECT ?service ?tier WHERE {
    GRAPH <http://example.org/cmdb> {
        ?svc cmdb:dependsOn* ?dep .
        ?dep cmdb:runsOn cmdb:srv_db01 .
        ?svc rdfs:label ?service ;
             cmdb:tier ?tier .
    }
}
-- Returns: Customer API (Tier 1) — directly depends on database running on db-01
```

```sparql
PREFIX cmdb: <http://example.org/cmdb/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- Capacity report: total resources per environment
SELECT ?env (SUM(?cpu) AS ?totalCPU) (SUM(?ram) AS ?totalRAM) (COUNT(?srv) AS ?serverCount) WHERE {
    GRAPH <http://example.org/cmdb> {
        ?srv a cmdb:Server ;
             cmdb:environment ?env ;
             cmdb:cpuCores ?cpu ;
             cmdb:ramGB ?ram .
    }
}
GROUP BY ?env
-- Returns: production — 28 cores, 176 GB RAM, 3 servers
```

### 24. Knowledge Graph: Medical Ontology

Model diseases, symptoms, drugs, and interactions for clinical decision support.

```sparql
PREFIX med:  <http://example.org/medical/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    GRAPH <http://example.org/medical> {
        -- Disease hierarchy
        med:CardiovascularDisease rdfs:subClassOf med:Disease .
        med:Hypertension rdfs:subClassOf med:CardiovascularDisease .
        med:Diabetes rdfs:subClassOf med:MetabolicDisorder .
        med:MetabolicDisorder rdfs:subClassOf med:Disease .

        -- Symptoms
        med:Hypertension med:hasSymptom med:Headache, med:Dizziness, med:ChestPain .
        med:Diabetes med:hasSymptom med:Fatigue, med:Thirst, med:BlurredVision .

        -- Drugs
        med:Lisinopril a med:Drug ;
            rdfs:label "Lisinopril" ;
            med:treats med:Hypertension ;
            med:drugClass med:ACEInhibitor .
        med:Metformin a med:Drug ;
            rdfs:label "Metformin" ;
            med:treats med:Diabetes ;
            med:drugClass med:Biguanide .
        med:Amlodipine a med:Drug ;
            rdfs:label "Amlodipine" ;
            med:treats med:Hypertension ;
            med:drugClass med:CalciumChannelBlocker .

        -- Drug interactions
        med:Lisinopril med:interactsWith med:Metformin ;
            med:interactionSeverity "Moderate" .

        -- Patient
        med:patient001 a med:Patient ;
            rdfs:label "Patient 001" ;
            med:diagnosedWith med:Hypertension, med:Diabetes ;
            med:prescribed med:Lisinopril, med:Metformin .
    }
}
```

```sparql
PREFIX med:  <http://example.org/medical/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- Clinical decision support: find drug interactions for a patient
SELECT ?drug1 ?drug2 ?severity WHERE {
    GRAPH <http://example.org/medical> {
        med:patient001 med:prescribed ?d1, ?d2 .
        ?d1 med:interactsWith ?d2 ;
            med:interactionSeverity ?severity .
        ?d1 rdfs:label ?drug1 .
        ?d2 rdfs:label ?drug2 .
    }
}
-- Returns: Lisinopril interacts with Metformin (Moderate severity)
```

```sparql
PREFIX med:  <http://example.org/medical/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- With RDFS inference: find all Disease instances (across full hierarchy)
SELECT ?patient ?disease WHERE {
    GRAPH <http://example.org/medical> {
        ?patient med:diagnosedWith ?d .
        ?d rdfs:subClassOf* med:Disease .
        ?d rdfs:label ?disease .
    }
}
-- With inference ON: returns Hypertension (via CardiovascularDisease -> Disease)
-- and Diabetes (via MetabolicDisorder -> Disease)
```

```sparql
PREFIX med:  <http://example.org/medical/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- Differential diagnosis: given symptoms, find possible conditions
SELECT ?condition (COUNT(?symptom) AS ?matchCount) WHERE {
    GRAPH <http://example.org/medical> {
        VALUES ?observed { med:Headache med:Fatigue med:Dizziness }
        ?condition med:hasSymptom ?observed .
        ?condition med:hasSymptom ?symptom .
    }
}
GROUP BY ?condition
ORDER BY DESC(?matchCount)
-- Returns: Hypertension (2 matches: Headache, Dizziness), Diabetes (1 match: Fatigue)
```

### 25. Knowledge Graph: Research Publications

Model academic papers, authors, institutions, citations, and research topics for bibliometric analysis.

```sparql
PREFIX bibo: <http://purl.org/ontology/bibo/>
PREFIX dc:   <http://purl.org/dc/terms/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/research/>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    GRAPH <http://example.org/research> {
        -- Authors and affiliations
        ex:author_smith a foaf:Person ;
            foaf:name "Dr. Jane Smith" ;
            ex:affiliation ex:mit ;
            ex:hIndex "42"^^xsd:integer .
        ex:author_chen a foaf:Person ;
            foaf:name "Prof. Wei Chen" ;
            ex:affiliation ex:tsinghua ;
            ex:hIndex "38"^^xsd:integer .
        ex:author_mueller a foaf:Person ;
            foaf:name "Dr. Anna Müller" ;
            ex:affiliation ex:ethz ;
            ex:hIndex "27"^^xsd:integer .

        ex:mit a foaf:Organization ; foaf:name "MIT" .
        ex:tsinghua a foaf:Organization ; foaf:name "Tsinghua University" .
        ex:ethz a foaf:Organization ; foaf:name "ETH Zürich" .

        -- Papers
        ex:paper_001 a bibo:AcademicArticle ;
            dc:title "Graph Neural Networks for Knowledge Base Completion" ;
            dc:creator ex:author_smith, ex:author_chen ;
            dc:date "2025"^^xsd:gYear ;
            dc:subject ex:topic_gnn, ex:topic_kg ;
            bibo:citedBy ex:paper_002, ex:paper_003 .

        ex:paper_002 a bibo:AcademicArticle ;
            dc:title "Scalable Triple Stores: A Benchmark Study" ;
            dc:creator ex:author_mueller ;
            dc:date "2025"^^xsd:gYear ;
            dc:subject ex:topic_triplestore, ex:topic_benchmark ;
            bibo:cites ex:paper_001 .

        ex:paper_003 a bibo:AcademicArticle ;
            dc:title "Hybrid Query Processing Over RDF and Relational Data" ;
            dc:creator ex:author_chen, ex:author_mueller ;
            dc:date "2026"^^xsd:gYear ;
            dc:subject ex:topic_hybrid, ex:topic_triplestore ;
            bibo:cites ex:paper_001 .

        -- Topics
        ex:topic_gnn a ex:ResearchTopic ; rdfs:label "Graph Neural Networks" .
        ex:topic_kg a ex:ResearchTopic ; rdfs:label "Knowledge Graphs" .
        ex:topic_triplestore a ex:ResearchTopic ; rdfs:label "Triple Stores" .
        ex:topic_benchmark a ex:ResearchTopic ; rdfs:label "Benchmarking" .
        ex:topic_hybrid a ex:ResearchTopic ; rdfs:label "Hybrid Query Processing" .
    }
}
```

```sparql
PREFIX bibo: <http://purl.org/ontology/bibo/>
PREFIX dc:   <http://purl.org/dc/terms/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/research/>

-- Citation count per paper
SELECT ?title (COUNT(?citedBy) AS ?citations) WHERE {
    GRAPH <http://example.org/research> {
        ?paper a bibo:AcademicArticle ;
               dc:title ?title .
        OPTIONAL { ?paper bibo:citedBy ?citedBy }
    }
}
GROUP BY ?title
ORDER BY DESC(?citations)
-- Returns: "Graph Neural Networks..." (2 citations), others (0)
```

```sparql
PREFIX bibo: <http://purl.org/ontology/bibo/>
PREFIX dc:   <http://purl.org/dc/terms/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/research/>

-- Co-authorship network: find pairs of authors who collaborated
SELECT ?author1 ?author2 (COUNT(?paper) AS ?collaborations) WHERE {
    GRAPH <http://example.org/research> {
        ?paper dc:creator ?a1, ?a2 .
        ?a1 foaf:name ?author1 .
        ?a2 foaf:name ?author2 .
        FILTER (STR(?a1) < STR(?a2))
    }
}
GROUP BY ?author1 ?author2
ORDER BY DESC(?collaborations)
-- Returns: Smith & Chen (1), Chen & Müller (1)
```

```sparql
PREFIX bibo: <http://purl.org/ontology/bibo/>
PREFIX dc:   <http://purl.org/dc/terms/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/research/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- Research trend: topics by publication year
SELECT ?year ?topic (COUNT(?paper) AS ?paperCount) WHERE {
    GRAPH <http://example.org/research> {
        ?paper a bibo:AcademicArticle ;
               dc:date ?year ;
               dc:subject ?t .
        ?t rdfs:label ?topic .
    }
}
GROUP BY ?year ?topic
ORDER BY ?year DESC(?paperCount)
-- Shows which topics are trending per year
```
