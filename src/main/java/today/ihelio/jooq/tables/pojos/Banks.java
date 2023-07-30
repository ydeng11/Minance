/*
 * This file is generated by jOOQ.
 */
package today.ihelio.jooq.tables.pojos;


import java.io.Serializable;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class Banks implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer bankId;
    private String bankName;

    public Banks() {}

    public Banks(Banks value) {
        this.bankId = value.bankId;
        this.bankName = value.bankName;
    }

    public Banks(
        Integer bankId,
        String bankName
    ) {
        this.bankId = bankId;
        this.bankName = bankName;
    }

    /**
     * Getter for <code>minance.banks.bank_id</code>.
     */
    public Integer getBankId() {
        return this.bankId;
    }

    /**
     * Setter for <code>minance.banks.bank_id</code>.
     */
    public void setBankId(Integer bankId) {
        this.bankId = bankId;
    }

    /**
     * Getter for <code>minance.banks.bank_name</code>.
     */
    public String getBankName() {
        return this.bankName;
    }

    /**
     * Setter for <code>minance.banks.bank_name</code>.
     */
    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        final Banks other = (Banks) obj;
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
        return true;
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((this.bankId == null) ? 0 : this.bankId.hashCode());
        result = prime * result + ((this.bankName == null) ? 0 : this.bankName.hashCode());
        return result;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("Banks (");

        sb.append(bankId);
        sb.append(", ").append(bankName);

        sb.append(")");
        return sb.toString();
    }
}