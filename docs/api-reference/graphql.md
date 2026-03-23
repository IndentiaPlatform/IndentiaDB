# GraphQL API

IndentiaDB exposes a GraphQL interface alongside its SPARQL and REST APIs, providing a structured, typed query language for RDF data. The GraphQL layer automatically generates a schema from your RDF ontology (OWL/RDFS) or SHACL shape definitions, translates GraphQL queries into SPARQL behind the scenes, and maps results back to the familiar GraphQL response format -- complete with filtering, pagination, sorting, mutations, and full introspection support.

---

## Endpoint

The GraphQL API is available on the IndentiaDB server port (default `7001`):

| Path | Method | Description |
|------|--------|-------------|
| `/graphql` | `POST` | Execute GraphQL queries and mutations |
| `/graphql` | `GET` | GraphQL Playground (browser) |
| `/graphql/schema` | `GET` | Download the generated SDL schema |

```bash
curl -X POST http://localhost:7001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "{ persons(first: 10) { edges { node { id name email } } } }"
  }'
```

---

## Schema Generation

The GraphQL schema is generated dynamically from your data's ontology or SHACL shapes. You do not write a GraphQL schema by hand -- IndentiaDB derives it from the RDF structure already in the store.

### From RDF Ontology (OWL/RDFS)

When your store contains OWL or RDFS class and property definitions, IndentiaDB maps them to GraphQL types:

| RDF Concept | GraphQL Mapping |
|-------------|-----------------|
| `owl:Class` / `rdfs:Class` | Object type |
| `rdfs:domain` + `rdfs:range` | Field on the domain type |
| `owl:FunctionalProperty` | Non-list field |
| `rdfs:subClassOf` | Interface type |
| XSD datatypes | Scalar types (`String`, `Int`, `Float`, `Boolean`, `DateTime`, `Date`, `Time`) |

**Example ontology (Turtle):**

```turtle
@prefix owl:    <http://www.w3.org/2002/07/owl#> .
@prefix rdfs:   <http://www.w3.org/2000/01/rdf-schema#> .
@prefix schema: <http://schema.org/> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .

schema:Person a owl:Class ;
    rdfs:label "Person" .

schema:Organization a owl:Class ;
    rdfs:label "Organization" .

schema:name a owl:DatatypeProperty ;
    rdfs:domain schema:Person ;
    rdfs:range xsd:string .

schema:age a owl:DatatypeProperty, owl:FunctionalProperty ;
    rdfs:domain schema:Person ;
    rdfs:range xsd:integer .

schema:worksFor a owl:ObjectProperty ;
    rdfs:domain schema:Person ;
    rdfs:range schema:Organization .
```

**Generated GraphQL schema:**

```graphql
type Person {
  id: ID!
  name: [String!]
  age: Int
  worksFor: [Organization!]
}

type Organization {
  id: ID!
}
```

### From SHACL Shapes

SHACL shapes provide more precise control over the generated schema because they include cardinality constraints, datatypes, and value restrictions:

| SHACL Concept | GraphQL Mapping |
|---------------|-----------------|
| `sh:NodeShape` + `sh:targetClass` | Object type |
| `sh:PropertyShape` + `sh:path` | Field |
| `sh:minCount 1` | Non-nullable field (`!`) |
| `sh:maxCount 1` | Scalar field (not a list) |
| `sh:datatype` | Scalar type |
| `sh:node` | Object type reference |
| `sh:in` | Enum type |
| `sh:name` | Field name override |
| `sh:description` | Field description |

```turtle
ex:PersonShape
    a sh:NodeShape ;
    sh:targetClass schema:Person ;
    sh:property [
        sh:path schema:name ;
        sh:name "name" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:datatype xsd:string ;
    ] ;
    sh:property [
        sh:path schema:email ;
        sh:name "email" ;
        sh:minCount 1 ;
        sh:datatype xsd:string ;
    ] ;
    sh:property [
        sh:path schema:status ;
        sh:name "status" ;
        sh:maxCount 1 ;
        sh:in ( "active" "inactive" "suspended" ) ;
    ] .
```

**Generated GraphQL schema:**

```graphql
type Person {
  id: ID!
  name: String!
  email: [String!]!
  status: PersonStatus
}

enum PersonStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

### XSD to GraphQL Scalar Mapping

| XSD Datatype | GraphQL Scalar |
|-------------|----------------|
| `xsd:string` | `String` |
| `xsd:integer`, `xsd:int`, `xsd:long`, `xsd:short`, `xsd:byte` | `Int` |
| `xsd:decimal`, `xsd:float`, `xsd:double` | `Float` |
| `xsd:boolean` | `Boolean` |
| `xsd:dateTime` | `DateTime` |
| `xsd:date` | `Date` |
| `xsd:time` | `Time` |

!!! tip "Schema Refresh"
    After modifying your ontology or SHACL shapes, call `POST /graphql/schema/refresh` to regenerate the GraphQL schema without restarting the server.

---

## Queries

### Basic Query

```graphql
query {
  persons {
    edges {
      node {
        id
        name
        email
      }
    }
  }
}
```

**Response:**

```json
{
  "data": {
    "persons": {
      "edges": [
        {
          "node": {
            "id": "http://example.org/person/1",
            "name": "Alice",
            "email": ["alice@example.org"]
          }
        },
        {
          "node": {
            "id": "http://example.org/person/2",
            "name": "Bob",
            "email": ["bob@example.org", "robert@company.com"]
          }
        }
      ]
    }
  }
}
```

### Filtering

Filter results using field-level arguments:

```graphql
query {
  persons(filter: {
    name: { eq: "Alice" }
  }) {
    edges {
      node {
        id
        name
        email
      }
    }
  }
}
```

**Available filter operators:**

| Operator | Description | Applicable Types |
|----------|-------------|-----------------|
| `eq` | Equals | All |
| `ne` | Not equals | All |
| `gt` | Greater than | Int, Float, DateTime, Date |
| `gte` | Greater than or equal | Int, Float, DateTime, Date |
| `lt` | Less than | Int, Float, DateTime, Date |
| `lte` | Less than or equal | Int, Float, DateTime, Date |
| `in` | Value in list | All |
| `contains` | String contains | String |
| `startsWith` | String starts with | String |
| `regex` | Regular expression match | String |

```graphql
query {
  persons(filter: {
    age: { gte: 18, lt: 65 }
    name: { startsWith: "A" }
  }) {
    edges {
      node {
        id
        name
        age
      }
    }
  }
}
```

### Pagination

IndentiaDB uses Relay-style cursor-based pagination:

```graphql
query {
  persons(first: 10, after: "cursor_abc123") {
    edges {
      cursor
      node {
        id
        name
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

| Argument | Description |
|----------|-------------|
| `first` | Return the first N results |
| `after` | Return results after this cursor |
| `last` | Return the last N results |
| `before` | Return results before this cursor |

### Sorting

```graphql
query {
  persons(orderBy: { field: "name", direction: ASC }, first: 20) {
    edges {
      node {
        id
        name
        age
      }
    }
  }
}
```

### Nested Objects

Traverse relationships by nesting fields:

```graphql
query {
  persons(first: 5) {
    edges {
      node {
        id
        name
        worksFor {
          id
          name
          address {
            city
            country
          }
        }
      }
    }
  }
}
```

The GraphQL translator converts nested field selections into SPARQL joins automatically.

### Named Graphs

Query data from a specific named graph:

```graphql
query {
  persons(graph: "http://example.org/data/2024") {
    edges {
      node {
        id
        name
      }
    }
  }
}
```

---

## Mutations

### Create

Insert a new resource:

```graphql
mutation {
  createPerson(input: {
    id: "http://example.org/person/42"
    name: "Charlie"
    email: "charlie@example.org"
    age: 30
  }) {
    id
    name
    email
  }
}
```

The mutation is translated to SPARQL INSERT DATA:

```sparql
INSERT DATA {
  <http://example.org/person/42> a <http://schema.org/Person> .
  <http://example.org/person/42> <http://schema.org/name> "Charlie" .
  <http://example.org/person/42> <http://schema.org/email> "charlie@example.org" .
  <http://example.org/person/42> <http://schema.org/age> 30 .
}
```

!!! note "Automatic IRI Generation"
    If you omit the `id` field, IndentiaDB generates a UUID-based IRI: `{base_iri}/{TypeName}/{uuid}`.

### Update

Update an existing resource:

```graphql
mutation {
  updatePerson(input: {
    id: "http://example.org/person/42"
    email: "new-charlie@example.org"
    age: 31
  }) {
    id
    email
    age
  }
}
```

This is translated to a SPARQL DELETE/INSERT:

```sparql
DELETE {
  <http://example.org/person/42> <http://schema.org/email> ?old_email .
  <http://example.org/person/42> <http://schema.org/age> ?old_age .
}
INSERT {
  <http://example.org/person/42> <http://schema.org/email> "new-charlie@example.org" .
  <http://example.org/person/42> <http://schema.org/age> 31 .
}
WHERE {
  OPTIONAL { <http://example.org/person/42> <http://schema.org/email> ?old_email . }
  OPTIONAL { <http://example.org/person/42> <http://schema.org/age> ?old_age . }
}
```

### Delete

Remove a resource and all its triples:

```graphql
mutation {
  deletePerson(id: "http://example.org/person/42") {
    success
  }
}
```

Translated to:

```sparql
DELETE WHERE {
  <http://example.org/person/42> ?p ?o .
}
```

!!! warning "Cascading Deletes"
    Delete mutations only remove triples where the target IRI is the subject. Triples that reference the deleted IRI as an object are not automatically removed. Handle cascading deletes at the application level.

---

## Subscriptions

IndentiaDB supports GraphQL subscriptions over WebSocket for real-time data updates. Subscriptions use the `graphql-ws` protocol (compatible with Apollo Client, urql, and other standard clients).

### WebSocket Endpoint

Connect to `ws://localhost:7001/graphql/ws` using the `graphql-transport-ws` sub-protocol.

### Subscribe to Changes

```graphql
subscription {
  personChanged {
    mutationType   # CREATED | UPDATED | DELETED
    node {
      id
      name
      email
    }
  }
}
```

Subscriptions are backed by IndentiaDB's live query engine. When a SPARQL INSERT, UPDATE, or DELETE modifies triples matching the subscription's selection set, the server pushes the updated data to all connected subscribers.

---

## Introspection

Full GraphQL introspection is supported. Use it to explore the generated schema programmatically:

```graphql
query {
  __schema {
    types {
      name
      kind
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
}
```

**Explore a specific type:**

```graphql
query {
  __type(name: "Person") {
    name
    fields {
      name
      type {
        name
        kind
        ofType {
          name
        }
      }
      description
    }
  }
}
```

!!! tip "GraphQL Playground"
    Navigate to `http://localhost:7001/graphql` in your browser to access the interactive GraphQL Playground, which provides auto-completion, documentation, and query history.

---

## Authentication

The GraphQL endpoint uses the same authentication mechanism as the REST and SPARQL APIs. Include the `Authorization` header with a bearer token:

```bash
curl -X POST http://localhost:7001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "{ persons { edges { node { id name } } } }"}'
```

When RBAC is enabled, GraphQL queries and mutations respect the same access control rules as SPARQL queries. A user who cannot read a named graph via SPARQL also cannot access its data through GraphQL.

---

## Configuration

```toml
[graphql]
# Enable the GraphQL endpoint
enabled = true

# Port (shared with REST API)
# port = 7001

# Schema generation source: "ontology", "shacl", or "combined"
schema_source = "combined"

# Base IRI for auto-generated resource IRIs in mutations
base_iri = "http://example.org/data/"

# Enable GraphQL Playground in the browser
playground = true

# Enable introspection queries
introspection = true

# Enable subscriptions (WebSocket)
subscriptions = true

# Maximum query depth (prevents deeply nested queries)
max_depth = 15

# Maximum query complexity score
max_complexity = 1000

# Default page size for connections
default_page_size = 25

# Maximum page size for connections
max_page_size = 100
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | bool | `true` | Enable/disable the GraphQL endpoint |
| `schema_source` | string | `"combined"` | Where to derive the schema from |
| `base_iri` | string | `"http://example.org/"` | Base IRI for auto-generated IRIs |
| `playground` | bool | `true` | Serve the interactive playground |
| `introspection` | bool | `true` | Allow `__schema` / `__type` queries |
| `subscriptions` | bool | `true` | Enable WebSocket subscriptions |
| `max_depth` | int | `15` | Maximum nesting depth for queries |
| `max_complexity` | int | `1000` | Maximum computed complexity score |
| `default_page_size` | int | `25` | Default `first` value for connections |
| `max_page_size` | int | `100` | Maximum `first` / `last` value |

---

## JavaScript / TypeScript Client Example

```typescript
import { ApolloClient, InMemoryCache, gql, HttpLink } from "@apollo/client/core";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "http://localhost:7001/graphql",
    headers: {
      Authorization: "Bearer <token>",
    },
  }),
  cache: new InMemoryCache(),
});

// Query
const result = await client.query({
  query: gql`
    query GetPersons($first: Int!, $filter: PersonFilter) {
      persons(first: $first, filter: $filter) {
        edges {
          node {
            id
            name
            email
            age
            worksFor {
              id
              name
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
    }
  `,
  variables: {
    first: 10,
    filter: { age: { gte: 18 } },
  },
});

console.log(`Found ${result.data.persons.totalCount} persons`);
for (const edge of result.data.persons.edges) {
  console.log(`  ${edge.node.name} (${edge.node.email.join(", ")})`);
}

// Mutation
const createResult = await client.mutate({
  mutation: gql`
    mutation CreatePerson($input: CreatePersonInput!) {
      createPerson(input: $input) {
        id
        name
      }
    }
  `,
  variables: {
    input: {
      name: "Diana",
      email: "diana@example.org",
      age: 28,
    },
  },
});

console.log(`Created: ${createResult.data.createPerson.id}`);
```

---

## Python Client Example

```python
import requests

GRAPHQL_URL = "http://localhost:7001/graphql"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer <token>",
}


def graphql(query: str, variables: dict = None) -> dict:
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    resp = requests.post(GRAPHQL_URL, headers=HEADERS, json=payload)
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise Exception(f"GraphQL errors: {data['errors']}")
    return data["data"]


# Query all persons
data = graphql("""
    query($first: Int!) {
        persons(first: $first) {
            edges {
                node {
                    id
                    name
                    email
                    age
                }
            }
            totalCount
        }
    }
""", variables={"first": 50})

print(f"Total persons: {data['persons']['totalCount']}")
for edge in data["persons"]["edges"]:
    p = edge["node"]
    print(f"  {p['name']} - {p['email']}")


# Create a person
data = graphql("""
    mutation($input: CreatePersonInput!) {
        createPerson(input: $input) {
            id
            name
        }
    }
""", variables={
    "input": {
        "name": "Eve",
        "email": "eve@example.org",
        "age": 25,
    }
})

print(f"Created: {data['createPerson']['id']}")
```

---

## Error Handling

GraphQL errors follow the standard GraphQL error format:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Validation failed: Unknown field 'foo' on type 'Person'",
      "locations": [{ "line": 3, "column": 5 }],
      "path": ["createPerson"],
      "extensions": {
        "code": "VALIDATION_FAILED",
        "details": "Field 'foo' is not defined in the schema for type 'Person'"
      }
    }
  ]
}
```

**Error codes in `extensions.code`:**

| Code | Description |
|------|-------------|
| `VALIDATION_FAILED` | Input validation error |
| `NOT_FOUND` | Resource not found (update/delete) |
| `CONFLICT` | Concurrent modification detected |
| `SPARQL_ERROR` | Underlying SPARQL query failed |
| `UNKNOWN_TYPE` | Type not found in the generated schema |
| `DEPTH_EXCEEDED` | Query exceeds `max_depth` |
| `COMPLEXITY_EXCEEDED` | Query exceeds `max_complexity` |
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Insufficient permissions |

---

## Architecture: GraphQL to SPARQL Translation

Understanding how the translation works helps you write efficient queries:

```
GraphQL Query                    SPARQL Query
─────────────                    ────────────
{                                SELECT ?id ?name ?email
  persons(first: 10) {    →     WHERE {
    edges {                        ?id a schema:Person .
      node {                       ?id schema:name ?name .
        id                         OPTIONAL { ?id schema:email ?email }
        name                     }
        email                    LIMIT 10
      }
    }
  }
}
```

The translator:

1. Maps the root field (`persons`) to the corresponding RDF class (`schema:Person`).
2. Generates SPARQL triple patterns for each selected field.
3. Wraps optional fields (non-required) in `OPTIONAL` blocks.
4. Adds `FILTER` clauses for filter arguments.
5. Adds `ORDER BY` for sorting arguments.
6. Adds `LIMIT` / `OFFSET` for pagination.
7. Executes the SPARQL query against the store.
8. Maps SPARQL result bindings back to GraphQL response objects.

!!! note "Object Properties Become Joins"
    Selecting a nested object field (e.g., `worksFor { name }`) generates additional triple patterns that effectively join across the relationship. Deep nesting creates multi-hop joins, which is why `max_depth` exists as a safeguard.
