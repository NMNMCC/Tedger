-- Convert existing positive amounts to negative (they were all expenses)
UPDATE ledger_entries SET amount = -amount, converted_amount = -converted_amount WHERE amount > 0;
