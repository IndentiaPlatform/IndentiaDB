# RDF Triple Store Examples

IndentiaDB stores RDF triples in a `triples` table with structured subject/predicate/object fields and named graph support. This enables SPARQL-like pattern matching using standard SurrealQL.

---

## Table of Contents

1. [Insert and Query Triples](#1-insert-and-query-triples)
2. [Named Graphs](#2-named-graphs)
3. [Blank Nodes](#3-blank-nodes)
4. [Literal Datatypes (integer, float, boolean, date)](#4-literal-datatypes)
5. [Language-Tagged Literals](#5-language-tagged-literals)
6. [All 8 SPO Pattern Combinations](#6-all-8-spo-pattern-combinations)
7. [Triple Deletion](#7-triple-deletion)
8. [Class Hierarchy (rdfs:subClassOf)](#8-class-hierarchy)

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

## 1. Insert and Query Triples

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

## 2. Named Graphs

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

## 3. Blank Nodes

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

## 4. Literal Datatypes

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

## 5. Language-Tagged Literals

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

## 6. All 8 SPO Pattern Combinations

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

## 7. Triple Deletion

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

## 8. Class Hierarchy

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
