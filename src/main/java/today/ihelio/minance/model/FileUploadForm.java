package today.ihelio.minance.model;

import java.io.InputStream;
import javax.ws.rs.FormParam;

public class FileUploadForm {

  @FormParam("file")
  public InputStream file;

  @FormParam("filename")
  public String fileName;

  @FormParam("bank")
  public String bank;

}
