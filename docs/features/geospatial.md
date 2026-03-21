# Geospatial

IndentiaDB supports GeoSPARQL — the OGC/W3C standard for spatial querying of RDF data. Geometries are stored as RDF literals with type `geo:wktLiteral`, indexed with 60-bit precision, and queried with standard GeoSPARQL functions.

---

## 60-Bit Geospatial Encoding

IndentiaDB encodes each geometry's bounding-box centroid as a 60-bit integer by interleaving 30 bits of latitude and 30 bits of longitude. This encoding:

- Fits in a single 64-bit machine word for fast comparison.
- Provides ~1cm precision at the equator (2^30 subdivisions over ±90°/±180°).
- Maps naturally to the existing key-value index as a range-scannable spatial prefix.

Point lookups use the exact 60-bit code. Range-based spatial queries (within bounding box, distance radius) are implemented as key-range scans over the encoded space, followed by precise geometric refinement using WKT.

!!! note "Supported Geometry Types"
    `POINT`, `LINESTRING`, `POLYGON`, `MULTIPOINT`, `MULTILINESTRING`, `MULTIPOLYGON`, and `GEOMETRYCOLLECTION` are all supported in WKT format. All coordinates are in WGS 84 (EPSG:4326) — longitude first, latitude second, matching the GeoSPARQL standard.

---

## WKT (Well-Known Text) Parsing

Geometries are stored as WKT literals typed as `geo:wktLiteral`:

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX ex:   <http://example.org/>

INSERT DATA {
    ex:amsterdam
        a ex:City ;
        ex:name "Amsterdam" ;
        geo:hasGeometry [
            a geo:Geometry ;
            geo:asWKT "POINT(4.9 52.37)"^^geo:wktLiteral
        ] .

    ex:rotterdam
        a ex:City ;
        ex:name "Rotterdam" ;
        geo:hasGeometry [
            a geo:Geometry ;
            geo:asWKT "POINT(4.48 51.92)"^^geo:wktLiteral
        ] .

    ex:port_area
        a ex:Zone ;
        ex:name "Port of Rotterdam" ;
        geo:hasGeometry [
            a geo:Geometry ;
            geo:asWKT "POLYGON((4.38 51.88, 4.58 51.88, 4.58 51.96, 4.38 51.96, 4.38 51.88))"^^geo:wktLiteral
        ] .
}
```

---

## Nearest Neighbor Query

Find the N nearest places to a reference point:

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?place ?name ?distance WHERE {
    ?place a ex:City ;
           ex:name ?name ;
           geo:hasGeometry ?geom .
    ?geom geo:asWKT ?wkt .

    BIND(geof:distance(?wkt, "POINT(4.9 52.37)"^^geo:wktLiteral, "km") AS ?distance)
    FILTER(?distance < 100)
}
ORDER BY ?distance
LIMIT 10
```

---

## Distance Join Query

Join two sets of geometries by spatial proximity:

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?store ?hospital ?distance WHERE {
    # All stores
    ?store a ex:Store ;
           geo:hasGeometry/geo:asWKT ?storeWkt .

    # All hospitals
    ?hospital a ex:Hospital ;
              geo:hasGeometry/geo:asWKT ?hospitalWkt .

    # Compute distance
    BIND(geof:distance(?storeWkt, ?hospitalWkt, "km") AS ?distance)
    FILTER(?distance < 2.0)
}
ORDER BY ?store ?distance
```

This returns every (store, hospital) pair where the hospital is within 2 km of the store.

---

## GeoSPARQL Functions Reference

| Function | Description | Example |
|----------|-------------|---------|
| `geof:distance(geom1, geom2, units)` | Distance between geometries | `geof:distance(?wkt1, ?wkt2, "km")` |
| `geof:buffer(geom, radius, units)` | Buffer polygon around geometry | `geof:buffer(?wkt, 1.5, "km")` |
| `geof:within(geom1, geom2)` | True if geom1 is within geom2 | `FILTER(geof:within(?point, ?polygon))` |
| `geof:contains(geom1, geom2)` | True if geom1 contains geom2 | `FILTER(geof:contains(?region, ?store))` |
| `geof:intersects(geom1, geom2)` | True if geometries intersect | `FILTER(geof:intersects(?route, ?zone))` |
| `geof:touches(geom1, geom2)` | True if geometries share a boundary | `FILTER(geof:touches(?parcel1, ?parcel2))` |
| `geof:overlaps(geom1, geom2)` | True if geometries overlap | `FILTER(geof:overlaps(?zone1, ?zone2))` |
| `geof:disjoint(geom1, geom2)` | True if geometries have no intersection | `FILTER(geof:disjoint(?area, ?exclusionZone))` |
| `geof:union(geom1, geom2)` | Union of two geometries | `BIND(geof:union(?geom1, ?geom2) AS ?merged)` |
| `geof:envelope(geom)` | Bounding box of a geometry | `BIND(geof:envelope(?polygon) AS ?bbox)` |
| `geof:centroid(geom)` | Centroid point | `BIND(geof:centroid(?polygon) AS ?center)` |

Unit strings: `"km"`, `"m"`, `"mi"`, `"ft"`, `"deg"` (decimal degrees).

---

## SPARQL GeoSPARQL Query: Places Within 50km

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?place ?name ?distance WHERE {
    ?place a ex:Place ;
           ex:name ?name ;
           geo:hasGeometry ?geom .
    ?geom geo:asWKT ?wkt .

    BIND(geof:distance(?wkt, "POINT(4.9 52.37)"^^geo:wktLiteral, "km") AS ?distance)
    FILTER(?distance < 50)
}
ORDER BY ?distance
```

---

## SPARQL GeoSPARQL Query: Points Within a Polygon

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?sensor ?name WHERE {
    ?sensor a ex:Sensor ;
            ex:name ?name ;
            geo:hasGeometry/geo:asWKT ?sensorWkt .

    FILTER(geof:within(
        ?sensorWkt,
        "POLYGON((4.8 52.3, 5.1 52.3, 5.1 52.5, 4.8 52.5, 4.8 52.3))"^^geo:wktLiteral
    ))
}
```

---

## CLI: Compute Distance Between Two Points

```bash
indentiagraph query geo \
  --profile dev \
  --function geof:distance \
  --arg '{"wkt":"POINT(4.9 52.37)"}' \
  --arg '{"wkt":"POINT(5.12 52.09)"}' \
  --unit km
```

**Output:**

```json
{
  "function": "geof:distance",
  "result": 34.72,
  "unit": "km"
}
```

Other CLI examples:

```bash
# Buffer a point by 1km (returns WKT polygon)
indentiagraph query geo \
  --profile dev \
  --function geof:buffer \
  --arg '{"wkt":"POINT(4.9 52.37)"}' \
  --arg '{"radius": 1.0, "unit": "km"}'

# Check if a point is within a polygon
indentiagraph query geo \
  --profile dev \
  --function geof:within \
  --arg '{"wkt":"POINT(4.9 52.37)"}' \
  --arg '{"wkt":"POLYGON((4.8 52.3, 5.1 52.3, 5.1 52.5, 4.8 52.5, 4.8 52.3))"}'
```

---

## Python Integration Example

```python
import requests
import json

SPARQL_ENDPOINT = "http://localhost:7001/sparql"
UPDATE_ENDPOINT = "http://localhost:7001/update"

def insert_location(uri: str, name: str, lon: float, lat: float):
    """Insert a named location with a WKT point geometry."""
    sparql_update = f"""
        PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
        PREFIX ex:   <http://example.org/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        INSERT DATA {{
            <{uri}>
                a ex:Location ;
                rdfs:label "{name}" ;
                geo:hasGeometry [
                    a geo:Geometry ;
                    geo:asWKT "POINT({lon} {lat})"^^geo:wktLiteral
                ] .
        }}
    """
    resp = requests.post(
        UPDATE_ENDPOINT,
        headers={"Content-Type": "application/sparql-update"},
        data=sparql_update,
    )
    resp.raise_for_status()


def find_nearby(lon: float, lat: float, radius_km: float) -> list[dict]:
    """Find all locations within radius_km of the given coordinates."""
    sparql_query = f"""
        PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
        PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX ex:   <http://example.org/>

        SELECT ?location ?name ?distance WHERE {{
            ?location a ex:Location ;
                      rdfs:label ?name ;
                      geo:hasGeometry/geo:asWKT ?wkt .

            BIND(geof:distance(?wkt, "POINT({lon} {lat})"^^geo:wktLiteral, "km") AS ?distance)
            FILTER(?distance < {radius_km})
        }}
        ORDER BY ?distance
    """
    resp = requests.post(
        SPARQL_ENDPOINT,
        headers={
            "Content-Type": "application/sparql-query",
            "Accept":       "application/sparql-results+json",
        },
        data=sparql_query,
    )
    resp.raise_for_status()
    bindings = resp.json()["results"]["bindings"]
    return [
        {
            "uri":      b["location"]["value"],
            "name":     b["name"]["value"],
            "distance": float(b["distance"]["value"]),
        }
        for b in bindings
    ]


# Insert some locations
insert_location("http://example.org/dam",           "Dam Square",        4.8952,  52.3731)
insert_location("http://example.org/rijksmuseum",   "Rijksmuseum",       4.8852,  52.3600)
insert_location("http://example.org/anne_frank",    "Anne Frank House",  4.8839,  52.3752)
insert_location("http://example.org/central_station","Amsterdam Centraal", 4.9000, 52.3791)

# Find everything within 1km of the Dam
nearby = find_nearby(lon=4.8952, lat=52.3731, radius_km=1.0)
print(f"Found {len(nearby)} locations within 1km:")
for loc in nearby:
    print(f"  {loc['name']}: {loc['distance']:.3f} km")
```

---

## Configuration

```toml
[geospatial]
enabled           = true
default_crs       = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"   # WGS84
precision_bits    = 60       # bits for geohash (30 lat + 30 lon)
max_distance_km   = 20000    # Maximum allowed distance in FILTER clauses

[geospatial.index]
type              = "geohash"    # "geohash" | "r-tree" (future)
cell_size_meters  = 1            # ~1cm precision at 60 bits
```

!!! tip "Coordinate Order: Longitude First"
    GeoSPARQL and WKT use **longitude, latitude** order (X, Y in Cartesian terms). This is the opposite of GPS coordinate display conventions (which show latitude first). `POINT(4.9 52.37)` means longitude=4.9°E, latitude=52.37°N (Amsterdam).
