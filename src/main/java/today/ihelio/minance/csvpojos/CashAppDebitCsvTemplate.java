package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import java.math.BigDecimal;
import java.time.LocalDate;
import today.ihelio.jooq.tables.pojos.Transactions;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.DEBIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.CASH_APP;

@Dependent
public class CashAppDebitCsvTemplate implements BankAccountCsvTemplate {
  @CsvIgnore
  public final BankAccountPair bankAccountPair =
      BankAccountPair.of(CASH_APP, DEBIT);

  @CsvBindByName(column = "Currency")
  public String currency;

  @CsvBindByName(column = "Amount")
  public BigDecimal amount;
  @CsvBindByName(column = "Transaction Type")
  public String transactionType;
  @CsvBindByName(column = "Fee")
  public double fee;

  @CsvBindByName(column = "Net Amount")
  public double netAmount;

  @CsvBindByName(column = "Asset Type")
  public String assetType;

  @CsvBindByName(column = "Asset Price")
  public BigDecimal assetPrice;

  @CsvBindByName(column = "Asset Amount")
  public BigDecimal assetAmount;

  @CsvBindByName(column = "Status")
  public String status;

  @CsvBindByName(column = "Transaction ID")
  public String transactionId;

  @CsvDate(value = "MM/dd/yyyy")
  @CsvBindByName(column = "Date")
  public LocalDate date;

  @CsvBindByName(column = "Notes")
  public String notes;

  @CsvBindByName(column = "Name of sender/receiver")
  public String senderOrReceiver;

  @CsvBindByName(column = "Account")
  public String account;

  public CashAppDebitCsvTemplate() {
  }

  @Override
  public BankAccountPair getBankAccount() {
    return bankAccountPair;
  }

  @Override public Transactions toTransactions() {
    Transactions transactions = new Transactions();
    transactions.setAmount(amount);
    transactions.setTransactionType(transactionType);
    transactions.setTransactionDate(date);
    transactions.setPostDate(date);
    transactions.setMemo(notes);
    return transactions;
  }

  @Override public String toString() {
    return "CashAppDebitCsvTemplate{" +
        "bankAccountPair=" + bankAccountPair +
        ", currency='" + currency + '\'' +
        ", amount=" + amount +
        ", transactionType='" + transactionType + '\'' +
        ", fee=" + fee +
        ", netAmount=" + netAmount +
        ", assetType='" + assetType + '\'' +
        ", assetPrice=" + assetPrice +
        ", assetAmount=" + assetAmount +
        ", status='" + status + '\'' +
        ", transactionId='" + transactionId + '\'' +
        ", date=" + date +
        ", notes='" + notes + '\'' +
        ", senderOrReceiver='" + senderOrReceiver + '\'' +
        ", account='" + account + '\'' +
        '}';
  }
}
