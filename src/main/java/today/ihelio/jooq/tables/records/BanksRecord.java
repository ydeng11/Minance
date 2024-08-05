/*
 * This file is generated by jOOQ.
 */
package today.ihelio.jooq.tables.records;


import org.jooq.Field;
import org.jooq.Record1;
import org.jooq.Record2;
import org.jooq.Row2;
import org.jooq.impl.UpdatableRecordImpl;

import today.ihelio.jooq.tables.Banks;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class BanksRecord extends UpdatableRecordImpl<BanksRecord> implements Record2<Integer, String> {

    private static final long serialVersionUID = 1L;

    /**
     * Setter for <code>banks.bank_id</code>.
     */
    public void setBankId(Integer value) {
        set(0, value);
    }

    /**
     * Getter for <code>banks.bank_id</code>.
     */
    public Integer getBankId() {
        return (Integer) get(0);
    }

    /**
     * Setter for <code>banks.bank_name</code>.
     */
    public void setBankName(String value) {
        set(1, value);
    }

    /**
     * Getter for <code>banks.bank_name</code>.
     */
    public String getBankName() {
        return (String) get(1);
    }

    // -------------------------------------------------------------------------
    // Primary key information
    // -------------------------------------------------------------------------

    @Override
    public Record1<Integer> key() {
        return (Record1) super.key();
    }

    // -------------------------------------------------------------------------
    // Record2 type implementation
    // -------------------------------------------------------------------------

    @Override
    public Row2<Integer, String> fieldsRow() {
        return (Row2) super.fieldsRow();
    }

    @Override
    public Row2<Integer, String> valuesRow() {
        return (Row2) super.valuesRow();
    }

    @Override
    public Field<Integer> field1() {
        return Banks.BANKS.BANK_ID;
    }

    @Override
    public Field<String> field2() {
        return Banks.BANKS.BANK_NAME;
    }

    @Override
    public Integer component1() {
        return getBankId();
    }

    @Override
    public String component2() {
        return getBankName();
    }

    @Override
    public Integer value1() {
        return getBankId();
    }

    @Override
    public String value2() {
        return getBankName();
    }

    @Override
    public BanksRecord value1(Integer value) {
        setBankId(value);
        return this;
    }

    @Override
    public BanksRecord value2(String value) {
        setBankName(value);
        return this;
    }

    @Override
    public BanksRecord values(Integer value1, String value2) {
        value1(value1);
        value2(value2);
        return this;
    }

    // -------------------------------------------------------------------------
    // Constructors
    // -------------------------------------------------------------------------

    /**
     * Create a detached BanksRecord
     */
    public BanksRecord() {
        super(Banks.BANKS);
    }

    /**
     * Create a detached, initialised BanksRecord
     */
    public BanksRecord(Integer bankId, String bankName) {
        super(Banks.BANKS);

        setBankId(bankId);
        setBankName(bankName);
        resetChangedOnNotNull();
    }

    /**
     * Create a detached, initialised BanksRecord
     */
    public BanksRecord(today.ihelio.jooq.tables.pojos.Banks value) {
        super(Banks.BANKS);

        if (value != null) {
            setBankId(value.getBankId());
            setBankName(value.getBankName());
            resetChangedOnNotNull();
        }
    }
}
