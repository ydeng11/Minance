package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import java.math.BigDecimal;
import java.time.LocalDate;
import today.ihelio.jooq.tables.pojos.Transactions;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.APPLE;

@Dependent
public class AppleCreditCsvTemplate implements BankAccountCsvTemplate {
  @CsvIgnore
  public final BankAccountPair bankAccountPair =
      BankAccountPair.of(APPLE, CREDIT);

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
    return bankAccountPair;
  }

  @Override public Transactions toTransactions() {
    Transactions transactions = new Transactions();
    transactions.setAmount(amount);
    transactions.setCategory(category);
    transactions.setTransactionType(transactionType);
    transactions.setDescription(description);
    transactions.setTransactionDate(transactionDate);
    transactions.setPostDate(clearingDate);
    return transactions;
  }

  @Override public String toString() {
    return "AppleCreditCsvTemplate{" +
        "bankAccountPair=" + bankAccountPair +
        ", amount=" + amount +
        ", category='" + category + '\'' +
        ", transactionType='" + transactionType + '\'' +
        ", description='" + description + '\'' +
        ", merchant='" + merchant + '\'' +
        ", transactionDate=" + transactionDate +
        ", clearingDate=" + clearingDate +
        ", memberName='" + memberName + '\'' +
        '}';
  }
}
