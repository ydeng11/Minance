package today.ihelio.minance.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

@Entity
@Table(name = "CsvSchemaColumnMapping")
public class CsvSchemaColumnMapping extends PanacheEntity {
  @ManyToOne(fetch = FetchType.LAZY, cascade = {CascadeType.MERGE})
  private TransactionCsvSchema transactionCsvSchema;
  private String columnName;
  private String mappedName;

  public TransactionCsvSchema getTransactionCsvSchema() {
    return transactionCsvSchema;
  }

  public void setTransactionCsvSchema(TransactionCsvSchema transactionCsvSchema) {
    this.transactionCsvSchema = transactionCsvSchema;
  }

  public String getColumnName() {
    return columnName;
  }

  public void setColumnName(String columnName) {
    this.columnName = columnName;
  }

  public String getMappedName() {
    return mappedName;
  }

  public void setMappedName(String mappedName) {
    this.mappedName = mappedName;
  }
}
