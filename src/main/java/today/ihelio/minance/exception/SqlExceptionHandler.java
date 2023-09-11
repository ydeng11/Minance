package today.ihelio.minance.exception;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import java.sql.SQLException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Provider
public class SqlExceptionHandler implements ExceptionMapper<SQLException> {
  private static final Logger logger = LoggerFactory.getLogger(SqlExceptionHandler.class);

  @Override public Response toResponse(SQLException throwables) {
    logger.error("Has problem to complete the database operation!", throwables);
    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
        .entity(new CustomException.ErrorResponseBody("cannot finish the base operation!"))
        .build();
  }
}
