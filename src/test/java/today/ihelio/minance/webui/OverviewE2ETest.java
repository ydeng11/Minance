package today.ihelio.minance.webui;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.Response;

import io.quarkiverse.playwright.WithPlaywright;
import io.quarkiverse.quinoa.testing.QuinoaTestProfiles;
import io.quarkus.test.junit.QuarkusIntegrationTest;
import io.quarkus.test.junit.TestProfile;
import today.ihelio.minance.webui.pages.OverviewPage;

/**
 * E2E tests for the Overview page.
 * Tests overview tiles, API data loading, and transaction table.
 */
@QuarkusIntegrationTest
@TestProfile(QuinoaTestProfiles.Enable.class)
@WithPlaywright
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OverviewE2ETest extends BaseE2ETest {

	@Test
	void shouldLoadOverviewPageSuccessfully() {
		Page page = context.newPage();
		try {
			OverviewPage overviewPage = new OverviewPage(page, appUrl.toString());

			Response response = page.navigate(appUrl.toString());
			Assertions.assertNotNull(response, "Navigation response should not be null");
			Assertions.assertEquals(200, response.status(), "Web UI should respond successfully");

			page.waitForLoadState();
			waitForLoading(page);

			// Verify we're on the overview page
			Assertions.assertTrue(overviewPage.getTotalExpensesCard().isVisible(),
					"Should be on overview page with Total Expenses visible");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayAllOverviewTiles() {
		Page page = context.newPage();
		try {
			OverviewPage overviewPage = new OverviewPage(page, appUrl.toString());
			overviewPage.navigateTo();

			// Verify all 4 metric cards are visible
			Assertions.assertTrue(overviewPage.getTotalExpensesCard().isVisible(),
					"Total Expenses card should be visible");
			Assertions.assertTrue(overviewPage.getCreditCard().isVisible(),
					"Credit card should be visible");
			Assertions.assertTrue(overviewPage.getDebitCard().isVisible(),
					"Debit card should be visible");
			Assertions.assertTrue(overviewPage.getTransactionsCard().isVisible(),
					"Transactions card should be visible");

			// Use the helper method
			Assertions.assertTrue(overviewPage.areAllCardsVisible(),
					"All overview cards should be visible");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayCurrencyFormattedData() {
		Page page = context.newPage();
		try {
			OverviewPage overviewPage = new OverviewPage(page, appUrl.toString());
			overviewPage.navigateTo();

			// Verify cards display currency values (not hardcoded or loading state)
			// Look for dollar sign which indicates currency format
			String pageContent = page.content();

			Assertions.assertTrue(pageContent.contains("$"),
					"Page should contain currency symbols");

			// Verify the cards have actual numeric values (not just "...")
			var totalExpensesCard = overviewPage.getCardByTitle("Total Expenses");
			String totalExpensesText = totalExpensesCard.textContent();
			Assertions.assertFalse(totalExpensesText.contains("Loading..."),
					"Total Expenses card should not be in loading state");

			// Verify page has currency formatting somewhere
			boolean hasCurrencyFormat = pageContent.contains("$") &&
					(pageContent.contains(".00") || pageContent.contains(","));
			Assertions.assertTrue(hasCurrencyFormat,
					"Page should display currency formatted values");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayTrendIndicators() {
		Page page = context.newPage();
		try {
			OverviewPage overviewPage = new OverviewPage(page, appUrl.toString());
			overviewPage.navigateTo();

			// Verify trend indicators are present (percentages)
			Assertions.assertTrue(
					page.locator("text=/from last period/i").first().isVisible(),
					"Trend indicators should show 'from last period' text");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayTransactionTable() {
		Page page = context.newPage();
		try {
			OverviewPage overviewPage = new OverviewPage(page, appUrl.toString());
			overviewPage.navigateTo();

			// Table headers
			Assertions.assertTrue(overviewPage.getTableHeader("Transaction Date").isVisible(),
					"Transaction Date column should be visible");
			Assertions.assertTrue(overviewPage.getTableHeader("Bank").isVisible(),
					"Bank column should be visible");
			Assertions.assertTrue(overviewPage.getTableHeader("Account").isVisible(),
					"Account column should be visible");
			Assertions.assertTrue(overviewPage.getTableHeader("Category").isVisible(),
					"Category column should be visible");
			Assertions.assertTrue(overviewPage.getTableHeader("Description").isVisible(),
					"Description column should be visible");
			Assertions.assertTrue(overviewPage.getTableHeader("Amount").isVisible(),
					"Amount column should be visible");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplaySeededTransactionData() {
		Page page = context.newPage();
		try {
			OverviewPage overviewPage = new OverviewPage(page, appUrl.toString());
			overviewPage.navigateTo();

			// Verify seeded data is visible in the table
			// Based on TestDataResource.ACCOUNT_SEEDS
			Assertions.assertTrue(overviewPage.isCategoryVisible("Groceries"),
					"Groceries category should be visible in the table");
			Assertions.assertTrue(overviewPage.isCategoryVisible("Dining"),
					"Dining category should be visible in the table");

			// Check for specific banks from seeded data
			Assertions.assertTrue(overviewPage.isTextVisible("CHASE"),
					"CHASE bank should be visible");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldDisplayTransactionsCount() {
		Page page = context.newPage();
		try {
			OverviewPage overviewPage = new OverviewPage(page, appUrl.toString());
			overviewPage.navigateTo();

			var transactionsCard = overviewPage.getCardByTitle("Transactions");
			// Transactions count should be a number
			Assertions.assertTrue(
					transactionsCard.textContent().matches(".*[\\+\\-]?[\\d,]+.*"),
					"Transactions card should display a count value");
		} finally {
			page.close();
		}
	}

	@Test
	void shouldNotShowLoadingStateAfterDataLoads() {
		Page page = context.newPage();
		try {
			OverviewPage overviewPage = new OverviewPage(page, appUrl.toString());
			overviewPage.navigateTo();

			// Wait for overview cards to load (they should not show "Loading..." or "...")
			try {
				page.waitForSelector("text=Loading...",
						new Page.WaitForSelectorOptions()
								.setState(com.microsoft.playwright.options.WaitForSelectorState.HIDDEN)
								.setTimeout(10000));
			} catch (Exception e) {
				// Loading indicator may not exist, continue
			}

			// Verify cards are not in loading state
			var totalExpensesCard = overviewPage.getCardByTitle("Total Expenses");
			String cardText = totalExpensesCard.textContent();
			Assertions.assertFalse(cardText.contains("...") && !cardText.contains("$"),
					"Total Expenses card should not be in loading state");
		} finally {
			page.close();
		}
	}
}
