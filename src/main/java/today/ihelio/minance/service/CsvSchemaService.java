package today.ihelio.minance.service;

import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.transaction.Transactional;
import today.ihelio.minance.model.Account;
import today.ihelio.minance.model.CsvSchemaColumnMapping;
import today.ihelio.minance.model.TransactionCsvSchema;
import today.ihelio.minance.repository.CsvSchemaColumnMappingRepository;
import today.ihelio.minance.repository.CsvSchemaRepository;

import static javax.transaction.Transactional.TxType.REQUIRES_NEW;

@Singleton
@Transactional
public class CsvSchemaService {
  private final CsvSchemaRepository csvSchemaRepository;
  private final CsvSchemaColumnMappingRepository csvSchemaColumnMappingRepository;
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
  public CsvSchemaService(CsvSchemaRepository csvSchemaRepository,
      CsvSchemaColumnMappingRepository csvSchemaColumnMappingRepository) {
    this.csvSchemaRepository = csvSchemaRepository;
    this.csvSchemaColumnMappingRepository = csvSchemaColumnMappingRepository;
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
        "columnSeparator = ?1, skipFirstDataRow = ?2, useHeader = ?3 where id = ?4",
        updatedSchema.getColumnSeparator(), updatedSchema.isSkipFirstDataRow(),
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

  @Transactional
  public Map<String, String> findSchemaColumnMapping(TransactionCsvSchema transactionCsvSchema) {
    List<CsvSchemaColumnMapping> csvSchemaMappings = csvSchemaColumnMappingRepository.
        list("transactionCsvSchema_id = ?1", transactionCsvSchema.id);
    Map<String, String> columnMapper = csvSchemaMappings.stream()
        .collect(
            Collectors.toMap(CsvSchemaColumnMapping::getColumnName,
                CsvSchemaColumnMapping::getMappedName));
    return columnMapper;
  }

  @Transactional
  public void saveSchemaColumnMapping(TransactionCsvSchema transactionCsvSchema,
      Map<String, String> columnMapping) {
    for (Map.Entry<String, String> item : columnMapping.entrySet()) {
      CsvSchemaColumnMapping csvSchemaMapping = new CsvSchemaColumnMapping();
      csvSchemaMapping.setTransactionCsvSchema(transactionCsvSchema);
      csvSchemaMapping.setColumnName(item.getKey());
      csvSchemaMapping.setMappedName(item.getValue());
      csvSchemaColumnMappingRepository.persist(csvSchemaMapping);
    }
  }

  @Transactional
  public void deleteSchemaColumnMapping(TransactionCsvSchema transactionCsvSchema) {
    csvSchemaColumnMappingRepository.delete("transactionCsvSchema_id",
        transactionCsvSchema.id);
  }

  public CsvSchema buildCsvSchema(TransactionCsvSchema transactionCsvSchema,
      List<String> columnNames, Map<String, String> columnMapper) {
    CsvSchema.Builder csvSchemaBuilder = CsvSchema.builder().
        setUseHeader(transactionCsvSchema.isUseHeader()).
        setColumnSeparator(transactionCsvSchema.getColumnSeparator()).
        setSkipFirstDataRow(transactionCsvSchema.isSkipFirstDataRow());

    for (String column : columnNames) {
      csvSchemaBuilder.addColumn(columnMapper.get(column.toLowerCase()));
    }

    return csvSchemaBuilder.build();
  }
}
