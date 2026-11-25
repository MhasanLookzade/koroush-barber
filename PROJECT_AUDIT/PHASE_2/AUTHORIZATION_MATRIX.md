# Phase 2 — Authorization Matrix

| Endpoint | Public | Customer | STAFF | OWNER |
|---|---|---|---|---|
| `GET /api/appointments` | 401 | 401 | 200 | 200 |
| `POST /api/appointments` | 401 | 401 | 201 | 201 |
| `GET / PUT /api/appointments/[id]` | 401 | 401 | 200/404 | 200/404 |
| `DELETE /api/appointments/[id]` | 401 | 401 | **403** | 200/404 |
| `GET /api/barbers` | 200 (public fields only) | 200 (public fields only) | 200 (full) | 200 (full) |
| `POST /api/barbers` | 401 | 401 | **403** | 201 |
| `GET /api/barbers/[id]` | 200 (no PII/appts) | 200 (no PII/appts) | 200 (with appts) | 200 (with appts) |
| `PUT / DELETE /api/barbers/[id]` | 401 | 401 | **403** | 200/404 |
| `GET /api/services` & `GET /[id]` | 200 (active only) | 200 (active only) | 200 | 200 |
| `POST /api/services` & `PUT/DELETE /[id]` | 401 | 401 | **403** | 200/201/404 |
