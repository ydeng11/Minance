package today.ihelio.minance.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;

@Entity
public class Account extends PanacheEntity {
  private String name;
  private long bankId;
  private AccountType type;
  private double balance;
  @JsonIgnore
  @OneToMany(cascade = {CascadeType.ALL}, fetch = FetchType.EAGER, mappedBy = "account")
  private List<Transaction> transactions;
  @JsonIgnore
  @OneToOne(mappedBy = "account")
  private TransactionCsvSchema transactionCsvSchema;

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

  public List<Transaction> getTransactions() {
    return transactions;
  }

  public void setTransactions(List<Transaction> transactions) {
    this.transactions = transactions;
  }

  public TransactionCsvSchema getTransactionCsvSchema() {
    return transactionCsvSchema;
  }

  public void setTransactionCsvSchema(TransactionCsvSchema transactionCsvSchema) {
    this.transactionCsvSchema = transactionCsvSchema;
  }

  public enum AccountType {
    CHECKING, SAVING, CREDIT_CARD, LOAN
  }
}
