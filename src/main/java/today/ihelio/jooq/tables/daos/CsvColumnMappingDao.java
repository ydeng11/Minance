/*
 * This file is generated by jOOQ.
 */
package today.ihelio.jooq.tables.daos;


import java.util.List;
import java.util.Optional;

import org.jooq.Configuration;
import org.jooq.impl.DAOImpl;

import today.ihelio.jooq.tables.CsvColumnMapping;
import today.ihelio.jooq.tables.records.CsvColumnMappingRecord;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class CsvColumnMappingDao extends DAOImpl<CsvColumnMappingRecord, today.ihelio.jooq.tables.pojos.CsvColumnMapping, Integer> {

    /**
     * Create a new CsvColumnMappingDao without any configuration
     */
    public CsvColumnMappingDao() {
        super(CsvColumnMapping.CSV_COLUMN_MAPPING, today.ihelio.jooq.tables.pojos.CsvColumnMapping.class);
    }

    /**
     * Create a new CsvColumnMappingDao with an attached configuration
     */
    public CsvColumnMappingDao(Configuration configuration) {
        super(CsvColumnMapping.CSV_COLUMN_MAPPING, today.ihelio.jooq.tables.pojos.CsvColumnMapping.class, configuration);
    }

    @Override
    public Integer getId(today.ihelio.jooq.tables.pojos.CsvColumnMapping object) {
        return object.getCcmId();
    }

    /**
     * Fetch records that have <code>ccm_id BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchRangeOfCcmId(Integer lowerInclusive, Integer upperInclusive) {
        return fetchRange(CsvColumnMapping.CSV_COLUMN_MAPPING.CCM_ID, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>ccm_id IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchByCcmId(Integer... values) {
        return fetch(CsvColumnMapping.CSV_COLUMN_MAPPING.CCM_ID, values);
    }

    /**
     * Fetch a unique record that has <code>ccm_id = value</code>
     */
    public today.ihelio.jooq.tables.pojos.CsvColumnMapping fetchOneByCcmId(Integer value) {
        return fetchOne(CsvColumnMapping.CSV_COLUMN_MAPPING.CCM_ID, value);
    }

    /**
     * Fetch a unique record that has <code>ccm_id = value</code>
     */
    public Optional<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchOptionalByCcmId(Integer value) {
        return fetchOptional(CsvColumnMapping.CSV_COLUMN_MAPPING.CCM_ID, value);
    }

    /**
     * Fetch records that have <code>account_id BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchRangeOfAccountId(Integer lowerInclusive, Integer upperInclusive) {
        return fetchRange(CsvColumnMapping.CSV_COLUMN_MAPPING.ACCOUNT_ID, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>account_id IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchByAccountId(Integer... values) {
        return fetch(CsvColumnMapping.CSV_COLUMN_MAPPING.ACCOUNT_ID, values);
    }

    /**
     * Fetch records that have <code>transaction_column BETWEEN lowerInclusive
     * AND upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchRangeOfTransactionColumn(String lowerInclusive, String upperInclusive) {
        return fetchRange(CsvColumnMapping.CSV_COLUMN_MAPPING.TRANSACTION_COLUMN, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>transaction_column IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchByTransactionColumn(String... values) {
        return fetch(CsvColumnMapping.CSV_COLUMN_MAPPING.TRANSACTION_COLUMN, values);
    }

    /**
     * Fetch records that have <code>input_column BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchRangeOfInputColumn(String lowerInclusive, String upperInclusive) {
        return fetchRange(CsvColumnMapping.CSV_COLUMN_MAPPING.INPUT_COLUMN, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>input_column IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchByInputColumn(String... values) {
        return fetch(CsvColumnMapping.CSV_COLUMN_MAPPING.INPUT_COLUMN, values);
    }

    /**
     * Fetch records that have <code>date_format BETWEEN lowerInclusive AND
     * upperInclusive</code>
     */
    public List<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchRangeOfDateFormat(String lowerInclusive, String upperInclusive) {
        return fetchRange(CsvColumnMapping.CSV_COLUMN_MAPPING.DATE_FORMAT, lowerInclusive, upperInclusive);
    }

    /**
     * Fetch records that have <code>date_format IN (values)</code>
     */
    public List<today.ihelio.jooq.tables.pojos.CsvColumnMapping> fetchByDateFormat(String... values) {
        return fetch(CsvColumnMapping.CSV_COLUMN_MAPPING.DATE_FORMAT, values);
    }
}