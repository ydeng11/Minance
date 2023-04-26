package today.ihelio.minance.rest;

import io.smallrye.common.constraint.Nullable;
import java.util.Arrays;
import java.util.HashMap;
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

  public static List<String> deserializeColumns(String columns) {
    return Arrays.stream(columns.split(",")).map(x -> x.trim()).collect(Collectors.toList());
  }

  private Map<String, String> convertToMap(List<String> keys, List<String> values) {
    Map<String, String> columnMapping = new HashMap<>();
    if (keys.size() != values.size()) {
      Response.status(Response.Status.BAD_REQUEST)
          .entity("The size of column names must be equal to the size of mapped names")
          .build();
    }

    for (int i = 0; i < keys.size(); i++) {
      columnMapping.put(keys.get(i), values.get(i));
    }
    return columnMapping;
  }

  @POST
  @Path("/create")
  @Produces(MediaType.APPLICATION_JSON)
  @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
  public Response createSchema(
      @FormParam("bankName") String bankName,
      @FormParam("accountName") String accountName,
      @Nullable @FormParam("useHeader") boolean useHeader,
      @Nullable @FormParam("columnSeparator") char columnSeparator,
      @Nullable @FormParam("skipFirstDataRow") boolean skipFirstDataRow,
      @FormParam("columnNames") String columnNames,
      @FormParam("mappedNames") String mappedNames) {

    Bank bank = bankService.findBankByName(bankName);
    if (bank == null) {
      return Response.status(404).entity("Bank not found").build();
    }
    Account account = accountService.findAccountByBankAndName(bank.id, accountName);
    if (account == null) {
      return Response.status(404).entity("Account not found").build();
    }

    Map<String, String> columnMapping =
        convertToMap(deserializeColumns(columnNames), deserializeColumns(mappedNames));

    TransactionCsvSchema transactionCsvSchema = new TransactionCsvSchema.Builder()
        .withAccount(account)
        .useHeader(useHeader)
        .skipFirstDataRow(skipFirstDataRow)
        .columnSeparator(columnSeparator)
        .build();
    account.setTransactionCsvSchema(transactionCsvSchema);
    csvSchemaService.createSchema(transactionCsvSchema);
    csvSchemaService.saveSchemaColumnMapping(transactionCsvSchema, columnMapping);

    return Response.status(Response.Status.CREATED)
        .entity(transactionCsvSchema)
        .build();
  }

  @PUT
  @Path("/update/{id}")
  @Produces(MediaType.APPLICATION_JSON)
  @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
  public Response updateSchema(@PathParam("id") Long id,
      @Nullable @FormParam("useHeader") boolean useHeader,
      @Nullable @FormParam("columnSeparator") char columnSeparator,
      @Nullable @FormParam("skipFirstDataRow") boolean skipFirstDataRow,
      @FormParam("columnNames") String columnNames,
      @FormParam("mappedNames") String mappedNames) {

    TransactionCsvSchema schema = csvSchemaService.findSchemaById(id);
    if (schema == null) {
      return Response.status(Response.Status.NOT_FOUND)
          .entity("Transaction schema not found")
          .build();
    }

    Map<String, String> columnMapping =
        convertToMap(deserializeColumns(columnNames), deserializeColumns(mappedNames));

    csvSchemaService.deleteSchemaColumnMapping(schema);

    schema.setUseHeader(useHeader);
    schema.setSkipFirstDataRow(skipFirstDataRow);
    schema.setColumnSeparator(columnSeparator);

    csvSchemaService.updateSchema(schema);

    csvSchemaService.saveSchemaColumnMapping(schema, columnMapping);

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
