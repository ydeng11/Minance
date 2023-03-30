package today.ihelio.minance.rest;

import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.annotations.jaxrs.FormParam;
import today.ihelio.minance.model.Account;
import today.ihelio.minance.model.Bank;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;

@Path("/1.0/minance/account")
@RegisterRestClient(baseUri = "http://localhost:8080/")
public class AccountResource {
  @Inject
  private AccountService accountService;
  @Inject
  private BankService bankService;

  @POST
  @Path("/create")
  @Produces(MediaType.APPLICATION_JSON)
  @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
  public Response createAccount(
      @FormParam("name") String name,
      @FormParam("bank") String bankName,
      @FormParam("type") Account.AccountType type,
      @FormParam("balance") double balance) {

    Account account = new Account();
    account.setName(name);
    account.setType(type);
    account.setBalance(balance);

    Bank bank = bankService.findBankByName(bankName);
    if (bank == null) {
      bank = bankService.creatBank(bankName);
    }
    if (accountService.findAccountByBankAndName(bank.id, account.getName()) != null) {
      return Response.status(Response.Status.CONFLICT)
          .entity("Record already exists")
          .build();
    }

    account.setBankId(bank.id);

    accountService.creatAccount(account);

    return Response.status(Response.Status.CREATED)
        .entity(account)
        .build();
  }

  @PUT
  @Path("/update/{id}")
  @Produces(MediaType.APPLICATION_JSON)
  @Consumes(MediaType.APPLICATION_JSON)
  public Response updateAccount(@PathParam("id") long id, Account updatedAccount) {
    accountService.updateAccount(id, updatedAccount);
    return Response.ok(updatedAccount).build();
  }

  @DELETE
  @Path("/delete/{id}")
  public Response deleteAccount(@PathParam("id") long id) {
    accountService.deleteAccount(id);
    return Response.noContent().build();
  }

  @GET
  @Path("/bankid={bankId}&account_name={accountName}")
  @Produces(MediaType.APPLICATION_JSON)
  @Consumes(MediaType.APPLICATION_JSON)
  public Response findAccountByBankIdAndAccountName(@PathParam("bankId") long id,
      @PathParam("accountName") String accountName) {
    Account account = accountService.findAccountByBankAndName(id, accountName);
    return Response.ok(account).build();
  }
}
