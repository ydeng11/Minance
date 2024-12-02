package today.ihelio.minance.rest;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jooq.exception.DataAccessException;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.minance.csvpojos.BankAccountPair;
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.exception.RecordAlreadyExistingException;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;

import java.sql.SQLException;

import static today.ihelio.minance.csvpojos.BankAccountPair.checkEnumFormat;

@Path("/1.0/minance/account")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class AccountResource {
	private final AccountService accountService;

	@Inject
	public AccountResource(AccountService accountService, BankService bankService) {
		this.accountService = accountService;
	}

	@POST
	@Path("/create")
	public Response createAccount(Accounts accounts)
			throws SQLException, CustomException {
		if (accountService.create(accounts) == 0) {
			throw new CustomException(new RecordAlreadyExistingException("account already exited"));
		}
		return Response.status(Response.Status.CREATED)
				.entity(accounts)
				.build();
	}

	@PUT
	@Path("/update")
	public Response updateAccount(Accounts updatedAccount) throws SQLException, CustomException {
		if (accountService.update(updatedAccount) == 0) {
			throw new CustomException(
					new NotFoundException("account not found, please create this account instead!"));
		}
		return Response.ok(updatedAccount).build();
	}

	@DELETE
	@Path("/delete")
	public Response deleteAccount(@QueryParam("bank-name") String bankName,
	                              @QueryParam("account-name") String accountName,
	                              @QueryParam("account-id") String accountId) throws SQLException, CustomException {

		int deleteCount = 0;

		if (accountId != null && !accountId.isEmpty()) {
			deleteCount = accountService.delete(Integer.parseInt(accountId));
		} else if (bankName != null && !bankName.isEmpty() && accountName != null && !accountName.isEmpty()) {
			deleteCount = accountService.delete(bankName, accountName);
		} else {
			throw new CustomException(new IllegalArgumentException("Either account-id or bank-name and account-name must be provided"));
		}

		if (deleteCount == 0) {
			throw new CustomException(new NotFoundException("account not found, please create this account instead!"));
		}

		return Response.status(Response.Status.OK).build();
	}

	@GET
	@Path("/listAll")
	public Response retrieveAll() throws DataAccessException {
		return Response.status(Response.Status.OK).entity(accountService.retrieveAll()).build();
	}

	@GET
	@Path("/listAccountsForBank")
	public Response retrieveAccountsByBank(@QueryParam("bank-name") String bankName)
			throws DataAccessException, CustomException {
		checkEnumFormat(BankAccountPair.BankName.class, bankName);
		return Response.status(Response.Status.OK)
				.entity(accountService.retrieveAccountsByBank(BankAccountPair.BankName.valueOf(bankName)))
				.build();
	}

	@GET
	@Path("/supportedBanks")
	public Response retrieveSupportedBanks() throws DataAccessException {
		return Response.status(Response.Status.OK)
				.entity(BankAccountPair.BankName.values())
				.build();
	}

	@GET
	@Path("/supportedAccountTypes")
	public Response retrieveSupportedAccountTypes() throws DataAccessException {
		return Response.status(Response.Status.OK)
				.entity(BankAccountPair.AccountType.values())
				.build();
	}
}
