package today.ihelio.minance.exception;

import java.io.Serializable;

public class CustomException extends Exception implements Serializable {
  private static final long serialVersionUID = 1L;

  public CustomException() {
    super();
  }

  public CustomException(String msg) {
    super(msg);
  }

  public CustomException(Exception e) {
    super();
    this.initCause(e);
  }

  public CustomException(String msg, Exception e) {
    super(msg, e);
    this.initCause(e);
  }
}
