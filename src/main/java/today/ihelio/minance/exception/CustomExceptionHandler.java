package today.ihelio.minance.exception;

import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Provider
public class CustomExceptionHandler implements ExceptionMapper<CustomException> {
  private final static Logger logger = LoggerFactory.getLogger(CustomExceptionHandler.class);

  @Override
  public Response toResponse(CustomException e) {
    logger.error("cannot complete the request.", e);
    if (e.getCause() instanceof RecordAlreadyExistingException
        || e.getCause() instanceof NotFoundException
        || e.getCause() instanceof IllegalArgumentException) {
      return Response.status(Response.Status.BAD_REQUEST)
          .entity(new CustomException.ErrorResponseBody(e.getCause().getMessage()))
          .build();
    } else {
      return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
          .entity(new CustomException.ErrorResponseBody("Something unexpected happened. Try again"))
          .build();
    }
  }
}
