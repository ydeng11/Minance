package today.ihelio.minance.rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.CoreMatchers.notNullValue;
import static org.hamcrest.Matchers.greaterThan;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.jooq.tables.pojos.Transactions;
import today.ihelio.minance.csvpojos.BankAccountPair;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;
import today.ihelio.minance.service.TransactionService;

@QuarkusTest
public class OverviewResourceTest {

        @Inject
        BankService bankService;

        @Inject
        AccountService accountService;

        @Inject
        TransactionService transactionService;

        @Inject
        Flyway flyway;

        private Integer creditAccountId;
        private Integer debitAccountId;

        @BeforeEach
        public void setUp() throws Exception {
                flyway.migrate();

                // Create bank
                var bank = bankService.create(BankAccountPair.BankName.MINANCE)
                                .orElseGet(() -> {
                                        try {
                                                return bankService.findBankByName(BankAccountPair.BankName.MINANCE)
                                                                .orElseThrow(() -> new IllegalStateException(
                                                                                "Failed to create/find bank"));
                                        } catch (Exception e) {
                                                throw new IllegalStateException("Failed to find bank", e);
                                        }
                                });

                Integer bankId = bank.getBankId();

                // Create credit account
                Accounts creditAccount = new Accounts();
                creditAccount.setBankId(bankId);
                creditAccount.setBankName("MINANCE");
                creditAccount.setAccountName("Test Credit");
                creditAccount.setAccountType("CREDIT");
                creditAccount.setInitBalance(BigDecimal.ZERO);
                accountService.create(creditAccount);
                creditAccountId = accountService.findAccountByBankAndAccountName("MINANCE", "Test Credit")
                                .map(Accounts::getAccountId)
                                .orElseThrow();

                // Create debit account
                Accounts debitAccount = new Accounts();
                debitAccount.setBankId(bankId);
                debitAccount.setBankName("MINANCE");
                debitAccount.setAccountName("Test Debit");
                debitAccount.setAccountType("DEBIT");
                debitAccount.setInitBalance(BigDecimal.ZERO);
                accountService.create(debitAccount);
                debitAccountId = accountService.findAccountByBankAndAccountName("MINANCE", "Test Debit")
                                .map(Accounts::getAccountId)
                                .orElseThrow();
        }

        @AfterEach
        public void tearDown() throws Exception {
                flyway.clean();
        }

        @Test
        public void testGetOverviewSummaryWithNoTransactions() {
                LocalDate endDate = LocalDate.now();
                LocalDate startDate = endDate.minusMonths(1);

                given()
                                .queryParam("startDate", startDate.toString())
                                .queryParam("endDate", endDate.toString())
                                .when()
                                .get("/1.0/minance/overview/summary")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("totalExpenses", equalTo(0))
                                .body("totalExpensesChangePercent", equalTo(0))
                                .body("creditTotal", equalTo(0))
                                .body("creditChangePercent", equalTo(0))
                                .body("debitTotal", equalTo(0))
                                .body("debitChangePercent", equalTo(0))
                                .body("transactionCount", equalTo(0))
                                .body("transactionChangeCount", equalTo(0));
        }

        @Test
        public void testGetOverviewSummaryWithTransactions() throws Exception {
                LocalDate today = LocalDate.now();
                LocalDate yesterday = today.minusDays(1);
                LocalDate lastMonth = today.minusMonths(1);

                // Create transactions in current period (positive amounts = expenses)
                List<Transactions> currentPeriodTransactions = List.of(
                                createTransaction(creditAccountId, today, new BigDecimal("100.00"), "CREDIT"),
                                createTransaction(creditAccountId, yesterday, new BigDecimal("50.00"), "CREDIT"),
                                createTransaction(debitAccountId, today, new BigDecimal("75.00"), "DEBIT"),
                                createTransaction(debitAccountId, yesterday, new BigDecimal("25.00"), "DEBIT"));
                transactionService.create(currentPeriodTransactions);

                // Create transactions in previous period (positive amounts = expenses)
                List<Transactions> previousPeriodTransactions = List.of(
                                createTransaction(creditAccountId, lastMonth, new BigDecimal("30.00"), "CREDIT"),
                                createTransaction(debitAccountId, lastMonth, new BigDecimal("20.00"), "DEBIT"));
                transactionService.create(previousPeriodTransactions);

                LocalDate startDate = today.minusDays(7);
                LocalDate endDate = today;

                given()
                                .queryParam("startDate", startDate.toString())
                                .queryParam("endDate", endDate.toString())
                                .when()
                                .get("/1.0/minance/overview/summary")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("totalExpenses", greaterThan(0))
                                .body("creditTotal", notNullValue())
                                .body("debitTotal", notNullValue())
                                .body("transactionCount", equalTo(4))
                                .body("transactionChangeCount", notNullValue());
        }

        @Test
        public void testGetOverviewSummaryWithDefaultDates() {
                // Test without date parameters - should default to last month
                given()
                                .when()
                                .get("/1.0/minance/overview/summary")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("totalExpenses", notNullValue())
                                .body("transactionCount", notNullValue());
        }

        @Test
        public void testGetOverviewSummaryCalculatesPercentChanges() throws Exception {
                LocalDate today = LocalDate.now();
                LocalDate startDate = today.minusDays(30);
                LocalDate endDate = today;

                // Create transactions in current period (positive amounts = expenses)
                transactionService.create(List.of(
                                createTransaction(creditAccountId, today, new BigDecimal("200.00"), "CREDIT"),
                                createTransaction(debitAccountId, today, new BigDecimal("100.00"), "DEBIT")));

                // Create transactions in previous period (less amount, positive = expenses)
                LocalDate previousEnd = startDate.minusDays(1);
                LocalDate previousStart = previousEnd.minusDays(30);
                transactionService.create(List.of(
                                createTransaction(creditAccountId, previousEnd, new BigDecimal("100.00"), "CREDIT"),
                                createTransaction(debitAccountId, previousEnd, new BigDecimal("50.00"), "DEBIT")));

                given()
                                .queryParam("startDate", startDate.toString())
                                .queryParam("endDate", endDate.toString())
                                .when()
                                .get("/1.0/minance/overview/summary")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("totalExpensesChangePercent", greaterThan(0f))
                                .body("creditChangePercent", notNullValue())
                                .body("debitChangePercent", notNullValue());
        }

        @Test
        public void testGetOverviewSummarySeparatesCreditAndDebit() throws Exception {
                LocalDate today = LocalDate.now();
                LocalDate startDate = today.minusDays(7);
                LocalDate endDate = today;

                // Create credit transactions (positive amounts = expenses)
                transactionService.create(List.of(
                                createTransaction(creditAccountId, today, new BigDecimal("150.00"), "CREDIT"),
                                createTransaction(creditAccountId, today.minusDays(1), new BigDecimal("50.00"),
                                                "CREDIT")));

                // Create debit transactions (positive amounts = expenses)
                transactionService.create(List.of(
                                createTransaction(debitAccountId, today, new BigDecimal("200.00"), "DEBIT"),
                                createTransaction(debitAccountId, today.minusDays(1), new BigDecimal("100.00"),
                                                "DEBIT")));

                var response = given()
                                .queryParam("startDate", startDate.toString())
                                .queryParam("endDate", endDate.toString())
                                .when()
                                .get("/1.0/minance/overview/summary")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .extract()
                                .response();

                BigDecimal creditTotal = new BigDecimal(response.jsonPath().getString("creditTotal"));
                BigDecimal debitTotal = new BigDecimal(response.jsonPath().getString("debitTotal"));

                // Credit total should be sum of credit transactions
                assertTrue(creditTotal.compareTo(BigDecimal.ZERO) != 0, "Credit total should not be zero");
                // Debit total should be sum of debit transactions
                assertTrue(debitTotal.compareTo(BigDecimal.ZERO) != 0, "Debit total should not be zero");
                // They should be different
                assertNotEquals(creditTotal, debitTotal, "Credit and debit totals should be different");
        }

        @Test
        public void testGetOverviewSummaryOnlyCountsPositiveAmountsAsExpenses() throws Exception {
                LocalDate today = LocalDate.now();
                LocalDate startDate = today.minusDays(7);
                LocalDate endDate = today;

                // Create transactions with both positive (expenses) and negative (income/payments)
                // amounts - matching actual data model
                transactionService.create(List.of(
                                // Expenses (POSITIVE amounts) - should be counted in totalExpenses
                                createTransaction(debitAccountId, today, new BigDecimal("100.00"), "DEBIT"),
                                createTransaction(debitAccountId, today.minusDays(1), new BigDecimal("50.00"),
                                                "DEBIT"),
                                // Income/Payments (NEGATIVE amounts) - should NOT be counted in totalExpenses
                                createTransaction(debitAccountId, today.minusDays(2), new BigDecimal("-500.00"),
                                                "DEBIT"), // Salary/income
                                createTransaction(creditAccountId, today, new BigDecimal("75.00"), "CREDIT"),
                                createTransaction(creditAccountId, today.minusDays(1), new BigDecimal("-200.00"),
                                                "CREDIT") // Payment/refund
                ));

                var response = given()
                                .queryParam("startDate", startDate.toString())
                                .queryParam("endDate", endDate.toString())
                                .when()
                                .get("/1.0/minance/overview/summary")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .extract()
                                .response();

                BigDecimal totalExpenses = new BigDecimal(response.jsonPath().getString("totalExpenses"));
                BigDecimal creditTotal = new BigDecimal(response.jsonPath().getString("creditTotal"));
                BigDecimal debitTotal = new BigDecimal(response.jsonPath().getString("debitTotal"));
                Long transactionCount = response.jsonPath().getLong("transactionCount");

                // Total expenses should only include POSITIVE amounts: 100 + 50 + 75 = 225
                assertTrue(totalExpenses.compareTo(new BigDecimal("225.00")) == 0,
                                "Total expenses should only include positive amounts, not negative income/payments. Expected 225.00, got: "
                                                + totalExpenses);

                // Credit total should include both positive and negative: 75 + (-200) = -125
                assertTrue(creditTotal.compareTo(new BigDecimal("-125.00")) == 0,
                                "Credit total should include both positive and negative amounts. Expected -125.00, got: "
                                                + creditTotal);

                // Debit total should include both positive and negative: 100 + 50 + (-500) = -350
                assertTrue(debitTotal.compareTo(new BigDecimal("-350.00")) == 0,
                                "Debit total should include both positive and negative amounts. Expected -350.00, got: "
                                                + debitTotal);

                // Should have 5 transactions total
                assertEquals(5L, transactionCount, "Should count all transactions regardless of sign");
        }

        @Test
        public void testGetOverviewSummaryHandlesTransactionsOutsideDateRange() throws Exception {
                LocalDate today = LocalDate.now();
                LocalDate startDate = today.minusDays(7);
                LocalDate endDate = today;

                // Create transactions within date range (positive amounts = expenses)
                transactionService.create(List.of(
                                createTransaction(debitAccountId, today, new BigDecimal("100.00"), "DEBIT"),
                                createTransaction(debitAccountId, today.minusDays(3), new BigDecimal("50.00"),
                                                "DEBIT")));

                // Create transactions outside date range (should not be counted)
                transactionService.create(List.of(
                                createTransaction(debitAccountId, today.minusDays(10), new BigDecimal("200.00"),
                                                "DEBIT"), // Before startDate
                                createTransaction(debitAccountId, today.plusDays(1), new BigDecimal("300.00"),
                                                "DEBIT"))); // After endDate

                var response = given()
                                .queryParam("startDate", startDate.toString())
                                .queryParam("endDate", endDate.toString())
                                .when()
                                .get("/1.0/minance/overview/summary")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .extract()
                                .response();

                BigDecimal totalExpenses = new BigDecimal(response.jsonPath().getString("totalExpenses"));
                Long transactionCount = response.jsonPath().getLong("transactionCount");

                // Total expenses should only include transactions within date range: 100 + 50 =
                // 150
                assertTrue(totalExpenses.compareTo(new BigDecimal("150.00")) == 0,
                                "Total expenses should only include transactions within the date range. Expected 150.00, got: "
                                                + totalExpenses);

                // Should only count 2 transactions (within date range)
                assertEquals(2L, transactionCount,
                                "Should only count transactions within the specified date range");
        }

        private Transactions createTransaction(Integer accountId, LocalDate date, BigDecimal amount,
                        String accountType) {
                Transactions transaction = new Transactions();
                transaction.setAccountId(accountId);
                transaction.setAccountName(accountType.equals("CREDIT") ? "Test Credit" : "Test Debit");
                transaction.setBankName("MINANCE");
                transaction.setTransactionDate(date);
                transaction.setAmount(amount);
                transaction.setDescription("Test Transaction");
                transaction.setCategory("Test Category");
                transaction.setTransactionType(accountType);
                return transaction;
        }
}
