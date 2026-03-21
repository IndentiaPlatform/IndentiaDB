# SurrealQL Examples

Complete reference of SurrealQL capabilities in IndentiaDB, covering relational SQL patterns, NoSQL document operations, and graph edge traversals.

All examples use standard SurrealQL and run against any IndentiaDB instance.

---

## Table of Contents

### Relational / SQL

1. [Math Aggregates (GROUP BY, mean, sum, max, min)](#1-math-aggregates)
2. [String Functions](#2-string-functions)
3. [Array Functions](#3-array-functions)
4. [Date/Time Operations](#4-datetime-operations)
5. [Conditional Expressions (IF/ELSE)](#5-conditional-expressions)
6. [Subqueries and LET Bindings](#6-subqueries-and-let-bindings)
7. [ORDER BY, LIMIT, START (Pagination)](#7-order-by-limit-start)
8. [COUNT and GROUP BY](#8-count-and-group-by)

### NoSQL / Document

9. [Nested Document CRUD](#9-nested-document-crud)
10. [Array Manipulation (+=, -=)](#10-array-manipulation)
11. [SCHEMAFULL Validation](#11-schemafull-validation)
12. [SCHEMALESS Flexibility](#12-schemaless-flexibility)
13. [Record Links](#13-record-links)
14. [UPSERT and MERGE](#14-upsert-and-merge)
15. [DELETE Patterns](#15-delete-patterns)
16. [Type Checking Functions](#16-type-checking-functions)

### Graph Edges

17. [RELATE (Creating Edges with Properties)](#17-relate-edges)
18. [Outgoing Graph Traversal (->)](#18-outgoing-graph-traversal)
19. [Incoming Graph Traversal (<-)](#19-incoming-graph-traversal)
20. [Bidirectional Traversal (<->)](#20-bidirectional-traversal)
21. [Edge Property Queries](#21-edge-property-queries)
22. [Multi-Hop Graph Patterns](#22-multi-hop-graph-patterns)

### Advanced

23. [Transactions (BEGIN/COMMIT/CANCEL)](#23-transactions)
24. [DEFINE EVENT Triggers](#24-define-event-triggers)
25. [Indexes and Unique Constraints](#25-indexes-and-unique-constraints)

---

## Relational / SQL

### 1. Math Aggregates

Demonstrates `math::mean`, `math::sum`, `math::max`, `math::min` with `GROUP BY`.

```sql
-- Schema
DEFINE TABLE employee SCHEMAFULL;
DEFINE FIELD name ON employee TYPE string;
DEFINE FIELD department ON employee TYPE string;
DEFINE FIELD salary ON employee TYPE number;

-- Data
CREATE employee:alice SET name = 'Alice', department = 'Engineering', salary = 95000;
CREATE employee:bob SET name = 'Bob', department = 'Engineering', salary = 105000;
CREATE employee:carol SET name = 'Carol', department = 'Sales', salary = 72000;
CREATE employee:dave SET name = 'Dave', department = 'Sales', salary = 68000;
CREATE employee:eve SET name = 'Eve', department = 'Engineering', salary = 110000;

-- Average salary per department
SELECT department, math::mean(salary) AS avg_salary
FROM employee GROUP BY department ORDER BY department;
-- Engineering: ~103333.33, Sales: 70000

-- Global aggregates
SELECT math::sum(salary) AS total, math::max(salary) AS highest, math::min(salary) AS lowest
FROM employee GROUP ALL;
-- total: 450000, highest: 110000, lowest: 68000
```

### 2. String Functions

Built-in string manipulation functions.

```sql
CREATE product:1 SET name = '  Widget Pro  ', sku = 'wp-2024-alpha';

SELECT
    string::uppercase(name) AS upper,
    string::lowercase(name) AS lower,
    string::len(string::trim(name)) AS trimmed_len,
    string::concat('SKU: ', sku) AS label,
    string::trim(name) AS trimmed,
    string::starts_with(sku, 'wp') AS is_wp
FROM product:1;
-- upper: "  WIDGET PRO  "
-- lower: "  widget pro  "
-- trimmed_len: 10
-- label: "SKU: wp-2024-alpha"
-- trimmed: "Widget Pro"
-- is_wp: true
```

### 3. Array Functions

Array manipulation: length, distinct, flatten, append, combine.

```sql
CREATE basket:1 SET
    items = ['apple', 'banana', 'apple', 'cherry'],
    nested = [[1, 2], [3, 4]];

SELECT
    array::len(items) AS count,
    array::distinct(items) AS unique_items,
    array::flatten(nested) AS flat,
    array::append(items, 'date') AS with_date,
    array::combine(['x','y'], [1,2]) AS combos
FROM basket:1;
-- count: 4
-- unique_items: ["apple", "banana", "cherry"]
-- flat: [1, 2, 3, 4]
-- with_date: ["apple", "banana", "apple", "cherry", "date"]
-- combos: [["x",1],["x",2],["y",1],["y",2]]  (cartesian product)
```

### 4. Date/Time Operations

Date comparisons, duration arithmetic, and the `d'...'` datetime literal syntax.

```sql
CREATE event:launch SET title = 'Launch', scheduled = d'2025-06-15T10:00:00Z';
CREATE event:review SET title = 'Review', scheduled = d'2025-07-01T14:00:00Z';

-- Date comparison
SELECT title FROM event WHERE scheduled > d'2025-06-20T00:00:00Z';
-- Returns: "Review"

-- Duration arithmetic: add 30 days
SELECT title, scheduled, scheduled + 30d AS shifted FROM event ORDER BY scheduled;
```

### 5. Conditional Expressions

IF/ELSE expressions inline in SELECT for computed columns.

```sql
CREATE student:1 SET name = 'Alice', score = 92;
CREATE student:2 SET name = 'Bob', score = 67;
CREATE student:3 SET name = 'Carol', score = 45;

SELECT name, score,
    IF score >= 90 THEN 'A'
    ELSE IF score >= 70 THEN 'B'
    ELSE IF score >= 50 THEN 'C'
    ELSE 'F'
    END AS grade
FROM student ORDER BY name;
-- Alice: A, Bob: C, Carol: F
```

### 6. Subqueries and LET Bindings

Variable bindings with `LET` and IN-subqueries.

```sql
CREATE team:alpha SET name = 'Alpha';
CREATE team:beta SET name = 'Beta';
CREATE member:1 SET name = 'Alice', team = team:alpha, rating = 9;
CREATE member:2 SET name = 'Bob', team = team:alpha, rating = 7;
CREATE member:3 SET name = 'Carol', team = team:beta, rating = 8;

-- LET binding
LET $top_team = team:alpha;
SELECT name FROM member WHERE team = $top_team ORDER BY name;
-- Returns: Alice, Bob

-- IN subquery
SELECT name FROM member WHERE team IN (SELECT VALUE id FROM team WHERE name = 'Beta');
-- Returns: Carol
```

### 7. ORDER BY, LIMIT, START

Multi-column sorting and offset-based pagination.

```sql
CREATE product:a SET name = 'Widget', category = 'Tools', price = 29.99;
CREATE product:b SET name = 'Gadget', category = 'Electronics', price = 49.99;
CREATE product:c SET name = 'Bolt', category = 'Tools', price = 1.50;
CREATE product:d SET name = 'Cable', category = 'Electronics', price = 9.99;
CREATE product:e SET name = 'Hammer', category = 'Tools', price = 15.00;

-- Multi-column sort
SELECT name, category, price FROM product
ORDER BY category ASC, price DESC;
-- Electronics first (highest price first), then Tools

-- Pagination: skip 1, take 2
SELECT name, price FROM product ORDER BY price ASC LIMIT 2 START 1;
-- Returns: Cable (9.99), Hammer (15.00)
```

### 8. COUNT and GROUP BY

Counting, GROUP ALL for totals, and simulated HAVING via subquery.

```sql
CREATE order:1 SET customer = 'Alice', status = 'shipped', amount = 120;
CREATE order:2 SET customer = 'Bob', status = 'pending', amount = 45;
CREATE order:3 SET customer = 'Alice', status = 'shipped', amount = 80;
CREATE order:4 SET customer = 'Carol', status = 'shipped', amount = 200;
CREATE order:5 SET customer = 'Bob', status = 'shipped', amount = 60;

-- Count per status
SELECT status, count() AS total FROM order GROUP BY status ORDER BY status;
-- pending: 1, shipped: 4

-- Overall totals
SELECT count() AS total_orders, math::sum(amount) AS revenue FROM order GROUP ALL;
-- total_orders: 5, revenue: 505

-- Simulated HAVING: customers with 2+ orders
SELECT * FROM (
    SELECT customer, count() AS cnt FROM order GROUP BY customer
) WHERE cnt >= 2 ORDER BY customer;
-- Alice (2), Bob (2)
```

---

## NoSQL / Document

### 9. Nested Document CRUD

Deep nested field access and updates using dot notation.

```sql
CREATE user:1 SET
    name = 'Alice',
    profile = {
        address: {
            street: '123 Main St',
            city: 'Springfield',
            geo: { lat: 39.78, lng: -89.65 }
        },
        preferences: {
            theme: 'dark',
            notifications: { email: true, sms: false }
        }
    };

-- Read nested field
SELECT profile.address.city FROM user:1;
-- "Springfield"

-- Read deep nested
SELECT profile.address.geo.lat FROM user:1;
-- 39.78

-- Update nested field
UPDATE user:1 SET profile.preferences.theme = 'light';

-- Update deep nested field
UPDATE user:1 SET profile.address.geo.lat = 40.00;
```

### 10. Array Manipulation

Append and remove array elements using `+=` and `-=`.

```sql
CREATE playlist:rock SET name = 'Rock Classics', tracks = ['Bohemian Rhapsody', 'Stairway to Heaven'];

-- Append
UPDATE playlist:rock SET tracks += 'Hotel California';
-- tracks: ['Bohemian Rhapsody', 'Stairway to Heaven', 'Hotel California']

-- Remove
UPDATE playlist:rock SET tracks -= 'Stairway to Heaven';
-- tracks: ['Bohemian Rhapsody', 'Hotel California']
```

### 11. SCHEMAFULL Validation

Strict schema enforcement rejects undefined fields.

```sql
DEFINE TABLE strict_item SCHEMAFULL;
DEFINE FIELD name ON strict_item TYPE string;
DEFINE FIELD quantity ON strict_item TYPE number;

-- Valid insert
CREATE strict_item:1 SET name = 'Bolt', quantity = 100;

-- Extra field on SCHEMAFULL: SurrealDB rejects the undefined 'color' field
CREATE strict_item:2 SET name = 'Nut', quantity = 50, color = 'silver';
-- ERROR: SCHEMAFULL rejects undefined field 'color'
```

### 12. SCHEMALESS Flexibility

Heterogeneous documents with different shapes in the same table.

```sql
CREATE item:book SET type = 'book', title = 'Rust Programming', pages = 450;
CREATE item:video SET type = 'video', title = 'Intro to SurrealDB', duration_min = 45;
CREATE item:tool SET type = 'tool', name = 'Wrench', weight_kg = 1.2;

SELECT * FROM item ORDER BY id;
-- Each record has a different shape: book has pages, video has duration_min, tool has weight_kg
```

### 13. Record Links

Automatic traversal of record links using dot notation.

```sql
CREATE author:tolkien SET name = 'J.R.R. Tolkien';
CREATE book:lotr SET title = 'The Lord of the Rings', written_by = author:tolkien;
CREATE book:hobbit SET title = 'The Hobbit', written_by = author:tolkien;

-- Auto-resolve record link
SELECT title, written_by.name AS author_name FROM book ORDER BY title;
-- Both return author_name: "J.R.R. Tolkien"

-- Filter via linked record field
SELECT title FROM book WHERE written_by.name = 'J.R.R. Tolkien' ORDER BY title;
```

### 14. UPSERT and MERGE

Idempotent writes with UPSERT and partial updates with MERGE.

```sql
-- Initial create
CREATE config:app SET theme = 'dark', lang = 'en';

-- UPSERT: updates if exists, creates if not
UPSERT config:app SET theme = 'light', lang = 'en', beta = true;
-- theme: "light", beta: true

-- UPSERT new record (creates it)
UPSERT config:mobile SET theme = 'auto', lang = 'nl';

-- MERGE partial update (only changes specified fields)
UPDATE config:app MERGE { version: '2.0', beta: false };
-- version: "2.0", beta: false, theme: "light" (unchanged)
```

### 15. DELETE Patterns

Delete specific records or by condition.

```sql
CREATE task:1 SET title = 'Deploy v1', done = true;
CREATE task:2 SET title = 'Write tests', done = false;
CREATE task:3 SET title = 'Code review', done = true;
CREATE task:4 SET title = 'Plan sprint', done = false;

-- DELETE specific record
DELETE task:4;

-- DELETE with WHERE
DELETE task WHERE done = true;
-- Only task:2 ("Write tests") remains
```

### 16. Type Checking Functions

Runtime type introspection with `type::is_*` functions.

```sql
CREATE sample:1 SET
    text_val = 'hello',
    num_val = 42,
    bool_val = true,
    float_val = 3.14;

SELECT
    type::is_string(text_val) AS is_str,
    type::is_number(num_val) AS is_num,
    type::is_bool(bool_val) AS is_bool,
    type::is_number(float_val) AS is_float_num,
    type::is_string(num_val) AS num_is_str
FROM sample:1;
-- is_str: true, is_num: true, is_bool: true, is_float_num: true, num_is_str: false
```

---

## Graph Edges

### 17. RELATE Edges

Create edges between records with properties using RELATE.

```sql
CREATE person:alice SET name = 'Alice', role = 'Engineer';
CREATE person:bob SET name = 'Bob', role = 'Designer';
CREATE person:carol SET name = 'Carol', role = 'Manager';

-- RELATE creates edges with properties
RELATE person:alice->knows->person:bob SET since = d'2023-01-15', strength = 8;
RELATE person:alice->knows->person:carol SET since = d'2022-06-01', strength = 9;
RELATE person:bob->knows->person:carol SET since = d'2024-03-10', strength = 5;

-- Query edges directly
SELECT * FROM knows ORDER BY strength;
```

### 18. Outgoing Graph Traversal

Follow outgoing edges using the `->` operator. Supports multi-hop chains.

```sql
CREATE city:amsterdam SET name = 'Amsterdam';
CREATE city:berlin SET name = 'Berlin';
CREATE city:prague SET name = 'Prague';
CREATE city:vienna SET name = 'Vienna';
RELATE city:amsterdam->connects->city:berlin SET distance_km = 660;
RELATE city:berlin->connects->city:prague SET distance_km = 350;
RELATE city:prague->connects->city:vienna SET distance_km = 330;

-- Single-hop outgoing
SELECT ->connects->city.name AS destinations FROM city:amsterdam;
-- ["Berlin"]

-- Multi-hop: amsterdam -> berlin -> prague
SELECT ->connects->city->connects->city.name AS two_hops FROM city:amsterdam;
-- ["Prague"]
```

### 19. Incoming Graph Traversal

Follow incoming edges using the `<-` operator to find reverse relationships.

```sql
CREATE person:alice SET name = 'Alice';
CREATE person:bob SET name = 'Bob';
CREATE person:carol SET name = 'Carol';
RELATE person:alice->follows->person:carol;
RELATE person:bob->follows->person:carol;

-- Incoming: who follows Carol?
SELECT <-follows<-person.name AS followers FROM person:carol;
-- ["Alice", "Bob"]
```

### 20. Bidirectional Traversal

Follow edges in both directions using `<->`.

```sql
CREATE person:alice SET name = 'Alice';
CREATE person:bob SET name = 'Bob';
CREATE person:carol SET name = 'Carol';
RELATE person:alice->friend->person:bob;
RELATE person:carol->friend->person:bob;

-- Bidirectional: all people connected to Bob via friend (in any direction)
SELECT <->friend<->person.name AS connections FROM person:bob;
-- Includes "Alice" and "Carol"
```

### 21. Edge Property Queries

Query and filter edges by their properties.

```sql
CREATE person:alice SET name = 'Alice';
CREATE person:bob SET name = 'Bob';
CREATE person:carol SET name = 'Carol';
RELATE person:alice->works_with->person:bob SET project = 'IndentiaGraph', hours = 120;
RELATE person:alice->works_with->person:carol SET project = 'Fleet API', hours = 40;
RELATE person:bob->works_with->person:carol SET project = 'IndentiaGraph', hours = 80;

-- Query edge table with properties
SELECT *, in.name AS from_name, out.name AS to_name
FROM works_with
WHERE project = 'IndentiaGraph'
ORDER BY hours DESC;
-- 2 results: Alice-Bob (120h), Bob-Carol (80h)

-- Filter traversal by edge property
SELECT ->works_with[WHERE hours > 50]->person.name AS close_colleagues
FROM person:alice;
-- ["Bob"]
```

### 22. Multi-Hop Graph Patterns

Chain traversals for organizational hierarchies and deep graph queries.

```sql
CREATE org:ceo SET title = 'CEO', name = 'Eve';
CREATE org:vp SET title = 'VP Engineering', name = 'Dave';
CREATE org:lead SET title = 'Tech Lead', name = 'Carol';
CREATE org:dev1 SET title = 'Developer', name = 'Alice';
CREATE org:dev2 SET title = 'Developer', name = 'Bob';
RELATE org:ceo->manages->org:vp;
RELATE org:vp->manages->org:lead;
RELATE org:lead->manages->org:dev1;
RELATE org:lead->manages->org:dev2;

-- 2-hop: CEO's indirect reports (via VP)
SELECT ->manages->org->manages->org.name AS indirect_reports FROM org:ceo;
-- ["Carol"]

-- 3-hop: CEO down to developers
SELECT ->manages->org->manages->org->manages->org.name AS devs FROM org:ceo;
-- ["Alice", "Bob"]

-- Intermediate nodes
SELECT ->manages->org AS hop1 FROM org:ceo;
-- [org:vp]
```

---

## Advanced

### 23. Transactions

Atomic multi-statement transactions with BEGIN/COMMIT and rollback with CANCEL.

```sql
CREATE account:checking SET owner = 'Alice', balance = 1000;
CREATE account:savings SET owner = 'Alice', balance = 5000;

-- Transfer 200 from checking to savings (atomic)
BEGIN;
UPDATE account:checking SET balance -= 200;
UPDATE account:savings SET balance += 200;
COMMIT;
-- checking: 800, savings: 5200

-- CANCEL rolls back changes
BEGIN;
UPDATE account:checking SET balance = 999;
CANCEL;
-- checking remains 800
```

### 24. DEFINE EVENT Triggers

Automatic side effects on data changes using DEFINE EVENT.

```sql
DEFINE TABLE audit_log SCHEMALESS;
DEFINE TABLE purchase SCHEMALESS;

DEFINE EVENT log_purchase ON TABLE purchase WHEN $event = "CREATE" THEN {
    CREATE audit_log SET
        action = 'purchase_created',
        record_id = $value.id,
        amount = $value.amount,
        logged_at = time::now();
};

-- These CREATEs automatically trigger audit log entries
CREATE purchase:1 SET item = 'Laptop', amount = 1299;
CREATE purchase:2 SET item = 'Mouse', amount = 25;

-- Verify
SELECT * FROM audit_log ORDER BY amount;
-- 2 entries: Mouse (25), Laptop (1299)
```

### 25. Indexes and Unique Constraints

Define indexes for performance and enforce uniqueness.

```sql
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD email ON user TYPE string;
DEFINE FIELD name ON user TYPE string;
DEFINE FIELD age ON user TYPE int;
DEFINE INDEX idx_email ON user FIELDS email UNIQUE;
DEFINE INDEX idx_age ON user FIELDS age;

CREATE user:1 SET email = 'alice@example.com', name = 'Alice', age = 30;
CREATE user:2 SET email = 'bob@example.com', name = 'Bob', age = 25;
CREATE user:3 SET email = 'carol@example.com', name = 'Carol', age = 30;

-- Unique constraint: duplicate email fails
CREATE user:4 SET email = 'alice@example.com', name = 'Duplicate', age = 40;
-- ERROR: Unique index prevents duplicate email

-- Query using indexed field
SELECT name FROM user WHERE age = 30 ORDER BY name;
-- Alice, Carol

-- Inspect table info
INFO FOR TABLE user;
```
