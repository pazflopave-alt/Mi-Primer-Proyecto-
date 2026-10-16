/*
# Update subscription amount default from 29990 to 10000

1. Modified Tables
- `subscriptions`: changed `amount_clp` default from 29990 to 10000.
2. Notes
- Non-destructive: only changes the column default, no data loss.
*/

ALTER TABLE subscriptions ALTER COLUMN amount_clp SET DEFAULT 10000;