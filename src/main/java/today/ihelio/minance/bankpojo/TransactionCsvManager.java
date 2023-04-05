package today.ihelio.minance.bankpojo;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Singleton;

@Singleton
public class TransactionCsvManager {
  private final Map<BankName, AbstractBankTransaction> mapper;

  public TransactionCsvManager() {
    mapper = new HashMap<>();
  }

  public enum BankName {
    Amex, Boa, Chase, Citi, Discover
  }
}
