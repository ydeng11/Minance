package today.ihelio.minance.rest;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.graalvm.collections.Pair;
import org.jooq.exception.DataAccessException;
import today.ihelio.jooq.tables.pojos.MinanceCategory;
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.exception.RecordAlreadyExistingException;
import today.ihelio.minance.service.CategoryMappingService;

import java.util.List;

import static jakarta.ws.rs.core.Response.Status.OK;

@Path("/1.0/minance/mapping_category")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class CategoryMappingResource {

	CategoryMappingService categoryMappingService;

	@Inject
	public CategoryMappingResource(CategoryMappingService categoryMappingService) {
		this.categoryMappingService = categoryMappingService;
	}

	@POST
	@Path("/create/{category}")
	public Response createMinanceCategory(@PathParam("category") String minanceCategory)
			throws CustomException, DataAccessException {
		if (categoryMappingService.createNewMinanceCategory(minanceCategory) == 0) {
			throw new CustomException(new RecordAlreadyExistingException("category already created!"));
		}
		return Response.status(OK)
				.entity(" created!")
				.build();
	}

	@DELETE
	@Path("/delete")
	public Response deleteMinanceCategory(MinanceCategory minanceCategory)
			throws CustomException, DataAccessException {
		if (categoryMappingService.delete(minanceCategory) == 0) {
			throw new CustomException(new IllegalArgumentException("category not found!"));
		}
		return Response.status(OK)
				.entity(" deleted!")
				.build();
	}

	@GET
	@Path("/minanceCategory/retrieveAll")
	public Response getMinanceCategory() throws DataAccessException {
		List<MinanceCategory> minanceCategories = categoryMappingService.getAllMinanceCategories();
		return Response.status(OK)
				.entity(minanceCategories)
				.build();
	}

	@GET
	@Path("/retrieve/{minance-category}")
	public Response getLinkedCategoryForMinanceCat(@PathParam("minance-category") String minanceCat) throws DataAccessException {
		List<CategoryMappingService.RawCategory> linkedCategories = categoryMappingService.getRawCategoriesForMinanceCategory(minanceCat);
		return Response.status(OK)
				.entity(linkedCategories)
				.build();
	}

	@POST
	@Path("/linkCategory")
	public Response linkMinanceCategory(CategoryMapping categoryMapping)
			throws CustomException, DataAccessException {
		Pair<Integer, Integer> executionPair = categoryMappingService.linkToMinanceCategory(categoryMapping.minanceCategory,
				categoryMapping.listRawCategories);

		return Response.status(OK)
				.entity(String.format("%d categories added to and %d categories are removed from %s!", executionPair.getLeft(), executionPair.getRight(),
						categoryMapping.minanceCategory))
				.build();
	}

	@GET
	@Path("/unlinkedCategories/retrieveAll")
	public Response getUnlinkedCategories() throws DataAccessException {
		List<CategoryMappingService.RawCategory> unlinkedCategories =
				categoryMappingService.getUnlinkedRawCategories();
		return Response.status(OK)
				.entity(unlinkedCategories)
				.build();
	}

	public static class CategoryMapping {
		public List<String> listRawCategories;
		public String minanceCategory;

		public CategoryMapping() {
		}

		@JsonCreator
		public CategoryMapping(
				@JsonProperty("listRawCategories") List<String> listRawCategories,
				@JsonProperty("minanceCategory") String minanceCategory) {
			this.listRawCategories = listRawCategories;
			this.minanceCategory = minanceCategory;
		}
	}
}
