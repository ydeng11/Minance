package today.ihelio.minance.csvpojos;

import today.ihelio.jooq.tables.pojos.Transactions;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Base class for all bank account CSV templates.
 * This class defines the common structure and behavior for parsing bank transaction CSV files.
 * All bank-specific CSV templates should extend this class.
 */
public abstract class AbstractBankAccountCsvTemplate {
	protected static final String PAYMENT = "Payment";

	/**
	 * Get the bank account identifier pair.
	 *
	 * @return The bank and account type pair
	 */
	public abstract BankAccountPair getBankAccount();

	/**
	 * Convert the CSV record to a standardized Transaction object.
	 *
	 * @return The converted Transaction
	 * @throws IllegalStateException if required fields are missing
	 */
	public Transactions toTransactions() {
		validate();

		Transactions transaction = new Transactions();
		transaction.setAmount(normalizeAmount(getAmount()));
		transaction.setCategory(getCategory());
		transaction.setDescription(getDescription());
		transaction.setTransactionDate(getTransactionDate());
		transaction.setTransactionType(getTransactionType());
		transaction.setPostDate(getPostDate());
		transaction.setMemo(getMemo());
		return transaction;
	}

	/**
	 * Get the transaction amount.
	 *
	 * @return The transaction amount
	 */
	public abstract BigDecimal getAmount();

	/**
	 * Get the transaction category.
	 *
	 * @return The transaction category, or empty string if not available
	 */
	public abstract String getCategory();

	/**
	 * Get the transaction description.
	 *
	 * @return The transaction description
	 */
	public abstract String getDescription();

	/**
	 * Get the transaction date.
	 *
	 * @return The date when the transaction occurred
	 */
	public abstract LocalDate getTransactionDate();

	/**
	 * Get the post date.
	 *
	 * @return The date when the transaction was posted, defaults to transaction date
	 */
	public LocalDate getPostDate() {
		return getTransactionDate();  // Default to transaction date if post date not available
	}

	/**
	 * Get any additional memo or notes.
	 *
	 * @return The memo text, or empty string if not available
	 */
	public String getMemo() {
		return "";  // Default implementation returns empty string
	}

	/**
	 * Normalize the transaction amount based on the bank's format.
	 * Override this method if the bank uses a different sign convention.
	 *
	 * @param amount The raw amount from CSV
	 * @return The normalized amount
	 */
	protected BigDecimal normalizeAmount(BigDecimal amount) {
		return amount;
	}

	/**
	 * Get the transaction type (e.g., Payment, Sale, etc.).
	 * Override this method if the bank provides transaction type information.
	 *
	 * @return The transaction type, or empty string if not available
	 */
	protected String getTransactionType() {
		return "";
	}

	/**
	 * Validate the CSV record.
	 * Checks for required fields and data consistency.
	 *
	 * @throws IllegalStateException if the record is invalid
	 */
	public void validate() {
		if (getAmount() == null) {
			throw new IllegalStateException("Amount is required");
		}
		if (getTransactionDate() == null) {
			throw new IllegalStateException("Transaction date is required");
		}
		if (getDescription() == null) {
			throw new IllegalStateException("Description is required");
		}
	}
}
