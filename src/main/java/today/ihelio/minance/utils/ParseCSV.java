package today.ihelio.minance.utils;

import com.fasterxml.jackson.databind.MappingIterator;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import today.ihelio.minance.model.ChaseTransaction;

public class ParseCSV {
  public static List<ChaseTransaction> parseChase(InputStream inputStream) throws IOException {
    CsvMapper csvMapper = new CsvMapper();
    CsvSchema schema = CsvSchema.builder()
        .addColumn("Transaction Date")
        .addColumn("Post Date")
        .addColumn("Description")
        .addColumn("Category")
        .addColumn("Type")
        .addColumn("Amount")
        .addColumn("Memo")
        .setSkipFirstDataRow(true)
        .setColumnSeparator(',') // specify the delimiter
        .build();

    MappingIterator<ChaseTransaction> mappingIterator = csvMapper
        .readerWithSchemaFor(ChaseTransaction.class).with(schema).readValues(inputStream);
    return mappingIterator.readAll();
  }
}
