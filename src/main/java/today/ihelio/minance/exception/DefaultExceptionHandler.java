package today.ihelio.minance.exception;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jooq.exception.DataAccessException;

@Provider
public class DefaultExceptionHandler implements ExceptionMapper<CustomException> {
  @Override
  public Response toResponse(CustomException e) {
    if (e.getCause() instanceof RecordAlreadyExistingException) {
      return Response.status(Response.Status.BAD_REQUEST).entity("record already existed").build();
    } else if (e.getCause() instanceof DataAccessException) {
      return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
          .entity("cannot connect to database")
          .build();
    } else {
      return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
    }
  }
}
