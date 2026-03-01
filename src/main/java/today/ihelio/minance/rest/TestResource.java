package today.ihelio.minance.rest;

import jakarta.inject.Inject;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import today.ihelio.minance.testutil.TestDataResource;

/**
 * REST endpoint for test data operations.
 * Used by integration tests to seed test data.
 */
@Path("/test")
public class TestResource {

	@Inject
	TestDataResource testDataResource;

	@POST
	@Path("/seed")
	@Produces(MediaType.APPLICATION_JSON)
	public Response seedDatabase() {
		testDataResource.seedDatabase();
		return Response.ok().entity("{\"status\":\"seeded\"}").build();
	}

	@POST
	@Path("/reset")
	@Produces(MediaType.APPLICATION_JSON)
	public Response resetDatabase() {
		testDataResource.resetDatabase();
		return Response.ok().entity("{\"status\":\"reset\"}").build();
	}
}
