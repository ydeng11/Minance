package today.ihelio.minance.rest;

import jakarta.enterprise.context.ApplicationScoped;
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
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.exception.RecordAlreadyExistingException;
import today.ihelio.minance.pojos.CsvHeaderMapping;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.CsvHeaderMappingService;

@Path("/1.0/minance/csvschema")
@RegisterRestClient(baseUri = "http://localhost:8080/")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class CsvSchemaResource {
  private final CsvHeaderMappingService csvHeaderMappingService;
  private final AccountService accountService;

  @Inject
  public CsvSchemaResource(CsvHeaderMappingService csvHeaderMappingService,
      AccountService accountService) {
    this.csvHeaderMappingService = csvHeaderMappingService;
    this.accountService = accountService;
  }

  @POST
  @Path("/create")
  public Response createSchema(CsvHeaderMapping csvHeaderMapping) throws CustomException {
    try {
      csvHeaderMappingService.store(csvHeaderMapping);
    } catch (Exception e) {
      throw new CustomException(e);
    }
    return Response.status(Response.Status.CREATED).build();
  }

  @PUT
  @Path("/update")
  public Response updateSchema(CsvHeaderMapping csvHeaderMapping) {
    try {
      csvHeaderMappingService.update(csvHeaderMapping);
    } catch (Exception e) {
      if (e instanceof RecordAlreadyExistingException) {
        return Response.status(Response.Status.BAD_REQUEST).entity("existing schema found").build();
      } else {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity("have issues with connecting to the database")
            .build();
      }
    }

    return Response.status(Response.Status.OK).build();
  }

  @DELETE
  @Path("/delete/{account_id}")
  public Response deleteSchema(@PathParam("account_id") int accountId) throws CustomException {
    if (csvHeaderMappingService.delete(accountId) > 0) {
      return Response.status(Response.Status.OK)
          .entity("Transaction schema deleted successfully")
          .build();
    }
    {
      throw new CustomException("cannot finish the deletion");
    }
  }

  @GET
  @Path("/retrieve/{account_id}")
  public Response getSchema(@PathParam("account_id") int accountId) {
    return Response.status(Response.Status.OK)
        .entity(csvHeaderMappingService.retrieve(accountId))
        .build();
  }

  @GET
  @Path("/retrieve/{bank_name}/{account_name}")
  public Response getSchemaByNameAndAccount(@PathParam("bank_name") String bankName,
      @PathParam("account_name") String accountName) {
    return Response.status(Response.Status.OK)
        .entity(csvHeaderMappingService.retrieveByBankAndAccount(bankName, accountName))
        .build();
  }
}
