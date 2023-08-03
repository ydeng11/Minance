package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.CHASE;

@Dependent
public class ChaseCreditCsvTemplate implements BankAccountCsvTemplate {
  @CsvIgnore
  public final BankAccountPair bankAccountPair =
      BankAccountPair.of(CHASE, CREDIT);

  @CsvBindByName(column = "Amount")
  public double amount;

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

  public ChaseCreditCsvTemplate() {
  }

  @Override
  public BankAccountPair getBankAccount() {
    return bankAccountPair;
  }

  @Override public String toString() {
    return "ChaseCreditCsvTemplate{" +
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
