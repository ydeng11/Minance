package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;

import java.math.BigDecimal;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.APPLE;

@Dependent
public class AppleCreditCsvTemplate extends AbstractBankAccountCsvTemplate {
	@CsvIgnore
	private static final BankAccountPair BANK_ACCOUNT_PAIR = BankAccountPair.of(APPLE, CREDIT);

	@CsvBindByName(column = "Amount(USD)")
	public BigDecimal amount;

	@CsvBindByName(column = "Category")
	public String category;

	@CsvBindByName(column = "Type")
	public String transactionType;

	@CsvBindByName(column = "Description")
	public String description;

	@CsvBindByName(column = "Merchant")
	public String merchant;

	@CsvDate(value = "MM/dd/yyyy")
	@CsvBindByName(column = "Transaction Date")
	public LocalDate transactionDate;

	@CsvDate(value = "MM/dd/yyyy")
	@CsvBindByName(column = "Clearing Date")
	public LocalDate clearingDate;

	@CsvBindByName(column = "Purchased By")
	public String memberName;

	public AppleCreditCsvTemplate() {
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
		return category;
	}

	@Override
	public String getDescription() {
		return description;
	}

	@Override
	protected String getTransactionType() {
		return transactionType;
	}

	@Override
	public LocalDate getTransactionDate() {
		return transactionDate;
	}

	@Override
	public LocalDate getPostDate() {
		return clearingDate;
	}
}
