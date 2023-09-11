package today.ihelio.minance.exception;

public class CustomException extends Exception {

  public CustomException(String message) {
    super(message);
  }

  public CustomException(String message, Throwable cause) {
    super(message, cause);
  }

  public CustomException(Throwable cause) {
    super(cause);
  }

  public static CustomException from(Throwable cause) {
    return new CustomException(cause);
  }

  public record ErrorResponseBody(String message) {
  }
}
