package today.ihelio.minance.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import javax.inject.Singleton;
import today.ihelio.minance.model.AbstractTransaction;

@Singleton
public class TransactionRepository implements PanacheRepository<AbstractTransaction> {
  @Override public void persist(AbstractTransaction abstractTransaction) {
    persist(abstractTransaction);
  }



}
