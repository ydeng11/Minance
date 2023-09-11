package today.ihelio.minance.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

@Deprecated
public class CustomJsonDateDeserializer extends JsonDeserializer<Date> {
  @Override
  public Date deserialize(JsonParser jsonParser,
      DeserializationContext deserializationContext) throws IOException {

    SimpleDateFormat format = new SimpleDateFormat("MM/dd/yyyy");
    String date = jsonParser.getText();
    try {
      return format.parse(date);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}
