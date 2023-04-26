package today.ihelio.minance.rest;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.MappingIterator;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.cfg.MapperConfig;
import com.fasterxml.jackson.databind.introspect.AnnotatedField;
import com.fasterxml.jackson.databind.introspect.AnnotatedMethod;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvParser;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import com.google.common.annotations.VisibleForTesting;
import java.io.ByteArrayInputStream;
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
import org.apache.commons.io.IOUtils;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.annotations.providers.multipart.MultipartForm;
import today.ihelio.minance.model.Account;
import today.ihelio.minance.model.Bank;
import today.ihelio.minance.model.Transaction;
import today.ihelio.minance.model.TransactionCsvSchema;
import today.ihelio.minance.model.TransactionsUploadForm;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;
import today.ihelio.minance.service.CsvSchemaService;
import today.ihelio.minance.service.TransactionService;

import static javax.ws.rs.core.Response.Status.CREATED;
import static javax.ws.rs.core.Response.Status.NOT_ACCEPTABLE;

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
    byte[] content = IOUtils.toByteArray(file);
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

    TransactionCsvSchema transactionCsvSchema = csvSchemaService.findSchemaByAccount(account);
    if (transactionCsvSchema == null) {
      return Response.status(Response.Status.BAD_REQUEST).entity("No Csv Format Found").build();
    }

    Map<String, String> columnMapper =
        csvSchemaService.findSchemaColumnMapping(transactionCsvSchema);

    List<String> columnNames = getColumnNamesFromCsv(new ByteArrayInputStream(content));
    CsvSchema csvSchema =
        csvSchemaService.buildCsvSchema(transactionCsvSchema, columnNames, columnMapper);

    List<Transaction> transactions =
        parseTransactions(new ByteArrayInputStream(content), csvSchema, columnMapper);
    List<Boolean> results = transactions.stream().map((entity) -> {
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
    if (transactionService.createSingleTransaction(transaction)) {
      return Response.status(CREATED).entity(transaction).build();
    }
    return Response.status(NOT_ACCEPTABLE).entity(transaction).build();
  }

  @PUT
  @Path("/update/account/{account_id}/transaction/{id}")
  @Consumes(MediaType.APPLICATION_JSON)
  @Produces(MediaType.APPLICATION_JSON)
  public Response updateTransaction(@PathParam("account_id") long accountId,
      @PathParam("id") long id,
      @RequestBody Transaction transaction) {
    Transaction existingTransaction = transactionService.findTransactionById(id);
    Account account = accountService.findAccountById(accountId);
    if (existingTransaction == null || account == null) {
      return Response.status(Response.Status.NOT_FOUND).build();
    }
    transactionService.updateTransaction(transaction);
    return Response.status(Response.Status.OK).entity(transaction).build();
  }

  @DELETE
  @Path("/delete/{id}")
  @Produces(MediaType.APPLICATION_JSON)
  public Response deleteTransaction(@PathParam("id") long id) {
    Transaction existingTransaction = transactionService.findTransactionById(id);
    if (existingTransaction == null) {
      return Response.status(Response.Status.NOT_FOUND).build();
    }
    transactionService.deleteTransaction(existingTransaction);
    return Response.status(Response.Status.NO_CONTENT).build();
  }

  @VisibleForTesting
  List<Transaction> parseTransactions(InputStream inputStream,
      CsvSchema csvSchema, Map<String, String> columnMapper)
      throws IOException {
    CsvMapper csvMapper = new CsvMapper();
    csvMapper.setPropertyNamingStrategy(new LocalizedPropertyNamingStrategy(columnMapper));
    csvMapper.enable(CsvParser.Feature.IGNORE_TRAILING_UNMAPPABLE);
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

  public static class LocalizedPropertyNamingStrategy extends PropertyNamingStrategy {

    private final Map<String, String> columnMapper;

    LocalizedPropertyNamingStrategy(Map<String, String> columnMapper) {
      this.columnMapper = columnMapper;
    }

    @Override
    public String nameForField(MapperConfig<?> config, AnnotatedField field, String defaultName) {
      return localize(defaultName);
    }

    @Override
    public String nameForSetterMethod(MapperConfig<?> config, AnnotatedMethod method,
        String defaultName) {
      return localize(defaultName);
    }

    @Override
    public String nameForGetterMethod(MapperConfig<?> config, AnnotatedMethod method,
        String defaultName) {
      return localize(defaultName);
    }

    private String localize(String defaultName) {
      return columnMapper.get(defaultName);
    }
  }
}
