/*
 * This file is generated by jOOQ.
 */
package today.ihelio.jooq.tables;


import java.util.Arrays;
import java.util.List;
import java.util.function.Function;

import org.jooq.Field;
import org.jooq.ForeignKey;
import org.jooq.Function2;
import org.jooq.Identity;
import org.jooq.Name;
import org.jooq.Record;
import org.jooq.Records;
import org.jooq.Row2;
import org.jooq.Schema;
import org.jooq.SelectField;
import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.TableOptions;
import org.jooq.UniqueKey;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;
import org.jooq.impl.TableImpl;

import today.ihelio.jooq.Keys;
import today.ihelio.jooq.Minance;
import today.ihelio.jooq.tables.records.BanksRecord;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class Banks extends TableImpl<BanksRecord> {

    private static final long serialVersionUID = 1L;

    /**
     * The reference instance of <code>minance.banks</code>
     */
    public static final Banks BANKS = new Banks();

    /**
     * The class holding records for this type
     */
    @Override
    public Class<BanksRecord> getRecordType() {
        return BanksRecord.class;
    }

    /**
     * The column <code>minance.banks.bank_id</code>.
     */
    public final TableField<BanksRecord, Integer> BANK_ID = createField(DSL.name("bank_id"), SQLDataType.INTEGER.nullable(false).identity(true), this, "");

    /**
     * The column <code>minance.banks.bank_name</code>.
     */
    public final TableField<BanksRecord, String> BANK_NAME = createField(DSL.name("bank_name"), SQLDataType.VARCHAR(50), this, "");

    private Banks(Name alias, Table<BanksRecord> aliased) {
        this(alias, aliased, null);
    }

    private Banks(Name alias, Table<BanksRecord> aliased, Field<?>[] parameters) {
        super(alias, null, aliased, parameters, DSL.comment(""), TableOptions.table());
    }

    /**
     * Create an aliased <code>minance.banks</code> table reference
     */
    public Banks(String alias) {
        this(DSL.name(alias), BANKS);
    }

    /**
     * Create an aliased <code>minance.banks</code> table reference
     */
    public Banks(Name alias) {
        this(alias, BANKS);
    }

    /**
     * Create a <code>minance.banks</code> table reference
     */
    public Banks() {
        this(DSL.name("banks"), null);
    }

    public <O extends Record> Banks(Table<O> child, ForeignKey<O, BanksRecord> key) {
        super(child, key, BANKS);
    }

    @Override
    public Schema getSchema() {
        return aliased() ? null : Minance.MINANCE;
    }

    @Override
    public Identity<BanksRecord, Integer> getIdentity() {
        return (Identity<BanksRecord, Integer>) super.getIdentity();
    }

    @Override
    public UniqueKey<BanksRecord> getPrimaryKey() {
        return Keys.KEY_BANKS_PRIMARY;
    }

    @Override
    public List<UniqueKey<BanksRecord>> getUniqueKeys() {
        return Arrays.asList(Keys.KEY_BANKS_UNIQUE_BANK);
    }

    @Override
    public Banks as(String alias) {
        return new Banks(DSL.name(alias), this);
    }

    @Override
    public Banks as(Name alias) {
        return new Banks(alias, this);
    }

    @Override
    public Banks as(Table<?> alias) {
        return new Banks(alias.getQualifiedName(), this);
    }

    /**
     * Rename this table
     */
    @Override
    public Banks rename(String name) {
        return new Banks(DSL.name(name), null);
    }

    /**
     * Rename this table
     */
    @Override
    public Banks rename(Name name) {
        return new Banks(name, null);
    }

    /**
     * Rename this table
     */
    @Override
    public Banks rename(Table<?> name) {
        return new Banks(name.getQualifiedName(), null);
    }

    // -------------------------------------------------------------------------
    // Row2 type methods
    // -------------------------------------------------------------------------

    @Override
    public Row2<Integer, String> fieldsRow() {
        return (Row2) super.fieldsRow();
    }

    /**
     * Convenience mapping calling {@link SelectField#convertFrom(Function)}.
     */
    public <U> SelectField<U> mapping(Function2<? super Integer, ? super String, ? extends U> from) {
        return convertFrom(Records.mapping(from));
    }

    /**
     * Convenience mapping calling {@link SelectField#convertFrom(Class,
     * Function)}.
     */
    public <U> SelectField<U> mapping(Class<U> toType, Function2<? super Integer, ? super String, ? extends U> from) {
        return convertFrom(toType, Records.mapping(from));
    }
}