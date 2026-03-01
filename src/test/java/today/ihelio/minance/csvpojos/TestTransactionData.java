package today.ihelio.minance.csvpojos;

import today.ihelio.jooq.tables.pojos.Transactions;

import java.math.BigDecimal;
import java.time.LocalDate;

public class TestTransactionData {
    public static class Builder {
        private final Transactions transaction = new Transactions();

        public Builder amount(BigDecimal amount) {
            transaction.setAmount(amount);
            return this;
        }

        public Builder category(String category) {
            transaction.setCategory(category);
            return this;
        }

        public Builder description(String description) {
            transaction.setDescription(description);
            return this;
        }

        public Builder transactionDate(LocalDate date) {
            transaction.setTransactionDate(date);
            return this;
        }

        public Builder postDate(LocalDate date) {
            transaction.setPostDate(date);
            return this;
        }

        public Builder memo(String memo) {
            transaction.setMemo(memo);
            return this;
        }

        public Transactions build() {
            return transaction;
        }
    }

    public static Builder builder() {
        return new Builder();
    }
}
