package today.ihelio.minance.csvpojos;

import com.google.common.annotations.VisibleForTesting;
import io.quarkus.arc.All;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Implementation of the bank account CSV template factory.
 */
@ApplicationScoped
public class BankAccountCsvFactoryImpl implements BankAccountCsvFactory {
    private final List<AbstractBankAccountCsvTemplate> templates;
    private final Map<BankAccountPair, AbstractBankAccountCsvTemplate> templateMap;

    @Inject
    public BankAccountCsvFactoryImpl(@All List<AbstractBankAccountCsvTemplate> templates) {
        this.templates = templates;
        this.templateMap = new HashMap<>();
    }

    @Override 
    public AbstractBankAccountCsvTemplate get(BankAccountPair bankAccountPair) {
        if (templateMap.isEmpty()) {
            initializeMap();
        }
        return templateMap.get(bankAccountPair);
    }

    @Override
    @VisibleForTesting
    public List<BankAccountPair> getKeys() {
        if (templateMap.isEmpty()) {
            initializeMap();
        }
        return templateMap.keySet().stream().toList();
    }

    private void initializeMap() {
        templates.forEach(t -> templateMap.put(t.getBankAccount(), t));
    }
}
