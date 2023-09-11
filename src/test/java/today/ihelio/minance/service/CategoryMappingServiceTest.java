package today.ihelio.minance.service;

import com.google.common.collect.ImmutableList;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.jooq.DSLContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import today.ihelio.jooq.tables.pojos.MinanceCategory;
import today.ihelio.minance.exception.CustomException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static today.ihelio.jooq.tables.MinanceCategory.MINANCE_CATEGORY;
import static today.ihelio.jooq.tables.RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY;

@QuarkusTest
class CategoryMappingServiceTest {
  @Inject CategoryMappingService categoryMappingService;
  @Inject DSLContext dslContext;
  @Inject Flyway flyway;
  MinanceCategory category = new MinanceCategory();

  @BeforeEach
  void setUp() {
    category.setCategory("test");
    flyway.migrate();
  }

  @AfterEach
  void clean() {
    flyway.clean();
  }

  @Test
  public void testLinkToMinanceCategory() throws Exception {
    assertThat(categoryMappingService.create(category)).isEqualTo(1);
    assertThat(categoryMappingService.linkToMinanceCategory("test",
        ImmutableList.of("rawTest"))).isEqualTo(1);
  }

  @Test
  public void testLinkToInvalidMinanceCategory() throws Exception {
    assertThatThrownBy(() -> categoryMappingService.linkToMinanceCategory("test", null))
        .isInstanceOf(CustomException.class).hasCauseInstanceOf(IllegalArgumentException.class);
  }

  @Test
  public void testDeleteMinanceCategory() throws Exception {
    categoryMappingService.create(category);
    categoryMappingService.linkToMinanceCategory("test", ImmutableList.of("rawTest"));
    assertThat(categoryMappingService.getRawCategoriesForMinanceCategory("test").size()).isEqualTo(
        1);
    categoryMappingService.delete(category);
    assertThat(dslContext.select(RAW_CATEGORY_TO_MINANCE_CATEGORY.asterisk())
        .from(RAW_CATEGORY_TO_MINANCE_CATEGORY)
        .fetch()
        .size()).isEqualTo(0);
    assertThat(dslContext.select(MINANCE_CATEGORY.asterisk())
        .from(MINANCE_CATEGORY)
        .fetch()
        .size()).isEqualTo(0);
  }
}
