package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import java.math.BigDecimal;
import java.time.LocalDate;
import today.ihelio.jooq.tables.pojos.Transactions;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.DEBIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.BANK_OF_AMERICA;

@Dependent
public class BoaDebitCsvTemplate implements BankAccountCsvTemplate {
  @CsvIgnore
  public final BankAccountPair bankAccountPair =
      BankAccountPair.of(BANK_OF_AMERICA, DEBIT);
  @CsvBindByName(column = "Amount")
  public BigDecimal amount;

  @CsvBindByName(column = "Running Bal.")
  public double balance;

  @CsvBindByName(column = "Description")
  public String description;

  @CsvDate(value = "MM/dd/yyyy")
  @CsvBindByName(column = "Date")
  public LocalDate date;

  public BoaDebitCsvTemplate() {
  }

  @Override
  public BankAccountPair getBankAccount() {
    return bankAccountPair;
  }

  @Override public Transactions toTransactions() {
    Transactions transactions = new Transactions();
    transactions.setAmount(amount);
    transactions.setDescription(description);
    transactions.setTransactionDate(date);
    transactions.setPostDate(date);
    return transactions;
  }

  @Override public String toString() {
    return "BoaDebitCsvTemplate{" +
        "bankAccountPair=" + bankAccountPair +
        ", amount=" + amount +
        ", balance=" + balance +
        ", description='" + description + '\'' +
        ", date=" + date +
        '}';
  }
}
