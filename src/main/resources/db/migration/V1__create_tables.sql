CREATE TABLE IF NOT EXISTS banks (
    bank_id INT AUTO_INCREMENT,
    bank_name VARCHAR(50),
    PRIMARY KEY (bank_id),
    CONSTRAINT unique_bank UNIQUE (bank_name)
)
    ENGINE = InnoDB
    CHARACTER SET UTF8MB4;

CREATE TABLE IF NOT EXISTS accounts (
    account_id INT NOT NULL AUTO_INCREMENT,
    bank_id INT NOT NULL,
    bank_name VARCHAR(25) NOT NULL,
    account_name VARCHAR(25) NOT NULL,
    account_type VARCHAR(25) NOT NULL,
    init_balance NUMERIC,
    PRIMARY KEY (account_id),
    CONSTRAINT FOREIGN KEY (bank_id) REFERENCES banks(bank_id),
    CONSTRAINT account_unique UNIQUE (bank_name, account_name)
)
    ENGINE = InnoDB
    CHARACTER SET UTF8MB4;

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT NOT NULL AUTO_INCREMENT,
    account_id INT,
    category VARCHAR(50),
    description VARCHAR(100),
    transaction_type VARCHAR(50),
    transaction_date DATE,
    post_date DATE,
    memo VARCHAR(200),
    address VARCHAR(200),
    amount NUMERIC,
    bank_name VARCHAR(50),
    account_name VARCHAR(50),
    is_duplicate VARCHAR(1) DEFAULT 'n',
    PRIMARY KEY (transaction_id),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id),
    CONSTRAINT transaction_unique UNIQUE (account_id, category, transaction_type, transaction_date,
                                          post_date, amount, memo)
)
    ENGINE = InnoDB
    CHARACTER SET UTF8MB4;

CREATE TABLE IF NOT EXISTS csv_column_mapping (
    ccm_id INT AUTO_INCREMENT,
    account_id INT,
    transaction_column VARCHAR(20),
    input_column VARCHAR(20),
    date_format VARCHAR(20),
    PRIMARY KEY (ccm_id),
    CONSTRAINT FOREIGN KEY (account_id) REFERENCES accounts(account_id),
    CONSTRAINT account_unique UNIQUE (account_id, transaction_column)
)
    ENGINE = InnoDB
    CHARACTER SET UTF8MB4;
