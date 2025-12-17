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
	public BigDecimal amount;

	@CsvBindByName(column = "Fees")
	public BigDecimal fees;

	@CsvBindByName(column = "Total")
	public BigDecimal total;

	@CsvBindByName(column = "Exchange Rate")
	public String exchangeRate;

	@CsvBindByName(column = "Receipt ID")
	public String receiptId;

	@CsvBindByName(column = "Balance")
	public BigDecimal balance;

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
		return total; // Use Total (net amount after fees) instead of Amount
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
}
