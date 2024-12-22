package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import today.ihelio.jooq.tables.pojos.Transactions;

import java.math.BigDecimal;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.AMEX;

@Dependent
public class AmexCreditCsvTemplate implements BankAccountCsvTemplate {
	@CsvIgnore
	public final BankAccountPair bankAccountPair =
			BankAccountPair.of(AMEX, CREDIT);
	@CsvIgnore
	private final String PAYMENT = "Payment";

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
		return bankAccountPair;
	}

	@Override
	public Transactions toTransactions() {
		Transactions transactions = new Transactions();
		transactions.setAmount(amount);
		if (category.isEmpty()) {
			transactions.setCategory(PAYMENT);
		} else {
			transactions.setCategory(category);
		}
		transactions.setDescription(description);
		transactions.setTransactionDate(date);
		transactions.setPostDate(date);
		transactions.setAddress(address);
		transactions.setMemo(reference);
		return transactions;
	}

	@Override
	public String toString() {
		return "AmexCreditCsvTemplate{" +
				"bankAccountPair=" + bankAccountPair +
				", amount=" + amount +
				", category='" + category + '\'' +
				", description='" + description + '\'' +
				", date=" + date +
				", address='" + address + '\'' +
				", cityZip='" + cityZip + '\'' +
				", state='" + state + '\'' +
				", country='" + country + '\'' +
				", reference='" + reference + '\'' +
				'}';
	}
}
