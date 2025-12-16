package today.ihelio.minance.webui.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

/**
 * Page object for the Categories management page.
 */
public class CategoriesPage extends BasePage {

	public CategoriesPage(Page page, String baseUrl) {
		super(page, baseUrl);
	}

	@Override
	public void navigateTo() {
		page.navigate(baseUrl + "/categories");
		page.waitForLoadState();
		waitForLoading();
	}

	/**
	 * Get the category board element.
	 */
	public Locator getCategoryBoard() {
		return page.getByTestId("category-board");
	}

	/**
	 * Check if the category board has loaded with unmapped items.
	 */
	public boolean hasUnmappedItems() {
		return getCategoryBoard().isVisible()
				&& page.getByTestId(java.util.regex.Pattern.compile("raw-category-.*"))
						.first().isVisible();
	}

	/**
	 * Check if auto-save status is visible (for testing auto-save feature).
	 */
	public boolean hasAutoSaveStatus() {
		// Look for Saved/Saving/Error badges
		String pageContent = page.content();
		return pageContent.contains("Saved") ||
		       pageContent.contains("Saving") ||
		       pageContent.contains("Error");
	}

	/**
	 * Get a raw category card by pattern match.
	 */
	public Locator getFirstRawCategory() {
		return page.getByTestId(java.util.regex.Pattern.compile("raw-category-.*")).first();
	}

	/**
	 * Select a Minance category from the dropdown.
	 */
	public void selectMinanceCategory(String categoryName) {
		// Find dropdown and select category
		page.getByText(categoryName).first().click();
	}

	/**
	 * Check if a category is linked (not in unmapped section).
	 */
	public boolean isCategoryLinked(String categoryName) {
		// After linking, the category should not appear in raw categories section
		return !page.getByTestId("raw-category-" + categoryName).isVisible();
	}

	/**
	 * Get a category checkbox by category name slug.
	 */
	public Locator getCategoryCheckbox(String categorySlug) {
		return page.getByTestId("checkbox-category-" + categorySlug);
	}

	/**
	 * Check (select) a category by its slug.
	 */
	public void selectCategory(String categorySlug) {
		Locator checkbox = getCategoryCheckbox(categorySlug);
		if (!checkbox.isChecked()) {
			checkbox.click();
		}
	}

	/**
	 * Select multiple categories by their slugs.
	 */
	public void selectCategories(String... categorySlugs) {
		for (String slug : categorySlugs) {
			selectCategory(slug);
		}
	}

	/**
	 * Get the "Select All" button for unlinked categories.
	 */
	public Locator getSelectAllUnlinkedButton() {
		return page.getByTestId("select-all-unlinked-button");
	}

	/**
	 * Get the "Select All" button for linked categories.
	 */
	public Locator getSelectAllLinkedButton() {
		return page.getByTestId("select-all-linked-button");
	}

	/**
	 * Get the "Batch Link" button.
	 */
	public Locator getBatchLinkButton() {
		return page.getByTestId("batch-link-button");
	}

	/**
	 * Get the "Batch Unlink" button.
	 */
	public Locator getBatchUnlinkButton() {
		return page.getByTestId("batch-unlink-button");
	}

	/**
	 * Get the "Clear Selection" button.
	 */
	public Locator getClearSelectionButton() {
		return page.getByTestId("clear-selection-button");
	}

	/**
	 * Click "Select All" for unlinked categories and verify selection.
	 */
	public void selectAllUnlinked() {
		getSelectAllUnlinkedButton().click();
		page.waitForTimeout(300);
	}

	/**
	 * Click batch link button to link selected categories.
	 */
	public void clickBatchLink() {
		getBatchLinkButton().click();
		page.waitForTimeout(500); // Wait for auto-save
	}

	/**
	 * Click batch unlink button to unlink selected categories.
	 */
	public void clickBatchUnlink() {
		getBatchUnlinkButton().click();
		page.waitForTimeout(500); // Wait for auto-save
	}

	/**
	 * Check if a category is selected (checkbox is checked).
	 */
	public boolean isCategorySelected(String categorySlug) {
		return getCategoryCheckbox(categorySlug).isChecked();
	}

	/**
	 * Get count of selected categories from the UI text.
	 */
	public int getSelectedCount() {
		String pageContent = page.content();
		if (pageContent.contains("selected")) {
			// Try to extract number before "selected"
			java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(\\d+)\\s+selected");
			java.util.regex.Matcher matcher = pattern.matcher(pageContent);
			if (matcher.find()) {
				return Integer.parseInt(matcher.group(1));
			}
		}
		return 0;
	}
}
