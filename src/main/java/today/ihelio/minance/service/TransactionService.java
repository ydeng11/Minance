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
    existing.setAccount(transaction.getAccount());
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

  private boolean isDuplicate(Transaction transaction) {
    String query = "account = ?! AND transactionDate = ?2 AND postDate = ?3 AND "
        + "category = ?4 AND description = ?5 AND type = ?6 AND amount = ?7";
    List<Transaction> duplicates = transactionRepository.list(query,
        transaction.getAccount(),
        transaction.getTransactionDate(),
        transaction.getPostDate(),
        transaction.getCategory(),
        transaction.getDescription(),
        transaction.getType(),
        transaction.getAmount());
    return !duplicates.isEmpty();
  }
}
