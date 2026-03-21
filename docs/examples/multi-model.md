# Combined Multi-Model Examples

Demonstrates how Relational, NoSQL, RDF, and LPG models work together in IndentiaDB. Each example shows cross-model transactions and unified queries across all four data models in a single instance.

---

## Table of Contents

1. [Relational / SQL Style](#1-relational--sql-style)
2. [NoSQL / Document](#2-nosql--document)
3. [Graph RDF (Triples)](#3-graph-rdf)
4. [Graph LPG (Property Graph)](#4-graph-lpg)
5. [Combined: Document + RDF + LPG in One Transaction](#5-combined-document--rdf--lpg-in-one-transaction)

---

## 1. Relational / SQL Style

Standard typed tables with fields, aggregates, subqueries, and updates.

```sql
-- Schema: typed tables
DEFINE TABLE employee SCHEMAFULL;
DEFINE FIELD name      ON employee TYPE string;
DEFINE FIELD department ON employee TYPE string;
DEFINE FIELD salary    ON employee TYPE number;
DEFINE FIELD hire_date ON employee TYPE string;

DEFINE TABLE department SCHEMAFULL;
DEFINE FIELD name     ON department TYPE string;
DEFINE FIELD budget   ON department TYPE number;
DEFINE FIELD location ON department TYPE string;

-- Data
CREATE department:engineering CONTENT {
    name: "Engineering", budget: 500000, location: "Amsterdam"
};
CREATE department:research CONTENT {
    name: "Research", budget: 300000, location: "Utrecht"
};

CREATE employee:alice CONTENT {
    name: "Alice van den Berg", department: "Engineering",
    salary: 85000, hire_date: "2023-03-15"
};
CREATE employee:bob CONTENT {
    name: "Bob de Vries", department: "Engineering",
    salary: 92000, hire_date: "2022-01-10"
};
CREATE employee:carol CONTENT {
    name: "Carol Jansen", department: "Research",
    salary: 78000, hire_date: "2024-06-01"
};

-- Queries
SELECT name, salary FROM employee WHERE salary > 80000 ORDER BY salary DESC;
-- Bob (92000), Alice (85000)

SELECT department, math::mean(salary) AS avg_salary FROM employee GROUP BY department;

-- Subquery: employees in departments with budget > 400k
SELECT name, department FROM employee
WHERE department IN (SELECT VALUE name FROM department WHERE budget > 400000);
-- Alice and Bob (Engineering)

UPDATE employee:alice SET salary = 90000;
```

## 2. NoSQL / Document

Schemaless tables with nested objects, arrays, and record links.

```sql
DEFINE TABLE project SCHEMALESS;
DEFINE TABLE task SCHEMALESS;

CREATE project:indentiagraph CONTENT {
    name: "IndentiaGraph",
    status: "active",
    tags: ["database", "graph", "rdf", "lpg"],
    metadata: {
        created: "2024-01-15",
        lead: "Alice",
        priority: "high"
    },
    milestones: [
        { name: "v1.0", date: "2025-06-01", completed: true },
        { name: "v2.0", date: "2026-03-01", completed: false }
    ]
};

CREATE task:lpg_csr CONTENT {
    title: "Implement CSR adjacency",
    project: project:indentiagraph,
    assignee: "Bob", status: "done",
    labels: ["performance", "lpg"]
};
CREATE task:lpg_pagerank CONTENT {
    title: "Add PageRank algorithm",
    project: project:indentiagraph,
    assignee: "Bob", status: "done",
    labels: ["algorithm", "lpg"],
    depends_on: [task:lpg_csr]
};
CREATE task:acl_integration CONTENT {
    title: "ACL integration for LPG",
    project: project:indentiagraph,
    assignee: "Carol", status: "in_progress",
    labels: ["security", "lpg"]
};

-- Nested field access
SELECT name, metadata.lead FROM project WHERE status = "active";
-- "IndentiaGraph", lead: "Alice"

-- Array contains
SELECT title, assignee FROM task WHERE labels CONTAINS "lpg";
-- 3 tasks

-- Nested array filter
SELECT milestones[WHERE completed = true] AS done FROM project:indentiagraph;
-- [{name: "v1.0", ...}]

-- Record link traversal
SELECT title, project.name AS project_name FROM task WHERE assignee = "Bob";
-- Both of Bob's tasks show project_name: "IndentiaGraph"
```

## 3. Graph RDF

RDF triples stored in the `triples` table with subject/predicate/object structure.

```sql
-- Ontology: Person class
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/Person" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://www.w3.org/2002/07/owl#Class" },
    graph: "default"
};

-- Instances with properties and relationships
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/Person" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://xmlns.com/foaf/0.1/name",
    object: { "_rdf_type": "Literal", "value": "Alice van den Berg",
              "datatype": "http://www.w3.org/2001/XMLSchema#string" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://xmlns.com/foaf/0.1/knows",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/bob" },
    graph: "default"
};

-- (Similar triples for bob and carol...)

-- Query: find all Person instances
SELECT subject.iri AS person FROM triples
WHERE predicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
  AND object.iri = "http://example.org/Person";

-- Query: who does Alice know?
SELECT object.iri AS friend FROM triples
WHERE subject.iri = "http://example.org/alice"
  AND predicate = "http://xmlns.com/foaf/0.1/knows";
-- "http://example.org/bob"

-- Query: get Alice's name
SELECT object.value AS name FROM triples
WHERE subject.iri = "http://example.org/alice"
  AND predicate = "http://xmlns.com/foaf/0.1/name";
-- "Alice van den Berg"
```

## 4. Graph LPG

Project RDF triples into an LPG for traversals, shortest path, PageRank, and connected components.

**RDF data:** alice knows bob, bob knows carol (all Person-typed).

**LPG Traverse (1-hop from Alice):**

```json
{
  "kind": {
    "Traverse": {
      "start": { "iri": "http://example.org/alice" },
      "edge": "knows",
      "direction": "Out",
      "min_hops": 1, "max_hops": 1,
      "target_label": "Person"
    }
  },
  "limit": 10,
  "return_fields": ["id", "hop_count"]
}
```

**Result:** bob (1 hop)

**LPG Traverse (2-hop, friends-of-friends):**
Same query with `max_hops: 2`.
**Result:** bob (1 hop), carol (2 hops)

**Shortest Path (Alice to Carol):**

```json
{
  "kind": {
    "ShortestPath": {
      "start": { "iri": "http://example.org/alice" },
      "target": { "iri": "http://example.org/carol" },
      "edge": "knows",
      "direction": "Out"
    }
  }
}
```

**Result:** length = 2

**PageRank:** Scores sum to ~1.0. All connected Person nodes contribute.

**Connected Components:** All Person nodes (alice, bob, carol) are in one component.

## 5. Combined: Document + RDF + LPG in One Transaction

This is the key multi-model pattern. A single transaction spans:

- **RDF triples** for semantic types (alice/bob are Person)
- **Document table** (`hr_employee`) for business data (salary, department)
- **LPG projection** that merges both sources into a unified graph

### Setup

```sql
-- RDF: alice and bob are Person instances
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/alice" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/Person" },
    graph: "default"
};
CREATE triples CONTENT {
    subject: { "_rdf_type": "NamedNode", "iri": "http://example.org/bob" },
    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    object: { "_rdf_type": "NamedNode", "iri": "http://example.org/Person" },
    graph: "default"
};

-- Document: HR employee data with RDF IRI linkage
DEFINE TABLE hr_employee SCHEMALESS;
CREATE hr_employee:alice CONTENT {
    name: "Alice van den Berg",
    rdf_iri: "http://example.org/alice",
    department: "Engineering",
    salary: 85000,
    colleague_iri: "http://example.org/bob"
};
CREATE hr_employee:bob CONTENT {
    name: "Bob de Vries",
    rdf_iri: "http://example.org/bob",
    department: "Engineering",
    salary: 92000
};
```

### LPG Projection Config

```json
{
  "document_rules": [{
    "table": "hr_employee",
    "label": "Employee",
    "iri_field": "rdf_iri",
    "include_fields": ["name", "department", "salary", "rdf_iri"],
    "edge_fields": [{
      "field": "colleague_iri",
      "edge_type": "colleague"
    }]
  }]
}
```

### Result After Projection

Alice's LPG node has:

- **Labels:** `["Person", "Employee"]` (Person from RDF, Employee from document rule)
- **Properties:** `{department: "Engineering", salary: 85000, name: "Alice van den Berg"}`
- **Edges:** `colleague -> bob`

### Traverse Colleague Edges

```json
{
  "kind": {
    "Traverse": {
      "start": { "iri": "http://example.org/alice" },
      "edge": "colleague",
      "direction": "Out",
      "min_hops": 1, "max_hops": 1,
      "target_label": "Employee"
    }
  },
  "limit": 10,
  "return_fields": ["id", "name", "department"]
}
```

**Result:** `{id: "http://example.org/bob", name: "Bob de Vries", department: "Engineering"}`

### Incremental RDF Delta

Add a new RDF type for Alice without rebuilding:

```sparql
PREFIX ex: <http://example.org/>
INSERT DATA {
    ex:alice a ex:Manager .
}
```

**Result:** Alice now has labels `["Person", "Employee", "Manager"]`. Document properties are preserved.

### Incremental Document Delta

Update Bob's salary:

```sql
UPDATE hr_employee:bob SET salary = 105000;
```

**Result:** Bob's salary property in the LPG updates to 105000. All other labels and properties are preserved.

### Final Graph Analysis

After both deltas:

- **PageRank:** Computed across the combined graph (RDF edges + document edges)
- **Connected Components** (Employee filter): Alice and Bob are in one component (connected via colleague edge)

### Key Takeaway

The multi-model architecture means you do not need to choose between a graph database, a document store, an RDF triple store, and a relational database. IndentiaDB unifies all four models:

| Model | Use For |
|-------|---------|
| Relational / SQL | Structured data with typed schemas, aggregates, and joins |
| NoSQL / Document | Flexible, heterogeneous records with nested fields and arrays |
| RDF Triple Store | Semantic knowledge representation, ontologies, SPARQL queries |
| LPG | Graph algorithms (PageRank, shortest path, connected components) over combined data |

All models share the same storage engine, the same transaction system, and the same security layer.
