package today.ihelio.minance.testutil;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.jooq.DSLContext;
import org.jooq.exception.DataAccessException;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import today.ihelio.jooq.Tables;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.jooq.tables.pojos.Banks;
import today.ihelio.jooq.tables.pojos.Transactions;
import today.ihelio.minance.csvpojos.BankAccountPair;
import today.ihelio.minance.exception.CustomException;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;
import today.ihelio.minance.service.CategoryMappingService;
import today.ihelio.minance.service.TransactionService;

@ApplicationScoped
public class TestDataResource {

    @Inject
    DSLContext dsl;

    @Inject
    BankService bankService;

    @Inject
    AccountService accountService;

    @Inject
    TransactionService transactionService;

    @Inject
    CategoryMappingService categoryMappingService;

    @Transactional
    public void resetDatabase() {
        performReset();
    }

    private void performReset() {
        // Delete data in reverse dependency order - using DSL as services don't provide
        // batch deletion
        dsl.deleteFrom(Tables.TRANSACTIONS).execute();
        dsl.deleteFrom(Tables.ACCOUNTS).execute();
        dsl.deleteFrom(Tables.BANKS).execute();
        dsl.deleteFrom(Tables.RAW_CATEGORY_TO_MINANCE_CATEGORY).execute();
        dsl.deleteFrom(Tables.MINANCE_CATEGORY).execute();
    }

    @Transactional
    public void seedDatabase() {
        seedReferenceDataset();
    }

    @Transactional
    public void seedExtensiveDatabase() {
        // Reset first to ensure clean state
        performReset();

        // 1. Create Bank using service
        var bankName = "Test Bank";
        Banks bank;
        try {
            bank = bankService.create(BankAccountPair.BankName.validateAndGet(bankName))
                    .orElseGet(() -> {
                        try {
                            return bankService
                                    .findBankByName(BankAccountPair.BankName
                                            .validateAndGet(bankName))
                                    .orElseThrow(() -> new IllegalStateException(
                                            "Failed to create/find bank: "
                                                    + bankName));
                        } catch (DataAccessException | CustomException e) {
                            throw new IllegalStateException(
                                    "Failed to find bank: " + bankName, e);
                        }
                    });
        } catch (SQLException | CustomException e) {
            throw new IllegalStateException("Failed to create bank: " + bankName, e);
        }

        Integer bankId = bank.getBankId();

        // 2. Delete existing accounts for this bank (using DSL as service doesn't
        // provide this)
        dsl.deleteFrom(Tables.ACCOUNTS)
                .where(Tables.ACCOUNTS.BANK_NAME.eq(bankName))
                .execute();

        // 3. Create Accounts using service
        Accounts checkingAccount = new Accounts();
        checkingAccount.setBankId(bankId);
        checkingAccount.setBankName(bankName);
        checkingAccount.setAccountName("Checking");
        checkingAccount.setAccountType("Checking");
        checkingAccount.setInitBalance(BigDecimal.valueOf(5000.00));
        try {
            accountService.create(checkingAccount);
        } catch (CustomException e) {
            throw new IllegalStateException("Failed to create checking account", e);
        }

        Accounts savingsAccount = new Accounts();
        savingsAccount.setBankId(bankId);
        savingsAccount.setBankName("Test Bank");
        savingsAccount.setAccountName("Savings");
        savingsAccount.setAccountType("Savings");
        savingsAccount.setInitBalance(BigDecimal.valueOf(10000.00));
        try {
            accountService.create(savingsAccount);
        } catch (CustomException e) {
            throw new IllegalStateException("Failed to create savings account", e);
        }

        // Get account IDs using DSL (service doesn't provide find by name directly)
        Integer checkingId = dsl.select(Tables.ACCOUNTS.ACCOUNT_ID)
                .from(Tables.ACCOUNTS)
                .where(Tables.ACCOUNTS.ACCOUNT_NAME.eq("Checking")
                        .and(Tables.ACCOUNTS.BANK_NAME.eq(bankName)))
                .fetchOne(Tables.ACCOUNTS.ACCOUNT_ID);

        // 4. Create Transactions using service
        var today = LocalDate.now();
        List<Transactions> transactions = new java.util.ArrayList<>();

        // Generate transactions for the last 30 days
        for (int i = 0; i < 30; i++) {
            Transactions transaction = new Transactions();
            transaction.setAccountId(checkingId);
            transaction.setAccountName("Checking");
            transaction.setBankName("Test Bank");
            transaction.setTransactionDate(today.minusDays(i));
            transaction.setAmount(BigDecimal.valueOf(-10.00 - i));
            transaction.setDescription("Daily Expense " + i);
            transaction.setCategory(i % 2 == 0 ? "Food" : "Transport");
            transaction.setTransactionType("DEBIT");
            transactions.add(transaction);
        }

        // Monthly Salary
        Transactions salaryTransaction = new Transactions();
        salaryTransaction.setAccountId(checkingId);
        salaryTransaction.setAccountName("Checking");
        salaryTransaction.setBankName("Test Bank");
        salaryTransaction.setTransactionDate(today.withDayOfMonth(1));
        salaryTransaction.setAmount(BigDecimal.valueOf(3000.00));
        salaryTransaction.setDescription("Salary");
        salaryTransaction.setCategory("Income");
        salaryTransaction.setTransactionType("CREDIT");
        transactions.add(salaryTransaction);

        try {
            transactionService.create(transactions);
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to create transactions", e);
        }
    }

    private void seedReferenceDataset() {
        Map<String, Integer> bankIds = createBanks();
        Map<String, Integer> accountIds = createAccounts(bankIds);
        insertTransactions(accountIds);
        seedMinanceCategories();
    }

    private Map<String, Integer> createBanks() {
        Set<String> bankNames = ACCOUNT_SEEDS.stream()
                .map(AccountSeed::bankName)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<String, Integer> bankIds = new HashMap<>();
        for (String bankName : bankNames) {
            try {
                Banks bank = bankService.create(BankAccountPair.BankName.validateAndGet(bankName))
                        .orElseGet(() -> {
                            try {
                                return bankService.findBankByName(
                                        BankAccountPair.BankName.validateAndGet(
                                                bankName))
                                        .orElseThrow(() -> new IllegalStateException(
                                                "Failed to create/find bank: "
                                                        + bankName));
                            } catch (DataAccessException | CustomException e) {
                                throw new IllegalStateException(
                                        "Failed to find bank: " + bankName, e);
                            }
                        });
                bankIds.put(bankName, bank.getBankId());
            } catch (SQLException | CustomException e) {
                throw new IllegalStateException("Failed to create bank: " + bankName, e);
            }
        }
        return bankIds;
    }

    private Map<String, Integer> createAccounts(Map<String, Integer> bankIds) {
        Map<String, Integer> accountIds = new HashMap<>();
        for (AccountSeed seed : ACCOUNT_SEEDS) {
            Integer bankId = bankIds.get(seed.bankName());
            Accounts account = new Accounts();
            account.setBankId(bankId);
            account.setBankName(seed.bankName());
            account.setAccountName(seed.accountName());
            account.setAccountType(seed.accountType());
            account.setInitBalance(seed.initBalance());
            try {
                accountService.create(account);
            } catch (CustomException e) {
                throw new IllegalStateException("Failed to create account: " + seed.accountName(), e);
            }
            // Get account ID using DSL (service doesn't provide find by name directly)
            Integer accountId = dsl.select(Tables.ACCOUNTS.ACCOUNT_ID)
                    .from(Tables.ACCOUNTS)
                    .where(Tables.ACCOUNTS.ACCOUNT_NAME.eq(seed.accountName())
                            .and(Tables.ACCOUNTS.BANK_NAME.eq(seed.bankName())))
                    .fetchOne(Tables.ACCOUNTS.ACCOUNT_ID);
            accountIds.put(accountKey(seed.bankName(), seed.accountName()), accountId);
        }
        return accountIds;
    }

    private void insertTransactions(Map<String, Integer> accountIds) {
        List<Transactions> allTransactions = new java.util.ArrayList<>();
        for (AccountSeed accountSeed : ACCOUNT_SEEDS) {
            Integer accountId = accountIds
                    .get(accountKey(accountSeed.bankName(), accountSeed.accountName()));
            for (TransactionSeed transactionSeed : accountSeed.transactions()) {
                Transactions transaction = new Transactions();
                transaction.setAccountId(accountId);
                transaction.setAccountName(accountSeed.accountName());
                transaction.setBankName(accountSeed.bankName());
                transaction.setTransactionDate(transactionSeed.date());
                transaction.setAmount(transactionSeed.amount());
                transaction.setDescription(transactionSeed.description());
                transaction.setCategory(transactionSeed.category());
                transaction.setTransactionType(transactionSeed.transactionType());
                allTransactions.add(transaction);
            }
        }
        try {
            transactionService.create(allTransactions);
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to create transactions", e);
        }
    }

    private void seedMinanceCategories() {
        // Create categories using service
        for (String category : MINANCE_CATEGORIES) {
            try {
                categoryMappingService.createNewMinanceCategory(category);
            } catch (DataAccessException e) {
                throw new IllegalStateException("Failed to create category: " + category, e);
            }
        }

        // Get category IDs using DSL (service doesn't provide direct lookup)
        Map<String, Integer> categoryIds = dsl
                .select(Tables.MINANCE_CATEGORY.CATEGORY, Tables.MINANCE_CATEGORY.M_CATEGORY_ID)
                .from(Tables.MINANCE_CATEGORY)
                .fetch()
                .stream()
                .collect(Collectors.toMap(
                        record -> record.get(Tables.MINANCE_CATEGORY.CATEGORY),
                        record -> record.get(Tables.MINANCE_CATEGORY.M_CATEGORY_ID)));

        // Link categories using service
        CATEGORY_LINKS.forEach((category, rawCategories) -> {
            Integer categoryId = categoryIds.get(category);
            if (categoryId == null) {
                return;
            }
            try {
                categoryMappingService.linkToMinanceCategory(category, rawCategories);
            } catch (DataAccessException | CustomException e) {
                throw new IllegalStateException("Failed to link categories for: " + category, e);
            }
        });
    }

    public void seedE2EDatabase() {
        performReset();

        // Create MINANCE bank using service
        Banks bank;
        try {
            bank = bankService.create(BankAccountPair.BankName.MINANCE)
                    .orElseGet(() -> {
                        try {
                            return bankService.findBankByName(
                                    BankAccountPair.BankName.MINANCE)
                                    .orElseThrow(() -> new IllegalStateException(
                                            "Failed to create/find MINANCE bank"));
                        } catch (DataAccessException e) {
                            throw new IllegalStateException("Failed to find MINANCE bank",
                                    e);
                        }
                    });
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to create MINANCE bank", e);
        }

        Integer bankId = bank.getBankId();

        // Create accounts using service
        Accounts creditAccount = new Accounts();
        creditAccount.setBankId(bankId);
        creditAccount.setBankName("MINANCE");
        creditAccount.setAccountName("Test Credit");
        creditAccount.setAccountType("CREDIT");
        creditAccount.setInitBalance(BigDecimal.ZERO);
        try {
            accountService.create(creditAccount);
        } catch (CustomException e) {
            throw new IllegalStateException("Failed to create credit account", e);
        }

        Accounts debitAccount = new Accounts();
        debitAccount.setBankId(bankId);
        debitAccount.setBankName("MINANCE");
        debitAccount.setAccountName("Test Debit");
        debitAccount.setAccountType("DEBIT");
        debitAccount.setInitBalance(BigDecimal.ZERO);
        try {
            accountService.create(debitAccount);
        } catch (CustomException e) {
            throw new IllegalStateException("Failed to create debit account", e);
        }

        // Get account ID using DSL
        Integer creditAccountId = dsl.select(Tables.ACCOUNTS.ACCOUNT_ID)
                .from(Tables.ACCOUNTS)
                .where(Tables.ACCOUNTS.ACCOUNT_NAME.eq("Test Credit")
                        .and(Tables.ACCOUNTS.BANK_NAME.eq("MINANCE")))
                .fetchOne(Tables.ACCOUNTS.ACCOUNT_ID);

        // Create transactions using service
        LocalDate today = LocalDate.now();
        List<Transactions> transactions = new java.util.ArrayList<>();

        // Generate transactions for the last 30 days
        for (int i = 0; i < 30; i++) {
            Transactions transaction = new Transactions();
            transaction.setAccountId(creditAccountId);
            transaction.setAccountName("Test Credit");
            transaction.setBankName("MINANCE");
            transaction.setTransactionDate(today.minusDays(i));
            transaction.setAmount(BigDecimal.valueOf(-10.00 - i));
            transaction.setDescription("Daily Expense " + i);
            transaction.setCategory(i % 2 == 0 ? "Food" : "Transport");
            transaction.setTransactionType("DEBIT");
            transactions.add(transaction);
        }

        // Monthly Salary
        Transactions salaryTransaction = new Transactions();
        salaryTransaction.setAccountId(creditAccountId);
        salaryTransaction.setAccountName("Test Credit");
        salaryTransaction.setBankName("MINANCE");
        salaryTransaction.setTransactionDate(today.withDayOfMonth(1));
        salaryTransaction.setAmount(new BigDecimal("3000.00"));
        salaryTransaction.setDescription("Salary");
        salaryTransaction.setCategory("Income");
        salaryTransaction.setTransactionType("CREDIT");
        transactions.add(salaryTransaction);

        try {
            transactionService.create(transactions);
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to create transactions", e);
        }
    }

    private static String accountKey(String bankName, String accountName) {
        return bankName + "::" + accountName;
    }

    record TransactionSeed(LocalDate date,
            BigDecimal amount,
            String description,
            String category,
            String transactionType) {
    }

    record AccountSeed(String bankName,
            String accountName,
            String accountType,
            BigDecimal initBalance,
            List<TransactionSeed> transactions) {
    }

    private static final List<String> MINANCE_CATEGORIES = List.of(
            "Travel",
            "Gas",
            "Travel/Entertainment",
            "Dining",
            "Bills & Utilities",
            "Transfers",
            "Groceries",
            "Health & Wellness",
            "Service Charge",
            "General Merchandise",
            "Mortgage",
            "Postage",
            "Entertainment",
            "Subscriptions",
            "Automotive",
            "Outdoor Activities",
            "Personal Care",
            "Other Income");

    private static final Map<String, List<String>> CATEGORY_LINKS = Map.ofEntries(
            Map.entry("Travel", List.of("Travel", "Travel - Parking")),
            Map.entry("Gas", List.of("Gas")),
            Map.entry("Dining", List.of("Dining")),
            Map.entry("Bills & Utilities", List.of("Bills & Utilities")),
            Map.entry("Transfers", List.of("Transfers")),
            Map.entry("Groceries", List.of("Groceries")),
            Map.entry("Health & Wellness", List.of("Health & Wellness")),
            Map.entry("Service Charge", List.of("Service Charges")),
            Map.entry("General Merchandise", List.of("General Merchandise")),
            Map.entry("Postage", List.of("Postage")));

    private static final List<AccountSeed> ACCOUNT_SEEDS = List.of(
            new AccountSeed(
                    "CHASE",
                    "Peach's Unlimited",
                    "CREDIT",
                    BigDecimal.ZERO,
                    List.of(
                            new TransactionSeed(LocalDate.of(2025, 1, 5),
                                    BigDecimal.valueOf(-5.89),
                                    "ROSETTA BAKERY X POP BEST",
                                    "Dining",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 5),
                                    BigDecimal.valueOf(-30.42),
                                    "SHELL OIL 57543609507",
                                    "Travel",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 2, 3),
                                    BigDecimal.valueOf(-62.18),
                                    "MIAMI PARKING",
                                    "Travel - Parking",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 3, 2),
                                    BigDecimal.valueOf(-48.50),
                                    "SUNCOAST FUEL",
                                    "Gas",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 2, 20),
                                    BigDecimal.valueOf(-75.00),
                                    "STATE PARK PASS",
                                    "Outdoor Activities",
                                    "DEBIT"))),
            new AccountSeed(
                    "CHASE",
                    "Peach's CSP",
                    "CREDIT",
                    BigDecimal.ZERO,
                    List.of(
                            new TransactionSeed(LocalDate.of(2025, 1, 1),
                                    BigDecimal.valueOf(-95.00),
                                    "ANNUAL MEMBERSHIP FEE",
                                    "Service Charges",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 1),
                                    BigDecimal.valueOf(-34.84),
                                    "VERYPLANTS MOLLYS",
                                    "General Merchandise",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 1),
                                    BigDecimal.valueOf(-1032.50),
                                    "JINS EYEWEAR",
                                    "Health & Wellness",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 2),
                                    BigDecimal.valueOf(-0.48),
                                    "CVS/PHARMACY #08378",
                                    "Health & Wellness",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 2),
                                    BigDecimal.valueOf(-7.84),
                                    "USPS PO 1139950301",
                                    "Postage",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 3),
                                    BigDecimal.valueOf(-1204.23),
                                    "AUTOMATIC PAYMENT - THANK",
                                    "Transfers",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 2, 10),
                                    BigDecimal.valueOf(-220.41),
                                    "DELTA AIR",
                                    "Travel",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 3, 5),
                                    BigDecimal.valueOf(-89.15),
                                    "SPOTIFY FAMILY",
                                    "Subscriptions",
                                    "DEBIT"))),
            new AccountSeed(
                    "CHASE",
                    "Peach's Freedom",
                    "CREDIT",
                    BigDecimal.ZERO,
                    List.of(
                            new TransactionSeed(LocalDate.of(2025, 1, 3),
                                    BigDecimal.valueOf(-1444.07),
                                    "AUTOMATIC PAYMENT - THANK",
                                    "Transfers",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 2, 14),
                                    BigDecimal.valueOf(-68.22),
                                    "TARGET ONLINE",
                                    "General Merchandise",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 3, 18),
                                    BigDecimal.valueOf(-210.00),
                                    "AMAZON MARKETPLACE",
                                    "General Merchandise",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 2, 25),
                                    BigDecimal.valueOf(-320.00),
                                    "BRAKE SERVICE",
                                    "Automotive",
                                    "DEBIT"))),
            new AccountSeed(
                    "BANK_OF_AMERICA",
                    "Peach's Checking",
                    "CHECKING",
                    BigDecimal.valueOf(3500),
                    List.of(
                            new TransactionSeed(LocalDate.of(2025, 1, 2),
                                    BigDecimal.valueOf(-291.00),
                                    "Regalo HOA Payment",
                                    "Bills & Utilities",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 2),
                                    BigDecimal.valueOf(-2244.23),
                                    "NEWREZ Mortgage",
                                    "Mortgage",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 3),
                                    BigDecimal.valueOf(-136.27),
                                    "JP Comiramar Utilities",
                                    "Bills & Utilities",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 6),
                                    BigDecimal.valueOf(-125.19),
                                    "DISCOVER E-PAYMENT",
                                    "Transfers",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 6),
                                    BigDecimal.valueOf(-1204.23),
                                    "CHASE CREDIT CRD AUTOPAY",
                                    "Transfers",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 20),
                                    BigDecimal.valueOf(6500.00),
                                    "Zelle payment to XI",
                                    "Other Income",
                                    "CREDIT"),
                            new TransactionSeed(LocalDate.of(2025, 2, 15),
                                    BigDecimal.valueOf(3000.00),
                                    "Payroll Deposit",
                                    "Other Income",
                                    "CREDIT"),
                            new TransactionSeed(LocalDate.of(2025, 3, 10),
                                    BigDecimal.valueOf(-82.00),
                                    "Downtown Parking Pass",
                                    "Travel",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 3, 2),
                                    BigDecimal.valueOf(-65.00),
                                    "Spa Visit",
                                    "Personal Care",
                                    "DEBIT"))),
            new AccountSeed(
                    "DISCOVER",
                    "Peach's",
                    "CREDIT",
                    BigDecimal.ZERO,
                    List.of(
                            new TransactionSeed(LocalDate.of(2025, 1, 3),
                                    BigDecimal.valueOf(-125.19),
                                    "DIRECTPAY FULL BALANCE",
                                    "Transfers",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 2, 11),
                                    BigDecimal.valueOf(-42.60),
                                    "NETFLIX.COM",
                                    "Entertainment",
                                    "DEBIT"))),
            new AccountSeed(
                    "CITI",
                    "Costco",
                    "CREDIT",
                    BigDecimal.ZERO,
                    List.of(
                            new TransactionSeed(LocalDate.of(2025, 1, 4),
                                    BigDecimal.valueOf(-36.36),
                                    "COSTCO WHSE #0091",
                                    "Groceries",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 4),
                                    BigDecimal.valueOf(-72.54),
                                    "COSTCO WHSE #0091",
                                    "Groceries",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 2, 8),
                                    BigDecimal.valueOf(-220.11),
                                    "COSTCO GAS",
                                    "Gas",
                                    "DEBIT"))),
            new AccountSeed(
                    "CHASE",
                    "Xi's CSP",
                    "CREDIT",
                    BigDecimal.ZERO,
                    List.of(
                            new TransactionSeed(LocalDate.of(2025, 1, 5),
                                    BigDecimal.valueOf(-3.00),
                                    "AMERIPARK 30209101",
                                    "Travel",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 1, 4),
                                    BigDecimal.valueOf(-132.22),
                                    "ENSON MARKET",
                                    "Groceries",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 3, 6),
                                    BigDecimal.valueOf(-58.90),
                                    "WHOLE FOODS",
                                    "Groceries",
                                    "DEBIT"))),
            new AccountSeed(
                    "CHASE",
                    "Xi's Unlimited Travel",
                    "CREDIT",
                    BigDecimal.ZERO,
                    List.of(
                            new TransactionSeed(LocalDate.of(2025, 2, 22),
                                    BigDecimal.valueOf(-88.00),
                                    "UBER TRIP",
                                    "Travel",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 3, 1),
                                    BigDecimal.valueOf(-410.00),
                                    "DELTA VACATION",
                                    "Travel/Entertainment",
                                    "DEBIT"))),
            new AccountSeed(
                    "CHASE",
                    "Peach's Dining",
                    "CREDIT",
                    BigDecimal.ZERO,
                    List.of(
                            new TransactionSeed(LocalDate.of(2025, 2, 3),
                                    BigDecimal.valueOf(-58.33),
                                    "JOES DINER",
                                    "Dining",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 2, 12),
                                    BigDecimal.valueOf(-120.00),
                                    "CHEF TABLE RESERVATION",
                                    "Dining",
                                    "DEBIT"),
                            new TransactionSeed(LocalDate.of(2025, 3, 9),
                                    BigDecimal.valueOf(-42.50),
                                    "LUNCH SPOT",
                                    "Dining",
                                    "DEBIT"))));
}
