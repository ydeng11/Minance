/*
 * This file is generated by jOOQ.
 */
package today.ihelio.jooq.tables;


import java.util.Arrays;
import java.util.Collection;
import java.util.List;

import org.jooq.Condition;
import org.jooq.Field;
import org.jooq.ForeignKey;
import org.jooq.Identity;
import org.jooq.InverseForeignKey;
import org.jooq.Name;
import org.jooq.Path;
import org.jooq.PlainSQL;
import org.jooq.QueryPart;
import org.jooq.Record;
import org.jooq.SQL;
import org.jooq.Schema;
import org.jooq.Select;
import org.jooq.Stringly;
import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.TableOptions;
import org.jooq.UniqueKey;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;
import org.jooq.impl.TableImpl;

import today.ihelio.jooq.DefaultSchema;
import today.ihelio.jooq.Keys;
import today.ihelio.jooq.tables.Accounts.AccountsPath;
import today.ihelio.jooq.tables.records.BanksRecord;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes", "this-escape" })
public class Banks extends TableImpl<BanksRecord> {

    private static final long serialVersionUID = 1L;

    /**
     * The reference instance of <code>banks</code>
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
     * The column <code>banks.bank_id</code>.
     */
    public final TableField<BanksRecord, Integer> BANK_ID = createField(DSL.name("bank_id"), SQLDataType.INTEGER.identity(true), this, "");

    /**
     * The column <code>banks.bank_name</code>.
     */
    public final TableField<BanksRecord, String> BANK_NAME = createField(DSL.name("bank_name"), SQLDataType.CLOB, this, "");

    private Banks(Name alias, Table<BanksRecord> aliased) {
        this(alias, aliased, (Field<?>[]) null, null);
    }

    private Banks(Name alias, Table<BanksRecord> aliased, Field<?>[] parameters, Condition where) {
        super(alias, null, aliased, parameters, DSL.comment(""), TableOptions.table(), where);
    }

    /**
     * Create an aliased <code>banks</code> table reference
     */
    public Banks(String alias) {
        this(DSL.name(alias), BANKS);
    }

    /**
     * Create an aliased <code>banks</code> table reference
     */
    public Banks(Name alias) {
        this(alias, BANKS);
    }

    /**
     * Create a <code>banks</code> table reference
     */
    public Banks() {
        this(DSL.name("banks"), null);
    }

    public <O extends Record> Banks(Table<O> path, ForeignKey<O, BanksRecord> childPath, InverseForeignKey<O, BanksRecord> parentPath) {
        super(path, childPath, parentPath, BANKS);
    }

    /**
     * A subtype implementing {@link Path} for simplified path-based joins.
     */
    public static class BanksPath extends Banks implements Path<BanksRecord> {

        private static final long serialVersionUID = 1L;
        public <O extends Record> BanksPath(Table<O> path, ForeignKey<O, BanksRecord> childPath, InverseForeignKey<O, BanksRecord> parentPath) {
            super(path, childPath, parentPath);
        }
        private BanksPath(Name alias, Table<BanksRecord> aliased) {
            super(alias, aliased);
        }

        @Override
        public BanksPath as(String alias) {
            return new BanksPath(DSL.name(alias), this);
        }

        @Override
        public BanksPath as(Name alias) {
            return new BanksPath(alias, this);
        }

        @Override
        public BanksPath as(Table<?> alias) {
            return new BanksPath(alias.getQualifiedName(), this);
        }
    }

    @Override
    public Schema getSchema() {
        return aliased() ? null : DefaultSchema.DEFAULT_SCHEMA;
    }

    @Override
    public Identity<BanksRecord, Integer> getIdentity() {
        return (Identity<BanksRecord, Integer>) super.getIdentity();
    }

    @Override
    public UniqueKey<BanksRecord> getPrimaryKey() {
        return Keys.BANKS__PK_BANKS;
    }

    @Override
    public List<UniqueKey<BanksRecord>> getUniqueKeys() {
        return Arrays.asList(Keys.BANKS__UK_BANKS_32305237);
    }

    private transient AccountsPath _accounts;

    /**
     * Get the implicit to-many join path to the <code>accounts</code> table
     */
    public AccountsPath accounts() {
        if (_accounts == null)
            _accounts = new AccountsPath(this, null, Keys.ACCOUNTS__FK_ACCOUNTS_PK_BANKS.getInverseKey());

        return _accounts;
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

    /**
     * Create an inline derived table from this table
     */
    @Override
    public Banks where(Condition condition) {
        return new Banks(getQualifiedName(), aliased() ? this : null, null, condition);
    }

    /**
     * Create an inline derived table from this table
     */
    @Override
    public Banks where(Collection<? extends Condition> conditions) {
        return where(DSL.and(conditions));
    }

    /**
     * Create an inline derived table from this table
     */
    @Override
    public Banks where(Condition... conditions) {
        return where(DSL.and(conditions));
    }

    /**
     * Create an inline derived table from this table
     */
    @Override
    public Banks where(Field<Boolean> condition) {
        return where(DSL.condition(condition));
    }

    /**
     * Create an inline derived table from this table
     */
    @Override
    @PlainSQL
    public Banks where(SQL condition) {
        return where(DSL.condition(condition));
    }

    /**
     * Create an inline derived table from this table
     */
    @Override
    @PlainSQL
    public Banks where(@Stringly.SQL String condition) {
        return where(DSL.condition(condition));
    }

    /**
     * Create an inline derived table from this table
     */
    @Override
    @PlainSQL
    public Banks where(@Stringly.SQL String condition, Object... binds) {
        return where(DSL.condition(condition, binds));
    }

    /**
     * Create an inline derived table from this table
     */
    @Override
    @PlainSQL
    public Banks where(@Stringly.SQL String condition, QueryPart... parts) {
        return where(DSL.condition(condition, parts));
    }

    /**
     * Create an inline derived table from this table
     */
    @Override
    public Banks whereExists(Select<?> select) {
        return where(DSL.exists(select));
    }

    /**
     * Create an inline derived table from this table
     */
    @Override
    public Banks whereNotExists(Select<?> select) {
        return where(DSL.notExists(select));
    }
}
