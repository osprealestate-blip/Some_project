-- Speed: many pages ask for the newest sale or rent date (`select max(txn_date) from transactions`). Without an index on the
-- date alone that reads the whole table each time. These two indexes make it an instant lookup. Safe to re-run.
create index if not exists transactions_txn_date on transactions (txn_date);
create index if not exists rent_contracts_start_date on rent_contracts (start_date);
