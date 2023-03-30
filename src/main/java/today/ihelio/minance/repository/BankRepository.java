package today.ihelio.minance.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import javax.inject.Singleton;
import today.ihelio.minance.model.Bank;

@Singleton
public class BankRepository implements PanacheRepository<Bank> {
}
