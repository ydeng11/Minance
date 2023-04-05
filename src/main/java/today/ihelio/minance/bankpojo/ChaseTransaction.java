package today.ihelio.minance.bankpojo;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.Date;
import today.ihelio.minance.config.CustomJsonDateDeserializer;

public class ChaseTransaction extends AbstractBankTransaction {
  @JsonProperty("Transaction Date")
  @JsonDeserialize(using = CustomJsonDateDeserializer.class)
  private Date transactionDate;
  @JsonProperty("Post Date")
  @JsonDeserialize(using = CustomJsonDateDeserializer.class)
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
}
