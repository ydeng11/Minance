package today.ihelio.minance.webui.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

/**
 * Page object for the Accounts management page.
 */
public class AccountsPage extends BasePage {

	public AccountsPage(Page page, String baseUrl) {
		super(page, baseUrl);
	}

	@Override
	public void navigateTo() {
		page.navigate(baseUrl + "/accounts");
		page.waitForLoadState();
		waitForLoading();
	}

	/**
	 * Check if an account is visible by name.
	 */
	public boolean isAccountVisible(String accountName) {
		return page.getByText(accountName).first().isVisible();
	}

	/**
	 * Check if a bank is visible by name.
	 */
	public boolean isBankVisible(String bankName) {
		return page.getByText(bankName).first().isVisible();
	}

	/**
	 * Get account row by account name.
	 */
	public Locator getAccountRow(String accountName) {
		// Use getByRole to find rows, then filter by text
		return page.getByRole(com.microsoft.playwright.options.AriaRole.ROW)
				.filter(new com.microsoft.playwright.Locator.FilterOptions().setHasText(accountName));
	}

	/**
	 * Check if the accounts list has loaded.
	 */
	public boolean hasAccountsLoaded() {
		// Check if at least one account is visible
		return page.locator("tr").count() > 1; // More than just header row
	}
}
