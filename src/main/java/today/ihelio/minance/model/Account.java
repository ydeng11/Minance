package today.ihelio.minance.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import javax.persistence.Entity;

@Entity
public class Account extends PanacheEntity {
  private String name;
  private long bankId;
  private AccountType type;
  private double balance;

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public long getBankId() {
    return bankId;
  }

  public void setBankId(long bankId) {
    this.bankId = bankId;
  }

  public AccountType getType() {
    return type;
  }

  public void setType(AccountType type) {
    this.type = type;
  }

  public double getBalance() {
    return balance;
  }

  public void setBalance(double balance) {
    this.balance = balance;
  }

  public enum AccountType {
    CHECKING, SAVING, CREDIT_CARD, LOAN
  }
}
