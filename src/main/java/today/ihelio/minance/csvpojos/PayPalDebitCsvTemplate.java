package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;

import java.math.BigDecimal;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.DEBIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.PAYPAL;

@Dependent
public class PayPalDebitCsvTemplate extends AbstractBankAccountCsvTemplate {
	@CsvIgnore
	private static final BankAccountPair BANK_ACCOUNT_PAIR =
			BankAccountPair.of(PAYPAL, DEBIT);

	@CsvDate(value = "MM/dd/yyyy")
	@CsvBindByName(column = "Date")
	public LocalDate date;

	@CsvBindByName(column = "Time")
	public String time;

	@CsvBindByName(column = "TimeZone")
	public String timeZone;

	@CsvBindByName(column = "Name")
	public String name;

	@CsvBindByName(column = "Type")
	public String type;

	@CsvBindByName(column = "Status")
	public String status;

	@CsvBindByName(column = "Currency")
	public String currency;

	@CsvBindByName(column = "Amount")
	public String amount;

	@CsvBindByName(column = "Fees")
	public String fees;

	@CsvBindByName(column = "Total")
	public String total;

	@CsvBindByName(column = "Exchange Rate")
	public String exchangeRate;

	@CsvBindByName(column = "Receipt ID")
	public String receiptId;

	@CsvBindByName(column = "Balance")
	public String balance;

	@CsvBindByName(column = "Transaction ID")
	public String transactionId;

	@CsvBindByName(column = "Item Title")
	public String itemTitle;

	public PayPalDebitCsvTemplate() {
	}

	@Override
	public BankAccountPair getBankAccount() {
		return BANK_ACCOUNT_PAIR;
	}

	@Override
	public BigDecimal getAmount() {
		if (total == null || total.isEmpty()) {
			return BigDecimal.ZERO;
		}
		// Remove comma thousands separators before parsing
		String sanitizedTotal = total.replace(",", "");
		return new BigDecimal(sanitizedTotal);
	}

	@Override
	protected BigDecimal normalizeAmount(BigDecimal amount) {
		if (amount == null) {
			return null;
		}
		// Invert sign: deposits become negative, expenses become positive
		// This allows tracking balance where deposits reduce balance and expenses increase balance
		return amount.negate();
	}

	@Override
	public String getCategory() {
		return name != null && !name.isEmpty() ? name : type;
	}

	@Override
	public String getDescription() {
		StringBuilder description = new StringBuilder();
		if (name != null && !name.isEmpty()) {
			description.append(name);
		}
		if (type != null && !type.isEmpty()) {
			if (description.length() > 0) {
				description.append(" - ");
			}
			description.append(type);
		}
		if (itemTitle != null && !itemTitle.isEmpty()) {
			if (description.length() > 0) {
				description.append(" - ");
			}
			description.append(itemTitle);
		}
		return description.length() > 0 ? description.toString() : "";
	}

	@Override
	protected String getTransactionType() {
		return type;
	}

	@Override
	public LocalDate getTransactionDate() {
		return date;
	}

	@Override
	public String getMemo() {
		StringBuilder memo = new StringBuilder();
		if (status != null && !status.isEmpty()) {
			memo.append("Status: ").append(status);
		}
		if (transactionId != null && !transactionId.isEmpty()) {
			if (memo.length() > 0) {
				memo.append(" | ");
			}
			memo.append("Transaction ID: ").append(transactionId);
		}
		return memo.toString();
	}

	@Override
	public void validate() {
		// Only process completed transactions
		if (status == null || !status.equalsIgnoreCase("Completed")) {
			throw new IllegalStateException("Only completed transactions are processed. Status: " + status);
		}
		// Call parent validation
		super.validate();
	}
}
