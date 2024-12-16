package today.ihelio.minance.service;

import com.google.common.collect.ImmutableList;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.exception.DataAccessException;
import org.jooq.impl.DSL;
import today.ihelio.jooq.tables.MinanceCategory;
import today.ihelio.jooq.tables.RawCategoryToMinanceCategory;
import today.ihelio.jooq.tables.pojos.Transactions;
import today.ihelio.jooq.tables.records.TransactionsRecord;

import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static today.ihelio.jooq.Tables.TRANSACTIONS;

@ApplicationScoped
public class TransactionService {
	public static final List<Field<?>> INSERTABLE_FIELDS = ImmutableList.of(
			TRANSACTIONS.UPLOAD_TIME,
			TRANSACTIONS.ACCOUNT_ID,
			TRANSACTIONS.CATEGORY,
			TRANSACTIONS.DESCRIPTION,
			TRANSACTIONS.TRANSACTION_TYPE,
			TRANSACTIONS.TRANSACTION_DATE,
			TRANSACTIONS.POST_DATE,
			TRANSACTIONS.MEMO,
			TRANSACTIONS.AMOUNT,
			TRANSACTIONS.ADDRESS,
			TRANSACTIONS.BANK_NAME,
			TRANSACTIONS.ACCOUNT_NAME);
	private final DSLContext dslContext;

	@Inject
	public TransactionService(DSLContext dslContext) {
		this.dslContext = dslContext;
	}

	public int create(List<Transactions> transactionsList) throws SQLException {
		return dslContext.insertInto(TRANSACTIONS, INSERTABLE_FIELDS)
				.valuesOfRecords(transactionsList.stream().map(t -> {
					TransactionsRecord r = new TransactionsRecord(t);
					return r.into(
							TRANSACTIONS.UPLOAD_TIME,
							TRANSACTIONS.ACCOUNT_ID,
							TRANSACTIONS.CATEGORY,
							TRANSACTIONS.DESCRIPTION,
							TRANSACTIONS.TRANSACTION_TYPE,
							TRANSACTIONS.TRANSACTION_DATE,
							TRANSACTIONS.POST_DATE,
							TRANSACTIONS.MEMO,
							TRANSACTIONS.AMOUNT,
							TRANSACTIONS.ADDRESS,
							TRANSACTIONS.BANK_NAME,
							TRANSACTIONS.ACCOUNT_NAME);
				}).collect(Collectors.toList()))
				.onDuplicateKeyUpdate()
				.set(TRANSACTIONS.IS_DUPLICATE, 1)
				.execute();
	}

	public int update(Transactions transactions) throws SQLException {
		return dslContext.update(TRANSACTIONS)
				.set(TRANSACTIONS.UPLOAD_TIME, transactions.getUploadTime())
				.set(TRANSACTIONS.ACCOUNT_ID, transactions.getAccountId())
				.set(TRANSACTIONS.ACCOUNT_NAME, transactions.getAccountName())
				.set(TRANSACTIONS.BANK_NAME, transactions.getBankName())
				.set(TRANSACTIONS.DESCRIPTION, transactions.getDescription())
				.set(TRANSACTIONS.CATEGORY, transactions.getCategory())
				.set(TRANSACTIONS.TRANSACTION_TYPE, transactions.getTransactionType())
				.set(TRANSACTIONS.MEMO, transactions.getMemo())
				.set(TRANSACTIONS.POST_DATE, transactions.getPostDate())
				.set(TRANSACTIONS.TRANSACTION_DATE, transactions.getTransactionDate())
				.set(TRANSACTIONS.AMOUNT, transactions.getAmount())
				.set(TRANSACTIONS.ADDRESS, transactions.getAddress())
				.where(TRANSACTIONS.TRANSACTION_ID.eq(transactions.getTransactionId()))
				.execute();
	}

	public int delete(List<Integer> transactionIds) throws SQLException {
		return dslContext.delete(TRANSACTIONS)
				.where(TRANSACTIONS.TRANSACTION_ID.in(transactionIds))
				.execute();
	}

	public int deleteWithUploadTime(String uploadTime) throws SQLException {
		return dslContext.delete(TRANSACTIONS)
				.where(TRANSACTIONS.UPLOAD_TIME.eq(uploadTime))
				.execute();
	}

	public Optional<Transactions> retrieve(int transactionId) throws DataAccessException {
		return dslContext.select(TRANSACTIONS)
				.from(TRANSACTIONS)
				.where(TRANSACTIONS.TRANSACTION_ID.eq(transactionId))
				.fetchOptionalInto(Transactions.class);
	}

	public List<Transactions> retrieveByAccount(int accountId) throws DataAccessException {
		return dslContext.select(TRANSACTIONS)
				.from(TRANSACTIONS)
				.where(TRANSACTIONS.ACCOUNT_ID.eq(accountId))
				.orderBy(TRANSACTIONS.TRANSACTION_DATE)
				.fetchInto(Transactions.class);
	}

	public List<Transactions> retrieveDuplicate(Integer accountId) throws DataAccessException {
		return dslContext.select(TRANSACTIONS)
				.from(TRANSACTIONS)
				.where(TRANSACTIONS.IS_DUPLICATE.eq(1))
				.and(TRANSACTIONS.ACCOUNT_ID.eq(accountId))
				.orderBy(TRANSACTIONS.TRANSACTION_DATE)
				.fetchInto(Transactions.class);
	}

	public List<Transactions> retrieve() throws DataAccessException {
		return dslContext.select(
						TRANSACTIONS.TRANSACTION_ID,
						TRANSACTIONS.ACCOUNT_ID,
						TRANSACTIONS.ACCOUNT_NAME,
						TRANSACTIONS.BANK_NAME,
						TRANSACTIONS.DESCRIPTION,
						DSL.coalesce(MinanceCategory.MINANCE_CATEGORY.CATEGORY, TRANSACTIONS.CATEGORY).as(TRANSACTIONS.CATEGORY),
						TRANSACTIONS.TRANSACTION_TYPE,
						TRANSACTIONS.MEMO,
						TRANSACTIONS.POST_DATE,
						TRANSACTIONS.TRANSACTION_DATE,
						TRANSACTIONS.AMOUNT,
						TRANSACTIONS.ADDRESS,
						TRANSACTIONS.UPLOAD_TIME,
						TRANSACTIONS.IS_DUPLICATE)
				.from(TRANSACTIONS)
				.leftJoin(RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY)
				.on(TRANSACTIONS.CATEGORY.eq(RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY))
				.leftJoin(MinanceCategory.MINANCE_CATEGORY)
				.on(RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY.MINANCE_CATEGORY_ID.eq(MinanceCategory.MINANCE_CATEGORY.M_CATEGORY_ID))
				.orderBy(TRANSACTIONS.TRANSACTION_DATE)
				.limit(1000)
				.fetchInto(Transactions.class);
	}

	public List<Transactions> retrieveBetweenStartAndEnd(LocalDate start, LocalDate end) throws DataAccessException {
		return dslContext.select(
						TRANSACTIONS.TRANSACTION_ID,
						TRANSACTIONS.ACCOUNT_ID,
						TRANSACTIONS.ACCOUNT_NAME,
						TRANSACTIONS.BANK_NAME,
						TRANSACTIONS.DESCRIPTION,
						DSL.coalesce(MinanceCategory.MINANCE_CATEGORY.CATEGORY, TRANSACTIONS.CATEGORY).as(TRANSACTIONS.CATEGORY),
						TRANSACTIONS.TRANSACTION_TYPE,
						TRANSACTIONS.MEMO,
						TRANSACTIONS.POST_DATE,
						TRANSACTIONS.TRANSACTION_DATE,
						TRANSACTIONS.AMOUNT,
						TRANSACTIONS.ADDRESS,
						TRANSACTIONS.UPLOAD_TIME,
						TRANSACTIONS.IS_DUPLICATE)
				.from(TRANSACTIONS)
				.leftJoin(RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY)
				.on(TRANSACTIONS.CATEGORY.eq(RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY.RAW_CATEGORY))
				.leftJoin(MinanceCategory.MINANCE_CATEGORY)
				.on(RawCategoryToMinanceCategory.RAW_CATEGORY_TO_MINANCE_CATEGORY.MINANCE_CATEGORY_ID.eq(MinanceCategory.MINANCE_CATEGORY.M_CATEGORY_ID))
				.where(TRANSACTIONS.TRANSACTION_DATE.between(start, end))
				.orderBy(TRANSACTIONS.TRANSACTION_DATE)
				.fetchInto(Transactions.class);
	}

	public int clearTransactionsForAccount(int accountId) throws DataAccessException {
		return dslContext.delete(TRANSACTIONS)
				.where(TRANSACTIONS.ACCOUNT_ID.eq(accountId))
				.execute();
	}
}
