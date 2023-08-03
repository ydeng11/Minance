package today.ihelio.minance.csvpojos;

import io.quarkus.arc.All;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class BankAccountCsvFactoryImpl implements BankAccountCsvFactory<BankAccountCsvTemplate> {
  List<BankAccountCsvTemplate> templates;
  Map<BankAccountPair, BankAccountCsvTemplate> templateMap;

  @Inject
  public BankAccountCsvFactoryImpl(@All List<BankAccountCsvTemplate> templates) {
    this.templates = templates;
    this.templateMap = new HashMap<>();
  }

  @Override public BankAccountCsvTemplate get(BankAccountPair bankAccountPair) {
    if (templateMap.size() == 0) {
      initializeMap();
    }
    return templateMap.get(bankAccountPair);
  }

  private void initializeMap() {
    templates.forEach((t) -> templateMap.put(t.getBankAccount(), t));
  }
}
