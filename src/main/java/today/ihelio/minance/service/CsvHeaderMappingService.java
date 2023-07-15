package today.ihelio.minance.service;

import com.google.common.base.Preconditions;
import io.smallrye.common.constraint.Nullable;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.NotFoundException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.jooq.DSLContext;
import org.jooq.exception.DataAccessException;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.jooq.tables.pojos.CsvColumnMapping;
import today.ihelio.jooq.tables.records.CsvColumnMappingRecord;
import today.ihelio.minance.exception.RecordAlreadyExistingException;
import today.ihelio.minance.pojos.CsvHeaderMapping;
import today.ihelio.minance.pojos.HeaderMapping;

import static today.ihelio.jooq.Tables.CSV_COLUMN_MAPPING;

@ApplicationScoped
public class CsvHeaderMappingService {
  private static final String DEFAULT_DATEFORMAT = "MM/dd/yyyy";
  private final DSLContext dslContext;
  private final AccountService accountService;

  @Inject
  public CsvHeaderMappingService(DSLContext dslContext, AccountService accountService) {
    this.dslContext = dslContext;
    this.accountService = accountService;
  }

  public void store(CsvHeaderMapping csvHeaderMapping) throws RecordAlreadyExistingException,
      DataAccessException {
    if (isDuplicate(csvHeaderMapping)) {
      throw new RecordAlreadyExistingException("the csv header already existing for account id " +
          csvHeaderMapping.accountId);
    }

    List<CsvColumnMappingRecord> records = dslContext.fetch(CSV_COLUMN_MAPPING);

    csvHeaderMapping.columnMapping.forEach((item) -> {
      CsvColumnMappingRecord record = new CsvColumnMappingRecord();
      record.setAccountId(csvHeaderMapping.accountId);
      record.setDateFormat(csvHeaderMapping.dateFormat);
      record.setInputColumn(item.inputColumn);
      record.setTransactionColumn(item.transactionColumn);
      records.add(record);
    });
    dslContext.batchStore(records).execute();
  }

  public void update(CsvHeaderMapping csvHeaderMapping) throws DataAccessException {
    delete(csvHeaderMapping.accountId);
    try {
      store(csvHeaderMapping);
    } catch (Exception ignore) {
    }
  }

  public CsvHeaderMapping retrieve(Integer accountId) throws IllegalStateException {
    List<CsvColumnMappingRecord> records = dslContext
        .select(CSV_COLUMN_MAPPING)
        .from(CSV_COLUMN_MAPPING)
        .where(CSV_COLUMN_MAPPING.ACCOUNT_ID.eq(accountId)).fetchInto(CSV_COLUMN_MAPPING);
    Preconditions.checkState(records.size() > 0, "no records are found for account id: %s",
        accountId);
    String dateFormat = records.get(0).getDateFormat();
    List<HeaderMapping> headerMapping = new ArrayList<>();
    records.forEach(
        (r) -> headerMapping.add(new HeaderMapping(r.getInputColumn(), r.getTransactionColumn())));
    return new CsvHeaderMapping(0, accountId, dateFormat, headerMapping);
  }

  public int delete(Integer accountId) {
    return dslContext.delete(CSV_COLUMN_MAPPING)
        .where(CSV_COLUMN_MAPPING.ACCOUNT_ID.eq(accountId))
        .execute();
  }

  private boolean isDuplicate(CsvHeaderMapping csvHeaderMapping) {
    return dslContext
        .select()
        .from(CSV_COLUMN_MAPPING)
        .where(CSV_COLUMN_MAPPING.ACCOUNT_ID.eq(csvHeaderMapping.accountId))
        .limit(1)
        .fetchOne() != null;
  }

  public CsvHeaderMapping retrieveByBankAndAccount(String bankName, String accountName) {
    Accounts accounts = accountService.findAccountByBankAndAccountName(bankName, accountName);
    if (accounts == null) {
      throw new NotFoundException("the account is not found");
    }
    List<CsvColumnMapping> records = dslContext
        .select(CSV_COLUMN_MAPPING)
        .from(CSV_COLUMN_MAPPING)
        .where(CSV_COLUMN_MAPPING.ACCOUNT_ID.eq(accounts.getAccountId()))
        .fetchInto(CsvColumnMapping.class);
    Preconditions.checkState(records.size() > 0, "no schema mapping created.");
    List<HeaderMapping> headerMapping = new ArrayList<>();
    String dateFormat = records.get(0).getDateFormat();
    records.forEach(
        (r) -> headerMapping.add(new HeaderMapping(r.getInputColumn(), r.getTransactionColumn())));
    return new CsvHeaderMapping(0, accounts.getAccountId(), dateFormat, headerMapping);
  }

  @Nullable
  public DateTimeFormatter retrieveDateFormat(int accountId) {
    String dateFormat = dslContext.select(CSV_COLUMN_MAPPING.DATE_FORMAT)
        .from(CSV_COLUMN_MAPPING)
        .where(CSV_COLUMN_MAPPING.ACCOUNT_ID.eq(accountId))
        .limit(1)
        .fetch()
        .getValue(0, CSV_COLUMN_MAPPING.DATE_FORMAT);
    if (dateFormat == null) {
      return DateTimeFormatter.ofPattern(DEFAULT_DATEFORMAT);
    }
    return DateTimeFormatter.ofPattern(dateFormat);
  }
}
