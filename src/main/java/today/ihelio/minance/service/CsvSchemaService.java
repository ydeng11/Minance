package today.ihelio.minance.service;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.transaction.Transactional;
import today.ihelio.minance.model.TransactionCsvSchema;
import today.ihelio.minance.repository.CsvSchemaRepository;

import static javax.transaction.Transactional.TxType.REQUIRES_NEW;

@Singleton
@Transactional
public class CsvSchemaService {
  private final CsvSchemaRepository csvSchemaRepository;

  @Inject
  public CsvSchemaService(CsvSchemaRepository csvSchemaRepository) {
    this.csvSchemaRepository = csvSchemaRepository;
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
    csvSchemaRepository.persist(updatedSchema);
  }

  @Transactional
  public void deleteSchema(Long id) {
    csvSchemaRepository.deleteById(id);
  }

  @Transactional
  public TransactionCsvSchema findSchemaByBankAndAccount(Long bankId, Long accountId) {
    return csvSchemaRepository.find("bankId = ?1 AND accountId = ?2", bankId, accountId)
        .firstResult();
  }
}
