package today.ihelio.csvprocessor;

import com.opencsv.bean.HeaderColumnNameTranslateMappingStrategy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.HashMap;
import java.util.Map;
import org.jooq.DSLContext;
import org.jooq.Record2;
import org.jooq.Result;
import today.ihelio.minance.csvpojos.RawTransactionPojo;

import static today.ihelio.jooq.tables.CsvColumnMapping.CSV_COLUMN_MAPPING;

@ApplicationScoped
public class CsvHeadersStrategyFactoryImpl implements CsvHeaderStrategyFactory {
  private final Map<Integer, HeaderColumnNameTranslateMappingStrategy<RawTransactionPojo>>
      strategyMap;
  private final DSLContext dslContext;

  @Inject
  public CsvHeadersStrategyFactoryImpl(DSLContext dslContext) {
    this.dslContext = dslContext;
    this.strategyMap = new HashMap<>();
  }

  @Override
  public HeaderColumnNameTranslateMappingStrategy getStrategy(int accountId, Class clazz) {
    if (strategyMap.containsKey(accountId)) {
      return strategyMap.get(accountId);
    }
    HeaderColumnNameTranslateMappingStrategy strategy =
        strategyMap.computeIfAbsent(accountId,
            (k) -> new HeaderColumnNameTranslateMappingStrategy<>());

    Result<Record2<String, String>> result =
        dslContext.select(CSV_COLUMN_MAPPING.INPUT_COLUMN, CSV_COLUMN_MAPPING.TRANSACTION_COLUMN)
            .from(CSV_COLUMN_MAPPING)
            .where(CSV_COLUMN_MAPPING.ACCOUNT_ID.eq(accountId))
            .fetch();
    Map<String, String> columnMapping = new HashMap<>();
    result.stream()
        .forEach((item) -> columnMapping.put((String) item.get(0), (String) item.get(1)));
    strategy.setType(clazz);
    strategy.setColumnMapping(columnMapping);
    return strategy;
  }
}
