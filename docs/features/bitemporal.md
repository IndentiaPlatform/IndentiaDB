# Bitemporal Time-Travel

IndentiaDB's bitemporal model tracks two independent time dimensions for every triple:

- **Transaction time** (also called system time or recording time): when the fact was inserted into the database.
- **Valid time** (also called business time or real-world time): when the fact is true in the real world.

Together these two dimensions make it possible to answer queries like: *"As of our database snapshot on June 1st, what did we believe was true on March 15th?"* — a question that a single-timeline system cannot answer.

---

## Why Two Timelines?

| Scenario | Single timeline | Bitemporal |
|----------|----------------|------------|
| Late-arriving data (salary retroactively corrected for Jan 1) | Cannot distinguish correction from original | Separate valid time and transaction time |
| What did the system know at an earlier point in time? | Not supported | Query by transaction time |
| What was the real-world state at a past date? | Requires audit log | Query by valid time |
| Regulatory audit: prove what was in the system on a specific date | Not possible | Supported natively |

---

## Use Cases

| Use Case | Bitemporal Solution |
|----------|-------------------|
| Historical salary data (report salaries as of any date) | `TEMPORAL BETWEEN VALID` |
| Audit compliance (prove what the system contained on date X) | `TEMPORAL AS OF TX` |
| Late data correction (fix a past salary entry without losing history) | Insert new valid-time entry; old entry remains queryable |
| What was known when (combine both timelines) | `TEMPORAL AS OF TX` + `VALID` |
| Data corrections affecting only future queries | `TEMPORAL UPDATE` |
| Regulatory retention (keep data for 7 years, then purge) | Purge with retention policy |
| Point-in-time reports (monthly snapshot reports) | `TEMPORAL AS OF TX` |

---

## TEMPORAL AS OF — Point-in-Time Query

Query the state of the graph as it existed at a specific transaction time and/or valid time:

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?name WHERE {
    TEMPORAL AS OF TX    "2024-06-01T00:00:00Z"
               VALID "2024-03-15T00:00:00Z"
    ?person foaf:name ?name .
}
```

This returns all names that were **recorded in the database before June 1, 2024** and were **true in the real world on March 15, 2024**. A salary that was retroactively corrected after June 1st will not appear — the query reflects the state of knowledge at the TX snapshot.

**Transaction time only** (point-in-time snapshot):

```sparql
SELECT ?person ?name ?email WHERE {
    TEMPORAL AS OF TX "2024-01-01T00:00:00Z"
    ?person foaf:name  ?name ;
            foaf:mbox  ?email .
}
```

**Valid time only** (current knowledge, historical real-world state):

```sparql
PREFIX ex: <http://example.org/>

SELECT ?employee ?salary WHERE {
    TEMPORAL AS OF VALID "2023-06-30T23:59:59Z"
    ?employee ex:salary ?salary .
}
```

---

## TEMPORAL BETWEEN — Range Query

Query all versions of a fact within a valid-time window:

```sparql
PREFIX ex:   <http://example.org/>

SELECT ?salary ?valid_start ?valid_end WHERE {
    TEMPORAL BETWEEN VALID "2024-01-01" AND "2024-12-31"
    ex:alice ex:salary ?salary .
    BIND(TEMPORAL_START(?salary) AS ?valid_start)
    BIND(TEMPORAL_END(?salary)   AS ?valid_end)
}
ORDER BY ?valid_start
```

This returns every value of `ex:alice ex:salary` that was valid at any point during 2024, along with the start and end of each validity interval.

**Transaction time range** (all versions recorded during a window):

```sparql
SELECT ?person ?role ?tx_start ?tx_end WHERE {
    TEMPORAL BETWEEN TX "2024-01-01T00:00:00Z" AND "2024-06-30T23:59:59Z"
    ?person ex:hasRole ?role .
    BIND(TX_START(?role) AS ?tx_start)
    BIND(TX_END(?role)   AS ?tx_end)
}
```

---

## Inserting Temporally Valid Data

When inserting data with explicit valid-time bounds, use SPARQL UPDATE with `TEMPORAL VALID` annotations:

```sparql
PREFIX ex:   <http://example.org/>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    TEMPORAL VALID "2024-01-01T00:00:00Z" TO "2024-06-30T23:59:59Z" {
        ex:alice ex:salary "75000"^^xsd:decimal .
        ex:alice ex:title  "Senior Engineer" .
    }
}
```

```sparql
# Record a pay raise from July 1st onwards (no end date = still current)
INSERT DATA {
    TEMPORAL VALID "2024-07-01T00:00:00Z" {
        ex:alice ex:salary "82000"^^xsd:decimal .
    }
}
```

Both inserts are now stored. Querying for Alice's salary:
- On June 15 → 75000
- On August 1 → 82000
- Historical snapshot from before July 1 + valid June 15 → 75000

---

## Configuration

```toml
[bitemporal]
enabled              = true
default_valid_time   = "now"       # When no valid-time is specified, use current time
tx_precision         = "millisecond"   # "second" | "millisecond" | "microsecond"

[bitemporal.purge]
enabled              = false
retention_period     = "7 years"   # Keep data for at least this long
purge_interval       = "1 day"     # How often the purge job runs
purge_what           = "expired"   # "expired" = only purge past retention; "all" = purge on retraction

[bitemporal.query]
default_mode         = "current"   # "current" = only current valid+tx time; "all" = all versions
```

### `default_mode`

| Mode | Behavior |
|------|---------|
| `"current"` | Queries without `TEMPORAL` clause return only currently-valid, latest-transaction-time triples. This is the standard database behavior most applications expect. |
| `"all"` | Queries without `TEMPORAL` clause return all versions across all time. Useful for audit-heavy applications where all history is always relevant. |

!!! warning "Storage Growth with Bitemporal Enabled"
    Each update creates a new temporal version rather than overwriting. A column that changes 100 times per year stores 100 versions. Size the storage backend accordingly, and configure the purge policy to match your regulatory retention requirements.

---

## Retention and Purge Policy

Configure data retention for regulatory compliance:

```toml
[bitemporal.purge]
enabled          = true
retention_period = "7 years"   # EU GDPR / NL Archiefwet common minimum
purge_interval   = "1 day"
```

The purge job runs on the configured interval and deletes temporal versions whose entire validity interval lies outside the retention window. Versions that are still within the retention window (i.e., the `valid_end` is within the last 7 years) are never purged.

**Manual purge via admin CLI:**

```bash
# Dry run — show what would be purged
indentiagraph admin bitemporal purge \
  --profile prod \
  --before "2017-01-01T00:00:00Z" \
  --dry-run

# Execute purge
indentiagraph admin bitemporal purge \
  --profile prod \
  --before "2017-01-01T00:00:00Z"
```

---

## Practical Examples

### Salary History Report

Show every salary Alice received, in order:

```sparql
PREFIX ex: <http://example.org/>

SELECT ?salary ?valid_start ?valid_end WHERE {
    TEMPORAL BETWEEN VALID "2020-01-01" AND "2025-12-31"
    ex:alice ex:salary ?salary .
    BIND(TEMPORAL_START(?salary) AS ?valid_start)
    BIND(TEMPORAL_END(?salary)   AS ?valid_end)
}
ORDER BY ?valid_start
```

### Audit Report: Database Contents on a Regulatory Deadline

Prove what the system contained on December 31, 2023 at 23:59:59:

```sparql
PREFIX ex:   <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?employee ?name ?role ?salary WHERE {
    TEMPORAL AS OF TX "2023-12-31T23:59:59Z"
    ?employee a ex:Employee ;
              foaf:name ?name ;
              ex:hasRole ?role ;
              ex:salary  ?salary .
}
ORDER BY ?name
```

This is a legally defensible snapshot: it reflects exactly what was recorded in the system as of that timestamp, regardless of any corrections made afterwards.

### Late-Arriving Correction

Alice's salary in Q1 2023 was recorded incorrectly as 70,000. The correct value is 72,000. Correct it without overwriting history:

```sparql
PREFIX ex:  <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

# Retract the incorrect value for Q1 2023
DELETE DATA {
    TEMPORAL VALID "2023-01-01T00:00:00Z" TO "2023-03-31T23:59:59Z" {
        ex:alice ex:salary "70000"^^xsd:decimal .
    }
}

# Insert the corrected value for the same valid-time window
INSERT DATA {
    TEMPORAL VALID "2023-01-01T00:00:00Z" TO "2023-03-31T23:59:59Z" {
        ex:alice ex:salary "72000"^^xsd:decimal .
    }
}
```

Queries using `AS OF TX` snapshots before the correction still return the original (incorrect) value — making it possible to prove what was believed at any point in time.

### Point-in-Time Report Generation

Generate a consistent monthly snapshot report:

```python
import requests
from datetime import datetime

def generate_monthly_report(snapshot_date: datetime) -> list:
    """Generate an employee report as of a specific date."""
    iso_date = snapshot_date.strftime("%Y-%m-%dT23:59:59Z")

    sparql = f"""
        PREFIX ex:   <http://example.org/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX org:  <http://www.w3.org/ns/org#>

        SELECT ?name ?department ?salary ?title WHERE {{
            TEMPORAL AS OF TX "{iso_date}"
            ?employee a ex:Employee ;
                      foaf:name        ?name ;
                      ex:salary        ?salary ;
                      ex:title         ?title ;
                      org:memberOf     ?dept .
            ?dept foaf:name ?department .
        }}
        ORDER BY ?department ?name
    """

    response = requests.post(
        "http://localhost:7001/sparql",
        headers={
            "Content-Type": "application/sparql-query",
            "Accept":       "application/sparql-results+json",
        },
        data=sparql,
    )
    response.raise_for_status()
    return response.json()["results"]["bindings"]

# Generate end-of-month reports
for month_end in ["2024-01-31", "2024-02-29", "2024-03-31"]:
    dt = datetime.fromisoformat(month_end)
    report = generate_monthly_report(dt)
    print(f"\n=== Report for {month_end}: {len(report)} employees ===")
    for row in report[:3]:
        print(f"  {row['name']['value']} — {row['department']['value']} — {row['salary']['value']}")
```

---

## Temporal Joins (Allen's Interval Algebra)

IndentiaDB supports **sequenced temporal joins** based on Allen's interval algebra. When joining two temporal entities, the engine can compute the temporal relationship between their validity intervals.

### Allen's Interval Relations

The following temporal relations are supported in SPARQL via the `SEQUENCED` and `NONSEQUENCED` keywords:

| Relation | Meaning | Condition |
|----------|---------|-----------|
| `DURING` | A is entirely within B | `A.start >= B.start AND A.end <= B.end` |
| `OVERLAPS` | A starts before B ends, ends after B starts | `A.start < B.end AND A.end > B.start` |
| `MEETS` | A ends exactly when B starts | `A.end = B.start` |
| `BEFORE` | A ends before B starts | `A.end < B.start` |
| `EQUALS` | Same interval | `A.start = B.start AND A.end = B.end` |

### Sequenced Join Example

Find all employees who were in the same department at the same time:

```sparql
PREFIX ex: <http://example.org/>

SELECT ?emp1 ?emp2 ?dept ?overlap_start ?overlap_end WHERE {
    TEMPORAL SEQUENCED {
        ?emp1 ex:memberOf ?dept .
        ?emp2 ex:memberOf ?dept .
    }
    FILTER(?emp1 != ?emp2)
    BIND(TEMPORAL_START(?emp1) AS ?start1)
    BIND(TEMPORAL_END(?emp1) AS ?end1)
    BIND(TEMPORAL_START(?emp2) AS ?start2)
    BIND(TEMPORAL_END(?emp2) AS ?end2)
    BIND(IF(?start1 > ?start2, ?start1, ?start2) AS ?overlap_start)
    BIND(IF(?end1 < ?end2, ?end1, ?end2) AS ?overlap_end)
}
ORDER BY ?dept ?overlap_start
```

The `SEQUENCED` keyword tells the engine to compute the intersection of validity intervals for matched triples, returning only results where the intervals overlap.

### Non-Sequenced Join

A `NONSEQUENCED` join ignores temporal overlap — it joins on data values regardless of whether the validity intervals coincide:

```sparql
SELECT ?person ?past_role ?current_role WHERE {
    TEMPORAL NONSEQUENCED {
        ?person ex:hasRole ?past_role .
    }
    ?person ex:hasRole ?current_role .
    FILTER(?past_role != ?current_role)
}
```

---

## SurrealQL Temporal Queries

In addition to SPARQL, bitemporal data can be queried using SurrealQL with temporal extensions.

### Point-in-Time Query

```sql
-- Current state (default)
SELECT * FROM employee WHERE name = 'Alice';

-- State as of a specific valid time
SELECT * FROM employee
    AT VALID '2024-01-15T00:00:00Z'
    WHERE name = 'Alice';

-- State as of a specific transaction time
SELECT * FROM employee
    AT TX '2024-06-01T00:00:00Z'
    WHERE name = 'Alice';

-- Bitemporal: what the system knew on June 1 about January 15
SELECT * FROM employee
    AT TX '2024-06-01T00:00:00Z'
    AT VALID '2024-01-15T00:00:00Z'
    WHERE name = 'Alice';
```

### Range Query

```sql
-- All salary versions valid during 2024
SELECT salary, valid_start, valid_end FROM employee
    BETWEEN VALID '2024-01-01' AND '2024-12-31'
    WHERE name = 'Alice'
    ORDER BY valid_start;
```

### Temporal Insert with Valid Time

```sql
-- Insert with explicit valid time range
INSERT INTO employee (name, salary, department)
    VALID '2024-01-01T00:00:00Z' TO '2024-06-30T23:59:59Z'
    VALUES ('Alice', 75000, 'Engineering');

-- Insert valid from now, no end date
INSERT INTO employee (name, salary, department)
    VALID '2024-07-01T00:00:00Z'
    VALUES ('Alice', 82000, 'Engineering');
```

---

## Migration from Non-Temporal Data

IndentiaDB provides a migration utility to convert existing regular triples into bitemporal format without downtime.

### Migration Strategy

When migrating, the utility:

- Sets `valid_time.start` to the current timestamp (migration time)
- Sets `valid_time.end` to `None` (unbounded/current)
- Sets `tx_time.start` automatically by SurrealDB
- Sets `tx_time.end` to `None` (current version)

This means all migrated data is treated as "currently valid starting from the migration time." If you need to backdate valid times, use the custom valid-time option.

### Running the Migration

```bash
# Dry run — show what would be migrated
indentiagraph admin bitemporal migrate \
  --profile prod \
  --dry-run

# Execute migration with default settings (batch size 1000)
indentiagraph admin bitemporal migrate \
  --profile prod

# Execute with custom batch size for large datasets
indentiagraph admin bitemporal migrate \
  --profile prod \
  --batch-size 5000

# Migrate with a custom valid-time start (backdate all triples)
indentiagraph admin bitemporal migrate \
  --profile prod \
  --valid-from "2020-01-01T00:00:00Z"
```

### Post-Migration Verification

After migration, verify the data:

```sparql
PREFIX ex: <http://example.org/>

# Count triples in the bitemporal table
SELECT (COUNT(*) AS ?count) WHERE {
    TEMPORAL BETWEEN VALID "2000-01-01" AND "2099-12-31"
    ?s ?p ?o .
}
```

!!! warning "Migration is One-Way"
    After verifying the migration, you can delete the original non-temporal triples with `indentiagraph admin bitemporal migrate --delete-originals`. This operation is irreversible.

---

## Temporal Aggregations

Bitemporal data can be aggregated using temporal windows, combining `GROUP BY` with temporal range queries.

### Salary Statistics by Year

```sparql
PREFIX ex:  <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?year (AVG(?salary) AS ?avg_salary) (COUNT(?employee) AS ?headcount) WHERE {
    VALUES ?year { 2022 2023 2024 2025 }
    BIND(CONCAT(STR(?year), "-06-30T23:59:59Z") AS ?mid_year)

    TEMPORAL AS OF VALID ?mid_year
    ?employee a ex:Employee ;
              ex:salary ?salary .
}
GROUP BY ?year
ORDER BY ?year
```

### Change Frequency Analysis

Count how many times each employee's salary changed during a period:

```sparql
PREFIX ex: <http://example.org/>

SELECT ?employee ?name (COUNT(?salary) AS ?changes) WHERE {
    TEMPORAL BETWEEN VALID "2020-01-01" AND "2025-12-31"
    ?employee a ex:Employee ;
              ex:name ?name ;
              ex:salary ?salary .
}
GROUP BY ?employee ?name
HAVING(COUNT(?salary) > 1)
ORDER BY DESC(?changes)
```

---

## Compliance Patterns

### GDPR Right-to-Erasure

Under GDPR Article 17 (right to erasure), a data subject can request deletion of their personal data. With bitemporal storage, IndentiaDB supports two erasure strategies:

**Logical erasure** (default) — close all temporal versions by setting `valid_end` and `tx_end` to the current timestamp. Historical queries still show the data existed, but current queries return nothing:

```sparql
PREFIX ex: <http://example.org/>

# Logically erase all data about a person
DELETE DATA {
    TEMPORAL VALID "1970-01-01T00:00:00Z" {
        ex:person_12345 ?p ?o .
    }
}
```

**Physical erasure** — permanently remove all temporal versions, including from transaction history. Use the admin CLI:

```bash
# GDPR physical erasure: remove all versions of a subject
indentiagraph admin bitemporal erase \
  --profile prod \
  --subject "http://example.org/person_12345" \
  --physical
```

!!! warning "Physical Erasure Is Irreversible"
    Physical erasure removes data from all temporal dimensions, including transaction history. This means `AS OF TX` queries will also return no results. Use only for GDPR compliance.

### Archiefwet (Dutch Archival Law) Patterns

The Archiefwet requires government records to be retained for specific periods (typically 7, 10, or 20 years depending on the record type). Configure per-category retention:

```toml
[bitemporal.purge]
enabled = true

[[bitemporal.purge.policies]]
graph            = "http://example.org/hr-records"
retention_period = "7 years"

[[bitemporal.purge.policies]]
graph            = "http://example.org/financial-records"
retention_period = "10 years"

[[bitemporal.purge.policies]]
graph            = "http://example.org/legal-records"
retention_period = "20 years"
```

Generate an Archiefwet compliance report:

```bash
# Show retention status per named graph
indentiagraph admin bitemporal retention-report \
  --profile prod \
  --format table
```

**Output:**

```
Graph                                    | Oldest Version | Retention | Status
-----------------------------------------|----------------|-----------|--------
http://example.org/hr-records            | 2019-03-15     | 7 years   | OK
http://example.org/financial-records     | 2016-01-01     | 10 years  | OK
http://example.org/legal-records         | 2008-06-30     | 20 years  | OK
```
