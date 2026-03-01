package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;

import java.math.BigDecimal;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.CITI;

@Dependent
public class CitiCreditCsvTemplate extends AbstractBankAccountCsvTemplate {
	@CsvIgnore
	private static final BankAccountPair BANK_ACCOUNT_PAIR =
			BankAccountPair.of(CITI, CREDIT);

	@CsvBindByName(column = "Debit")
	public BigDecimal debit;

	@CsvBindByName(column = "Credit")
	public BigDecimal credit;

	@CsvBindByName(column = "Description")
	public String description;

	@CsvDate(value = "MM/dd/yyyy")
	@CsvBindByName(column = "Date")
	public LocalDate date;

	@CsvBindByName(column = "Status")
	public String status;

	@CsvBindByName(column = "Member Name")
	public String memberName;

	public CitiCreditCsvTemplate() {
	}

	@Override
	public BankAccountPair getBankAccount() {
		return BANK_ACCOUNT_PAIR;
	}

	@Override
	public BigDecimal getAmount() {
		return debit != null ? debit : credit;
	}

	@Override
	public String getCategory() {
		return "";  // Citi doesn't provide categories
	}

	@Override
	public String getDescription() {
		return description;
	}

	@Override
	public LocalDate getTransactionDate() {
		return date;
	}
}
