package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;

import java.math.BigDecimal;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.MINANCE;

@Dependent
public class MinanceCsvTemplate extends AbstractBankAccountCsvTemplate {
	@CsvIgnore
	private static final BankAccountPair BANK_ACCOUNT_PAIR =
			BankAccountPair.of(MINANCE, CREDIT);

	@CsvBindByName(column = "Amount")
	public BigDecimal amount;

	@CsvBindByName(column = "Category")
	public String category;

	@CsvBindByName(column = "Description")
	public String description;

	@CsvBindByName(column = "Type")
	public String transactionType;

	@CsvDate(value = "MM/dd/yyyy")
	@CsvBindByName(column = "Transaction Date")
	public LocalDate transactionDate;

	@CsvDate(value = "MM/dd/yyyy")
	@CsvBindByName(column = "Post Date")
	public LocalDate postDate;

	@CsvBindByName(column = "Memo")
	public String memo;

	public MinanceCsvTemplate() {
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
	public LocalDate getTransactionDate() {
		return transactionDate;
	}

	@Override
	public LocalDate getPostDate() {
		return postDate;
	}

	@Override
	public String getMemo() {
		return memo;
	}

	@Override
	protected BigDecimal normalizeAmount(BigDecimal amount) {
		return amount.negate();
	}
}
