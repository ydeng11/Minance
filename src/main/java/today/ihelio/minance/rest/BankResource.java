package today.ihelio.minance.rest;

import java.sql.SQLException;

import org.jooq.exception.DataAccessException;

import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import static jakarta.ws.rs.core.Response.Status.OK;
import today.ihelio.jooq.tables.pojos.Banks;
import today.ihelio.minance.csvpojos.BankAccountPair;
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.exception.RecordAlreadyExistingException;
import today.ihelio.minance.service.BankService;

@Path("/1.0/minance/bank")
@Singleton
public class BankResource {
	@Inject
	BankService bankService;

	@GET
	@Path("/listAll")
	@Produces(MediaType.APPLICATION_JSON)
	public Response retrieveAll() throws DataAccessException {
		return Response.status(OK)
				.entity(bankService.retrieveAll())
				.build();
	}

	@POST
	@Path("/create")
	@Produces(MediaType.APPLICATION_JSON)
	@Consumes(MediaType.APPLICATION_JSON)
	public Response createBank(Banks bank)
			throws CustomException, SQLException {
		try {
			if (bankService.create(BankAccountPair.BankName.validateAndGet(bank.getBankName())).isEmpty()) {
				throw new CustomException(new RecordAlreadyExistingException("bank already created!"));
			}
		} catch (IllegalArgumentException e) {
			throw CustomException.from(
					new IllegalArgumentException(bank.getBankName() + " is not allowed!", e));
		}

		return Response.status(OK)
				.entity(bank.getBankName() + " created!")
				.build();
	}

	@PUT
	@Path("/update")
	@Produces(MediaType.APPLICATION_JSON)
	@Consumes(MediaType.APPLICATION_JSON)
	public Response updateBank(Banks updateBank) throws CustomException, SQLException {
		if (bankService.update(updateBank) == 0) {
			throw CustomException.from(
					new IllegalArgumentException("bank not found, please create the bank instead!"));
		}
		return Response.status(OK).build();
	}

	@DELETE
	@Path("/delete")
	@Produces(MediaType.APPLICATION_JSON)
	public Response deleteBank(@QueryParam("bank-name") String bankName)
			throws CustomException, SQLException, IllegalArgumentException {
		try {
			if (bankService.delete(BankAccountPair.BankName.valueOf(bankName)) == 0) {
				throw CustomException.from(
						new IllegalArgumentException("bank not found!"));
			}
		} catch (IllegalArgumentException e) {
			throw CustomException.from(
					new IllegalArgumentException(bankName + " is not allowed!", e));
		}
		return Response.status(OK).build();
	}
}
