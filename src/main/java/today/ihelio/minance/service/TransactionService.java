package today.ihelio.minance.service;

import com.google.common.annotations.VisibleForTesting;
import io.smallrye.common.constraint.Nullable;
import java.text.SimpleDateFormat;
import java.util.List;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.transaction.Transactional;
import today.ihelio.minance.model.Transaction;
import today.ihelio.minance.repository.TransactionRepository;

import static com.google.common.base.Preconditions.checkNotNull;
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
    transactionRepository.update(TransactionQueryBuilder.buildUpdateQuery(transaction));
  }

  @Transactional
  public void deleteTransaction(Transaction transaction) {
    transactionRepository.delete(transaction);
  }

  @Nullable
  @Transactional(SUPPORTS)
  public Transaction findTransactionById(long id) {
    return transactionRepository.find("id", id).firstResult();
  }

  @Transactional(SUPPORTS)
  private boolean isDuplicate(Transaction transaction) {

    checkNotNull(transaction.getAccount());
    checkNotNull(transaction.getTransactionDate());

    List<Transaction> duplicates =
        transactionRepository.list(TransactionQueryBuilder.buildListQuery(transaction));

    return !duplicates.isEmpty();
  }

  public static class TransactionQueryBuilder {
    static SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd");

    @VisibleForTesting
    static String buildListQuery(Transaction transaction) {
      String query = "";

      query = String.format("account_id = %s AND transactionDate = '%s' AND amount = %s",
          transaction.getAccount().getId(), formatter.format(transaction.getTransactionDate()),
          transaction.getAmount());
      query +=
          " AND postDate " + (transaction.getPostDate() != null ? String.format("= '%s'",
              formatter.format(transaction.getPostDate()))
              : "is null");
      query +=
          " AND category " + (transaction.getCategory() != null ? String.format("= '%s'",
              transaction.getCategory())
              : "is null");
      query += " AND description " + (transaction.getDescription() != null ? String.format("= '%s'",
          transaction.getDescription()) : "is null");
      query +=
          " AND type " + (transaction.getType() != null ? String.format("= '%s'",
              transaction.getType()) : "is null");
      return query;
    }

    @VisibleForTesting
    static String buildUpdateQuery(Transaction transaction) {
      String query = "";

      if (transaction.getTransactionDate() != null) {
        query +=
            String.format("transactionDate = '%s', ",
                formatter.format(transaction.getTransactionDate()));
      }
      if (transaction.getPostDate() != null) {
        query += String.format("postDate = '%s', ", formatter.format(transaction.getPostDate()));
      }
      if (transaction.getDescription() != null) {
        query += String.format("description = '%s', ", transaction.getDescription());
      }
      if (transaction.getCategory() != null) {
        query += String.format("category = '%s', ", transaction.getCategory());
      }
      if (transaction.getType() != null) {
        query += String.format("type = '%s', ", transaction.getType());
      }
      if (transaction.getMemo() != null) {
        query += String.format("memo = '%s', ", transaction.getMemo());
      }
      query += String.format("amount = %s , ", transaction.getAmount());
      query += String.format("account_id = %s ", transaction.getAccount().getId());
      query += String.format("where id = %s", transaction.getId());

      return query;
    }
  }
}
