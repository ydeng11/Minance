package today.ihelio.minance.pojos;

import java.util.List;

public class CsvHeaderMapping {
  public int ccmId;
  public int accountId;
  public String accountName;
  public String bankName;
  public String dateFormat;
  public List<HeaderMapping> columnMapping;

  public CsvHeaderMapping(int ccmId, int accountId, String dateFormat,
      List<HeaderMapping> columnMapping) {
    this.ccmId = ccmId;
    this.accountId = accountId;
    this.dateFormat = dateFormat;
    this.columnMapping = columnMapping;
  }
}
