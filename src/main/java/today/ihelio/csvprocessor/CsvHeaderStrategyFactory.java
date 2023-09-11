package today.ihelio.csvprocessor;

import com.opencsv.bean.HeaderColumnNameTranslateMappingStrategy;

@Deprecated
public interface CsvHeaderStrategyFactory {
  HeaderColumnNameTranslateMappingStrategy getStrategy(int accountId, Class clazz);
}
