package today.ihelio.minance.service;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;
import java.util.stream.Collectors;
import org.jooq.DSLContext;
import org.jooq.exception.DataAccessException;
import today.ihelio.jooq.Tables;
import today.ihelio.jooq.tables.pojos.MinanceCategory;
import today.ihelio.jooq.tables.records.RawCategoryToMinanceCategoryRecord;
import today.ihelio.minance.exception.CustomException;

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

  public int create(MinanceCategory minanceCategory) throws DataAccessException {
    return dslContext.insertInto(MINANCE_CATEGORY, MINANCE_CATEGORY.CATEGORY)
        .values(minanceCategory.getCategory())
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

  public int linkToMinanceCategory(String minanceCategory, List<String> listRawCategories) throws
      DataAccessException, CustomException {
    int minanceCategoryId;
    try {
      minanceCategoryId = getMinanceCategoryID(minanceCategory);
    } catch (NullPointerException e) {
      throw CustomException.from(
          new IllegalArgumentException("Not find minance category: " + minanceCategory));
    }
    Preconditions.checkState(listRawCategories.size() > 0,
        CustomException.from(new IllegalArgumentException("No raw categories provided!")));
    return dslContext.insertInto(RAW_CATEGORY_TO_MINANCE_CATEGORY,
            RAW_CATEGORY_TO_MINANCE_CATEGORY.MINANCE_CATEGORY_ID,
            RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY)
        .valuesOfRecords(listRawCategories.stream().map(r -> {
          var record = new RawCategoryToMinanceCategoryRecord();
          record.setMinanceCategoryId(minanceCategoryId);
          record.setRawCategory(r);
          return record.into(RAW_CATEGORY_TO_MINANCE_CATEGORY.MINANCE_CATEGORY_ID,
              RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY);
        }).collect(Collectors.toList()))
        .execute();
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
        .map(t -> new RawCategory(t))
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
        .map(t -> new RawCategory(t))
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
        .fetchOne(MINANCE_CATEGORY.M_CATEGORY_ID);
  }

  public class RawCategory {
    public String name;

    @JsonCreator
    public RawCategory(@JsonProperty String name) {
      this.name = name;
    }
  }
}
