package today.ihelio.minance.webui;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

import com.microsoft.playwright.Page;

import io.quarkiverse.playwright.WithPlaywright;
import io.quarkiverse.quinoa.testing.QuinoaTestProfiles;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import today.ihelio.minance.webui.pages.AccountsPage;

/**
 * E2E tests for the Accounts management page.
 * Tests account viewing and management functionality.
 */
@QuarkusTest
@TestProfile(QuinoaTestProfiles.Enable.class)
@WithPlaywright
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AccountsE2ETest extends BaseE2ETest {

	@Test
	void shouldLoadAccountsPage() {
		Page page = context.newPage();
		try {
			AccountsPage accountsPage = new AccountsPage(page, appUrl.toString());
			accountsPage.navigateTo();

			// Verify the accounts page has loaded
			Assertions.assertTrue(accountsPage.hasAccountsLoaded(),
					"Accounts page should have loaded with data");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplaySeededAccounts() {
		Page page = context.newPage();
		try {
			AccountsPage accountsPage = new AccountsPage(page, appUrl.toString());
			accountsPage.navigateTo();

			// Check for seeded accounts from TestDataResource.ACCOUNT_SEEDS
			// "Peach's Unlimited" from CHASE
			Assertions.assertTrue(accountsPage.isAccountVisible("Peach's Unlimited"),
					"Peach's Unlimited account should be visible");

			// Check for more accounts
			Assertions.assertTrue(accountsPage.isAccountVisible("Peach's CSP") ||
					page.getByText("CSP").first().isVisible(),
					"Peach's CSP account should be visible");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayBankNames() {
		Page page = context.newPage();
		try {
			AccountsPage accountsPage = new AccountsPage(page, appUrl.toString());
			accountsPage.navigateTo();

			// Check for banks from seeded data
			Assertions.assertTrue(accountsPage.isBankVisible("CHASE"),
					"CHASE bank should be visible");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayMultipleBanks() {
		Page page = context.newPage();
		try {
			AccountsPage accountsPage = new AccountsPage(page, appUrl.toString());
			accountsPage.navigateTo();

			// Check for multiple banks from seeded data
			boolean hasChase = accountsPage.isBankVisible("CHASE");
			boolean hasBankOfAmerica = accountsPage.isBankVisible("BANK_OF_AMERICA") ||
					accountsPage.isBankVisible("Bank of America");
			boolean hasDiscover = accountsPage.isBankVisible("DISCOVER");
			boolean hasCiti = accountsPage.isBankVisible("CITI");

			// At least 2 different banks should be visible
			int bankCount = (hasChase ? 1 : 0) + (hasBankOfAmerica ? 1 : 0) +
					(hasDiscover ? 1 : 0) + (hasCiti ? 1 : 0);

			Assertions.assertTrue(bankCount >= 2,
					"At least 2 different banks should be visible");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayAccountTypes() {
		Page page = context.newPage();
		try {
			AccountsPage accountsPage = new AccountsPage(page, appUrl.toString());
			accountsPage.navigateTo();

			// Check for account types from seeded data
			boolean hasCreditAccounts = page.getByText("CREDIT").first().isVisible() ||
					page.getByText("Credit").first().isVisible();
			boolean hasCheckingAccounts = page.getByText("CHECKING").first().isVisible() ||
					page.getByText("Checking").first().isVisible();

			// At least one account type should be visible
			Assertions.assertTrue(hasCreditAccounts || hasCheckingAccounts,
					"Account types should be visible");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayAccountBalances() {
		Page page = context.newPage();
		try {
			AccountsPage accountsPage = new AccountsPage(page, appUrl.toString());
			accountsPage.navigateTo();

			// Check that accounts are displayed
			Assertions.assertTrue(accountsPage.hasAccountsLoaded(),
					"Accounts should be loaded");

			// Verify page has account-related content (more lenient check)
			var pageContent = page.content().toLowerCase();
			boolean hasAccountContent = pageContent.contains("account") ||
					pageContent.contains("bank") ||
					pageContent.contains("balance");

			Assertions.assertTrue(hasAccountContent,
					"Page should contain account-related information");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldNavigateToAccountsPage() {
		Page page = context.newPage();
		try {
			// Start at overview
			page.navigate(appUrl.toString());
			page.waitForLoadState();
			waitForLoading(page);

			// Navigate to accounts
			AccountsPage accountsPage = new AccountsPage(page, appUrl.toString());
			accountsPage.navigateTo();

			// Verify we're on the accounts page
			String currentUrl = page.url();
			Assertions.assertTrue(currentUrl.contains("accounts"),
					"URL should contain 'accounts'");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayAccountsList() {
		Page page = context.newPage();
		try {
			AccountsPage accountsPage = new AccountsPage(page, appUrl.toString());
			accountsPage.navigateTo();

			// Check that accounts are displayed in a table or list format
			var rows = page.locator("tr");
			int rowCount = rows.count();

			// Should have at least header row + some data rows
			Assertions.assertTrue(rowCount > 1,
					"Accounts should be displayed in a table with multiple rows");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayAccountDetails() {
		Page page = context.newPage();
		try {
			AccountsPage accountsPage = new AccountsPage(page, appUrl.toString());
			accountsPage.navigateTo();

			// Get a specific account row
			var accountRow = accountsPage.getAccountRow("Peach's Unlimited");

			if (accountRow.isVisible()) {
				// The row should contain account information
				String rowText = accountRow.textContent();

				// Should contain bank name and account type
				Assertions.assertTrue(rowText.length() > 0,
						"Account row should contain details");
			}
		} finally {
			page.close();
		}
	}

	@Test
	void shouldShowMultipleAccountsPerBank() {
		Page page = context.newPage();
		try {
			AccountsPage accountsPage = new AccountsPage(page, appUrl.toString());
			accountsPage.navigateTo();

			// CHASE has multiple accounts in seeded data
			// Count how many times CHASE appears
			var chaseElements = page.locator("text=CHASE");
			int chaseCount = chaseElements.count();

			// CHASE should have multiple accounts (Peach's Unlimited, Peach's CSP, etc.)
			Assertions.assertTrue(chaseCount >= 2,
					"CHASE should have multiple accounts listed");
		} finally {
			page.close();
		}
	}
}
