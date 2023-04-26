package today.ihelio.minance.service;

import java.util.Date;
import org.junit.jupiter.api.Test;
import today.ihelio.minance.model.Account;
import today.ihelio.minance.model.Transaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static today.ihelio.minance.service.TransactionService.TransactionQueryBuilder.buildListQuery;
import static today.ihelio.minance.service.TransactionService.TransactionQueryBuilder.buildUpdateQuery;

class TransactionServiceTest {
  Account account = mock(Account.class);
  Transaction transaction = mock(Transaction.class);
  Date testDate = new Date("03/01/2022");

  @Test
  void testQueryWithMainParam() {
    when(account.getId()).thenReturn(1L);
    when(transaction.getAccount()).thenReturn(account);
    when(transaction.getTransactionDate()).thenReturn(testDate);
    when(transaction.getAmount()).thenReturn(10.0);
    String expected =
        "account_id = 1 AND transactionDate = '2022-03-01' AND amount = 10.0 AND postDate is null"
            + " AND category is null AND description is null AND type is null";
    assertEquals(expected, buildListQuery(transaction));
  }

  @Test
  void testCustomQuery() {
    when(account.getId()).thenReturn(1L);
    when(transaction.getAccount()).thenReturn(account);
    when(transaction.getTransactionDate()).thenReturn(testDate);
    when(transaction.getAmount()).thenReturn(10.0);
    when(transaction.getType()).thenReturn("sale");
    String expected =
        "account_id = 1 AND transactionDate = '2022-03-01' AND amount = 10.0 AND postDate is null"
            + " AND category is null AND description is null AND type = 'sale'";
    assertEquals(expected, buildListQuery(transaction));
  }

  @Test
  void testUpdateQuery() {
    when(account.getId()).thenReturn(1L);
    when(transaction.getAccount()).thenReturn(account);
    when(transaction.getId()).thenReturn(2L);
    when(transaction.getTransactionDate()).thenReturn(testDate);
    when(transaction.getAmount()).thenReturn(10.0);
    String expected =
        "transactionDate = '2022-03-01', amount = 10.0, account_id = 1 where id = 2";
    assertEquals(expected, buildUpdateQuery(transaction));
  }
}
