package today.ihelio.minance.rest;

import com.google.common.collect.ImmutableList;
import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.jooq.exception.DataAccessException;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.jooq.tables.pojos.Banks;
import today.ihelio.jooq.tables.pojos.Transactions;
import today.ihelio.minance.csvpojos.BankAccountCsvFactory;
import today.ihelio.minance.csvpojos.BankAccountCsvTemplate;
import today.ihelio.minance.csvpojos.BankAccountPair;
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;
import today.ihelio.minance.service.TransactionService;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.file.Files;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static jakarta.ws.rs.core.Response.Status.OK;
import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.MINANCE;
import static today.ihelio.minance.util.TransactionUtil.makeBankAccountPair;

@Path("/1.0/minance/transactions")
@Produces(MediaType.APPLICATION_JSON)
@Singleton
public class TransactionResource {
	private static final BankAccountPair MINANCE_BANK_ACCOUNT = BankAccountPair.of(MINANCE, CREDIT);
	private final TransactionService transactionService;
	private final AccountService accountService;
	private final BankService bankService;
	private final BankAccountCsvFactory<BankAccountCsvTemplate> bankAccountCsvFactory;
	private final DateTimeFormatter formatter;

	@Inject
	public TransactionResource(TransactionService transactionService, AccountService accountService,
	                           BankService bankService,
	                           BankAccountCsvFactory<BankAccountCsvTemplate> bankAccountCsvFactory) {
		this.transactionService = transactionService;
		this.accountService = accountService;
		this.bankService = bankService;
		this.bankAccountCsvFactory = bankAccountCsvFactory;
		this.formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
	}

	@POST
	@Path("/upload_csv")
	public Response uploadTransactions(@RestForm("csv") FileUpload file,
	                                   @RestForm @PartType(MediaType.APPLICATION_JSON) TransactionsUploadForm form)
			throws SQLException, CustomException {
		String bankName = form.bankName;
		String accountName = form.accountName;
		String useMinanceFormat = form.useMinanceFormat;
		var now = LocalDateTime.now();

		Banks banks = bankService.findBankByName(BankAccountPair.BankName.valueOf(bankName));
		if (banks == null) {
			throw new CustomException(new NotFoundException("No Bank Found"));
		}

		Optional<Accounts> account =
				accountService.findAccountByBankAndAccountName(bankName, accountName);
		if (account.isEmpty()) {
			throw new CustomException(new NotFoundException("No Account Found"));
		}

		BankAccountPair bankAccountPair;
		try {
			if ("1".equals(useMinanceFormat)) {
				bankAccountPair = MINANCE_BANK_ACCOUNT;
			} else {
				bankAccountPair = makeBankAccountPair(bankName, account.get().getAccountType());
			}
		} catch (IllegalArgumentException e) {
			throw new CustomException(
					String.format("cannot make BankAccountPair from %s and %s", bankName,
							accountName), e);
		}

		BankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);
		try (InputStream io = Files.newInputStream(file.uploadedFile())) {
			Reader reader = new InputStreamReader(io);
			CsvToBean<BankAccountCsvTemplate> csvReader =
					new CsvToBeanBuilder<BankAccountCsvTemplate>(reader)
							.withType(template.getClass())
							.withSeparator(',')
							.withIgnoreLeadingWhiteSpace(true)
							.withIgnoreEmptyLine(true)
							.build();
			List<? extends BankAccountCsvTemplate> rawTransactions = csvReader.parse();
			List<Transactions> transactions =
					rawTransactions.stream().map(BankAccountCsvTemplate::toTransactions).collect(
							Collectors.toList());

			transactions.forEach(t -> {
						t.setAccountId(account.get().getAccountId());
						t.setAccountName(account.get().getAccountName());
						t.setBankName(banks.getBankName());
						t.setUploadTime(now.format(formatter));
					}
			);
			int numUploaded = transactionService.create(transactions);
			return Response.status(OK).entity(numUploaded + " transactions uploaded").build();
		} catch (IOException e) {
			throw new RuntimeException("Fail to save the csv file!", e);
		}
	}

	@POST
	@Path("/create")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response createTransaction(Transactions transactions) throws SQLException {
		var now = LocalDateTime.now();
		transactions.setUploadTime(now.format(formatter));
		transactionService.create(ImmutableList.of(transactions));
		return Response.status(OK).entity("transaction created").build();
	}

	@PUT
	@Path("/update/account/{account_id}/transaction/{id}")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response updateTransaction(@PathParam("account_id") int accountId,
	                                  @PathParam("id") int transactionId,
	                                  Transactions transactions) throws CustomException, SQLException {
		Optional<Transactions> existingTransaction = transactionService.retrieve(transactionId);
		Optional<Accounts> account = accountService.retrieve(accountId);
		if (existingTransaction.isEmpty() || account.isEmpty()) {
			throw new CustomException(new NotFoundException("transaction or account not found"));
		}
		var now = LocalDateTime.now();
		transactions.setUploadTime(now.format(formatter));
		transactionService.update(transactions);
		return Response.status(Response.Status.OK).entity(transactions).build();
	}

	@GET
	@Path("/retrieve/{bank_name}/{account_name}")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response retrieveTransactionsForAccount(@PathParam("bank_name") String bankName,
	                                               @PathParam("account_name") String accountName,
	                                               @QueryParam("duplicate") String isDuplicate) throws DataAccessException {
		Optional<Accounts> account =
				accountService.findAccountByBankAndAccountName(bankName, accountName);
		if (account.isEmpty()) {
			return Response.status(Response.Status.NOT_FOUND)
					.entity("Account not found for the specified bank and account name.")
					.build();
		}

		// Retrieve transactions based on the 'duplicate' query parameter
		if ("y".equalsIgnoreCase(isDuplicate)) {
			return Response.status(Response.Status.OK)
					.entity(transactionService.retrieveDuplicate(account.get().getAccountId()))
					.build();
		} else {
			return Response.status(Response.Status.OK)
					.entity(transactionService.retrieveByAccount(account.get().getAccountId()))
					.build();
		}
	}

	@GET
	@Path("/retrieve")
	public Response retrieveTransactions() throws DataAccessException {
		return Response.status(Response.Status.OK)
				.entity(transactionService.retrieve())
				.build();
	}

	@GET
	@Path("/retrieve/{start}/{end}")
	public Response retrieveTransactionsBetweenStartAndEnd(@PathParam("start") String start, @PathParam("end") String end) throws DataAccessException {
		LocalDate startDate = LocalDate.parse(start);
		LocalDate endDate = LocalDate.parse(end);
		return Response.status(Response.Status.OK)
				.entity(transactionService.retrieveBetweenStartAndEnd(startDate, endDate))
				.build();
	}

	@DELETE
	@Path("/delete/{id}")
	public Response deleteTransaction(@PathParam("id") int transactionId)
			throws SQLException, CustomException {
		if (transactionService.delete(ImmutableList.of(transactionId)) == 0) {
			throw CustomException.from(new IllegalArgumentException(
					"Didn't find the transaction id: " + transactionId));
		} else {
			return Response.status(OK).build();
		}
	}

	@DELETE
	@Path("/delete")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response deleteTransactions(List<Integer> transactionIds) throws SQLException, CustomException {
		if (transactionIds == null || transactionIds.isEmpty()) {
			throw CustomException.from(new IllegalArgumentException("No transaction IDs provided"));
		}

		int deleteCount = transactionService.delete(transactionIds);

		if (deleteCount == 0) {
			throw CustomException.from(new IllegalArgumentException(
					"None of the provided transaction IDs were found: " + transactionIds));
		}

		return Response.status(Response.Status.OK)
				.entity("Successfully deleted " + deleteCount + " transactions.")
				.build();
	}


	@DELETE
	@Path("/delete/uploadTime/{uploadAt}")
	public Response deleteTransactionUploadedAt(@PathParam("uploadAt") String uploadAt)
			throws SQLException, CustomException {
		if (transactionService.deleteWithUploadTime(uploadAt) == 0) {
			throw CustomException.from(new IllegalArgumentException(
					"Didn't find any records uploaded at: " + uploadAt));
		} else {
			return Response.status(OK).entity("deleted").build();
		}
	}
}
