package today.ihelio.minance.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import today.ihelio.minance.config.CustomJsonDateDeserializer;

@Entity
public class Transaction extends PanacheEntityBase {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;
  private long bankId;
  private long accountId;
  @JsonProperty("Transaction Date")
  @JsonDeserialize(using = CustomJsonDateDeserializer.class)
  private Date transactionDate;
  @JsonDeserialize(using = CustomJsonDateDeserializer.class)
  @JsonProperty("Post Date")
  private Date postDate;
  @JsonProperty("Description")
  private String description;
  @JsonProperty("Category")
  private String category;
  @JsonProperty("Type")
  private String type;
  @JsonProperty("Amount")
  private double amount;
  @JsonProperty("Memo")
  private String memo;

  public Transaction() {
  }

  public long getId() {
    return id;
  }

  public void setId(long id) {
    this.id = id;
  }

  public long getBankId() {
    return bankId;
  }

  public void setBankId(long bankId) {
    this.bankId = bankId;
  }

  public long getAccountId() {
    return accountId;
  }

  public void setAccountId(long accountId) {
    this.accountId = accountId;
  }

  public Date getTransactionDate() {
    return transactionDate;
  }

  public void setTransactionDate(Date transactionDate) {
    this.transactionDate = transactionDate;
  }

  public Date getPostDate() {
    return postDate;
  }

  public void setPostDate(Date postDate) {
    this.postDate = postDate;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public double getAmount() {
    return amount;
  }

  public void setAmount(double amount) {
    this.amount = amount;
  }

  public String getMemo() {
    return memo;
  }

  public void setMemo(String memo) {
    this.memo = memo;
  }

  @Override public String toString() {
    return transactionDate + "," + type + "," + amount;
  }
}
