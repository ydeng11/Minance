package today.ihelio.minance.csvpojos;

import com.google.common.annotations.VisibleForTesting;
import io.quarkus.arc.All;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class BankAccountCsvFactoryImpl implements BankAccountCsvFactory<BankAccountCsvTemplate> {
  private final List<BankAccountCsvTemplate> templates;
  private final Map<BankAccountPair, BankAccountCsvTemplate> templateMap;

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

  @VisibleForTesting
  public List<BankAccountPair> getKeys() {
    if (templateMap.size() == 0) {
      initializeMap();
    }
    return templateMap.keySet().stream().toList();
  }

  private void initializeMap() {
    templates.forEach((t) -> templateMap.put(t.getBankAccount(), t));
  }
}
