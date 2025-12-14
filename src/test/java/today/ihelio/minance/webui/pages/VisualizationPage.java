package today.ihelio.minance.webui.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * Page object for the Visualization page.
 */
public class VisualizationPage extends BasePage {

	public VisualizationPage(Page page, String baseUrl) {
		super(page, baseUrl);
	}

	@Override
	public void navigateTo() {
		page.navigate(baseUrl + "/visualization");
		page.waitForLoadState();
		page.waitForLoadState(com.microsoft.playwright.options.LoadState.NETWORKIDLE);
		waitForLoading();

		// Wait for tabs to render
		try {
			page.getByRole(AriaRole.TAB).first().waitFor(
					new Locator.WaitForOptions()
							.setState(WaitForSelectorState.VISIBLE)
							.setTimeout(10000));
		} catch (Exception e) {
			// Continue if tabs don't load
		}
	}

	/**
	 * Get the Expense Analysis tab.
	 */
	public Locator getExpenseAnalysisTab() {
		return page.getByRole(AriaRole.TAB, new Page.GetByRoleOptions().setName("Expense Analysis"));
	}

	/**
	 * Get the Merchant Analytics tab.
	 */
	public Locator getMerchantAnalyticsTab() {
		return page.getByRole(AriaRole.TAB, new Page.GetByRoleOptions().setName("Merchant Analytics"));
	}

	/**
	 * Click the Expense Analysis tab.
	 */
	public void clickExpenseAnalysisTab() {
		getExpenseAnalysisTab().click();
	}

	/**
	 * Click the Merchant Analytics tab.
	 */
	public void clickMerchantAnalyticsTab() {
		getMerchantAnalyticsTab().click();
	}

	/**
	 * Check if a specific chart is visible by test ID.
	 */
	public boolean isChartVisible(String testId) {
		return page.getByTestId(testId).isVisible();
	}

	/**
	 * Switch expense view by clicking a button.
	 */
	public void switchExpenseView(String viewName) {
		Locator button = getButton(viewName);
		button.click();
	}

	/**
	 * Check if expense charts are loaded.
	 */
	public boolean areExpenseChartsLoaded() {
		return isChartVisible("expense-bar-chart")
				&& isChartVisible("total-expense-chart")
				&& isChartVisible("category-pie-chart");
	}

	/**
	 * Get the merchant search input.
	 */
	public Locator getMerchantSearchInput() {
		return page.getByTestId("merchant-search-input");
	}

	/**
	 * Search for a merchant.
	 */
	public void searchMerchant(String merchantName) {
		getMerchantSearchInput().fill(merchantName);
	}

	/**
	 * Select a merchant from the table by name.
	 */
	public void selectMerchant(String merchantName) {
		page.getByRole(AriaRole.ROW, new Page.GetByRoleOptions().setName(merchantName))
				.first().click();
	}

	/**
	 * Check if merchant analytics area is visible.
	 */
	public boolean isMerchantAnalyticsVisible() {
		return page.getByTestId("merchant-analytics-area").isVisible();
	}

	/**
	 * Get the date range picker button.
	 */
	public Locator getDateRangePicker() {
		// The date range picker is typically a button in the header
		return page.locator("button:has-text('to')").first();
	}

	/**
	 * Click to open the date range picker.
	 */
	public void openDateRangePicker() {
		getDateRangePicker().click();
	}

	/**
	 * Check if the Analytics heading is visible.
	 */
	public boolean isAnalyticsHeadingVisible() {
		return getHeading("Analytics").isVisible();
	}

	/**
	 * Get the category filter button (multi-select dropdown).
	 */
	public Locator getCategoryFilterButton() {
		return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Select categories"));
	}

	/**
	 * Open the category filter dropdown.
	 */
	public void openCategoryFilter() {
		getCategoryFilterButton().click();
		page.waitForTimeout(300); // Wait for dropdown to open
	}

	/**
	 * Check if a category is available in the category filter dropdown.
	 * The dropdown must be open before calling this method.
	 */
	public boolean isCategoryInFilter(String categoryName) {
		try {
			// Look for the category in the dropdown using CommandItem role
			return page.getByRole(AriaRole.OPTION)
					.filter(new Locator.FilterOptions().setHasText(categoryName))
					.count() > 0;
		} catch (Exception e) {
			return false;
		}
	}

	/**
	 * Close the category filter dropdown by pressing Escape.
	 */
	public void closeCategoryFilter() {
		page.keyboard().press("Escape");
		page.waitForTimeout(200);
	}
}
