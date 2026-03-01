CREATE TABLE IF NOT EXISTS banks
(
    bank_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS accounts
(
    account_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id      INTEGER NOT NULL,
    bank_name    TEXT    NOT NULL,
    account_name TEXT    NOT NULL,
    account_type TEXT    NOT NULL,
    init_balance DECIMAL(9, 2),
    FOREIGN KEY (bank_id) REFERENCES banks (bank_id),
    UNIQUE (bank_name, account_name)
);

CREATE TABLE IF NOT EXISTS transactions
(
    transaction_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id       INTEGER,
    category         TEXT,
    description      TEXT,
    transaction_type TEXT,
    transaction_date DATE,
    post_date        DATE,
    memo             TEXT,
    address          TEXT,
    city             TEXT,
    state_name       TEXT,
    country          TEXT,
    zipcode          TEXT,
    amount           DECIMAL(9, 2),
    bank_name        TEXT,
    account_name     TEXT,
    upload_time      TEXT,
    is_duplicate     INTEGER DEFAULT 0,
    FOREIGN KEY (account_id) REFERENCES accounts (account_id),
    UNIQUE (account_id, category, transaction_type, transaction_date,
            post_date, amount, memo)
);

CREATE TABLE IF NOT EXISTS minance_category
(
    m_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category      TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS raw_category_to_minance_category
(
    rc_to_mc_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_category        TEXT    NOT NULL,
    minance_category_id INTEGER NOT NULL,
    FOREIGN KEY (minance_category_id) REFERENCES minance_category (m_category_id)
);
