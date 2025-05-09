package today.ihelio.minance.service;

import com.google.common.collect.ImmutableList;
import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.jooq.tables.pojos.Transactions;
import today.ihelio.minance.csvpojos.AbstractBankAccountCsvTemplate;
import today.ihelio.minance.csvpojos.BankAccountCsvFactory;
import today.ihelio.minance.csvpojos.BankAccountPair;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.DEBIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.*;

@QuarkusTest
//@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class TransactionServiceTest {
	private final String ACCOUNT_NAME_TEST1 = "test1";
	private final String ACCOUNT_NAME_TEST2 = "test2";
	private final BigDecimal INIT_BALANCE = new BigDecimal("123.12");

	@Inject
	BankService bankService;

	@Inject
	AccountService accountService;

	@Inject
	TransactionService transactionService;

	@Inject
	BankAccountCsvFactory bankAccountCsvFactory;

	@Inject
	Flyway flyway;

	@BeforeEach
	public void setUp() throws Exception {
		flyway.migrate();
		bankService.create(CITI);
		bankService.create(AMEX);
		bankService.create(BANK_OF_AMERICA);
		bankService.create(APPLE);
		bankService.create(CASH_APP);
		bankService.create(CHASE);
		bankService.create(DISCOVER);

		List<BankAccountPair> bankAccountPairList = bankAccountCsvFactory.getKeys();

		bankAccountPairList.forEach((t) -> {
					Accounts tempAccounts = new Accounts();
					tempAccounts.setBankName(t.getBankName().getName());
					tempAccounts.setAccountType(t.getAccountType().getType());
					tempAccounts.setAccountName(ACCOUNT_NAME_TEST1 + "-" + t.getAccountType().getType());
					tempAccounts.setInitBalance(INIT_BALANCE);
					try {
						accountService.create(tempAccounts);
					} catch (Exception e) {
						throw new RuntimeException(e);
					}
				}
		);

		accountService.create(
				new Accounts(null, null, CITI.getName(), ACCOUNT_NAME_TEST2, CREDIT.getType(),
						INIT_BALANCE));
	}

	@AfterEach
	public void tearDown() throws Exception {
		flyway.clean();
	}

	@Test
	public void testUploadCsvForAllBankAccountType() throws Exception {
		testUploadCsv(AMEX, CREDIT, "testCsv/amex_credit.csv");
		testUploadCsv(APPLE, CREDIT, "testCsv/apple_credit.csv");
		testUploadCsv(BANK_OF_AMERICA, CREDIT, "testCsv/boa.csv");
		testUploadCsv(BANK_OF_AMERICA, DEBIT, "testCsv/boa.csv");
		testUploadCsv(CASH_APP, DEBIT, "testCsv/cash_app_debit.csv");
		testUploadCsv(CITI, CREDIT, "testCsv/citi_credit.csv");
		testUploadCsv(DISCOVER, CREDIT, "testCsv/discover_credit.csv");
		testUploadCsv(CHASE, CREDIT, "testCsv/chase_credit.csv");
	}

	@Test
	public void testCreateDeleteTransactions() throws Exception {
		var uploadTime = "20230101123011";
		var date = LocalDate.of(1999, 12, 11);
		var description = "testDescription";
		var category = "testBuy";
		var amount = BigDecimal.valueOf(121.11);
		var transactions = makeTransactions(date, description, category, uploadTime, amount);
		Optional<Accounts> accounts =
				accountService.findAccountByBankAndAccountName(CITI.getName(),
						ACCOUNT_NAME_TEST2);
		transactions.setAccountId(accounts.get().getAccountId());

		assertThat(transactionService.create(ImmutableList.of(transactions))).isEqualTo(1);

		List<Transactions> savedTransactions =
				transactionService.retrieveByAccount(accounts.get().getAccountId());

		assertThat(
				transactionService.delete(
						ImmutableList.of(savedTransactions.getFirst().getTransactionId()))).isEqualTo(1);
		assertThat(transactionService.retrieveByAccount(accounts.get().getAccountId()).size()).isEqualTo(0);
	}

	@Test
	public void testDeleteByUploadTime() throws Exception {
		var uploadTime = "20230101123011";
		var date = LocalDate.of(1999, 11, 11);
		var description = "testDescription";
		var category = "testBuy";
		var amount = BigDecimal.valueOf(11.11);
		var transactions = makeTransactions(date, description, category, uploadTime, amount);
		Optional<Accounts> accounts =
				accountService.findAccountByBankAndAccountName(CITI.getName(),
						ACCOUNT_NAME_TEST2);
		transactions.setAccountId(accounts.get().getAccountId());
		assertThat(transactionService.create(ImmutableList.of(transactions))).isEqualTo(1);
		assertThat(transactionService.deleteWithUploadTime(uploadTime)).isEqualTo(1);
	}

	@Test
	public void testCreateUpdateTransactions() throws Exception {
		var uploadTime = "20230101123011";
		var date = LocalDate.of(1999, 12, 11);
		var description = "testDescription";
		var category = "testBuy";
		var amount = BigDecimal.valueOf(121.11);
		var transactions = makeTransactions(date, description, category, uploadTime, amount);
		Optional<Accounts> accounts =
				accountService.findAccountByBankAndAccountName(CITI.getName(),
						ACCOUNT_NAME_TEST2);
		transactions.setAccountId(accounts.get().getAccountId());

		assertThat(transactionService.create(ImmutableList.of(transactions))).isEqualTo(1);

		List<Transactions> transactionsList =
				transactionService.retrieveByAccount(accounts.get().getAccountId());
		Transactions updateTransactions = transactionsList.get(0);
		var newAmount = BigDecimal.valueOf(22.22);
		updateTransactions.setAmount(newAmount);

		assertThat(
				transactionService.update(updateTransactions)).isEqualTo(1);
		assertThat(
				transactionService.retrieve(updateTransactions.getTransactionId()).get().getAmount()).isEqualTo(
				newAmount);
	}

	public void testUploadCsv(BankAccountPair.BankName bankName,
	                          BankAccountPair.AccountType accountType, String filePath) throws Exception {
		int accountId =
				accountService.findAccountByBankAndAccountName(bankName.getName(),
								ACCOUNT_NAME_TEST1 + "-" + accountType.getType())
						.get().getAccountId();

		BankAccountPair bankAccountPair = BankAccountPair.of(bankName, accountType);
		ClassLoader classLoader = TransactionServiceTest.class.getClassLoader();
		InputStream file = classLoader.getResourceAsStream(filePath);

		Reader reader = new InputStreamReader(file);

		AbstractBankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);

		CsvToBean<AbstractBankAccountCsvTemplate> csvReader =
				new CsvToBeanBuilder<AbstractBankAccountCsvTemplate>(reader)
						.withType(template.getClass())
						.withSeparator(',')
						.withIgnoreLeadingWhiteSpace(true)
						.withIgnoreEmptyLine(true)
						.build();

		List<? extends AbstractBankAccountCsvTemplate> rawTransactions = csvReader.parse();

		List<Transactions> transactions =
				rawTransactions.stream().map(AbstractBankAccountCsvTemplate::toTransactions).collect(
						Collectors.toList());

		assertThat(transactions.size()).isGreaterThan(0);
		transactions.forEach(t -> {
					t.setAccountId(accountId);
					t.setAccountName(ACCOUNT_NAME_TEST1);
					t.setBankName(bankName.getName());
					t.setIsDuplicate(0);
				}
		);

		transactionService.create(transactions);

		List<Transactions> newTransactions = transactionService.retrieveByAccount(accountId);
		checkTransactions(transactions, newTransactions);
	}

	private Transactions makeTransactions(LocalDate date, String description, String category,
	                                      String uploadTime, BigDecimal amount) {
		Transactions transactions = new Transactions();
		transactions.setTransactionDate(date.minusDays(1));
		transactions.setPostDate(date);
		transactions.setDescription(description);
		transactions.setCategory(category);
		transactions.setUploadTime(uploadTime);
		transactions.setAmount(amount);
		return transactions;
	}

	private void checkTransactions(List<Transactions> oldTransactions,
	                               List<Transactions> newTransactions) {
		oldTransactions.sort((t1, t2) -> t1.getAmount().compareTo(t2.getAmount()));
		newTransactions.sort((t1, t2) -> t1.getAmount().compareTo(t2.getAmount()));

		for (int i = 0; i < oldTransactions.size(); i++) {
			Transactions t1 = oldTransactions.get(i);
			Transactions t2 = newTransactions.get(i);
			t1.setTransactionId(t2.getTransactionId());
			t1.setAmount(t1.getAmount().stripTrailingZeros());
			t2.setAmount(t2.getAmount().stripTrailingZeros());
			assertThat(t1).isEqualTo(t2);
		}
	}
}
