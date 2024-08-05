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

import today.ihelio.jooq.DefaultSchema;
import today.ihelio.jooq.Keys;
import today.ihelio.jooq.tables.records.MinanceCategoryRecord;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class MinanceCategory extends TableImpl<MinanceCategoryRecord> {

    private static final long serialVersionUID = 1L;

    /**
     * The reference instance of <code>minance_category</code>
     */
    public static final MinanceCategory MINANCE_CATEGORY = new MinanceCategory();

    /**
     * The class holding records for this type
     */
    @Override
    public Class<MinanceCategoryRecord> getRecordType() {
        return MinanceCategoryRecord.class;
    }

    /**
     * The column <code>minance_category.m_category_id</code>.
     */
    public final TableField<MinanceCategoryRecord, Integer> M_CATEGORY_ID = createField(DSL.name("m_category_id"), SQLDataType.INTEGER.identity(true), this, "");

    /**
     * The column <code>minance_category.category</code>.
     */
    public final TableField<MinanceCategoryRecord, String> CATEGORY = createField(DSL.name("category"), SQLDataType.CLOB.nullable(false), this, "");

    private MinanceCategory(Name alias, Table<MinanceCategoryRecord> aliased) {
        this(alias, aliased, null);
    }

    private MinanceCategory(Name alias, Table<MinanceCategoryRecord> aliased, Field<?>[] parameters) {
        super(alias, null, aliased, parameters, DSL.comment(""), TableOptions.table());
    }

    /**
     * Create an aliased <code>minance_category</code> table reference
     */
    public MinanceCategory(String alias) {
        this(DSL.name(alias), MINANCE_CATEGORY);
    }

    /**
     * Create an aliased <code>minance_category</code> table reference
     */
    public MinanceCategory(Name alias) {
        this(alias, MINANCE_CATEGORY);
    }

    /**
     * Create a <code>minance_category</code> table reference
     */
    public MinanceCategory() {
        this(DSL.name("minance_category"), null);
    }

    public <O extends Record> MinanceCategory(Table<O> child, ForeignKey<O, MinanceCategoryRecord> key) {
        super(child, key, MINANCE_CATEGORY);
    }

    @Override
    public Schema getSchema() {
        return aliased() ? null : DefaultSchema.DEFAULT_SCHEMA;
    }

    @Override
    public Identity<MinanceCategoryRecord, Integer> getIdentity() {
        return (Identity<MinanceCategoryRecord, Integer>) super.getIdentity();
    }

    @Override
    public UniqueKey<MinanceCategoryRecord> getPrimaryKey() {
        return Keys.MINANCE_CATEGORY__PK_MINANCE_CATEGORY;
    }

    @Override
    public List<UniqueKey<MinanceCategoryRecord>> getUniqueKeys() {
        return Arrays.asList(Keys.MINANCE_CATEGORY__UK_MINANCE_CATEGORY_125424204);
    }

    @Override
    public MinanceCategory as(String alias) {
        return new MinanceCategory(DSL.name(alias), this);
    }

    @Override
    public MinanceCategory as(Name alias) {
        return new MinanceCategory(alias, this);
    }

    @Override
    public MinanceCategory as(Table<?> alias) {
        return new MinanceCategory(alias.getQualifiedName(), this);
    }

    /**
     * Rename this table
     */
    @Override
    public MinanceCategory rename(String name) {
        return new MinanceCategory(DSL.name(name), null);
    }

    /**
     * Rename this table
     */
    @Override
    public MinanceCategory rename(Name name) {
        return new MinanceCategory(name, null);
    }

    /**
     * Rename this table
     */
    @Override
    public MinanceCategory rename(Table<?> name) {
        return new MinanceCategory(name.getQualifiedName(), null);
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
