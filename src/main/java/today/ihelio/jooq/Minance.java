/*
 * This file is generated by jOOQ.
 */
package today.ihelio.jooq;


import java.util.Arrays;
import java.util.List;

import org.jooq.Catalog;
import org.jooq.Table;
import org.jooq.impl.SchemaImpl;

import today.ihelio.jooq.tables.Accounts;
import today.ihelio.jooq.tables.Banks;
import today.ihelio.jooq.tables.FlywaySchemaHistory;
import today.ihelio.jooq.tables.MinanceCategory;
import today.ihelio.jooq.tables.RawCategoryToMinanceCategory;
import today.ihelio.jooq.tables.Transactions;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class Minance extends SchemaImpl {

    private static final long serialVersionUID = 1L;

    /**
     * The reference instance of <code>minance</code>
     */
    public static final Minance MINANCE = new Minance();

    /**
     * The table <code>minance.accounts</code>.
     */
    public final Accounts ACCOUNTS = Accounts.ACCOUNTS;

    /**
     * The table <code>minance.banks</code>.
     */
    public final Banks BANKS = Banks.BANKS;

    /**
     * The table <code>minance.flyway_schema_history</code>.
     */
    public final FlywaySchemaHistory FLYWAY_SCHEMA_HISTORY = FlywaySchemaHistory.FLYWAY_SCHEMA_HISTORY;

    /**
     * The table <code>minance.minance_category</code>.
     */
    public final MinanceCategory MINANCE_CATEGORY = MinanceCategory.MINANCE_CATEGORY;

    /**
     * The table <code>minance.raw_category_to_minance_category</code>.
     */
    public final RawCategoryToMinanceCategory RAW_CATEGORY_TO_MINANCE_CATEGORY = RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY;

    /**
     * The table <code>minance.transactions</code>.
     */
    public final Transactions TRANSACTIONS = Transactions.TRANSACTIONS;

    /**
     * No further instances allowed
     */
    private Minance() {
        super("minance", null);
    }


    @Override
    public Catalog getCatalog() {
        return DefaultCatalog.DEFAULT_CATALOG;
    }

    @Override
    public final List<Table<?>> getTables() {
        return Arrays.asList(
            Accounts.ACCOUNTS,
            Banks.BANKS,
            FlywaySchemaHistory.FLYWAY_SCHEMA_HISTORY,
            MinanceCategory.MINANCE_CATEGORY,
            RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY,
            Transactions.TRANSACTIONS
        );
    }
}
