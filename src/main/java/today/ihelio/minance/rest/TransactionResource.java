package today.ihelio.minance.rest;

import java.io.InputStream;
import java.util.List;
import javax.transaction.Transactional;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.annotations.providers.multipart.MultipartForm;
import today.ihelio.minance.model.FileUploadForm;
import today.ihelio.minance.model.ChaseTransaction;
import today.ihelio.minance.utils.ParseCSV;

@Path("/v1/phinance")
@RegisterRestClient(baseUri = "http://localhost:8080/")
public class TransactionResource {

  @POST
  @Path("/upload")
  @Produces(MediaType.TEXT_PLAIN)
  public String sendFile(@MultipartForm FileUploadForm form) throws Exception {

    InputStream file = form.file;

    List<ChaseTransaction> dataObjects = ParseCSV.parseChase(file);

    for (ChaseTransaction dataObject : dataObjects) {
      create(dataObject);
    }

    return "File uploaded successfully!";
  }

  @Transactional
  public void create(ChaseTransaction entity) {
    String query = "transactionDate = ?1 AND postDate = ?2 AND description = ?3 "
        + "AND amount = ?4 AND bank = ?5";
    //if (ChaseTransaction.find(query,
    //    entity.getTransactionDate(),
    //    entity.getPostDate(),
    //    entity.getDescription(),
    //    entity.getAmount(),
    //    entity.getBank()).firstResult() == null) {
    //  // the entity doesn't exist, save it
    //  entity.persist();
    //}
    entity.persist();
  }

}
