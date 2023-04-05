package today.ihelio.minance.bankpojo;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.Date;
import today.ihelio.minance.config.CustomJsonDateDeserializer;

public class DiscoverTransaction extends AbstractBankTransaction {
  @JsonProperty("Trans. Date")
  @JsonDeserialize(using = CustomJsonDateDeserializer.class)
  private Date transactionDate;
  @JsonProperty("Post Date")
  @JsonDeserialize(using = CustomJsonDateDeserializer.class)
  private Date postDate;
  @JsonProperty("Description")
  private String description;

  @JsonProperty("Category")
  private String category;

  @JsonProperty("Amount")
  private double amount;
}
