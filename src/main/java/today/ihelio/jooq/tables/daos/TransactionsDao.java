/*
 * This file is generated by jOOQ.
 */
package today.ihelio.jooq.tables.daos;


import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.jooq.Configuration;
import org.jooq.impl.DAOImpl;

import today.ihelio.jooq.tables.Transactions;
import today.ihelio.jooq.tables.records.TransactionsRecord;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes", "this-escape" })
public class TransactionsDao extends DAOImpl<TransactionsRecord, today.ihelio.jooq.tables.pojos.Transactions, Integer> {

    /**
     * Create a new TransactionsDao without any configuration
     */
    public TransactionsDao() {
        super(Transactions.TRANSACTIONS, today.ihelio.jooq.tables.pojos.Transactions.class);
    }

    /**
     * Create a new TransactionsDao with an attached configuration
     */
    public TransactionsDao(Configuration configuration) {
        super(Transactions.TRANSACTIONS, today.ihelio.jooq.tables.pojos.Transactions.class, configuration);
    }

    @Override
    public Integer getId(today.ihelio.jooq.tables.pojos.Transactions object) {
        return object.getTransactionId();
    }

    /**
     * Fetch records that have <code>transaction_id BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfTransactionId(Integer lowerInclusive, Integer upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.TRANSACTION_ID, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>transaction_id IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByTransactionId(Integer... values) {
        return fetch(Transactions.TRANSACTIONS.TRANSACTION_ID, values);
    }

    /**
     * Fetch a unique record that has <code>transaction_id = value</code>
     */
    public today.ihelio.jooq.tables.pojos.Transactions fetchOneByTransactionId(Integer value) {
        return fetchOne(Transactions.TRANSACTIONS.TRANSACTION_ID, value);
    }

    /**
     * Fetch a unique record that has <code>transaction_id = value</code>
     */
    public Optional<today.ihelio.jooq.tables.pojos.Transactions> fetchOptionalByTransactionId(Integer value) {
        return fetchOptional(Transactions.TRANSACTIONS.TRANSACTION_ID, value);
    }

    /**
     * Fetch records that have <code>account_id BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfAccountId(Integer lowerInclusive, Integer upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.ACCOUNT_ID, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>account_id IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByAccountId(Integer... values) {
        return fetch(Transactions.TRANSACTIONS.ACCOUNT_ID, values);
    }

    /**
     * Fetch records that have <code>category BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfCategory(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.CATEGORY, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>category IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByCategory(String... values) {
        return fetch(Transactions.TRANSACTIONS.CATEGORY, values);
    }

    /**
     * Fetch records that have <code>description BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfDescription(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.DESCRIPTION, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>description IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByDescription(String... values) {
        return fetch(Transactions.TRANSACTIONS.DESCRIPTION, values);
    }

    /**
     * Fetch records that have <code>transaction_type BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfTransactionType(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.TRANSACTION_TYPE, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>transaction_type IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByTransactionType(String... values) {
        return fetch(Transactions.TRANSACTIONS.TRANSACTION_TYPE, values);
    }

    /**
     * Fetch records that have <code>transaction_date BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfTransactionDate(LocalDate lowerInclusive, LocalDate upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.TRANSACTION_DATE, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>transaction_date IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByTransactionDate(LocalDate... values) {
        return fetch(Transactions.TRANSACTIONS.TRANSACTION_DATE, values);
    }

    /**
     * Fetch records that have <code>post_date BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfPostDate(LocalDate lowerInclusive, LocalDate upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.POST_DATE, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>post_date IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByPostDate(LocalDate... values) {
        return fetch(Transactions.TRANSACTIONS.POST_DATE, values);
    }

    /**
     * Fetch records that have <code>memo BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfMemo(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.MEMO, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>memo IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByMemo(String... values) {
        return fetch(Transactions.TRANSACTIONS.MEMO, values);
    }

    /**
     * Fetch records that have <code>address BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfAddress(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.ADDRESS, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>address IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByAddress(String... values) {
        return fetch(Transactions.TRANSACTIONS.ADDRESS, values);
    }

    /**
     * Fetch records that have <code>city BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfCity(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.CITY, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>city IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByCity(String... values) {
        return fetch(Transactions.TRANSACTIONS.CITY, values);
    }

    /**
     * Fetch records that have <code>state_name BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfStateName(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.STATE_NAME, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>state_name IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByStateName(String... values) {
        return fetch(Transactions.TRANSACTIONS.STATE_NAME, values);
    }

    /**
     * Fetch records that have <code>country BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfCountry(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.COUNTRY, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>country IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByCountry(String... values) {
        return fetch(Transactions.TRANSACTIONS.COUNTRY, values);
    }

    /**
     * Fetch records that have <code>zipcode BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfZipcode(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.ZIPCODE, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>zipcode IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByZipcode(String... values) {
        return fetch(Transactions.TRANSACTIONS.ZIPCODE, values);
    }

    /**
     * Fetch records that have <code>amount BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfAmount(BigDecimal lowerInclusive, BigDecimal upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.AMOUNT, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>amount IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByAmount(BigDecimal... values) {
        return fetch(Transactions.TRANSACTIONS.AMOUNT, values);
    }

    /**
     * Fetch records that have <code>bank_name BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfBankName(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.BANK_NAME, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>bank_name IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByBankName(String... values) {
        return fetch(Transactions.TRANSACTIONS.BANK_NAME, values);
    }

    /**
     * Fetch records that have <code>account_name BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfAccountName(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.ACCOUNT_NAME, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>account_name IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByAccountName(String... values) {
        return fetch(Transactions.TRANSACTIONS.ACCOUNT_NAME, values);
    }

    /**
     * Fetch records that have <code>upload_time BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfUploadTime(String lowerInclusive, String upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.UPLOAD_TIME, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>upload_time IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByUploadTime(String... values) {
        return fetch(Transactions.TRANSACTIONS.UPLOAD_TIME, values);
    }

    /**
     * Fetch records that have <code>is_duplicate BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchRangeOfIsDuplicate(Integer lowerInclusive, Integer upperInclusive) {
        return fetchRange(Transactions.TRANSACTIONS.IS_DUPLICATE, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>is_duplicate IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.Transactions> fetchByIsDuplicate(Integer... values) {
        return fetch(Transactions.TRANSACTIONS.IS_DUPLICATE, values);
    }
}
