package today.ihelio.minance.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import javax.inject.Singleton;
import today.ihelio.minance.model.TransactionCsvSchema;

@Singleton
public class CsvSchemaRepository
    implements PanacheRepository<TransactionCsvSchema> {

}
