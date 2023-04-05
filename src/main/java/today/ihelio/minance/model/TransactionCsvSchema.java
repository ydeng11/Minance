package today.ihelio.minance.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import javax.persistence.Entity;

@Entity
public class TransactionCsvSchema extends PanacheEntity {
  private long bankId;
  private long accountId;
  private boolean useHeader;
  private String columnSeparator;
  private boolean skipFirstDataRow;
  private String columnNames;
  private String dataTypes;

  public TransactionCsvSchema() {
  }

  private TransactionCsvSchema(Builder builder) {
    this.bankId = builder.bankId;
    this.accountId = builder.accountId;
    this.useHeader = builder.useHeader;
    this.columnSeparator = builder.columnSeparator;
    this.skipFirstDataRow = builder.skipFirstDataRow;
    this.columnNames = builder.columnNames;
    this.dataTypes = builder.dataTypes;
  }

  public boolean isUseHeader() {
    return useHeader;
  }

  public void setUseHeader(boolean useHeader) {
    this.useHeader = useHeader;
  }

  public String getColumnSeparator() {
    return columnSeparator;
  }

  public void setColumnSeparator(String columnSeparator) {
    this.columnSeparator = columnSeparator;
  }

  public boolean isSkipFirstDataRow() {
    return skipFirstDataRow;
  }

  public void setSkipFirstDataRow(boolean skipFirstDataRow) {
    this.skipFirstDataRow = skipFirstDataRow;
  }

  public long getBankId() {
    return bankId;
  }

  public void setBankId(long bankId) {
    this.bankId = bankId;
  }

  public long getAccountId() {
    return accountId;
  }

  public void setAccountId(long accountId) {
    this.accountId = accountId;
  }

  public String getColumnNames() {
    return columnNames;
  }

  public void setColumnNames(String columnNames) {
    this.columnNames = columnNames;
  }

  public String getDataTypes() {
    return dataTypes;
  }

  public void setDataTypes(String dataTypes) {
    this.dataTypes = dataTypes;
  }

  public static class Builder {
    private long bankId;
    private long accountId;
    private boolean useHeader = true;
    private String columnSeparator = ",";
    private boolean skipFirstDataRow = false;
    private String columnNames;
    private String dataTypes;

    public Builder() {
    }

    public Builder withBankId(long bankId) {
      this.bankId = bankId;
      return this;
    }

    public Builder withAccountId(long accountId) {
      this.accountId = accountId;
      return this;
    }

    public Builder useHeader(boolean useHeader) {
      this.useHeader = useHeader;
      return this;
    }

    public Builder columnSeparator(String columnSeparator) {
      this.columnSeparator = columnSeparator;
      return this;
    }

    public Builder skipFirstDataRow(boolean skipFirstDataRow) {
      this.skipFirstDataRow = skipFirstDataRow;
      return this;
    }

    public Builder columnNames(String columnNames) {
      this.columnNames = columnNames;
      return this;
    }

    public Builder dataTypes(String dataTypes) {
      this.dataTypes = dataTypes;
      return this;
    }

    public TransactionCsvSchema build() {
      return new TransactionCsvSchema(this);
    }
  }
}
