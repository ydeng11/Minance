package today.ihelio.minance.rest;

import com.google.common.collect.ImmutableList;
import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.annotations.providers.multipart.MultipartForm;
import org.jooq.exception.DataAccessException;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.jooq.tables.pojos.Banks;
import today.ihelio.jooq.tables.pojos.Transactions;
import today.ihelio.minance.csvpojos.BankAccountCsvFactory;
import today.ihelio.minance.csvpojos.BankAccountCsvTemplate;
import today.ihelio.minance.csvpojos.BankAccountPair;
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.pojos.TransactionsUploadForm;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;
import today.ihelio.minance.service.TransactionService;

import static jakarta.ws.rs.core.Response.Status.OK;
import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.MINANCE;
import static today.ihelio.minance.util.TransactionUtil.makeBankAccountPair;

@Path("/1.0/minance/transactions")
@RegisterRestClient
@Produces(MediaType.APPLICATION_JSON)
@ApplicationScoped
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
  @Consumes(MediaType.MULTIPART_FORM_DATA)
  public Response uploadTransactions(@MultipartForm TransactionsUploadForm form)
      throws SQLException, CustomException {

    InputStream file = form.file;
    String bankName = form.bankName;
    String accountName = form.accountName;
    String accountType = form.accountType;
    String useMinanceFormat = form.useMinanceFormat;
    var now = LocalDateTime.now();

    Banks banks = bankService.findBankByName(BankAccountPair.BankName.valueOf(bankName));
    if (banks == null) {
      throw new CustomException(new NotFoundException("No Bank Found"));
    }

    Accounts account =
        accountService.findAccountByBankTypeAccountName(bankName, accountType, accountName);
    if (account == null) {
      throw new CustomException(new NotFoundException("No Account Found"));
    }

    BankAccountPair bankAccountPair;
    try {
      if ("1".equals(useMinanceFormat)) {
        bankAccountPair = MINANCE_BANK_ACCOUNT;
      } else {
        bankAccountPair = makeBankAccountPair(bankName, account.getAccountType());
      }
    } catch (IllegalArgumentException e) {
      throw new CustomException(
          String.format("cannot make BankAccountPair from %s and %s", bankName,
              accountName), e);
    }

    BankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);

    Reader reader = new InputStreamReader(file);

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
          t.setAccountId(account.getAccountId());
          t.setAccountName(account.getAccountName());
          t.setBankName(banks.getBankName());
          t.setUploadTime(now.format(formatter));
        }
    );

    int numUploaded = transactionService.create(transactions);
    return Response.status(OK).entity(numUploaded + " transactions uploaded").build();
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
      @RequestBody Transactions transactions) throws CustomException, SQLException {
    Transactions existingTransaction = transactionService.retrieve(transactionId);
    Accounts account = accountService.retrieve(accountId);
    if (existingTransaction == null || account == null) {
      throw new CustomException(new NotFoundException("transaction or account not found"));
    }
    var now = LocalDateTime.now();
    transactions.setUploadTime(now.format(formatter));
    transactionService.update(transactions);
    return Response.status(Response.Status.OK).entity(transactions).build();
  }

  @GET
  @Path("/retrieve/{bank_name}/{account_name}/{account_type}/{duplicate}")
  @Consumes(MediaType.APPLICATION_JSON)
  public Response retrieveTransactionsForAccount(@PathParam("bank_name") String bankName,
      @PathParam("account_name") String accountName, @PathParam("account_type") String accountType,
      @PathParam("duplicate") String isDuplicate) throws DataAccessException {
    Accounts account =
        accountService.findAccountByBankTypeAccountName(bankName, accountType, accountName);
    if (account == null) {
      return Response.status(Response.Status.NOT_FOUND).build();
    }
    if (isDuplicate == "y") {
      return Response.status(Response.Status.OK)
          .entity(transactionService.retrieveDuplicate(account.getAccountId()))
          .build();
    } else {
      return Response.status(Response.Status.OK)
          .entity(transactionService.retrieveByAccount(account.getAccountId()))
          .build();
    }
  }

  @DELETE
  @Path("/delete/{id}")
  public Response deleteTransaction(@PathParam("id") int transactionId) throws SQLException {
    if (transactionService.delete(ImmutableList.of(transactionId)) == 0) {
      return Response.status(Response.Status.NO_CONTENT).build();
    } else {
      return Response.status(Response.Status.OK).build();
    }
  }
}
