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
}
