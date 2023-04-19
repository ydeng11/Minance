package today.ihelio.minance.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import javax.json.bind.annotation.JsonbTransient;
import javax.persistence.Entity;
import javax.persistence.JoinColumn;
import javax.persistence.OneToOne;

@Entity
public class TransactionCsvSchema extends PanacheEntity {
  @OneToOne
  @JoinColumn(name = "accountId")
  @JsonbTransient
  private Account account;
  private boolean useHeader;
  private String columnSeparator;
  private boolean skipFirstDataRow;
  private String
  private String columnMapping;

  public TransactionCsvSchema() {
  }

  private TransactionCsvSchema(Builder builder) {
    this.account = builder.account;
    this.useHeader = builder.useHeader;
    this.columnSeparator = builder.columnSeparator;
    this.skipFirstDataRow = builder.skipFirstDataRow;
    this.columnMapping = builder.columnMapping;
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

  public Account getAccount() {
    return account;
  }

  public void setAccount(Account account) {
    this.account = account;
  }

  public String getColumnMapping() {
    return columnMapping;
  }

  public void setColumnMapping(String columnMapping) {
    this.columnMapping = columnMapping;
  }

  public static class Builder {
    private Account account;
    private boolean useHeader = true;
    private String columnSeparator = ",";
    private boolean skipFirstDataRow = false;
    private String columnMapping;

    public Builder() {
    }

    public Builder withAccount(Account account) {
      this.account = account;
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

    public Builder columnMapping(String columnMapping) {
      this.columnMapping = columnMapping;
      return this;
    }

    public TransactionCsvSchema build() {
      return new TransactionCsvSchema(this);
    }
  }
}
