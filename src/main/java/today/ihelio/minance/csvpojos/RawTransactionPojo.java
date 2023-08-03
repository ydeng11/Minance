package today.ihelio.minance.csvpojos;

import com.google.auto.value.AutoValue;
import java.time.LocalDate;

@AutoValue
public class RawTransactionPojo {
  public int accountId;
  public double amount;
  public String bankName;
  public String accountName;
  public String category;
  public String description;
  public String transactionType;
  public LocalDate transactionDate;
  public LocalDate postDate;
  public String memo;
  public String address;
  public String city;
  public String stateName;
  public String country;
  public String zipcode;
}
