# Income report read model

`GET /api/reports/income/{landlordId}?year={year}` reads only ReportService's SQL projections. It keeps the existing successful JSON response shape and existing authentication, role, and landlord-ownership checks. If no property projection exists for the landlord, it returns `503` with an `Income report projection is not ready` problem response instead of treating an uninitialized projection as a zero report.

ReportService consumes lease-created/cancelled and rent/deposit payment completion/failure contracts, plus the property and maintenance projection events. Property and maintenance publish after their source writes have succeeded. Projection rows are keyed by source entity IDs and ignore stale event timestamps so redelivery is idempotent.

Payment events now carry the source payment's currency and creation timestamp. The report consumer uses the source timestamp (falling back to the broker sent time for legacy events) and currency (falling back to `UNKNOWN` for legacy payloads). A requested year containing a successful rent payment with unknown currency returns `503` rather than including a potentially non-TRY amount in a TRY report. Existing projection rows and records written before event projections were deployed still require replay or a source snapshot to be fully represented.

Maintenance publication is registered in `MaintenanceService.API` using MassTransit and the configured RabbitMQ credentials. Property and maintenance events are published after source writes succeed.
