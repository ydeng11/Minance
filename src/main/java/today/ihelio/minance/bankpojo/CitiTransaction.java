package today.ihelio.minance.bankpojo;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.Date;
import today.ihelio.minance.config.CustomJsonDateDeserializer;

public class CitiTransaction extends AbstractBankTransaction {
  @JsonProperty("Date")
  @JsonDeserialize(using = CustomJsonDateDeserializer.class)
  private Date transactionDate;
  @JsonProperty("Description")
  private String description;
  @JsonProperty("Debit")
  private double debit;
  @JsonProperty("Credit")
  private double credit;
  @JsonProperty("Status")
  private String status;
  @JsonProperty("Member Name")
  private String memberName;
}
