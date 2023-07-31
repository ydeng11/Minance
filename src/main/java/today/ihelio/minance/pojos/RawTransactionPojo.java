package today.ihelio.minance.pojos;

public class RawTransactionPojo {
  private String category;
  private String description;
  private String transactionType;
  private String transactionDate;
  private String postDate;
  private String memo;
  private Double amount;
  private String address;

  public RawTransactionPojo() {
  }

  public RawTransactionPojo(String category, String description, String transactionType,
      String transactionDate, String postDate, String memo, Double amount, String address) {
    this.category = category;
    this.description = description;
    this.transactionType = transactionType;
    this.transactionDate = transactionDate;
    this.postDate = postDate;
    this.memo = memo;
    this.amount = amount;
    this.address = address;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getTransactionType() {
    return transactionType;
  }

  public void setTransactionType(String transactionType) {
    this.transactionType = transactionType;
  }

  public String getTransactionDate() {
    return transactionDate;
  }

  public void setTransactionDate(String transactionDate) {
    this.transactionDate = transactionDate;
  }

  public String getPostDate() {
    return postDate;
  }

  public void setPostDate(String postDate) {
    this.postDate = postDate;
  }

  public String getMemo() {
    return memo;
  }

  public void setMemo(String memo) {
    this.memo = memo;
  }

  public Double getAmount() {
    return amount;
  }

  public void setAmount(Double amount) {
    this.amount = amount;
  }

  public String getAddress() {
    return address;
  }

  public void setAddress(String address) {
    this.address = address;
  }
}
