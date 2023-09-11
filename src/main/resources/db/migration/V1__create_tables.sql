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
    init_balance DECIMAL(9, 2),
    PRIMARY KEY (account_id),
    CONSTRAINT FOREIGN KEY (bank_id) REFERENCES banks(bank_id),
    CONSTRAINT account_unique UNIQUE (bank_name, account_type, account_name)
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
    address VARCHAR(100),
    city VARCHAR(30),
    state_name VARCHAR(30),
    country VARCHAR(10),
    zipcode VARCHAR(10),
    amount DECIMAL(9, 2),
    bank_name VARCHAR(50),
    account_name VARCHAR(50),
    upload_time VARCHAR(20),
    is_duplicate BOOLEAN DEFAULT false,
    PRIMARY KEY (transaction_id),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id),
    CONSTRAINT transaction_unique UNIQUE (account_id, category, transaction_type, transaction_date,
                                          post_date, amount, memo)
)
    ENGINE = InnoDB
    CHARACTER SET UTF8MB4;

CREATE TABLE IF NOT EXISTS minance_category (
    m_category_id INT AUTO_INCREMENT,
    category VARCHAR(20) NOT NULL,
    PRIMARY KEY (m_category_id),
    CONSTRAINT minance_category_unique UNIQUE (category)
)
    ENGINE = InnoDB
    CHARACTER SET UTF8MB4;

CREATE TABLE IF NOT EXISTS raw_category_to_minance_category (
    rc_to_mc_id INT AUTO_INCREMENT,
    raw_category VARCHAR(100) NOT NULL,
    minance_category_id INT NOT NULL,
    PRIMARY KEY (rc_to_mc_id),
    FOREIGN KEY (minance_category_id) REFERENCES minance_category(m_category_id)
)
    ENGINE = InnoDB
    CHARACTER SET UTF8MB4;
