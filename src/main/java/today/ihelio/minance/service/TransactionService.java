package today.ihelio.minance.service;

import java.util.List;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.transaction.Transactional;
import today.ihelio.minance.model.Transaction;
import today.ihelio.minance.repository.TransactionRepository;

import static javax.transaction.Transactional.TxType.REQUIRED;
import static javax.transaction.Transactional.TxType.REQUIRES_NEW;
import static javax.transaction.Transactional.TxType.SUPPORTS;

@Singleton
@Transactional(REQUIRED)
public class TransactionService {
  @Inject TransactionRepository transactionRepository;

  @Transactional
  public void createBatchTransactions(List<Transaction> transactions) {
    transactionRepository.persist(transactions);
  }

  @Transactional
  public boolean createSingleTransaction(Transaction transaction) {
    if (!isDuplicate(transaction)) {
      transactionRepository.persist(transaction);
      return true;
    }
    return false;
  }

  @Transactional(REQUIRES_NEW)
  public void updateTransaction(Transaction transaction) {
    Transaction existing = findTransactionById(transaction.getId());
    existing.setAccountId(transaction.getAccountId());
    existing.setDescription(transaction.getDescription());
    existing.setCategory(transaction.getCategory());
    existing.setTransactionDate(transaction.getTransactionDate());
    existing.setPostDate(transaction.getPostDate());
    existing.setAmount(transaction.getAmount());
    existing.setMemo(transaction.getMemo());
    transactionRepository.persist(existing);
  }

  @Transactional
  public void deleteTransaction(Transaction transaction) {
    transactionRepository.delete(transaction);
  }

  @Transactional(SUPPORTS)
  public Transaction findTransactionById(long id) {
    return transactionRepository.find("id", id).firstResult();
  }

  @Transactional(SUPPORTS)
  private boolean isDuplicate(Transaction transaction) {
    String query = "bankId = ?1 AND accountId = ?2 AND transactionDate = ?3 AND postDate = ?4 AND "
        + "category = ?5 AND description = ?6 AND type = ?7 AND amount = ?8";
    List<Transaction> duplicates = transactionRepository.list(query,
        transaction.getBankId(),
        transaction.getAccountId(),
        transaction.getTransactionDate(),
        transaction.getPostDate(),
        transaction.getCategory(),
        transaction.getDescription(),
        transaction.getType(),
        transaction.getAmount());
    return !duplicates.isEmpty();
  }
}
