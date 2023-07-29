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

  public CustomException(Exception e, String msg) {
    super(msg, e);
    this.initCause(e);
  }

  public CustomException of(Exception e, String msg) {
    return new CustomException(e, msg);
  }
}
