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
}
