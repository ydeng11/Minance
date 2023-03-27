package today.ihelio.minance.model;

import javax.inject.Singleton;
import javax.persistence.Entity;
import javax.persistence.Table;

@Singleton
@Entity
@Table(name = "transactions")
public class DiscoverTransaction extends AbstractTransaction {
  private String bank = "discover";

  public DiscoverTransaction() {
    super();
  }
}
