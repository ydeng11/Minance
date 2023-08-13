package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;

import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.APPLE;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.CASH_APP;

@Dependent
public class CashAppCreditCsvTemplate implements BankAccountCsvTemplate {
  @CsvIgnore
  public final BankAccountPair bankAccountPair =
      BankAccountPair.of(CASH_APP, CREDIT);

  @CsvBindByName(column = "Currency")
  public String currency;

  @CsvBindByName(column = "Amount")
  public double amount;

  @CsvBindByName(column = "Fee")
  public double fee;

  @CsvBindByName(column = "Net Amount")
  public double netAmount;

  @CsvBindByName(column = "Asset Type")
  public String assetType;

  @CsvBindByName(column = "Asset Price")
  public String assetPrice;

  @CsvBindByName(column = "Asset Amount")
  public String assetAmount;

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

  public CashAppCreditCsvTemplate() {
  }

  @Override
  public BankAccountPair getBankAccount() {
    return bankAccountPair;
  }

  @Override public String toString() {
    return "CashAppCreditCsvTemplate{" +
        "bankAccountPair=" + bankAccountPair +
        ", currency='" + currency + '\'' +
        ", amount=" + amount +
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
