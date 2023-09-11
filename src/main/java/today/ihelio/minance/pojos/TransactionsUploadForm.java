package today.ihelio.minance.pojos;

import jakarta.ws.rs.FormParam;
import java.io.InputStream;

public class TransactionsUploadForm {

  @FormParam("file")
  public InputStream file;
  @FormParam("bankName")
  public String bankName;
  @FormParam("accountName")
  public String accountName;
  @FormParam("accountType")
  public String accountType;
  @FormParam("useMinanceFormat")
  public String useMinanceFormat;
}
