package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import java.math.BigDecimal;
import java.time.LocalDate;
import today.ihelio.jooq.tables.pojos.Transactions;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.DISCOVER;

@Dependent
public class DiscoverCreditCsvTemplate implements BankAccountCsvTemplate {
  @CsvIgnore
  public final BankAccountPair bankAccountPair =
      BankAccountPair.of(DISCOVER, CREDIT);

  @CsvBindByName(column = "Amount")
  public BigDecimal amount;

  @CsvBindByName(column = "Category")
  public String category;

  @CsvBindByName(column = "Description")
  public String description;
  @CsvDate(value = "MM/dd/yyyy")
  @CsvBindByName(column = "Trans. Date")
  public LocalDate transactionDate;
  @CsvDate(value = "MM/dd/yyyy")
  @CsvBindByName(column = "Post Date")
  public LocalDate postDate;

  public DiscoverCreditCsvTemplate() {
  }

  @Override
  public BankAccountPair getBankAccount() {
    return bankAccountPair;
  }

  @Override public Transactions toTransactions() {
    Transactions transactions = new Transactions();
    transactions.setAmount(amount);
    transactions.setCategory(category);
    transactions.setDescription(description);
    transactions.setTransactionDate(transactionDate);
    transactions.setPostDate(postDate);
    return transactions;
  }

  @Override public String toString() {
    return "DiscoverCreditCsvTemplate{" +
        "bankAccountPair=" + bankAccountPair +
        ", amount=" + amount +
        ", category='" + category + '\'' +
        ", description='" + description + '\'' +
        ", transactionDate=" + transactionDate +
        ", postDate=" + postDate +
        '}';
  }
}
