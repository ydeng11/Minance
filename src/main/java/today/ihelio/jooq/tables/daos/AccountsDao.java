/*
 * This file is generated by jOOQ.
 */
package today.ihelio.jooq.tables.daos;


import java.util.List;
import java.util.Optional;

import org.jooq.Configuration;
import org.jooq.impl.DAOImpl;

import today.ihelio.jooq.tables.Accounts;
import today.ihelio.jooq.tables.records.AccountsRecord;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class AccountsDao extends DAOImpl<AccountsRecord, today.ihelio.jooq.tables.pojos.Accounts, Integer> {

    /**
     * Create a new AccountsDao without any configuration
     */
    public AccountsDao() {
        super(Accounts.ACCOUNTS, today.ihelio.jooq.tables.pojos.Accounts.class);
    }

    /**
     * Create a new AccountsDao with an attached configuration
     */
    public AccountsDao(Configuration configuration) {
        super(Accounts.ACCOUNTS, today.ihelio.jooq.tables.pojos.Accounts.class, configuration);
    }

    @Override
    public Integer getId(today.ihelio.jooq.tables.pojos.Accounts object) {
        return object.getAccountId();
    }

    /**
     * Fetch records that have <code>account_id BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchRangeOfAccountId(Integer lowerInclusive, Integer upperInclusive) {
        return fetchRange(Accounts.ACCOUNTS.ACCOUNT_ID, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>account_id IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchByAccountId(Integer... values) {
        return fetch(Accounts.ACCOUNTS.ACCOUNT_ID, values);
    }

    /**
     * Fetch a unique record that has <code>account_id = value</code>
     */
    public today.ihelio.jooq.tables.pojos.Accounts fetchOneByAccountId(Integer value) {
        return fetchOne(Accounts.ACCOUNTS.ACCOUNT_ID, value);
    }

    /**
     * Fetch a unique record that has <code>account_id = value</code>
     */
    public Optional<today.ihelio.jooq.tables.pojos.Accounts> fetchOptionalByAccountId(Integer value) {
        return fetchOptional(Accounts.ACCOUNTS.ACCOUNT_ID, value);
    }

    /**
     * Fetch records that have <code>bank_id BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchRangeOfBankId(Integer lowerInclusive, Integer upperInclusive) {
        return fetchRange(Accounts.ACCOUNTS.BANK_ID, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>bank_id IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchByBankId(Integer... values) {
        return fetch(Accounts.ACCOUNTS.BANK_ID, values);
    }

    /**
     * Fetch records that have <code>bank_name BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchRangeOfBankName(String lowerInclusive, String upperInclusive) {
        return fetchRange(Accounts.ACCOUNTS.BANK_NAME, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>bank_name IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchByBankName(String... values) {
        return fetch(Accounts.ACCOUNTS.BANK_NAME, values);
    }

    /**
     * Fetch records that have <code>account_name BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchRangeOfAccountName(String lowerInclusive, String upperInclusive) {
        return fetchRange(Accounts.ACCOUNTS.ACCOUNT_NAME, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>account_name IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchByAccountName(String... values) {
        return fetch(Accounts.ACCOUNTS.ACCOUNT_NAME, values);
    }

    /**
     * Fetch records that have <code>account_type BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchRangeOfAccountType(String lowerInclusive, String upperInclusive) {
        return fetchRange(Accounts.ACCOUNTS.ACCOUNT_TYPE, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>account_type IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchByAccountType(String... values) {
        return fetch(Accounts.ACCOUNTS.ACCOUNT_TYPE, values);
    }

    /**
     * Fetch records that have <code>init_balance BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchRangeOfInitBalance(Long lowerInclusive, Long upperInclusive) {
        return fetchRange(Accounts.ACCOUNTS.INIT_BALANCE, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>init_balance IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Accounts> fetchByInitBalance(Long... values) {
        return fetch(Accounts.ACCOUNTS.INIT_BALANCE, values);
    }
}
