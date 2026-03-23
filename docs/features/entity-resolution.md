# Entity Resolution

IndentiaDB includes a built-in entity resolution and master data management (MDM) engine that detects, matches, and merges duplicate entities across multiple source systems. Whether you are consolidating customer records from CRM and ERP systems, linking organizations across government databases, or deduplicating product catalogs, the entity resolution engine provides configurable matching algorithms, survivorship rules for merge conflicts, a review queue for uncertain matches, and integration with the knowledge graph through `owl:sameAs` links and the `mdm:` vocabulary.

---

## Architecture

The entity resolution pipeline follows a standard MDM workflow:

```text
+--------------+     +--------------+     +--------------+
|   Sources    |---->|   Blocking   |---->|  Comparator  |
| Source A/B/C |     | Candidate    |     | Similarity   |
|              |     | Generation   |     | Scoring      |
+--------------+     +--------------+     +------+-------+
                                                 |
                                                 v
                                          +--------------+
                                          |  Classifier  |
                                          | Match / No / |
                                          | Possible     |
                                          +------+-------+
                                                 |
                    +----------------------------+----------------------------+
                    |                            |                            |
                    v                            v                            v
             +--------------+           +--------------+           +--------------+
             |   Merger     |           |   Review     |           |   Create     |
             | Survivorship |           |   Queue      |           |   Golden     |
             | Rules        |           |              |           |   Record     |
             +------+-------+           +--------------+           +--------------+
                    |
                    v
             +--------------+
             |   Golden     |
             |   Record     |
             |   + XRefs    |
             +--------------+
```

1. **Blocking** reduces the O(n^2) comparison space by grouping entities that share blocking keys.
2. **Comparison** scores attribute-level similarity using configurable algorithms.
3. **Classification** categorizes each entity pair as Match, PossibleMatch, or NoMatch based on thresholds.
4. **Merging** combines matched entities into a golden record using survivorship rules.
5. **Review** queues uncertain matches for human decision-making.

---

## Core Concepts

### Source Entities

A source entity represents a record from an originating system. Each entity has a source identifier, entity type, and a set of typed attributes:

```json
{
  "id": "crm-12345",
  "source": "crm",
  "entity_type": "Person",
  "attributes": {
    "firstName": {"type": "String", "value": "John"},
    "lastName": {"type": "String", "value": "Smith"},
    "email": {"type": "String", "value": "john.smith@example.com"},
    "dateOfBirth": {"type": "Date", "value": "1985-06-15T00:00:00Z"},
    "active": {"type": "Boolean", "value": true}
  },
  "loaded_at": "2026-03-23T10:00:00Z"
}
```

### Attribute Value Types

| Type | Description | Example |
|------|-------------|---------|
| `String` | Text value | `"John Smith"` |
| `Number` | Numeric value (f64) | `42.0` |
| `Boolean` | True/false | `true` |
| `Date` | ISO 8601 datetime | `"1985-06-15T00:00:00Z"` |
| `List` | Array of values | `["customer", "premium"]` |
| `Nested` | Key-value map | `{"street": "123 Main St", "city": "Springfield"}` |
| `Null` | Missing/unknown | `null` |

### Golden Records

A golden record is the single authoritative representation of an entity, created by merging one or more source entities. It maintains cross-references (XRefs) back to all contributing source entities:

```json
{
  "golden_id": "golden_001",
  "entity_type": "Person",
  "attributes": {
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@example.com",
    "phone": "+1-555-0123"
  },
  "source_entities": ["crm-12345", "erp-67890", "api-ext-111"],
  "created_at": "2026-03-23T10:00:00Z",
  "updated_at": "2026-03-23T14:30:00Z"
}
```

---

## Blocking (Candidate Generation)

Blocking is a performance optimization that avoids comparing every entity pair. Instead, entities are grouped into "blocks" based on shared characteristics. Only entities within the same block are compared.

### Blocking Rules

Each blocking rule specifies which attributes to use and an optional transform:

```json
{
  "name": "name_soundex",
  "attributes": ["lastName"],
  "transform": "Soundex"
}
```

### Blocking Transforms

| Transform | Description | Example Input | Example Output |
|-----------|-------------|---------------|----------------|
| `Lower` | Lowercase normalization | `"Smith"` | `"smith"` |
| `Prefix(n)` | First N characters | `"john.smith@example.com"` | `"joh"` (n=3) |
| `Soundex` | Phonetic encoding | `"Smith"`, `"Smyth"` | `"S530"`, `"S530"` |
| `Metaphone` | Phonetic encoding (more accurate) | `"Smith"`, `"Schmidt"` | `"SM0"`, `"SM0"` (varies) |
| `Year` | Extract year from date | `"1985-06-15"` | `"1985"` |
| `Normalize` | Whitespace normalization | `"  John   Smith  "` | `"John Smith"` |

!!! tip "Multiple blocking rules"
    Define multiple blocking rules to increase recall. Entities that share a blocking key on *any* rule will be compared. For example, block on both `lastName` Soundex and `email` prefix to catch matches even when names are misspelled.

### How Blocking Keys Work

```text
Source Entities:
  crm-12345:  lastName="Smith"     --> Soundex key: "S530"
  erp-67890:  lastName="Smyth"     --> Soundex key: "S530"  (same block!)
  api-ext-111: lastName="Johnson"  --> Soundex key: "J525"  (different block)

Candidate pairs generated:
  (crm-12345, erp-67890)  -- same block "S530"
  (crm-12345, api-ext-111) -- skipped, different blocks
```

---

## Comparison Methods

Once candidate pairs are generated, IndentiaDB compares their attributes using configurable similarity algorithms:

### Built-in Comparators

| Method | Best For | Score Range | Description |
|--------|----------|-------------|-------------|
| `Exact` | Identifiers, codes | 0.0 or 1.0 | Exact string match |
| `Levenshtein` | Addresses, general text | 0.0 -- 1.0 | Edit distance normalized to similarity |
| `JaroWinkler` | Person names | 0.0 -- 1.0 | String similarity with prefix bonus |
| `NGram` | Long text, addresses | 0.0 -- 1.0 | N-gram Jaccard similarity |
| `Soundex` | Names (phonetic) | 0.0 or 1.0 | Phonetic code comparison |
| `NumericDifference` | Ages, amounts | 0.0 -- 1.0 | Proximity within max_diff |
| `DateProximity` | Dates of birth | 0.0 -- 1.0 | Proximity within max_days |
| `Custom` | Domain-specific | 0.0 -- 1.0 | User-registered comparator |

### Comparison Rules

Each comparison rule specifies an attribute, a comparison method, a weight (all weights must sum to 1.0), and a missing-value handling strategy:

```json
{
  "attribute": "firstName",
  "method": {"JaroWinkler": {"threshold": 0.8}},
  "weight": 0.3,
  "missing": "Neutral"
}
```

### Missing Value Handling

| Strategy | Score When Missing | Use Case |
|----------|--------------------|----------|
| `NoMatch` | 0.0 | Critical attribute -- missing should penalize |
| `Match` | 1.0 | Optional attribute -- missing should not penalize |
| `Neutral` | 0.5 | Balanced approach (default) |
| `Skip` | (weight redistributed) | Optional attribute -- exclude from scoring entirely |

---

## Match Classification

After computing the weighted similarity score, entity pairs are classified into three categories:

| Classification | Score Range (default) | Action |
|---------------|----------------------|--------|
| **Match** | >= 0.85 | Automatically merged (if `auto_merge` is enabled) |
| **PossibleMatch** | 0.65 -- 0.85 | Sent to review queue for human decision |
| **NoMatch** | < 0.65 | No action taken |

### Configuring Thresholds

```json
{
  "thresholds": {
    "match_threshold": 0.85,
    "possible_match_threshold": 0.65
  }
}
```

!!! warning "Threshold tuning"
    Start with conservative thresholds (high match, lower possible-match) and tune based on review queue results. Lowering the match threshold increases automatic merges but risks false positives. Use the match results audit log to analyze false positive and false negative rates.

---

## Match Configuration

A complete match configuration defines blocking rules, comparison rules, and thresholds for a specific entity type:

```json
{
  "entity_type": "Person",
  "blocking_rules": [
    {
      "name": "name_soundex",
      "attributes": ["lastName"],
      "transform": "Soundex"
    },
    {
      "name": "email_prefix",
      "attributes": ["email"],
      "transform": {"Prefix": 5}
    }
  ],
  "comparison_rules": [
    {
      "attribute": "firstName",
      "method": {"JaroWinkler": {"threshold": 0.8}},
      "weight": 0.25,
      "missing": "Neutral"
    },
    {
      "attribute": "lastName",
      "method": {"JaroWinkler": {"threshold": 0.8}},
      "weight": 0.25,
      "missing": "NoMatch"
    },
    {
      "attribute": "email",
      "method": "Exact",
      "weight": 0.25,
      "missing": "Skip"
    },
    {
      "attribute": "dateOfBirth",
      "method": {"DateProximity": {"max_days": 1}},
      "weight": 0.25,
      "missing": "Neutral"
    }
  ],
  "thresholds": {
    "match_threshold": 0.85,
    "possible_match_threshold": 0.65
  }
}
```

!!! note "Weight validation"
    Comparison rule weights must sum to 1.0 (with a tolerance of 0.01). IndentiaDB validates this at configuration time and rejects invalid configurations.

---

## Survivorship Rules

When merging entities from multiple sources, attribute values may conflict. Survivorship rules determine which value "wins" and becomes the golden record value.

### Available Rules

| Rule | Description | Best For |
|------|-------------|----------|
| `MostRecent` | Value from the most recently loaded entity wins | General purpose, frequently updated data |
| `First` | Original (earliest loaded) value wins | Stable identifiers, creation dates |
| `SourcePriority` | Value from the highest priority source wins | Known authoritative sources |
| `Longest` | Longest string value wins | Addresses, descriptions |
| `Shortest` | Shortest string value wins | Codes, abbreviations |
| `MostFrequent` | Most common value across sources wins | Consensus-based attributes |
| `Union` | Combine all values into a list | Tags, categories, multi-valued attributes |
| `Coalesce` | Keep all values as a list (preserving source info) | Audit trail, all-values-matter scenarios |

### Survivorship Configuration

```json
{
  "entity_type": "Person",
  "rules": {
    "email": "MostRecent",
    "firstName": "SourcePriority",
    "lastName": "SourcePriority",
    "phone": "MostRecent",
    "tags": "Union",
    "dateOfBirth": "First"
  },
  "source_priority": ["crm", "erp", "external-api"],
  "default_rule": "MostRecent"
}
```

In this example:
- `email` and `phone` always use the most recently loaded value.
- `firstName` and `lastName` prefer CRM over ERP over external API.
- `tags` are merged into a union of all values.
- `dateOfBirth` keeps the original value.
- Any attribute not explicitly configured uses `MostRecent`.

---

## Review Queue

When the classifier returns a `PossibleMatch`, the entity pair is queued for human review:

### Review Item

```json
{
  "review_id": "rev_01HY...",
  "entity_a": "crm-12345",
  "entity_b": "erp-99999",
  "score": 0.72,
  "attribute_scores": {
    "firstName": 0.95,
    "lastName": 0.45,
    "email": 1.0,
    "dateOfBirth": 0.0
  },
  "classification": "PossibleMatch",
  "suggested_action": "Merge",
  "status": "pending",
  "created_at": "2026-03-23T10:00:00Z"
}
```

### Review Actions

| Action | Description |
|--------|-------------|
| `Merge` | Confirm the match and merge entities into a golden record |
| `KeepSeparate` | Reject the match; entities remain separate |

!!! tip "Suggested action"
    The review queue suggests `Merge` for scores >= 0.75 and `KeepSeparate` for lower scores. Reviewers can override the suggestion.

### Managing the Review Queue via REST API

```bash
# List pending reviews
curl "http://localhost:8000/api/entity-resolution/reviews?status=pending&limit=50"

# Get a specific review
curl http://localhost:8000/api/entity-resolution/reviews/rev_01HY...

# Approve (merge)
curl -X POST http://localhost:8000/api/entity-resolution/reviews/rev_01HY.../approve \
  -d '{"reviewer": "admin@example.com"}'

# Reject (keep separate)
curl -X POST http://localhost:8000/api/entity-resolution/reviews/rev_01HY.../reject \
  -d '{"reviewer": "admin@example.com"}'
```

---

## Ingesting Entities

### REST API

```bash
curl -X POST http://localhost:8000/api/entity-resolution/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "id": "crm-12345",
    "source": "crm",
    "entity_type": "Person",
    "attributes": {
      "firstName": {"type": "String", "value": "John"},
      "lastName": {"type": "String", "value": "Smith"},
      "email": {"type": "String", "value": "john.smith@example.com"}
    }
  }'
```

Response:

```json
{
  "action": "merged",
  "golden_id": "golden_001",
  "match_score": 0.92,
  "matched_entity": "erp-67890",
  "classification": "Match"
}
```

### Possible Ingest Actions

| Action | Description |
|--------|-------------|
| `Created` | No match found; new golden record created |
| `Merged` | Matched an existing entity; merged into golden record |
| `Queued` | Possible match found; sent to review queue |
| `Skipped` | Entity already exists in the system |

### Batch Ingestion

```bash
curl -X POST http://localhost:8000/api/entity-resolution/ingest/batch \
  -H "Content-Type: application/json" \
  -d '{
    "entities": [
      {
        "id": "crm-12345",
        "source": "crm",
        "entity_type": "Person",
        "attributes": {"firstName": {"type": "String", "value": "John"}, "lastName": {"type": "String", "value": "Smith"}}
      },
      {
        "id": "crm-12346",
        "source": "crm",
        "entity_type": "Person",
        "attributes": {"firstName": {"type": "String", "value": "Jane"}, "lastName": {"type": "String", "value": "Doe"}}
      }
    ]
  }'
```

---

## Knowledge Graph Integration

### owl:sameAs Links

When entities are merged, IndentiaDB can emit `owl:sameAs` triples linking the source entity IRIs to each other and to the golden record:

```turtle
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix mdm: <http://indentiagraph.io/mdm#> .

<urn:indentiagraph:mdm:source:crm:crm-12345>
    owl:sameAs <urn:indentiagraph:mdm:source:erp:erp-67890> ;
    mdm:inGoldenRecord <urn:indentiagraph:mdm:golden:golden_001> .

<urn:indentiagraph:mdm:source:erp:erp-67890>
    mdm:inGoldenRecord <urn:indentiagraph:mdm:golden:golden_001> .

<urn:indentiagraph:mdm:golden:golden_001>
    mdm:hasSourceEntity <urn:indentiagraph:mdm:source:crm:crm-12345> ,
                        <urn:indentiagraph:mdm:source:erp:erp-67890> .
```

### SPARQL Queries on MDM Data

**Find the golden record for a source entity:**

```sparql
PREFIX mdm: <http://indentiagraph.io/mdm#>

SELECT ?golden WHERE {
    <urn:indentiagraph:mdm:source:crm:crm-12345> mdm:inGoldenRecord ?golden .
}
```

**List all source entities for a golden record:**

```sparql
PREFIX mdm: <http://indentiagraph.io/mdm#>

SELECT ?source ?sourceSystem WHERE {
    <urn:indentiagraph:mdm:golden:golden_001> mdm:hasSourceEntity ?source .
    ?source mdm:sourceSystem ?sourceSystem .
}
```

**Find all match results with scores:**

```sparql
PREFIX mdm: <http://indentiagraph.io/mdm#>

SELECT ?entityA ?entityB ?score ?classification WHERE {
    ?match mdm:entityA ?entityA ;
           mdm:entityB ?entityB ;
           mdm:score ?score ;
           mdm:classification ?classification .
    FILTER(?score > 0.7)
}
ORDER BY DESC(?score)
```

**Cross-system entity lookup:**

```sparql
PREFIX mdm: <http://indentiagraph.io/mdm#>
PREFIX schema: <http://schema.org/>

SELECT ?crmName ?erpName ?email WHERE {
    ?golden mdm:hasSourceEntity ?crm, ?erp .
    ?crm mdm:sourceSystem "crm" .
    ?erp mdm:sourceSystem "erp" .
    ?crm schema:name ?crmName .
    ?erp schema:name ?erpName .
    OPTIONAL { ?golden schema:email ?email }
}
```

---

## SurrealQL Interface

Entity resolution data is also accessible via SurrealQL:

### Query Golden Records

```sql
SELECT * FROM golden_record
WHERE entity_type = "Person"
ORDER BY updated_at DESC
LIMIT 50;
```

### Find Source Entities for a Golden Record

```sql
SELECT * FROM source_entity
WHERE golden_id = "golden_001"
ORDER BY loaded_at;
```

### Review Match Results

```sql
SELECT * FROM match_result
WHERE classification = "PossibleMatch"
  AND score > 0.7
ORDER BY score DESC;
```

### Merge History

```sql
SELECT * FROM merge_event
WHERE golden_id = "golden_001"
ORDER BY merged_at DESC;
```

---

## Configuration

### Full Entity Resolution Configuration

```toml
[entity_resolution]
# Maximum candidates to compare per ingested entity (safety limit)
max_candidates = 1000

# Automatically merge definite matches
auto_merge = true

# Enable the review queue for possible matches
review_queue_enabled = true

# Persist match results for auditing and tuning
persist_match_results = true

# Persist blocking keys for candidate generation
persist_blocking_keys = true

# Match configuration for Person entities
[entity_resolution.match_configs.Person]
entity_type = "Person"

[[entity_resolution.match_configs.Person.blocking_rules]]
name = "name_soundex"
attributes = ["lastName"]
transform = "Soundex"

[[entity_resolution.match_configs.Person.blocking_rules]]
name = "email_prefix"
attributes = ["email"]
transform = { Prefix = 5 }

[[entity_resolution.match_configs.Person.comparison_rules]]
attribute = "firstName"
method = { JaroWinkler = { threshold = 0.8 } }
weight = 0.25
missing = "Neutral"

[[entity_resolution.match_configs.Person.comparison_rules]]
attribute = "lastName"
method = { JaroWinkler = { threshold = 0.8 } }
weight = 0.25
missing = "NoMatch"

[[entity_resolution.match_configs.Person.comparison_rules]]
attribute = "email"
method = "Exact"
weight = 0.25
missing = "Skip"

[[entity_resolution.match_configs.Person.comparison_rules]]
attribute = "dateOfBirth"
method = { DateProximity = { max_days = 1 } }
weight = 0.25
missing = "Neutral"

[entity_resolution.match_configs.Person.thresholds]
match_threshold = 0.85
possible_match_threshold = 0.65

# Survivorship configuration for Person entities
[entity_resolution.survivorship_configs.Person]
entity_type = "Person"
default_rule = "MostRecent"
source_priority = ["crm", "erp", "external-api"]

[entity_resolution.survivorship_configs.Person.rules]
email = "MostRecent"
firstName = "SourcePriority"
lastName = "SourcePriority"
phone = "MostRecent"
tags = "Union"
dateOfBirth = "First"

# Match configuration for Organization entities
[entity_resolution.match_configs.Organization]
entity_type = "Organization"

[[entity_resolution.match_configs.Organization.blocking_rules]]
name = "org_name_prefix"
attributes = ["name"]
transform = { Prefix = 4 }

[[entity_resolution.match_configs.Organization.comparison_rules]]
attribute = "name"
method = { NGram = { n = 3, threshold = 0.7 } }
weight = 0.4
missing = "NoMatch"

[[entity_resolution.match_configs.Organization.comparison_rules]]
attribute = "registrationNumber"
method = "Exact"
weight = 0.4
missing = "Skip"

[[entity_resolution.match_configs.Organization.comparison_rules]]
attribute = "country"
method = "Exact"
weight = 0.2
missing = "Neutral"

[entity_resolution.match_configs.Organization.thresholds]
match_threshold = 0.90
possible_match_threshold = 0.70
```

---

## Examples

### End-to-End: Customer Deduplication

```python
import requests

BASE = "http://localhost:8000/api/entity-resolution"

# Step 1: Ingest entity from CRM
result = requests.post(f"{BASE}/ingest", json={
    "id": "crm-12345",
    "source": "crm",
    "entity_type": "Person",
    "attributes": {
        "firstName": {"type": "String", "value": "John"},
        "lastName": {"type": "String", "value": "Smith"},
        "email": {"type": "String", "value": "john.smith@example.com"},
        "phone": {"type": "String", "value": "+1-555-0123"}
    }
}).json()
print(f"CRM entity: {result['action']} -> golden_id={result['golden_id']}")

# Step 2: Ingest entity from ERP (same person, slightly different data)
result = requests.post(f"{BASE}/ingest", json={
    "id": "erp-67890",
    "source": "erp",
    "entity_type": "Person",
    "attributes": {
        "firstName": {"type": "String", "value": "Jon"},
        "lastName": {"type": "String", "value": "Smyth"},
        "email": {"type": "String", "value": "john.smith@example.com"},
        "phone": {"type": "String", "value": "+1-555-0124"}
    }
}).json()
print(f"ERP entity: {result['action']} -> golden_id={result['golden_id']}")
# Output: "ERP entity: merged -> golden_id=golden_001"
# (matched on email + phonetic name similarity)

# Step 3: Check the golden record
golden = requests.get(f"{BASE}/golden/{result['golden_id']}").json()
print(f"Golden record: {golden['attributes']}")
# firstName="John" (from CRM, higher source priority)
# lastName="Smith" (from CRM, higher source priority)
# email="john.smith@example.com" (most recent)
# phone="+1-555-0124" (most recent, from ERP)
```

### Linking Entities Across Knowledge Graphs

```sparql
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX mdm: <http://indentiagraph.io/mdm#>
PREFIX schema: <http://schema.org/>

# Find all entities that have been linked across systems
SELECT ?golden ?sourceA ?sourceB ?systemA ?systemB WHERE {
    ?golden mdm:hasSourceEntity ?sourceA, ?sourceB .
    ?sourceA mdm:sourceSystem ?systemA .
    ?sourceB mdm:sourceSystem ?systemB .
    FILTER(?systemA < ?systemB)
}
```

### Auditing Match Decisions

```sql
-- Review all match results for a specific entity
SELECT
    entity_a,
    entity_b,
    score,
    classification,
    attribute_scores,
    computed_at
FROM match_result
WHERE entity_a = "crm-12345" OR entity_b = "crm-12345"
ORDER BY computed_at DESC;

-- Summary statistics for match quality tuning
SELECT
    classification,
    count() AS total,
    math::mean(score) AS avg_score,
    math::min(score) AS min_score,
    math::max(score) AS max_score
FROM match_result
WHERE computed_at > time::now() - 30d
GROUP BY classification;
```

---

## MDM Vocabulary Reference

**Prefix:** `mdm:` -- `http://indentiagraph.io/mdm#`

| Term | Type | Description |
|------|------|-------------|
| `mdm:sourceId` | Property | Source system identifier for an entity |
| `mdm:inGoldenRecord` | Property | Links source entity to its golden record |
| `mdm:hasSourceEntity` | Property | Links golden record to contributing source entities |
| `mdm:sourceSystem` | Property | Name of the source system |
| `mdm:classification` | Property | Match classification (match/possible/no) |
| `mdm:score` | Property | Match score between entities (0.0-1.0) |
| `mdm:entityA` | Property | First entity in a match result |
| `mdm:entityB` | Property | Second entity in a match result |
| `mdm:mergedAt` | Property | Timestamp when entities were merged |
| `mdm:survivorshipRule` | Property | Rule used to determine winning value |

### MDM Named Graph

All MDM quads are stored in the named graph `http://indentiagraph.io/graph/mdm`, enabling targeted queries:

```sparql
PREFIX mdm: <http://indentiagraph.io/mdm#>

SELECT ?s ?p ?o FROM <http://indentiagraph.io/graph/mdm> WHERE {
    ?s ?p ?o .
}
```
