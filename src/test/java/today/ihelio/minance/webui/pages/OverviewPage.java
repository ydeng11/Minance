package today.ihelio.minance.webui.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

/**
 * Page object for the Overview page.
 */
public class OverviewPage extends BasePage {

	public OverviewPage(Page page, String baseUrl) {
		super(page, baseUrl);
	}

	@Override
	public void navigateTo() {
		page.navigate(baseUrl + "/");
		page.waitForLoadState();
		waitForLoading();
	}

	/**
	 * Get the Total Expenses card locator.
	 */
	public Locator getTotalExpensesCard() {
		return page.getByText("Total Expenses").first();
	}

	/**
	 * Get the Credit card locator.
	 */
	public Locator getCreditCard() {
		return page.getByText("Credit").first();
	}

	/**
	 * Get the Debit card locator.
	 */
	public Locator getDebitCard() {
		return page.getByText("Debit").first();
	}

	/**
	 * Get the Transactions card locator.
	 */
	public Locator getTransactionsCard() {
		return page.getByText("Transactions").first();
	}

	/**
	 * Check if all metric cards are visible.
	 */
	public boolean areAllCardsVisible() {
		return getTotalExpensesCard().isVisible()
				&& getCreditCard().isVisible()
				&& getDebitCard().isVisible()
				&& getTransactionsCard().isVisible();
	}

	/**
	 * Get table header locator by name.
	 */
	public Locator getTableHeader(String headerName) {
		return page.getByText(headerName).first();
	}

	/**
	 * Check if the expense table is visible with data.
	 */
	public boolean isExpenseTableVisible() {
		return getTableHeader("Transaction Date").isVisible()
				&& getTableHeader("Amount").isVisible();
	}

	/**
	 * Check if a specific category is visible in the table.
	 */
	public boolean isCategoryVisible(String categoryName) {
		return page.getByText(categoryName).first().isVisible();
	}

	/**
	 * Get a card's parent container by its title text.
	 */
	public Locator getCardByTitle(String title) {
		return page.getByText(title).first().locator("..");
	}
}
