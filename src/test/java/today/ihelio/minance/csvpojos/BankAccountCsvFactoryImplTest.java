package today.ihelio.minance.csvpojos;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import today.ihelio.jooq.tables.pojos.Transactions;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.DEBIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.*;

@QuarkusTest
class BankAccountCsvFactoryImplTest {
	@Inject
	BankAccountCsvFactory bankAccountCsvFactory;

	private void assertTransactionEquals(Transactions actual, Transactions expected) {
		assertThat(actual.getAmount()).isEqualTo(expected.getAmount());
		assertThat(actual.getCategory()).isEqualTo(expected.getCategory());
		assertThat(actual.getDescription()).isEqualTo(expected.getDescription());
		assertThat(actual.getTransactionDate()).isEqualTo(expected.getTransactionDate());
		assertThat(actual.getPostDate()).isEqualTo(expected.getPostDate());
		assertThat(actual.getMemo()).isEqualTo(expected.getMemo());
	}

	@Nested
	class ChaseCreditTests {
		private final BankAccountPair CHASE_CREDIT = BankAccountPair.of(CHASE, CREDIT);

		@Test
		void parsesTransactionsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(CHASE_CREDIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> transactions = CsvTestUtils.parseCsvFile(
					"testCsv/chase_credit.csv", template);

			// Then
			assertThat(transactions).hasSize(8);

			Transactions expected = TestTransactionData.builder()
					.amount(new BigDecimal("12.59"))
					.category("Entertainment")
					.description("GOOGLE *YouTubePremium")
					.transactionDate(LocalDate.of(2011, 3, 14))
					.postDate(LocalDate.of(2011, 3, 14))
					.memo("")
					.build();

			assertTransactionEquals(transactions.getFirst().toTransactions(), expected);
		}

		@Test
		void handlesPaymentTransactions() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(CHASE_CREDIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> transactions = CsvTestUtils.parseCsvFile(
					"testCsv/chase_credit.csv", template);

			// Then
			Transactions payment = transactions.getFirst().toTransactions();
			assertThat(payment.getCategory()).isEqualTo("Entertainment");
		}
	}

	@Nested
	class DiscoverCreditTests {
		private final BankAccountPair DISCOVER_CREDIT = BankAccountPair.of(DISCOVER, CREDIT);

		@Test
		void parsesTransactionsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(DISCOVER_CREDIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> transactions = CsvTestUtils.parseCsvFile(
					"testCsv/discover_credit.csv", template);

			// Then
			assertThat(transactions).hasSize(8);

			Transactions expected = TestTransactionData.builder()
					.amount(new BigDecimal("294.64"))
					.category("Restaurants")
					.description("DRAGON CITY")
					.transactionDate(LocalDate.of(1999, 4, 9))
					.postDate(LocalDate.of(1999, 4, 9))
					.memo("")
					.build();

			assertTransactionEquals(transactions.getFirst().toTransactions(), expected);
		}
	}

	@Nested
	class BoaCreditTests {
		private final BankAccountPair BOA_CREDIT = BankAccountPair.of(BANK_OF_AMERICA, CREDIT);

		@Test
		void parsesTransactionsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(BOA_CREDIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> transactions = CsvTestUtils.parseCsvFile(
					"testCsv/boa.csv", template);

			// Then
			assertThat(transactions).hasSize(6);

			Transactions expected = TestTransactionData.builder()
					.amount(new BigDecimal("16.72"))
					.category("Refunds/Adjustments")
					.description("AMAZON RETA* EN44T2YC3   WWW.AMAZON.COWA")
					.transactionDate(LocalDate.of(2023, 9, 19))
					.postDate(LocalDate.of(2023, 9, 19))
					.memo("")
					.build();

			assertTransactionEquals(transactions.getFirst().toTransactions(), expected);
		}
	}

	@Nested
	class BoaDebitTests {
		private final BankAccountPair BOA_DEBIT = BankAccountPair.of(BANK_OF_AMERICA, DEBIT);

		@Test
		void parsesTransactionsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(BOA_DEBIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> transactions = CsvTestUtils.parseCsvFile(
					"testCsv/boa.csv", template);

			// Then
			assertThat(transactions).hasSize(6);

			Transactions expected = TestTransactionData.builder()
					.amount(new BigDecimal("16.72"))
					.category("Refunds/Adjustments")
					.description("AMAZON RETA* EN44T2YC3   WWW.AMAZON.COWA")
					.transactionDate(LocalDate.of(2023, 9, 19))
					.postDate(LocalDate.of(2023, 9, 19))
					.memo("")
					.build();

			assertTransactionEquals(transactions.getFirst().toTransactions(), expected);
		}
	}

	@Nested
	class AmexCreditTests {
		private final BankAccountPair AMEX_CREDIT = BankAccountPair.of(AMEX, CREDIT);

		@Test
		void parsesTransactionsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(AMEX_CREDIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> transactions = CsvTestUtils.parseCsvFile(
					"testCsv/amex_credit.csv", template);

			// Then
			assertThat(transactions).hasSize(8);

			Transactions expected = TestTransactionData.builder()
					.amount(new BigDecimal("52.52"))
					.category("Merchandise & Supplies-Groceries")
					.description("SUNRISE MANAGEMENT ISUNRISE             FL")
					.transactionDate(LocalDate.of(2023, 7, 23))
					.postDate(LocalDate.of(2023, 7, 23))
					.memo("3256750613472558")
					.build();

			assertTransactionEquals(transactions.getFirst().toTransactions(), expected);
		}
	}

	@Nested
	class CitiCreditTests {
		private final BankAccountPair CITI_CREDIT = BankAccountPair.of(CITI, CREDIT);

		@Test
		void parsesTransactionsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(CITI_CREDIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> transactions = CsvTestUtils.parseCsvFile(
					"testCsv/citi_credit.csv", template);

			// Then
			assertThat(transactions).hasSize(8);

			Transactions expected = TestTransactionData.builder()
					.amount(new BigDecimal("-371.77"))
					.category("")
					.description("AUTOPAY 000000000007557RAUTOPAY AUTO-PMT")
					.transactionDate(LocalDate.of(2023, 5, 9))
					.postDate(LocalDate.of(2023, 5, 9))
					.memo("")
					.build();

			assertTransactionEquals(transactions.getFirst().toTransactions(), expected);
		}
	}

	@Nested
	class AppleCreditTests {
		private final BankAccountPair APPLE_CREDIT = BankAccountPair.of(APPLE, CREDIT);

		@Test
		void parsesTransactionsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(APPLE_CREDIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> transactions = CsvTestUtils.parseCsvFile(
					"testCsv/apple_credit.csv", template);

			// Then
			assertThat(transactions).hasSize(8);

			Transactions expected = TestTransactionData.builder()
					.amount(new BigDecimal("120.00"))
					.category("Restaurants")
					.description("CY CHINESE RESTAURANT 1242 NE 163RD ST NORTH MIAMI B33162 FL USA")
					.transactionDate(LocalDate.of(2023, 7, 30))
					.postDate(LocalDate.of(2023, 7, 31))
					.memo("")
					.build();

			assertTransactionEquals(transactions.getFirst().toTransactions(), expected);
		}
	}

	@Nested
	class CashAppDebitTests {
		private final BankAccountPair CASH_APP_DEBIT = BankAccountPair.of(CASH_APP, DEBIT);

		@Test
		void parsesTransactionsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(CASH_APP_DEBIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> transactions = CsvTestUtils.parseCsvFile(
					"testCsv/cash_app_debit.csv", template);

			// Then
			assertThat(transactions).hasSize(8);

			Transactions expected = TestTransactionData.builder()
					.amount(new BigDecimal("7.06"))
					.category("")
					.description("#boost sale of USD 7.06")
					.transactionDate(LocalDate.of(2023, 6, 7))
					.postDate(LocalDate.of(2023, 6, 7))
					.memo("")
					.build();

			assertTransactionEquals(transactions.getFirst().toTransactions(), expected);
		}
	}

	@Nested
	class MinanceCreditDebitTests {
		private final BankAccountPair MINANCE_CREDIT = BankAccountPair.of(MINANCE, CREDIT);

		@Test
		void parsesTransactionsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(MINANCE_CREDIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> transactions = CsvTestUtils.parseCsvFile(
					"testCsv/minance_credit_debit.csv", template);

			// Then
			assertThat(transactions).hasSize(8);

			Transactions expected = TestTransactionData.builder()
					.amount(new BigDecimal("12.59"))
					.category("Entertainment")
					.description("GOOGLE *YouTubePremium")
					.transactionDate(LocalDate.of(2011, 3, 14))
					.postDate(LocalDate.of(2011, 3, 14))
					.memo("")
					.build();

			assertTransactionEquals(transactions.getFirst().toTransactions(), expected);
		}
	}

	@Nested
	class PayPalDebitTests {
		private final BankAccountPair PAYPAL_DEBIT = BankAccountPair.of(BankAccountPair.BankName.PAYPAL, DEBIT);

		@Test
		void parsesTransactionsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(PAYPAL_DEBIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> rawTransactions = CsvTestUtils.parseCsvFile(
					"testCsv/paypal_balance_debit.csv", template);

			// Filter to only completed transactions (validate() throws exception for non-completed)
			List<? extends AbstractBankAccountCsvTemplate> completedTransactions = rawTransactions.stream()
					.filter(t -> {
						try {
							t.validate();
							return true;
						} catch (IllegalStateException e) {
							return false;
						}
					})
					.toList();

			// Then - assert no pending transactions are saved
			// CSV has 55 rows total, but only completed ones should pass validation
			assertThat(completedTransactions).isNotEmpty();

			// Verify all parsed transactions are completed (no pending/denied)
			completedTransactions.forEach(t -> {
				PayPalDebitCsvTemplate paypalTemplate = (PayPalDebitCsvTemplate) t;
				assertThat(paypalTemplate.status).isEqualToIgnoringCase("Completed");
			});

			// Verify first completed transaction (Rakuten deposit)
			// CSV: Total = 7.91 (deposit), should be inverted to -7.91
			Transactions firstTransaction = completedTransactions.getFirst().toTransactions();
			Transactions expectedFirst = TestTransactionData.builder()
					.amount(new BigDecimal("-7.91")) // Inverted: deposit becomes negative
					.category("Rakuten")
					.description("Rakuten - Mass Pay Payment")
					.transactionDate(LocalDate.of(2024, 2, 14))
					.postDate(LocalDate.of(2024, 2, 14))
					.memo("Status: Completed | Transaction ID: f792993a-c348-447f-a2c1-15cf2ee2e394")
					.build();
			assertTransactionEquals(firstTransaction, expectedFirst);

			// Verify an expense transaction (Taxi Technologies)
			// Find first expense transaction (negative amount in CSV becomes positive)
			PayPalDebitCsvTemplate expenseTemplate = completedTransactions.stream()
					.map(t -> (PayPalDebitCsvTemplate) t)
					.filter(t -> t.name != null && t.name.contains("Taxi Technologies"))
					.findFirst()
					.orElseThrow();

			Transactions expenseTransaction = expenseTemplate.toTransactions();
			// CSV: Total = -49.61 (expense), should be inverted to 49.61
			assertThat(expenseTransaction.getAmount()).isEqualTo(new BigDecimal("49.61"));
			assertThat(expenseTransaction.getCategory()).isEqualTo("Taxi Technologies, Inc");
			assertThat(expenseTransaction.getDescription()).contains("Taxi Technologies");
		}

		@Test
		void filtersOutPendingTransactions() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(PAYPAL_DEBIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> rawTransactions = CsvTestUtils.parseCsvFile(
					"testCsv/paypal_balance_debit.csv", template);

			// Filter to only completed transactions
			List<? extends AbstractBankAccountCsvTemplate> completedTransactions = rawTransactions.stream()
					.filter(t -> {
						try {
							t.validate();
							return true;
						} catch (IllegalStateException e) {
							return false;
						}
					})
					.toList();

			// Then - verify no pending transactions
			// All pending transactions should be filtered out
			assertThat(completedTransactions.stream()
					.map(t -> (PayPalDebitCsvTemplate) t)
					.filter(t -> t.status != null && t.status.equalsIgnoreCase("Pending"))
					.count()).isEqualTo(0);

			// Verify we have some completed transactions
			assertThat(completedTransactions.size()).isGreaterThan(0);
			assertThat(completedTransactions.size()).isLessThan(rawTransactions.size());
		}

		@Test
		void invertsAmountSignsCorrectly() {
			// Given
			AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(PAYPAL_DEBIT);

			// When
			List<? extends AbstractBankAccountCsvTemplate> rawTransactions = CsvTestUtils.parseCsvFile(
					"testCsv/paypal_balance_debit.csv", template);

			// Filter to only completed transactions
			List<? extends AbstractBankAccountCsvTemplate> completedTransactions = rawTransactions.stream()
					.filter(t -> {
						try {
							t.validate();
							return true;
						} catch (IllegalStateException e) {
							return false;
						}
					})
					.toList();

			// Then - verify amounts are inverted
			// Deposits (positive in CSV) should become negative
			PayPalDebitCsvTemplate depositTemplate = completedTransactions.stream()
					.map(t -> (PayPalDebitCsvTemplate) t)
					.filter(t -> t.total != null && t.total.compareTo(BigDecimal.ZERO) > 0)
					.findFirst()
					.orElseThrow();

			Transactions depositTransaction = depositTemplate.toTransactions();
			// Original CSV amount is positive, should be inverted to negative
			assertThat(depositTransaction.getAmount()).isLessThan(BigDecimal.ZERO);
			assertThat(depositTransaction.getAmount()).isEqualTo(depositTemplate.total.negate());

			// Expenses (negative in CSV) should become positive
			PayPalDebitCsvTemplate expenseTemplate = completedTransactions.stream()
					.map(t -> (PayPalDebitCsvTemplate) t)
					.filter(t -> t.total != null && t.total.compareTo(BigDecimal.ZERO) < 0)
					.findFirst()
					.orElseThrow();

			Transactions expenseTransaction = expenseTemplate.toTransactions();
			// Original CSV amount is negative, should be inverted to positive
			assertThat(expenseTransaction.getAmount()).isGreaterThan(BigDecimal.ZERO);
			assertThat(expenseTransaction.getAmount()).isEqualTo(expenseTemplate.total.negate());
		}
	}
}
