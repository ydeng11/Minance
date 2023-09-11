package today.ihelio.minance.pojos;

@Deprecated
public class HeaderMapping {
  public String inputColumn;
  public String transactionColumn;

  public HeaderMapping(String inputColumn, String transactionColumn) {
    this.inputColumn = inputColumn;
    this.transactionColumn = transactionColumn;
  }
}
