package today.ihelio.minance.webui.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * Base page object providing common navigation and utility methods.
 */
public abstract class BasePage {

	protected final Page page;
	protected final String baseUrl;

	public BasePage(Page page, String baseUrl) {
		this.page = page;
		this.baseUrl = baseUrl.replaceAll("/$", "");
	}

	/**
	 * Navigate to this page's URL.
	 */
	public abstract void navigateTo();

	/**
	 * Wait for loading indicators to disappear.
	 */
	protected void waitForLoading() {
		try {
			page.waitForSelector("text=Loading",
					new Page.WaitForSelectorOptions()
							.setState(WaitForSelectorState.HIDDEN)
							.setTimeout(10000));
		} catch (Exception e) {
			// Loading indicator may not exist or already disappeared, continue
		}

		try {
			page.waitForSelector("text=Loading transactions...",
					new Page.WaitForSelectorOptions()
							.setState(WaitForSelectorState.HIDDEN)
							.setTimeout(10000));
		} catch (Exception e) {
			// Loading indicator may not exist or already disappeared, continue
		}
	}

	/**
	 * Click a navigation link by name.
	 *
	 * @param linkName The accessible name of the link
	 */
	public void clickNavLink(String linkName) {
		page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName(linkName)).click();
	}

	/**
	 * Get a locator for a button by name.
	 *
	 * @param buttonName The accessible name of the button
	 * @return The button locator
	 */
	protected Locator getButton(String buttonName) {
		return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(buttonName));
	}

	/**
	 * Get a locator for a heading by name.
	 *
	 * @param headingName The accessible name of the heading
	 * @return The heading locator
	 */
	protected Locator getHeading(String headingName) {
		return page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName(headingName));
	}

	/**
	 * Check if text is visible on the page.
	 *
	 * @param text The text to check
	 * @return true if visible, false otherwise
	 */
	public boolean isTextVisible(String text) {
		return page.getByText(text).first().isVisible();
	}
}
