package today.ihelio.minance.service;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.graalvm.collections.Pair;
import org.jooq.DSLContext;
import org.jooq.exception.DataAccessException;
import today.ihelio.jooq.Tables;
import today.ihelio.jooq.tables.pojos.MinanceCategory;
import today.ihelio.jooq.tables.records.RawCategoryToMinanceCategoryRecord;
import today.ihelio.minance.exception.CustomException;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static today.ihelio.jooq.Tables.TRANSACTIONS;
import static today.ihelio.jooq.tables.MinanceCategory.MINANCE_CATEGORY;
import static today.ihelio.jooq.tables.RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY;

@ApplicationScoped
public class CategoryMappingService {
	private final DSLContext dslContext;

	@Inject
	public CategoryMappingService(DSLContext dslContext) {
		this.dslContext = dslContext;
	}

	public int createNewMinanceCategory(String category) throws DataAccessException {
		return dslContext.insertInto(MINANCE_CATEGORY, MINANCE_CATEGORY.CATEGORY)
				.values(category)
				.onDuplicateKeyIgnore()
				.execute();
	}

	public int delete(MinanceCategory minanceCategory) throws DataAccessException {

		dslContext.delete(RAW_CATEGORY_TO_MINANCE_CATEGORY)
				.where(RAW_CATEGORY_TO_MINANCE_CATEGORY.MINANCE_CATEGORY_ID.eq(
						dslContext.select(MINANCE_CATEGORY.M_CATEGORY_ID)
								.from(MINANCE_CATEGORY)
								.where(MINANCE_CATEGORY.CATEGORY.eq(minanceCategory.getCategory())))).execute();

		return dslContext.delete(MINANCE_CATEGORY)
				.where(MINANCE_CATEGORY.CATEGORY.eq(minanceCategory.getCategory()))
				.execute();
	}

	public Pair<Integer, Integer> linkToMinanceCategory(String minanceCategory, List<String> listRawCategories) throws
			DataAccessException, CustomException {
		Preconditions.checkArgument(!listRawCategories.isEmpty(), "No raw categories provided!");

		int minanceCategoryId = getMinanceCategoryID(minanceCategory);
		if (minanceCategoryId == -1) {
			throw CustomException.from(
					new IllegalArgumentException("Not find minance category: " + minanceCategory));
		}

		List<RawCategory> currentCategories = getRawCategoriesForMinanceCategory(minanceCategory);
		List<RawCategory> newRawCategories = listRawCategories.stream().map(RawCategory::new).toList();
		Pair<List<RawCategory>, List<RawCategory>> deltaBetweenRawCategories = getDeltaBetweenRawCategories(currentCategories, newRawCategories);
		int numDeletion = dslContext.delete(RAW_CATEGORY_TO_MINANCE_CATEGORY)
				.where(RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY.in(deltaBetweenRawCategories.getLeft().stream().map(r -> r.name).toList())
						.and(RAW_CATEGORY_TO_MINANCE_CATEGORY.MINANCE_CATEGORY_ID.eq(minanceCategoryId)))
				.execute();

		int numAddition = dslContext.insertInto(RAW_CATEGORY_TO_MINANCE_CATEGORY,
						RAW_CATEGORY_TO_MINANCE_CATEGORY.MINANCE_CATEGORY_ID,
						RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY)
				.valuesOfRecords(deltaBetweenRawCategories.getRight().stream().map(r -> {
					var record = new RawCategoryToMinanceCategoryRecord();
					record.setMinanceCategoryId(minanceCategoryId);
					record.setRawCategory(r.name);
					return record.into(RAW_CATEGORY_TO_MINANCE_CATEGORY.MINANCE_CATEGORY_ID,
							RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY);
				}).collect(Collectors.toList()))
				.execute();

		return Pair.create(numDeletion, numAddition);
	}

	public List<RawCategory> getRawCategoriesForMinanceCategory(String minanceCategory) {
		return dslContext.selectDistinct(RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY)
				.from(RAW_CATEGORY_TO_MINANCE_CATEGORY)
				.where(RAW_CATEGORY_TO_MINANCE_CATEGORY.MINANCE_CATEGORY_ID.eq(
						dslContext.select(MINANCE_CATEGORY.M_CATEGORY_ID)
								.from(MINANCE_CATEGORY)
								.where(MINANCE_CATEGORY.CATEGORY.eq(minanceCategory))))
				.fetch(RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY)
				.stream()
				.map(RawCategory::new)
				.collect(Collectors.toList());
	}

	public List<RawCategory> getUnlinkedRawCategories() {
		return dslContext.selectDistinct(TRANSACTIONS.CATEGORY)
				.from(TRANSACTIONS)
				.where(TRANSACTIONS.CATEGORY.notIn(
						dslContext.select(RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY).from(
								Tables.RAW_CATEGORY_TO_MINANCE_CATEGORY)))
				.fetch(TRANSACTIONS.CATEGORY)
				.stream()
				.map(RawCategory::new)
				.collect(Collectors.toList());
	}

	public List<MinanceCategory> getAllMinanceCategories() {
		return dslContext.selectDistinct(MINANCE_CATEGORY)
				.from(MINANCE_CATEGORY)
				.fetch().into(MinanceCategory.class);
	}

	public int getMinanceCategoryID(String minanceCategory) {
		return dslContext.select(MINANCE_CATEGORY.M_CATEGORY_ID)
				.from(MINANCE_CATEGORY)
				.where(MINANCE_CATEGORY.CATEGORY.eq(minanceCategory))
				.fetchOptional(MINANCE_CATEGORY.M_CATEGORY_ID)
				.orElse(-1);
	}

	private Pair<List<RawCategory>, List<RawCategory>> getDeltaBetweenRawCategories(
			List<RawCategory> currentCategories,
			List<RawCategory> newCategories
	) {
		Set<RawCategory> currentSet = new HashSet<>(currentCategories);
		Set<RawCategory> newSet = new HashSet<>(newCategories);

		List<RawCategory> toAdd = newCategories.stream()
				.filter(rawCategory -> !currentSet.contains(rawCategory))
				.collect(Collectors.toList());

		List<RawCategory> toRemove = currentCategories.stream()
				.filter(rawCategory -> !newSet.contains(rawCategory))
				.collect(Collectors.toList());

		return Pair.create(toRemove, toAdd);
	}


	public static class RawCategory {
		public String name;

		@JsonCreator
		public RawCategory(@JsonProperty String name) {
			this.name = name;
		}

		@Override
		public String toString() {
			return "RawCategory{" +
					"name='" + name + '\'' +
					'}';
		}

		@Override
		public boolean equals(Object o) {
			if (this == o) return true;
			if (o == null || getClass() != o.getClass()) return false;
			RawCategory that = (RawCategory) o;
			return Objects.equals(name, that.name);
		}

		@Override
		public int hashCode() {
			return Objects.hashCode(name);
		}
	}
}
