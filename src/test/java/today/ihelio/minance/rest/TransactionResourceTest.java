package today.ihelio.minance.rest;

import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import today.ihelio.minance.model.Transaction;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TransactionResourceTest {
  TransactionResource transactionResource = new TransactionResource();

  @Test
  public void testColumnMappingWhenParsingTransactions() throws IOException {
    InputStream inputStream =
        getClass().getClassLoader().getResourceAsStream("data/fake_transactions.csv");

    Map<String, String> columnMapper = new HashMap<>();
    columnMapper.put("trans Date", "transaction Date");
    columnMapper.put("amount", "amount");
    columnMapper.put("type", "type");

    CsvSchema csvSchema = CsvSchema.builder().setUseHeader(true).
        addColumn("Transaction Date", CsvSchema.ColumnType.STRING).
        addColumn("Type", CsvSchema.ColumnType.STRING).
        addColumn("Amount", CsvSchema.ColumnType.STRING).
        build();

    List<Transaction> transactions =
        transactionResource.parseTransactions(inputStream, csvSchema, columnMapper);
    System.out.println(transactions.get(0));
    assertEquals(31, transactions.size());
  }
}
