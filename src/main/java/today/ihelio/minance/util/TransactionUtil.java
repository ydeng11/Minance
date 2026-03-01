package today.ihelio.minance.util;

import today.ihelio.minance.csvpojos.BankAccountPair;

public class TransactionUtil {

  public static BankAccountPair makeBankAccountPair(String bankName, String accountType)
      throws IllegalStateException {
    return BankAccountPair.of(BankAccountPair.BankName.valueOf(bankName.toUpperCase()),
        BankAccountPair.AccountType.valueOf(accountType.toUpperCase()));
  }
}
