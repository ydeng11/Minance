package today.ihelio.minance.csvpojos;

import java.util.Objects;

public class BankAccountPair {
  private final BankName bankName;
  private final AccountType accountType;

  private BankAccountPair(BankName bankName, AccountType accountType) {
    this.bankName = bankName;
    this.accountType = accountType;
  }

  public static BankAccountPair of(BankName bankName, AccountType accountType) {
    return new BankAccountPair(bankName, accountType);
  }

  public BankName getBankName() {
    return bankName;
  }

  public AccountType getAccountType() {
    return accountType;
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj) {
      return true;
    }
    if (obj == null || getClass() != obj.getClass()) {
      return false;
    }
    BankAccountPair other = (BankAccountPair) obj;
    return Objects.equals(this.getBankName(), other.getBankName()) && Objects.equals(
        this.getAccountType(), other.getAccountType());
  }

  @Override public int hashCode() {
    return Objects.hash(this.bankName, this.accountType);
  }

  @Override public String toString() {
    return "BankAccountPair{" +
        "bankName=" + bankName +
        ", accountType=" + accountType +
        '}';
  }

  public enum BankName {
    CHASE("chase"),
    AMEX("amex"),
    DISCOVER("discover"),
    CITI("citi"),
    WELLS_FARGO("wellsFargo"),
    CASH_APP("cash"),
    APPLE("apple"),
    BANK_OF_AMERICA("bankOfAmerica");
    private final String name;

    BankName(String name) {
      this.name = name;
    }

    public String getName() {
      return name;
    }
  }

  public enum AccountType {
    CHECKING("checking"),
    SAVINGS("saving"),
    CREDIT("credit"),
    DEBIT("debit");
    private final String type;

    AccountType(String type) {
      this.type = type;
    }

    public String getType() {
      return type;
    }
  }
}
