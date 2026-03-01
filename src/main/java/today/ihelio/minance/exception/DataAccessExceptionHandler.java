package today.ihelio.minance.exception;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jooq.exception.DataAccessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Provider
public class DataAccessExceptionHandler implements ExceptionMapper<DataAccessException> {
  private final static Logger logger = LoggerFactory.getLogger(DataAccessExceptionHandler.class);

  @Override
  public Response toResponse(DataAccessException e) {
    logger.error("has issues completing jooq operation!", e);
    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
        .entity(new CustomException.ErrorResponseBody(
            "Has issues completing jooq operation!. Try again"))
        .build();
  }
}
