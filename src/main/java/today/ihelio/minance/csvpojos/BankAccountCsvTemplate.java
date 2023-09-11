package today.ihelio.minance.csvpojos;

import today.ihelio.jooq.tables.pojos.Transactions;

public interface BankAccountCsvTemplate {
  BankAccountPair getBankAccount();

  Transactions toTransactions();
}
