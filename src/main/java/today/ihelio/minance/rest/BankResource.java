package today.ihelio.minance.rest;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import today.ihelio.jooq.tables.pojos.Banks;
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.exception.RecordAlreadyExistingException;
import today.ihelio.minance.service.BankService;

@Path("/1.0/minance/bank")
@RegisterRestClient(baseUri = "http://localhost:8080/")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BankResource {
  @Inject
  private BankService bankService;

  @GET
  @Path("/retrieveAll")
  public Response retrieveAll() throws CustomException {
    return Response.status(Response.Status.OK)
        .entity(bankService.retrieveAll())
        .build();
  }

  @POST
  @Path("/create")
  public Response createBank(Banks banks) throws CustomException {
    if (bankService.create(banks) == 0) {
      throw new CustomException(new RecordAlreadyExistingException("bank already created!"));
    }

    return Response.status(Response.Status.CREATED)
        .entity(banks)
        .build();
  }

  @PUT
  @Path("/update")
  public Response updateBank(Banks updateBank) throws CustomException {
    if (bankService.update(updateBank) == 0) {
      throw new CustomException(
          new IllegalStateException("bank not found, please create this account instead!"));
    }
    return Response.status(Response.Status.OK).build();
  }

  @DELETE
  @Path("/delete/{bank_name}")
  public Response deleteBank(@PathParam("bank_name") String bankNAME) throws CustomException {
    if (bankService.delete(bankNAME) == 0) {
      throw new CustomException(
          new IllegalStateException("bank not found!"));
    }
    return Response.status(Response.Status.OK).build();
  }
}
