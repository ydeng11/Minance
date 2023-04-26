package today.ihelio.minance.service;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.transaction.Transactional;
import today.ihelio.minance.model.Account;
import today.ihelio.minance.repository.AccountRepository;

import static javax.transaction.Transactional.TxType.REQUIRES_NEW;
import static javax.transaction.Transactional.TxType.SUPPORTS;

@Singleton
@Transactional
public class AccountService {
  @Inject AccountRepository accountRepository;

  // Create account
  @Transactional
  public void creatAccount(Account account) {
    accountRepository.persist(account);
  }

  // Delete account by id
  @Transactional
  public void deleteAccount(long id) {
    accountRepository.deleteById(id);
  }

  // Update account by id
  @Transactional(REQUIRES_NEW)
  public void updateAccount(long id, Account updatedAccount) {
    Account account = accountRepository.findById(id);
    if (account == null) {
      throw new IllegalArgumentException("Account not found");
    }
    account.setName(updatedAccount.getName());
    account.setType(updatedAccount.getType());
    account.setBalance(updatedAccount.getBalance());
    account.setTransactionCsvSchema(updatedAccount.getTransactionCsvSchema());
    account.setTransactions(updatedAccount.getTransactions());
    accountRepository.persist(account);
  }

  @Transactional(SUPPORTS)
  public Account findAccountByBankAndName(Long bankId, String accountName) {
    return accountRepository.find("bankId = ?1 and name = ?2", bankId, accountName).firstResult();
  }

  @Transactional(SUPPORTS)
  public Account findAccountById(long accountId) {
    return accountRepository.findById(accountId);
  }
}
