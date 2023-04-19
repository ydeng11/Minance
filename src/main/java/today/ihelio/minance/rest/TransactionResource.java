package today.ihelio.minance.rest;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.MappingIterator;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.annotations.providers.multipart.MultipartForm;
import today.ihelio.minance.model.Account;
import today.ihelio.minance.model.Bank;
import today.ihelio.minance.model.Transaction;
import today.ihelio.minance.model.TransactionsUploadForm;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;
import today.ihelio.minance.service.CsvSchemaService;
import today.ihelio.minance.service.TransactionService;

import static javax.ws.rs.core.Response.Status.CREATED;

@Path("/1.0/minance/transaction")
@RegisterRestClient(baseUri = "http://localhost:8080/")
public class TransactionResource {
  @Inject
  private TransactionService transactionService;
  @Inject
  private AccountService accountService;
  @Inject
  private BankService bankService;
  @Inject
  private CsvSchemaService csvSchemaService;

  private static batchUploadResponse createBatchUploadResponse(List<Boolean> results) {
    int uploaded = results.size();
    int created = (int) results.stream().filter(r -> r).count();
    int duplicated = (int) results.stream().filter(r -> !r).count();
    return new batchUploadResponse(uploaded, created, duplicated);
  }

  private static List<String> getColumnNamesFromCsv(InputStream inputStream) throws IOException {
    CsvMapper csvMapper = new CsvMapper();
    CsvSchema csvSchema = CsvSchema.emptySchema().withHeader();
    MappingIterator<Map<String, String>> mappingIterator =
        csvMapper.readerFor(Map.class).with(csvSchema).readValues(inputStream);

    if (mappingIterator.hasNext()) {
      Map<String, String> firstRow = mappingIterator.next();
      return new ArrayList<>(firstRow.keySet());
    } else {
      return Collections.emptyList();
    }
  }

  @POST
  @Path("/batch_upload")
  @Produces(MediaType.APPLICATION_JSON)
  @Consumes(MediaType.MULTIPART_FORM_DATA)
  public Response uploadTransactions(@MultipartForm TransactionsUploadForm form) throws Exception {

    InputStream file = form.file;
    String bankName = form.bank;
    String accountName = form.account;

    Bank bank = bankService.findBankByName(bankName);
    if (bank == null) {
      return Response.status(Response.Status.BAD_REQUEST).entity("No Bank Found").build();
    }
    Account account = accountService.findAccountByBankAndName(bank.id, accountName);
    if (account == null) {
      return Response.status(Response.Status.BAD_REQUEST).entity("No Account Found").build();
    }
    CsvSchema csvSchema;
    try {
      csvSchema = csvSchemaService.getSchema(account);
    } catch (Exception e) {
      return Response.status(Response.Status.BAD_REQUEST)
          .entity(e.getMessage()).build();
    }

    List<Transaction> transactions = parseTransactions(file, csvSchema);
    List<Boolean> results = new ArrayList<>();
    results = transactions.stream().map((entity) -> {
      entity.setAccount(account);
      return transactionService.createSingleTransaction(entity);
    }).collect(Collectors.toList());

    return Response.ok(createBatchUploadResponse(results)).build();
  }

  @POST
  @Path("/create")
  @Consumes(MediaType.APPLICATION_JSON)
  @Produces(MediaType.APPLICATION_JSON)
  public Response createTransaction(Transaction transaction) {
    transactionService.createSingleTransaction(transaction);
    return Response.status(CREATED).entity(transaction).build();
  }

  @PUT
  @Path("/update/{id}")
  @Consumes(MediaType.APPLICATION_JSON)
  @Produces(MediaType.APPLICATION_JSON)
  public Response updateTransaction(@PathParam("id") long id, Transaction transaction) {
    Transaction existingTransaction = transactionService.findTransactionById(id);
    if (existingTransaction == null) {
      return Response.status(Response.Status.NOT_FOUND).build();
    }
    transactionService.updateTransaction(transaction);
    return Response.status(Response.Status.OK).entity(existingTransaction).build();
  }

  @DELETE
  @Path("/delete/{id}")
  public Response deleteTransaction(@PathParam("id") long id) {
    Transaction existingTransaction = transactionService.findTransactionById(id);
    if (existingTransaction == null) {
      return Response.status(Response.Status.NOT_FOUND).build();
    }
    transactionService.deleteTransaction(existingTransaction);
    return Response.status(Response.Status.NO_CONTENT).build();
  }

  private List<Transaction> parseTransactions(InputStream inputStream,
      CsvSchema csvSchema)
      throws IOException {
    CsvMapper csvMapper = new CsvMapper();
    MappingIterator<Transaction> mappingIterator = csvMapper
        .readerWithSchemaFor(Transaction.class).with(csvSchema).readValues(inputStream);
    return mappingIterator.readAll();
  }

  public static class batchUploadResponse {
    @JsonProperty("uploaded")
    public final int uploaded;
    @JsonProperty("created")
    public final int created;
    @JsonProperty("duplicated")
    public final int duplicated;

    private batchUploadResponse(int uploaded, int created, int duplicated) {
      this.uploaded = uploaded;
      this.created = created;
      this.duplicated = duplicated;
    }
  }
}
