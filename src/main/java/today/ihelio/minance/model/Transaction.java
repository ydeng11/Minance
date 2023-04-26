package today.ihelio.minance.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import java.util.Date;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import today.ihelio.minance.config.CustomJsonDateDeserializer;

@Entity
@Table(name = "Transaction")
public class Transaction extends PanacheEntityBase {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;
  @ManyToOne(cascade = {CascadeType.MERGE}, fetch = FetchType.LAZY)
  private Account account;
  @JsonProperty("transaction date")
  @JsonDeserialize(using = CustomJsonDateDeserializer.class)
  @Temporal(TemporalType.DATE)
  private Date transactionDate;
  @JsonProperty("post date")
  @JsonDeserialize(using = CustomJsonDateDeserializer.class)
  @Temporal(TemporalType.DATE)
  private Date postDate;
  @JsonProperty("description")
  private String description;
  @JsonProperty("category")
  private String category;
  @JsonProperty("type")
  private String type;
  @JsonProperty("amount")
  private double amount;
  @JsonProperty("memo")
  private String memo;

  public Transaction() {
  }

  public long getId() {
    return id;
  }

  public void setId(long id) {
    this.id = id;
  }

  public Account getAccount() {
    return account;
  }

  public void setAccount(Account account) {
    this.account = account;
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
