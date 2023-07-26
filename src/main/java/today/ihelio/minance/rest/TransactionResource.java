package today.ihelio.minance.rest;

import com.google.common.collect.ImmutableList;
import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;
import com.opencsv.bean.HeaderColumnNameTranslateMappingStrategy;
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
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.annotations.providers.multipart.MultipartForm;
import today.ihelio.csvprocessor.CsvHeaderStrategyFactory;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.jooq.tables.pojos.Banks;
import today.ihelio.jooq.tables.pojos.Transactions;
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.pojos.RawTransactionPojo;
import today.ihelio.minance.pojos.TransactionsUploadForm;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;
import today.ihelio.minance.service.CsvHeaderMappingService;
import today.ihelio.minance.service.TransactionService;

import static jakarta.ws.rs.core.Response.Status.CREATED;
import static jakarta.ws.rs.core.Response.Status.NOT_ACCEPTABLE;

@Path("/1.0/minance/transactions")
@RegisterRestClient(baseUri = "http://localhost:8080/")
@Produces(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class TransactionResource {
  private final TransactionService transactionService;
  private final AccountService accountService;
  private final BankService bankService;
  private final CsvHeaderStrategyFactory csvHeaderStrategyFactory;
  private final CsvHeaderMappingService csvHeaderMappingService;

  @Inject
  public TransactionResource(TransactionService transactionService, AccountService accountService,
      BankService bankService, CsvHeaderStrategyFactory csvHeaderStrategyFactory,
      CsvHeaderMappingService csvHeaderMappingService) {
    this.transactionService = transactionService;
    this.accountService = accountService;
    this.bankService = bankService;
    this.csvHeaderStrategyFactory = csvHeaderStrategyFactory;
    this.csvHeaderMappingService = csvHeaderMappingService;
  }

  @POST
  @Path("/batch_upload")
  @Consumes(MediaType.MULTIPART_FORM_DATA)
  public Response uploadTransactions(@MultipartForm TransactionsUploadForm form) throws Exception {

    InputStream file = form.file;
    String bankName = form.bankName;
    String accountName = form.accountName;

    Banks banks = bankService.findBankByName(bankName);
    if (banks == null) {
      return Response.status(Response.Status.BAD_REQUEST).entity("No Bank Found").build();
    }

    Accounts account = accountService.findAccountByBankAndAccountName(bankName, accountName);
    if (account == null) {
      return Response.status(Response.Status.BAD_REQUEST).entity("No Account Found").build();
    }

    HeaderColumnNameTranslateMappingStrategy<RawTransactionPojo> headerMappingStrategy =
        csvHeaderStrategyFactory.getStrategy(account.getAccountId(), RawTransactionPojo.class);

    CsvToBean<RawTransactionPojo> csvReader =
        createCsvReader(new InputStreamReader(file), RawTransactionPojo.class,
            headerMappingStrategy);

    List<RawTransactionPojo> rawTransactions = csvReader.parse();

    List<Transactions> transactionList = new ArrayList<>();
    DateTimeFormatter formatter =
        csvHeaderMappingService.retrieveDateFormat(account.getAccountId());

    rawTransactions.forEach(t -> {
          Transactions tempTransactions = new Transactions();
          tempTransactions.setAccountId(account.getAccountId());
          tempTransactions.setAccountName(account.getAccountName());
          tempTransactions.setBankName(banks.getBankName());
          tempTransactions.setDescription(t.getDescription());
          tempTransactions.setCategory(t.getCategory());
          tempTransactions.setTransactionType(t.getTransactionType());
          tempTransactions.setAmount(t.getAmount().longValue());
          tempTransactions.setMemo(t.getMemo());
          tempTransactions.setTransactionDate(LocalDate.parse(t.getTransactionDate(), formatter));
          tempTransactions.setPostDate(LocalDate.parse(t.getPostDate(), formatter));
          transactionList.add(tempTransactions);
        }
    );

    int numUploaded = transactionService.create(transactionList);
    return Response.ok().entity(numUploaded + " transactions uploaded").build();
  }

  @POST
  @Path("/create")
  @Consumes(MediaType.APPLICATION_JSON)
  public Response createTransaction(Transactions transactions) {
    if (transactionService.create(ImmutableList.of(transactions)) == 1) {
      return Response.status(CREATED).entity(transactions).build();
    }
    return Response.status(NOT_ACCEPTABLE).entity(transactions).build();
  }

  @PUT
  @Path("/update/account/{account_id}/transaction/{id}")
  @Consumes(MediaType.APPLICATION_JSON)
  public Response updateTransaction(@PathParam("account_id") int accountId,
      @PathParam("id") int transactionId,
      @RequestBody Transactions transactions) throws CustomException {
    Transactions existingTransaction = transactionService.retrieve(transactionId);
    Accounts account = accountService.retrieve(accountId);
    if (existingTransaction == null || account == null) {
      return Response.status(Response.Status.NOT_FOUND).build();
    }
    transactionService.update(transactions);
    return Response.status(Response.Status.OK).entity(transactions).build();
  }

  @GET
  @Path("/retrieve/{bank_name}/{account_name}/{duplicate}")
  @Consumes(MediaType.APPLICATION_JSON)
  public Response retrieveByBankAndAccount(@PathParam("bank_name") String bankName,
      @PathParam("account_name") String accountName, @PathParam("duplicate") String isDuplicate) {
    Accounts account = accountService.findAccountByBankAndAccountName(bankName, accountName);
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
  public Response deleteTransaction(@PathParam("id") int transactionId) {
    if (transactionService.delete(ImmutableList.of(transactionId)) == 0) {
      return Response.status(Response.Status.NO_CONTENT).build();
    } else {
      return Response.status(Response.Status.OK).build();
    }
  }

  private <T> CsvToBean<T> createCsvReader(Reader reader, Class<T> clazz,
      HeaderColumnNameTranslateMappingStrategy strategy) {
    return new CsvToBeanBuilder(reader)
        .withType(clazz)
        .withSeparator(',')
        .withIgnoreLeadingWhiteSpace(true)
        .withIgnoreEmptyLine(true)
        .withMappingStrategy(strategy)
        .build();
  }
}
