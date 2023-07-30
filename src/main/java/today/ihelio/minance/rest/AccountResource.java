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
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.exception.RecordAlreadyExistingException;
import today.ihelio.minance.service.AccountService;

@Path("/1.0/minance/account")
@RegisterRestClient
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class AccountResource {
  private final AccountService accountService;

  @Inject
  public AccountResource(AccountService accountService) {
    this.accountService = accountService;
  }

  @POST
  @Path("/create")
  public Response createAccount(Accounts accounts)
      throws RecordAlreadyExistingException, CustomException {
    if (accountService.create(accounts) == 0) {
      throw new RecordAlreadyExistingException("account already exited");
    }
    return Response.status(Response.Status.CREATED)
        .entity(accounts)
        .build();
  }

  @PUT
  @Path("/update")
  public Response updateAccount(Accounts updatedAccount) throws CustomException {
    if (accountService.update(updatedAccount) == 0) {
      throw new CustomException(
          new IllegalStateException("account not found, please create this account instead!"));
    }
    return Response.ok(updatedAccount).build();
  }

  @DELETE
  @Path("/delete/{bank_name}/{account_name}")
  public Response deleteAccount(@PathParam("bank_name") String bankName,
      @PathParam("account_name") String accountName) throws CustomException {
    if (accountService.delete(bankName, accountName) == 0) {
      CustomException customException = new CustomException(
          new IllegalStateException("account not found, please create this account instead!"));
      throw customException;
    }
    return Response.status(Response.Status.OK).build();
  }

  @GET
  @Path("/retrieveAll")
  public Response retrieveAll() throws CustomException {
    return Response.status(Response.Status.OK).entity(accountService.retrieveAll()).build();
  }

  @GET
  @Path("/retrieveAccounts/{bank_name}")
  public Response retrieveAccountsByBank(@PathParam("bank_name") String bankName)
      throws CustomException {
    return Response.status(Response.Status.OK)
        .entity(accountService.retrieveAccountsByBank(bankName))
        .build();
  }
}
