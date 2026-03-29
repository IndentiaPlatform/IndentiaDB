# SurrealQL Reference

SurrealQL is IndentiaDB's primary query language. It handles relational tables, document CRUD, graph edge traversals, vector similarity search, full-text search, transactions, event triggers, and schema definitions — all in one language.

!!! note "SurrealQL HTTP endpoint — planned feature"
    The `POST /sql` HTTP endpoint is not yet available in IndentiaDB. SurrealDB is currently used internally (alerting, licensing, RDF projection) and does not expose a public user-facing HTTP or WebSocket interface. A user-facing SurrealQL endpoint is planned for a future release.

---

## Table of Contents

### Relational / SQL
1. [DEFINE TABLE + SCHEMAFULL with types and assertions](#1-define-table-and-schemafull)
2. [Basic SELECT with WHERE, ORDER BY, LIMIT](#2-basic-select)
3. [Math aggregates (COUNT, SUM, AVG, MIN, MAX)](#3-math-aggregates)
4. [String functions](#4-string-functions)
5. [Array functions](#5-array-functions)
6. [Date/time functions](#6-datetime-functions)
7. [Subqueries and LET bindings](#7-subqueries-and-let-bindings)
8. [Pagination with LIMIT / OFFSET / START](#8-pagination)
9. [GROUP BY with simulated HAVING](#9-group-by-and-having)

### Document / NoSQL
10. [CREATE with nested objects and arrays](#10-create-nested-documents)
11. [UPDATE nested fields with += and SET](#11-update-nested-fields)
12. [UPSERT — create or overwrite](#12-upsert)
13. [MERGE — partial update](#13-merge)
14. [DELETE with condition](#14-delete-with-condition)
15. [Type checking functions](#15-type-checking)
16. [Record links (->)](#16-record-links)

### Graph Edges
17. [RELATE — create typed edges with properties](#17-relate-edges)
18. [Outgoing traversal (->)](#18-outgoing-traversal)
19. [Incoming traversal (<-)](#19-incoming-traversal)
20. [Bidirectional traversal (<->)](#20-bidirectional-traversal)
21. [Multi-hop traversal with depth](#21-multi-hop-traversal)

### Advanced
22. [BEGIN / COMMIT transaction](#22-begin-commit-transaction)
23. [CANCEL transaction (rollback)](#23-cancel-transaction)
24. [DEFINE EVENT trigger — audit log pattern](#24-define-event-trigger)
25. [DEFINE INDEX + UNIQUE constraint](#25-define-index-and-unique-constraint)

---

## Relational / SQL

### 1. DEFINE TABLE and SCHEMAFULL

`SCHEMAFULL` tables enforce a declared schema. Records with undeclared fields are rejected. Use `TYPE` to enforce data types, and `ASSERT` for field-level validation.

```sql
-- Department table
DEFINE TABLE department SCHEMAFULL;
DEFINE FIELD name     ON department TYPE string;
DEFINE FIELD budget   ON department TYPE number;
DEFINE FIELD location ON department TYPE string;

-- Employee table with a validated email field and a record link to department
DEFINE TABLE employee SCHEMAFULL;
DEFINE FIELD name       ON employee TYPE string;
DEFINE FIELD email      ON employee TYPE string ASSERT string::is::email($value);
DEFINE FIELD department ON employee TYPE record<department>;
DEFINE FIELD salary     ON employee TYPE number;
DEFINE FIELD hired      ON employee TYPE datetime;
DEFINE FIELD active     ON employee TYPE bool DEFAULT true;

-- Insert
CREATE department:engineering CONTENT {
    name: "Engineering", budget: 500000, location: "Amsterdam"
};
CREATE employee:alice CONTENT {
    name:       "Alice van den Berg",
    email:      "alice@example.com",
    department: department:engineering,
    salary:     85000,
    hired:      d'2023-03-15T09:00:00Z'
};

-- Invalid: email assertion fails
CREATE employee:bad SET
    name = "Test",
    email = "not-an-email",    -- ASSERT fails
    department = department:engineering,
    salary = 50000,
    hired = time::now();
-- ERROR: Field 'email' does not match assertion

-- Invalid on SCHEMAFULL: undeclared field rejected
CREATE employee:also_bad SET
    name = "Test",
    email = "test@example.com",
    department = department:engineering,
    salary = 50000,
    hired = time::now(),
    nickname = "Tester";       -- undeclared field
-- ERROR: Field 'nickname' not defined on SCHEMAFULL table
```

---

### 2. Basic SELECT

```sql
-- Auto-resolve record link: department.name is fetched from department table
SELECT name, email, salary, department.name AS dept, department.location AS city
FROM employee
WHERE salary > 70000
ORDER BY salary DESC, name ASC
LIMIT 20;

-- Return specific fields only
SELECT VALUE name FROM employee WHERE active = true ORDER BY name;
-- Returns: ["Alice van den Berg"]

-- Select with computed column
SELECT name, salary, salary * 1.1 AS with_raise FROM employee ORDER BY name;
```

---

### 3. Math Aggregates

```sql
CREATE employee:bob   SET name = "Bob de Vries",   department = "Engineering", salary = 92000;
CREATE employee:carol SET name = "Carol Jansen",    department = "Research",    salary = 78000;
CREATE employee:dave  SET name = "Dave Smit",       department = "Research",    salary = 68000;
CREATE employee:eve   SET name = "Eve Bakker",      department = "Engineering", salary = 110000;

-- Average salary per department
SELECT department, math::mean(salary) AS avg_salary
FROM employee GROUP BY department ORDER BY department;
-- Engineering: ~95666.67, Research: 73000

-- Global aggregates
SELECT
    count()          AS total_employees,
    math::sum(salary)  AS total_payroll,
    math::max(salary)  AS highest,
    math::min(salary)  AS lowest,
    math::mean(salary) AS average
FROM employee GROUP ALL;

-- Conditional count: count only active employees
SELECT count(active = true) AS active_count FROM employee GROUP ALL;
```

---

### 4. String Functions

```sql
CREATE product:1 SET name = '  Widget Pro  ', sku = 'wp-2024-alpha', code = 'WIDGET_PRO';

SELECT
    string::uppercase(name)               AS upper,
    string::lowercase(name)               AS lower,
    string::trim(name)                    AS trimmed,
    string::len(string::trim(name))       AS trimmed_len,
    string::concat('SKU: ', sku)          AS label,
    string::starts_with(sku, 'wp')        AS is_wp,
    string::ends_with(sku, 'alpha')       AS is_alpha,
    string::contains(code, 'WIDGET')      AS has_widget,
    string::replace(code, '_', '-')       AS slug,
    string::slice(sku, 3, 4)             AS year_part
FROM product:1;

-- String splitting and joining
SELECT string::split(sku, '-')    AS parts FROM product:1;
-- ["wp", "2024", "alpha"]

-- Reverse a string
SELECT string::reverse(string::trim(name)) AS reversed FROM product:1;
-- "orP tegdiW"
```

---

### 5. Array Functions

```sql
CREATE basket:1 SET
    items  = ['apple', 'banana', 'apple', 'cherry', 'banana'],
    nested = [[1, 2], [3, 4], [5]],
    nums   = [5, 3, 8, 1, 9, 2];

SELECT
    array::len(items)                     AS count,
    array::distinct(items)                AS unique_items,
    array::sort(array::distinct(items))   AS sorted_unique,
    array::flatten(nested)                AS flat,
    array::append(items, 'date')          AS with_date,
    array::first(nums)                    AS first_num,
    array::last(nums)                     AS last_num,
    array::max(nums)                      AS max_num,
    array::min(nums)                      AS min_num,
    array::sum(nums)                      AS total,
    array::reverse(nums)                  AS reversed,
    array::combine(['x','y'], [1,2])      AS combos
FROM basket:1;

-- Filter array elements inline
CREATE order:1 SET
    lines = [
        { product: 'apple',  qty: 3, price: 0.50 },
        { product: 'banana', qty: 5, price: 0.30 },
        { product: 'cherry', qty: 1, price: 2.00 }
    ];

SELECT lines[WHERE price > 0.40] AS expensive_lines FROM order:1;
-- [{product: "apple", qty:3, price:0.50}, {product:"cherry", qty:1, price:2.00}]

SELECT array::len(lines[WHERE qty > 2]) AS large_qty_lines FROM order:1;
-- 2
```

---

### 6. Date/Time Functions

```sql
CREATE event:launch  SET title = 'Product Launch',  scheduled = d'2025-06-15T10:00:00Z';
CREATE event:review  SET title = 'Quarterly Review', scheduled = d'2025-07-01T14:00:00Z';
CREATE event:standup SET title = 'Daily Standup',    scheduled = d'2025-06-16T09:00:00Z';

-- Current time
SELECT time::now() AS now;

-- Date comparison
SELECT title, scheduled FROM event
WHERE scheduled > d'2025-06-20T00:00:00Z'
ORDER BY scheduled;
-- "Quarterly Review"

-- Duration arithmetic: find events in the next 30 days from a reference date
LET $ref = d'2025-06-14T00:00:00Z';
SELECT title, scheduled
FROM event
WHERE scheduled >= $ref AND scheduled <= ($ref + 30d)
ORDER BY scheduled;
-- "Product Launch" (June 15), "Daily Standup" (June 16)

-- Format a date
SELECT title, time::format(scheduled, "%Y-%m-%d") AS date_str FROM event ORDER BY title;

-- Extract components
SELECT
    time::year(scheduled)  AS year,
    time::month(scheduled) AS month,
    time::day(scheduled)   AS day,
    time::hour(scheduled)  AS hour
FROM event WHERE title = 'Product Launch';
-- year: 2025, month: 6, day: 15, hour: 10
```

---

### 7. Subqueries and LET Bindings

```sql
CREATE team:alpha SET name = 'Alpha', lead = 'Alice';
CREATE team:beta  SET name = 'Beta',  lead = 'Carol';

CREATE member:1 SET name = 'Alice', team = team:alpha, rating = 9;
CREATE member:2 SET name = 'Bob',   team = team:alpha, rating = 7;
CREATE member:3 SET name = 'Carol', team = team:beta,  rating = 8;
CREATE member:4 SET name = 'Dave',  team = team:beta,  rating = 6;

-- LET binding: capture a record ID
LET $top_team = team:alpha;
SELECT name, rating FROM member WHERE team = $top_team ORDER BY rating DESC;
-- Alice (9), Bob (7)

-- IN subquery: members of teams with lead = 'Carol'
SELECT name FROM member
WHERE team IN (SELECT VALUE id FROM team WHERE lead = 'Carol')
ORDER BY name;
-- Carol, Dave

-- Correlated subquery: members with above-average rating for their team
SELECT name, rating FROM member
WHERE rating > (
    SELECT math::mean(rating) AS avg FROM member
    WHERE team = member.team GROUP ALL
).avg
ORDER BY name;
```

---

### 8. Pagination

```sql
CREATE product:a SET name = 'Widget',   category = 'Tools',       price = 29.99;
CREATE product:b SET name = 'Gadget',   category = 'Electronics', price = 49.99;
CREATE product:c SET name = 'Bolt',     category = 'Tools',       price = 1.50;
CREATE product:d SET name = 'Cable',    category = 'Electronics', price = 9.99;
CREATE product:e SET name = 'Hammer',   category = 'Tools',       price = 15.00;
CREATE product:f SET name = 'Charger',  category = 'Electronics', price = 24.99;

-- Page 1 (first 2 results, sorted by price ASC)
SELECT name, price FROM product ORDER BY price ASC LIMIT 2 START 0;
-- Bolt (1.50), Cable (9.99)

-- Page 2 (skip 2, take 2)
SELECT name, price FROM product ORDER BY price ASC LIMIT 2 START 2;
-- Hammer (15.00), Charger (24.99)

-- Page 3 (skip 4, take 2)
SELECT name, price FROM product ORDER BY price ASC LIMIT 2 START 4;
-- Widget (29.99), Gadget (49.99)

-- Multi-column sort: category ASC then price DESC
SELECT name, category, price FROM product
ORDER BY category ASC, price DESC;
-- Electronics: Gadget (49.99), Charger (24.99), Cable (9.99)
-- Tools: Widget (29.99), Hammer (15.00), Bolt (1.50)

-- Total count for pagination UI
SELECT count() AS total FROM product GROUP ALL;
-- 6
```

---

### 9. GROUP BY and HAVING

SurrealQL does not have a `HAVING` keyword, but you can simulate it using a subquery wrapper.

```sql
CREATE order:1 SET customer = 'Alice', status = 'shipped', amount = 120;
CREATE order:2 SET customer = 'Bob',   status = 'pending', amount = 45;
CREATE order:3 SET customer = 'Alice', status = 'shipped', amount = 80;
CREATE order:4 SET customer = 'Carol', status = 'shipped', amount = 200;
CREATE order:5 SET customer = 'Bob',   status = 'shipped', amount = 60;

-- Basic GROUP BY
SELECT status, count() AS total, math::sum(amount) AS revenue
FROM order
GROUP BY status
ORDER BY status;
-- pending: count=1, revenue=45; shipped: count=4, revenue=460

-- Simulated HAVING: customers with 2+ orders
SELECT * FROM (
    SELECT customer, count() AS cnt, math::sum(amount) AS total
    FROM order
    GROUP BY customer
)
WHERE cnt >= 2
ORDER BY total DESC;
-- Alice: cnt=2, total=200; Bob: cnt=2, total=105

-- GROUP BY with conditional aggregate
SELECT
    customer,
    count(status = 'shipped') AS shipped_count,
    count(status = 'pending') AS pending_count,
    math::sum(amount) AS total_spend
FROM order
GROUP BY customer
ORDER BY total_spend DESC;
```

---

## Document / NoSQL

### 10. CREATE with Nested Documents

```sql
DEFINE TABLE project SCHEMALESS;
DEFINE TABLE task    SCHEMALESS;

CREATE project:indentiagraph CONTENT {
    name:   "IndentiaGraph",
    status: "active",
    tags:   ["database", "graph", "rdf", "rust"],
    metadata: {
        created:  "2024-01-15",
        lead:     "Alice",
        priority: "high",
        budget:   250000
    },
    milestones: [
        { name: "Alpha", date: "2024-06-01", completed: true  },
        { name: "Beta",  date: "2024-12-01", completed: true  },
        { name: "GA",    date: "2025-06-01", completed: false }
    ],
    contact: {
        email: "team@example.com",
        slack: "#indentiagraph"
    }
};

-- Read nested field
SELECT metadata.lead, metadata.priority FROM project WHERE status = "active";

-- Read deep nested
SELECT contact.slack FROM project:indentiagraph;

-- Filter array elements
SELECT milestones[WHERE completed = false] AS pending_milestones
FROM project:indentiagraph;

-- Array element count
SELECT array::len(milestones[WHERE completed = true]) AS done_count
FROM project:indentiagraph;
-- 2

-- Create a task referencing the project
CREATE task:rdf_engine CONTENT {
    title:    "SPARQL 1.2 engine",
    project:  project:indentiagraph,
    assignee: "Alice",
    status:   "in_progress",
    labels:   ["rdf", "sparql", "core"],
    story_points: 13
};

-- Auto-resolve project record link
SELECT title, project.name AS project_name, project.metadata.lead AS lead
FROM task WHERE assignee = "Alice";
```

---

### 11. UPDATE Nested Fields

```sql
CREATE user:1 SET
    name = 'Alice',
    profile = {
        theme: 'dark',
        notifications: { email: true, sms: false },
        address: { city: 'Amsterdam', country: 'NL' }
    },
    score = 100,
    tags = ['admin', 'user'];

-- Update a top-level field
UPDATE user:1 SET score = 150;

-- Update a nested field using dot notation
UPDATE user:1 SET profile.theme = 'light';

-- Update a deeply nested field
UPDATE user:1 SET profile.notifications.sms = true;

-- Increment a numeric field
UPDATE user:1 SET score += 25;
-- score is now 175

-- Append to an array
UPDATE user:1 SET tags += 'moderator';
-- tags: ["admin", "user", "moderator"]

-- Remove from an array
UPDATE user:1 SET tags -= 'user';
-- tags: ["admin", "moderator"]

-- Verify
SELECT name, score, tags, profile.theme, profile.notifications FROM user:1;
```

---

### 12. UPSERT

`UPSERT` creates the record if it does not exist, or replaces it entirely if it does.

```sql
-- First call: creates the record
UPSERT config:app SET
    theme = 'dark',
    lang  = 'en',
    beta  = false;

-- Second call: overwrites all fields
UPSERT config:app SET
    theme = 'light',
    lang  = 'en',
    beta  = true,
    version = '2.0';
-- Previous 'dark' value is gone; 'beta' is now true; 'version' added

-- UPSERT a record that doesn't exist yet (creates it)
UPSERT config:mobile SET
    theme = 'auto',
    lang  = 'nl';

SELECT * FROM config ORDER BY id;
-- config:app:   {theme: "light", lang: "en", beta: true, version: "2.0"}
-- config:mobile: {theme: "auto", lang: "nl"}
```

---

### 13. MERGE

`MERGE` is a partial update — only the specified fields are changed. Fields not listed are preserved.

```sql
CREATE profile:user1 SET
    name  = 'Alice',
    theme = 'dark',
    lang  = 'en',
    beta  = false;

-- MERGE: only change 'theme' and add 'version'; 'name', 'lang', 'beta' are preserved
UPDATE profile:user1 MERGE { theme: 'light', version: '2.0' };

SELECT * FROM profile:user1;
-- { name: "Alice", theme: "light", lang: "en", beta: false, version: "2.0" }

-- MERGE vs SET: SET replaces the entire document; MERGE patches it
UPDATE profile:user1 SET theme = 'system';   -- only theme changes, rest preserved
SELECT * FROM profile:user1;
-- { name: "Alice", theme: "system", lang: "en", beta: false, version: "2.0" }
```

---

### 14. DELETE with Condition

```sql
CREATE task:1 SET title = 'Deploy v1',    done = true,  priority = 'low';
CREATE task:2 SET title = 'Write tests',  done = false, priority = 'high';
CREATE task:3 SET title = 'Code review',  done = true,  priority = 'medium';
CREATE task:4 SET title = 'Plan sprint',  done = false, priority = 'high';

-- Delete a specific record by ID
DELETE task:4;

-- Delete all completed low-priority tasks
DELETE task WHERE done = true AND priority = 'low';
-- task:1 deleted

-- Delete all completed tasks
DELETE task WHERE done = true;
-- task:3 deleted

-- Verify: only active tasks remain
SELECT * FROM task ORDER BY id;
-- task:2: "Write tests" (done=false)
```

---

### 15. Type Checking

```sql
CREATE sample:1 SET
    text_val  = 'hello',
    num_val   = 42,
    bool_val  = true,
    float_val = 3.14,
    arr_val   = [1, 2, 3],
    null_val  = NONE;

SELECT
    type::is_string(text_val)   AS is_str,
    type::is_number(num_val)    AS is_num,
    type::is_bool(bool_val)     AS is_bool,
    type::is_number(float_val)  AS float_is_num,
    type::is_array(arr_val)     AS is_arr,
    type::is_none(null_val)     AS is_none,
    type::is_string(num_val)    AS num_is_str,
    type::is_null(null_val)     AS is_null_check,
    type::kind(text_val)        AS kind_str,
    type::kind(arr_val)         AS kind_arr
FROM sample:1;
-- is_str: true, is_num: true, is_bool: true, float_is_num: true
-- is_arr: true, is_none: true, num_is_str: false
-- kind_str: "string", kind_arr: "array"
```

---

### 16. Record Links

Record links are references to records in other (or the same) table. They auto-resolve during SELECT.

```sql
CREATE author:tolkien   SET name = 'J.R.R. Tolkien', born = 1892;
CREATE author:tolkien2  SET name = 'Christopher Tolkien', born = 1924;
CREATE publisher:allen  SET name = 'George Allen & Unwin';

CREATE book:lotr   SET
    title     = 'The Lord of the Rings',
    author    = author:tolkien,
    publisher = publisher:allen,
    year      = 1954;
CREATE book:hobbit SET
    title     = 'The Hobbit',
    author    = author:tolkien,
    publisher = publisher:allen,
    year      = 1937;
CREATE book:silm   SET
    title     = 'The Silmarillion',
    author    = author:tolkien2,
    publisher = publisher:allen,
    year      = 1977;

-- Auto-resolve record link: author.name fetched from author table
SELECT title, author.name AS author_name, author.born AS author_born, year
FROM book
ORDER BY year;

-- Filter via linked record field
SELECT title FROM book WHERE author.name = 'J.R.R. Tolkien' ORDER BY year;
-- The Hobbit (1937), The Lord of the Rings (1954)

-- Multi-level: book -> publisher (publisher is also a record link)
SELECT title, publisher.name AS pub FROM book ORDER BY title;

-- Reverse lookup: find all books by Tolkien
SELECT title FROM book WHERE author = author:tolkien ORDER BY year;
```

---

## Graph Edges

### 17. RELATE Edges

`RELATE` creates a directed edge between two records. The edge is stored in an edge table and can carry properties.

```sql
CREATE person:alice SET name = 'Alice', role = 'Engineer';
CREATE person:bob   SET name = 'Bob',   role = 'Designer';
CREATE person:carol SET name = 'Carol', role = 'Manager';

-- Create edges with properties
RELATE person:alice->knows->person:bob   SET since = d'2023-01-15', strength = 8;
RELATE person:alice->knows->person:carol SET since = d'2022-06-01', strength = 9;
RELATE person:bob  ->knows->person:carol SET since = d'2024-03-10', strength = 5;

-- Query the edge table directly
SELECT *, in.name AS from_name, out.name AS to_name
FROM knows
ORDER BY strength DESC;
-- Alice->Carol (9), Alice->Bob (8), Bob->Carol (5)

-- Filter edges by property
SELECT in.name AS from, out.name AS to
FROM knows
WHERE strength >= 8;
-- Alice->Carol, Alice->Bob

-- All edges from Alice
SELECT out.name AS target, strength FROM knows WHERE in = person:alice ORDER BY strength DESC;
```

---

### 18. Outgoing Traversal

The `->` operator follows outgoing edges from a record. The syntax is `->edge_table->target_table`.

```sql
CREATE city:amsterdam SET name = 'Amsterdam';
CREATE city:berlin    SET name = 'Berlin';
CREATE city:prague    SET name = 'Prague';
CREATE city:vienna    SET name = 'Vienna';

RELATE city:amsterdam->connects->city:berlin SET distance_km = 660;
RELATE city:berlin   ->connects->city:prague SET distance_km = 350;
RELATE city:prague   ->connects->city:vienna SET distance_km = 330;

-- Single-hop: direct connections from Amsterdam
SELECT ->connects->city.name AS destinations FROM city:amsterdam;
-- ["Berlin"]

-- Multi-hop: Amsterdam -> Berlin -> Prague
SELECT ->connects->city->connects->city.name AS two_hops FROM city:amsterdam;
-- ["Prague"]

-- Three hops
SELECT ->connects->city->connects->city->connects->city.name AS three_hops FROM city:amsterdam;
-- ["Vienna"]

-- With edge property: only routes under 500 km
SELECT ->connects[WHERE distance_km < 500]->city.name AS short_routes FROM city:berlin;
-- ["Prague"] (350 km; Vienna via Prague is not directly connected)
```

---

### 19. Incoming Traversal

The `<-` operator follows incoming edges — i.e., finds which records point to the current record.

```sql
CREATE person:alice SET name = 'Alice';
CREATE person:bob   SET name = 'Bob';
CREATE person:carol SET name = 'Carol';
CREATE person:dave  SET name = 'Dave';

RELATE person:alice->follows->person:carol;
RELATE person:bob  ->follows->person:carol;
RELATE person:dave ->follows->person:carol;

-- Who follows Carol? (incoming)
SELECT <-follows<-person.name AS followers FROM person:carol;
-- ["Alice", "Bob", "Dave"]

-- Count followers
SELECT array::len(<-follows<-person) AS follower_count FROM person:carol;
-- 3

-- Who does Alice follow? (outgoing from Alice)
SELECT ->follows->person.name AS following FROM person:alice;
-- ["Carol"]
```

---

### 20. Bidirectional Traversal

The `<->` operator follows edges in both directions simultaneously.

```sql
CREATE person:alice SET name = 'Alice';
CREATE person:bob   SET name = 'Bob';
CREATE person:carol SET name = 'Carol';
CREATE person:dave  SET name = 'Dave';

RELATE person:alice->friend->person:bob;
RELATE person:carol->friend->person:bob;
RELATE person:bob  ->friend->person:dave;

-- All people connected to Bob in any direction via 'friend'
SELECT <->friend<->person.name AS connections FROM person:bob;
-- Includes "Alice" (incoming), "Carol" (incoming), "Dave" (outgoing)

-- Bidirectional 2-hop: people within 2 hops of Alice
SELECT <->friend<->person.<->friend<->person.name AS two_hops FROM person:alice;
-- Includes Carol (Alice->Bob<-Carol), Dave (Alice->Bob->Dave)
```

---

### 21. Multi-Hop Traversal

Chain traversals for organizational hierarchies or dependency graphs.

```sql
CREATE org:ceo  SET title = 'CEO',          name = 'Eve';
CREATE org:vp   SET title = 'VP Engineering', name = 'Dave';
CREATE org:lead SET title = 'Tech Lead',    name = 'Carol';
CREATE org:dev1 SET title = 'Developer',    name = 'Alice';
CREATE org:dev2 SET title = 'Developer',    name = 'Bob';

RELATE org:ceo  ->manages->org:vp;
RELATE org:vp   ->manages->org:lead;
RELATE org:lead ->manages->org:dev1;
RELATE org:lead ->manages->org:dev2;

-- 1-hop: CEO's direct reports
SELECT ->manages->org.name AS direct_reports FROM org:ceo;
-- ["Dave"]

-- 2-hop: CEO's indirect reports via VP
SELECT ->manages->org->manages->org.name AS indirect_reports FROM org:ceo;
-- ["Carol"]

-- 3-hop: CEO down to developers
SELECT ->manages->org->manages->org->manages->org.name AS developers FROM org:ceo;
-- ["Alice", "Bob"]

-- Reverse: who manages Carol?
SELECT <-manages<-org.name AS managers FROM org:lead;
-- ["Dave"]

-- Full chain up: all managers above Alice
SELECT <-manages<-org.name AS direct_manager,
       <-manages<-org.<-manages<-org.name AS skip_manager
FROM org:dev1;
-- direct_manager: ["Carol"], skip_manager: ["Dave"]
```

---

## Advanced

### 22. BEGIN / COMMIT Transaction

Transactions group multiple statements into an atomic unit. All statements succeed together or none of them are applied.

```sql
-- Setup accounts
CREATE account:checking SET owner = 'Alice', balance = 1000;
CREATE account:savings  SET owner = 'Alice', balance = 5000;

-- Transfer 200 from checking to savings (atomic)
BEGIN TRANSACTION;
    UPDATE account:checking SET balance -= 200;
    UPDATE account:savings  SET balance += 200;
COMMIT TRANSACTION;

-- Verify: checking = 800, savings = 5200
SELECT id, balance FROM account ORDER BY id;
```

If any statement in the transaction raises an error, the entire transaction is automatically rolled back. You can also manually cancel — see Example 23.

---

### 23. CANCEL Transaction

`CANCEL` explicitly aborts a transaction and rolls back all changes made since `BEGIN`.

```sql
-- Account state: checking = 800
BEGIN TRANSACTION;
    UPDATE account:checking SET balance = 0;    -- Simulate a mistake
    -- Oh no, wrong amount! Roll back everything:
CANCEL TRANSACTION;

-- Verify: balance unchanged, still 800
SELECT balance FROM account:checking;
-- 800

-- Another example: validation in a transaction
BEGIN TRANSACTION;
    LET $new_balance = (SELECT VALUE balance FROM account:checking) - 10000;
    IF $new_balance < 0 {
        CANCEL TRANSACTION;
    };
    UPDATE account:checking SET balance = $new_balance;
COMMIT TRANSACTION;
-- If checking < 10000, transaction is cancelled with no change
```

---

### 24. DEFINE EVENT Trigger

Events fire automatically when records in a table are created, updated, or deleted. Use them for audit logs, notifications, cascading changes, or reactive workflows.

```sql
DEFINE TABLE audit_log SCHEMALESS;
DEFINE TABLE purchase  SCHEMALESS;
DEFINE TABLE inventory SCHEMALESS;

-- Audit log trigger: fires on every CREATE
DEFINE EVENT log_purchase ON TABLE purchase WHEN $event = "CREATE" THEN {
    CREATE audit_log SET
        action    = 'purchase_created',
        record_id = $value.id,
        amount    = $value.amount,
        item      = $value.item,
        logged_at = time::now();
};

-- Inventory deduction trigger: fires on CREATE purchase
DEFINE EVENT deduct_inventory ON TABLE purchase WHEN $event = "CREATE" THEN {
    UPDATE inventory SET quantity -= $value.qty WHERE item = $value.item;
};

-- Track changes on UPDATE: record old and new value
DEFINE TABLE salary_history SCHEMALESS;
DEFINE EVENT track_salary_change ON TABLE employee WHEN $event = "UPDATE" AND $before.salary != $after.salary THEN {
    CREATE salary_history SET
        employee_id = $value.id,
        old_salary  = $before.salary,
        new_salary  = $after.salary,
        changed_at  = time::now();
};

-- Test the audit log trigger
CREATE inventory:laptop SET item = 'laptop', quantity = 50;
CREATE purchase:1 SET item = 'laptop', qty = 3, amount = 3897, buyer = 'Alice';
CREATE purchase:2 SET item = 'laptop', qty = 1, amount = 1299, buyer = 'Bob';

-- Verify audit log was created automatically
SELECT * FROM audit_log ORDER BY logged_at;
-- 2 entries automatically created

-- Verify inventory was decremented automatically
SELECT quantity FROM inventory:laptop;
-- 46 (50 - 3 - 1)
```

Available event variables:
- `$event` — `"CREATE"`, `"UPDATE"`, or `"DELETE"`
- `$value` — the current record after the change
- `$before` — the record state before an UPDATE (NONE for CREATE)
- `$after` — same as `$value` for UPDATE

---

### 25. DEFINE INDEX and UNIQUE Constraint

Indexes accelerate queries on specific fields. The `UNIQUE` modifier rejects duplicate values at write time.

```sql
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD email      ON user TYPE string;
DEFINE FIELD username   ON user TYPE string;
DEFINE FIELD name       ON user TYPE string;
DEFINE FIELD age        ON user TYPE int;
DEFINE FIELD department ON user TYPE string;

-- Unique index on email: rejects duplicate email values
DEFINE INDEX idx_email ON user FIELDS email UNIQUE;

-- Composite unique index: (username, department) pair must be unique
DEFINE INDEX idx_username_dept ON user FIELDS username, department UNIQUE;

-- Non-unique index for performance on age queries
DEFINE INDEX idx_age ON user FIELDS age;

-- Insert records
CREATE user:1 SET email = 'alice@example.com', username = 'alice', name = 'Alice', age = 30, department = 'Engineering';
CREATE user:2 SET email = 'bob@example.com',   username = 'bob',   name = 'Bob',   age = 25, department = 'Engineering';
CREATE user:3 SET email = 'carol@example.com', username = 'carol', name = 'Carol', age = 30, department = 'Research';

-- Duplicate email fails
CREATE user:4 SET email = 'alice@example.com', username = 'alice2', name = 'Duplicate', age = 40, department = 'Sales';
-- ERROR: Unique index 'idx_email' prevents duplicate email 'alice@example.com'

-- Same username in a different department is allowed (composite index)
CREATE user:5 SET email = 'alice2@example.com', username = 'alice', name = 'Alice2', age = 28, department = 'Sales';
-- OK: (alice, Sales) is a unique (username, department) pair

-- Same username in same department fails
CREATE user:6 SET email = 'alice3@example.com', username = 'alice', name = 'Alice3', age = 32, department = 'Engineering';
-- ERROR: Unique composite index prevents duplicate (alice, Engineering)

-- Query using indexed field (index used automatically)
SELECT name, email FROM user WHERE age = 30 ORDER BY name;
-- Alice, Carol

-- Full-text search index
DEFINE ANALYZER eng TOKENIZERS blank FILTERS lowercase, snowball(english);
DEFINE INDEX idx_name_search ON user FIELDS name SEARCH ANALYZER eng BM25;

SELECT name, search::score(1) AS score FROM user WHERE name @1@ "carol" ORDER BY score DESC;

-- Inspect index metadata
INFO FOR TABLE user;
```
