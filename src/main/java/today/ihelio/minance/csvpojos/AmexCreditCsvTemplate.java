package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;

import java.math.BigDecimal;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.AMEX;

@Dependent
public class AmexCreditCsvTemplate extends AbstractBankAccountCsvTemplate {
	@CsvIgnore
	private static final BankAccountPair BANK_ACCOUNT_PAIR = BankAccountPair.of(AMEX, CREDIT);

	@CsvBindByName(column = "Amount")
	public BigDecimal amount;

	@CsvBindByName(column = "Category")
	public String category;

	@CsvBindByName(column = "Description")
	public String description;

	@CsvDate(value = "MM/dd/yyyy")
	@CsvBindByName(column = "Date")
	public LocalDate date;

	@CsvBindByName(column = "Address")
	public String address;

	@CsvBindByName(column = "City/State")
	public String cityZip;

	@CsvBindByName(column = "Zip Code")
	public String state;

	@CsvBindByName(column = "Country")
	public String country;

	@CsvBindByName(column = "Reference")
	public String reference;

	public AmexCreditCsvTemplate() {
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
		return category.isEmpty() ? PAYMENT : category;
	}

	@Override
	public String getDescription() {
		return description;
	}

	@Override
	public LocalDate getTransactionDate() {
		return date;
	}

	@Override
	public String getMemo() {
		return reference != null ? reference : "";
	}
}
