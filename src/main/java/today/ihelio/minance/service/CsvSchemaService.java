package today.ihelio.minance.service;

import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.persistence.EntityNotFoundException;
import javax.transaction.Transactional;
import today.ihelio.minance.model.Account;
import today.ihelio.minance.model.TransactionCsvSchema;
import today.ihelio.minance.repository.CsvSchemaRepository;

import static javax.transaction.Transactional.TxType.REQUIRES_NEW;
import static today.ihelio.minance.rest.CsvSchemaResource.deserializeColumns;

@Singleton
@Transactional
public class CsvSchemaService {
  private final CsvSchemaRepository csvSchemaRepository;
  private final Map<Account, CsvSchema> schemaMap;
  Function<String, CsvSchema.ColumnType> mapColumnType = type -> {
    switch (type.toLowerCase()) {
      case "string":
        return CsvSchema.ColumnType.STRING;
      case "number":
        return CsvSchema.ColumnType.NUMBER;
      case "boolean":
        return CsvSchema.ColumnType.BOOLEAN;
      default:
        throw new IllegalArgumentException("Unsupported column type: " + type);
    }
  };

  @Inject
  public CsvSchemaService(CsvSchemaRepository csvSchemaRepository) {
    this.csvSchemaRepository = csvSchemaRepository;
    this.schemaMap = new ConcurrentHashMap<>();
  }

  @Transactional
  public boolean createSchema(TransactionCsvSchema transactionCsvSchema) {
    csvSchemaRepository.persist(transactionCsvSchema);
    return true;
  }

  @Transactional
  public TransactionCsvSchema findSchemaById(Long id) {
    return csvSchemaRepository.findById(id);
  }

  @Transactional(REQUIRES_NEW)
  public void updateSchema(TransactionCsvSchema updatedSchema) {
    csvSchemaRepository.update(
        "columnNames = ?1, columnSeparator = ?2, dataTypes = ?3, skipFirstDataRow = ?4, useHeader = ?5 where id = ?6",
        updatedSchema.getColumnNames(), updatedSchema.getColumnSeparator(),
        updatedSchema.getDataTypes(), updatedSchema.isSkipFirstDataRow(),
        updatedSchema.isUseHeader(), updatedSchema.id);
  }

  @Transactional
  public void deleteSchema(Long id) {
    csvSchemaRepository.deleteById(id);
  }

  @Transactional
  public TransactionCsvSchema findSchemaByAccount(Account account) {
    return csvSchemaRepository.find("account.id = ?1", account.id)
        .firstResult();
  }

  public CsvSchema getSchema(Account account) {
    if (account == null) {
      throw new IllegalArgumentException("Customer object cannot be null");
    }
    if (!schemaMap.containsKey(account)) {
      TransactionCsvSchema transactionCsvSchema = findSchemaByAccount(account);
      if (transactionCsvSchema == null) {
        throw new EntityNotFoundException("Schema for account " + account.getName() + " from bank "
            + account.getBankId() + " not found");
      }

      List<String> columnNames = deserializeColumns(transactionCsvSchema.getColumnNames());
      List<String> mappedColumns = deserializeColumns(transactionCsvSchema.getMappedColumns());

      CsvSchema.Builder csvSchemaBuilder = CsvSchema.builder();

      for (int i = 0; i < columnNames.size(); i++) {
        csvSchemaBuilder.addColumn(columnNames.get(i));
      }
      CsvSchema csvSchema =
          csvSchemaBuilder.setSkipFirstDataRow(transactionCsvSchema.isSkipFirstDataRow())
              .setColumnSeparator(transactionCsvSchema.getColumnSeparator().charAt(0))
              .setUseHeader(transactionCsvSchema.isUseHeader())// specify the delimiter
              .build();

      if (mappedColumns.size() != 0) {

      }

      schemaMap.put(account, csvSchema);
    }

    return schemaMap.get(account);
  }
}
