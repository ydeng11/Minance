package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;

import java.math.BigDecimal;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.DEBIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.CASH_APP;

@Dependent
public class CashAppDebitCsvTemplate extends AbstractBankAccountCsvTemplate {
	@CsvIgnore
	private static final BankAccountPair BANK_ACCOUNT_PAIR =
			BankAccountPair.of(CASH_APP, DEBIT);

	@CsvBindByName(column = "Currency")
	public String currency;

	@CsvBindByName(column = "Amount")
	public BigDecimal amount;

	@CsvBindByName(column = "Transaction Type")
	public String transactionType;

	@CsvBindByName(column = "Fee")
	public double fee;

	@CsvBindByName(column = "Net Amount")
	public double netAmount;

	@CsvBindByName(column = "Asset Type")
	public String assetType;

	@CsvBindByName(column = "Asset Price")
	public BigDecimal assetPrice;

	@CsvBindByName(column = "Asset Amount")
	public BigDecimal assetAmount;

	@CsvBindByName(column = "Status")
	public String status;

	@CsvBindByName(column = "Transaction ID")
	public String transactionId;

	@CsvDate(value = "MM/dd/yyyy")
	@CsvBindByName(column = "Date")
	public LocalDate date;

	@CsvBindByName(column = "Notes")
	public String notes;

	@CsvBindByName(column = "Name of sender/receiver")
	public String senderOrReceiver;

	@CsvBindByName(column = "Account")
	public String account;

	public CashAppDebitCsvTemplate() {
	}

	@Override
	public BankAccountPair getBankAccount() {
		return BANK_ACCOUNT_PAIR;
	}

	@Override
	public BigDecimal getAmount() {
		return amount;
	}

	@Override
	public String getCategory() {
		return senderOrReceiver;
	}

	@Override
	public String getDescription() {
		return notes;
	}

	@Override
	protected String getTransactionType() {
		return transactionType;
	}

	@Override
	public LocalDate getTransactionDate() {
		return date;
	}
}
