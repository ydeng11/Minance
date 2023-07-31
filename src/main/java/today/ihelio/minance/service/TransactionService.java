package today.ihelio.minance.service;

import com.google.common.collect.ImmutableList;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.NotFoundException;
import java.util.List;
import java.util.stream.Collectors;
import org.jooq.DSLContext;
import org.jooq.Field;
import today.ihelio.jooq.tables.pojos.Transactions;
import today.ihelio.jooq.tables.records.TransactionsRecord;
import today.ihelio.minance.exception.CustomException;

import static today.ihelio.jooq.Tables.TRANSACTIONS;

@ApplicationScoped
public class TransactionService {
  public static final List<Field<?>> INSERTABLE_FIELDS = ImmutableList.of(TRANSACTIONS.ACCOUNT_ID,
      TRANSACTIONS.CATEGORY,
      TRANSACTIONS.DESCRIPTION,
      TRANSACTIONS.TRANSACTION_TYPE,
      TRANSACTIONS.TRANSACTION_DATE,
      TRANSACTIONS.POST_DATE,
      TRANSACTIONS.MEMO,
      TRANSACTIONS.AMOUNT,
      TRANSACTIONS.ADDRESS,
      TRANSACTIONS.BANK_NAME,
      TRANSACTIONS.ACCOUNT_NAME);
  DSLContext dslContext;

  @Inject
  public TransactionService(DSLContext dslContext) {
    this.dslContext = dslContext;
  }

  public int create(List<Transactions> transactionsList) {
    return dslContext.insertInto(TRANSACTIONS, INSERTABLE_FIELDS)
        .valuesOfRecords(transactionsList.stream().map(t -> {
          TransactionsRecord r = new TransactionsRecord(t);
          return r.into(TRANSACTIONS.ACCOUNT_ID,
              TRANSACTIONS.CATEGORY,
              TRANSACTIONS.DESCRIPTION,
              TRANSACTIONS.TRANSACTION_TYPE,
              TRANSACTIONS.TRANSACTION_DATE,
              TRANSACTIONS.POST_DATE,
              TRANSACTIONS.MEMO,
              TRANSACTIONS.AMOUNT,
              TRANSACTIONS.ADDRESS,
              TRANSACTIONS.BANK_NAME,
              TRANSACTIONS.ACCOUNT_NAME);
        }).collect(Collectors.toList()))
        .onDuplicateKeyUpdate()
        .set(TRANSACTIONS.IS_DUPLICATE, "Y")
        .execute();
  }

  public int update(Transactions transactions) throws CustomException {
    if (retrieve(transactions.getTransactionId()) == null) {
      throw new CustomException(new NotFoundException("transaction not found"));
    }
    return dslContext.update(TRANSACTIONS)
        .set(TRANSACTIONS.ACCOUNT_ID, transactions.getAccountId())
        .set(TRANSACTIONS.ACCOUNT_NAME, transactions.getAccountName())
        .set(TRANSACTIONS.BANK_NAME, transactions.getBankName())
        .set(TRANSACTIONS.DESCRIPTION, transactions.getDescription())
        .set(TRANSACTIONS.CATEGORY, transactions.getCategory())
        .set(TRANSACTIONS.TRANSACTION_TYPE, transactions.getTransactionType())
        .set(TRANSACTIONS.MEMO, transactions.getMemo())
        .set(TRANSACTIONS.POST_DATE, transactions.getPostDate())
        .set(TRANSACTIONS.TRANSACTION_DATE, transactions.getTransactionDate())
        .set(TRANSACTIONS.AMOUNT, transactions.getAmount())
        .set(TRANSACTIONS.ADDRESS, transactions.getAddress())
        .where(TRANSACTIONS.TRANSACTION_ID.eq(transactions.getTransactionId()))
        .execute();
  }

  public int delete(List<Integer> transactionIds) {
    return dslContext.delete(TRANSACTIONS)
        .where(TRANSACTIONS.TRANSACTION_ID.in(transactionIds))
        .execute();
  }

  public Transactions retrieve(int transactionId) {
    return dslContext.select(TRANSACTIONS)
        .from(TRANSACTIONS)
        .where(TRANSACTIONS.TRANSACTION_ID.eq(transactionId))
        .fetchOne()
        .into(Transactions.class);
  }

  public List<Transactions> retrieveByAccount(int accountId) {
    return dslContext.select(TRANSACTIONS)
        .from(TRANSACTIONS)
        .where(TRANSACTIONS.ACCOUNT_ID.eq(accountId))
        .orderBy(TRANSACTIONS.TRANSACTION_DATE)
        .fetchInto(Transactions.class);
  }

  public List<Transactions> retrieveDuplicate(Integer accountId) {
    return dslContext.select(TRANSACTIONS)
        .from(TRANSACTIONS)
        .where(TRANSACTIONS.IS_DUPLICATE.eq("Y"))
        .and(TRANSACTIONS.ACCOUNT_ID.eq(accountId))
        .orderBy(TRANSACTIONS.TRANSACTION_DATE)
        .fetchInto(Transactions.class);
  }
}
