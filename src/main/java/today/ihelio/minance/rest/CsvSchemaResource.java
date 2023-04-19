package today.ihelio.minance.rest;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
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
import org.jboss.resteasy.annotations.jaxrs.FormParam;
import today.ihelio.minance.model.Account;
import today.ihelio.minance.model.Bank;
import today.ihelio.minance.model.TransactionCsvSchema;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;
import today.ihelio.minance.service.CsvSchemaService;

@Path("/1.0/minance/csvschema")
@RegisterRestClient(baseUri = "http://localhost:8080/")
public class CsvSchemaResource {
  @Inject CsvSchemaService csvSchemaService;
  @Inject AccountService accountService;
  @Inject BankService bankService;

  public static String serializeColumns(List<String> columns) {
    return String.join(",", columns);
  }

  public static List<String> deserializeColumns(String columns) {
    return Arrays.asList(columns.split(","));
  }

  @POST
  @Path("/create")
  @Produces(MediaType.APPLICATION_JSON)
  @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
  public Response createSchema(
      @FormParam("bankName") String bankName,
      @FormParam("accountName") String accountName,
      @FormParam("useHeader") boolean useHeader,
      @FormParam("columnSeparator") String columnSeparator,
      @FormParam("skipFirstDataRow") boolean skipFirstDataRow,
      @FormParam("columnMapping") Map<String, String> columnMapping) {

    Bank bank = bankService.findBankByName(bankName);
    if (bank == null) {
      return Response.status(404).entity("Bank not found").build();
    }
    Account account = accountService.findAccountByBankAndName(bank.id, accountName);
    if (account == null) {
      return Response.status(404).entity("Account not found").build();
    }

    ObjectMapper mapper = new ObjectMapper();
    String jsonString;

    try {
      jsonString = mapper.writeValueAsString(columnMapping);
    } catch (JsonProcessingException e) {
      return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
          .entity(e.getMessage())
          .build();
    }

    TransactionCsvSchema transactionCsvSchema = new TransactionCsvSchema.Builder()
        .withAccount(account)
        .useHeader(useHeader)
        .skipFirstDataRow(skipFirstDataRow)
        .columnSeparator(columnSeparator)
        .columnMapping(jsonString)
        .build();

    account.setTransactionCsvSchema(transactionCsvSchema);

    if (csvSchemaService.createSchema(transactionCsvSchema)) {
      return Response.status(Response.Status.CREATED)
          .entity(transactionCsvSchema)
          .build();
    }
    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
        .build();
  }

  @PUT
  @Path("/update/{id}")
  @Produces(MediaType.APPLICATION_JSON)
  @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
  public Response updateSchema(@PathParam("id") Long id,
      @FormParam("accountId") Long accountId,
      @FormParam("useHeader") boolean useHeader,
      @FormParam("columnSeparator") String columnSeparator,
      @FormParam("skipFirstDataRow") boolean skipFirstDataRow,
      @FormParam("columnNames") List<String> columnNames,
      @FormParam("mappedColumns") List<String> mappedColumns) {

    TransactionCsvSchema schema = csvSchemaService.findSchemaById(id);
    if (schema == null) {
      return Response.status(Response.Status.NOT_FOUND)
          .entity("Transaction schema not found")
          .build();
    }

    Account account = accountService.findAccountById(accountId);
    if (account == null) {
      return Response.status(Response.Status.NOT_FOUND).entity("Account not found").build();
    }

    schema.setUseHeader(useHeader);
    schema.setSkipFirstDataRow(skipFirstDataRow);
    schema.setColumnSeparator(columnSeparator);
    schema.set(mappedColumns);

    csvSchemaService.updateSchema(schema);

    return Response.status(Response.Status.OK).entity(schema).build();
  }

  @DELETE
  @Path("/delete/{id}")
  @Produces(MediaType.APPLICATION_JSON)
  public Response deleteSchema(@PathParam("id") Long id) {
    TransactionCsvSchema schema = csvSchemaService.findSchemaById(id);
    if (schema == null) {
      return Response.status(Response.Status.NOT_FOUND)
          .entity("Transaction schema not found")
          .build();
    }

    csvSchemaService.deleteSchema(id);

    return Response.status(Response.Status.OK)
        .entity("Transaction schema deleted successfully")
        .build();
  }
}
