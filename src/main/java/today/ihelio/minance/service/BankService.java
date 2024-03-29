package today.ihelio.minance.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.sql.SQLException;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.jooq.DSLContext;
import org.jooq.exception.DataAccessException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import today.ihelio.jooq.tables.pojos.Banks;
import today.ihelio.minance.csvpojos.BankAccountPair;

import static today.ihelio.jooq.Tables.BANKS;

@ApplicationScoped
public class BankService {
  private final DSLContext dslContext;
  private final Flyway flyway;

  @Inject
  public BankService(DSLContext dslContext, Flyway flyway) {
    this.dslContext = dslContext;
    this.flyway = flyway;
  }

  @BeforeEach
  void setUp() {
    flyway.migrate();
  }

  @AfterEach
  void clean() {
    flyway.clean();
  }

  public int create(BankAccountPair.BankName bank) throws SQLException {
    return dslContext.insertInto(BANKS, BANKS.BANK_NAME)
        .values(bank.getName())
        .onDuplicateKeyIgnore()
        .execute();
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

  public Banks retrieve(int bankId) throws DataAccessException {
    return dslContext.select(BANKS)
        .from(BANKS)
        .where(BANKS.BANK_ID.eq(bankId))
        .fetchOne()
        .into(Banks.class);
  }

  public List<Banks> retrieveAll() throws DataAccessException {
    return dslContext.select(BANKS)
        .from(BANKS)
        .where(BANKS.BANK_NAME.isNotNull())
        .orderBy(BANKS.BANK_ID)
        .fetchInto(Banks.class);
  }

  public Banks findBankByName(BankAccountPair.BankName bankName) throws DataAccessException {
    return
        dslContext.select(BANKS)
            .from(BANKS)
            .where(BANKS.BANK_NAME.eq(bankName.getName()))
            .fetchOneInto(Banks.class);
  }
}
