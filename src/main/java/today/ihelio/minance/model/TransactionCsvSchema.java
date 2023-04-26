package today.ihelio.minance.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.Table;
import org.codehaus.jackson.annotate.JsonIgnore;

@Entity
@Table(name = "TransactionCsvSchema")
public class TransactionCsvSchema extends PanacheEntity {
  @OneToOne
  private Account account;
  private boolean useHeader;
  private char columnSeparator;
  private boolean skipFirstDataRow;
  @OneToMany(mappedBy = "transactionCsvSchema", cascade = CascadeType.ALL, orphanRemoval = true)
  @JsonIgnore
  private List<CsvSchemaColumnMapping> csvSchemaColumnMappings;

  public TransactionCsvSchema() {
  }

  private TransactionCsvSchema(Builder builder) {
    this.account = builder.account;
    this.useHeader = builder.useHeader;
    this.columnSeparator = builder.columnSeparator;
    this.skipFirstDataRow = builder.skipFirstDataRow;
    this.csvSchemaColumnMappings = builder.csvSchemaColumnMappings;
  }

  public boolean isUseHeader() {
    return useHeader;
  }

  public void setUseHeader(boolean useHeader) {
    this.useHeader = useHeader;
  }

  public char getColumnSeparator() {
    return columnSeparator;
  }

  public void setColumnSeparator(char columnSeparator) {
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

  public static class Builder {
    private Account account;
    private boolean useHeader = true;
    private char columnSeparator = ',';
    private boolean skipFirstDataRow = false;
    private List<CsvSchemaColumnMapping> csvSchemaColumnMappings;

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

    public Builder columnSeparator(char columnSeparator) {
      this.columnSeparator = columnSeparator;
      return this;
    }

    public Builder skipFirstDataRow(boolean skipFirstDataRow) {
      this.skipFirstDataRow = skipFirstDataRow;
      return this;
    }

    public Builder withColumnMapping(List<CsvSchemaColumnMapping> csvSchemaColumnMappings) {
      this.csvSchemaColumnMappings = csvSchemaColumnMappings;
      return this;
    }

    public TransactionCsvSchema build() {
      return new TransactionCsvSchema(this);
    }
  }
}
