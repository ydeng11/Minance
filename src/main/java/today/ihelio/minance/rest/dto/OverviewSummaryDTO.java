package today.ihelio.minance.rest.dto;

import java.math.BigDecimal;

public class OverviewSummaryDTO {
    private BigDecimal totalExpenses;
    private BigDecimal totalExpensesChangePercent;
    private BigDecimal creditTotal;
    private BigDecimal creditChangePercent;
    private BigDecimal debitTotal;
    private BigDecimal debitChangePercent;
    private Long transactionCount;
    private Long transactionChangeCount;

    public OverviewSummaryDTO() {
    }

    public OverviewSummaryDTO(BigDecimal totalExpenses, BigDecimal totalExpensesChangePercent,
            BigDecimal creditTotal, BigDecimal creditChangePercent,
            BigDecimal debitTotal, BigDecimal debitChangePercent,
            Long transactionCount, Long transactionChangeCount) {
        this.totalExpenses = totalExpenses;
        this.totalExpensesChangePercent = totalExpensesChangePercent;
        this.creditTotal = creditTotal;
        this.creditChangePercent = creditChangePercent;
        this.debitTotal = debitTotal;
        this.debitChangePercent = debitChangePercent;
        this.transactionCount = transactionCount;
        this.transactionChangeCount = transactionChangeCount;
    }

    public BigDecimal getTotalExpenses() {
        return totalExpenses;
    }

    public void setTotalExpenses(BigDecimal totalExpenses) {
        this.totalExpenses = totalExpenses;
    }

    public BigDecimal getTotalExpensesChangePercent() {
        return totalExpensesChangePercent;
    }

    public void setTotalExpensesChangePercent(BigDecimal totalExpensesChangePercent) {
        this.totalExpensesChangePercent = totalExpensesChangePercent;
    }

    public BigDecimal getCreditTotal() {
        return creditTotal;
    }

    public void setCreditTotal(BigDecimal creditTotal) {
        this.creditTotal = creditTotal;
    }

    public BigDecimal getCreditChangePercent() {
        return creditChangePercent;
    }

    public void setCreditChangePercent(BigDecimal creditChangePercent) {
        this.creditChangePercent = creditChangePercent;
    }

    public BigDecimal getDebitTotal() {
        return debitTotal;
    }

    public void setDebitTotal(BigDecimal debitTotal) {
        this.debitTotal = debitTotal;
    }

    public BigDecimal getDebitChangePercent() {
        return debitChangePercent;
    }

    public void setDebitChangePercent(BigDecimal debitChangePercent) {
        this.debitChangePercent = debitChangePercent;
    }

    public Long getTransactionCount() {
        return transactionCount;
    }

    public void setTransactionCount(Long transactionCount) {
        this.transactionCount = transactionCount;
    }

    public Long getTransactionChangeCount() {
        return transactionChangeCount;
    }

    public void setTransactionChangeCount(Long transactionChangeCount) {
        this.transactionChangeCount = transactionChangeCount;
    }
}
