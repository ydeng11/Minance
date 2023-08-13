package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.BANK_OF_AMERICA;
@Dependent
public class BoaCreditCsvTemplate implements BankAccountCsvTemplate {
    @CsvIgnore
    public final BankAccountPair bankAccountPair =
            BankAccountPair.of(BANK_OF_AMERICA,CREDIT);
    @CsvBindByName(column = "Amount")
    public double amount;

    @CsvBindByName(column = "Payee")
    public String description;

    @CsvDate(value = "MM/dd/yyyy")
    @CsvBindByName(column = "Posted Date")
    public LocalDate postDate;

    @CsvBindByName(column = "Address")
    public String address;

    @CsvBindByName(column = "Reference Number")
    public String referenceNumber;

    @Override
    public BankAccountPair getBankAccount(){ return bankAccountPair; }

    @Override public String toString(){
        return "BoaCreditCsvTemplate{" +
                "bankAccountPair=" + bankAccountPair +
                ", amount=" + amount +
                ", description='" + description + '\'' +
                ", postDate=" + postDate +
                ", address='" + address + '\'' +
                ", referenceNumber='" + referenceNumber + '\'' +
                '}';
    }
}
