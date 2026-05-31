# Database Documentation

## PostgreSQL Notes

Postgres automatically creates indexes for `UNIQUE` columns.

**Example:**
```sql
fake_id  BIGINT       UNIQUE NOT NULL,
email    VARCHAR(255) UNIQUE NOT NULL,
phone    VARCHAR(20)  UNIQUE NOT NULL,
username VARCHAR(100) UNIQUE NOT NULL,
```

Internal indexes will be created automatically for all the above columns.

---

## Goose File Creation

To create a new goose migration file, run the following command:
```bash
goose -dir db/migrations create <migration_name> sql
```

## Goose Migrations

1.  **Run Migrations:** Run the following command to create the tables in your database:
    ```bash
    goose -dir db/migrations up
    ```
2.  **Rollback:** To undo the last migration:
    ```bash
    goose -dir db/migrations down
    ```
3.  **Rollback Specific:** To undo migrations down to a specific version:
    ```bash
    goose -dir db/migrations down-to <version>
    ```
4.  **Status:** To see which migrations have been applied:
    ```bash
    goose -dir db/migrations status
    ```
5.  **Create New Migration:** To create a new migration file:
    ```bash
    goose -dir db/migrations create <migration_name> sql
    ```
## Sqlc Notes
1. Generate code: Run the following command to generate code from the queries:
    ```bash
    sqlc generate
    ```