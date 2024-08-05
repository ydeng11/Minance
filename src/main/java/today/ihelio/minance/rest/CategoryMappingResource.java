package today.ihelio.minance.rest;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
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
	@Path("/create")
	public Response createMinanceCategory(MinanceCategory minanceCategory)
			throws CustomException, DataAccessException {
		if (categoryMappingService.create(minanceCategory) == 0) {
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

	@POST
	@Path("/linkCategory")
	public Response linkMinanceCategory(CategoryMapping categoryMapping)
			throws CustomException, DataAccessException {
		if (categoryMappingService.linkToMinanceCategory(categoryMapping.minanceCategory,
				categoryMapping.listRawCategories) == 0) {
			throw new CustomException(
					new IllegalArgumentException(
							String.format("cannot link %s to %s, minance category might be invalid!",
									categoryMapping.listRawCategories, categoryMapping.minanceCategory)));
		}
		return Response.status(OK)
				.entity(String.format(" %s is linked to %s!", categoryMapping.listRawCategories,
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

	private static class CategoryMapping {
		List<String> listRawCategories;
		String minanceCategory;

		@JsonCreator
		public CategoryMapping(@JsonProperty List<String> listRawCategories,
		                       @JsonProperty String minanceCategory) {
			this.listRawCategories = listRawCategories;
			this.minanceCategory = minanceCategory;
		}
	}
}
