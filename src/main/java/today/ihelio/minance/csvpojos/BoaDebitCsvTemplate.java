package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import today.ihelio.jooq.tables.pojos.Transactions;

import java.math.BigDecimal;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.DEBIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.BANK_OF_AMERICA;

@Dependent
public class BoaDebitCsvTemplate implements BankAccountCsvTemplate {

	@CsvIgnore
	public final BankAccountPair bankAccountPair =
			BankAccountPair.of(BANK_OF_AMERICA, DEBIT);

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

	public BoaDebitCsvTemplate() {
	}

	@Override
	public BankAccountPair getBankAccount() {
		return bankAccountPair;
	}

	@Override
	public Transactions toTransactions() {
		Transactions transactions = new Transactions();
		String sanitizedAmount = amount.replace(",", "");
		transactions.setAmount(new BigDecimal(sanitizedAmount).negate());
		transactions.setCategory(category);
		transactions.setTransactionType("Unknown");
		transactions.setDescription(originalDescription);
		transactions.setTransactionDate(date);
		transactions.setPostDate(date);
		transactions.setMemo(memo);
		return transactions;
	}

	@Override
	public String toString() {
		return "BoaDebitCsvTemplate{" +
				"status='" + status + '\'' +
				", date=" + date +
				", originalDescription='" + originalDescription + '\'' +
				", splitType='" + splitType + '\'' +
				", category='" + category + '\'' +
				", currency='" + currency + '\'' +
				", amount=" + amount +
				", userDescription='" + userDescription + '\'' +
				", memo='" + memo + '\'' +
				", classification='" + classification + '\'' +
				", accountName='" + accountName + '\'' +
				", simpleDescription='" + simpleDescription + '\'' +
				'}';
	}
}
