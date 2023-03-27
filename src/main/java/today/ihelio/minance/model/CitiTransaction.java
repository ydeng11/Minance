package today.ihelio.minance.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import javax.inject.Singleton;
import javax.persistence.Entity;
import javax.persistence.Table;

@Singleton
@Entity
@Table(name = "transactions")
public class CitiTransaction extends AbstractTransaction {
  @JsonProperty("Bank")
  private String bank = "citi";
  @JsonProperty("Debit")
  private double debit;
  @JsonProperty("Credit")
  private double credit;

  public CitiTransaction() {
    super();
  }

}
