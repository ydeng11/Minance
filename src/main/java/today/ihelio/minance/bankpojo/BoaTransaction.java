package today.ihelio.minance.bankpojo;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.Date;
import today.ihelio.minance.config.CustomJsonDateDeserializer;

public class BoaTransaction extends AbstractBankTransaction {
  @JsonProperty("Date")
  @JsonDeserialize(using = CustomJsonDateDeserializer.class)
  private Date transactionDate;
  @JsonProperty("Description")
  private String description;
  @JsonProperty("Amount")
  private double amount;
  @JsonProperty("Running Bal.")
  private double balance;
}
