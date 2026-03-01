package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.List;

public class CsvTestUtils {
	public static <T extends AbstractBankAccountCsvTemplate> List<T> parseCsvFile(String resourcePath, T template) {
		ClassLoader classLoader = CsvTestUtils.class.getClassLoader();
		try (InputStream file = classLoader.getResourceAsStream(resourcePath)) {
			if (file == null) {
				throw new RuntimeException("Test CSV file not found: " + resourcePath);
			}
			Reader reader = new InputStreamReader(file);
			return createCsvReader(reader, template).parse();
		} catch (Exception e) {
			throw new RuntimeException("Failed to parse CSV file: " + resourcePath, e);
		}
	}

	private static <T extends AbstractBankAccountCsvTemplate> CsvToBean<T> createCsvReader(Reader reader, T template) {
		return new CsvToBeanBuilder<T>(reader)
				.withType((Class<? extends T>) template.getClass())
				.withSeparator(',')
				.withIgnoreLeadingWhiteSpace(true)
				.withIgnoreEmptyLine(true)
				.build();
	}
}
