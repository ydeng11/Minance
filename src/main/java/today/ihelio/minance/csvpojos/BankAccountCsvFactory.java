package today.ihelio.minance.csvpojos;

import java.util.List;

public interface BankAccountCsvFactory<T> {
  T get(BankAccountPair bankAccountPair);

  List<BankAccountPair> getKeys();
}
