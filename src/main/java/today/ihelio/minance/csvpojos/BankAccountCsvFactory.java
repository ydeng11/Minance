package today.ihelio.minance.csvpojos;

public interface BankAccountCsvFactory<T> {
  T get(BankAccountPair bankAccountPair);
}
