package today.ihelio.minance.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jooq.DSLContext;
import org.jooq.exception.DataAccessException;
import today.ihelio.jooq.tables.pojos.Banks;
import today.ihelio.minance.csvpojos.BankAccountPair;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import static today.ihelio.jooq.Tables.BANKS;

@ApplicationScoped
public class BankService {
	private final DSLContext dslContext;

	@Inject
	public BankService(DSLContext dslContext) {
		this.dslContext = dslContext;
	}

	public Optional<Banks> create(BankAccountPair.BankName bank) throws SQLException {
		return Optional.ofNullable(dslContext.insertInto(BANKS, BANKS.BANK_NAME)
				.values(bank.getName())
				.onDuplicateKeyIgnore()
				.returning()
				.fetchOneInto(Banks.class));
	}

	public int delete(BankAccountPair.BankName bank) throws SQLException {
		return dslContext.delete(BANKS).where(BANKS.BANK_NAME.eq(bank.getName())).execute();
	}

	public int update(Banks banks) throws SQLException {
		return dslContext.update(BANKS)
				.set(BANKS.BANK_NAME, banks.getBankName())
				.where(BANKS.BANK_ID.eq(banks.getBankId()))
				.execute();
	}

	public Optional<Banks> retrieve(int bankId) throws DataAccessException {
		return dslContext.select(BANKS)
				.from(BANKS)
				.where(BANKS.BANK_ID.eq(bankId))
				.fetchOptionalInto(Banks.class);
	}

	public List<Banks> retrieveAll() throws DataAccessException {
		return dslContext.select(BANKS)
				.from(BANKS)
				.where(BANKS.BANK_NAME.isNotNull())
				.orderBy(BANKS.BANK_ID)
				.fetchInto(Banks.class);
	}

	public Optional<Banks> findBankByName(BankAccountPair.BankName bankName) throws DataAccessException {
		return Optional.ofNullable(
				dslContext.select(BANKS)
						.from(BANKS)
						.where(BANKS.BANK_NAME.eq(bankName.getName()))
						.fetchOneInto(Banks.class)
		);
	}
}
