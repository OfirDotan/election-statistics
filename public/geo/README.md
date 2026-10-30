# Country outline

`israel.geojson` is the Israel ADM0 boundary from geoBoundaries gbOpen, release `9469f09`
(build 2023-12-12), coordinates rounded to 5 decimals (~1 m).

- Source: https://www.geoboundaries.org/api/current/gbOpen/ISR/ADM0/
- Boundary data: OpenStreetMap via Wambacher, http://www.openstreetmap.org/copyright
- License: Open Data Commons Open Database License (ODbL) 1.0

Municipal polygons from GovMap do not cover the country: they only meet corner to corner, so
drawing their union leaves no outline. This file is drawn under them instead.

That file stops at the 1949 lines, which left Gaza and the West Bank (areas A, B and C) outside it.
Two points were added on lon 34.44, the closest point of that line to Nablus (34°26'N 35°17'E):
one joins the two halves across the West Bank, the other is the 1949 line drawn along Gaza's east
edge. Gaza and the West Bank are now inside the ring, with the 1949 line as their border.
