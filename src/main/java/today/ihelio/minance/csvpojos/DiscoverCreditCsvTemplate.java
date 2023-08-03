package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.DISCOVER;

@Dependent
public class DiscoverCreditCsvTemplate implements BankAccountCsvTemplate {
  @CsvIgnore
  public final BankAccountPair bankAccountPair =
      BankAccountPair.of(DISCOVER, CREDIT);

  @CsvBindByName(column = "Amount")
  public double amount;

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
