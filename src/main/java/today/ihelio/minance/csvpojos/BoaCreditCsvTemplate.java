package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;

import java.math.BigDecimal;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.BANK_OF_AMERICA;

@Dependent
public class BoaCreditCsvTemplate extends AbstractBankAccountCsvTemplate {
	@CsvIgnore
	private static final BankAccountPair BANK_ACCOUNT_PAIR = BankAccountPair.of(BANK_OF_AMERICA, CREDIT);

	@CsvBindByName(column = "Status")
	public String status;

	@CsvDate(value = "MM/dd/yyyy")
	@CsvBindByName(column = "Date")
	public LocalDate date;

	@CsvBindByName(column = "Original Description")
	public String originalDescription;

	@CsvBindByName(column = "Split Type")
	public String splitType;

	@CsvBindByName(column = "Category")
	public String category;

	@CsvBindByName(column = "Currency")
	public String currency;

	@CsvBindByName(column = "Amount")
	public String amount;

	@CsvBindByName(column = "User Description")
	public String userDescription;

	@CsvBindByName(column = "Memo")
	public String memo;

	@CsvBindByName(column = "Classification")
	public String classification;

	@CsvBindByName(column = "Account Name")
	public String accountName;

	@CsvBindByName(column = "Simple Description")
	public String simpleDescription;

	public BoaCreditCsvTemplate() {
	}

	@Override
	public BankAccountPair getBankAccount() {
		return BANK_ACCOUNT_PAIR;
	}

	@Override
	public BigDecimal getAmount() {
		if (amount == null || amount.isEmpty()) {
			return BigDecimal.ZERO;
		}
		String sanitizedAmount = amount.replace(",", "");
		return new BigDecimal(sanitizedAmount);
	}

	@Override
	protected BigDecimal normalizeAmount(BigDecimal amount) {
		return amount.negate();
	}

	@Override
	public String getCategory() {
		return category;
	}

	@Override
	public String getDescription() {
		return originalDescription;
	}

	@Override
	public LocalDate getTransactionDate() {
		return date;
	}

	@Override
	public String getMemo() {
		return memo != null ? memo : "";
	}
}
