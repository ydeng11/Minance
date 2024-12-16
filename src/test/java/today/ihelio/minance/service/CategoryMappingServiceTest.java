package today.ihelio.minance.service;

import com.google.common.collect.ImmutableList;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.graalvm.collections.Pair;
import org.jooq.DSLContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import today.ihelio.jooq.tables.pojos.MinanceCategory;
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.service.CategoryMappingService.RawCategory;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static today.ihelio.jooq.Tables.TRANSACTIONS;
import static today.ihelio.jooq.tables.MinanceCategory.MINANCE_CATEGORY;
import static today.ihelio.jooq.tables.RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY;

@QuarkusTest
class CategoryMappingServiceTest {
	@Inject
	CategoryMappingService categoryMappingService;
	@Inject
	DSLContext dslContext;
	@Inject
	Flyway flyway;
	MinanceCategory category;

	@BeforeEach
	void setUp() {
		category = new MinanceCategory();
		category.setCategory("test");
		flyway.migrate();
	}

	@AfterEach
	void clean() {
		flyway.clean();
	}

	@Test
	void testCreateNewMinanceCategory() {
		// Test creation
		assertThat(categoryMappingService.createNewMinanceCategory(category.getCategory())).isEqualTo(1);

		// Test duplicate creation (should be ignored)
		assertThat(categoryMappingService.createNewMinanceCategory(category.getCategory())).isEqualTo(0);

		// Verify in database
		assertThat(dslContext.fetchCount(MINANCE_CATEGORY)).isEqualTo(1);
	}

	@Test
	void testDelete() {
		// Setup
		categoryMappingService.createNewMinanceCategory(category.getCategory());
		int categoryId = categoryMappingService.getMinanceCategoryID(category.getCategory());

		// Create a raw category mapping
		dslContext.insertInto(RAW_CATEGORY_TO_MINANCE_CATEGORY)
				.set(RAW_CATEGORY_TO_MINANCE_CATEGORY.MINANCE_CATEGORY_ID, categoryId)
				.set(RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY, "rawTest")
				.execute();

		// Test deletion
		assertThat(categoryMappingService.delete(category)).isEqualTo(1);

		// Verify both category and mappings are deleted
		assertThat(dslContext.fetchCount(MINANCE_CATEGORY)).isEqualTo(0);
		assertThat(dslContext.fetchCount(RAW_CATEGORY_TO_MINANCE_CATEGORY)).isEqualTo(0);
	}

	@Test
	void testLinkToMinanceCategory() throws Exception {
		// Setup
		categoryMappingService.createNewMinanceCategory(category.getCategory());

		// Test linking
		Pair<Integer, Integer> result = categoryMappingService.linkToMinanceCategory(
				category.getCategory(),
				ImmutableList.of("rawTest1", "rawTest2")
		);

		// Verify results (0 deletions, 2 additions)
		assertThat(result.getLeft()).isEqualTo(0);
		assertThat(result.getRight()).isEqualTo(2);

		// Test updating links
		result = categoryMappingService.linkToMinanceCategory(
				category.getCategory(),
				ImmutableList.of("rawTest2", "rawTest3")
		);

		// Verify results (1 deletion, 1 addition)
		assertThat(result.getLeft()).isEqualTo(1);
		assertThat(result.getRight()).isEqualTo(1);
	}

	@Test
	void testLinkToInvalidMinanceCategory() {
		assertThatThrownBy(() -> categoryMappingService.linkToMinanceCategory("nonexistent", ImmutableList.of("test")))
				.isInstanceOf(CustomException.class)
				.hasMessageContaining("Not find minance category: nonexistent");
	}

	@Test
	void testLinkToMinanceCategoryWithEmptyList() {
		assertThatThrownBy(() -> categoryMappingService.linkToMinanceCategory("test", ImmutableList.of()))
				.isInstanceOf(IllegalArgumentException.class).hasMessage("No raw categories provided!");
	}

	@Test
	void testGetRawCategoriesForMinanceCategory() throws Exception {
		// Setup
		categoryMappingService.createNewMinanceCategory(category.getCategory());
		categoryMappingService.linkToMinanceCategory(category.getCategory(), ImmutableList.of("rawTest1", "rawTest2"));

		// Test retrieval
		List<RawCategory> rawCategories = categoryMappingService.getRawCategoriesForMinanceCategory(category.getCategory());

		assertThat(rawCategories).hasSize(2)
				.extracting(rc -> rc.name)
				.containsExactlyInAnyOrder("rawTest1", "rawTest2");
	}

	@Test
	void testGetUnlinkedRawCategories() {
		// Setup: Insert some transactions with categories
		dslContext.insertInto(TRANSACTIONS, TRANSACTIONS.CATEGORY)
				.values("unlinkedCategory1")
				.values("unlinkedCategory2")
				.execute();

		// Test retrieval
		List<RawCategory> unlinkedCategories = categoryMappingService.getUnlinkedRawCategories();

		assertThat(unlinkedCategories).hasSize(2)
				.extracting(rc -> rc.name)
				.containsExactlyInAnyOrder("unlinkedCategory1", "unlinkedCategory2");
	}

	@Test
	void testGetAllMinanceCategories() {
		// Setup
		categoryMappingService.createNewMinanceCategory("category1");

		// Test retrieval
		List<MinanceCategory> categories = categoryMappingService.getAllMinanceCategories();

		assertThat(categories).hasSize(1)
				.extracting(MinanceCategory::getCategory)
				.containsExactly("category1");
	}

	@Test
	void testGetMinanceCategoryID() {
		// Setup
		categoryMappingService.createNewMinanceCategory(category.getCategory());

		// Test existing category
		assertThat(categoryMappingService.getMinanceCategoryID(category.getCategory())).isPositive();

		// Test non-existing category
		assertThat(categoryMappingService.getMinanceCategoryID("nonexistent")).isEqualTo(-1);
	}
}
