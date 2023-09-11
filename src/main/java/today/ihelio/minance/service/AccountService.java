package today.ihelio.minance.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.sql.SQLException;
import java.util.List;
import org.jooq.DSLContext;
import org.jooq.exception.DataAccessException;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.jooq.tables.pojos.Banks;
import today.ihelio.minance.csvpojos.BankAccountPair;
import today.ihelio.minance.exception.CustomException;

import static today.ihelio.jooq.Tables.ACCOUNTS;

@ApplicationScoped
public class AccountService {
  private final DSLContext dslContext;
  private final BankService bankService;

  @Inject
  public AccountService(DSLContext dslContext, BankService bankService) {
    this.dslContext = dslContext;
    this.bankService = bankService;
  }

  public int create(Accounts account) throws SQLException,
      CustomException {
    BankAccountPair.BankName bankName;
    try {
      bankName = BankAccountPair.BankName.valueOf(account.getBankName());
    } catch (IllegalArgumentException e) {
      throw CustomException.from(
          new IllegalArgumentException(account.getBankName() + " is not allowed!", e));
    }
    Banks banks = bankService.findBankByName(bankName);
    if (banks == null) {
      bankService.create(bankName);
      banks = bankService.findBankByName(bankName);
    }
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

  public int delete(int accountId) throws SQLException {
    return dslContext.delete(ACCOUNTS).where(ACCOUNTS.ACCOUNT_ID.eq(accountId)).execute();
  }

  public Accounts retrieve(int accountId) throws DataAccessException {
    return dslContext
        .select(ACCOUNTS)
        .from(ACCOUNTS)
        .where(ACCOUNTS.ACCOUNT_ID.eq(accountId))
        .fetchOne().into(Accounts.class);
  }

  public List<Accounts> retrieveAll() throws DataAccessException {
    return dslContext.select(ACCOUNTS)
        .from(ACCOUNTS)
        .where(ACCOUNTS.ACCOUNT_NAME.isNotNull())
        .orderBy(ACCOUNTS.ACCOUNT_ID)
        .fetchInto(Accounts.class);
  }

  public Accounts findAccountByBankTypeAccountName(String bankName, String accountType,
      String accountName)
      throws DataAccessException {
    Banks banks = bankService.findBankByName(BankAccountPair.BankName.valueOf(bankName));
    return dslContext
        .select(ACCOUNTS)
        .from(ACCOUNTS)
        .where(ACCOUNTS.BANK_ID.eq(banks.getBankId())
            .and(ACCOUNTS.ACCOUNT_TYPE.eq(accountType))
            .and(ACCOUNTS.ACCOUNT_NAME.eq(accountName)))
        .fetchOne().into(Accounts.class);
  }

  public List<Accounts> retrieveAccountsByBank(BankAccountPair.BankName bankName)
      throws DataAccessException {
    Banks banks = bankService.findBankByName(bankName);
    return dslContext
        .select(ACCOUNTS)
        .from(ACCOUNTS)
        .where(ACCOUNTS.BANK_ID.eq(banks.getBankId()))
        .orderBy(ACCOUNTS.ACCOUNT_ID)
        .fetchInto(Accounts.class);
  }

  public int delete(String bankName, String accountName) throws SQLException {
    Banks banks = bankService.findBankByName(BankAccountPair.BankName.valueOf(bankName));
    return dslContext.delete(ACCOUNTS)
        .where(ACCOUNTS.ACCOUNT_NAME.eq(accountName)).and(ACCOUNTS.BANK_ID.eq(banks.getBankId()))
        .execute();
  }
}
