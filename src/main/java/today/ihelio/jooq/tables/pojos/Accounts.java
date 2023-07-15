/*
 * This file is generated by jOOQ.
 */
package today.ihelio.jooq.tables.pojos;


import java.io.Serializable;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class Accounts implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer accountId;
    private Integer bankId;
    private String bankName;
    private String accountName;
    private String accountType;

    public Accounts() {}

    public Accounts(Accounts value) {
        this.accountId = value.accountId;
        this.bankId = value.bankId;
        this.bankName = value.bankName;
        this.accountName = value.accountName;
        this.accountType = value.accountType;
    }

    public Accounts(
        Integer accountId,
        Integer bankId,
        String bankName,
        String accountName,
        String accountType
    ) {
        this.accountId = accountId;
        this.bankId = bankId;
        this.bankName = bankName;
        this.accountName = accountName;
        this.accountType = accountType;
    }

    /**
     * Getter for <code>minance.accounts.account_id</code>.
     */
    public Integer getAccountId() {
        return this.accountId;
    }

    /**
     * Setter for <code>minance.accounts.account_id</code>.
     */
    public void setAccountId(Integer accountId) {
        this.accountId = accountId;
    }

    /**
     * Getter for <code>minance.accounts.bank_id</code>.
     */
    public Integer getBankId() {
        return this.bankId;
    }

    /**
     * Setter for <code>minance.accounts.bank_id</code>.
     */
    public void setBankId(Integer bankId) {
        this.bankId = bankId;
    }

    /**
     * Getter for <code>minance.accounts.bank_name</code>.
     */
    public String getBankName() {
        return this.bankName;
    }

    /**
     * Setter for <code>minance.accounts.bank_name</code>.
     */
    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    /**
     * Getter for <code>minance.accounts.account_name</code>.
     */
    public String getAccountName() {
        return this.accountName;
    }

    /**
     * Setter for <code>minance.accounts.account_name</code>.
     */
    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    /**
     * Getter for <code>minance.accounts.account_type</code>.
     */
    public String getAccountType() {
        return this.accountType;
    }

    /**
     * Setter for <code>minance.accounts.account_type</code>.
     */
    public void setAccountType(String accountType) {
        this.accountType = accountType;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        final Accounts other = (Accounts) obj;
        if (this.accountId == null) {
            if (other.accountId != null)
                return false;
        }
        else if (!this.accountId.equals(other.accountId))
            return false;
        if (this.bankId == null) {
            if (other.bankId != null)
                return false;
        }
        else if (!this.bankId.equals(other.bankId))
            return false;
        if (this.bankName == null) {
            if (other.bankName != null)
                return false;
        }
        else if (!this.bankName.equals(other.bankName))
            return false;
        if (this.accountName == null) {
            if (other.accountName != null)
                return false;
        }
        else if (!this.accountName.equals(other.accountName))
            return false;
        if (this.accountType == null) {
            if (other.accountType != null)
                return false;
        }
        else if (!this.accountType.equals(other.accountType))
            return false;
        return true;
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((this.accountId == null) ? 0 : this.accountId.hashCode());
        result = prime * result + ((this.bankId == null) ? 0 : this.bankId.hashCode());
        result = prime * result + ((this.bankName == null) ? 0 : this.bankName.hashCode());
        result = prime * result + ((this.accountName == null) ? 0 : this.accountName.hashCode());
        result = prime * result + ((this.accountType == null) ? 0 : this.accountType.hashCode());
        return result;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("Accounts (");

        sb.append(accountId);
        sb.append(", ").append(bankId);
        sb.append(", ").append(bankName);
        sb.append(", ").append(accountName);
        sb.append(", ").append(accountType);

        sb.append(")");
        return sb.toString();
    }
}
