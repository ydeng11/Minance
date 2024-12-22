package today.ihelio.minance.csvpojos;

import today.ihelio.minance.exception.CustomException;

import java.util.Objects;

public class BankAccountPair {
	private final BankName bankName;
	private final AccountType accountType;

	private BankAccountPair(BankName bankName, AccountType accountType) {
		this.bankName = bankName;
		this.accountType = accountType;
	}

	public static BankAccountPair of(BankName bankName, AccountType accountType) {
		return new BankAccountPair(bankName, accountType);
	}

	public static <T extends Enum<T>> void checkEnumFormat(Class<T> clazz, String string)
			throws CustomException {
		try {
			Enum.valueOf(clazz, string);
		} catch (IllegalArgumentException e) {
			throw CustomException.from(new IllegalArgumentException(string + " is not valid input!"));
		}
	}

	public BankName getBankName() {
		return bankName;
	}

	public AccountType getAccountType() {
		return accountType;
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj) {
			return true;
		}
		if (obj == null || getClass() != obj.getClass()) {
			return false;
		}
		BankAccountPair other = (BankAccountPair) obj;
		return Objects.equals(this.getBankName(), other.getBankName()) && Objects.equals(
				this.getAccountType(), other.getAccountType());
	}

	@Override
	public int hashCode() {
		return Objects.hash(this.bankName, this.accountType);
	}

	@Override
	public String toString() {
		return "BankAccountPair{" +
				"bankName=" + bankName +
				", accountType=" + accountType +
				'}';
	}

	public enum BankName {
		CHASE("CHASE"),
		AMEX("AMEX"),
		DISCOVER("DISCOVER"),
		CITI("CITI"),
		WELLS_FARGO("WELLS_FARGO"),
		CASH_APP("CASH_APP"),
		APPLE("APPLE"),
		BANK_OF_AMERICA("BANK_OF_AMERICA"),
		MINANCE("MINANCE");
		private final String name;

		BankName(String name) {
			this.name = name;
		}

		public String getName() {
			return name;
		}
	}

	public enum AccountType {
		CHECKING("CHECKING"),
		SAVINGS("SAVING"),
		CREDIT("CREDIT"),
		DEBIT("DEBIT");
		private final String type;

		AccountType(String type) {
			this.type = type;
		}

		public String getType() {
			return type;
		}
	}
}
