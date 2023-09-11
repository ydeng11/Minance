package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import java.math.BigDecimal;
import java.time.LocalDate;
import today.ihelio.jooq.tables.pojos.Transactions;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.MINANCE;

@Dependent
public class MinanceCsvTemplate implements BankAccountCsvTemplate {
  @CsvIgnore
  public final BankAccountPair bankAccountPair =
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
  public Transactions toTransactions() {
    Transactions transactions = new Transactions();
    transactions.setAmount(amount.negate());
    transactions.setCategory(category);
    transactions.setDescription(description);
    transactions.setTransactionType(transactionType);
    transactions.setTransactionDate(transactionDate);
    transactions.setPostDate(postDate);
    transactions.setMemo(memo);
    return transactions;
  }

  @Override
  public BankAccountPair getBankAccount() {
    return bankAccountPair;
  }

  @Override public String toString() {
    return "MinanceCsvTemplate{" +
        "bankAccountPair=" + bankAccountPair +
        ", amount=" + amount +
        ", category='" + category + '\'' +
        ", description='" + description + '\'' +
        ", transactionType='" + transactionType + '\'' +
        ", transactionDate=" + transactionDate +
        ", postDate=" + postDate +
        ", memo='" + memo + '\'' +
        '}';
  }
}
