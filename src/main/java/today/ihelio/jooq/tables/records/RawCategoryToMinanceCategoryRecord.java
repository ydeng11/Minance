/*
 * This file is generated by jOOQ.
 */
package today.ihelio.jooq.tables.records;


import org.jooq.Record1;
import org.jooq.impl.UpdatableRecordImpl;

import today.ihelio.jooq.tables.RawCategoryToMinanceCategory;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes", "this-escape" })
public class RawCategoryToMinanceCategoryRecord extends UpdatableRecordImpl<RawCategoryToMinanceCategoryRecord> {

    private static final long serialVersionUID = 1L;

    /**
     * Setter for <code>raw_category_to_minance_category.rc_to_mc_id</code>.
     */
    public void setRcToMcId(Integer value) {
        set(0, value);
    }

    /**
     * Getter for <code>raw_category_to_minance_category.rc_to_mc_id</code>.
     */
    public Integer getRcToMcId() {
        return (Integer) get(0);
    }

    /**
     * Setter for <code>raw_category_to_minance_category.raw_category</code>.
     */
    public void setRawCategory(String value) {
        set(1, value);
    }

    /**
     * Getter for <code>raw_category_to_minance_category.raw_category</code>.
     */
    public String getRawCategory() {
        return (String) get(1);
    }

    /**
     * Setter for
     * <code>raw_category_to_minance_category.minance_category_id</code>.
     */
    public void setMinanceCategoryId(Integer value) {
        set(2, value);
    }

    /**
     * Getter for
     * <code>raw_category_to_minance_category.minance_category_id</code>.
     */
    public Integer getMinanceCategoryId() {
        return (Integer) get(2);
    }

    // -------------------------------------------------------------------------
    // Primary key information
    // -------------------------------------------------------------------------

    @Override
    public Record1<Integer> key() {
        return (Record1) super.key();
    }

    // -------------------------------------------------------------------------
    // Constructors
    // -------------------------------------------------------------------------

    /**
     * Create a detached RawCategoryToMinanceCategoryRecord
     */
    public RawCategoryToMinanceCategoryRecord() {
        super(RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY);
    }

    /**
     * Create a detached, initialised RawCategoryToMinanceCategoryRecord
     */
    public RawCategoryToMinanceCategoryRecord(Integer rcToMcId, String rawCategory, Integer minanceCategoryId) {
        super(RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY);

        setRcToMcId(rcToMcId);
        setRawCategory(rawCategory);
        setMinanceCategoryId(minanceCategoryId);
        resetChangedOnNotNull();
    }

    /**
     * Create a detached, initialised RawCategoryToMinanceCategoryRecord
     */
    public RawCategoryToMinanceCategoryRecord(today.ihelio.jooq.tables.pojos.RawCategoryToMinanceCategory value) {
        super(RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY);

        if (value != null) {
            setRcToMcId(value.getRcToMcId());
            setRawCategory(value.getRawCategory());
            setMinanceCategoryId(value.getMinanceCategoryId());
            resetChangedOnNotNull();
        }
    }
}
