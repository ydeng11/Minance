package today.ihelio.minance.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jooq.DSLContext;
import org.jooq.exception.DataAccessException;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.jooq.tables.pojos.Banks;
import today.ihelio.minance.csvpojos.BankAccountPair;
import today.ihelio.minance.exception.CustomException;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import static today.ihelio.jooq.Tables.ACCOUNTS;

@ApplicationScoped
public class AccountService {
	private final DSLContext dslContext;
	private final BankService bankService;
	private final TransactionService transactionService;

	@Inject
	public AccountService(DSLContext dslContext, BankService bankService,
	                      TransactionService transactionService) {
		this.dslContext = dslContext;
		this.bankService = bankService;
		this.transactionService = transactionService;
	}

	public int create(Accounts account) throws CustomException {
		BankAccountPair.BankName bankName = BankAccountPair.BankName.validateAndGet(account.getBankName());

		Optional<Banks> banksOptional = bankService.findBankByName(bankName);
		Banks banks = banksOptional.orElseGet(() -> {
			try {
				bankService.create(bankName);
			} catch (SQLException e) {
				throw new IllegalStateException("Failed to create bank: " + bankName, e);
			}
			return bankService.findBankByName(bankName)
					.orElseThrow(() -> new IllegalStateException("Failed to create bank: " + bankName));
		});

		return dslContext.insertInto(ACCOUNTS, ACCOUNTS.BANK_ID, ACCOUNTS.BANK_NAME,
						ACCOUNTS.ACCOUNT_NAME, ACCOUNTS.ACCOUNT_TYPE, ACCOUNTS.INIT_BALANCE)
				.values(banks.getBankId(), account.getBankName(), account.getAccountName(),
						account.getAccountType(), account.getInitBalance())
				.onDuplicateKeyIgnore()
				.execute();
	}

	public int update(Accounts accounts) throws SQLException {
		return dslContext.update(ACCOUNTS)
				.set(ACCOUNTS.BANK_ID, accounts.getBankId())
				.set(ACCOUNTS.BANK_NAME, accounts.getBankName())
				.set(ACCOUNTS.ACCOUNT_NAME, accounts.getAccountName())
				.set(ACCOUNTS.ACCOUNT_TYPE, accounts.getAccountType())
				.set(ACCOUNTS.INIT_BALANCE, accounts.getInitBalance())
				.where(ACCOUNTS.ACCOUNT_ID.eq(accounts.getAccountId()))
				.execute();
	}

	public int delete(int accountId) throws DataAccessException {
		transactionService.clearTransactionsForAccount(accountId);
		return dslContext.delete(ACCOUNTS).where(ACCOUNTS.ACCOUNT_ID.eq(accountId)).execute();
	}

	public Optional<Accounts> retrieve(int accountId) throws DataAccessException {
		return dslContext
				.select(ACCOUNTS)
				.from(ACCOUNTS)
				.where(ACCOUNTS.ACCOUNT_ID.eq(accountId))
				.fetchOptionalInto(Accounts.class);
	}

	public List<Accounts> retrieveAll() throws DataAccessException {
		return dslContext.select(ACCOUNTS)
				.from(ACCOUNTS)
				.where(ACCOUNTS.ACCOUNT_NAME.isNotNull())
				.orderBy(ACCOUNTS.ACCOUNT_ID)
				.fetchInto(Accounts.class);
	}

	public Optional<Accounts> findAccountByBankAndAccountName(String bankName,
	                                                          String accountName)
			throws DataAccessException, CustomException {
		return bankService.findBankByName(BankAccountPair.BankName.validateAndGet(bankName))
				.flatMap(banks -> dslContext
						.select(ACCOUNTS)
						.from(ACCOUNTS)
						.where(ACCOUNTS.BANK_ID.eq(banks.getBankId())
								.and(ACCOUNTS.ACCOUNT_NAME.eq(accountName)))
						.fetchOptionalInto(Accounts.class));
	}

	public List<Accounts> retrieveAccountsByBank(BankAccountPair.BankName bankName)
			throws DataAccessException {
		return bankService.findBankByName(bankName)
				.map(banks -> dslContext
						.select(ACCOUNTS)
						.from(ACCOUNTS)
						.where(ACCOUNTS.BANK_ID.eq(banks.getBankId()))
						.orderBy(ACCOUNTS.ACCOUNT_ID)
						.fetchInto(Accounts.class))
				.orElse(List.of());
	}

	public int delete(String bankName, String accountName) throws SQLException, CustomException {
		return bankService.findBankByName(BankAccountPair.BankName.validateAndGet(bankName))
				.map(banks -> dslContext.delete(ACCOUNTS)
						.where(ACCOUNTS.ACCOUNT_NAME.eq(accountName))
						.and(ACCOUNTS.BANK_ID.eq(banks.getBankId()))
						.execute())
				.orElse(0); // Return 0 if bank not found (no rows deleted)
	}
}
