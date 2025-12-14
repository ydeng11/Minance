package today.ihelio.minance.rest;

import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.exception.DataAccessException;
import today.ihelio.minance.rest.dto.OverviewSummaryDTO;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static today.ihelio.jooq.Tables.ACCOUNTS;
import static today.ihelio.jooq.Tables.TRANSACTIONS;

@Path("/1.0/minance/overview")
@Produces(MediaType.APPLICATION_JSON)
@Singleton
public class OverviewResource {
    private final DSLContext dslContext;

    @Inject
    public OverviewResource(DSLContext dslContext) {
        this.dslContext = dslContext;
    }

    @GET
    @Path("/summary")
    public Response getOverviewSummary(
            @QueryParam("startDate") String startDateStr,
            @QueryParam("endDate") String endDateStr) throws DataAccessException {

        LocalDate endDate = endDateStr != null ? LocalDate.parse(endDateStr) : LocalDate.now();
        LocalDate startDate = startDateStr != null ? LocalDate.parse(startDateStr) : endDate.minusMonths(1);

        // Calculate previous period for comparison
        long daysBetween = ChronoUnit.DAYS.between(startDate, endDate);
        LocalDate previousEndDate = startDate.minusDays(1);
        LocalDate previousStartDate = previousEndDate.minusDays(daysBetween);

        // Get current period statistics
        OverviewPeriodStats currentStats = calculatePeriodStats(startDate, endDate);

        // Get previous period statistics
        OverviewPeriodStats previousStats = calculatePeriodStats(previousStartDate, previousEndDate);

        // Calculate changes
        BigDecimal totalExpensesChangePercent = calculatePercentChange(
                previousStats.totalExpenses, currentStats.totalExpenses);
        BigDecimal creditChangePercent = calculatePercentChange(
                previousStats.creditTotal, currentStats.creditTotal);
        BigDecimal debitChangePercent = calculatePercentChange(
                previousStats.debitTotal, currentStats.debitTotal);
        long transactionChangeCount = currentStats.transactionCount - previousStats.transactionCount;

        OverviewSummaryDTO summary = new OverviewSummaryDTO(
                currentStats.totalExpenses,
                totalExpensesChangePercent,
                currentStats.creditTotal,
                creditChangePercent,
                currentStats.debitTotal,
                debitChangePercent,
                currentStats.transactionCount,
                transactionChangeCount);

        return Response.status(Response.Status.OK).entity(summary).build();
    }

    private OverviewPeriodStats calculatePeriodStats(LocalDate startDate, LocalDate endDate) {
        // Get all transactions in the period with account type
        var result = dslContext
                .select(
                        TRANSACTIONS.AMOUNT,
                        ACCOUNTS.ACCOUNT_TYPE)
                .from(TRANSACTIONS)
                .join(ACCOUNTS)
                .on(TRANSACTIONS.ACCOUNT_ID.eq(ACCOUNTS.ACCOUNT_ID))
                .where(TRANSACTIONS.TRANSACTION_DATE.between(startDate, endDate))
                .fetch();

        BigDecimal totalExpenses = BigDecimal.ZERO;
        BigDecimal creditTotal = BigDecimal.ZERO;
        BigDecimal debitTotal = BigDecimal.ZERO;
        long transactionCount = result.size();

        for (Record record : result) {
            BigDecimal amount = record.get(TRANSACTIONS.AMOUNT);
            String accountType = record.get(ACCOUNTS.ACCOUNT_TYPE);

            if (amount == null) {
                continue;
            }

            // Total expenses: sum of all POSITIVE amounts (charges, debits, bills, purchases)
            // NEGATIVE amounts are payments/transfers/income
            if (amount.compareTo(BigDecimal.ZERO) > 0) {
                totalExpenses = totalExpenses.add(amount);
            }

            // Credit total: sum of all amounts from CREDIT accounts
            if ("CREDIT".equalsIgnoreCase(accountType)) {
                creditTotal = creditTotal.add(amount);
            }

            // Debit total: sum of all amounts from DEBIT accounts
            if ("DEBIT".equalsIgnoreCase(accountType)) {
                debitTotal = debitTotal.add(amount);
            }
        }

        return new OverviewPeriodStats(totalExpenses, creditTotal, debitTotal, transactionCount);
    }

    private BigDecimal calculatePercentChange(BigDecimal previous, BigDecimal current) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            if (current == null || current.compareTo(BigDecimal.ZERO) == 0) {
                return BigDecimal.ZERO;
            }
            return BigDecimal.valueOf(100.0);
        }

        if (current == null) {
            current = BigDecimal.ZERO;
        }

        BigDecimal change = current.subtract(previous);
        return change.divide(previous.abs(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(1, RoundingMode.HALF_UP);
    }

    private static class OverviewPeriodStats {
        final BigDecimal totalExpenses;
        final BigDecimal creditTotal;
        final BigDecimal debitTotal;
        final long transactionCount;

        OverviewPeriodStats(BigDecimal totalExpenses, BigDecimal creditTotal,
                BigDecimal debitTotal, long transactionCount) {
            this.totalExpenses = totalExpenses != null ? totalExpenses : BigDecimal.ZERO;
            this.creditTotal = creditTotal != null ? creditTotal : BigDecimal.ZERO;
            this.debitTotal = debitTotal != null ? debitTotal : BigDecimal.ZERO;
            this.transactionCount = transactionCount;
        }
    }
}
