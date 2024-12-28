package today.ihelio.minance.csvpojos;

import java.util.List;

/**
 * Factory for creating bank account CSV templates.
 */
public interface BankAccountCsvFactory {
    /**
     * Get a CSV template for the given bank account type.
     * @param bankAccountPair The bank and account type pair
     * @return The corresponding CSV template
     */
    AbstractBankAccountCsvTemplate get(BankAccountPair bankAccountPair);

    /**
     * Get all supported bank account pairs.
     * @return List of supported bank account pairs
     */
    List<BankAccountPair> getKeys();
}
