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
	 * Get the save button.
	 */
	public Locator getSaveButton() {
		return page.getByTestId("category-save-button");
	}

	/**
	 * Click the save button.
	 */
	public void clickSave() {
		getSaveButton().click();
	}

	/**
	 * Check if the category board has loaded with unmapped items.
	 */
	public boolean hasUnmappedItems() {
		return getSaveButton().isVisible()
				&& page.getByTestId(java.util.regex.Pattern.compile("raw-category-.*"))
						.first().isVisible();
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
}
