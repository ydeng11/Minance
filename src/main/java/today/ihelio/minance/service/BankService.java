package today.ihelio.minance.service;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import org.jooq.DSLContext;
import today.ihelio.jooq.tables.pojos.Banks;

import static today.ihelio.jooq.Tables.BANKS;

@ApplicationScoped
public class BankService {
  private final DSLContext dslContext;

  public BankService(DSLContext dslContext) {
    this.dslContext = dslContext;
  }

  public int create(Banks bank) {
    return dslContext.insertInto(BANKS, BANKS.BANK_NAME)
        .values(bank.getBankName())
        .onDuplicateKeyIgnore()
        .execute();
  }

  public int delete(String bankName) {
    return dslContext.delete(BANKS).where(BANKS.BANK_NAME.eq(bankName)).execute();
  }

  public int update(Banks banks) {
    return dslContext.update(BANKS)
        .set(BANKS.BANK_NAME, banks.getBankName())
        .where(BANKS.BANK_ID.eq(banks.getBankId()))
        .execute();
  }

  public Banks retrieve(int bankId) throws IllegalStateException {
    return dslContext.select(BANKS)
        .from(BANKS)
        .where(BANKS.BANK_ID.eq(bankId))
        .fetchOne()
        .into(Banks.class);
  }

  public List<Banks> retrieveAll() throws IllegalStateException {
    return dslContext.select(BANKS)
        .from(BANKS)
        .where(BANKS.BANK_NAME.isNotNull())
        .orderBy(BANKS.BANK_ID)
        .fetchInto(Banks.class);
  }

  public Banks findBankByName(String bankName) {
    return
        dslContext.select(BANKS)
            .from(BANKS)
            .where(BANKS.BANK_NAME.eq(bankName))
            .fetchOne()
            .into(Banks.class);
  }
}
